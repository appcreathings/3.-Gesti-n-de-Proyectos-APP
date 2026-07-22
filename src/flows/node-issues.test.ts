import { describe, it, expect } from "vitest";
import { nodeIssueMap, nodeIdsByKind } from "./node-issues";
import type { FlowGraphNode } from "./graph";
import type { FlowIssue } from "./validation";

/** Grafo mínimo: trigger, 2 condiciones, transform, 3 acciones — en el mismo
 * orden de array del que `compileGraphToRule` deriva conditions/outputs. */
function graph(): Pick<FlowGraphNode, "id" | "data">[] {
  return [
    { id: "trigger", data: { kind: "trigger", trigger: { type: "event", event: "task.added" } } },
    { id: "c-0", data: { kind: "condition", condition: { field: "a", op: "==", value: 1 } } },
    { id: "c-1", data: { kind: "condition", condition: { field: "b", op: "==", value: 2 } } },
    { id: "transform", data: { kind: "transform", mapping: [] } },
    { id: "a-0", data: { kind: "action", output: { type: "webhook", url: "", secret: "" } } },
    { id: "a-1", data: { kind: "action", output: { type: "webhook", url: "", secret: "" } } },
    { id: "a-2", data: { kind: "action", output: { type: "webhook", url: "", secret: "" } } },
  ];
}

const issue = (over: Partial<FlowIssue>): FlowIssue => ({
  severity: "error",
  nodeKind: "action",
  message: "problema",
  ...over,
});

describe("nodeIdsByKind", () => {
  it("agrupa los ids por clase conservando el orden del array", () => {
    expect(nodeIdsByKind(graph())).toEqual({
      trigger: ["trigger"],
      condition: ["c-0", "c-1"],
      transform: ["transform"],
      action: ["a-0", "a-1", "a-2"],
    });
  });
});

describe("nodeIssueMap (spec 038 §A2)", () => {
  it("cuelga el issue del trigger en el nodo trigger", () => {
    const map = nodeIssueMap(graph(), [issue({ nodeKind: "trigger", message: "sin conexión" })]);
    expect(map.get("trigger")!.errors).toHaveLength(1);
    expect(map.get("trigger")!.errors[0].message).toBe("sin conexión");
  });

  it("el i-ésimo nodo de una clase recibe el issue con outputIndex i", () => {
    const map = nodeIssueMap(graph(), [
      issue({ nodeKind: "action", outputIndex: 2, message: "falta URL" }),
      issue({ nodeKind: "condition", outputIndex: 1, severity: "warning", message: "sin campo" }),
    ]);
    expect(map.get("a-2")!.errors[0].message).toBe("falta URL");
    expect(map.get("c-1")!.warnings[0].message).toBe("sin campo");
    expect(map.has("a-0")).toBe(false);
    expect(map.has("c-0")).toBe(false);
  });

  it("separa errores de warnings en el mismo nodo", () => {
    const map = nodeIssueMap(graph(), [
      issue({ outputIndex: 0, severity: "error", message: "falta URL" }),
      issue({ outputIndex: 0, severity: "warning", message: "token huérfano" }),
    ]);
    const entry = map.get("a-0")!;
    expect(entry.errors).toHaveLength(1);
    expect(entry.warnings).toHaveLength(1);
  });

  it('los issues de nodeKind "flow" no cuelgan de ningún nodo (CA-01.4)', () => {
    const map = nodeIssueMap(graph(), [
      issue({ nodeKind: "flow", message: "El flujo no tiene acciones." }),
    ]);
    expect(map.size).toBe(0);
  });

  it("un nodo sin issues no aparece en el mapa (CA-01.6)", () => {
    expect(nodeIssueMap(graph(), []).size).toBe(0);
  });

  it("descarta un índice que ya no existe en el grafo, sin romper", () => {
    const map = nodeIssueMap(graph(), [issue({ nodeKind: "action", outputIndex: 9 })]);
    expect(map.size).toBe(0);
  });

  it("un issue de acción sin outputIndex cae en la primera acción", () => {
    const map = nodeIssueMap(graph(), [issue({ nodeKind: "action" })]);
    expect(map.get("a-0")!.errors).toHaveLength(1);
  });
});
