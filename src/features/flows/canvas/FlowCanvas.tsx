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
}

function toPlainNodes(nodes: CanvasNode[]): FlowGraphNode[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type as FlowGraphNode["type"],
    position: n.position,
    data: n.data,
  }));
}

function CanvasInner({ initialGraph, onGraphChange }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(
    initialGraph.nodes as CanvasNode[],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Muestra real de la última "Probar conexión" exitosa del nodo trigger —
  // efímera (no se persiste), usada para poblar el picker de mapeo de campos
  // en el nodo de Transformación (spec 022 §A).
  const [triggerSample, setTriggerSample] = useState<Record<string, unknown>[] | undefined>();

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
                        onSampleChange={setTriggerSample}
                      />
                    );
                  }
                  case "condition": {
                    const data = node.data;
                    return (
                      <ConditionConfigFields
                        condition={data.condition}
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
                        output={data.output}
                        trigger={triggerData?.trigger ?? { type: "event", event: "task.statusChanged" }}
                        sample={triggerSample}
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
      <CanvasInner {...props} />
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
