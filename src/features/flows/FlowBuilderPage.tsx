import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Zap, Play } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { FlowRule } from "@/domain/schemas/flow";
import type { FlowRunLog } from "@/store/useFlowStore";
import { createEmptyFlow } from "@/flows/migration";
import {
  buildGraphFromRule,
  compileGraphToRule,
  graphFromPersisted,
  type BuiltGraph,
} from "@/flows/graph";
import { FlowCanvas } from "./canvas/FlowCanvas";
import { DebuggerPanel } from "./canvas/DebuggerPanel";
import { RunEventFlowDialog } from "./RunEventFlowDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useDataStore } from "@/store/useDataStore";
import type { DomainEvent } from "@/automations/events";
import { useFlowStore } from "@/store/useFlowStore";
import { ROUTES } from "@/routes/paths";

export function FlowBuilderPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const addFlow = useFlowStore((s) => s.addFlow);
  const updateFlowInStore = useFlowStore((s) => s.updateFlow);
  const flows = useFlowStore((s) => s.flows);
  const flowsHydrated = useFlowStore((s) => s.hydrated);
  const isEditing = Boolean(id);

  const [flow, setFlow] = useState<FlowRule>(createEmptyFlow("Nuevo flujo"));
  const [graph, setGraph] = useState<BuiltGraph>(() => buildGraphFromRule(flow));
  // Distinto de `flow.id`: solo se fija una vez que el flow existente termina
  // de cargar desde el store (async). Se usa como `key` del canvas para
  // forzar un único remount con el grafo correcto en modo edición — el
  // canvas solo siembra su estado interno desde `initialGraph` en el primer
  // render, así que si el flow llega después del primer render (típico:
  // `useFlowStore` hidrata de forma asíncrona) el canvas debe re-montarse.
  const [loadedFlowId, setLoadedFlowId] = useState<string | null>(null);
  // Muestra persistida del flujo (spec 025 §A) — alimenta `initialSample`
  // del canvas para que al reabrir un flujo de HubSpot/Sheets sin re-probar
  // la conexión, los selectores de variables ya pueblen con campos reales.
  const [sample, setSample] = useState<Record<string, unknown>[] | undefined>(undefined);
  // Traza del último run real ("Ejecutar" en el editor) — el `DebuggerPanel`
  // la muestra como bloque verde, distinguible del dry-run (spec 025 §D).
  const [realRunLog, setRealRunLog] = useState<FlowRunLog | null>(null);
  // Diálogo de ejecución real (spec 025 §D).
  const [runDialogOpen, setRunDialogOpen] = useState(false);

  const runFlowNow = useDataStore((s) => s.runFlowNow);
  const flowRuns = useFlowStore((s) => s.runs);

  useEffect(() => {
    if (!id || loadedFlowId === id) return;
    const existing = flows.find((f) => f.id === id);
    if (!existing) return;
    setFlow(existing);
    setGraph(existing.graph ? graphFromPersisted(existing.graph) : buildGraphFromRule(existing));
    // Hidrata `sample` desde `lastSample` persistido — el canvas lo recibe
    // via `initialSample` (que es `useState initialValue`, así que toma
    // efecto en el próximo remount marcado por `loadedFlowId`).
    setSample(existing.lastSample);
    setLoadedFlowId(existing.id);
  }, [id, flows, loadedFlowId]);

  // Sincroniza `sample` cuando el usuario "Probar conexión" dentro del
  // canvas (vía `onSampleChange`). El estado local vive aquí para poder
  // persistirlo en `handleSave` sin tener que re-leer el canvas. Spec 025 §A.
  const handleSampleChange = (next: Record<string, unknown>[] | undefined) => {
    setSample(next);
    // También lo refresca en `flow.lastSample` para que `TriggerStep`'s
    // badge "Muestra: N reg · HH:mm" se actualice en vivo al probar.
    setFlow((prev) => ({
      ...prev,
      lastSample: next?.slice(0, 3),
      lastSampleAt: next && next.length > 0 ? new Date().toISOString() : undefined,
    }));
  };

  const handleSave = async () => {
    const compiled = compileGraphToRule(graph);
    if (!compiled.trigger) return;

    const finalFlow: FlowRule = {
      ...flow,
      trigger: compiled.trigger,
      logic: {
        conditions: compiled.conditions,
        mapping: compiled.mapping,
        transformCode: compiled.transformCode,
      },
      outputs: compiled.outputs,
      graph: graph as unknown as FlowRule["graph"],
      // Spec 025 §A: persiste la muestra (cap 3) para que al reabrir el
      // editor o duplicar+activar el flujo, los selectores de variables
      // sigan poblados sin tener que re-probar la conexión. El
      // `lastSampleAt`保鲜 freshness诊断 via el badge del `TriggerStep`.
      lastSample: sample?.slice(0, 3),
      lastSampleAt: sample && sample.length > 0 ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    if (isEditing) {
      await updateFlowInStore(finalFlow);
    } else {
      await addFlow(finalFlow);
    }
    navigate(ROUTES.flows);
  };

  // Spec 025 §D — handlers para "Ejecutar" desde el editor. Reusan
  // `useDataStore.runFlowNow` (mismo camino que `FlowsPage`): la corrida
  // es real (crea tareas, envía emails) y queda en el historial global.
  const isDirty = (() => {
    // Si nunca se guardó, no hay "último guardado" para comparar — pero
    // el botón Ejecutar está deshabilitado para flujos no guardados, así
    // que este caso no llega a `handleRunConfirm`.
    if (!isEditing) return false;
    // Comparación ligera: si el flow.guardado en el store difiere del
    // flow estado del builder, hay cambios pendientes. No es perfecto
    // (orden de keys, etc.) pero suficiente para avisar.
    const saved = flows.find((f) => f.id === id);
    if (!saved) return false;
    return JSON.stringify({
      ...flow,
      updatedAt: undefined,
    }) !== JSON.stringify({ ...saved, updatedAt: undefined });
  })();

  const openRunDialog = () => {
    if (!isEditing) return;
    setRunDialogOpen(true);
  };

  const handleRunConfirm = async () => {
    if (!id) return;
    setRunDialogOpen(false);
    try {
      await runFlowNow(id);
      // Cargar el último run log para este flujo desde el store.
      const lastRun = flowRuns
        .filter((r) => r.flowId === id)
        .sort((a, b) => (a.at < b.at ? 1 : -1))[0];
      if (lastRun) setRealRunLog(lastRun);
    } catch {
      // El error ya quedó en el historial — el `DebuggerPanel` muestra
      // el último run disponible abajo.
      const lastRun = flowRuns
        .filter((r) => r.flowId === id)
        .sort((a, b) => (a.at < b.at ? 1 : -1))[0];
      if (lastRun) setRealRunLog(lastRun);
    }
  };

  const handleRunEventFlow = async (syntheticEvent: DomainEvent) => {
    if (!id) return;
    try {
      await runFlowNow(id, { syntheticEvent });
      const lastRun = flowRuns
        .filter((r) => r.flowId === id)
        .sort((a, b) => (a.at < b.at ? 1 : -1))[0];
      if (lastRun) setRealRunLog(lastRun);
    } catch {
      const lastRun = flowRuns
        .filter((r) => r.flowId === id)
        .sort((a, b) => (a.at < b.at ? 1 : -1))[0];
      if (lastRun) setRealRunLog(lastRun);
    }
  };

  const triggerIsEvent = flow.trigger.type === "event";

  if (isEditing && flowsHydrated && !flows.some((f) => f.id === id)) {
    return (
      <EmptyState
        icon={ArrowLeft}
        title="Flujo no encontrado"
        description="Puede que haya sido eliminado."
        action={<Button onClick={() => navigate(ROUTES.flows)}>Volver a flujos</Button>}
      />
    );
  }

  return (
    <>
      <Helmet>
        <title>{isEditing ? "Editar Flujo" : "Nuevo Flujo"} | Hito</title>
        <meta name="description" content="Construye un flujo automatizado arrastrando nodos: trigger, condiciones, transformación y acciones." />
      </Helmet>

      <div>
        <PageHeader
          label="Flujos"
          title={isEditing ? "Editar Flujo" : "Nuevo Flujo"}
          description="Arrastra los nodos para reordenarlos visualmente; el pipeline de ejecución (trigger → condiciones → transformación → acciones) es fijo — no se conectan aristas a mano."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate(ROUTES.flows)}>
                Cancelar
              </Button>
              {/* Spec 025 §D: Ejecutar desde el editor. Deshabilitado si el
                flujo aún no está guardado — `runFlowNow` opera por id
                persistido, así que necesita un flow guardado primero. */}
              <Button
                variant="outline"
                onClick={openRunDialog}
                disabled={!isEditing}
                title={isEditing ? undefined : "Guarda el flujo primero para poder ejecutarlo"}
              >
                <Play className="size-4" />
                Ejecutar
              </Button>
              <Button onClick={handleSave}>
                <Zap className="size-4" />
                {isEditing ? "Guardar Cambios" : "Guardar Flujo"}
              </Button>
            </div>
          }
        />

        <div className="mb-4 max-w-md space-y-3">
          <Input
            value={flow.name}
            onChange={(e) => setFlow((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Nombre del flujo"
            className="text-base font-medium"
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={flow.notifyOnFailure}
              onCheckedChange={(v) => setFlow((prev) => ({ ...prev, notifyOnFailure: v }))}
              aria-label="Notificarme si este flujo falla"
            />
            Notificarme si este flujo falla
          </label>
        </div>

        {/* Spec 025 §C/§D: layout 2 columnas — canvas + DebuggerPanel.
            En móvil el panel apila debajo del canvas y se mantiene
            funcional (su altura es flexible). */}
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <FlowCanvas
            key={loadedFlowId ?? "new"}
            initialGraph={graph}
            onGraphChange={setGraph}
            initialSample={sample}
            onSampleChange={handleSampleChange}
          />
          <div className="h-[calc(100vh-260px)] min-h-[480px]">
            <DebuggerPanel
              flow={flow}
              realRunResult={realRunLog}
              onClearRealRun={() => setRealRunLog(null)}
            />
          </div>
        </div>

        {/* Spec 025 §D — diálogos de ejecución real. Si el flujo está dirty
            (cambios sin guardar), el ConfirmDialog avisa antes de correr la
            versión guardada. Para poll abre el ConfirmDialog genérico; para
            event abre RunEventFlowDialog. */}
        {triggerIsEvent ? (
          <RunEventFlowDialog
            open={runDialogOpen}
            onOpenChange={setRunDialogOpen}
            flow={flow}
            onRun={handleRunEventFlow}
          />
        ) : (
          <ConfirmDialog
            open={runDialogOpen}
            onOpenChange={setRunDialogOpen}
            title={`¿Ejecutar "${flow.name}" ahora?`}
            description={
              isDirty
                ? "Tienes cambios sin guardar. Se ejecutará la versión guardada, no la que ves en pantalla. Esto trae datos reales de la conexión y aplica las acciones configuradas de verdad — puede crear tareas o proyectos, y enviar emails o webhooks. No es una simulación."
                : "Esto trae datos reales de la conexión y aplica las acciones configuradas de verdad — puede crear tareas o proyectos, y enviar emails o webhooks. No es una simulación."
            }
            confirmLabel="Ejecutar ahora"
            confirmVariant="default"
            onConfirm={handleRunConfirm}
          />
        )}
      </div>
    </>
  );
}
