import { integrationDb } from "@/storage/integration-db";
import type { ConnectionProvider, IntegrationConnection } from "@/storage/integration-db";
import { useVaultStore } from "./vault";
import { postToProxy } from "./proxy-fetch";
import { parseSheetRows } from "./inbound/sheets-poller";

/** Cuántos registros de muestra trae "Probar conexión" — solo para poblar el
 * picker de mapeo de campos (spec 022 §A), no para volumen de datos. */
const SAMPLE_SIZE = 3;

export type { ConnectionProvider, IntegrationConnection };

export async function getConnections(provider?: ConnectionProvider): Promise<IntegrationConnection[]> {
  const all = await integrationDb.integrationConnections.toArray();
  return provider ? all.filter((c) => c.provider === provider) : all;
}

export async function getConnection(id: string): Promise<IntegrationConnection | undefined> {
  return integrationDb.integrationConnections.get(id);
}

export interface CreateConnectionInput {
  provider: ConnectionProvider;
  name: string;
  config: Record<string, unknown>;
  /** Texto plano; se cifra con el vault antes de persistir. Omitir si el
   * proveedor no requiere secreto. */
  secret?: string;
}

export async function createConnection(input: CreateConnectionInput): Promise<IntegrationConnection> {
  const now = new Date().toISOString();
  let encryptedSecret: IntegrationConnection["encryptedSecret"] = null;
  if (input.secret) {
    if (!useVaultStore.getState().isUnlocked) {
      throw new Error("El vault debe estar desbloqueado para guardar un secreto.");
    }
    encryptedSecret = await useVaultStore.getState().encrypt(input.secret);
  }

  const connection: IntegrationConnection = {
    id: crypto.randomUUID(),
    provider: input.provider,
    name: input.name,
    config: input.config,
    encryptedSecret,
    enabled: true,
    lastTestedAt: null,
    lastTestOk: null,
    createdAt: now,
    updatedAt: now,
  };
  await integrationDb.integrationConnections.add(connection);
  return connection;
}

export interface UpdateConnectionInput {
  name?: string;
  config?: Record<string, unknown>;
  enabled?: boolean;
  /** Si se provee, reemplaza el secreto cifrado. Omitir para conservar el
   * existente (nunca reescribir con un valor enmascarado). */
  secret?: string;
}

export async function updateConnection(id: string, updates: UpdateConnectionInput): Promise<void> {
  const patch: Partial<IntegrationConnection> = { updatedAt: new Date().toISOString() };
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.config !== undefined) patch.config = updates.config;
  if (updates.enabled !== undefined) patch.enabled = updates.enabled;
  if (updates.secret) {
    if (!useVaultStore.getState().isUnlocked) {
      throw new Error("El vault debe estar desbloqueado para actualizar el secreto.");
    }
    patch.encryptedSecret = await useVaultStore.getState().encrypt(updates.secret);
  }
  await integrationDb.integrationConnections.update(id, patch);
}

export async function deleteConnection(id: string): Promise<void> {
  await integrationDb.integrationConnections.delete(id);
}

/** Descifra el secreto de una conexión ya guardada. `null` si no tiene uno. */
export async function resolveConnectionSecret(id: string): Promise<string | null> {
  const conn = await getConnection(id);
  if (!conn?.encryptedSecret) return null;
  return useVaultStore.getState().decrypt<string>(conn.encryptedSecret);
}

export async function markConnectionTested(id: string, ok: boolean): Promise<void> {
  await integrationDb.integrationConnections.update(id, {
    lastTestedAt: new Date().toISOString(),
    lastTestOk: ok,
  });
}

export interface ConnectionTestResult {
  ok: boolean;
  /** Mensaje honesto sobre qué se verificó — para HubSpot y Sheets es una
   * llamada real a la API vía el proxy; para Email (sin contrato de "test"
   * dedicado) solo confirma que el proxy responde. */
  detail: string;
  /** Registros de muestra reales, si la prueba los obtuvo — usado para poblar
   * el picker de mapeo de campos en el paso de Transformación (spec 022 §A),
   * no para volumen de datos (como mucho `SAMPLE_SIZE`). */
  sample?: Record<string, unknown>[];
}

/** Prueba una conexión con datos aún no guardados (formulario) o ya guardados.
 * Envoltura fina sobre `runConnectionProbe` con la operación por defecto de
 * cada proveedor — se conserva para no romper a quienes ya la llaman
 * (`IntegrationsPage.tsx` "Probar" rápido, spec 022 sample-mapping). El
 * "Explorador de conexión" (spec 023 §B) usa `runConnectionProbe`
 * directamente para elegir otras operaciones y ver la respuesta cruda. */
export async function testConnection(
  provider: ConnectionProvider,
  config: Record<string, unknown>,
  secret: string | null
): Promise<ConnectionTestResult> {
  const result = await runConnectionProbe(provider, config, secret, {
    operation: DEFAULT_PROBE_OPERATION[provider],
  });
  return { ok: result.ok, detail: result.detail, sample: result.records };
}

export type HubSpotProbeOperation = "contacts" | "deals" | "tickets" | "search" | "custom";
export type SheetsProbeOperation = "read";
export type EmailProbeOperation = "ping" | "send-test";
export type InboxProbeOperation = "drain";
export type ProbeOperation =
  | HubSpotProbeOperation
  | SheetsProbeOperation
  | EmailProbeOperation
  | InboxProbeOperation;

const DEFAULT_PROBE_OPERATION: Record<ConnectionProvider, ProbeOperation> = {
  hubspot: "contacts",
  "google-sheets": "read",
  email: "ping",
  "webhook-inbox": "drain",
};

/** Operaciones que el Explorador de conexión ofrece, por proveedor (spec 023
 * §B) — así la UI no hardcodea la lista en dos lugares. */
export const PROBE_OPERATIONS_BY_PROVIDER: Record<ConnectionProvider, { value: ProbeOperation; label: string }[]> = {
  hubspot: [
    { value: "contacts", label: "Contactos" },
    { value: "deals", label: "Negocios (deals)" },
    { value: "tickets", label: "Tickets" },
    { value: "search", label: "Search (endpoint real de polling)" },
    { value: "custom", label: "Ruta personalizada (GET)" },
  ],
  "google-sheets": [{ value: "read", label: "Leer rango" }],
  email: [
    { value: "ping", label: "Verificar alcance (sin enviar correo)" },
    { value: "send-test", label: "Enviar correo de prueba" },
  ],
  "webhook-inbox": [{ value: "drain", label: "Ver entregas pendientes de Make/Zapier" }],
};

export interface ConnectionProbeOptions {
  operation?: ProbeOperation;
  /** Solo para HubSpot, operación "custom": path GET libre, ej.
   * "/crm/v3/objects/companies". */
  customPath?: string;
  /** Solo para Email, operación "send-test": a quién mandar el correo de
   * prueba. Si se omite, usa el `fromEmail` de la conexión. */
  testRecipient?: string;
}

export interface ConnectionProbeResult {
  ok: boolean;
  detail: string;
  /** Respuesta cruda del proxy/API, sin procesar — para inspección en el
   * Explorador de conexión (spec 023 §B). */
  raw?: unknown;
  /** Registros aplanados, cuando la operación devuelve una lista (HubSpot,
   * Sheets). Ausente para operaciones sin lista (email). */
  records?: Record<string, unknown>[];
}

function hubspotProbeRequest(
  operation: HubSpotProbeOperation,
  customPath: string | undefined
): { path: string; method: "GET" | "POST"; body?: Record<string, unknown> } | null {
  switch (operation) {
    case "contacts":
      return { path: `/crm/v3/objects/contacts?limit=${SAMPLE_SIZE}`, method: "GET" };
    case "deals":
      return { path: `/crm/v3/objects/deals?limit=${SAMPLE_SIZE}`, method: "GET" };
    case "tickets":
      return { path: `/crm/v3/objects/tickets?limit=${SAMPLE_SIZE}`, method: "GET" };
    case "search":
      // Mismo endpoint que usan los pollers reales (`hubspot-search.ts`) —
      // confirma que el token tiene el scope de Search antes de configurar
      // filtros en un flujo.
      return { path: "/crm/v3/objects/contacts/search", method: "POST", body: { limit: SAMPLE_SIZE } };
    case "custom":
      return customPath?.trim() ? { path: customPath.trim(), method: "GET" } : null;
  }
}

function hubspotProbeDetail(operation: HubSpotProbeOperation, count: number): string {
  if (operation === "contacts") return "Conexión con HubSpot verificada.";
  const opLabel: Record<HubSpotProbeOperation, string> = {
    contacts: "contactos",
    deals: "negocios",
    tickets: "tickets",
    search: "búsqueda (endpoint real de polling)",
    custom: "ruta personalizada",
  };
  return `HubSpot respondió — ${count} registro(s) (${opLabel[operation]}).`;
}

function extractHubSpotRecords(raw: unknown): Record<string, unknown>[] {
  const results = (raw as { results?: { id?: string; properties?: Record<string, unknown> }[] } | undefined)
    ?.results;
  if (!Array.isArray(results)) return [];
  return results.map((r) => ({ id: r.id, ...r.properties }));
}

/** Prueba una conexión eligiendo la operación (spec 023 §B "Explorador de
 * conexión") y devuelve la respuesta cruda además de los registros
 * aplanados — a diferencia de `testConnection`, que solo confirma
 * éxito/fallo con una operación fija. */
export async function runConnectionProbe(
  provider: ConnectionProvider,
  config: Record<string, unknown>,
  secret: string | null,
  options: ConnectionProbeOptions = {}
): Promise<ConnectionProbeResult> {
  const proxyUrl = typeof config.proxyUrl === "string" ? config.proxyUrl : "";
  if (!proxyUrl) return { ok: false, detail: "Falta la URL del proxy." };

  if (provider === "hubspot") {
    if (!secret) return { ok: false, detail: "Falta el access token de HubSpot." };
    const operation = (options.operation as HubSpotProbeOperation | undefined) ?? "contacts";
    const request = hubspotProbeRequest(operation, options.customPath);
    if (!request) return { ok: false, detail: "Indica una ruta para la operación personalizada." };

    const result = await postToProxy<unknown>(proxyUrl, {
      _hubspotToken: secret,
      path: request.path,
      method: request.method,
      ...(request.body ? { body: request.body } : {}),
    });
    if (!result.ok) return { ok: false, detail: result.message };
    const records = extractHubSpotRecords(result.data);
    return { ok: true, detail: hubspotProbeDetail(operation, records.length), raw: result.data, records };
  }

  if (provider === "google-sheets") {
    const spreadsheetId = typeof config.spreadsheetId === "string" ? config.spreadsheetId : "";
    const range = typeof config.range === "string" ? config.range : "";
    if (!spreadsheetId || !range) {
      return { ok: false, detail: "Falta el ID del spreadsheet o el rango." };
    }
    const result = await postToProxy<{ values?: string[][] }>(proxyUrl, {
      action: "read",
      spreadsheetId,
      range,
    });
    if (!result.ok) return { ok: false, detail: result.message };
    const rows = result.data.values ?? [];
    const headerRow = Number(config.headerRow) || 1;
    const records = parseSheetRows(rows, headerRow).slice(0, SAMPLE_SIZE);
    return {
      ok: true,
      detail: `Conexión con Sheets verificada — ${Math.max(rows.length - headerRow, 0)} fila(s) de datos encontradas.`,
      raw: result.data,
      records,
    };
  }

  if (provider === "webhook-inbox") {
    // Probar = drenar la cola SIN avanzar cursor (cursor vacío) para mostrar
    // una muestra real de lo que Make/Zapier ya empujó, sin consumirlo (el
    // proxy no borra al drenar; el poll real usa su propio cursor). Alimenta el
    // picker de variables igual que HubSpot/Sheets.
    const result = await postToProxy<{ deliveries?: { deliveryId: string; receivedAt: string; body: unknown }[]; backlog?: number }>(
      proxyUrl,
      { action: "drain", cursor: "", max: SAMPLE_SIZE, ...(secret ? { secret } : {}) }
    );
    if (!result.ok) return { ok: false, detail: result.message };
    const deliveries = result.data.deliveries ?? [];
    const records = deliveries.map((d) => {
      const body = d.body && typeof d.body === "object" && !Array.isArray(d.body) ? d.body : { value: d.body };
      return { deliveryId: d.deliveryId, receivedAt: d.receivedAt, ...(body as Record<string, unknown>) };
    });
    const backlog = result.data.backlog ?? deliveries.length;
    return {
      ok: true,
      detail:
        deliveries.length > 0
          ? `Inbox alcanzable — ${backlog} entrega(s) pendiente(s).`
          : "Inbox alcanzable — sin entregas pendientes aún. Envía un POST de prueba desde Make/Zapier.",
      raw: result.data,
      records,
    };
  }

  // Email
  const operation = (options.operation as EmailProbeOperation | undefined) ?? "ping";
  if (operation === "send-test") {
    const fromEmail = typeof config.fromEmail === "string" ? config.fromEmail : "";
    const to = options.testRecipient?.trim() || fromEmail;
    if (!to) return { ok: false, detail: "Indica un destinatario para el correo de prueba." };

    const { sendEmailViaAppsScript } = await import("./outbound/email-via-apps-script");
    const result = await sendEmailViaAppsScript(
      { proxyUrl, fromEmail },
      {
        to,
        subject: "Correo de prueba de Hito",
        htmlBody: "Este es un correo de prueba enviado desde Integraciones en Hito.",
      }
    );
    return result.success
      ? { ok: true, detail: `Correo de prueba enviado a ${to}.` }
      : { ok: false, detail: result.error ?? "Error al enviar el correo de prueba." };
  }

  // "ping": no hay contrato de proxy con acción dedicada de "test" para
  // email — solo confirmamos que el proxy es alcanzable. Es un GET simple
  // (sin body), no pasa por `postToProxy` — no hay preflight que evitar aquí.
  try {
    const response = await fetch(proxyUrl, {
      method: "GET",
      signal: AbortSignal.timeout(8_000),
    });
    return response.status < 500
      ? { ok: true, detail: "El proxy respondió — alcanzable." }
      : { ok: false, detail: `El proxy respondió ${response.status}.` };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "Error de red." };
  }
}
