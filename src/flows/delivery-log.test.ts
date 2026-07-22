import { describe, it, expect } from "vitest";
import {
  maskSecretInPayload,
  buildOutboundSyncLog,
  persistOutboundDeliveries,
} from "./delivery-log";
import { verifyRaw } from "@/integrations/outbound/signing";
import { signRaw } from "@/integrations/outbound/signing";
import { buildWebhookRequest } from "./webhook-request";
import type { OutboundDelivery } from "./engine";

describe("maskSecretInPayload", () => {
  it("masks values of secret-like keys recursively (criterio 024 §F4 / 026 §E)", () => {
    const payload = {
      name: "ACME",
      token: "pat-na1-real-secret",
      nested: { authorization: "Bearer abc", safe: "keep" },
      list: [{ apikey: "k1" }, { ok: true }],
    };
    const masked = maskSecretInPayload(payload) as Record<string, unknown>;
    expect(masked.name).toBe("ACME");
    expect(masked.token).toBe("••••");
    expect((masked.nested as Record<string, unknown>).authorization).toBe("••••");
    expect((masked.nested as Record<string, unknown>).safe).toBe("keep");
    expect(((masked.list as Record<string, unknown>[])[0]).apikey).toBe("••••");
  });

  it("does not mutate the original payload", () => {
    const payload = { token: "secret-value" };
    maskSecretInPayload(payload);
    expect(payload.token).toBe("secret-value");
  });

  it("leaves non-object values untouched", () => {
    expect(maskSecretInPayload("x")).toBe("x");
    expect(maskSecretInPayload(42)).toBe(42);
    expect(maskSecretInPayload(null)).toBeNull();
  });
});

describe("buildOutboundSyncLog", () => {
  it("builds a success entry with masked payload, status and snippet", () => {
    const delivery: OutboundDelivery = {
      url: "https://hook.example/x",
      secret: "signing-secret",
      payload: { name: "ACME", token: "leak-me" },
      status: 200,
      responseSnippet: '{"ok":true}',
      attempts: 1,
      flowId: "flow-1",
      outputIndex: 0,
      data: { name: "ACME" },
    };
    const log = buildOutboundSyncLog(delivery, "Mi flujo", "run-1");
    expect(log.direction).toBe("outbound");
    expect(log.provider).toBe("webhook");
    expect(log.eventType).toBe("Mi flujo");
    expect(log.status).toBe("success");
    expect(log.httpStatus).toBe(200);
    expect(log.retryCount).toBe(0);
    expect(log.flowId).toBe("flow-1");
    expect(log.outputIndex).toBe(0);
    expect(log.runId).toBe("run-1");
    const parsed = JSON.parse(log.requestPayload);
    expect(parsed.token).toBe("••••");
    expect(parsed.name).toBe("ACME");
    // El `secret` de firma NUNCA aparece en el log.
    expect(log.requestPayload).not.toContain("signing-secret");
  });

  it("builds an error entry when the delivery failed", () => {
    const delivery: OutboundDelivery = {
      url: "https://hook.example/x",
      secret: "s",
      payload: {},
      status: null,
      error: "Entrega fallida: TypeError",
      attempts: 3,
      flowId: "flow-2",
      outputIndex: 1,
    };
    const log = buildOutboundSyncLog(delivery, "flujo", undefined);
    expect(log.status).toBe("error");
    expect(log.httpStatus).toBeNull();
    expect(log.errorMessage).toBe("Entrega fallida: TypeError");
    // attempts=3 → 2 reintentos (el primer intento no cuenta como reintento).
    expect(log.retryCount).toBe(2);
    expect(log.runId).toBeUndefined();
  });

  it("serializes the runtime data for replay (replayData)", () => {
    const delivery: OutboundDelivery = {
      url: "https://x",
      secret: "s",
      payload: { title: "{{name}}" },
      data: { name: "ACME", amount: 5000 },
      flowId: "f",
      outputIndex: 0,
    };
    const log = buildOutboundSyncLog(delivery, "f", undefined);
    expect(JSON.parse(log.replayData ?? "null")).toEqual({ name: "ACME", amount: 5000 });
  });

  it("truncates payloads over 10KB", () => {
    const big = "x".repeat(11_000);
    const delivery: OutboundDelivery = {
      url: "https://x",
      secret: "s",
      payload: { big },
    };
    const log = buildOutboundSyncLog(delivery, "f", undefined);
    expect(log.requestPayload.length).toBeLessThanOrEqual(10_000);
    expect(log.requestPayload.endsWith("...")).toBe(true);
  });
});

describe("persistOutboundDeliveries", () => {
  it("writes one syncLog per delivery with id/createdAt", async () => {
    const added: unknown[] = [];
    const db = {
      syncLogs: { add: async (log: unknown) => { added.push(log); } },
    };
    const deliveries: OutboundDelivery[] = [
      { url: "https://x", secret: "s1", payload: { a: 1 }, flowId: "f", outputIndex: 0 },
      { url: "https://y", secret: "s2", payload: { b: 2 }, flowId: "f", outputIndex: 1, error: "boom" },
    ];
    await persistOutboundDeliveries(
      db as never,
      deliveries,
      "Mi flujo",
      "run-1",
    );
    expect(added).toHaveLength(2);
    const first = added[0] as { id: string; createdAt: string; eventType: string; runId: string };
    expect(first.id).toBeTruthy();
    expect(first.createdAt).toBeTruthy();
    expect(first.eventType).toBe("Mi flujo");
    expect(first.runId).toBe("run-1");
    // El secreto de firma nunca llega al log.
    expect(JSON.stringify(added[0])).not.toContain("s1");
    expect(JSON.stringify(added[1])).not.toContain("s2");
  });
});

describe("replay reconstructs the same verifiable signature (spec 033 A1)", () => {
  it("re-builds the request from the live output + replayData and the signature verifies", async () => {
    // El Flujo vivo guarda el WebhookOutput completo (con el secret). El log
    // solo guardó el `data` runtime (replayData) — el secret se recupera del
    // flujo, nunca del log.
    const liveOutput = {
      type: "webhook" as const,
      url: "https://hook.example/dst",
      secret: "topsecret",
      payload: { cliente: "{{name}}", monto: "{{amount}}" },
    };
    const data = { name: "ACME", amount: 5000 };

    // 1) La entrega original firmó el body interpolado.
    const original = await buildWebhookRequest(liveOutput, data);
    expect(await verifyRaw(original.rawBody, "topsecret", original.signature)).toBe(true);

    // 2) El log durable guardó el `data` (no el secret).
    const delivery: OutboundDelivery = {
      url: original.url,
      secret: liveOutput.secret,
      payload: original.payload,
      data,
      flowId: "f",
      outputIndex: 0,
    };
    const log = buildOutboundSyncLog(delivery, "flujo", "run-1");
    expect(log.replayData).toBeDefined();
    expect(log.requestPayload).not.toContain("topsecret");

    // 3) Replay: reconstruye desde el output vivo + el data del log.
    const replayData = JSON.parse(log.replayData!) as Record<string, unknown>;
    const replay = await buildWebhookRequest(liveOutput, replayData);
    expect(replay.payload).toEqual(original.payload);
    // La firma del replay verifica contra el secret del flujo vivo.
    expect(await verifyRaw(replay.rawBody, "topsecret", replay.signature)).toBe(true);
    // Y cubre exactamente el body que se enviaría.
    expect(replay.init.body).toBe(replay.rawBody);
  });

  it("a tampered replayData produces a different (still-verifiable-on-its-own) signature", async () => {
    const liveOutput = { type: "webhook" as const, url: "https://x", secret: "s", payload: { m: "{{amount}}" } };
    const a = await buildWebhookRequest(liveOutput, { amount: 100 });
    const b = await buildWebhookRequest(liveOutput, { amount: 999 });
    // Firmas distintas porque el body (y por ende el data interpolado) cambia.
    expect(a.signature).not.toBe(b.signature);
    expect(await verifyRaw(a.rawBody, "s", a.signature)).toBe(true);
    expect(await verifyRaw(b.rawBody, "s", b.signature)).toBe(true);
    // Confirmar que signRaw + verifyRaw siguen siendo simétricos.
    const manual = await signRaw(a.rawBody, "s");
    expect(await verifyRaw(a.rawBody, "s", manual)).toBe(true);
  });
});
