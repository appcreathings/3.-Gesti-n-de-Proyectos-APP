import { describe, it, expect, vi, beforeEach } from "vitest";

// Mockeamos las dos salidas I/O del round-trip para testear la lógica de
// encadenamiento (push → drain → match por deliveryId) sin red.
const postToProxy = vi.fn();
vi.mock("../proxy-fetch", () => ({ postToProxy }));
const drainInbox = vi.fn();
vi.mock("./inbox-poller", () => ({ drainInbox }));

const { runInboxRoundTrip, INBOX_TEST_SAMPLE } = await import("./inbox-round-trip");

describe("runInboxRoundTrip (spec 033 A3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("confirma el round-trip cuando el drain devuelve la entrega recién empujada", async () => {
    postToProxy.mockResolvedValue({ ok: true, data: { deliveryId: "d-123" } });
    drainInbox.mockResolvedValue({
      success: true,
      newRecords: 1,
      lastExternalTimestamp: "2026-07-22T12:00:00.000Z",
      records: [{ deliveryId: "d-123", event: "hito-round-trip-test" }],
    });

    const result = await runInboxRoundTrip("https://proxy/exec", null);

    expect(result.ok).toBe(true);
    expect(result.deliveryId).toBe("d-123");
    expect(result.drained).toBe(1);
    expect(result.error).toBeNull();
    // El ingreso NO lleva `action:"drain"` (el proxy lo interpretaría como drain).
    const pushedPayload = postToProxy.mock.calls[0][1] as Record<string, unknown>;
    expect(pushedPayload.event).toBe(INBOX_TEST_SAMPLE.event);
    expect(pushedPayload.action).toBeUndefined();
  });

  it("incluye el secreto como query param del ingreso cuando la conexión lo tiene", async () => {
    postToProxy.mockResolvedValue({ ok: true, data: { deliveryId: "d-1" } });
    drainInbox.mockResolvedValue({
      success: true,
      newRecords: 1,
      lastExternalTimestamp: "",
      records: [{ deliveryId: "d-1" }],
    });

    await runInboxRoundTrip("https://proxy/exec", "mi-secreto");

    const pushUrl = postToProxy.mock.calls[0][0] as string;
    expect(pushUrl).toContain("secret=mi-secreto");
    // El drain recibe el secreto dentro del config, no en la URL.
    const drainConfig = drainInbox.mock.calls[0][0] as { proxyUrl: string; secret: string };
    expect(drainConfig.secret).toBe("mi-secreto");
    expect(drainConfig.proxyUrl).toBe("https://proxy/exec");
  });

  it("falla limpio si el ingreso (push) no llega al proxy", async () => {
    postToProxy.mockResolvedValue({ ok: false, message: "No se pudo conectar (CORS)." });

    const result = await runInboxRoundTrip("https://proxy/exec", null);

    expect(result.ok).toBe(false);
    expect(result.deliveryId).toBeNull();
    expect(result.error).toBe("No se pudo conectar (CORS).");
    expect(drainInbox).not.toHaveBeenCalled();
  });

  it("reporta el deliveryId encolado aunque el drain falle", async () => {
    postToProxy.mockResolvedValue({ ok: true, data: { deliveryId: "d-9" } });
    drainInbox.mockResolvedValue({ success: false, newRecords: 0, lastExternalTimestamp: "", error: "503" });

    const result = await runInboxRoundTrip("https://proxy/exec", null);

    expect(result.ok).toBe(false);
    expect(result.deliveryId).toBe("d-9");
    expect(result.error).toBe("503");
  });

  it("no da OK si el drain trae entregas pero no la recién empujada", async () => {
    postToProxy.mockResolvedValue({ ok: true, data: { deliveryId: "d-target" } });
    drainInbox.mockResolvedValue({
      success: true,
      newRecords: 2,
      lastExternalTimestamp: "",
      records: [{ deliveryId: "otra-1" }, { deliveryId: "otra-2" }],
    });

    const result = await runInboxRoundTrip("https://proxy/exec", null);

    expect(result.ok).toBe(false);
    expect(result.deliveryId).toBe("d-target");
    expect(result.error).toContain("no devolvió");
  });
});
