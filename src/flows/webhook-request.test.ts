import { describe, it, expect } from "vitest";
import { buildWebhookRequest } from "./webhook-request";
import { verifyRaw } from "@/integrations/outbound/signing";
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

  // Spec 032 §A — la firma DEBE poder verificarse sobre el body real enviado.
  it("signs the exact bare body it sends (verifiable by the receiver)", async () => {
    const output: WebhookOutput = { type: "webhook", url: "https://x.co/h", secret: "topsecret" };
    const request = await buildWebhookRequest(output, { name: "ACME", amount: 5000 });

    // El receptor recibe `rawBody` y `X-Hito-Signature`, y verifica localmente.
    const headers = request.init.headers as Record<string, string>;
    expect(request.init.body).toBe(request.rawBody);
    expect(headers["X-Hito-Signature"]).toBe(request.signature);
    expect(await verifyRaw(request.rawBody, "topsecret", request.signature)).toBe(true);
  });

  it("wraps the payload in a signed envelope when payloadShape is 'envelope'", async () => {
    const output: WebhookOutput = {
      type: "webhook",
      url: "https://x.co/h",
      secret: "s",
      payloadShape: "envelope",
    };
    const request = await buildWebhookRequest(output, { taskId: "t1" });

    const body = JSON.parse(request.rawBody);
    expect(body).toMatchObject({
      eventId: request.deliveryId,
      eventType: "flow.execution",
      timestamp: request.timestamp,
      workspace: { org: "Hito" },
      data: { taskId: "t1" },
    });
    // La firma cubre el envelope exacto que se envía.
    expect(await verifyRaw(request.rawBody, "s", request.signature)).toBe(true);
  });

  it("defaults to bare shape for outputs saved before spec 032 (no payloadShape)", async () => {
    const output: WebhookOutput = { type: "webhook", url: "https://x.co/h", secret: "s" };
    const request = await buildWebhookRequest(output, { a: 1 });

    // Body plano (retrocompat), sin envelope wrapper.
    expect(JSON.parse(request.rawBody)).toEqual({ a: 1 });
  });

  it("emits delivery id and timestamp headers (anti-replay)", async () => {
    const output: WebhookOutput = { type: "webhook", url: "https://x.co/h", secret: "s" };
    const request = await buildWebhookRequest(output, {});

    const headers = request.init.headers as Record<string, string>;
    expect(headers["X-Hito-Delivery"]).toBe(request.deliveryId);
    expect(headers["X-Hito-Timestamp"]).toBe(request.timestamp);
    expect(headers["X-Hito-Event"]).toBe("flow.execution");
  });

  it("a tampered body no longer matches the signature", async () => {
    const output: WebhookOutput = { type: "webhook", url: "https://x.co/h", secret: "s" };
    const request = await buildWebhookRequest(output, { amount: 100 });

    const tampered = JSON.stringify({ amount: 999999 });
    expect(await verifyRaw(tampered, "s", request.signature)).toBe(false);
  });
});
