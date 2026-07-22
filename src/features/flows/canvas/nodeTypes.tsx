import { createContext, useContext } from "react";
import { Handle, Position, type Node, type NodeProps, type NodeTypes } from "@xyflow/react";
import { X, Zap, GitBranch, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Output } from "@/domain/schemas/flow";
import type { FlowNodeData, FlowNodeKind } from "@/flows/graph";
import {
  triggerSummary,
  conditionSummary,
  transformSummary,
  actionSummary,
  outputMeta,
} from "./meta";
import { nodeUsedVariables } from "./variables";

export type CanvasNode = Node<FlowNodeData, FlowNodeKind>;

/** Provee `deleteNode` a los nodos condition/action —y las inserciones desde
 * el botón "＋" de las aristas (spec 036 §B)— sin tener que embeber closures
 * dentro de `data` (que de otro modo tendríamos que despojar antes de
 * persistir el grafo, y que quedarían obsoletas si el id del nodo cambiara de
 * identidad entre renders). */
export const FlowCanvasActions = createContext<{
  deleteNode: (id: string) => void;
  /** Inserta una condición justo antes del nodo `targetId` del tramo. */
  insertCondition: (targetId: string) => void;
  /** Inserta una acción del tipo dado justo antes del nodo `targetId`. */
  insertAction: (targetId: string, type: Output["type"]) => void;
} | null>(null);

/** Campos disponibles del flujo (los mismos que alimentan el
 * `VariablesPanel`), para marcar como huérfano el chip de una variable que no
 * existe (spec 036 §C5, CA-06.2). Va por contexto y no dentro de `data` para
 * no engordar el grafo persistido. Vacío = sin información para validar, así
 * que ningún chip se marca (mismo criterio que `validateVariables`). */
export const CanvasVariables = createContext<Set<string>>(new Set());

/** Máximo de chips visibles por nodo antes de resumir con "+N" (CA-06.3). */
const MAX_CHIPS = 4;

const KIND_STYLES: Record<FlowNodeKind, { border: string; badge: string }> = {
  trigger: { border: "border-primary/40", badge: "bg-primary/10 text-primary" },
  condition: { border: "border-warning/40", badge: "bg-warning/10 text-warning" },
  transform: { border: "border-sky-400/40", badge: "bg-sky-500/10 text-sky-600" },
  action: { border: "border-success/40", badge: "bg-success/10 text-success" },
};

/** Fila de chips con las variables que consume el nodo (spec 036 §C5 /
 * HU-06). Un chip cuyo campo no está entre los disponibles se pinta en color
 * de advertencia, coherente con `validateVariables`. Se limita a `MAX_CHIPS`
 * + "＋N" para no romper el ancho del nodo (CA-06.3). */
function NodeVariableChips({ variables }: { variables: string[] }) {
  const available = useContext(CanvasVariables);
  if (variables.length === 0) return null;

  const shown = variables.slice(0, MAX_CHIPS);
  const extra = variables.length - shown.length;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {shown.map((v) => {
        // Sin campos conocidos no hay con qué validar — no se marca nada
        // (evita falsos positivos, igual que `validateVariables`).
        const known =
          available.size === 0 || available.has(v) || available.has(v.split(".")[0]);
        return (
          <span
            key={v}
            title={known ? `Usa {{${v}}}` : `{{${v}}} no está entre las variables disponibles`}
            className={cn(
              "max-w-full truncate rounded px-1 py-px font-mono text-[10px]",
              known ? "bg-muted text-muted-foreground" : "bg-warning/10 text-warning",
            )}
          >
            {v}
          </span>
        );
      })}
      {extra > 0 && (
        <span
          className="rounded px-1 py-px text-[10px] text-muted-foreground"
          title={variables.slice(MAX_CHIPS).join(", ")}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

function NodeShell({
  kind,
  icon,
  label,
  summary,
  onDelete,
  showTarget,
  showSource,
  invalid,
  selected,
  variables,
}: {
  kind: FlowNodeKind;
  icon: React.ReactNode;
  label: string;
  summary: string;
  onDelete?: () => void;
  showTarget: boolean;
  showSource: boolean;
  invalid?: boolean;
  selected?: boolean;
  /** Variables que consume el nodo — sin ellas no se renderiza la fila de
   * chips (CA-06.4: cero ruido). */
  variables?: string[];
}) {
  const styles = KIND_STYLES[kind];
  return (
    <div
      className={cn(
        "min-w-56 max-w-64 rounded-lg border-2 bg-background p-3 shadow-sm transition-all hover:border-foreground/30 hover:shadow-md",
        styles.border,
        invalid && "border-destructive/60",
        // Selección (CA-03.1): anillo primario visible en claro/oscuro, con
        // offset para que no se confunda con el borde de color del tipo.
        selected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
      )}
    >
      {showTarget && <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />}
      {showSource && <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />}

      <div className="flex items-center justify-between gap-2">
        <span className={cn("flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide", styles.badge)}>
          {icon}
          {label}
        </span>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <p className="mt-1.5 truncate text-sm font-medium leading-tight" title={summary}>
        {summary}
      </p>
      {variables && <NodeVariableChips variables={variables} />}
      {invalid && <p className="mt-1 text-[10px] text-destructive">Configuración incompleta</p>}
    </div>
  );
}

function TriggerNode({ data, selected }: NodeProps<CanvasNode>) {
  if (data.kind !== "trigger") return null;
  const invalid = data.trigger.type === "poll" && !data.trigger.config.connectionId;
  return (
    <NodeShell
      kind="trigger"
      icon={<Zap className="size-3" />}
      label="Trigger"
      summary={triggerSummary(data)}
      showTarget={false}
      showSource
      invalid={invalid}
      selected={selected}
    />
  );
}

function ConditionNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const actions = useContext(FlowCanvasActions);
  if (data.kind !== "condition") return null;
  return (
    <NodeShell
      kind="condition"
      icon={<GitBranch className="size-3" />}
      label="Condición"
      summary={conditionSummary(data)}
      onDelete={actions ? () => actions.deleteNode(id) : undefined}
      showTarget
      showSource
      invalid={!data.condition.field}
      selected={selected}
      variables={nodeUsedVariables(data)}
    />
  );
}

function TransformNode({ data, selected }: NodeProps<CanvasNode>) {
  if (data.kind !== "transform") return null;
  return (
    <NodeShell
      kind="transform"
      icon={<Wand2 className="size-3" />}
      label="Transformar"
      summary={transformSummary(data)}
      showTarget
      showSource
      selected={selected}
      variables={nodeUsedVariables(data)}
    />
  );
}

function ActionNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const actions = useContext(FlowCanvasActions);
  if (data.kind !== "action") return null;
  const meta = outputMeta(data.output.type);
  const Icon = meta.icon;
  return (
    <NodeShell
      kind="action"
      icon={<Icon className="size-3" />}
      label={meta.label}
      summary={actionSummary(data)}
      onDelete={actions ? () => actions.deleteNode(id) : undefined}
      showTarget
      showSource={false}
      selected={selected}
      variables={nodeUsedVariables(data)}
    />
  );
}

export const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  transform: TransformNode,
  action: ActionNode,
};
