import type { PollTrigger } from "@/domain/schemas/flow";
import { getConnection, resolveConnectionSecret } from "@/integrations/connections";
import { pollHubSpot, type HubSpotConfig } from "@/integrations/inbound/hubspot-poller";
import { pollHubSpotDeals } from "@/integrations/inbound/hubspot-deals-poller";
import { pollHubSpotTickets } from "@/integrations/inbound/hubspot-tickets-poller";
import { pollGoogleSheets, type GoogleSheetsConfig } from "@/integrations/inbound/sheets-poller";
import { drainInbox } from "@/integrations/inbound/inbox-poller";

export interface ManualPollFetchResult {
  ok: boolean;
  error?: string;
  records?: Record<string, unknown>[];
}

/** Resultado de "Ejecutar ahora" para el usuario — ver `useDataStore.runFlowNow`. */
export interface ManualRunOutcome {
  success: boolean;
  message: string;
}

/**
 * Trae datos frescos para el trigger de poll de un flujo específico, para
 * "Ejecutar ahora" (spec 022 §B). Reusa los mismos pollers y la misma
 * construcción de config que el registro automático
 * (`hubspot-polling-manager.ts`/`sheets-polling-manager.ts`) — sin duplicar
 * esa lógica — pero con `lastSyncAt: null` siempre: una prueba manual no debe
 * depender del watermark incremental del poll automático (si nada cambió
 * desde el último poll real, una prueba con el watermark real daría "0
 * resultados" aunque la conexión y el flujo estén perfectos).
 */
export async function fetchPollSampleForFlow(trigger: PollTrigger): Promise<ManualPollFetchResult> {
  const connection = await getConnection(trigger.config.connectionId);
  if (!connection) return { ok: false, error: "La conexión configurada en este flujo ya no existe." };

  const proxyUrl = String(connection.config.proxyUrl ?? "");
  if (!proxyUrl) return { ok: false, error: "La conexión no tiene una Proxy URL configurada." };

  if (trigger.provider === "hubspot") {
    let accessToken: string | null;
    try {
      accessToken = await resolveConnectionSecret(trigger.config.connectionId);
    } catch (error) {
      return {
        ok: false,
        error: `No se pudo descifrar el token (¿vault desbloqueado?): ${error instanceof Error ? error.message : String(error)}`,
      };
    }
    if (!accessToken) return { ok: false, error: "La conexión no tiene un token guardado." };

    const config: HubSpotConfig = {
      proxyUrl,
      credentials: { accessToken },
      pollingIntervalMs: trigger.config.intervalMs,
      objectTypes: [trigger.config.objectType ?? "contacts"],
      fields: trigger.config.fields,
      filters: trigger.config.filters,
    };
    const poller =
      trigger.config.objectType === "deals"
        ? pollHubSpotDeals
        : trigger.config.objectType === "tickets"
          ? pollHubSpotTickets
          : pollHubSpot;

    const result = await poller(config, null);
    if (!result.success) return { ok: false, error: result.error ?? "Error desconocido al traer datos de HubSpot." };
    return { ok: true, records: result.records ?? [] };
  }

  if (trigger.provider === "inbox") {
    // El secreto del inbox es opcional; si el vault está bloqueado o no hay
    // secreto, se drena igual (un inbox abierto no lo exige).
    let secret: string | null;
    try {
      secret = await resolveConnectionSecret(trigger.config.connectionId);
    } catch {
      secret = null;
    }
    // "Ejecutar ahora" drena SIN avanzar el cursor real del poll (cursor null),
    // así trae lo pendiente como muestra sin consumir el watermark de producción.
    const result = await drainInbox({ proxyUrl, secret }, null);
    if (!result.success) return { ok: false, error: result.error ?? "Error desconocido al drenar el inbox." };
    return { ok: true, records: result.records ?? [] };
  }

  // google-sheets
  const config: GoogleSheetsConfig = {
    proxyUrl,
    spreadsheetId: String(connection.config.spreadsheetId ?? ""),
    range: String(connection.config.range ?? ""),
    headerRow: Number(connection.config.headerRow) || 1,
  };
  if (!config.spreadsheetId || !config.range) {
    return { ok: false, error: "La conexión no tiene ID de spreadsheet o rango configurados." };
  }

  const result = await pollGoogleSheets(config, null);
  if (!result.success) return { ok: false, error: result.error ?? "Error desconocido al traer datos de Sheets." };
  return { ok: true, records: result.records ?? [] };
}
