import { describe, it, expect, vi, beforeEach } from "vitest";

// `connections.ts` imports `./vault`, which reads `localStorage` at module
// scope (`hasMasterPassword` init) — same issue as `vault.test.ts`. Provide a
// minimal in-memory polyfill *before* the module is ever imported.
const backing = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  writable: true,
  value: {
    getItem: (k: string) => backing.get(k) ?? null,
    setItem: (k: string, v: string) => {
      backing.set(k, v);
    },
    removeItem: (k: string) => {
      backing.delete(k);
    },
    clear: () => backing.clear(),
  },
});

vi.mock("./proxy-fetch", () => ({
  postToProxy: vi.fn(),
}));

const mockSendEmailViaAppsScript = vi.fn();
vi.mock("./outbound/email-via-apps-script", () => ({
  sendEmailViaAppsScript: (...args: unknown[]) => mockSendEmailViaAppsScript(...args),
}));

const { testConnection, runConnectionProbe } = await import("./connections");
const { postToProxy } = await import("./proxy-fetch");

const mockedPostToProxy = vi.mocked(postToProxy);

describe("testConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hubspot: returns a flattened sample ({id, ...properties}) on success", async () => {
    mockedPostToProxy.mockResolvedValue({
      ok: true,
      data: {
        results: [
          { id: "1", properties: { email: "a@b.com", firstname: "Ana" } },
          { id: "2", properties: { email: "c@d.com", firstname: "Beto" } },
        ],
      },
    });

    const result = await testConnection("hubspot", { proxyUrl: "https://proxy" }, "token");
    expect(result.ok).toBe(true);
    expect(result.sample).toEqual([
      { id: "1", email: "a@b.com", firstname: "Ana" },
      { id: "2", email: "c@d.com", firstname: "Beto" },
    ]);
  });

  it("hubspot: propagates the error message and no sample on failure", async () => {
    mockedPostToProxy.mockResolvedValue({ ok: false, kind: "remote-error", message: "invalid token" });

    const result = await testConnection("hubspot", { proxyUrl: "https://proxy" }, "bad-token");
    expect(result.ok).toBe(false);
    expect(result.detail).toBe("invalid token");
    expect(result.sample).toBeUndefined();
  });

  it("hubspot: fails fast without calling the proxy when there's no secret", async () => {
    const result = await testConnection("hubspot", { proxyUrl: "https://proxy" }, null);
    expect(result.ok).toBe(false);
    expect(mockedPostToProxy).not.toHaveBeenCalled();
  });

  it("google-sheets: parses rows into a sample using the connection's headerRow", async () => {
    mockedPostToProxy.mockResolvedValue({
      ok: true,
      data: { values: [["name", "email"], ["Ana", "a@b.com"], ["Beto", "b@c.com"]] },
    });

    const result = await testConnection(
      "google-sheets",
      { proxyUrl: "https://proxy", spreadsheetId: "sheet-1", range: "A1:B3", headerRow: 1 },
      null
    );
    expect(result.ok).toBe(true);
    expect(result.sample).toEqual([
      { name: "Ana", email: "a@b.com" },
      { name: "Beto", email: "b@c.com" },
    ]);
    expect(result.detail).toContain("2 fila(s) de datos");
  });

  it("google-sheets: caps the sample at a handful of rows even with a large sheet", async () => {
    const dataRows = Array.from({ length: 20 }, (_, i) => [`Person ${i}`]);
    mockedPostToProxy.mockResolvedValue({ ok: true, data: { values: [["name"], ...dataRows] } });

    const result = await testConnection(
      "google-sheets",
      { proxyUrl: "https://proxy", spreadsheetId: "sheet-1", range: "A1:A21", headerRow: 1 },
      null
    );
    expect(result.sample).toHaveLength(3);
  });

  it("google-sheets: fails fast without calling the proxy when spreadsheetId or range is missing", async () => {
    const result = await testConnection("google-sheets", { proxyUrl: "https://proxy" }, null);
    expect(result.ok).toBe(false);
    expect(mockedPostToProxy).not.toHaveBeenCalled();
  });
});

describe("runConnectionProbe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hubspot 'deals': hits the deals endpoint and returns raw + flattened records", async () => {
    mockedPostToProxy.mockResolvedValue({
      ok: true,
      data: { results: [{ id: "42", properties: { dealname: "Acme deal" } }] },
    });

    const result = await runConnectionProbe(
      "hubspot",
      { proxyUrl: "https://proxy" },
      "token",
      { operation: "deals" }
    );

    expect(result.ok).toBe(true);
    expect(mockedPostToProxy).toHaveBeenCalledWith(
      "https://proxy",
      expect.objectContaining({ path: expect.stringContaining("/crm/v3/objects/deals"), method: "GET" })
    );
    expect(result.records).toEqual([{ id: "42", dealname: "Acme deal" }]);
    expect(result.raw).toEqual({ results: [{ id: "42", properties: { dealname: "Acme deal" } }] });
  });

  it("hubspot 'search': posts to the real search endpoint used by pollers", async () => {
    mockedPostToProxy.mockResolvedValue({ ok: true, data: { results: [] } });

    await runConnectionProbe("hubspot", { proxyUrl: "https://proxy" }, "token", { operation: "search" });

    expect(mockedPostToProxy).toHaveBeenCalledWith(
      "https://proxy",
      expect.objectContaining({ path: "/crm/v3/objects/contacts/search", method: "POST" })
    );
  });

  it("hubspot 'custom': uses the user-supplied GET path", async () => {
    mockedPostToProxy.mockResolvedValue({ ok: true, data: { results: [] } });

    await runConnectionProbe("hubspot", { proxyUrl: "https://proxy" }, "token", {
      operation: "custom",
      customPath: "/crm/v3/objects/companies",
    });

    expect(mockedPostToProxy).toHaveBeenCalledWith(
      "https://proxy",
      expect.objectContaining({ path: "/crm/v3/objects/companies", method: "GET" })
    );
  });

  it("hubspot 'custom': fails without calling the proxy when no path is given", async () => {
    const result = await runConnectionProbe("hubspot", { proxyUrl: "https://proxy" }, "token", {
      operation: "custom",
    });
    expect(result.ok).toBe(false);
    expect(mockedPostToProxy).not.toHaveBeenCalled();
  });

  it("email 'send-test': sends a real test email via the proxy and reports success", async () => {
    mockSendEmailViaAppsScript.mockResolvedValue({ success: true });

    const result = await runConnectionProbe(
      "email",
      { proxyUrl: "https://proxy", fromEmail: "hito@example.com" },
      null,
      { operation: "send-test", testRecipient: "someone@example.com" }
    );

    expect(result.ok).toBe(true);
    expect(mockSendEmailViaAppsScript).toHaveBeenCalledWith(
      { proxyUrl: "https://proxy", fromEmail: "hito@example.com" },
      expect.objectContaining({ to: "someone@example.com" })
    );
  });

  it("email 'send-test': falls back to fromEmail when no recipient is given, and propagates failure", async () => {
    mockSendEmailViaAppsScript.mockResolvedValue({ success: false, error: "boom" });

    const result = await runConnectionProbe(
      "email",
      { proxyUrl: "https://proxy", fromEmail: "hito@example.com" },
      null,
      { operation: "send-test" }
    );

    expect(result.ok).toBe(false);
    expect(result.detail).toBe("boom");
    expect(mockSendEmailViaAppsScript).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ to: "hito@example.com" })
    );
  });
});
