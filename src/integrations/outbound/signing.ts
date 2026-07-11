import type { OutboundPayload } from "./dispatcher";

export async function signPayload(
  payload: OutboundPayload,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(JSON.stringify(payload));

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return `sha256=${hashHex}`;
}

export async function verifyPayloadSignature(
  payload: OutboundPayload,
  secret: string,
  signature: string
): Promise<boolean> {
  const expected = await signPayload(payload, secret);
  return expected === signature;
}
