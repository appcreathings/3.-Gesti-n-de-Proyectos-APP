import { integrationDb } from "@/storage/integration-db";
import type { OutboundPayload } from "./dispatcher";

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelayMs: 1_000,
  maxDelayMs: 300_000,
  jitterFactor: 0.2,
};

export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const exponential = config.baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(exponential, config.maxDelayMs);
  const jitter = 1 + (Math.random() * 2 - 1) * config.jitterFactor;
  return Math.round(capped * jitter);
}

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

      const response = await fetch(delivery.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Hito-Signature": delivery.signature,
          "X-Hito-Event": delivery.payload ? payload.eventType : "",
          "X-Hito-Delivery-Id": delivery.id,
        },
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
