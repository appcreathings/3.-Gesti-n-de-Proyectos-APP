import { describe, it, expect } from "vitest";
import { buildWebhookRequest } from "./webhook-request";
import type { WebhookOutput } from "@/domain/schemas/flow";

describe("buildWebhookRequest", () => {
  it("sends the full transformed record when no custom payload is configured (default, retrocompat)", async () => {
    const output: WebhookOutput = { type: "webhook", url: "https://example.com/hook", secret: "s" };
    const request = await buildWebhookRequest(output, { name: "ACME", amount: 5000 });

    expect(request.payload).toEqual({ name: "ACME", amount: 5000 });
    expect(JSON.parse(request.init.body as string)).toEqual({ name: "ACME", amount: 5000 });
  });

  it("interpolates a custom payload instead of sending the raw record", async () => {
    const output: WebhookOutput = {
      type: "webhook",
      url: "https://example.com/hook",
      secret: "s",
      payload: { cliente: "{{Nombre Cliente}}", monto: "{{amount}}" },
    };
    const request = await buildWebhookRequest(output, { "Nombre Cliente": "ACME", amount: "5000" });

    expect(request.payload).toEqual({ cliente: "ACME", monto: "5000" });
  });

  it("reports unresolved tokens from the custom payload", async () => {
    const output: WebhookOutput = {
      type: "webhook",
      url: "https://example.com/hook",
      secret: "s",
      payload: { cliente: "{{missing}}" },
    };
    const request = await buildWebhookRequest(output, {});

    expect(request.unresolved).toEqual(["missing"]);
  });

  it("includes a signature header derived from the secret", async () => {
    const output: WebhookOutput = { type: "webhook", url: "https://example.com/hook", secret: "s" };
    const request = await buildWebhookRequest(output, {});

    const headers = request.init.headers as Record<string, string>;
    expect(headers["X-Hito-Signature"]).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("uses POST and does not set a signal (callers own their own timeout)", async () => {
    const output: WebhookOutput = { type: "webhook", url: "https://example.com/hook", secret: "s" };
    const request = await buildWebhookRequest(output, {});

    expect(request.init.method).toBe("POST");
    expect(request.init.signal).toBeUndefined();
  });
});
