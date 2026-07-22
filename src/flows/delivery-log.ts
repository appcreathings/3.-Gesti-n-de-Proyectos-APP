import { nowIso, uuid } from "@/lib/utils";
import type { OutboundDelivery } from "./engine";
import type { SyncLog } from "@/storage/integration-db";

/** Tope para el body persistido en `syncLogs` (spec 033 A1) — acotado para que
 *  el historial no crezca sin límite en una app local-first. La rotación por
 *  edad/cantidad ya corre en `maintenance.ts` (018 §9.3); este es un límite
 *  por entrada. */
const MAX_PAYLOAD_BYTES = 10_000;

/** Keys de payload que se enmascaran con "••••" antes de persistir el body en
 *  `syncLogs` (criterio 024 §F4 / 026 §E — no filtrar secretos en claro).
 *  Aunque el `secret` de firma del webhook viaja separado y nunca entra al
 *  payload, el usuario podría haber interpolado un token de auth del tercero
 *  dentro del body (Authorization, X-Api-Key). El log es para depuración; no
 *  debe exponer esos secretos aunque estén en el body que se envía. */
const SECRET_KEYS =
  /^(secret|password|token|apikey|api[_-]?key|authorization|access[_-]?token|refresh[_-]?token)$/i;

/** Enmascara recursivamente valores de keys sensibles con "••••". Pura —
 *  reusable en tests. */
export function maskSecretInPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskSecretInPayload);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEYS.test(k) ? "••••" : maskSecretInPayload(v);
    }
    return out;
  }
  return value;
}

function truncateForLog(s: string): string {
  return s.length > MAX_PAYLOAD_BYTES ? `${s.slice(0, MAX_PAYLOAD_BYTES - 3)}...` : s;
}

/** Construye la entrada durable de `syncLogs` a partir de una entrega
 *  saliente de webhook de un Flujo (spec 033 A1). Pura — el caller
 *  (`applyFlowResult`/`DeliveryDetailDrawer`) asigna `id`/`createdAt` al
 *  persistir. El `secret` de firma NUNCA se persiste: no va en el body
 *  enmascarado ni en ningún campo. */
export function buildOutboundSyncLog(
  delivery: OutboundDelivery,
  eventType: string,
  runId?: string,
): Omit<SyncLog, "id" | "createdAt"> {
  const masked = maskSecretInPayload(delivery.payload);
  return {
    direction: "outbound",
    provider: "webhook",
    eventType,
    status: delivery.error ? "error" : "success",
    requestPayload: truncateForLog(JSON.stringify(masked)),
    responsePayload: delivery.responseSnippet ?? "",
    httpStatus: delivery.status ?? null,
    errorMessage: delivery.error ?? null,
    retryCount: delivery.attempts ? Math.max(0, delivery.attempts - 1) : 0,
    flowId: delivery.flowId,
    outputIndex: delivery.outputIndex,
    runId,
    // `data` para replay: el registro runtime tal cual alimentó al output,
    // para que `buildWebhookRequest(output, data)` reinterpole exactamente
    // el mismo body + firma. El `secret` se omite (viene del Flujo vivo).
    replayData: delivery.data ? truncateForLog(JSON.stringify(delivery.data)) : undefined,
  };
}

/** Persiste entregas salientes como entradas `syncLogs` (spec 033 A1). Vive
 *  aquí (fuera del motor puro `engine.ts`, que no debe tocar Dexie) y se llama
 *  desde `applyFlowResult` (`useDataStore.ts`). Acepta el `db` por parámetro
 *  para que los tests de store puedan mockearlo. */
export async function persistOutboundDeliveries(
  db: { syncLogs: { add: (log: SyncLog) => Promise<unknown> } },
  deliveries: OutboundDelivery[],
  eventType: string,
  runId?: string,
): Promise<void> {
  const now = nowIso();
  for (const delivery of deliveries) {
    const log: SyncLog = {
      id: uuid(),
      createdAt: now,
      ...buildOutboundSyncLog(delivery, eventType, runId),
    };
    await db.syncLogs.add(log);
  }
}
