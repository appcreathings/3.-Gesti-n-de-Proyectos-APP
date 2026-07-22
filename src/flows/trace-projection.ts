import type { FlowRunRecordTrace } from "./engine";
import type { FlowGraphNode } from "./graph";
import { nodeIdsByKind } from "./node-issues";

/** Desenlace de un nodo para el registro proyectado. Es el vocabulario del
 * canvas, no el del motor: `"not-reached"` no existe en la traza — lo
 * sintetiza esta proyección (ver `projectTrace`). */
export type NodeRunStatus =
  | { kind: "condition"; passed: boolean; actual: unknown; expected: unknown; op: string }
  | { kind: "transform"; error?: string }
  | {
      kind: "action";
      outcome: "executed" | "skipped" | "error" | "not-reached";
      reason?: string;
      plan?: string;
      unresolvedTokens?: string[];
    };

type NodeLike = Pick<FlowGraphNode, "id" | "data">;

/**
 * Proyecta la traza de **un registro** sobre los nodos del canvas (spec 038
 * §D2). Puro y sin DOM.
 *
 * Se apoya en el contrato posicional del motor, fijado por
 * `engine-trace-contract.test.ts` (R2): `record.conditions[i]` es la i-ésima
 * condición y `record.outputs[i]` el i-ésimo output, incluidos los `skipped`
 * que empuja la política "detener". El recorrido por clase es el mismo de
 * `nodeIssueMap` (`nodeIdsByKind`), así que numeración, issues y proyección
 * derivan del mismo orden — el que compila el motor.
 *
 * `"not-reached"` es un estado **de la proyección, no del motor** (CA-04.3):
 * cuando el motor no llega al bucle de outputs (las condiciones filtraron el
 * registro, o el código de transformación falló) `record.outputs` queda
 * **vacío**, y vacío no significa "todas omitidas por error" sino "no se
 * llegó". Se sintetiza para cada acción sin entrada en la traza.
 */
export function projectTrace(
  nodes: NodeLike[],
  record: FlowRunRecordTrace,
): Map<string, NodeRunStatus> {
  const byKind = nodeIdsByKind(nodes);
  const map = new Map<string, NodeRunStatus>();

  byKind.condition.forEach((id, i) => {
    const detail = record.conditions[i];
    if (!detail) return;
    map.set(id, {
      kind: "condition",
      passed: detail.passed,
      actual: detail.actual,
      expected: detail.expected,
      op: detail.op,
    });
  });

  // El motor solo puebla `transform` cuando el flujo tiene código de
  // transformación, así que un transform vacío no reporta nada (CA-01.6: cero
  // ruido en el nodo que no hizo nada).
  if (record.transform) {
    const transformId = byKind.transform[0];
    if (transformId) map.set(transformId, { kind: "transform", error: record.transform.error });
  }

  const notReachedReason = !record.conditionsPassed
    ? "No se llegó: el registro no cumplió las condiciones."
    : record.transform?.error
      ? "No se llegó: el código de transformación falló."
      : "No se llegó a ejecutar en esta simulación.";

  byKind.action.forEach((id, i) => {
    const output = record.outputs[i];
    if (!output) {
      map.set(id, { kind: "action", outcome: "not-reached", reason: notReachedReason });
      return;
    }
    map.set(id, {
      kind: "action",
      outcome: output.outcome,
      reason: output.reason,
      plan: output.plan,
      unresolvedTokens: output.unresolvedTokens,
    });
  });

  return map;
}
