import type { PollResult } from "../polling/polling-manager";
import { idempotencyCheck } from "./idempotency";
import { postToProxy } from "../proxy-fetch";

export interface InboxConfig {
  proxyUrl: string;
  /** Secreto compartido opcional que el proxy exige a Make/Zapier al encolar y
   * que Hito reenvía al drenar (spec 032 §B). `null` si el inbox es abierto. */
  secret: string | null;
}

/** Una entrega acumulada en el proxy inbox, tal como la devuelve `action:"drain"`. */
export interface InboxDelivery {
  deliveryId: string;
  receivedAt: string;
  body: unknown;
}

interface DrainResponse {
  deliveries?: InboxDelivery[];
  nextCursor?: string;
  backlog?: number;
}

/** Aplana el body de una entrega a un registro `{campo: valor}` para el Flujo,
 * conservando `deliveryId`/`receivedAt` como campos disponibles en `{{}}`. Si el
 * body no es un objeto plano (ej. un array o un escalar), se expone bajo `value`
 * para no perderlo. Pura — reusable en tests. */
export function flattenDelivery(delivery: InboxDelivery): Record<string, unknown> {
  const base = { deliveryId: delivery.deliveryId, receivedAt: delivery.receivedAt };
  if (delivery.body && typeof delivery.body === "object" && !Array.isArray(delivery.body)) {
    return { ...base, ...(delivery.body as Record<string, unknown>) };
  }
  return { ...base, value: delivery.body };
}

/**
 * Drena las entregas nuevas del proxy inbox del usuario (spec 032 §B). Make/
 * Zapier/n8n hacen POST a ese proxy Apps Script, que las acumula; aquí Hito
 * pide las que llegaron después del `cursor` (idempotente: el proxy no borra al
 * drenar, solo se avanza el cursor `receivedAt`, así que un fallo parcial de
 * Hito nunca pierde entregas). Reusa `postToProxy` (mismo manejo de CORS/
 * `text/plain`/desenvelope que HubSpot/Sheets) y la idempotencia por
 * `deliveryId`. Solo trae datos — el mapeo/outputs los define el propio Flujo.
 */
export async function drainInbox(config: InboxConfig, cursor: string | null): Promise<PollResult> {
  try {
    const result = await postToProxy<DrainResponse>(config.proxyUrl, {
      action: "drain",
      cursor: cursor ?? "",
      max: 100,
      ...(config.secret ? { secret: config.secret } : {}),
    });

    if (!result.ok) {
      const error = `Inbox proxy error: ${result.message}`;
      return { success: false, newRecords: 0, lastExternalTimestamp: cursor ?? "", error };
    }

    const deliveries = result.data.deliveries ?? [];
    const nextCursor =
      result.data.nextCursor ??
      (deliveries.length > 0 ? deliveries[deliveries.length - 1].receivedAt : cursor ?? "");

    const records: Record<string, unknown>[] = [];
    for (const delivery of deliveries) {
      if (!delivery.deliveryId) continue;
      // Dedup por deliveryId — un re-drain (o un tick repetido) no re-ejecuta.
      const isDuplicate = await idempotencyCheck(`inbox-${delivery.deliveryId}`);
      if (isDuplicate) continue;
      records.push(flattenDelivery(delivery));
    }

    return {
      success: true,
      newRecords: records.length,
      lastExternalTimestamp: nextCursor,
      records,
      // Spec 033 A2: el backlog reportado por el proxy alimenta el semáforo
      // de salud por conexión (riesgo de retención).
      backlog: typeof result.data.backlog === "number" ? result.data.backlog : 0,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, newRecords: 0, lastExternalTimestamp: cursor ?? "", error: errorMessage };
  }
}
