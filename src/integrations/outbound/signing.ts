import type { OutboundPayload } from "./dispatcher";

/**
 * Firma HMAC-SHA256 sobre el **string crudo del body** que realmente se envía.
 * Este es el core correcto (spec 032 §A): la firma debe cubrir exactamente los
 * bytes que viajan en la request, o el receptor (Make/Zapier/n8n) no puede
 * reproducir el cálculo. Antes solo existía `signPayload`, que firmaba
 * `JSON.stringify(payload)`; el problema era que `buildWebhookRequest` firmaba
 * un envelope distinto del body que enviaba, dejando `X-Hito-Signature`
 * inverificable.
 */
export async function signRaw(rawBody: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const hashHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hashHex}`;
}

/** Verifica una firma contra el body crudo. Simétrica de `signRaw`. */
export async function verifyRaw(rawBody: string, secret: string, signature: string): Promise<boolean> {
  const expected = await signRaw(rawBody, secret);
  return expected === signature;
}

/**
 * Firma un payload estructurado serializándolo con `JSON.stringify`. Wrapper de
 * `signRaw` conservado para el dispatcher legacy (`dispatcher.ts`), que firma un
 * objeto ya construido. Para webhooks de Flujo se usa `signRaw` sobre el body
 * exacto vía `buildWebhookRequest`.
 */
export async function signPayload(payload: OutboundPayload, secret: string): Promise<string> {
  return signRaw(JSON.stringify(payload), secret);
}

export async function verifyPayloadSignature(
  payload: OutboundPayload,
  secret: string,
  signature: string
): Promise<boolean> {
  return verifyRaw(JSON.stringify(payload), secret, signature);
}
