import type { DomainEvent } from "@/automations/events";
import { integrationDb } from "@/storage/integration-db";
import type { WebhookSubscription } from "@/storage/integration-db";
import { signPayload } from "./signing";
import { useVaultStore } from "../vault";

export interface OutboundPayload {
  eventId: string;
  eventType: string;
  timestamp: string;
  workspace: { org: string };
  data: Record<string, unknown>;
}

export async function dispatchOutboundEvents(
  events: DomainEvent[],
  workspaceOrg: string
): Promise<void> {
  // `enabled` is a boolean; IndexedDB doesn't index booleans (and `true !== 1`),
  // so `.where("enabled").equals(1)` always returned []. Filter in memory —
  // subscription counts are small (dozens at most).
  const allSubscriptions = await integrationDb.webhookSubscriptions.toArray();
  const subscriptions = allSubscriptions.filter((sub) => sub.enabled === true);

  for (const event of events) {
    const matchingSubs = subscriptions.filter((sub: WebhookSubscription) =>
      sub.events.includes(event.type)
    );

    for (const sub of matchingSubs) {
      const payload = buildPayload(event, workspaceOrg);
      
      let secret: string;
      try {
        secret = await useVaultStore.getState().decrypt<string>(sub.encryptedSecret);
      } catch {
        console.error("[Outbound Dispatcher] Failed to decrypt secret for subscription:", sub.id);
        continue;
      }

      const signature = await signPayload(payload, secret);

      await enqueueDelivery({
        subscriptionId: sub.id,
        url: sub.url,
        payload,
        signature,
        event: JSON.stringify(event),
      });
    }
  }
}

function buildPayload(event: DomainEvent, workspaceOrg: string): OutboundPayload {
  return {
    eventId: crypto.randomUUID(),
    eventType: event.type,
    timestamp: new Date().toISOString(),
    workspace: { org: workspaceOrg },
    data: event as unknown as Record<string, unknown>,
  };
}

async function enqueueDelivery(delivery: {
  subscriptionId: string;
  url: string;
  payload: OutboundPayload;
  signature: string;
  event: string;
}): Promise<void> {
  await integrationDb.outboundQueue.add({
    id: crypto.randomUUID(),
    subscriptionId: delivery.subscriptionId,
    url: delivery.url,
    event: delivery.event,
    payload: JSON.stringify(delivery.payload),
    signature: delivery.signature,
    attemptCount: 0,
    nextRetryAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
}

export async function getWebhookSubscriptions(): Promise<WebhookSubscription[]> {
  return integrationDb.webhookSubscriptions.toArray();
}

export async function createWebhookSubscription(
  sub: Omit<WebhookSubscription, "createdAt" | "updatedAt">
): Promise<void> {
  const now = new Date().toISOString();
  await integrationDb.webhookSubscriptions.add({
    ...sub,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateWebhookSubscription(
  id: string,
  updates: Partial<WebhookSubscription>
): Promise<void> {
  await integrationDb.webhookSubscriptions.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteWebhookSubscription(id: string): Promise<void> {
  await integrationDb.webhookSubscriptions.delete(id);
}
