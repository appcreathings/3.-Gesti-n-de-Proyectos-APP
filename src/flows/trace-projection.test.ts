import { describe, it, expect } from "vitest";
import { projectTrace } from "./trace-projection";
import type { FlowGraphNode } from "./graph";
import type { FlowRunRecordTrace } from "./engine";

function graph(): Pick<FlowGraphNode, "id" | "data">[] {
  return [
    { id: "trigger", data: { kind: "trigger", trigger: { type: "event", event: "task.added" } } },
    { id: "c-0", data: { kind: "condition", condition: { field: "stage", op: "==", value: "won" } } },
    { id: "c-1", data: { kind: "condition", condition: { field: "amount", op: ">", value: 100 } } },
    { id: "transform", data: { kind: "transform", mapping: [] } },
    { id: "a-0", data: { kind: "action", output: { type: "webhook", url: "https://x.test", secret: "" } } },
    { id: "a-1", data: { kind: "action", output: { type: "createNotification", severity: "info", message: "m" } } },
  ];
}

const record = (over: Partial<FlowRunRecordTrace> = {}): FlowRunRecordTrace => ({
  record: { stage: "won", amount: 200 },
  conditions: [],
  conditionsPassed: true,
  outputs: [],
  ...over,
});

describe("projectTrace (spec 038 §D2)", () => {
  it("mapea cada condición por índice, con su valor real y su veredicto", () => {
    const map = projectTrace(
      graph(),
      record({
        conditions: [
          { field: "stage", op: "==", expected: "won", actual: "lost", passed: false },
          { field: "amount", op: ">", expected: 100, actual: 200, passed: true },
        ],
        conditionsPassed: false,
      }),
    );

    expect(map.get("c-0")).toEqual({
      kind: "condition",
      passed: false,
      actual: "lost",
      expected: "won",
      op: "==",
    });
    expect(map.get("c-1")).toMatchObject({ kind: "condition", passed: true, actual: 200 });
  });

  it("mapea cada acción por índice, con su desenlace y su plan", () => {
    const map = projectTrace(
      graph(),
      record({
        outputs: [
          { type: "webhook", outcome: "executed", mutatedProjectIds: [], plan: "Se enviaría POST a x.test" },
          { type: "createNotification", outcome: "skipped", mutatedProjectIds: [], reason: "sin destino" },
        ],
      }),
    );

    expect(map.get("a-0")).toMatchObject({
      kind: "action",
      outcome: "executed",
      plan: "Se enviaría POST a x.test",
    });
    expect(map.get("a-1")).toMatchObject({ kind: "action", outcome: "skipped", reason: "sin destino" });
  });

  it('las acciones son "no alcanzadas" cuando las condiciones filtraron el registro (CA-04.3)', () => {
    const map = projectTrace(
      graph(),
      record({
        conditions: [{ field: "stage", op: "==", expected: "won", actual: "lost", passed: false }],
        conditionsPassed: false,
        outputs: [],
      }),
    );

    const a0 = map.get("a-0")!;
    const a1 = map.get("a-1")!;
    expect(a0).toMatchObject({ kind: "action", outcome: "not-reached" });
    expect(a1).toMatchObject({ kind: "action", outcome: "not-reached" });
    expect(a0.kind === "action" && a0.reason).toContain("condiciones");
  });

  it('"no alcanzada" también cuando el transform falló, con el motivo correcto', () => {
    const map = projectTrace(
      graph(),
      record({
        transform: { input: { a: 1 }, error: "boom" },
        outputs: [],
      }),
    );

    expect(map.get("transform")).toEqual({ kind: "transform", error: "boom" });
    const a0 = map.get("a-0")!;
    expect(a0).toMatchObject({ outcome: "not-reached" });
    expect(a0.kind === "action" && a0.reason).toContain("transformación");
  });

  it("un transform sin código no reporta nada (cero ruido)", () => {
    const map = projectTrace(graph(), record());
    expect(map.has("transform")).toBe(false);
  });

  it("un transform que corrió bien queda sin error", () => {
    const map = projectTrace(
      graph(),
      record({ transform: { input: { a: 1 }, output: { a: 2 } } }),
    );
    expect(map.get("transform")).toEqual({ kind: "transform", error: undefined });
  });

  it("el nodo trigger no recibe estado de simulación", () => {
    const map = projectTrace(graph(), record());
    expect(map.has("trigger")).toBe(false);
  });

  it("propaga los tokens sin resolver de un output", () => {
    const map = projectTrace(
      graph(),
      record({
        outputs: [
          { type: "webhook", outcome: "executed", mutatedProjectIds: [], unresolvedTokens: ["cliente"] },
        ],
      }),
    );
    expect(map.get("a-0")).toMatchObject({ unresolvedTokens: ["cliente"] });
  });
});
