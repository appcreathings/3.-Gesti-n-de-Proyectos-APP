import { integrationDb } from "@/storage/integration-db";
import type { OutboundPayload } from "./dispatcher";
import { calculateRetryDelay, DEFAULT_RETRY_CONFIG } from "./retry-delay";

// El cálculo del delay vive en `retry-delay.ts` (puro, sin Dexie) para que
// el motor de flujos lo reuse (spec 027 §E); se re-exporta desde aquí para
// no romper los call sites previos.
export { calculateRetryDelay } from "./retry-delay";

let processorInterval: ReturnType<typeof setInterval> | null = null;

export function startOutboundProcessor(): void {
  if (processorInterval) return;
  processorInterval = setInterval(processOutboundQueue, 30_000);
  void processOutboundQueue();
}

export function stopOutboundProcessor(): void {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
  }
}

/** Para el panel de servicios programados (spec 023 §F). */
export function isOutboundProcessorRunning(): boolean {
  return processorInterval !== null;
}

async function processOutboundQueue(): Promise<void> {
  const now = new Date();
  const pending = await integrationDb.outboundQueue
    .where("nextRetryAt")
    .belowOrEqual(now.toISOString())
    .toArray();

  for (const delivery of pending) {
    if (delivery.attemptCount >= DEFAULT_RETRY_CONFIG.maxRetries) {
      await logDelivery(delivery, null, "Max retries exceeded");
      await integrationDb.outboundQueue.delete(delivery.id);
      continue;
    }

    try {
      const payload = JSON.parse(delivery.payload) as OutboundPayload;

      // Spec 034 §B: `X-Hito-Signature` solo si la entrega trae firma. Una
      // suscripción sin secreto (modo Simple) encola `signature: ""` ⇒ webhook
      // plano, sin header de firma (coherente con Fase A).
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Hito-Event": delivery.payload ? payload.eventType : "",
        "X-Hito-Delivery-Id": delivery.id,
      };
      if (delivery.signature) headers["X-Hito-Signature"] = delivery.signature;

      const response = await fetch(delivery.url, {
        method: "POST",
        headers,
        body: delivery.payload,
        signal: AbortSignal.timeout(10_000),
      });

      await logDelivery(delivery, response.status, null);

      if (response.ok) {
        await integrationDb.outboundQueue.delete(delivery.id);
      } else if (response.status >= 500) {
        const delay = calculateRetryDelay(delivery.attemptCount);
        await integrationDb.outboundQueue.update(delivery.id, {
          attemptCount: delivery.attemptCount + 1,
          nextRetryAt: new Date(Date.now() + delay).toISOString(),
        });
      } else {
        await logDelivery(delivery, response.status, `HTTP ${response.status}`);
        await integrationDb.outboundQueue.delete(delivery.id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await logDelivery(delivery, null, errorMessage);

      const delay = calculateRetryDelay(delivery.attemptCount);
      await integrationDb.outboundQueue.update(delivery.id, {
        attemptCount: delivery.attemptCount + 1,
        nextRetryAt: new Date(Date.now() + delay).toISOString(),
      });
    }
  }
}

async function logDelivery(
  delivery: { id: string; subscriptionId: string; url: string; payload: string },
  httpStatus: number | null,
  error: string | null
): Promise<void> {
  await integrationDb.syncLogs.add({
    id: crypto.randomUUID(),
    direction: "outbound",
    provider: "webhook",
    eventType: "delivery",
    status: error ? "error" : "success",
    requestPayload: delivery.payload.slice(0, 10_000),
    responsePayload: error ?? "",
    httpStatus,
    errorMessage: error,
    retryCount: 0,
    createdAt: new Date().toISOString(),
  });
}
