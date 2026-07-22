import { pollingManager } from "../polling/polling-manager";
import type { PollTrigger } from "@/domain/schemas/flow";
import { pollTriggerKey } from "@/flows/engine";
import { drainInbox, type InboxConfig } from "./inbox-poller";
import { getConnection, resolveConnectionSecret } from "../connections";
import { loadLastSyncAt, saveLastSyncAt } from "./poll-sync-state";

/** Registra el drenado periódico de una conexión de inbox (spec 032 §B). El
 * proxy Apps Script del usuario acumula lo que Make/Zapier/n8n le empujan; aquí
 * Hito lo drena en cada tick y despacha cada entrega a los Flujos configurados
 * con este trigger, por el mismo camino `externalData`/`runPolledFlow` que
 * HubSpot y Sheets. */
export async function registerInboxPolling(trigger: PollTrigger): Promise<void> {
  const { connectionId, intervalMs } = trigger.config;

  const connection = await getConnection(connectionId);
  if (!connection) {
    console.error(`[Inbox Polling] Conexión "${connectionId}" no encontrada; no se registra el drenado.`);
    return;
  }
  const proxyUrl = String(connection.config.proxyUrl ?? "");
  if (!proxyUrl) {
    console.error(`[Inbox Polling] Conexión "${connectionId}" sin proxyUrl; no se registra el drenado.`);
    return;
  }

  // El secreto del inbox es opcional (un inbox abierto no lo requiere).
  let secret: string | null = null;
  try {
    secret = await resolveConnectionSecret(connectionId);
  } catch (error) {
    console.error(`[Inbox Polling] No se pudo desencriptar el secreto de "${connectionId}":`, error);
    // Se sigue sin secreto — si el proxy exige uno, el drain devolverá error y
    // el backoff del pollingManager lo manejará como cualquier otro fallo.
  }

  const config: InboxConfig = { proxyUrl, secret };
  const key = pollTriggerKey(trigger);

  pollingManager.register(
    key,
    {
      intervalMs,
      backoffOnFailure: true,
      maxIntervalMs: 1_800_000, // 30 minutos
      enabled: true,
    },
    async () => {
      const cursor = loadLastSyncAt(key);
      const result = await drainInbox(config, cursor);

      if (result.success) {
        saveLastSyncAt(key, result.lastExternalTimestamp);
        if (result.records && result.records.length > 0) {
          try {
            const { useDataStore } = await import("@/store/useDataStore");
            await useDataStore.getState().runPolledFlow(key, result.records);
          } catch (error) {
            console.error("[Inbox Polling] Error applying inbox deliveries to flows:", error);
          }
        }
      }

      return {
        success: result.success,
        newRecords: result.newRecords,
        lastExternalTimestamp: result.lastExternalTimestamp,
        error: result.error,
      };
    }
  );
}

export function unregisterInboxPolling(trigger: PollTrigger): void {
  pollingManager.unregister(pollTriggerKey(trigger));
}
