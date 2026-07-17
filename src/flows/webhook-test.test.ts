import { describe, it, expect, vi, afterEach } from "vitest";
import { testWebhook } from "./webhook-test";
import type { WebhookOutput } from "@/domain/schemas/flow";

describe("testWebhook", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const output: WebhookOutput = {
    type: "webhook",
    url: "https://example.com/hook",
    secret: "whsec_test",
    payload: { cliente: "{{Nombre Cliente}}" },
  };

  it("returns ok with status when the endpoint responds 2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("ok", { status: 200, statusText: "OK" }))
    );

    const result = await testWebhook(output, { "Nombre Cliente": "ACME" });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.responseText).toBe("ok");
  });

  it("returns ok: false with status when the endpoint responds 4xx/5xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }))
    );

    const result = await testWebhook(output, { "Nombre Cliente": "ACME" });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
  });

  it("returns an error message when the network call fails, without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const result = await testWebhook(output, { "Nombre Cliente": "ACME" });

    expect(result.ok).toBe(false);
    expect(result.status).toBeUndefined();
    expect(result.error).toContain("network down");
  });

  it("sends the interpolated custom payload, not the raw record", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await testWebhook(output, { "Nombre Cliente": "ACME Corp" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ cliente: "ACME Corp" });
  });
});
