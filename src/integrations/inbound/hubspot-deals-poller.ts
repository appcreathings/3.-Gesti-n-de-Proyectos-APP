import type { PollResult } from "../polling/polling-manager";
import type { HubSpotConfig } from "./hubspot-poller";
import { idempotencyCheck } from "./idempotency";
import { postToProxy } from "../proxy-fetch";
import { buildHubSpotSearchBody, mergeProperties } from "./hubspot-search";

const DEALS_FLOOR = ["dealname", "lastmodifieddate", "createdate"];

interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    closedate?: string;
    hubspot_owner_id?: string;
    pipeline?: string;
    createdate?: string;
    lastmodifieddate?: string;
  };
}

/**
 * Fetches deals from HubSpot via the user's proxy. Only fetches and flattens
 * records — applying them (createTask/createPerson/etc.) is the flow
 * engine's job, driven by the flow the user configured for this trigger.
 */
export async function pollHubSpotDeals(
  config: HubSpotConfig,
  lastSyncAt: string | null
): Promise<PollResult> {
  try {
    const body = buildHubSpotSearchBody({
      properties: mergeProperties(config.fields, DEALS_FLOOR),
      filters: config.filters,
      lastSyncAt,
    });

    const result = await postToProxy<{ results?: HubSpotDeal[] }>(config.proxyUrl, {
      _hubspotToken: config.credentials.accessToken,
      path: "/crm/v3/objects/deals/search",
      method: "POST",
      body,
    });

    if (!result.ok) {
      return {
        success: false,
        newRecords: 0,
        lastExternalTimestamp: lastSyncAt ?? new Date().toISOString(),
        error: `HubSpot Deals API error: ${result.message}`,
      };
    }

    const deals: HubSpotDeal[] = result.data.results ?? [];

    const records: Record<string, unknown>[] = [];
    for (const deal of deals) {
      const isDuplicate = await idempotencyCheck(`hubspot-deal-${deal.id}`);
      if (isDuplicate) continue;
      records.push({ id: deal.id, ...deal.properties });
    }

    const latestTimestamp =
      deals.length > 0
        ? (deals[deals.length - 1].properties.lastmodifieddate ??
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
