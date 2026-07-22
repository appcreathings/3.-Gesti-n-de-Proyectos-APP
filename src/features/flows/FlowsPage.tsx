import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Zap,
  History,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Play,
  Activity,
  LayoutTemplate,
  Search,
  Tag,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useFlowStore } from "@/store/useFlowStore";
import { useDataStore } from "@/store/useDataStore";
import type { FlowRule } from "@/domain/schemas/flow";
import type { DomainEvent } from "@/automations/events";
import { buildGraphFromRule, graphFromPersisted } from "@/flows/graph";
import { duplicateFlow } from "@/flows/migration";
import { validateFlow, flowErrors, type FlowIssue } from "@/flows/validation";
import { FLOW_TEMPLATES, featuredTemplates, type FlowTemplate } from "@/flows/templates";
import { FlowPreviewCanvas } from "./canvas/FlowPreviewCanvas";
import { outputMeta, triggerSummary } from "./canvas/meta";
import { RunEventFlowDialog } from "./RunEventFlowDialog";
import { ROUTES } from "@/routes/paths";

type StatusFilter = "all" | "active" | "inactive" | "problems";

const REQUIRES_LABEL: Record<FlowTemplate["requires"][number], string> = {
  hubspot: "HubSpot",
  "google-sheets": "Google Sheets",
  email: "Email",
  "webhook-inbox": "Inbox Make/Zapier",
};

export function FlowsPage() {
  const navigate = useNavigate();
  const flows = useFlowStore((s) => s.flows);
  const runs = useFlowStore((s) => s.runs);
  const addFlow = useFlowStore((s) => s.addFlow);
  const updateFlow = useFlowStore((s) => s.updateFlow);
  const deleteFlow = useFlowStore((s) => s.deleteFlow);
  const runFlowNow = useDataStore((s) => s.runFlowNow);
  const projects = useDataStore((s) => s.projects);

  const [toDelete, setToDelete] = useState<FlowRule | undefined>();
  const [toRun, setToRun] = useState<FlowRule | undefined>();
  const [toRunEvent, setToRunEvent] = useState<FlowRule | undefined>();
  // Activar un flujo con errores exige ver la lista de problemas y
  // confirmar explícitamente (spec 027 §A).
  const [toActivate, setToActivate] = useState<FlowRule | undefined>();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [openHistoryIds, setOpenHistoryIds] = useState<Set<string>>(new Set());
  // Canvas por tarjeta solo al expandir (spec 027 §D) — con N flujos la
  // lista ya no monta N instancias de ReactFlow a la vez.
  const [openCanvasIds, setOpenCanvasIds] = useState<Set<string>>(new Set());
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // Organización a escala (spec 027 §D).
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Validación por flujo (spec 027 §A) — pura y barata, computada en render.
  const issuesByFlow = useMemo(() => {
    const map = new Map<string, FlowIssue[]>();
    for (const flow of flows) map.set(flow.id, validateFlow(flow, { projects }));
    return map;
  }, [flows, projects]);

  // Último run por flujo — alimenta el filtro "Con problemas".
  const lastRunStatusByFlow = useMemo(() => {
    const map = new Map<string, string>();
    for (const run of [...runs].sort((a, b) => (a.at < b.at ? -1 : 1))) {
      map.set(run.flowId, run.status);
    }
    return map;
  }, [runs]);

  const hasProblems = (flow: FlowRule): boolean => {
    const lastRun = lastRunStatusByFlow.get(flow.id);
    if (lastRun === "error" || lastRun === "partial") return true;
    return flowErrors(issuesByFlow.get(flow.id) ?? []).length > 0;
  };

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const flow of flows) for (const tag of flow.tags ?? []) tags.add(tag);
    return Array.from(tags).sort();
  }, [flows]);

  const visibleFlows = flows.filter((flow) => {
    if (search && !flow.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === "active" && !flow.enabled) return false;
    if (statusFilter === "inactive" && flow.enabled) return false;
    if (statusFilter === "problems" && !hasProblems(flow)) return false;
    if (tagFilter && !(flow.tags ?? []).includes(tagFilter)) return false;
    return true;
  });

  const handleToggle = async (flow: FlowRule) => {
    if (!flow.enabled && flowErrors(issuesByFlow.get(flow.id) ?? []).length > 0) {
      // Activar con errores: mostrar la lista de problemas antes (spec 027 §A).
      setToActivate(flow);
      return;
    }
    await updateFlow({ ...flow, enabled: !flow.enabled });
  };

  const handleEdit = (flow: FlowRule) => {
    navigate(ROUTES.flowEdit(flow.id));
  };

  const handleDuplicate = async (flow: FlowRule) => {
    const copy = duplicateFlow(flow);
    await addFlow(copy);
    navigate(ROUTES.flowEdit(copy.id));
  };

  const handleDelete = async () => {
    if (toDelete) {
      await deleteFlow(toDelete.id);
      setToDelete(undefined);
    }
  };

  const handleUseTemplate = async (template: FlowTemplate) => {
    // Siempre `enabled: false` — el banner de validación del builder guía
    // qué placeholders faltan completar (spec 027 §C).
    const flow = template.build();
    await addFlow(flow);
    setTemplatesOpen(false);
    navigate(ROUTES.flowEdit(flow.id));
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

  const toggleSetId = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const statusChips: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "active", label: "Activos" },
    { value: "inactive", label: "Inactivos" },
    { value: "problems", label: "Con problemas" },
  ];

  const toActivateErrors = toActivate ? flowErrors(issuesByFlow.get(toActivate.id) ?? []) : [];

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
              <Button variant="outline" onClick={() => setTemplatesOpen(true)}>
                <LayoutTemplate className="size-4" />
                Plantillas
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
            description="Crea flujos para automatizar tareas — o parte de una plantilla y ten tu primera automatización corriendo en minutos."
            action={
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-wrap justify-center gap-2">
                  {/* Spec 027 §C: 3 plantillas destacadas inline. */}
                  {featuredTemplates().map((t) => (
                    <Button
                      key={t.id}
                      variant="outline"
                      size="sm"
                      onClick={() => void handleUseTemplate(t)}
                      title={t.description}
                    >
                      <LayoutTemplate className="size-3.5" />
                      {t.name}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setTemplatesOpen(true)}>
                    Ver todas las plantillas
                  </Button>
                  <Button onClick={() => navigate(ROUTES.flowNew)}>
                    <Plus className="size-4" />
                    Nuevo flujo
                  </Button>
                </div>
              </div>
            }
          />
        ) : (
          <div className="space-y-4">
            {/* Spec 027 §D: buscador + filtros por estado + etiquetas. */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre..."
                  className="w-56 pl-8"
                />
              </div>
              <div className="flex gap-1">
                {statusChips.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setStatusFilter(chip.value)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      statusFilter === chip.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              {allTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <Tag className="size-3.5 text-muted-foreground" />
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTagFilter((cur) => (cur === tag ? null : tag))}
                      className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                        tagFilter === tag
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {visibleFlows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Ningún flujo coincide con la búsqueda o los filtros.
              </p>
            ) : (
              <div className="space-y-6">
                {visibleFlows.map((flow) => (
                  <FlowCard
                    key={flow.id}
                    flow={flow}
                    issues={issuesByFlow.get(flow.id) ?? []}
                    onEdit={() => handleEdit(flow)}
                    onDuplicate={() => void handleDuplicate(flow)}
                    onDelete={() => setToDelete(flow)}
                    onToggle={() => void handleToggle(flow)}
                    onTagClick={(tag) => setTagFilter((cur) => (cur === tag ? null : tag))}
                    onRun={
                      flow.trigger.type === "poll" ? () => setToRun(flow) : () => setToRunEvent(flow)
                    }
                    isRunning={runningId === flow.id}
                    historyOpen={openHistoryIds.has(flow.id)}
                    onToggleHistory={() => toggleSetId(setOpenHistoryIds, flow.id)}
                    canvasOpen={openCanvasIds.has(flow.id)}
                    onToggleCanvas={() => toggleSetId(setOpenCanvasIds, flow.id)}
                  />
                ))}
              </div>
            )}
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

        {/* Spec 027 §A: activar un flujo con errores exige confirmación
            explícita con la lista de problemas a la vista. */}
        <Dialog open={!!toActivate} onOpenChange={(o) => !o && setToActivate(undefined)}>
          <DialogContent className="md:max-w-lg sm:h-auto md:h-auto lg:h-auto">
            <DialogHeader>
              <DialogTitle>{`"${toActivate?.name}" tiene problemas de configuración`}</DialogTitle>
              <DialogDescription>
                Con estos problemas, el flujo fallará o no hará nada al ejecutarse. Puedes activarlo
                igualmente, o editarlo primero:
              </DialogDescription>
            </DialogHeader>
            <ul className="max-h-40 space-y-1 overflow-auto px-6 text-xs text-destructive">
              {toActivateErrors.map((e, i) => (
                <li key={i}>• {e.message}</li>
              ))}
            </ul>
            <DialogFooter>
              <Button variant="outline" onClick={() => setToActivate(undefined)}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const flow = toActivate!;
                  setToActivate(undefined);
                  handleEdit(flow);
                }}
              >
                Editar el flujo
              </Button>
              <Button
                onClick={() => {
                  const flow = toActivate!;
                  setToActivate(undefined);
                  void updateFlow({ ...flow, enabled: true });
                }}
              >
                Activar igualmente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Spec 027 §C: galería de plantillas. */}
        <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
          <DialogContent className="md:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Plantillas de flujos</DialogTitle>
              <DialogDescription>
                Parte de una automatización curada — se crea inactiva y el editor te señala
                exactamente qué falta completar (conexión, proyecto destino...).
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <div className="grid gap-3 sm:grid-cols-2">
                {FLOW_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className="flex flex-col gap-2 rounded-lg border border-border p-3"
                  >
                    <p className="text-sm font-medium">{template.name}</p>
                    <p className="flex-1 text-xs text-muted-foreground">{template.description}</p>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {template.category}
                      </Badge>
                      {template.requires.map((r) => (
                        <Badge key={r} variant="outline" className="text-[10px]">
                          Requiere {REQUIRES_LABEL[r]}
                        </Badge>
                      ))}
                    </div>
                    <Button size="sm" onClick={() => void handleUseTemplate(template)}>
                      Usar plantilla
                    </Button>
                  </div>
                ))}
              </div>
            </DialogBody>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

function FlowCard({
  flow,
  issues,
  onEdit,
  onDuplicate,
  onDelete,
  onToggle,
  onTagClick,
  onRun,
  isRunning,
  historyOpen,
  onToggleHistory,
  canvasOpen,
  onToggleCanvas,
}: {
  flow: FlowRule;
  issues: FlowIssue[];
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onTagClick: (tag: string) => void;
  /** Flujos de poll abren el `ConfirmDialog` genérico; flujos de evento abren
   * `RunEventFlowDialog` (necesitan elegir una entidad real primero) — ambos
   * casos los decide el padre, aquí es un solo botón. */
  onRun?: () => void;
  isRunning: boolean;
  historyOpen: boolean;
  onToggleHistory: () => void;
  canvasOpen: boolean;
  onToggleCanvas: () => void;
}) {
  const runs = useFlowStore((s) => s.runs);
  const flowRuns = runs.filter((r) => r.flowId === flow.id).slice(0, 5);
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.length - errorCount;

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
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant={flow.enabled ? "success" : "outline"} className="text-[10px]">
                {flow.enabled ? "Activo" : "Inactivo"}
              </Badge>
              {flow.runCount > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {flow.runCount} ejecuciones
                </Badge>
              )}
              {/* Spec 027 §A: badge de problemas — rojo con errores, ámbar
                  solo-warnings. */}
              {errorCount > 0 ? (
                <Badge variant="destructive" className="gap-1 text-[10px]">
                  <AlertCircle className="size-3" />
                  {errorCount + warningCount} problema{errorCount + warningCount !== 1 ? "s" : ""}
                </Badge>
              ) : warningCount > 0 ? (
                <Badge variant="outline" className="gap-1 border-warning text-[10px] text-warning">
                  <AlertTriangle className="size-3" />
                  {warningCount} aviso{warningCount !== 1 ? "s" : ""}
                </Badge>
              ) : null}
              {/* Spec 027 §D: etiquetas clicables — filtran la lista. */}
              {(flow.tags ?? []).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onTagClick(tag)}
                  className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-foreground"
                  title={`Filtrar por "${tag}"`}
                >
                  {tag}
                </button>
              ))}
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
          <Button variant="ghost" size="sm" onClick={onDuplicate} className="h-8 text-xs">
            Duplicar
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
        {/* Spec 027 §D: vista compacta por defecto — resumen textual del
            pipeline; el canvas (ReactFlow) se monta solo al expandir. */}
        <FlowPipelineSummary flow={flow} />
        <button
          onClick={onToggleCanvas}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {canvasOpen ? <ChevronUp className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          {canvasOpen ? "Ocultar diagrama" : "Ver diagrama"}
        </button>
        {canvasOpen && (
          <div className="mt-2">
            <FlowPreviewCanvas
              graph={flow.graph ? graphFromPersisted(flow.graph) : buildGraphFromRule(flow)}
            />
          </div>
        )}
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
                    ) : run.status === "partial" ? (
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                    ) : (
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                    )}
                    <span className="text-muted-foreground">
                      {new Date(run.at).toLocaleString()} —{" "}
                    </span>
                    <span
                      className={
                        run.status === "error"
                          ? "text-destructive"
                          : run.status === "partial"
                            ? "text-warning"
                            : ""
                      }
                    >
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

/** Resumen textual del pipeline (spec 027 §D): icono y label del trigger →
 * n.º de condiciones → iconos de las acciones (desde `meta.ts`). Reemplaza
 * al `FlowPreviewCanvas` como vista por defecto de la tarjeta. */
function FlowPipelineSummary({ flow }: { flow: FlowRule }) {
  const conditionCount = flow.logic.conditions.length;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1">
        <Zap className="size-3.5 text-primary" />
        {triggerSummary({ kind: "trigger", trigger: flow.trigger })}
      </span>
      {conditionCount > 0 && (
        <>
          <ChevronRight className="size-3 shrink-0" />
          <span className="rounded-md border border-border bg-muted/30 px-2 py-1">
            {conditionCount} condici{conditionCount === 1 ? "ón" : "ones"}
            {conditionCount > 1 && (flow.logic.conditionMode === "any" ? " (cualquiera)" : " (todas)")}
          </span>
        </>
      )}
      <ChevronRight className="size-3 shrink-0" />
      {flow.outputs.length === 0 ? (
        <span className="rounded-md border border-dashed border-border px-2 py-1 italic">
          sin acciones
        </span>
      ) : (
        flow.outputs.map((output, i) => {
          const meta = outputMeta(output.type);
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1"
              title={meta.label}
            >
              <meta.icon className={`size-3.5 ${meta.color}`} />
              {meta.label}
            </span>
          );
        })
      )}
    </div>
  );
}
