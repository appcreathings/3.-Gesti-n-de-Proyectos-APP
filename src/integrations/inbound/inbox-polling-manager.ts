import { pollingManager } from "../polling/polling-manager";
import type { PollTrigger } from "@/domain/schemas/flow";
import { pollTriggerKey } from "@/flows/engine";
import { drainInbox, type InboxConfig } from "./inbox-poller";
import { getConnection, resolveConnectionSecret } from "../connections";
import { loadLastSyncAt, saveLastSyncAt, saveLastBacklog } from "./poll-sync-state";
import { integrationDb } from "@/storage/integration-db";

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
        // Spec 033 A2: persistir el backlog para el semáforo de salud.
        if (typeof result.backlog === "number") saveLastBacklog(key, result.backlog);
        if (result.records && result.records.length > 0) {
          try {
            const { useDataStore } = await import("@/store/useDataStore");
            await useDataStore.getState().runPolledFlow(key, result.records);
          } catch (error) {
            console.error("[Inbox Polling] Error applying inbox deliveries to flows:", error);
          }
        }
        // Spec 033 A1: registrar el drain como entrada durable de `syncLogs`
        // para que el batch del inbox sea visible en SyncLogsPage con su
        // desenlace (mismo patrón que HubSpot/Sheets). Best-effort.
        void logInboxDrain(connectionId, result.newRecords, null).catch(() => {});
      } else {
        void logInboxDrain(connectionId, result.newRecords, result.error ?? "error desconocido").catch(() => {});
      }

      return {
        success: result.success,
        newRecords: result.newRecords,
        lastExternalTimestamp: result.lastExternalTimestamp,
        error: result.error,
        backlog: result.backlog,
      };
    }
  );
}

export function unregisterInboxPolling(trigger: PollTrigger): void {
  pollingManager.unregister(pollTriggerKey(trigger));
}

/** Registra un drain del inbox como entrada inbound de `syncLogs` (spec 033
 *  A1) — hace visible cada batch drenado desde Make/Zapier en SyncLogsPage.
 *  Best-effort: un fallo de Dexie no rompe el polling. */
async function logInboxDrain(
  connectionId: string,
  newRecords: number,
  error: string | null,
): Promise<void> {
  await integrationDb.syncLogs.add({
    id: crypto.randomUUID(),
    direction: "inbound",
    provider: "inbox",
    eventType: `inbox:${connectionId}`,
    status: error ? "error" : "success",
    requestPayload: JSON.stringify({ records: newRecords }),
    responsePayload: error ?? "",
    httpStatus: error ? null : 200,
    errorMessage: error,
    retryCount: 0,
    createdAt: new Date().toISOString(),
  });
}
