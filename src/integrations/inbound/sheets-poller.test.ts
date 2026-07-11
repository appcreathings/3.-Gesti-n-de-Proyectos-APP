import { describe, it, expect, vi, beforeEach } from "vitest";
import { pollGoogleSheets } from "./sheets-poller";
import type { GoogleSheetsConfig } from "./sheets-poller";

vi.mock("./idempotency", () => ({
  idempotencyCheck: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/storage/integration-db", () => ({
  integrationDb: { syncLogs: { add: vi.fn().mockResolvedValue(undefined) } },
}));

describe("pollGoogleSheets", () => {
  const config: GoogleSheetsConfig = {
    proxyUrl: "https://script.google.com/macros/s/test/exec",
    spreadsheetId: "sheet-1",
    range: "Tasks!A1:C10",
    headerRow: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses rows into records keyed by header, wrapped in the {status,data} envelope", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: 200,
          data: {
            values: [
              ["name", "email"],
              ["Ana", "ana@example.com"],
              ["Beto", "beto@example.com"],
            ],
          },
        }),
    });

    const result = await pollGoogleSheets(config, null);
    expect(result.success).toBe(true);
    expect(result.records).toHaveLength(2);
    expect(result.records?.[0]).toEqual({ name: "Ana", email: "ana@example.com" });
    expect(result.records?.[1]).toEqual({ name: "Beto", email: "beto@example.com" });
  });

  it("also accepts a raw (unwrapped) proxy response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ values: [["name"], ["Ana"]] }),
    });

    const result = await pollGoogleSheets(config, null);
    expect(result.success).toBe(true);
    expect(result.records).toEqual([{ name: "Ana" }]);
  });

  it("respects a headerRow other than 1", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { values: [["ignore this"], ["name"], ["Ana"]] },
        }),
    });

    const result = await pollGoogleSheets({ ...config, headerRow: 2 }, null);
    expect(result.records).toEqual([{ name: "Ana" }]);
  });

  it("returns success with zero records when the sheet is empty", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { values: [] } }),
    });

    const result = await pollGoogleSheets(config, null);
    expect(result.success).toBe(true);
    expect(result.newRecords).toBe(0);
  });

  it("returns an error result on a non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: "Internal Error" });

    const result = await pollGoogleSheets(config, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("500");
  });

  it("returns an error result on a network failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));

    const result = await pollGoogleSheets(config, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("network down");
  });

  it("uses text/plain (not application/json) to avoid the Apps Script CORS preflight", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { values: [] } }),
    });
    global.fetch = fetchMock;

    await pollGoogleSheets(config, null);

    expect(fetchMock).toHaveBeenCalledWith(
      config.proxyUrl,
      expect.objectContaining({ headers: { "Content-Type": "text/plain;charset=utf-8" } })
    );
  });

  it("treats a {status:>=400} envelope as an error even when the HTTP transport is 200", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 500, data: { error: "Sheet not found" } }),
    });

    const result = await pollGoogleSheets(config, null);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Sheet not found");
  });
});
