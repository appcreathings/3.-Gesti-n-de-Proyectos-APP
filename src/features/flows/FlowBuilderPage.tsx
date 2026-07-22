import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useBlocker, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Zap, Play } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FlowRule } from "@/domain/schemas/flow";
import type { FlowRunLog } from "@/store/useFlowStore";
import { createEmptyFlow } from "@/flows/migration";
import {
  buildGraphFromRule,
  compileGraphToRule,
  graphFromPersisted,
  type BuiltGraph,
} from "@/flows/graph";
import { validateFlow, flowErrors, type FlowIssue } from "@/flows/validation";
import { projectTrace } from "@/flows/trace-projection";
import type { FlowRunTrace } from "@/flows/engine";
import { FlowCanvas } from "./canvas/FlowCanvas";
import { DebuggerPanel } from "./canvas/DebuggerPanel";
import { RunEventFlowDialog } from "./RunEventFlowDialog";
import { FlowIssuesBanner } from "./FlowIssuesBanner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useDataStore } from "@/store/useDataStore";
import type { DomainEvent } from "@/automations/events";
import { useFlowStore } from "@/store/useFlowStore";
import { ROUTES } from "@/routes/paths";

/** Proyección estable de un flujo para detectar cambios sin guardar (spec
 * 027 §B): compara lo que realmente se perdería al descartar — el flujo
 * COMPILADO desde el grafo (trigger/condiciones/mapeo/outputs) más los
 * metadatos editables — e ignora lo efímero (`updatedAt`, `lastSample`,
 * posiciones de nodos del canvas). Sensible al orden de claves del
 * `JSON.stringify` — aceptable: un falso positivo es un diálogo de más,
 * nunca pérdida de datos. */
function comparableFlow(f: FlowRule): string {
  return JSON.stringify({
    name: f.name,
    enabled: f.enabled,
    notifyOnFailure: f.notifyOnFailure,
    onErrorPolicy: f.onErrorPolicy ?? "continue",
    tags: f.tags ?? [],
    trigger: f.trigger,
    logic: {
      conditions: f.logic.conditions,
      mapping: f.logic.mapping,
      transformCode: f.logic.transformCode,
      conditionMode: f.logic.conditionMode ?? "all",
    },
    outputs: f.outputs,
  });
}

export function FlowBuilderPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const addFlow = useFlowStore((s) => s.addFlow);
  const updateFlowInStore = useFlowStore((s) => s.updateFlow);
  const flows = useFlowStore((s) => s.flows);
  const flowsHydrated = useFlowStore((s) => s.hydrated);
  const projects = useDataStore((s) => s.projects);
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
  // Simulación (spec 038 §D3): la traza del dry-run deja de ser estado privado
  // del `DebuggerPanel` y sube aquí, porque el canvas —su hermano— también la
  // necesita para pintarla sobre los nodos. `atSignature` es el flujo
  // comparable capturado AL SIMULAR: si deja de coincidir con el actual, la
  // proyección se marca desactualizada en vez de mentir (CA-04.7).
  const [simulation, setSimulation] = useState<{
    trace: FlowRunTrace;
    atSignature: string;
  } | null>(null);
  const [simRecordIndex, setSimRecordIndex] = useState(0);
  // "Limpiar" apaga la proyección del canvas SIN tirar la traza: el
  // `DebuggerPanel` sigue mostrando su vista textual igual que hoy (CA-04.8).
  const [projectionHidden, setProjectionHidden] = useState(false);
  // Spec 039 §A2 (HU-02): plegado del depurador. Vive aquí porque quien define
  // la rejilla es esta página, no el panel. Es de sesión — no se persiste ni
  // toca el schema (CA-02.4).
  const [debuggerCollapsed, setDebuggerCollapsed] = useState(false);
  // Diálogo de guardado con errores (spec 027 §A): guarda el flujo compilado
  // pendiente y si el guardado era in-place (Ctrl+S) o guardar-y-salir.
  const [saveDialog, setSaveDialog] = useState<{ finalFlow: FlowRule; stay: boolean } | null>(null);
  // Petición de abrir el drawer de un nodo desde el banner de issues.
  const [openNodeRequest, setOpenNodeRequest] = useState<{ nodeId: string; nonce: number } | null>(
    null,
  );
  // El guardado navega a propósito — el blocker de navegación no debe
  // interceptar esa navegación aunque `isDirty` no haya alcanzado a
  // recomputarse con el store ya actualizado.
  const skipBlockerRef = useRef(false);

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

  // ── Estado derivado del grafo: flujo compilado + validación (spec 027 §A) ─
  const compiled = compileGraphToRule(graph);
  const currentFlow: FlowRule = {
    ...flow,
    trigger: compiled.trigger ?? flow.trigger,
    logic: {
      conditions: compiled.conditions,
      mapping: compiled.mapping,
      transformCode: compiled.transformCode,
      conditionMode: flow.logic.conditionMode,
    },
    outputs: compiled.outputs,
  };
  const issues = validateFlow(currentFlow, { projects });
  const errors = flowErrors(issues);
  const signature = comparableFlow(currentFlow);

  // ── Proyección de la simulación sobre los nodos (spec 038 §D) ────────────
  // El registro visible se recorta al rango real de la traza: cambiar de flujo
  // o simular otra vez con menos registros no puede dejar el índice colgando.
  const simRecords = simulation?.trace.records ?? [];
  const safeRecordIndex = Math.min(simRecordIndex, Math.max(simRecords.length - 1, 0));
  const runProjection =
    simulation && !projectionHidden && simRecords[safeRecordIndex]
      ? {
          projection: projectTrace(graph.nodes, simRecords[safeRecordIndex]),
          recordIndex: safeRecordIndex,
          recordCount: simRecords.length,
          // El grafo cambió desde que se simuló: la proyección sigue visible
          // (el usuario puede estar leyéndola) pero avisa que ya no describe
          // lo que hay en pantalla.
          stale: simulation.atSignature !== signature,
        }
      : null;

  const handleDryRunResult = (trace: FlowRunTrace | null) => {
    setSimRecordIndex(0);
    setProjectionHidden(false);
    setSimulation(trace ? { trace, atSignature: signature } : null);
  };

  // ── Dirty (spec 027 §B): compara el flujo COMPILADO contra el guardado —
  // el `isDirty` previo comparaba solo `flow` y no veía el grafo editado
  // sin compilar. Para flujos nuevos, el baseline es el estado inicial del
  // builder (capturado una sola vez en el primer render).
  const initialComparableRef = useRef<string | null>(null);
  if (initialComparableRef.current === null) {
    initialComparableRef.current = comparableFlow(currentFlow);
  }
  const savedFlow = isEditing ? flows.find((f) => f.id === id) : undefined;
  const baseline = isEditing
    ? savedFlow
      ? comparableFlow(savedFlow)
      : null
    : initialComparableRef.current;
  const isDirty = baseline !== null && signature !== baseline;

  // ── Guard de navegación (spec 027 §B): cualquier navegación interna con
  // cambios sin guardar pide confirmación; `beforeunload` cubre el cierre o
  // recarga de la pestaña. El botón Cancelar simplemente navega — este
  // blocker es el único punto de decisión.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !skipBlockerRef.current && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const persistFlow = async (finalFlow: FlowRule, stay: boolean) => {
    if (isEditing) {
      await updateFlowInStore(finalFlow);
    } else {
      await addFlow(finalFlow);
    }
    if (stay) {
      setFlow(finalFlow);
      if (!isEditing) {
        // Guardado in-place de un flujo nuevo (Ctrl+S): pasa a modo edición
        // sin salir del editor — `runFlowNow`/"Ejecutar" opera por id
        // persistido y ahora ya existe.
        skipBlockerRef.current = true;
        navigate(ROUTES.flowEdit(finalFlow.id), { replace: true });
        skipBlockerRef.current = false;
      }
    } else {
      skipBlockerRef.current = true;
      navigate(ROUTES.flows);
    }
  };

  /** Guardar (spec 027 §A/§B). `stay: true` = guardar sin salir (Ctrl+S);
   * `false` = guardar y volver a la lista (botón, hábito existente).
   * Guardar SIEMPRE se permite — lo que se protege es la activación: con
   * errores y `enabled`, el diálogo ofrece "Guardar como inactivo" (default)
   * o "Guardar activo igualmente". Warnings solos no bloquean nada. */
  const handleSave = async (stay = false) => {
    if (!compiled.trigger) return;

    const finalFlow: FlowRule = {
      ...currentFlow,
      graph: graph as unknown as FlowRule["graph"],
      // Spec 025 §A: persiste la muestra (cap 3) para que al reabrir el
      // editor o duplicar+activar el flujo, los selectores de variables
      // sigan poblados sin tener que re-probar la conexión.
      lastSample: sample?.slice(0, 3),
      lastSampleAt: sample && sample.length > 0 ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    if (errors.length > 0 && finalFlow.enabled) {
      setSaveDialog({ finalFlow, stay });
      return;
    }
    await persistFlow(finalFlow, stay);
  };

  // Ctrl/Cmd+S guarda sin salir (spec 027 §B). El ref evita re-suscribir el
  // listener en cada render manteniendo siempre el handler más reciente.
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSaveRef.current(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /** Clic en un issue del banner → abre el drawer del nodo referido (spec
   * 027 §A). El índice del issue es relativo a su tipo, en el mismo orden
   * en que `compileGraphToRule` recorre los nodos del grafo. */
  const handleIssueClick = (issue: FlowIssue) => {
    let nodeId: string | undefined;
    switch (issue.nodeKind) {
      case "trigger":
        nodeId = graph.nodes.find((n) => n.data.kind === "trigger")?.id;
        break;
      case "transform":
        nodeId = graph.nodes.find((n) => n.data.kind === "transform")?.id;
        break;
      case "condition":
        nodeId = graph.nodes.filter((n) => n.data.kind === "condition")[issue.outputIndex ?? 0]?.id;
        break;
      case "action":
        nodeId = graph.nodes.filter((n) => n.data.kind === "action")[issue.outputIndex ?? 0]?.id;
        break;
      case "flow":
        nodeId = undefined;
        break;
    }
    if (nodeId) setOpenNodeRequest({ nodeId, nonce: Date.now() });
  };

  // Spec 025 §D — handlers para "Ejecutar" desde el editor. Reusan
  // `useDataStore.runFlowNow` (mismo camino que `FlowsPage`): la corrida
  // es real (crea tareas, envía emails) y queda en el historial global.
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
              {/* Spec 027 §B: el botón guarda y sale (hábito existente);
                  Ctrl/Cmd+S guarda sin salir. En edición, deshabilitado sin
                  cambios pendientes. */}
              <Button
                onClick={() => void handleSave(false)}
                disabled={isEditing && !isDirty}
                title="Ctrl+S guarda sin salir del editor"
              >
                <Zap className="size-4" />
                {isEditing ? (isDirty ? "Guardar Cambios" : "Sin cambios") : "Guardar Flujo"}
              </Button>
            </div>
          }
        />

        <div className="mb-4 max-w-xl space-y-3">
          <Input
            value={flow.name}
            onChange={(e) => setFlow((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Nombre del flujo"
            className="text-base font-medium"
          />
          {/* Spec 027 §D: etiquetas para organizar la lista, junto al nombre. */}
          <Input
            value={(flow.tags ?? []).join(", ")}
            onChange={(e) =>
              setFlow((prev) => ({
                ...prev,
                tags: e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              }))
            }
            placeholder="Etiquetas (separadas por comas): ventas, onboarding"
            className="text-sm"
          />
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={flow.notifyOnFailure}
                onCheckedChange={(v) => setFlow((prev) => ({ ...prev, notifyOnFailure: v }))}
                aria-label="Notificarme si este flujo falla"
              />
              Notificarme si este flujo falla
            </label>
            {/* Spec 027 §E: política de fallo por flujo. */}
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Si una acción falla:
              <Select
                value={flow.onErrorPolicy ?? "continue"}
                onChange={(e) =>
                  setFlow((prev) => ({
                    ...prev,
                    onErrorPolicy: e.target.value as FlowRule["onErrorPolicy"],
                  }))
                }
                size="sm"
                className="w-auto"
              >
                <option value="continue">continuar con las demás</option>
                <option value="stop">detener el flujo</option>
              </Select>
            </label>
          </div>
          {/* Spec 038 CA-02.9: el historial del canvas cubre el grafo, no
              estos campos — decirlo donde están, no en una ayuda escondida. */}
          <p className="text-[11px] text-muted-foreground">
            El deshacer del canvas (Ctrl+Z) cubre los nodos del flujo; estos campos —nombre,
            etiquetas y política de fallo— se revierten a mano.
          </p>
        </div>

        {/* Spec 027 §A: banner de problemas de configuración — clicable,
            abre el drawer del nodo correspondiente. */}
        <FlowIssuesBanner issues={issues} onIssueClick={handleIssueClick} />

        {/* Spec 025 §C/§D: layout 2 columnas — canvas + DebuggerPanel.
            En móvil el panel apila debajo del canvas y se mantiene
            funcional (su altura es flexible). */}
        {/* Spec 039 §A2: plegado el depurador, su columna pasa a `auto` (solo
            la pestaña) y el canvas se queda con el ancho liberado (CA-02.2).
            NO se dispara `fitView`: los nodos no se mueven, aparece espacio, y
            re-encuadrar movería el viewport que el usuario acaba de ajustar
            (R5). "Ajustar a pantalla" sigue a un clic. */}
        <div
          className={
            debuggerCollapsed
              ? "grid gap-4 lg:grid-cols-[1fr_auto]"
              : "grid gap-4 lg:grid-cols-[2fr_1fr]"
          }
        >
          <FlowCanvas
            key={loadedFlowId ?? "new"}
            initialGraph={graph}
            onGraphChange={setGraph}
            initialSample={sample}
            onSampleChange={handleSampleChange}
            openNodeRequest={openNodeRequest}
            // Spec 038 §A3: el canvas no recalcula la validez de un nodo — se
            // le pasan los issues que este página ya computa con `validateFlow`
            // (el canvas no conoce `projects`, y no debería).
            issues={issues}
            // Spec 038 §D3: la proyección de la simulación llega ya calculada
            // (`projectTrace`) — el canvas la pinta, no la deriva.
            runProjection={runProjection}
            onSelectRunRecord={setSimRecordIndex}
            onClearRunProjection={() => setProjectionHidden(true)}
            conditionMode={flow.logic.conditionMode ?? "all"}
            onConditionModeChange={(mode) =>
              setFlow((prev) => ({ ...prev, logic: { ...prev.logic, conditionMode: mode } }))
            }
          />
          <div
            className={
              debuggerCollapsed ? "" : "h-[calc(100vh-260px)] min-h-[480px]"
            }
          >
            <DebuggerPanel
              flow={currentFlow}
              realRunResult={realRunLog}
              onClearRealRun={() => setRealRunLog(null)}
              dryTrace={simulation?.trace ?? null}
              onDryRunResult={handleDryRunResult}
              collapsed={debuggerCollapsed}
              onToggleCollapsed={() => setDebuggerCollapsed((c) => !c)}
            />
          </div>
        </div>

        {/* Spec 027 §A: guardado con errores — el trabajo del usuario nunca
            se pierde por validación; lo que se protege es la ACTIVACIÓN. */}
        <Dialog open={saveDialog !== null} onOpenChange={(o) => !o && setSaveDialog(null)}>
          <DialogContent className="md:max-w-lg sm:h-auto md:h-auto lg:h-auto">
            <DialogHeader>
              <DialogTitle>
                Este flujo tiene {errors.length} problema{errors.length !== 1 ? "s" : ""} y no puede
                ejecutarse correctamente
              </DialogTitle>
              <DialogDescription>
                Puedes guardarlo igualmente. Guardarlo inactivo evita que corra roto (no registra
                polling ni reacciona a eventos) hasta que completes lo que falta:
              </DialogDescription>
            </DialogHeader>
            <ul className="max-h-40 space-y-1 overflow-auto px-6 text-xs text-destructive">
              {errors.map((e, i) => (
                <li key={i}>• {e.message}</li>
              ))}
            </ul>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveDialog(null)}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const pending = saveDialog!;
                  setSaveDialog(null);
                  void persistFlow(pending.finalFlow, pending.stay);
                }}
              >
                Guardar activo igualmente
              </Button>
              <Button
                onClick={() => {
                  const pending = saveDialog!;
                  setSaveDialog(null);
                  void persistFlow({ ...pending.finalFlow, enabled: false }, pending.stay);
                }}
              >
                Guardar como inactivo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Spec 027 §B: confirmación al navegar con cambios sin guardar —
            cubre Cancelar y cualquier navegación interna. */}
        <ConfirmDialog
          open={blocker.state === "blocked"}
          onOpenChange={(o) => {
            if (!o && blocker.state === "blocked") blocker.reset?.();
          }}
          title="¿Descartar los cambios sin guardar?"
          description="Tienes cambios sin guardar en este flujo. Si sales ahora, se perderán."
          confirmLabel="Descartar y salir"
          onConfirm={() => blocker.proceed?.()}
        />

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
