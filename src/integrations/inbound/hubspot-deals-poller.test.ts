import { describe, it, expect, vi, beforeEach } from "vitest";
import { pollHubSpotDeals } from "./hubspot-deals-poller";
import type { HubSpotConfig } from "./hubspot-poller";

// Mock dependencies
vi.mock("./idempotency", () => ({
  idempotencyCheck: vi.fn().mockResolvedValue(false),
}));

describe("pollHubSpotDeals", () => {
  const mockConfig: HubSpotConfig = {
    proxyUrl: "https://script.google.com/macros/s/test/exec",
    credentials: { accessToken: "test-token" },
    pollingIntervalMs: 300000,
    objectTypes: ["deals"],
    fields: [],
    filters: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch deals from HubSpot API", async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            {
              id: "deal-1",
              properties: {
                dealname: "Test Deal",
                amount: "10000",
                dealstage: "closedwon",
                closedate: "2024-01-15",
                pipeline: "default",
                lastmodifieddate: "2024-01-10T10:00:00Z",
              },
            },
          ],
        }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await pollHubSpotDeals(mockConfig, null);

    expect(result.success).toBe(true);
    expect(result.newRecords).toBe(1);
    expect(result.records).toEqual([
      {
        id: "deal-1",
        dealname: "Test Deal",
        amount: "10000",
        dealstage: "closedwon",
        closedate: "2024-01-15",
        pipeline: "default",
        lastmodifieddate: "2024-01-10T10:00:00Z",
      },
    ]);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://script.google.com/macros/s/test/exec",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      })
    );
  });

  it("should handle API errors", async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await pollHubSpotDeals(mockConfig, null);

    expect(result.success).toBe(false);
    expect(result.error).toContain("401");
    expect(result.error).toContain("Unauthorized");
  });

  it("should handle network errors", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await pollHubSpotDeals(mockConfig, null);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Network error");
  });

  it("should use lastSyncAt for incremental sync via the real HubSpot Search endpoint", async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    };

    const fetchMock = vi.fn().mockResolvedValue(mockResponse);
    global.fetch = fetchMock;

    const lastSyncAt = "2024-01-01T00:00:00Z";
    await pollHubSpotDeals(mockConfig, lastSyncAt);

    const fetchCall = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    // GT filterGroups on a GET query param does nothing on HubSpot's List
    // endpoint — only the Search endpoint supports filterGroups at all.
    expect(requestBody.path).toBe("/crm/v3/objects/deals/search");
    expect(requestBody.method).toBe("POST");
    expect(requestBody.body.filterGroups[0].filters).toContainEqual({
      propertyName: "lastmodifieddate",
      operator: "GT",
      value: lastSyncAt,
    });
  });

  it("should return empty results when no deals found", async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await pollHubSpotDeals(mockConfig, null);

    expect(result.success).toBe(true);
    expect(result.newRecords).toBe(0);
  });

  it("sends the user's chosen fields (Campos a traer) plus the mandatory floor in body.properties", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: [] }) });
    global.fetch = fetchMock;

    await pollHubSpotDeals({ ...mockConfig, fields: ["amount", "pipeline"] }, null);

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const properties: string[] = requestBody.body.properties;
    expect(properties).toEqual(expect.arrayContaining(["amount", "pipeline", "dealname", "lastmodifieddate", "createdate"]));
  });

  it("sends the user's poll filters (Filtros) in body.filterGroups", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: [] }) });
    global.fetch = fetchMock;

    await pollHubSpotDeals(
      { ...mockConfig, filters: [{ field: "amount", op: ">", value: 1000 }] },
      null
    );

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody.body.filterGroups[0].filters).toContainEqual({
      propertyName: "amount",
      operator: "GT",
      value: "1000",
    });
  });
});
