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
  /** Los nodos trigger y transform son fijos: no se pueden borrar desde el
   * canvas (spec 036 §B). React Flow respeta `node.deletable === false` y
   * nunca emite el cambio de borrado por teclado para ellos. Se persiste en
   * `flow.graph` (passthrough) — compatible hacia atrás: los flujos guardados
   * sin este campo se normalizan al sembrar el canvas (`seedCanvasNodes`). */
  deletable?: boolean;
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
    deletable: false,
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
    deletable: false,
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

/** Orden canónico de las columnas del pipeline — es también el orden lógico
 * de ejecución (trigger → condiciones → transform → acciones). */
const KIND_ORDER: Record<FlowNodeKind, number> = {
  trigger: 0,
  condition: 1,
  transform: 2,
  action: 3,
};

/** Reordena el array de nodos por columna (kind) y, dentro de cada columna,
 * por su posición vertical (`position.y` ascendente) — así "más arriba = antes"
 * se vuelve la fuente de verdad del orden lógico que `compileGraphToRule`
 * deriva del orden de aparición por tipo (spec 036 §B). Se aplica al soltar un
 * nodo (`onNodeDragStop`). No cambia posiciones ni ids: solo el orden del
 * array. `Array.sort` es estable, así que empates de `y` conservan el orden
 * previo. */
export function sortNodesByColumnAndY<
  T extends { data: FlowNodeData; position: { y: number } },
>(nodes: T[]): T[] {
  return [...nodes].sort((a, b) => {
    const ka = KIND_ORDER[a.data.kind];
    const kb = KIND_ORDER[b.data.kind];
    if (ka !== kb) return ka - kb;
    return a.position.y - b.position.y;
  });
}

/** `y` de un nodo nuevo insertado desde el botón "＋" de una arista
 * (spec 036 §B, CA-03.4). Como el orden lógico se deriva de la posición
 * vertical (`sortNodesByColumnAndY`), basta con calcular una `y` correcta y
 * dejar que el sort recomponga el orden del array:
 *  - Si `targetId` pertenece a la columna `kind`, el nodo nuevo va justo
 *    encima: punto medio con el nodo anterior de esa columna, o media fila por
 *    encima si el target era el primero.
 *  - Si no (típico: el transform cierra la cadena de condiciones), se apila
 *    debajo del último nodo de la columna.
 *  - Columna vacía → la primera fila. */
export function insertionY(
  nodes: FlowGraphNode[],
  kind: "condition" | "action",
  targetId: string,
): number {
  const column = nodes
    .filter((n) => n.data.kind === kind)
    .sort((a, b) => a.position.y - b.position.y);
  if (column.length === 0) return ROW_Y0;

  const targetIdx = column.findIndex((n) => n.id === targetId);
  if (targetIdx === -1) return column[column.length - 1].position.y + ROW_HEIGHT;

  const target = column[targetIdx];
  const prev = column[targetIdx - 1];
  return prev
    ? (prev.position.y + target.position.y) / 2
    : target.position.y - ROW_HEIGHT / 2;
}

/** Normaliza los nodos al sembrar el canvas: garantiza que trigger/transform
 * queden `deletable: false` aunque el grafo persistido se haya guardado antes
 * de spec 036 (retrocompat — R2). No toca condition/action (borrables por
 * defecto en React Flow). Genérico para operar sobre `CanvasNode` o
 * `FlowGraphNode`. */
export function seedCanvasNodes<T extends { data: FlowNodeData; deletable?: boolean }>(
  nodes: T[],
): T[] {
  return nodes.map((n) =>
    (n.data.kind === "trigger" || n.data.kind === "transform") && n.deletable !== false
      ? { ...n, deletable: false }
      : n,
  );
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

/** Duplica un nodo de condición o acción (spec 038 §E3, HU-03): id nuevo,
 * `data` clonado y una `y` que lo deja **justo después** del original en el
 * orden de ejecución (CA-03.2) — punto medio con el siguiente nodo de la misma
 * columna, o media fila por debajo si el original era el último. El array
 * vuelve ordenado por `sortNodesByColumnAndY`, que es de donde
 * `compileGraphToRule` deriva el orden real.
 *
 * Devuelve `null` si el nodo no existe o es fijo (trigger/transform son únicos
 * del pipeline — CA-03.3), para que el llamador no toque el estado. */
export function duplicateNode<
  T extends { id: string; data: FlowNodeData; position: { x: number; y: number } },
>(nodes: T[], id: string): T[] | null {
  const source = nodes.find((n) => n.id === id);
  if (!source) return null;
  const kind = source.data.kind;
  if (kind !== "condition" && kind !== "action") return null;

  const column = nodes
    .filter((n) => n.data.kind === kind)
    .sort((a, b) => a.position.y - b.position.y);
  const next = column.find((n) => n.position.y > source.position.y);
  const y = next
    ? (source.position.y + next.position.y) / 2
    : source.position.y + ROW_HEIGHT / 2;

  const copy = {
    ...source,
    id: `${kind}-${uuid()}`,
    position: { ...source.position, y },
    data: structuredClone(source.data),
    // El duplicado nace sin heredar la selección del original: si no, dos
    // nodos quedarían seleccionados y `Supr` borraría los dos.
    selected: false,
  } as T;

  return sortNodesByColumnAndY([...nodes, copy]);
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
