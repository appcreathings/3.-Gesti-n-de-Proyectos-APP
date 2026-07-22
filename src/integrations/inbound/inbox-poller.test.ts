import { describe, it, expect, vi, beforeEach } from "vitest";
import { drainInbox, flattenDelivery, type InboxConfig } from "./inbox-poller";
import { idempotencyCheck } from "./idempotency";

vi.mock("./idempotency", () => ({
  idempotencyCheck: vi.fn().mockResolvedValue(false),
}));

const config: InboxConfig = {
  proxyUrl: "https://script.google.com/macros/s/inbox/exec",
  secret: null,
};

function mockDrain(deliveries: unknown[], nextCursor?: string, backlog?: number) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        status: 200,
        data: { deliveries, nextCursor, backlog: backlog ?? deliveries.length },
      }),
  });
}

describe("flattenDelivery", () => {
  it("spreads an object body and keeps deliveryId/receivedAt", () => {
    const record = flattenDelivery({
      deliveryId: "d1",
      receivedAt: "2026-07-21T00:00:00.000Z",
      body: { email: "a@b.com", nombre: "Ana" },
    });
    expect(record).toEqual({
      deliveryId: "d1",
      receivedAt: "2026-07-21T00:00:00.000Z",
      email: "a@b.com",
      nombre: "Ana",
    });
  });

  it("wraps a non-object body under `value`", () => {
    const record = flattenDelivery({ deliveryId: "d1", receivedAt: "t", body: [1, 2, 3] });
    expect(record).toEqual({ deliveryId: "d1", receivedAt: "t", value: [1, 2, 3] });
  });
});

describe("drainInbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(idempotencyCheck).mockResolvedValue(false);
  });

  it("returns flattened records and advances the cursor", async () => {
    mockDrain(
      [
        { deliveryId: "d1", receivedAt: "2026-07-21T00:00:01.000Z", body: { x: 1 } },
        { deliveryId: "d2", receivedAt: "2026-07-21T00:00:02.000Z", body: { x: 2 } },
      ],
      "2026-07-21T00:00:02.000Z"
    );

    const result = await drainInbox(config, null);
    expect(result.success).toBe(true);
    expect(result.records).toHaveLength(2);
    expect(result.records?.[0]).toMatchObject({ deliveryId: "d1", x: 1 });
    expect(result.lastExternalTimestamp).toBe("2026-07-21T00:00:02.000Z");
  });

  it("dedupes deliveries already seen (idempotency by deliveryId)", async () => {
    mockDrain([
      { deliveryId: "dup", receivedAt: "t1", body: { x: 1 } },
      { deliveryId: "new", receivedAt: "t2", body: { x: 2 } },
    ]);
    // "inbox-dup" already processed, "inbox-new" is fresh.
    vi.mocked(idempotencyCheck).mockImplementation(async (id: string) => id === "inbox-dup");

    const result = await drainInbox(config, null);
    expect(result.records).toHaveLength(1);
    expect(result.records?.[0]).toMatchObject({ deliveryId: "new" });
  });

  it("sends the shared secret when configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 200, data: { deliveries: [], nextCursor: "" } }),
    });
    global.fetch = fetchMock;

    await drainInbox({ proxyUrl: config.proxyUrl, secret: "s3cr3t" }, "cursor-1");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body).toMatchObject({ action: "drain", cursor: "cursor-1", secret: "s3cr3t" });
  });

  it("returns an empty successful result when there are no pending deliveries", async () => {
    mockDrain([], "keep-cursor");
    const result = await drainInbox(config, "keep-cursor");
    expect(result.success).toBe(true);
    expect(result.newRecords).toBe(0);
    expect(result.lastExternalTimestamp).toBe("keep-cursor");
  });

  it("surfaces a proxy error without throwing", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 500, data: { error: "boom" } }),
    });
    const result = await drainInbox(config, "c");
    expect(result.success).toBe(false);
    expect(result.error).toContain("boom");
    // El cursor no avanza ante un fallo.
    expect(result.lastExternalTimestamp).toBe("c");
  });
});
