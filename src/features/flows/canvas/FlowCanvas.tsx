import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Output } from "@/domain/schemas/flow";
import {
  relinkEdges,
  newConditionNode,
  newActionNode,
  type BuiltGraph,
  type FlowGraphNode,
  type FlowNodeData,
  type FlowNodeKind,
  type TriggerNodeData,
} from "@/flows/graph";
import { nodeTypes, FlowCanvasActions, type CanvasNode } from "./nodeTypes";
import { OUTPUT_TYPES, defaultOutputForType } from "./meta";
import { TriggerNodeDrawer } from "./TriggerNodeDrawer";
import { ConditionConfigFields } from "./ConditionConfigFields";
import { TransformConfigFields } from "./TransformConfigFields";
import { ActionConfigFields } from "./ActionConfigFields";

interface Props {
  initialGraph: BuiltGraph;
  onGraphChange: (graph: BuiltGraph) => void;
  /** Muestra inicial para poblar los selectores de variables al abrir
   * el editor sin tener que re-probar la conexión (spec 025 §A). Proviene
   * de `FlowRule.lastSample` — el builder la hidrata al cargar el flow.
   * Si el usuario prueba la conexión de nuevo, ese cambio sube vía
   * `onSampleChange` al padre, que lo persiste en `handleSave`. */
  initialSample?: Record<string, unknown>[];
  /** Callback al padre para que persista la muestra cuando "Probar
   * conexión" trae registros frescos (spec 025 §A) o cuando se limpia
   * (prueba fallida / conexión cambiada desde TriggerStep). */
  onSampleChange?: (sample: Record<string, unknown>[] | undefined) => void;
  /** Petición externa de abrir el drawer de un nodo (spec 027 §A: clic en
   * un issue del banner del builder). El `nonce` distingue dos clics
   * consecutivos sobre el mismo issue — sin él, reabrir el mismo nodo tras
   * cerrarlo no dispararía el efecto. */
  openNodeRequest?: { nodeId: string; nonce: number } | null;
  /** Modo de combinación de condiciones (spec 027 §F) — vive en
   * `flow.logic.conditionMode` del builder, no en el grafo; el selector
   * solo se muestra con ≥ 2 nodos de condición. */
  conditionMode?: "all" | "any";
  onConditionModeChange?: (mode: "all" | "any") => void;
}

function toPlainNodes(nodes: CanvasNode[]): FlowGraphNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type as FlowGraphNode["type"],
    position: n.position,
    data: n.data,
  }));
}

function CanvasInner({
  initialGraph,
  onGraphChange,
  initialSample,
  onSampleChange,
  openNodeRequest,
  conditionMode,
  onConditionModeChange,
}: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(
    initialGraph.nodes as CanvasNode[],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Muestra real de la última "Probar conexión" exitosa del nodo trigger.
  // Antes efímera (spec 022 §A); ahora se hidrata desde `initialSample`
  // (que viene de `FlowRule.lastSample` persistido — spec 025 §A) y los
  // cambios se propagan al padre vía `onSampleChange` para que el builder
  // los guarde. Las condiciones y transformaciones consumen esta misma
  // muestra para sincronizar `availableVariables` reactivamente
  // (spec 025 §B/E).
  //
  // REVALIDACIÓN REACTIVA (spec 025 §E1): no se requiere cableado extra.
  // Cuando "Probar conexión" en `TriggerStep` llama `onSampleChange`,
  // `updateTriggerSample` actualiza este estado y notifica al padre
  // (builder). El builder persiste y propaga de vuelta via
  // `initialSample` — el re-render del `FlowCanvas` re-renderiza los
  // drawer abiertos (que reciben `sample` como prop y recalculan
  // `availableVariables` en su render, disparando `validateVariables`
  // y `VariableValidationHint` con los nuevos tokens huérfanos). El
  // patrón es React puro (props flow), sin efecto extra.
  const [triggerSample, setTriggerSample] = useState<Record<string, unknown>[] | undefined>(
    initialSample,
  );

  // Qué registro de `triggerSample` alimenta las vistas previas en vivo de
  // todo el canvas (`InterpolationPreview` dentro de cada `InterpolableField`
  // — spec 026 §D3). Vive aquí (no en `SampleExplorer`) porque debe llegar
  // también a los drawer de acción, no solo al trigger.
  const [previewRecordIndex, setPreviewRecordIndex] = useState(0);

  // Sincroniza el estado local si el padre cambia la muestra inicial
  // (típico: el flow existente hidrata después del primer render — ver
  // `loadedFlowId` en `FlowBuilderPage` que remonta el canvas entero).
  useEffect(() => {
    if (initialSample !== undefined) setTriggerSample(initialSample);
  }, [initialSample]);

  // Abre el drawer del nodo pedido desde afuera (clic en un issue del
  // banner de validación — spec 027 §A). El nonce en la dependencia hace
  // que el mismo nodo pueda reabrirse en clics sucesivos.
  useEffect(() => {
    if (openNodeRequest) setSelectedId(openNodeRequest.nodeId);
  }, [openNodeRequest]);

  // Wrapper que actualiza el estado local Y notifica al padre — así el
  // builder can persistir `lastSample` en `handleSave`. Se usa donde antes
  // se llamaba `setTriggerSample` directo. Spec 025 §A.
  const updateTriggerSample = useCallback(
    (next: Record<string, unknown>[] | undefined) => {
      setTriggerSample(next);
      onSampleChange?.(next);
    },
    [onSampleChange],
  );

  // Las aristas son puramente derivadas (trigger -> condiciones -> transform
  // -> acciones): el usuario no las conecta a mano, así que no hace falta
  // `useEdgesState`/`onEdgesChange` — solo recalcularlas cuando cambian los
  // nodos (agregar/quitar condition o action).
  const edges = useMemo(() => relinkEdges(toPlainNodes(nodes)), [nodes]);

  useEffect(() => {
    onGraphChange({ nodes: toPlainNodes(nodes), edges });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  const updateNodeData = useCallback(
    (id: string, data: FlowNodeData) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data } : n)));
    },
    [setNodes],
  );

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [setNodes],
  );

  const addCondition = useCallback(() => {
    setNodes((nds) => {
      const plain = toPlainNodes(nds);
      const node = newConditionNode(plain);
      return [...nds, node as CanvasNode];
    });
  }, [setNodes]);

  const addAction = useCallback(
    (type: Output["type"]) => {
      setNodes((nds) => {
        const plain = toPlainNodes(nds);
        const node = newActionNode(plain, defaultOutputForType(type));
        return [...nds, node as CanvasNode];
      });
    },
    [setNodes],
  );

  const actionsContextValue = useMemo(() => ({ deleteNode }), [deleteNode]);

  const conditionCount = nodes.filter((n) => n.data.kind === "condition").length;
  const selectedNode = nodes.find((n) => n.id === selectedId);
  const triggerData = nodes.find((n) => n.data.kind === "trigger")?.data as
    | TriggerNodeData
    | undefined;

  return (
    <FlowCanvasActions.Provider value={actionsContextValue}>
      <div className="relative h-[calc(100vh-260px)] min-h-[480px] rounded-lg border border-border bg-muted/20">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          nodeTypes={nodeTypes}
          nodesConnectable={false}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>

        <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
          <Button size="sm" variant="outline" onClick={addCondition} className="bg-background shadow-sm">
            <Plus className="size-4" />
            Condición
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="bg-background shadow-sm">
                <Plus className="size-4" />
                Acción
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {OUTPUT_TYPES.map((o) => (
                <DropdownMenuItem key={o.type} onClick={() => addAction(o.type)}>
                  <o.icon className={`size-4 ${o.color}`} />
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Spec 027 §F: selector del modo de condiciones — solo visible
              con ≥ 2 condiciones (con una sola no hay nada que combinar). */}
          {conditionCount >= 2 && onConditionModeChange && (
            <div className="rounded-md border border-border bg-background p-2 shadow-sm">
              <label className="mb-1 block text-[10px] font-medium text-muted-foreground">
                Se deben cumplir:
              </label>
              <Select
                value={conditionMode ?? "all"}
                onChange={(e) => onConditionModeChange(e.target.value as "all" | "any")}
                className="h-8 text-xs"
              >
                <option value="all">Todas las condiciones</option>
                <option value="any">Alcanza con una</option>
              </Select>
            </div>
          )}
        </div>
      </div>

      <Dialog open={selectedNode !== undefined} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedNode && drawerTitle(selectedNode.data.kind)}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {selectedNode &&
              (() => {
                const node = selectedNode;
                switch (node.data.kind) {
                  case "trigger": {
                    const data = node.data;
                    return (
                      <TriggerNodeDrawer
                        trigger={data.trigger}
                        onChange={(trigger) => updateNodeData(node.id, { kind: "trigger", trigger })}
                        onSampleChange={updateTriggerSample}
                        sample={triggerSample}
                        previewRecordIndex={previewRecordIndex}
                        onPreviewRecordIndexChange={setPreviewRecordIndex}
                      />
                    );
                  }
                  case "condition": {
                    const data = node.data;
                    return (
                      <ConditionConfigFields
                        condition={data.condition}
                        trigger={triggerData?.trigger ?? { type: "event", event: "task.statusChanged" }}
                        sample={triggerSample}
                        onChange={(updates) =>
                          updateNodeData(node.id, {
                            kind: "condition",
                            condition: { ...data.condition, ...updates },
                          })
                        }
                      />
                    );
                  }
                  case "transform": {
                    const data = node.data;
                    return (
                      <TransformConfigFields
                        mapping={data.mapping}
                        transformCode={data.transformCode}
                        trigger={triggerData?.trigger ?? { type: "event", event: "task.statusChanged" }}
                        sample={triggerSample}
                        onChange={(updates) =>
                          updateNodeData(node.id, {
                            kind: "transform",
                            mapping: updates.mapping ?? data.mapping,
                            transformCode: updates.transformCode ?? data.transformCode,
                          })
                        }
                      />
                    );
                  }
                  case "action": {
                    const data = node.data;
                    return (
                      <ActionConfigFields
                        // `key={node.id}` fuerza una instancia nueva de React al
                        // cambiar de nodo — necesario porque el componente
                        // mantiene estado local propio (filas de `createPerson.data`/
                        // `webhook.payload`, spec 026 §C3) que no debe filtrarse
                        // de un nodo a otro al reabrir un action distinto.
                        key={node.id}
                        output={data.output}
                        trigger={triggerData?.trigger ?? { type: "event", event: "task.statusChanged" }}
                        sample={triggerSample}
                        previewRecordIndex={previewRecordIndex}
                        onChange={(updates) =>
                          updateNodeData(node.id, {
                            kind: "action",
                            output: { ...data.output, ...updates } as Output,
                          })
                        }
                      />
                    );
                  }
                }
              })()}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedId(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FlowCanvasActions.Provider>
  );
}

export function FlowCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <CanvasInner
        initialGraph={props.initialGraph}
        onGraphChange={props.onGraphChange}
        initialSample={props.initialSample}
        onSampleChange={props.onSampleChange}
        openNodeRequest={props.openNodeRequest}
        conditionMode={props.conditionMode}
        onConditionModeChange={props.onConditionModeChange}
      />
    </ReactFlowProvider>
  );
}

function drawerTitle(kind: FlowNodeKind): string {
  switch (kind) {
    case "trigger":
      return "Configurar trigger";
    case "condition":
      return "Configurar condición";
    case "transform":
      return "Configurar transformación";
    case "action":
      return "Configurar acción";
  }
}
