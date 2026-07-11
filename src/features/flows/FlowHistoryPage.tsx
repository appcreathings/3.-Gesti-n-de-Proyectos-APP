import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { CheckCircle2, AlertCircle, Filter } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { useFlowStore } from "@/store/useFlowStore";
import type { FlowRunLog } from "@/store/useFlowStore";
import { FlowRunDetailDrawer } from "./FlowRunDetailDrawer";

/** Historial global de ejecuciones de todos los flujos (spec 023 §F) —
 * antes solo se veía expandiendo cada tarjeta en `/app/flows` (últimos 5,
 * sin filtros ni detalle). Cada entrada abre un drawer con la traza paso a
 * paso cuando está disponible. */
export function FlowHistoryPage() {
  const flows = useFlowStore((s) => s.flows);
  const runs = useFlowStore((s) => s.runs);

  const [filterFlowId, setFilterFlowId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedRun, setSelectedRun] = useState<FlowRunLog | null>(null);

  const filtered = useMemo(() => {
    return runs.filter((r) => {
      if (filterFlowId && r.flowId !== filterFlowId) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      return true;
    });
  }, [runs, filterFlowId, filterStatus]);

  return (
    <>
      <Helmet>
        <title>Historial de Flujos | Hito</title>
        <meta name="description" content="Historial completo de ejecuciones de flujos, con traza de depuración." />
      </Helmet>

      <div>
        <PageHeader
          label="Flujos"
          title="Historial de ejecuciones"
          description="Cada corrida de cada flujo, con la traza paso a paso de qué pasó con cada registro."
        />

        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <Filter className="size-4 text-muted-foreground" />
            <Select value={filterFlowId} onChange={(e) => setFilterFlowId(e.target.value)} className="w-56">
              <option value="">Todos los flujos</option>
              {flows.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-40">
              <option value="">Todos los estados</option>
              <option value="success">Éxito</option>
              <option value="error">Error</option>
            </Select>
            <span className="ml-auto text-xs text-muted-foreground">
              {filtered.length} ejecución{filtered.length !== 1 ? "es" : ""}
            </span>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {filtered.map((run) => (
            <button
              key={run.id}
              onClick={() => setSelectedRun(run)}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:bg-accent"
            >
              {run.status === "success" ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" />
              ) : (
                <AlertCircle className="size-4 shrink-0 text-destructive" />
              )}
              <span className="w-48 shrink-0 truncate text-sm font-medium">{run.flowName}</span>
              <span className="flex-1 truncate text-sm text-muted-foreground">{run.detail}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(run.at).toLocaleString()}
              </span>
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {runs.length === 0
                  ? "Todavía no hay ejecuciones registradas."
                  : "Ninguna ejecución coincide con los filtros."}
              </p>
            </div>
          )}
        </div>
      </div>

      <FlowRunDetailDrawer run={selectedRun} onClose={() => setSelectedRun(null)} />
    </>
  );
}
