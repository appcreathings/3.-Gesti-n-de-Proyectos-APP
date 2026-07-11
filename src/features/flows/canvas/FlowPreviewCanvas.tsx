import { ReactFlow, ReactFlowProvider, Background, BackgroundVariant } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { BuiltGraph } from "@/flows/graph";
import { nodeTypes } from "./nodeTypes";

/** Preview de solo lectura de un flow, derivado de su `graph` — usado en
 * `FlowsPage` para reemplazar el diagrama estático hecho a mano. Los nodos
 * condition/action no muestran botón de eliminar porque no hay
 * `FlowCanvasActions.Provider` aquí (los nodos degradan solos: `useContext`
 * devuelve `null`). */
export function FlowPreviewCanvas({ graph }: { graph: BuiltGraph }) {
  return (
    <div className="h-48 w-full overflow-hidden rounded-lg border border-border/50 bg-muted/10">
      <ReactFlowProvider>
        <ReactFlow
          nodes={graph.nodes}
          edges={graph.edges}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          panOnDrag={false}
          panOnScroll={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
