import Dexie, { type Table } from "dexie";
import type { EncryptedPayload } from "@/integrations/crypto";

/** @deprecated Nunca fue cableado a ninguna UI real (ver spec 018 §3, spec 020
 * §D) — reemplazado por `IntegrationConnection`. Se deja la tabla declarada
 * (nadie escribe en ella) para no romper el esquema Dexie ya publicado. */
export interface IntegrationConfig {
  key: string;
  provider: "hubspot" | "google-sheets" | "zapier" | "email" | "custom";
  encryptedPayload: EncryptedPayload;
  enabled: boolean;
  lastTestedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Proveedores externos con conexión reutilizable (spec 020 — Integraciones =
 * conexiones, Flujos = automatizaciones que las referencian por `id`).
 * `webhook-inbox` (spec 032 §B) es un proxy Apps Script del usuario que acumula
 * las entregas empujadas por Make/Zapier/n8n; Hito las drena por polling. */
export type ConnectionProvider = "hubspot" | "google-sheets" | "email" | "webhook-inbox";

/** Una conexión configurada una sola vez y reutilizable desde cualquier Flujo
 * vía `connectionId`. Los campos no sensibles (URLs, ids) van en `config` en
 * claro; el único secreto (token/API key, si el proveedor lo requiere) se
 * cifra con el vault en `encryptedSecret`. */
export interface IntegrationConnection {
  id: string;
  provider: ConnectionProvider;
  /** Nombre visible del usuario, ej. "HubSpot producción". */
  name: string;
  /** Config no sensible, forma según provider:
   *  - hubspot: { proxyUrl }
   *  - google-sheets: { proxyUrl, spreadsheetId?, range? }
   *  - email: { proxyUrl, fromEmail } */
  config: Record<string, unknown>;
  /** Token/credencial cifrada. `null` si el proveedor no requiere secreto. */
  encryptedSecret: EncryptedPayload | null;
  enabled: boolean;
  lastTestedAt: string | null;
  lastTestOk: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookSubscription {
  id: string;
  name: string;
  url: string;
  encryptedSecret: EncryptedPayload;
  events: string[];
  filters: {
    projectIds?: string[];
    areaIds?: string[];
  };
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SyncLog {
  id: string;
  direction: "inbound" | "outbound";
  provider: string;
  eventType: string;
  status: "success" | "error" | "pending";
  requestPayload: string;
  responsePayload: string;
  httpStatus: number | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
  /** Replay (spec 033 A1): para entregas `outbound` de webhook de un Flujo,
   *  identifica el output que originó la entrega dentro del Flujo vivo, de
   *  donde `DeliveryDetailDrawer` recupera el `secret`/`url`/`payloadShape`
   *  para reconstruir la request. Ausente para entradas que no vienen de un
   *  Flujo (HubSpot/Sheets/email legacy). */
  flowId?: string;
  outputIndex?: number;
  /** Id del run que originó esta entrega (spec 033 C1 deep-link), cuando
   *  aplica — permite saltar desde SyncLogsPage al run del historial. */
  runId?: string;
  /** `data` interpolado que alimentó al output (spec 033 A1 replay) —
   *  JSON del registro runtime, truncado, para que `DeliveryDetailDrawer`
   *  reconstruya la request con `buildWebhookRequest(output, data)`. El
   *  `secret` de firma NO va aquí (se recupera del Flujo vivo); este es
   *  el registro que el output ya procesó (mismo que se envió en el body). */
  replayData?: string;
}

export interface OutboundDelivery {
  id: string;
  subscriptionId: string;
  url: string;
  event: string;
  payload: string;
  signature: string;
  attemptCount: number;
  nextRetryAt: string;
  createdAt: string;
}

export class IntegrationDatabase extends Dexie {
  integrationConfigs!: Table<IntegrationConfig, string>;
  webhookSubscriptions!: Table<WebhookSubscription, string>;
  syncLogs!: Table<SyncLog, string>;
  outboundQueue!: Table<OutboundDelivery, string>;
  integrationConnections!: Table<IntegrationConnection, string>;

  constructor() {
    super("hito-integrations");

    this.version(1).stores({
      integrationConfigs: "key, provider, enabled",
      webhookSubscriptions: "id, enabled, *events",
      syncLogs: "id, direction, provider, eventType, status, createdAt, [provider+status]",
      outboundQueue: "id, subscriptionId, nextRetryAt, attemptCount",
    });

    // v2: nueva tabla `integrationConnections` (spec 020). Se agrega como
    // versión adicional en vez de tocar `integrationConfigs` en la v1 para no
    // romper el esquema Dexie ya publicado en navegadores de usuarios reales.
    this.version(2).stores({
      integrationConnections: "id, provider, enabled",
    });
  }
}

export const integrationDb = new IntegrationDatabase();

export async function clearIntegrationDb(): Promise<void> {
  await integrationDb.delete();
}
