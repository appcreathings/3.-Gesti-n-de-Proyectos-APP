import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { RefreshCw, Radio, Send, Lock, Unlock, Activity } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVaultStore } from "@/integrations/vault";
import { loadAutoLockMinutes } from "@/integrations/vault-auto-lock";
import {
  deriveConnectionHealth,
  formatCadence,
  type ConnectionHealth,
} from "@/integrations/connection-health";
import { getConnections } from "@/integrations/connections";
import { loadLastBacklog } from "@/integrations/inbound/poll-sync-state";
import type { FlowRule, PollTrigger } from "@/domain/schemas";

interface PollingStatusRow {
  key: string;
  isPolling: boolean;
  currentInterval: number;
  baseIntervalMs: number;
  maxIntervalMs: number;
}

function formatMs(ms: number): string {
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60_000)} min`;
}

/** Panel de solo lectura de los servicios programados que corren en
 * background (spec 023 §F): polling de HubSpot/Sheets, el procesador de
 * reintentos de webhooks salientes, y el estado del auto-bloqueo del vault.
 * Ninguno era antes inspeccionable desde la UI. */
export function ScheduledServicesPage() {
  const [pollingRows, setPollingRows] = useState<PollingStatusRow[]>([]);
  const [outboundRunning, setOutboundRunning] = useState<boolean | null>(null);
  const [outboundPending, setOutboundPending] = useState<number | null>(null);
  const [healthRows, setHealthRows] = useState<ConnectionHealth[]>([]);
  const [loading, setLoading] = useState(true);

  const isUnlocked = useVaultStore((s) => s.isUnlocked);
  const persistenceMode = useVaultStore((s) => s.persistenceMode);
  const autoLockMinutes = loadAutoLockMinutes();

  async function refresh() {
    setLoading(true);
    try {
      const [{ pollingManager }, { isOutboundProcessorRunning }, { integrationDb }] = await Promise.all([
        import("@/integrations/polling/polling-manager"),
        import("@/integrations/outbound/retry-engine"),
        import("@/storage/integration-db"),
      ]);

      const statuses = pollingManager.getAllStatuses();
      setPollingRows(Object.entries(statuses).map(([key, s]) => ({ key, ...s })));
      setOutboundRunning(isOutboundProcessorRunning());
      setOutboundPending(await integrationDb.outboundQueue.count());

      // Spec 033 A2: semáforo de salud por conexión — deriva de syncLogs +
      // métricas de polling. El inbox reporta backlog; el resto queda en null.
      const [{ useFlowStore }] = await Promise.all([import("@/store/useFlowStore")]);
      const flows = useFlowStore.getState().flows;
      const allLogs = await integrationDb.syncLogs.orderBy("createdAt").reverse().toArray();
      const now = new Date().toISOString();
      const connections = await getConnections();

      const rows: ConnectionHealth[] = connections.map((conn) => {
        const connFlows = flows.filter(
          (f): f is FlowRule & { trigger: PollTrigger } =>
            f.trigger.type === "poll" && f.enabled && f.trigger.config.connectionId === conn.id
        );
        const flowIds = new Set(connFlows.map((f) => f.id));
        const cadenceMs = connFlows.length
          ? Math.min(...connFlows.map((f) => f.trigger.config.intervalMs))
          : 0;

        const inboundLogs = allLogs.filter(
          (l) =>
            l.direction === "inbound" &&
            (conn.provider === "webhook-inbox"
              ? l.eventType === `inbox:${conn.id}`
              : l.provider === conn.provider)
        );
        const outboundLogs = allLogs.filter(
          (l) => l.direction === "outbound" && l.flowId != null && flowIds.has(l.flowId)
        );

        const backlog =
          // El inbox es el único proveedor con backlog (hubspot/sheets leen de
          // la API en vivo). La key coincide con `pollTriggerKey` del inbox.
          conn.provider === "webhook-inbox" ? loadLastBacklog(`inbox:${conn.id}`) : null;

        return deriveConnectionHealth({
          connectionId: conn.id,
          label: conn.name,
          inboundLogs,
          outboundLogs,
          flowCount: connFlows.length,
          cadenceMs,
          backlog,
          now,
        });
      });
      setHealthRows(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <>
      <Helmet>
        <title>Servicios programados | Hito</title>
        <meta name="description" content="Estado de los servicios en background: polling, reintentos de webhooks y vault." />
      </Helmet>

      <div>
        <PageHeader
          label="Flujos"
          title="Servicios programados"
          description="Diagnóstico de solo lectura de lo que corre en background en esta pestaña."
          actions={
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          }
        />

        <div className="grid gap-6">
          <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm">
            <Radio className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="text-muted-foreground">
              El sondeo de conexiones y la recepción vía <strong>inbox</strong> (Make/Zapier) funcionan{" "}
              <strong>solo mientras Hito está abierto</strong> en una pestaña. Al reabrir, Hito recupera
              lo pendiente (catch-up), hasta el límite de retención del proxy — Hito no es un consumidor
              24/7, es la contraparte honesta del modelo local-first.
            </p>
          </div>

          <Panel label="Entrada" title="Polling de conexiones" description="Registros activos que sondean HubSpot/Sheets/inbox periódicamente.">
            {pollingRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin polling activo — no hay flujos de tipo poll habilitados en esta pestaña.
              </p>
            ) : (
              <div className="space-y-2">
                {pollingRows.map((row) => {
                  const backingOff = row.currentInterval > row.baseIntervalMs;
                  return (
                    <div key={row.key} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <Radio className={`size-4 ${row.isPolling ? "text-success" : "text-muted-foreground"}`} />
                      <div className="flex-1">
                        <p className="font-mono text-sm">{row.key}</p>
                        <p className="text-xs text-muted-foreground">
                          Cada {formatMs(row.currentInterval)}
                          {backingOff && ` (backoff activo, normal: ${formatMs(row.baseIntervalMs)})`}
                        </p>
                      </div>
                      <Badge variant={row.isPolling ? "success" : "outline"} className="text-[10px]">
                        {row.isPolling ? "Activo" : "Pausado"}
                      </Badge>
                      {backingOff && (
                        <Badge variant="warning" className="text-[10px]">
                          Backoff
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel
            label="A2"
            title="Salud por conexión"
            description="Semáforo de cada conexión: última entrada/salida, flujos activos, backlog y avisos de tasa/retención."
          >
            {healthRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin conexiones configuradas todavía.
              </p>
            ) : (
              <div className="space-y-2">
                {healthRows.map((h) => {
                  const inboundOk = h.lastInboundStatus === "success";
                  const outboundOk = h.lastOutboundStatus === "success";
                  return (
                    <div key={h.connectionId} className="rounded-lg border border-border p-3">
                      <div className="flex items-center gap-3">
                        <Activity className="size-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{h.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {h.flowCount} flujo(s) · cada {h.cadenceMs > 0 ? formatCadence(h.cadenceMs) : "—"}
                            {h.backlog !== null ? ` · backlog ${h.backlog}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {h.lastInboundAt ? (
                          <Badge variant={inboundOk ? "success" : "destructive"} className="text-[10px]">
                            Entrada {inboundOk ? "OK" : "falló"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Sin entrada</Badge>
                        )}
                        {h.lastOutboundAt && (
                          <Badge variant={outboundOk ? "success" : "destructive"} className="text-[10px]">
                            Salida {outboundOk ? "OK" : "falló"}
                          </Badge>
                        )}
                        {h.warnings.map((w) => (
                          <Badge key={w.type} variant="warning" className="text-[10px]">
                            {w.type === "stale" && "Sin entrada hace rato"}
                            {w.type === "last-failed" && "Último falló"}
                            {w.type === "backlog-high" && "Backlog alto"}
                            {w.type === "rate-high" && "Tasa alta"}
                          </Badge>
                        ))}
                      </div>
                      {h.warnings.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {h.warnings.map((w) => (
                            <li key={w.type} className="text-xs text-warning">
                              {w.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel label="Salida" title="Procesador de webhooks salientes" description="Reintenta entregas fallidas cada 30s con backoff exponencial.">
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Send className={`size-4 ${outboundRunning ? "text-success" : "text-muted-foreground"}`} />
              <div className="flex-1">
                <p className="text-sm">
                  {outboundRunning === null ? "—" : outboundRunning ? "Corriendo" : "Detenido"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {outboundPending === null ? "" : `${outboundPending} entrega(s) pendiente(s) de reintento`}
                </p>
              </div>
            </div>
          </Panel>

          <Panel label="Seguridad" title="Vault" description="Estado del desbloqueo y auto-bloqueo por inactividad.">
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              {isUnlocked ? (
                <Unlock className="size-4 text-success" />
              ) : (
                <Lock className="size-4 text-muted-foreground" />
              )}
              <div className="flex-1">
                <p className="text-sm">{isUnlocked ? "Desbloqueado" : "Bloqueado"}</p>
                <p className="text-xs text-muted-foreground">
                  Persistencia: {persistenceMode === "off" ? "no persiste" : persistenceMode} · Auto-bloqueo:{" "}
                  {autoLockMinutes === 0 ? "desactivado" : `${autoLockMinutes} min`}
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
