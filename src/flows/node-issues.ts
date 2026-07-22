import type { FlowGraphNode, FlowNodeKind } from "./graph";
import type { FlowIssue } from "./validation";

/** Issues de configuración que cuelgan de un nodo concreto del canvas,
 * separados por severidad (el criterio de `validateFlow`: "error" = no puede
 * ejecutarse; "warning" = ejecuta pero probablemente no haga lo esperado). */
export interface NodeIssues {
  errors: FlowIssue[];
  warnings: FlowIssue[];
}

type NodeLike = Pick<FlowGraphNode, "id" | "data">;

/** Ids de los nodos de cada clase **en orden de array** — el mismo orden del
 * que `compileGraphToRule` deriva `conditions`/`outputs`, y por tanto el mismo
 * que numera los issues de `validateFlow`. Se exporta porque es también la
 * fuente de la numeración visible del pipeline (spec 038 §E1) y de la
 * proyección de la traza (`trace-projection.ts`): los tres derivan del mismo
 * recorrido, así que no pueden desincronizarse entre sí. */
export function nodeIdsByKind(nodes: NodeLike[]): Record<FlowNodeKind, string[]> {
  const out: Record<FlowNodeKind, string[]> = {
    trigger: [],
    condition: [],
    transform: [],
    action: [],
  };
  for (const n of nodes) out[n.data.kind].push(n.id);
  return out;
}

/**
 * Reparte los issues de `validateFlow` entre los nodos del grafo (spec 038
 * §A2). Es la **única** fuente de "este nodo está mal configurado": el canvas
 * no vuelve a calcular criterios propios, así que cualquier regla nueva de
 * `validateFlow` aparece en el canvas sin tocar el canvas.
 *
 *  - `nodeKind: "trigger"` / `"transform"` → el nodo único de esa clase.
 *  - `"condition"` / `"action"`            → el i-ésimo nodo de esa clase, por
 *    `outputIndex` (sin `outputIndex`, el primero — mismo criterio que el
 *    banner de issues del builder).
 *  - `"flow"`                              → ningún nodo: los problemas del
 *    flujo entero (ej. "no tiene acciones") viven solo en el banner (CA-01.4).
 *
 * Los nodos sin issues **no aparecen** en el mapa (CA-01.6: cero ruido).
 */
export function nodeIssueMap(nodes: NodeLike[], issues: FlowIssue[]): Map<string, NodeIssues> {
  const byKind = nodeIdsByKind(nodes);
  const map = new Map<string, NodeIssues>();

  for (const issue of issues) {
    if (issue.nodeKind === "flow") continue;
    const ids = byKind[issue.nodeKind];
    const id =
      issue.nodeKind === "condition" || issue.nodeKind === "action"
        ? ids[issue.outputIndex ?? 0]
        : ids[0];
    // Un issue puede referirse a un índice que ya no existe (el grafo y los
    // issues se recalculan en el mismo render, pero un nodo borrado a mitad de
    // un ciclo dejaría un índice colgando): se descarta en silencio — el
    // banner sigue mostrándolo.
    if (!id) continue;

    let entry = map.get(id);
    if (!entry) {
      entry = { errors: [], warnings: [] };
      map.set(id, entry);
    }
    if (issue.severity === "error") entry.errors.push(issue);
    else entry.warnings.push(issue);
  }

  return map;
}
