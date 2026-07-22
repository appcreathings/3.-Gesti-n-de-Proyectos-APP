import { postToProxy } from "../proxy-fetch";
import { drainInbox, type InboxConfig } from "./inbox-poller";

/** Resultado del round-trip del inbox (spec 033 A3). */
export interface InboxRoundTripResult {
  ok: boolean;
  /** `deliveryId` que el proxy asignó al ingreso, si llegó a encolarse. */
  deliveryId: string | null;
  /** Nº de entregas que el drain de confirmación trajo. */
  drained: number;
  error: string | null;
}

/** Sample fijo que simula lo que Make/Zapier empujaría al inbox. Incluye un
 *  `event` reconocible para que el usuario lo distinga en el log. */
export const INBOX_TEST_SAMPLE = {
  event: "hito-round-trip-test",
  message: "Entrega de prueba desde Hito",
  amount: 42,
};

/** Ejecuta un round-trip del inbox (spec 033 A3 §T3330): empuja una entrega
 *  de prueba al proxy (como haría Make/Zapier), la drena inmediatamente y
 *  confirma que vuelve con el mismo `deliveryId`. Aislada de la UI para poder
 *  testearla mockeando `postToProxy`/`drainInbox`. */
export async function runInboxRoundTrip(
  proxyUrl: string,
  secret: string | null,
): Promise<InboxRoundTripResult> {
  // 1. Ingreso: el proxy trata cualquier POST que no sea `action:"drain"` como
  //    una entrega nueva. El secreto del ingreso viaja como query param (igual
  //    que lo configuraría Make/Zapier), no en el body.
  const pushUrl = secret ? `${proxyUrl}?secret=${encodeURIComponent(secret)}` : proxyUrl;
  const pushRes = await postToProxy<{ deliveryId: string }>(pushUrl, {
    ...INBOX_TEST_SAMPLE,
    sentAt: new Date().toISOString(),
  });
  if (!pushRes.ok) {
    return { ok: false, deliveryId: null, drained: 0, error: pushRes.message };
  }
  const deliveryId = pushRes.data.deliveryId;

  // 2. Drain de confirmación: trae lo acumulado desde el cursor más antiguo.
  const config: InboxConfig = { proxyUrl, secret };
  const drainRes = await drainInbox(config, null);
  if (!drainRes.success) {
    return { ok: false, deliveryId, drained: 0, error: drainRes.error ?? "El drain falló." };
  }

  const found = (drainRes.records ?? []).some((r) => r.deliveryId === deliveryId);
  return {
    ok: found,
    deliveryId,
    drained: drainRes.newRecords,
    error: found
      ? null
      : "El drain no devolvió esta entrega (puede tardar un tick en propagarse en la hoja).",
  };
}
