import { nowIso, uuid } from "@/lib/utils";
import type { WebhookOutput } from "@/domain/schemas/flow";
import { signPayload } from "@/integrations/outbound/signing";
import { interpolateObject } from "./interpolation";

export interface WebhookRequest {
  url: string;
  /** Opciones listas para `fetch(url, init)` — sin `signal`, cada caller
   * (motor real, "Probar webhook") decide su propio timeout. */
  init: RequestInit;
  /** Payload ya interpolado — el mismo que viaja en el body. */
  payload: Record<string, unknown>;
  /** Tokens `{{x}}` del payload que no resolvieron contra `data` (spec 026 §A/§E). */
  unresolved: string[];
}

/**
 * Construye la request de un output `webhook` — payload interpolado + firma
 * HMAC + headers `X-Hito-*` — sin llamar a `fetch`. Extraído de
 * `engine.ts` (spec 026 §C1) para que el motor y "Probar webhook"
 * (`webhook-test.ts`) compartan exactamente la misma construcción de
 * request: nada de duplicar la lógica de firma en dos sitios que puedan
 * divergir.
 */
export async function buildWebhookRequest(
  output: WebhookOutput,
  data: Record<string, unknown>
): Promise<WebhookRequest> {
  const { value: payload, unresolved } = output.payload
    ? interpolateObject(output.payload, data)
    : { value: data, unresolved: [] as string[] };

  const signature = await signPayload(
    {
      eventId: uuid(),
      eventType: "flow.execution",
      timestamp: nowIso(),
      workspace: { org: "Hito" },
      data: payload,
    },
    output.secret
  );

  return {
    url: output.url,
    payload,
    unresolved,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hito-Signature": signature,
        "X-Hito-Event": "flow.execution",
      },
      body: JSON.stringify(payload),
    },
  };
}
