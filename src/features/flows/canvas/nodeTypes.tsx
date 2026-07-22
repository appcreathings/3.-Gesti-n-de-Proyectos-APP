import { createContext, useContext } from "react";
import { Handle, Position, type Node, type NodeProps, type NodeTypes } from "@xyflow/react";
import { X, Copy, Zap, GitBranch, Wand2, AlertCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Output } from "@/domain/schemas/flow";
import type { FlowNodeData, FlowNodeKind } from "@/flows/graph";
import type { NodeIssues } from "@/flows/node-issues";
import type { NodeRunStatus } from "@/flows/trace-projection";
import {
  triggerSummary,
  conditionSummary,
  transformSummary,
  actionSummary,
  formatConditionValue,
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
  /** Duplica una condición o acción (spec 038 §E3) — el nodo duplicado queda
   * justo después del original en el orden de ejecución. */
  duplicateNode: (id: string) => void;
} | null>(null);

/** Campos disponibles del flujo (los mismos que alimentan el
 * `VariablesPanel`), para marcar como huérfano el chip de una variable que no
 * existe (spec 036 §C5, CA-06.2). Va por contexto y no dentro de `data` para
 * no engordar el grafo persistido. Vacío = sin información para validar, así
 * que ningún chip se marca (mismo criterio que `validateVariables`). */
export const CanvasVariables = createContext<Set<string>>(new Set());

/** Diagnóstico de configuración por nodo, repartido desde `validateFlow` por
 * `nodeIssueMap` (spec 038 §A). Va por contexto —mismo idioma que
 * `CanvasVariables`— y NO dentro de `node.data`, que sí se persiste en
 * `flow.graph`.
 *
 * **Única fuente de verdad**: ningún nodo vuelve a decidir por su cuenta si
 * está mal configurado. Antes había tres criterios locales divergentes (y las
 * acciones no tenían ninguno, así que un webhook sin URL se veía idéntico a
 * uno correcto); ahora una regla nueva de `validateFlow` aparece en el canvas
 * sin tocar el canvas. Vacío por defecto — así el `FlowPreviewCanvas` (que no
 * monta proveedor) degrada solo, sin insignias. */
export const CanvasNodeIssues = createContext<Map<string, NodeIssues>>(new Map());

/** Resultado de la última simulación proyectado por nodo (spec 038 §D), o
 * `null` si no hay proyección activa. Canal visual **distinto** del de
 * configuración (R3): esto vive en la franja al pie del nodo y solo existe
 * mientras hay una simulación proyectada; la insignia de issues vive en la
 * esquina y es permanente. */
export const CanvasRunStatus = createContext<Map<string, NodeRunStatus> | null>(null);

/** Número de orden (1..n) de cada condición y de cada acción (spec 038 §E1,
 * CA-05.1). Sale del MISMO recorrido ordenado por clase que alimenta los
 * issues y la proyección de la traza (`nodeIdsByKind`), así que numeración,
 * diagnóstico y simulación no pueden desincronizarse entre sí: los tres
 * derivan del orden que compila el motor, no del visual. */
export const CanvasNodeOrder = createContext<Map<string, number>>(new Map());

/** Máximo de chips visibles por nodo antes de resumir con "+N" (CA-06.3). */
const MAX_CHIPS = 4;

function pluralize(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Insignia de problemas de configuración, en la **esquina superior** del nodo
 * (CA-01.1). Canal visual deliberadamente distinto del estado de simulación,
 * que vive en la franja al pie (R3): la insignia es permanente mientras haya
 * issues; la franja solo existe mientras hay una proyección activa.
 *
 * El detalle va en el `title` (los mensajes de `validateFlow`, en español) más
 * la primera línea visible bajo el resumen — el banner del builder sigue
 * listándolos todos y el drawer está a un clic, así que la insignia solo tiene
 * que decir *cuál* nodo y *cuántos* (CA-01.2). El `aria-label` cuenta y
 * clasifica los problemas: la información no depende del color. */
function NodeIssueBadge({ issues }: { issues: NodeIssues }) {
  const errors = issues.errors.length;
  const warnings = issues.warnings.length;
  const total = errors + warnings;
  if (total === 0) return null;

  const isError = errors > 0;
  const label =
    errors > 0 && warnings > 0
      ? `${pluralize(errors, "error", "errores")} y ${pluralize(warnings, "aviso", "avisos")} de configuración`
      : errors > 0
        ? `${pluralize(errors, "error", "errores")} de configuración`
        : `${pluralize(warnings, "aviso", "avisos")} de configuración`;
  const detail = [...issues.errors, ...issues.warnings].map((i) => `• ${i.message}`).join("\n");
  const Icon = isError ? AlertCircle : AlertTriangle;

  return (
    <span
      title={`${label}:\n${detail}`}
      aria-label={label}
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded px-1 py-px text-[10px] font-semibold",
        isError ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning",
      )}
    >
      <Icon className="size-3" aria-hidden />
      {total}
    </span>
  );
}

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
  onDuplicate,
  showTarget,
  showSource,
  issues,
  run,
  selected,
  variables,
  index,
  secondary,
}: {
  kind: FlowNodeKind;
  icon: React.ReactNode;
  label: string;
  summary: string;
  onDelete?: () => void;
  /** Duplicar el nodo (spec 038 §E3) — solo condiciones y acciones; los nodos
   * fijos del pipeline no lo ofrecen (CA-03.3). */
  onDuplicate?: () => void;
  showTarget: boolean;
  showSource: boolean;
  /** Diagnóstico de `validateFlow` para ESTE nodo (spec 038 §A). El shell no
   * lo calcula ni lo interpreta: solo lo muestra. */
  issues?: NodeIssues;
  /** Desenlace del nodo en la última simulación proyectada (spec 038 §D). */
  run?: NodeRunStatus;
  /** Posición del nodo en su etapa del pipeline (1..n) — solo condiciones y
   * acciones, que son las que se repiten (CA-05.1). Acompaña al resumen: no es
   * el único diferenciador entre dos nodos. */
  index?: number;
  /** El nodo está presente pero no hace nada (transform vacío, CA-05.2): se
   * pinta en segundo plano en vez de competir con los pasos que sí actúan. */
  secondary?: boolean;
  selected?: boolean;
  /** Variables que consume el nodo — sin ellas no se renderiza la fila de
   * chips (CA-06.4: cero ruido). */
  variables?: string[];
}) {
  const styles = KIND_STYLES[kind];
  const hasErrors = (issues?.errors.length ?? 0) > 0;
  const hasWarnings = (issues?.warnings.length ?? 0) > 0;
  const firstMessage = issues?.errors[0]?.message ?? issues?.warnings[0]?.message;

  return (
    <div
      className={cn(
        "min-w-56 max-w-64 rounded-lg border-2 bg-background p-3 shadow-sm transition-all hover:border-foreground/30 hover:shadow-md",
        styles.border,
        secondary && "border-dashed opacity-75 hover:opacity-100",
        hasErrors && "border-destructive/60",
        !hasErrors && hasWarnings && "border-warning/60",
        // Selección (CA-03.1): anillo primario visible en claro/oscuro, con
        // offset para que no se confunda con el borde de color del tipo.
        selected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
      )}
    >
      {showTarget && <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />}
      {showSource && <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />}

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <span className={cn("flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide", styles.badge)}>
            {icon}
            {label}
            {index !== undefined && <span className="font-bold tabular-nums">{index}</span>}
          </span>
          {secondary && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              opcional
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {issues && <NodeIssueBadge issues={issues} />}
          {onDuplicate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              title="Duplicar nodo (Ctrl+D)"
              aria-label="Duplicar nodo"
              aria-keyshortcuts="Control+D"
              className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Copy className="size-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="Eliminar nodo"
              aria-label="Eliminar nodo"
              className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>
      <p className="mt-1.5 truncate text-sm font-medium leading-tight" title={summary}>
        {summary}
      </p>
      {variables && <NodeVariableChips variables={variables} />}
      {firstMessage && (
        // Una línea legible sin hover ni drawer (CA-01.2) — el `title` lleva la
        // lista completa cuando hay más de un problema.
        <p
          className={cn("mt-1 truncate text-[10px]", hasErrors ? "text-destructive" : "text-warning")}
          title={firstMessage}
        >
          {firstMessage}
        </p>
      )}
      {run && <NodeRunStrip status={run} />}
    </div>
  );
}

/** Issues de un nodo según la única fuente de verdad (`validateFlow` vía
 * `nodeIssueMap`). Reemplaza los tres criterios locales que cada nodo se
 * calculaba a mano — dos parciales y uno inexistente (spec 038 §A1). */
function useNodeIssues(id: string): NodeIssues | undefined {
  return useContext(CanvasNodeIssues).get(id);
}

function useNodeIndex(id: string): number | undefined {
  return useContext(CanvasNodeOrder).get(id);
}

function useNodeRunStatus(id: string): NodeRunStatus | undefined {
  return useContext(CanvasRunStatus)?.get(id);
}

/** Cómo se lee cada desenlace en la franja: **verbo en texto** siempre, con el
 * color acompañando y no informando solo (design §6). */
function runStatusView(status: NodeRunStatus): { text: string; detail?: string; tone: string } {
  switch (status.kind) {
    case "condition":
      return {
        text: status.passed ? "Se cumple" : "No se cumple",
        detail: `Valor real: ${formatConditionValue(status.actual)} · esperado: ${formatConditionValue(status.expected)}`,
        tone: status.passed ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
      };
    case "transform":
      return status.error
        ? { text: "Falló el código", detail: status.error, tone: "bg-destructive/10 text-destructive" }
        : { text: "Transformación aplicada", tone: "bg-muted text-muted-foreground" };
    case "action":
      switch (status.outcome) {
        case "executed":
          return { text: "Se ejecutaría", detail: status.plan, tone: "bg-success/10 text-success" };
        case "skipped":
          return { text: "Omitida", detail: status.reason, tone: "bg-muted text-muted-foreground" };
        case "error":
          return { text: "Error", detail: status.reason, tone: "bg-destructive/10 text-destructive" };
        case "not-reached":
          // Distinto de "omitida" a propósito (CA-04.3): el flujo nunca llegó
          // hasta aquí, no es que la acción se saltara por un fallo.
          return { text: "No alcanzada", detail: status.reason, tone: "bg-muted text-muted-foreground" };
      }
  }
}

/** Franja de resultado de la simulación, **al pie** del nodo (spec 038 §D4).
 * Solo se renderiza mientras hay proyección activa. */
function NodeRunStrip({ status }: { status: NodeRunStatus }) {
  const { text, detail, tone } = runStatusView(status);
  return (
    <div
      className={cn("mt-2 rounded px-1.5 py-1 text-[10px] leading-snug", tone)}
      title={detail ? `${text} — ${detail}` : text}
    >
      <span className="font-semibold">{text}</span>
      {detail && <p className="mt-0.5 line-clamp-2 font-normal opacity-90">{detail}</p>}
    </div>
  );
}

function TriggerNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const issues = useNodeIssues(id);
  if (data.kind !== "trigger") return null;
  return (
    <NodeShell
      kind="trigger"
      icon={<Zap className="size-3" />}
      label="Trigger"
      summary={triggerSummary(data)}
      showTarget={false}
      showSource
      issues={issues}
      selected={selected}
    />
  );
}

function ConditionNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const actions = useContext(FlowCanvasActions);
  const issues = useNodeIssues(id);
  const run = useNodeRunStatus(id);
  const index = useNodeIndex(id);
  if (data.kind !== "condition") return null;
  return (
    <NodeShell
      kind="condition"
      icon={<GitBranch className="size-3" />}
      label="Condición"
      summary={conditionSummary(data)}
      onDelete={actions ? () => actions.deleteNode(id) : undefined}
      onDuplicate={actions ? () => actions.duplicateNode(id) : undefined}
      showTarget
      showSource
      issues={issues}
      run={run}
      index={index}
      selected={selected}
      variables={nodeUsedVariables(data)}
    />
  );
}

function TransformNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const issues = useNodeIssues(id);
  const run = useNodeRunStatus(id);
  if (data.kind !== "transform") return null;
  return (
    <NodeShell
      kind="transform"
      icon={<Wand2 className="size-3" />}
      label="Transformar"
      summary={transformSummary(data)}
      showTarget
      showSource
      issues={issues}
      run={run}
      // CA-05.2: un transform sin mapeo ni código no hace nada — deja de
      // competir visualmente con los pasos que sí actúan. Sigue siendo un nodo
      // fijo y no borrable (invariante de 036).
      secondary={data.mapping.length === 0 && !data.transformCode}
      selected={selected}
      variables={nodeUsedVariables(data)}
    />
  );
}

function ActionNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const actions = useContext(FlowCanvasActions);
  const issues = useNodeIssues(id);
  const run = useNodeRunStatus(id);
  const index = useNodeIndex(id);
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
      onDuplicate={actions ? () => actions.duplicateNode(id) : undefined}
      showTarget
      showSource={false}
      issues={issues}
      run={run}
      index={index}
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
