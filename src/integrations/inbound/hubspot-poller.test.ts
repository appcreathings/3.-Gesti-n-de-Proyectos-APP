import { describe, it, expect, vi, beforeEach } from "vitest";
import { pollHubSpot } from "./hubspot-poller";
import type { HubSpotConfig } from "./hubspot-poller";

vi.mock("./idempotency", () => ({
  idempotencyCheck: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/storage/integration-db", () => ({
  integrationDb: { syncLogs: { add: vi.fn().mockResolvedValue(undefined) } },
}));

describe("pollHubSpot (contacts)", () => {
  const mockConfig: HubSpotConfig = {
    proxyUrl: "https://script.google.com/macros/s/test/exec",
    credentials: { accessToken: "test-token" },
    pollingIntervalMs: 300000,
    objectTypes: ["contacts"],
    fields: [],
    filters: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the real Search endpoint (POST /crm/v3/objects/contacts/search), not the List GET", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 200, data: { results: [] } }),
    });
    global.fetch = fetchMock;

    await pollHubSpot(mockConfig, null);

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody.path).toBe("/crm/v3/objects/contacts/search");
    expect(requestBody.method).toBe("POST");
    expect(fetchMock).toHaveBeenCalledWith(
      mockConfig.proxyUrl,
      expect.objectContaining({ headers: { "Content-Type": "text/plain;charset=utf-8" } })
    );
  });

  it("flattens contacts into flat records, deduped via idempotency", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 200,
          data: {
            results: [
              { id: "1", properties: { email: "a@b.com", firstname: "Ana", lastmodifieddate: "2026-01-01T00:00:00Z" } },
            ],
          },
        }),
    });

    const result = await pollHubSpot(mockConfig, null);
    expect(result.success).toBe(true);
    expect(result.records).toEqual([
      { id: "1", email: "a@b.com", firstname: "Ana", lastmodifieddate: "2026-01-01T00:00:00Z" },
    ]);
  });

  it("treats a {status:401} envelope as an auth error, not '0 contacts'", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, // Apps Script transport is always 200
      json: () => Promise.resolve({ status: 401, data: { message: "invalid token" } }),
    });

    const result = await pollHubSpot(mockConfig, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("invalid token");
  });

  it("sends the mandatory floor properties even with no user-selected fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 200, data: { results: [] } }),
    });
    global.fetch = fetchMock;

    await pollHubSpot(mockConfig, null);

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody.body.properties).toEqual(
      expect.arrayContaining(["email", "lastmodifieddate", "createdate"])
    );
  });
});
