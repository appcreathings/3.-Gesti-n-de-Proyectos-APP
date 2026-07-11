import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Zap,
  History,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Play,
  Activity,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useFlowStore } from "@/store/useFlowStore";
import { useDataStore } from "@/store/useDataStore";
import type { FlowRule } from "@/domain/schemas/flow";
import type { DomainEvent } from "@/automations/events";
import { buildGraphFromRule, graphFromPersisted } from "@/flows/graph";
import { FlowPreviewCanvas } from "./canvas/FlowPreviewCanvas";
import { RunEventFlowDialog } from "./RunEventFlowDialog";
import { ROUTES } from "@/routes/paths";

export function FlowsPage() {
  const navigate = useNavigate();
  const flows = useFlowStore((s) => s.flows);
  const updateFlow = useFlowStore((s) => s.updateFlow);
  const deleteFlow = useFlowStore((s) => s.deleteFlow);
  const runFlowNow = useDataStore((s) => s.runFlowNow);

  const [toDelete, setToDelete] = useState<FlowRule | undefined>();
  const [toRun, setToRun] = useState<FlowRule | undefined>();
  const [toRunEvent, setToRunEvent] = useState<FlowRule | undefined>();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [openHistoryIds, setOpenHistoryIds] = useState<Set<string>>(new Set());

  const handleToggle = async (flow: FlowRule) => {
    await updateFlow({ ...flow, enabled: !flow.enabled });
  };

  const handleEdit = (flow: FlowRule) => {
    navigate(ROUTES.flowEdit(flow.id));
  };

  const handleDelete = async () => {
    if (toDelete) {
      await deleteFlow(toDelete.id);
      setToDelete(undefined);
    }
  };

  const handleRunConfirm = async () => {
    if (!toRun) return;
    const flow = toRun;
    setToRun(undefined);
    setRunningId(flow.id);
    try {
      await runFlowNow(flow.id);
    } finally {
      setRunningId(null);
      // El resultado (éxito/error, con detalle) queda como la entrada más
      // reciente del historial — expandirlo es la forma más simple de que
      // el usuario lo vea sin introducir un sistema de toasts nuevo.
      setOpenHistoryIds((prev) => new Set(prev).add(flow.id));
    }
  };

  const handleRunEventFlow = async (syntheticEvent: DomainEvent) => {
    if (!toRunEvent) return;
    const flow = toRunEvent;
    setRunningId(flow.id);
    try {
      await runFlowNow(flow.id, { syntheticEvent });
    } finally {
      setRunningId(null);
      setOpenHistoryIds((prev) => new Set(prev).add(flow.id));
    }
  };

  return (
    <>
      <Helmet>
        <title>Flujos | Hito</title>
        <meta name="description" content="Automatizaciones con integraciones a la medida." />
      </Helmet>
      <div>
        <PageHeader
          label="Flujos"
          title="Flujos"
          description="Automatizaciones con integraciones a la medida: eventos internos, HubSpot, webhooks y email."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(ROUTES.flowHistory)}>
                <History className="size-4" />
                Historial
              </Button>
              <Button variant="outline" onClick={() => navigate(ROUTES.flowServices)}>
                <Activity className="size-4" />
                Servicios
              </Button>
              <Button onClick={() => navigate(ROUTES.flowNew)}>
                <Plus className="size-4" />
                Nuevo flujo
              </Button>
            </div>
          }
        />

        {flows.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="Sin flujos"
            description="Crea flujos para automatizar tareas: cuando una tarea cambia de estado, notificar por webhook; cuando llega un contacto de HubSpot, crear una persona; etc."
            action={
              <Button onClick={() => navigate(ROUTES.flowNew)}>
                <Plus className="size-4" />
                Nuevo flujo
              </Button>
            }
          />
        ) : (
          <div className="space-y-6">
            {flows.map((flow) => (
              <FlowCard
                key={flow.id}
                flow={flow}
                onEdit={() => handleEdit(flow)}
                onDelete={() => setToDelete(flow)}
                onToggle={() => handleToggle(flow)}
                onRun={
                  flow.trigger.type === "poll" ? () => setToRun(flow) : () => setToRunEvent(flow)
                }
                isRunning={runningId === flow.id}
                historyOpen={openHistoryIds.has(flow.id)}
                onToggleHistory={() =>
                  setOpenHistoryIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(flow.id)) {
                      next.delete(flow.id);
                    } else {
                      next.add(flow.id);
                    }
                    return next;
                  })
                }
              />
            ))}
          </div>
        )}

        <ConfirmDialog
          open={!!toDelete}
          onOpenChange={(o) => !o && setToDelete(undefined)}
          title={`¿Eliminar el flujo "${toDelete?.name}"?`}
          description="Esta acción no se puede deshacer."
          onConfirm={handleDelete}
        />

        <ConfirmDialog
          open={!!toRun}
          onOpenChange={(o) => !o && setToRun(undefined)}
          title={`¿Ejecutar "${toRun?.name}" ahora?`}
          description="Esto trae datos reales de la conexión y aplica las acciones configuradas de verdad — puede crear tareas o proyectos, y enviar emails o webhooks. No es una simulación."
          confirmLabel="Ejecutar ahora"
          confirmVariant="default"
          onConfirm={handleRunConfirm}
        />

        {toRunEvent && (
          <RunEventFlowDialog
            open={!!toRunEvent}
            onOpenChange={(o) => !o && setToRunEvent(undefined)}
            flow={toRunEvent}
            onRun={handleRunEventFlow}
          />
        )}
      </div>
    </>
  );
}

function FlowCard({
  flow,
  onEdit,
  onDelete,
  onToggle,
  onRun,
  isRunning,
  historyOpen,
  onToggleHistory,
}: {
  flow: FlowRule;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  /** Flujos de poll abren el `ConfirmDialog` genérico; flujos de evento abren
   * `RunEventFlowDialog` (necesitan elegir una entidad real primero) — ambos
   * casos los decide el padre, aquí es un solo botón. */
  onRun?: () => void;
  isRunning: boolean;
  historyOpen: boolean;
  onToggleHistory: () => void;
}) {
  const runs = useFlowStore((s) => s.runs);
  const flowRuns = runs.filter((r) => r.flowId === flow.id).slice(0, 5);
  const graph = flow.graph ? graphFromPersisted(flow.graph) : buildGraphFromRule(flow);

  return (
    <Card className={`overflow-hidden transition-all ${flow.enabled ? "" : "opacity-60"}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              flow.enabled ? "bg-success" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-background shadow-sm transition-transform ${
                flow.enabled ? "translate-x-5" : ""
              }`}
            />
          </button>
          <div>
            <CardTitle className="text-base">{flow.name}</CardTitle>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={flow.enabled ? "success" : "outline"} className="text-[10px]">
                {flow.enabled ? "Activo" : "Inactivo"}
              </Badge>
              {flow.runCount > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {flow.runCount} ejecuciones
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          {onRun && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRun}
              disabled={isRunning}
              className="h-8 text-xs"
            >
              <Play className="size-3.5" />
              {isRunning ? "Ejecutando..." : "Ejecutar ahora"}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 text-xs">
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-8 text-xs text-destructive hover:text-destructive"
          >
            Eliminar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <FlowPreviewCanvas graph={graph} />
        {flow.outputs.length === 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="size-3.5" />
            Sin outputs — este flujo no hace nada todavía.
          </p>
        )}

        {/* Execution history */}
        <div className="mt-4 border-t border-border/50 pt-3">
          <button
            onClick={onToggleHistory}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <History className="size-3.5" />
            Historial ({flowRuns.length})
            {historyOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>

          {historyOpen && (
            <div className="mt-2 space-y-1.5">
              {flowRuns.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Sin ejecuciones registradas aún.</p>
              ) : (
                flowRuns.map((run) => (
                  <div key={run.id} className="flex items-start gap-2 text-xs">
                    {run.status === "success" ? (
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
                    ) : (
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                    )}
                    <span className="text-muted-foreground">
                      {new Date(run.at).toLocaleString()} —{" "}
                    </span>
                    <span className={run.status === "error" ? "text-destructive" : ""}>
                      {run.detail}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

