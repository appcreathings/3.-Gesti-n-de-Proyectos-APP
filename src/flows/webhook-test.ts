import type { WebhookOutput } from "@/domain/schemas/flow";
import { buildWebhookRequest } from "./webhook-request";

export interface WebhookTestResult {
  ok: boolean;
  status?: number;
  /** Primeros ~500 caracteres del cuerpo de la respuesta, si el endpoint
   * devolvió alguno — suficiente para diagnosticar sin inflar la UI. */
  responseText?: string;
  error?: string;
  /** Firma HMAC enviada (spec 032 §A) — la UI la muestra para que el usuario
   * la pegue en su verificador de Make/Zapier. */
  signature?: string;
  /** Body crudo exacto firmado y enviado — el receptor debe verificar sobre
   * este string, no sobre un re-`JSON.stringify` (que reordena claves). */
  rawBody?: string;
  deliveryId?: string;
  timestamp?: string;
}

/**
 * Envía un POST **real** al endpoint configurado en un output `webhook`,
 * usando el primer registro de una muestra (`lastSample`/evento sintético)
 * como datos de interpolación (spec 026 §C2). A diferencia de la vista
 * previa del payload (pasiva, sin red), esta función SÍ llama a `fetch` — el
 * caller debe pedir confirmación explícita antes de invocarla (mismo
 * criterio que "Ejecutar" en el editor, spec 025 §D).
 */
export async function testWebhook(
  output: WebhookOutput,
  sampleRecord: Record<string, unknown>
): Promise<WebhookTestResult> {
  const { url, init, signature, rawBody, deliveryId, timestamp } = await buildWebhookRequest(
    output,
    sampleRecord
  );
  const meta = { signature, rawBody, deliveryId, timestamp };

  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message, ...meta };
  }

  let responseText: string | undefined;
  try {
    const text = await response.text();
    responseText = text.length > 500 ? `${text.slice(0, 500)}...` : text;
  } catch {
    responseText = undefined;
  }

  return { ok: response.ok, status: response.status, responseText, ...meta };
}
