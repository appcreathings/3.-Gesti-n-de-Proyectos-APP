import type { DomainEvent } from "@/automations/events";
import type { EncryptedPayload } from "@/integrations/crypto";
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

      // Spec 034 §B: ya NO se descifra al enviar (el secreto vive en claro tras
      // la migración). Si la migración no pudo recuperar el secreto (vault
      // bloqueado al migrar), la suscripción queda `needsReconnect`: en vez de
      // descartar en silencio (el bug que arregla esta spec), se registra el
      // fallo en `syncLogs` (spec 033 A1) — visible en SyncLogsPage.
      if (sub.needsReconnect) {
        await logDispatchFailure(
          sub,
          event,
          "No se pudo firmar: el secreto quedó pendiente de reconfigurar tras la migración. Reingresá el secreto de firma en la suscripción."
        );
        continue;
      }

      // Sin secreto ⇒ webhook limpio, sin firma (coherente con Fase A). Con
      // secreto ⇒ firma HMAC sobre el payload serializado.
      const secret = sub.secret?.trim() || null;
      const signature = secret ? await signPayload(payload, secret) : "";

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

/**
 * Migración perezosa (spec 034 §B) invocada en el bootstrap, DESPUÉS de
 * `restoreFromPersistence()`. Las suscripciones guardadas antes de esta spec
 * tenían el secreto cifrado con el vault (`encryptedSecret`); ahora vive en
 * claro (`secret`). Para cada suscripción v2 aún sin migrar:
 *  - vault desbloqueado ⇒ descifra una vez y reguarda `secret` en claro,
 *    limpiando `encryptedSecret`.
 *  - vault bloqueado ⇒ marca `needsReconnect: true` y CONSERVA `encryptedSecret`
 *    para reintentar en un próximo arranque con el vault disponible.
 * Idempotente: solo toca filas que aún tienen `encryptedSecret` sin `secret`.
 */
export async function migrateWebhookSubscriptionSecrets(): Promise<void> {
  const subs = await integrationDb.webhookSubscriptions.toArray();
  const vault = useVaultStore.getState();

  for (const sub of subs) {
    const legacy = sub as WebhookSubscription & { encryptedSecret?: EncryptedPayload | null };
    // Ya migrada con éxito (tiene secreto en claro) o nunca tuvo secreto legacy.
    if (legacy.secret !== undefined) continue;
    if (!legacy.encryptedSecret) continue;

    if (vault.isUnlocked) {
      try {
        const secret = await vault.decrypt<string>(legacy.encryptedSecret);
        // `put` reescribe la fila completa sin `encryptedSecret`.
        const { encryptedSecret: _drop, ...rest } = legacy;
        await integrationDb.webhookSubscriptions.put({
          ...rest,
          secret,
          needsReconnect: false,
        });
      } catch {
        // Descifrado falló pese al vault desbloqueado (key equivocada / dato
        // corrupto): marcar para reconfigurar, sin romper la suscripción.
        await integrationDb.webhookSubscriptions.update(sub.id, { needsReconnect: true });
      }
    } else {
      // Vault bloqueado: no se puede descifrar. Marcar para reconfigurar pero
      // conservar `encryptedSecret` — un próximo arranque con el vault abierto
      // aún podrá recuperarlo.
      await integrationDb.webhookSubscriptions.update(sub.id, { needsReconnect: true });
    }
  }
}

async function logDispatchFailure(
  sub: WebhookSubscription,
  event: DomainEvent,
  message: string
): Promise<void> {
  await integrationDb.syncLogs.add({
    id: crypto.randomUUID(),
    direction: "outbound",
    provider: "webhook",
    eventType: event.type,
    status: "error",
    requestPayload: JSON.stringify(event).slice(0, 10_000),
    responsePayload: "",
    httpStatus: null,
    errorMessage: `[${sub.name}] ${message}`,
    retryCount: 0,
    createdAt: new Date().toISOString(),
  });
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
