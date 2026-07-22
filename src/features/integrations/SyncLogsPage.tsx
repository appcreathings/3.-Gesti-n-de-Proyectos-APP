import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Clock, Filter, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { integrationDb } from "@/storage/integration-db";
import type { SyncLog } from "@/storage/integration-db";
import { ROUTES } from "@/routes/paths";
import { DeliveryDetailDrawer } from "./DeliveryDetailDrawer";

const PAGE_SIZE = 20;

export function SyncLogsPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [filterProvider, setFilterProvider] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [page, filterProvider, filterStatus]);

  async function loadLogs() {
    const allLogs = await integrationDb.syncLogs.orderBy("createdAt").reverse().toArray();
    const filtered = allLogs.filter((log: SyncLog) => {
      if (filterProvider && log.provider !== filterProvider) return false;
      if (filterStatus && log.status !== filterStatus) return false;
      return true;
    });

    setTotal(filtered.length);
    setLogs(filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));
  }

  // Spec 033 A1: `webhook` y `inbox` ahora tienen entries propias en
  // `syncLogs` (Flujos salientes + drains del inbox), así que se exponen en
  // el filtro además de los providers históricos.
  const providers = ["hubspot", "google-sheets", "webhook", "email", "inbox"];
  const statuses = ["success", "error", "pending"];

  return (
    <>
      <Helmet>
        <title>Historial de Integraciones | Hito</title>
      </Helmet>

      <div>
        <PageHeader
          label="Integraciones"
          title="Historial de Sincronización"
          description="Registro de todas las operaciones de entrada y salida."
        />

        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <Filter className="size-4 text-muted-foreground" />
            <Select
              value={filterProvider}
              onChange={(e) => {
                setFilterProvider(e.target.value);
                setPage(0);
              }}
              className="w-40"
            >
              <option value="">Todos los providers</option>
              {providers.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
            <Select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(0);
              }}
              className="w-32"
            >
              <option value="">Todos</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
            <span className="ml-auto text-xs text-muted-foreground">
              {total} registro{total !== 1 ? "s" : ""}
            </span>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {logs.map((log) => (
            <button
              key={log.id}
              onClick={() => setSelectedLog(log)}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:bg-accent"
            >
              <span className="text-xs">
                {log.direction === "inbound" ? (
                  <ArrowRight className="size-4 text-blue-500" />
                ) : (
                  <ArrowLeft className="size-4 text-purple-500" />
                )}
              </span>
              <Badge variant="outline" className="text-xs font-mono">
                {log.provider}
              </Badge>
              <span className="flex-1 truncate text-sm">
                {log.eventType}
              </span>
              {log.status === "success" && (
                <CheckCircle2 className="size-4 text-success" />
              )}
              {log.status === "error" && (
                <XCircle className="size-4 text-destructive" />
              )}
              {log.status === "pending" && (
                <Clock className="size-4 text-warning" />
              )}
              {/* Spec 033 A1/C1: saltar al run del historial cuando la
                  entrega está vinculada a un Flujo. */}
              {log.runId && (
                <button
                  type="button"
                  title="Ver run en el historial"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`${ROUTES.flowHistory}?run=${log.runId}`);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="size-4" />
                </button>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(log.createdAt).toLocaleTimeString()}
              </span>
            </button>
          ))}

          {logs.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No hay registros de sincronización.
              </p>
            </div>
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              Página {page + 1} de {Math.ceil(total / PAGE_SIZE)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={(page + 1) * PAGE_SIZE >= total}
              onClick={() => setPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>

      <DeliveryDetailDrawer
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </>
  );
}
