import { integrationDb } from "@/storage/integration-db";
import type { PollResult } from "../polling/polling-manager";
import type { PollFilter } from "@/domain/schemas/flow";
import { idempotencyCheck } from "./idempotency";
import { postToProxy } from "../proxy-fetch";
import { buildHubSpotSearchBody, mergeProperties } from "./hubspot-search";

export interface HubSpotCredentials {
  accessToken: string;
  portalId?: string;
}

export interface HubSpotConfig {
  proxyUrl: string;
  credentials: HubSpotCredentials;
  pollingIntervalMs: number;
  objectTypes: string[];
  /** Campos elegidos por el usuario en el trigger ("Campos a traer"). Se
   * unen con un piso obligatorio por tipo — ver `mergeProperties`. */
  fields: string[];
  /** Filtros elegidos por el usuario ("Filtros"). Antes se perdían: nunca
   * llegaban desde `hubspot-polling-manager.ts` (spec 021 §2). */
  filters: PollFilter[];
}

/** Propiedades que siempre se piden, sin importar lo que el usuario elija en
 * "Campos a traer" — necesarias para el sync incremental (`lastmodifieddate`)
 * y para que el registro nunca llegue vacío al motor. */
const CONTACTS_FLOOR = ["email", "lastmodifieddate", "createdate"];

interface HubSpotContact {
  id: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    phone?: string;
    lastmodifieddate?: string;
    createdate?: string;
    [key: string]: string | undefined;
  };
}

interface HubSpotResponse {
  results: HubSpotContact[];
  paging?: {
    next?: {
      after: string;
      link: string;
    };
  };
}

/**
 * Fetches contacts from HubSpot via the user's proxy. Only fetches and
 * flattens records — it does NOT create/update any Person or Task. Applying
 * the fetched records to the domain is the flow engine's job (see
 * `useDataStore.runPolledFlow`), driven by whatever flow the user configured
 * for this trigger (mapping + outputs).
 */
export async function pollHubSpot(
  config: HubSpotConfig,
  lastSyncAt: string | null
): Promise<PollResult> {
  try {
    const body = buildHubSpotSearchBody({
      properties: mergeProperties(config.fields, CONTACTS_FLOOR),
      filters: config.filters,
      lastSyncAt,
    });

    const result = await postToProxy<HubSpotResponse>(config.proxyUrl, {
      _hubspotToken: config.credentials.accessToken,
      path: "/crm/v3/objects/contacts/search",
      method: "POST",
      body,
    });

    if (!result.ok) {
      return {
        success: false,
        newRecords: 0,
        lastExternalTimestamp: lastSyncAt ?? new Date().toISOString(),
        error: `HubSpot API error: ${result.message}`,
      };
    }

    const contacts = result.data.results ?? [];

    const records: Record<string, unknown>[] = [];
    for (const contact of contacts) {
      const isDuplicate = await idempotencyCheck(`hubspot-${contact.id}`);
      if (isDuplicate) continue;
      records.push({ id: contact.id, ...contact.properties });
    }

    const latestTimestamp =
      contacts.length > 0
        ? (contacts[contacts.length - 1].properties.lastmodifieddate ??
          new Date().toISOString())
        : (lastSyncAt ?? new Date().toISOString());

    await logSync("hubspot", "success", records.length, null);

    return {
      success: true,
      newRecords: records.length,
      lastExternalTimestamp: latestTimestamp,
      records,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logSync("hubspot", "error", 0, errorMessage);

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
