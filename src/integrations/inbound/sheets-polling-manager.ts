import { pollingManager } from "../polling/polling-manager";
import type { PollTrigger } from "@/domain/schemas/flow";
import { pollGoogleSheets, type GoogleSheetsConfig } from "./sheets-poller";
import { getConnection } from "../connections";
import { loadLastSyncAt, saveLastSyncAt } from "./poll-sync-state";

const POLL_KEY = "google-sheets";

/** Registra el polling de una conexión de Google Sheets. A diferencia de
 * HubSpot, Sheets no necesita `resolveConnectionSecret` — el proxy de Apps
 * Script corre bajo la cuenta de Google del propio usuario, sin token que
 * pasar desde el navegador. */
export async function registerSheetsPolling(trigger: PollTrigger): Promise<void> {
  const { connectionId, intervalMs } = trigger.config;

  const connection = await getConnection(connectionId);
  if (!connection) {
    console.error(`[Sheets Polling] Conexión "${connectionId}" no encontrada; no se registra el polling.`);
    return;
  }
  const proxyUrl = String(connection.config.proxyUrl ?? "");
  const spreadsheetId = String(connection.config.spreadsheetId ?? "");
  const range = String(connection.config.range ?? "");
  const headerRow = Number(connection.config.headerRow) || 1;

  if (!proxyUrl || !spreadsheetId || !range) {
    console.error(`[Sheets Polling] Conexión "${connectionId}" incompleta (falta proxyUrl/spreadsheetId/range); no se registra el polling.`);
    return;
  }

  const config: GoogleSheetsConfig = { proxyUrl, spreadsheetId, range, headerRow };

  pollingManager.register(POLL_KEY, {
    intervalMs,
    backoffOnFailure: true,
    maxIntervalMs: 1_800_000, // 30 minutos
    enabled: true,
  }, async () => {
    const lastSyncAt = loadLastSyncAt(POLL_KEY);
    const result = await pollGoogleSheets(config, lastSyncAt);

    if (result.success) {
      saveLastSyncAt(POLL_KEY, result.lastExternalTimestamp);
      if (result.records && result.records.length > 0) {
        try {
          const { useDataStore } = await import("@/store/useDataStore");
          await useDataStore.getState().runPolledFlow(POLL_KEY, result.records);
        } catch (error) {
          console.error("[Sheets Polling] Error applying polled records to flows:", error);
        }
      }
    }

    return {
      success: result.success,
      newRecords: result.newRecords,
      lastExternalTimestamp: result.lastExternalTimestamp,
      error: result.error,
    };
  });
}

export function unregisterSheetsPolling(): void {
  pollingManager.unregister(POLL_KEY);
}
