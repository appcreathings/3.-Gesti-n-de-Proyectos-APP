import { describe, it, expect } from "vitest";
import {
  deriveConnectionHealth,
  BACKLOG_RETENTION_RISK,
  RATE_HIGH_CADENCE_MS,
  STALE_FACTOR,
  formatCadence,
  type ConnectionHealthInput,
} from "./connection-health";
import type { SyncLog } from "@/storage/integration-db";

const NOW = "2026-07-22T12:00:00.000Z";
const NOW_MS = new Date(NOW).getTime();

function mkLog(
  partial: Partial<SyncLog> & { direction: "inbound" | "outbound"; createdAt: string }
): SyncLog {
  return {
    id: `log-${Math.random().toString(36).slice(2)}`,
    provider: partial.direction === "outbound" ? "webhook" : "inbox",
    eventType: partial.direction === "outbound" ? "output" : "inbox:c1",
    status: "success",
    requestPayload: "",
    responsePayload: "",
    httpStatus: 200,
    errorMessage: null,
    retryCount: 0,
    ...partial,
  } as SyncLog;
}

function baseInput(overrides: Partial<ConnectionHealthInput> = {}): ConnectionHealthInput {
  return {
    connectionId: "c1",
    label: "Inbox Make",
    inboundLogs: [],
    outboundLogs: [],
    flowCount: 1,
    cadenceMs: 300_000,
    backlog: 0,
    now: NOW,
    ...overrides,
  };
}

describe("deriveConnectionHealth (spec 033 A2)", () => {
  it("OK reciente → semáforo verde, sin warnings", () => {
    const health = deriveConnectionHealth(
      baseInput({
        inboundLogs: [mkLog({ direction: "inbound", createdAt: NOW })],
        outboundLogs: [mkLog({ direction: "outbound", createdAt: NOW })],
      })
    );
    expect(health.warnings).toEqual([]);
    expect(health.lastInboundStatus).toBe("success");
    expect(health.lastOutboundStatus).toBe("success");
  });

  it("último falló → warning last-failed", () => {
    const health = deriveConnectionHealth(
      baseInput({
        inboundLogs: [
          mkLog({ direction: "inbound", status: "error", errorMessage: "boom", createdAt: NOW }),
        ],
      })
    );
    expect(health.warnings.some((w) => w.type === "last-failed")).toBe(true);
    expect(health.lastInboundStatus).toBe("error");
  });

  it("última salida fallida también dispara last-failed", () => {
    const health = deriveConnectionHealth(
      baseInput({
        inboundLogs: [mkLog({ direction: "inbound", createdAt: NOW })],
        outboundLogs: [
          mkLog({ direction: "outbound", status: "error", createdAt: NOW }),
        ],
      })
    );
    expect(health.warnings.some((w) => w.type === "last-failed")).toBe(true);
    expect(health.lastOutboundStatus).toBe("error");
  });

  it("sin entrada desde hace rato → warning stale", () => {
    const cadence = 300_000; // 5 min
    const staleAge = (STALE_FACTOR + 1) * cadence; // > 3× cadencia
    const oldTs = new Date(NOW_MS - staleAge).toISOString();
    const health = deriveConnectionHealth(
      baseInput({
        cadenceMs: cadence,
        inboundLogs: [mkLog({ direction: "inbound", createdAt: oldTs })],
      })
    );
    expect(health.warnings.some((w) => w.type === "stale")).toBe(true);
  });

  it("entrada reciente pero cadencia corta → warning rate-high (umbral de carga)", () => {
    const health = deriveConnectionHealth(
      baseInput({
        cadenceMs: RATE_HIGH_CADENCE_MS - 5_000, // 55s, < 1 min
        inboundLogs: [mkLog({ direction: "inbound", createdAt: NOW })],
      })
    );
    expect(health.warnings.some((w) => w.type === "rate-high")).toBe(true);
  });

  it("backlog cerca de retención → warning backlog-high", () => {
    const health = deriveConnectionHealth(
      baseInput({ backlog: BACKLOG_RETENTION_RISK + 10 })
    );
    expect(health.warnings.some((w) => w.type === "backlog-high")).toBe(true);
  });

  it("backlog bajo → sin warning de backlog", () => {
    const health = deriveConnectionHealth(baseInput({ backlog: 5 }));
    expect(health.warnings.some((w) => w.type === "backlog-high")).toBe(false);
  });

  it("sin ningún log todavía → todo null, sin warnings (no es un error)", () => {
    const health = deriveConnectionHealth(baseInput({ inboundLogs: [], outboundLogs: [] }));
    expect(health.lastInboundAt).toBeNull();
    expect(health.lastInboundStatus).toBeNull();
    expect(health.lastOutboundAt).toBeNull();
    expect(health.warnings).toEqual([]);
  });

  it("elige el log más reciente por createdAt (no el primero del array)", () => {
    const older = mkLog({ direction: "inbound", status: "error", createdAt: new Date(NOW_MS - 3600_000).toISOString() });
    const newer = mkLog({ direction: "inbound", status: "success", createdAt: NOW });
    const health = deriveConnectionHealth(
      baseInput({ inboundLogs: [older, newer] })
    );
    expect(health.lastInboundStatus).toBe("success");
    expect(health.warnings.some((w) => w.type === "last-failed")).toBe(false);
  });

  it("propaga flowCount, cadenceMs, backlog y label al resultado", () => {
    const health = deriveConnectionHealth(
      baseInput({ flowCount: 3, cadenceMs: 600_000, backlog: 42, label: "HubSpot prod" })
    );
    expect(health.flowCount).toBe(3);
    expect(health.cadenceMs).toBe(600_000);
    expect(health.backlog).toBe(42);
    expect(health.label).toBe("HubSpot prod");
  });
});

describe("formatCadence", () => {
  it("formatea segundos por debajo de un minuto", () => {
    expect(formatCadence(45_000)).toBe("45s");
  });

  it("formatea minutos por encima de un minuto", () => {
    expect(formatCadence(300_000)).toBe("5 min");
  });
});
