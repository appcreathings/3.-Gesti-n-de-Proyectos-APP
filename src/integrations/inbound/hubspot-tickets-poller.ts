import type { PollResult } from "../polling/polling-manager";
import type { HubSpotConfig } from "./hubspot-poller";
import { idempotencyCheck } from "./idempotency";
import { postToProxy } from "../proxy-fetch";
import { buildHubSpotSearchBody, mergeProperties } from "./hubspot-search";

const TICKETS_FLOOR = ["subject", "lastmodifieddate", "createdate"];

interface HubSpotTicket {
  id: string;
  properties: {
    subject?: string;
    content?: string;
    hs_ticket_priority?: string;
    hs_pipeline_stage?: string;
    hs_pipeline?: string;
    hs_ticket_category?: string;
    createdate?: string;
    lastmodifieddate?: string;
  };
}

/**
 * Fetches tickets from HubSpot via the user's proxy. Only fetches and
 * flattens records — applying them (createTask/createPerson/etc.) is the
 * flow engine's job, driven by the flow the user configured for this
 * trigger.
 */
export async function pollHubSpotTickets(
  config: HubSpotConfig,
  lastSyncAt: string | null
): Promise<PollResult> {
  try {
    const body = buildHubSpotSearchBody({
      properties: mergeProperties(config.fields, TICKETS_FLOOR),
      filters: config.filters,
      lastSyncAt,
    });

    const result = await postToProxy<{ results?: HubSpotTicket[] }>(config.proxyUrl, {
      _hubspotToken: config.credentials.accessToken,
      path: "/crm/v3/objects/tickets/search",
      method: "POST",
      body,
    });

    if (!result.ok) {
      return {
        success: false,
        newRecords: 0,
        lastExternalTimestamp: lastSyncAt ?? new Date().toISOString(),
        error: `HubSpot Tickets API error: ${result.message}`,
      };
    }

    const tickets: HubSpotTicket[] = result.data.results ?? [];

    const records: Record<string, unknown>[] = [];
    for (const ticket of tickets) {
      const isDuplicate = await idempotencyCheck(`hubspot-ticket-${ticket.id}`);
      if (isDuplicate) continue;
      records.push({ id: ticket.id, ...ticket.properties });
    }

    const latestTimestamp =
      tickets.length > 0
        ? (tickets[tickets.length - 1].properties.lastmodifieddate ??
          new Date().toISOString())
        : (lastSyncAt ?? new Date().toISOString());

    return {
      success: true,
      newRecords: records.length,
      lastExternalTimestamp: latestTimestamp,
      records,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      newRecords: 0,
      lastExternalTimestamp: lastSyncAt ?? new Date().toISOString(),
      error: errorMessage,
    };
  }
}
