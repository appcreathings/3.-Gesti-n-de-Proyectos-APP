import type { SyncLog } from "@/storage/integration-db";

/** Umbral de retención del proxy inbox en días (spec 026 §E). Las entregas
 *  acumuladas se purgan tras este plazo; un backlog alto significa que Hito
 *  no está drenando a tiempo y arriesga perder entregas. */
export const BACKLOG_RETENTION_DAYS = 7;

/** Backlog a partir del cual se emite warning de riesgo de retención. */
export const BACKLOG_RETENTION_RISK = 100;

/** Cadencia de sondeo por debajo de la cual se considera agresiva (umbral de
 *  carga): más de un poll por minuto concentra riesgo de rate-limiting. */
export const RATE_HIGH_CADENCE_MS = 60_000;

/** La última actividad se considera "staleness" cuando supera este múltiplo
 *  de la cadencia de sondeo configurada. */
export const STALE_FACTOR = 3;

export type HealthWarningType = "stale" | "last-failed" | "backlog-high" | "rate-high";

export interface ConnectionHealthWarning {
  type: HealthWarningType;
  message: string;
}

export interface ConnectionHealth {
  connectionId: string;
  label: string;
  /** Última entrada (drain/poll) registrada, OK o no. */
  lastInboundAt: string | null;
  lastInboundStatus: SyncLog["status"] | null;
  /** Última salida (webhook/email) de un Flujo sobre esta conexión. */
  lastOutboundAt: string | null;
  lastOutboundStatus: SyncLog["status"] | null;
  flowCount: number;
  cadenceMs: number;
  backlog: number | null;
  warnings: ConnectionHealthWarning[];
}

export interface ConnectionHealthInput {
  connectionId: string;
  label: string;
  /** Entradas de `syncLogs` ya filtradas a esta conexión (por quien llama). */
  inboundLogs: SyncLog[];
  /** Salidas de `syncLogs` ya filtradas a los Flujos de esta conexión. */
  outboundLogs: SyncLog[];
  flowCount: number;
  /** Cadencia de sondeo (ms) — típicamente el intervalo del trigger. */
  cadenceMs: number;
  backlog: number | null;
  /** Instante de referencia (ISO) — para que la derivación sea determinista
   *  y testeable sin depender de `new Date()`. */
  now: string;
}

function latest(logs: SyncLog[]): SyncLog | null {
  if (logs.length === 0) return null;
  let best = logs[0];
  for (const log of logs) {
    if (log.createdAt > best.createdAt) best = log;
  }
  return best;
}

/** Derivación pura del estado de salud de una conexión (spec 033 A2 §T3321).
 *  Sin I/O: opera sobre los logs y métricas que el llamador ya reunió. */
export function deriveConnectionHealth(input: ConnectionHealthInput): ConnectionHealth {
  const { connectionId, label, inboundLogs, outboundLogs, flowCount, cadenceMs, backlog, now } = input;
  const nowMs = new Date(now).getTime();

  const lastIn = latest(inboundLogs);
  const lastOut = latest(outboundLogs);

  const lastInboundAt = lastIn?.createdAt ?? null;
  const lastInboundStatus = lastIn?.status ?? null;
  const lastOutboundAt = lastOut?.createdAt ?? null;
  const lastOutboundStatus = lastOut?.status ?? null;

  const warnings: ConnectionHealthWarning[] = [];

  if (lastInboundStatus === "error" || lastOutboundStatus === "error") {
    warnings.push({
      type: "last-failed",
      message: "La última entrada o salida falló — revisa el detalle en el log.",
    });
  }

  if (lastInboundAt) {
    const ageMs = nowMs - new Date(lastInboundAt).getTime();
    if (cadenceMs > 0 && ageMs > STALE_FACTOR * cadenceMs) {
      warnings.push({
        type: "stale",
        message: `Sin entrada desde hace rato (más de ${STALE_FACTOR}× la cadencia).`,
      });
    }
  }

  if (cadenceMs > 0 && cadenceMs < RATE_HIGH_CADENCE_MS) {
    warnings.push({
      type: "rate-high",
      message: "Sondeo muy frecuente (menos de 1 min) — riesgo de rate-limiting.",
    });
  }

  if (backlog !== null && backlog >= BACKLOG_RETENTION_RISK) {
    warnings.push({
      type: "backlog-high",
      message: `Backlog alto (${backlog}) — las entregas pueden caducar tras ${BACKLOG_RETENTION_DAYS} días de retención del proxy.`,
    });
  }

  return {
    connectionId,
    label,
    lastInboundAt,
    lastInboundStatus,
    lastOutboundAt,
    lastOutboundStatus,
    flowCount,
    cadenceMs,
    backlog,
    warnings,
  };
}

/** Formatea una cadencia en ms a texto legible (comparte estilo con
 *  ScheduledServicesPage). Pura — reusable en la UI de salud. */
export function formatCadence(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60_000)} min`;
}
