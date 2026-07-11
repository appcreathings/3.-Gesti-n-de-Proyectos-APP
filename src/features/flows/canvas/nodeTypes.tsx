import { createContext, useContext } from "react";
import { Handle, Position, type Node, type NodeProps, type NodeTypes } from "@xyflow/react";
import { X, Zap, GitBranch, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlowNodeData, FlowNodeKind } from "@/flows/graph";
import {
  triggerSummary,
  conditionSummary,
  transformSummary,
  actionSummary,
  outputMeta,
} from "./meta";

export type CanvasNode = Node<FlowNodeData, FlowNodeKind>;

/** Provee `deleteNode` a los nodos condition/action sin tener que embeber
 * closures dentro de `data` (que de otro modo tendríamos que despojar antes
 * de persistir el grafo, y que quedarían obsoletas si el id del nodo
 * cambiara de identidad entre renders). */
export const FlowCanvasActions = createContext<{ deleteNode: (id: string) => void } | null>(null);

const KIND_STYLES: Record<FlowNodeKind, { border: string; badge: string }> = {
  trigger: { border: "border-primary/40", badge: "bg-primary/10 text-primary" },
  condition: { border: "border-warning/40", badge: "bg-warning/10 text-warning" },
  transform: { border: "border-sky-400/40", badge: "bg-sky-500/10 text-sky-600" },
  action: { border: "border-success/40", badge: "bg-success/10 text-success" },
};

function NodeShell({
  kind,
  icon,
  label,
  summary,
  onDelete,
  showTarget,
  showSource,
  invalid,
}: {
  kind: FlowNodeKind;
  icon: React.ReactNode;
  label: string;
  summary: string;
  onDelete?: () => void;
  showTarget: boolean;
  showSource: boolean;
  invalid?: boolean;
}) {
  const styles = KIND_STYLES[kind];
  return (
    <div
      className={cn(
        "min-w-56 max-w-64 rounded-lg border-2 bg-background p-3 shadow-sm transition-shadow hover:shadow-md",
        styles.border,
        invalid && "border-destructive/60",
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
      {invalid && <p className="mt-1 text-[10px] text-destructive">Configuración incompleta</p>}
    </div>
  );
}

function TriggerNode({ data }: NodeProps<CanvasNode>) {
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
    />
  );
}

function ConditionNode({ id, data }: NodeProps<CanvasNode>) {
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
    />
  );
}

function TransformNode({ data }: NodeProps<CanvasNode>) {
  if (data.kind !== "transform") return null;
  return (
    <NodeShell
      kind="transform"
      icon={<Wand2 className="size-3" />}
      label="Transformar"
      summary={transformSummary(data)}
      showTarget
      showSource
    />
  );
}

function ActionNode({ id, data }: NodeProps<CanvasNode>) {
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
    />
  );
}

export const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  transform: TransformNode,
  action: ActionNode,
};
