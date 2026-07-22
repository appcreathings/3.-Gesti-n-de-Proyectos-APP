import { useContext, useState } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FlowCanvasActions } from "./nodeTypes";
import { OUTPUT_TYPES } from "./meta";

/** Qué se puede insertar en esta arista, derivado del tramo del pipeline al
 * que pertenece (lo calcula el memo de `edges` en `FlowCanvas`): el tramo
 * trigger→…→transform admite condiciones; transform→acciones admite acciones. */
export interface InsertEdgeData extends Record<string, unknown> {
  insert: "condition" | "action";
}

/** Arista con un botón "＋" en el punto medio para insertar un paso entre dos
 * nodos del mismo tramo (spec 036 §B, CA-03.4). No habilita conexiones
 * manuales ni ramificación: el nodo nuevo se agrega al pipeline lineal y
 * `relinkEdges` recompone las flechas: la arista sigue siendo derivada. */
export function InsertEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  target,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const actions = useContext(FlowCanvasActions);
  const [open, setOpen] = useState(false);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const insert = (data as InsertEdgeData | undefined)?.insert ?? "condition";

  return (
    <>
      <BaseEdge path={edgePath} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <div
          // `nodrag`/`nopan` evitan que el clic sobre el botón panee el lienzo;
          // `pointerEvents: all` es necesario porque el contenedor del
          // `EdgeLabelRenderer` los desactiva por defecto.
          className="nodrag nopan absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
        >
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={insert === "condition" ? "Insertar condición aquí" : "Insertar acción aquí"}
                aria-label={
                  insert === "condition" ? "Insertar condición aquí" : "Insertar acción aquí"
                }
                className="flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground opacity-60 shadow-sm transition-all hover:scale-110 hover:border-primary hover:text-primary hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="max-h-64 overflow-auto">
              {insert === "condition" ? (
                <DropdownMenuItem onClick={() => actions?.insertCondition(target)}>
                  Insertar condición
                </DropdownMenuItem>
              ) : (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Insertar acción
                  </div>
                  {OUTPUT_TYPES.map((o) => (
                    <DropdownMenuItem key={o.type} onClick={() => actions?.insertAction(target, o.type)}>
                      <o.icon className={`size-4 ${o.color}`} />
                      {o.label}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

/** Registro estable de tipos de arista — a nivel de módulo para no recrear el
 * objeto en cada render (React Flow advierte si cambia de identidad). */
export const edgeTypes = { insert: InsertEdge };
