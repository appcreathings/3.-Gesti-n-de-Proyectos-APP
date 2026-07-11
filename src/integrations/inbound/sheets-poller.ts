import { integrationDb } from "@/storage/integration-db";
import type { PollResult } from "../polling/polling-manager";
import { idempotencyCheck } from "./idempotency";
import { postToProxy } from "../proxy-fetch";

export interface GoogleSheetsConfig {
  proxyUrl: string;
  spreadsheetId: string;
  range: string;
  /** Fila (1-based) que contiene los encabezados de columna. Default 1. */
  headerRow: number;
}

interface SheetsResponse {
  values?: string[][];
}

/** Convierte filas crudas (`values` de la API de Sheets) en registros
 * `{columna: valor}` usando la fila de encabezados. Pura — sin idempotencia
 * ni I/O — para poder reusarla tanto en el poller real como en
 * `testConnection` (spec 022 §A), que necesita una muestra real para el
 * picker de mapeo de campos sin duplicar esta lógica. */
export function parseSheetRows(rows: string[][], headerRow: number): Record<string, unknown>[] {
  if (rows.length === 0) return [];
  const headerIdx = Math.max(0, (headerRow || 1) - 1);
  const headers = rows[headerIdx] ?? [];
  const dataRows = rows.slice(headerIdx + 1);
  return dataRows.map((row) => {
    const record: Record<string, unknown> = {};
    headers.forEach((header, colIdx) => {
      if (header) record[header] = row[colIdx] ?? "";
    });
    return record;
  });
}

/**
 * Trae filas de una hoja de Google a través del proxy de Apps Script del
 * usuario (mismo patrón que HubSpot — sin `gapi`, sin OAuth de navegador: el
 * script corre bajo la cuenta de Google del usuario, que ya tiene acceso al
 * spreadsheet). Reemplaza la implementación anterior basada en `gapi`, que
 * nunca funcionó porque `gapi` nunca se cargaba (spec 019 §0.3, spec 020 §E).
 *
 * Solo hace fetch y devuelve registros planos — igual que los pollers de
 * HubSpot, el mapeo de columnas a campos de Hito y las acciones las define el
 * propio flow (motor + `TransformConfigFields`), no este poller.
 */
export async function pollGoogleSheets(
  config: GoogleSheetsConfig,
  lastSyncAt: string | null
): Promise<PollResult> {
  try {
    const result = await postToProxy<SheetsResponse>(config.proxyUrl, {
      action: "read",
      spreadsheetId: config.spreadsheetId,
      range: config.range,
    });

    if (!result.ok) {
      const error = `Sheets proxy error: ${result.message}`;
      await logSync("google-sheets", "error", 0, error);
      return { success: false, newRecords: 0, lastExternalTimestamp: lastSyncAt ?? new Date().toISOString(), error };
    }

    const rows = result.data.values ?? [];

    if (rows.length === 0) {
      return { success: true, newRecords: 0, lastExternalTimestamp: lastSyncAt ?? new Date().toISOString() };
    }

    const headerIdx = Math.max(0, (config.headerRow || 1) - 1);
    const parsedRows = parseSheetRows(rows, config.headerRow);

    const records: Record<string, unknown>[] = [];
    for (let i = 0; i < parsedRows.length; i++) {
      // Sin un id estable en la hoja, se usa spreadsheet+range+posición de
      // fila como clave de idempotencia — estable mientras no se reordenen
      // filas ya sincronizadas (limitación aceptada: las hojas no tienen id
      // de fila real como un CRM).
      const rowKey = `sheets-${config.spreadsheetId}-${config.range}-${headerIdx + 1 + i}`;
      const isDuplicate = await idempotencyCheck(rowKey);
      if (isDuplicate) continue;

      records.push(parsedRows[i]);
    }

    await logSync("google-sheets", "success", records.length, null);

    return {
      success: true,
      newRecords: records.length,
      lastExternalTimestamp: new Date().toISOString(),
      records,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logSync("google-sheets", "error", 0, errorMessage);
    return {
      success: false,
      newRecords: 0,
      lastExternalTimestamp: lastSyncAt ?? new Date().toISOString(),
      error: errorMessage,
    };
  }
}

async function logSync(
  provider: string,
  status: "success" | "error",
  records: number,
  error: string | null
): Promise<void> {
  await integrationDb.syncLogs.add({
    id: crypto.randomUUID(),
    direction: "inbound",
    provider,
    eventType: "poll",
    status,
    requestPayload: JSON.stringify({ records }),
    responsePayload: error ?? "",
    httpStatus: status === "success" ? 200 : null,
    errorMessage: error,
    retryCount: 0,
    createdAt: new Date().toISOString(),
  });
}
