import { uuid } from "@/lib/utils";
import type {
  FlowRule,
  Trigger,
  FlowCondition,
  FieldMapping,
  Output,
  FlowGraph,
} from "@/domain/schemas/flow";

/**
 * Representación visual del flow como pipeline de 4 etapas fijas:
 * trigger (1) -> condition (0..n) -> transform (siempre 1, puede estar
 * vacío) -> action (0..n). Las aristas son puramente cosméticas — el motor
 * (`src/flows/engine.ts`) no soporta ramas condicionales por nodo, así que
 * `compileGraphToRule` agrupa por tipo de nodo, no por conectividad. El
 * usuario reposiciona nodos libremente; no conecta manualmente aristas.
 */
export type FlowNodeKind = "trigger" | "condition" | "transform" | "action";

// El índice `[key: string]: unknown` en cada variante es exigido por
// `@xyflow/react`: su `Node<T>` restringe `T extends Record<string, unknown>`,
// y TypeScript no infiere esa compatibilidad para interfaces sin índice
// explícito aunque sean estructuralmente asignables. No afecta el uso normal
// (los campos siguen siendo los declarados; el índice solo satisface el
// constraint genérico).
export interface TriggerNodeData {
  kind: "trigger";
  trigger: Trigger;
  [key: string]: unknown;
}
export interface ConditionNodeData {
  kind: "condition";
  condition: FlowCondition;
  [key: string]: unknown;
}
export interface TransformNodeData {
  kind: "transform";
  mapping: FieldMapping[];
  transformCode?: string;
  [key: string]: unknown;
}
export interface ActionNodeData {
  kind: "action";
  output: Output;
  [key: string]: unknown;
}
export type FlowNodeData =
  | TriggerNodeData
  | ConditionNodeData
  | TransformNodeData
  | ActionNodeData;

export interface FlowGraphNode {
  id: string;
  type: FlowNodeKind;
  position: { x: number; y: number };
  data: FlowNodeData;
}
export interface FlowGraphEdge {
  id: string;
  source: string;
  target: string;
}
export interface BuiltGraph {
  nodes: FlowGraphNode[];
  edges: FlowGraphEdge[];
}

const TRIGGER_ID = "trigger";
const TRANSFORM_ID = "transform";
const COLUMN_X = { trigger: 40, condition: 340, transform: 640, action: 940 };
const ROW_HEIGHT = 140;
const ROW_Y0 = 40;

/** Reconstruye las aristas desde cero a partir del conjunto de nodos actual
 * (agrupados por `kind`). Se usa tanto al generar el grafo inicial como cada
 * vez que el canvas añade/quita un nodo condition/action, así el layout de
 * flechas nunca queda "roto" a mitad de una cadena. */
export function relinkEdges(nodes: FlowGraphNode[]): FlowGraphEdge[] {
  const edges: FlowGraphEdge[] = [];
  const conditionIds = nodes.filter((n) => n.data.kind === "condition").map((n) => n.id);
  const transformNode = nodes.find((n) => n.data.kind === "transform");
  const actionIds = nodes.filter((n) => n.data.kind === "action").map((n) => n.id);

  let prev = TRIGGER_ID;
  for (const id of conditionIds) {
    edges.push({ id: `e-${prev}-${id}`, source: prev, target: id });
    prev = id;
  }
  if (transformNode) {
    edges.push({ id: `e-${prev}-${transformNode.id}`, source: prev, target: transformNode.id });
    prev = transformNode.id;
  }
  for (const id of actionIds) {
    edges.push({ id: `e-${prev}-${id}`, source: prev, target: id });
  }
  return edges;
}

/** Genera un grafo por defecto a partir de un FlowRule sin `graph` (flujos
 * legacy, recién migrados, o recién creados). Layout en columnas: trigger,
 * condiciones en cadena, transformación, acciones en paralelo. */
export function buildGraphFromRule(rule: FlowRule): BuiltGraph {
  const nodes: FlowGraphNode[] = [];

  nodes.push({
    id: TRIGGER_ID,
    type: "trigger",
    position: { x: COLUMN_X.trigger, y: ROW_Y0 },
    data: { kind: "trigger", trigger: rule.trigger },
  });

  rule.logic.conditions.forEach((condition, i) => {
    nodes.push({
      id: `condition-${i}`,
      type: "condition",
      position: { x: COLUMN_X.condition, y: ROW_Y0 + i * ROW_HEIGHT },
      data: { kind: "condition", condition },
    });
  });

  nodes.push({
    id: TRANSFORM_ID,
    type: "transform",
    position: { x: COLUMN_X.transform, y: ROW_Y0 },
    data: {
      kind: "transform",
      mapping: rule.logic.mapping,
      transformCode: rule.logic.transformCode,
    },
  });

  rule.outputs.forEach((output, i) => {
    nodes.push({
      id: `action-${i}`,
      type: "action",
      position: { x: COLUMN_X.action, y: ROW_Y0 + i * ROW_HEIGHT },
      data: { kind: "action", output },
    });
  });

  return { nodes, edges: relinkEdges(nodes) };
}

/** Compila el grafo visual de vuelta a trigger/logic/outputs — la fuente de
 * verdad que ejecuta el engine. Null trigger solo puede pasar si se borró el
 * nodo trigger, lo que la UI no permite (es un nodo fijo, no removible). */
export function compileGraphToRule(graph: BuiltGraph): {
  trigger: Trigger | null;
  conditions: FlowCondition[];
  mapping: FieldMapping[];
  transformCode?: string;
  outputs: Output[];
} {
  const triggerNode = graph.nodes.find(
    (n): n is FlowGraphNode & { data: TriggerNodeData } => n.data.kind === "trigger",
  );
  const conditions = graph.nodes
    .filter((n): n is FlowGraphNode & { data: ConditionNodeData } => n.data.kind === "condition")
    .map((n) => n.data.condition);
  const transformNode = graph.nodes.find(
    (n): n is FlowGraphNode & { data: TransformNodeData } => n.data.kind === "transform",
  );
  const outputs = graph.nodes
    .filter((n): n is FlowGraphNode & { data: ActionNodeData } => n.data.kind === "action")
    .map((n) => n.data.output);

  return {
    trigger: triggerNode?.data.trigger ?? null,
    conditions,
    mapping: transformNode?.data.mapping ?? [],
    transformCode: transformNode?.data.transformCode,
    outputs,
  };
}

/** `FlowRule.graph` (Zod, passthrough) -> `BuiltGraph` tipado. Estructuralmente
 * compatible: el schema solo exige `id` en nodos y `id/source/target` en
 * aristas, dejando pasar `type`/`position`/`data` sin validarlos. */
export function graphFromPersisted(graph: FlowGraph): BuiltGraph {
  return {
    nodes: graph.nodes as unknown as FlowGraphNode[],
    edges: graph.edges as unknown as FlowGraphEdge[],
  };
}

export function newConditionNode(nodes: FlowGraphNode[]): FlowGraphNode {
  const count = nodes.filter((n) => n.data.kind === "condition").length;
  return {
    id: `condition-${uuid()}`,
    type: "condition",
    position: { x: COLUMN_X.condition, y: ROW_Y0 + count * ROW_HEIGHT },
    data: { kind: "condition", condition: { field: "", op: "==", value: "" } },
  };
}

export function newActionNode(nodes: FlowGraphNode[], output: Output): FlowGraphNode {
  const count = nodes.filter((n) => n.data.kind === "action").length;
  return {
    id: `action-${uuid()}`,
    type: "action",
    position: { x: COLUMN_X.action, y: ROW_Y0 + count * ROW_HEIGHT },
    data: { kind: "action", output },
  };
}
