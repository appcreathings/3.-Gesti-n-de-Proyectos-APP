import { describe, it, expect, vi, beforeEach } from "vitest";
import { pollHubSpotTickets } from "./hubspot-tickets-poller";
import type { HubSpotConfig } from "./hubspot-poller";

// Mock dependencies
vi.mock("./idempotency", () => ({
  idempotencyCheck: vi.fn().mockResolvedValue(false),
}));

describe("pollHubSpotTickets", () => {
  const mockConfig: HubSpotConfig = {
    proxyUrl: "https://script.google.com/macros/s/test/exec",
    credentials: { accessToken: "test-token" },
    pollingIntervalMs: 300000,
    objectTypes: ["tickets"],
    fields: [],
    filters: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch tickets from HubSpot API", async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          results: [
            {
              id: "ticket-1",
              properties: {
                subject: "Test Ticket",
                content: "This is a test ticket",
                hs_ticket_priority: "HIGH",
                hs_pipeline_stage: "1",
                hs_ticket_category: "technical",
                lastmodifieddate: "2024-01-10T10:00:00Z",
              },
            },
          ],
        }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await pollHubSpotTickets(mockConfig, null);

    expect(result.success).toBe(true);
    expect(result.newRecords).toBe(1);
    expect(result.records).toEqual([
      {
        id: "ticket-1",
        subject: "Test Ticket",
        content: "This is a test ticket",
        hs_ticket_priority: "HIGH",
        hs_pipeline_stage: "1",
        hs_ticket_category: "technical",
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
      status: 403,
      statusText: "Forbidden",
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await pollHubSpotTickets(mockConfig, null);

    expect(result.success).toBe(false);
    expect(result.error).toContain("403");
    expect(result.error).toContain("Forbidden");
  });

  it("should handle network errors", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await pollHubSpotTickets(mockConfig, null);

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
    await pollHubSpotTickets(mockConfig, lastSyncAt);

    const fetchCall = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody.path).toBe("/crm/v3/objects/tickets/search");
    expect(requestBody.method).toBe("POST");
    expect(requestBody.body.filterGroups[0].filters).toContainEqual({
      propertyName: "lastmodifieddate",
      operator: "GT",
      value: lastSyncAt,
    });
  });

  it("should return empty results when no tickets found", async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await pollHubSpotTickets(mockConfig, null);

    expect(result.success).toBe(true);
    expect(result.newRecords).toBe(0);
  });

  it("sends the user's chosen fields (Campos a traer) plus the mandatory floor in body.properties", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: [] }) });
    global.fetch = fetchMock;

    await pollHubSpotTickets({ ...mockConfig, fields: ["hs_ticket_priority"] }, null);

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const properties: string[] = requestBody.body.properties;
    expect(properties).toEqual(
      expect.arrayContaining(["hs_ticket_priority", "subject", "lastmodifieddate", "createdate"])
    );
  });

  it("sends the user's poll filters (Filtros) in body.filterGroups", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ results: [] }) });
    global.fetch = fetchMock;

    await pollHubSpotTickets(
      { ...mockConfig, filters: [{ field: "hs_ticket_priority", op: "==", value: "HIGH" }] },
      null
    );

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody.body.filterGroups[0].filters).toContainEqual({
      propertyName: "hs_ticket_priority",
      operator: "EQ",
      value: "HIGH",
    });
  });
});
