import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { RefreshCw, Radio, Send, Lock, Unlock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVaultStore } from "@/integrations/vault";
import { loadAutoLockMinutes } from "@/integrations/vault-auto-lock";

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
          <Panel label="Entrada" title="Polling de conexiones" description="Registros activos que sondean HubSpot/Sheets periódicamente.">
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
