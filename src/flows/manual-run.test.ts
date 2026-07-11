import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchPollSampleForFlow } from "./manual-run";
import { pollHubSpot } from "@/integrations/inbound/hubspot-poller";
import { pollHubSpotDeals } from "@/integrations/inbound/hubspot-deals-poller";
import { pollGoogleSheets } from "@/integrations/inbound/sheets-poller";
import type { PollTrigger } from "@/domain/schemas/flow";

vi.mock("@/integrations/connections", () => ({
  getConnection: vi.fn(),
  resolveConnectionSecret: vi.fn(),
}));
vi.mock("@/integrations/inbound/hubspot-poller", () => ({ pollHubSpot: vi.fn() }));
vi.mock("@/integrations/inbound/hubspot-deals-poller", () => ({ pollHubSpotDeals: vi.fn() }));
vi.mock("@/integrations/inbound/hubspot-tickets-poller", () => ({ pollHubSpotTickets: vi.fn() }));
vi.mock("@/integrations/inbound/sheets-poller", () => ({ pollGoogleSheets: vi.fn() }));

import { getConnection, resolveConnectionSecret } from "@/integrations/connections";

const mockedGetConnection = vi.mocked(getConnection);
const mockedResolveSecret = vi.mocked(resolveConnectionSecret);
const mockedPollHubSpot = vi.mocked(pollHubSpot);
const mockedPollHubSpotDeals = vi.mocked(pollHubSpotDeals);
const mockedPollGoogleSheets = vi.mocked(pollGoogleSheets);

function makeHubspotTrigger(objectType: "contacts" | "deals" | "tickets" = "contacts"): PollTrigger {
  return {
    type: "poll",
    provider: "hubspot",
    config: {
      connectionId: "conn-1",
      objectType,
      fields: ["email"],
      filters: [],
      intervalMs: 300000,
    },
  };
}

function makeSheetsTrigger(): PollTrigger {
  return {
    type: "poll",
    provider: "google-sheets",
    config: { connectionId: "conn-2", fields: [], filters: [], intervalMs: 300000 },
  };
}

describe("fetchPollSampleForFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hubspot: calls the real poller with lastSyncAt: null (never the incremental watermark)", async () => {
    mockedGetConnection.mockResolvedValue({
      id: "conn-1",
      provider: "hubspot",
      name: "HS",
      config: { proxyUrl: "https://proxy" },
      encryptedSecret: { ciphertext: "x", iv: "y", salt: "z" },
      enabled: true,
      lastTestedAt: null,
      lastTestOk: null,
      createdAt: "",
      updatedAt: "",
    });
    mockedResolveSecret.mockResolvedValue("token-123");
    mockedPollHubSpot.mockResolvedValue({
      success: true,
      newRecords: 1,
      lastExternalTimestamp: "now",
      records: [{ id: "1", email: "a@b.com" }],
    });

    const result = await fetchPollSampleForFlow(makeHubspotTrigger("contacts"));

    expect(result.ok).toBe(true);
    expect(result.records).toEqual([{ id: "1", email: "a@b.com" }]);
    expect(mockedPollHubSpot).toHaveBeenCalledWith(
      expect.objectContaining({ credentials: { accessToken: "token-123" }, fields: ["email"] }),
      null
    );
  });

  it("hubspot: picks the deals poller for objectType 'deals'", async () => {
    mockedGetConnection.mockResolvedValue({
      id: "conn-1",
      provider: "hubspot",
      name: "HS",
      config: { proxyUrl: "https://proxy" },
      encryptedSecret: { ciphertext: "x", iv: "y", salt: "z" },
      enabled: true,
      lastTestedAt: null,
      lastTestOk: null,
      createdAt: "",
      updatedAt: "",
    });
    mockedResolveSecret.mockResolvedValue("token-123");
    mockedPollHubSpotDeals.mockResolvedValue({ success: true, newRecords: 0, lastExternalTimestamp: "now", records: [] });

    await fetchPollSampleForFlow(makeHubspotTrigger("deals"));
    expect(mockedPollHubSpotDeals).toHaveBeenCalled();
  });

  it("hubspot: returns an error if the connection no longer exists", async () => {
    mockedGetConnection.mockResolvedValue(undefined);
    const result = await fetchPollSampleForFlow(makeHubspotTrigger());
    expect(result.ok).toBe(false);
    expect(result.error).toContain("ya no existe");
  });

  it("hubspot: returns an error if the token can't be decrypted (e.g. vault locked)", async () => {
    mockedGetConnection.mockResolvedValue({
      id: "conn-1",
      provider: "hubspot",
      name: "HS",
      config: { proxyUrl: "https://proxy" },
      encryptedSecret: { ciphertext: "x", iv: "y", salt: "z" },
      enabled: true,
      lastTestedAt: null,
      lastTestOk: null,
      createdAt: "",
      updatedAt: "",
    });
    mockedResolveSecret.mockRejectedValue(new Error("Vault is locked"));

    const result = await fetchPollSampleForFlow(makeHubspotTrigger());
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Vault is locked");
  });

  it("google-sheets: calls pollGoogleSheets with lastSyncAt: null", async () => {
    mockedGetConnection.mockResolvedValue({
      id: "conn-2",
      provider: "google-sheets",
      name: "Sheet",
      config: { proxyUrl: "https://proxy", spreadsheetId: "sheet-1", range: "A1:B2", headerRow: 1 },
      encryptedSecret: null,
      enabled: true,
      lastTestedAt: null,
      lastTestOk: null,
      createdAt: "",
      updatedAt: "",
    });
    mockedPollGoogleSheets.mockResolvedValue({
      success: true,
      newRecords: 1,
      lastExternalTimestamp: "now",
      records: [{ name: "Ana" }],
    });

    const result = await fetchPollSampleForFlow(makeSheetsTrigger());
    expect(result.ok).toBe(true);
    expect(result.records).toEqual([{ name: "Ana" }]);
    expect(mockedPollGoogleSheets).toHaveBeenCalledWith(
      expect.objectContaining({ spreadsheetId: "sheet-1", range: "A1:B2" }),
      null
    );
  });

  it("propagates a poller-level failure as an error result", async () => {
    mockedGetConnection.mockResolvedValue({
      id: "conn-2",
      provider: "google-sheets",
      name: "Sheet",
      config: { proxyUrl: "https://proxy", spreadsheetId: "sheet-1", range: "A1:B2", headerRow: 1 },
      encryptedSecret: null,
      enabled: true,
      lastTestedAt: null,
      lastTestOk: null,
      createdAt: "",
      updatedAt: "",
    });
    mockedPollGoogleSheets.mockResolvedValue({
      success: false,
      newRecords: 0,
      lastExternalTimestamp: "now",
      error: "Sheets proxy error: 500",
    });

    const result = await fetchPollSampleForFlow(makeSheetsTrigger());
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Sheets proxy error: 500");
  });
});
