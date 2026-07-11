import { describe, it, expect } from "vitest";
import { signPayload, verifyPayloadSignature } from "./signing";
import type { OutboundPayload } from "./dispatcher";

describe("signing", () => {
  const secret = "webhook-secret-key";
  const payload: OutboundPayload = {
    eventId: "evt-123",
    eventType: "task.statusChanged",
    timestamp: "2026-07-07T00:00:00.000Z",
    workspace: { org: "Test Org" },
    data: { taskId: "task-456", from: "todo", to: "done" },
  };

  it("signs payload with HMAC-SHA256", async () => {
    const signature = await signPayload(payload, secret);
    
    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  it("produces consistent signature for same payload and secret", async () => {
    const sig1 = await signPayload(payload, secret);
    const sig2 = await signPayload(payload, secret);
    
    expect(sig1).toBe(sig2);
  });

  it("produces different signature for different secret", async () => {
    const sig1 = await signPayload(payload, secret);
    const sig2 = await signPayload(payload, "different-secret");
    
    expect(sig1).not.toBe(sig2);
  });

  it("produces different signature for different payload", async () => {
    const sig1 = await signPayload(payload, secret);
    const differentPayload = { ...payload, eventId: "evt-789" };
    const sig2 = await signPayload(differentPayload, secret);
    
    expect(sig1).not.toBe(sig2);
  });

  it("verifies valid signature", async () => {
    const signature = await signPayload(payload, secret);
    const isValid = await verifyPayloadSignature(payload, secret, signature);
    
    expect(isValid).toBe(true);
  });

  it("rejects invalid signature", async () => {
    const signature = await signPayload(payload, secret);
    const isValid = await verifyPayloadSignature(payload, "wrong-secret", signature);
    
    expect(isValid).toBe(false);
  });
});
