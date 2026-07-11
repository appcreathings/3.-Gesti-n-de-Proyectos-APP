import { describe, expect, it } from "vitest";
import {
  buildGraphFromRule,
  compileGraphToRule,
  relinkEdges,
  newConditionNode,
  newActionNode,
  type FlowGraphNode,
} from "./graph";
import type { FlowRule } from "@/domain/schemas/flow";

function makeRule(overrides: Partial<FlowRule> = {}): FlowRule {
  const now = new Date().toISOString();
  return {
    id: "flow-1",
    schemaVersion: 8,
    name: "Test",
    enabled: true,
    trigger: { type: "event", event: "task.statusChanged" },
    logic: { conditions: [], mapping: [] },
    outputs: [],
    lastRunAt: null,
    runCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("buildGraphFromRule", () => {
  it("always includes exactly one trigger node and one transform node", () => {
    const graph = buildGraphFromRule(makeRule());
    expect(graph.nodes.filter((n) => n.data.kind === "trigger")).toHaveLength(1);
    expect(graph.nodes.filter((n) => n.data.kind === "transform")).toHaveLength(1);
  });

  it("creates one condition node per condition and one action node per output", () => {
    const rule = makeRule({
      logic: {
        conditions: [
          { field: "amount", op: ">", value: 1000 },
          { field: "stage", op: "==", value: "won" },
        ],
        mapping: [],
      },
      outputs: [
        { type: "createNotification", severity: "info", message: "hi" },
      ],
    });
    const graph = buildGraphFromRule(rule);
    expect(graph.nodes.filter((n) => n.data.kind === "condition")).toHaveLength(2);
    expect(graph.nodes.filter((n) => n.data.kind === "action")).toHaveLength(1);
  });

  it("chains trigger -> conditions -> transform -> actions", () => {
    const rule = makeRule({
      logic: { conditions: [{ field: "a", op: "==", value: 1 }], mapping: [] },
      outputs: [{ type: "createNotification", severity: "info", message: "hi" }],
    });
    const graph = buildGraphFromRule(rule);
    const edgePairs = graph.edges.map((e) => [e.source, e.target]);
    expect(edgePairs).toContainEqual(["trigger", "condition-0"]);
    expect(edgePairs).toContainEqual(["condition-0", "transform"]);
    expect(edgePairs).toContainEqual(["transform", "action-0"]);
  });

  it("connects trigger directly to transform when there are no conditions", () => {
    const graph = buildGraphFromRule(makeRule());
    const edgePairs = graph.edges.map((e) => [e.source, e.target]);
    expect(edgePairs).toContainEqual(["trigger", "transform"]);
  });
});

describe("compileGraphToRule", () => {
  it("round-trips trigger/conditions/mapping/transformCode/outputs through build+compile", () => {
    const rule = makeRule({
      trigger: { type: "event", event: "task.added" },
      logic: {
        conditions: [{ field: "amount", op: ">", value: 500 }],
        mapping: [{ source: "email", target: "email" }],
        transformCode: "return record;",
      },
      outputs: [{ type: "createNotification", severity: "warning", message: "m" }],
    });
    const graph = buildGraphFromRule(rule);
    const compiled = compileGraphToRule(graph);

    expect(compiled.trigger).toEqual(rule.trigger);
    expect(compiled.conditions).toEqual(rule.logic.conditions);
    expect(compiled.mapping).toEqual(rule.logic.mapping);
    expect(compiled.transformCode).toBe(rule.logic.transformCode);
    expect(compiled.outputs).toEqual(rule.outputs);
  });

  it("ignores edges entirely — compiles purely by node kind", () => {
    const graph = buildGraphFromRule(makeRule());
    // Corrupt the edges on purpose; compilation must not care.
    graph.edges = [];
    const compiled = compileGraphToRule(graph);
    expect(compiled.trigger).toEqual({ type: "event", event: "task.statusChanged" });
  });
});

describe("relinkEdges", () => {
  it("rebuilds a clean chain after removing a middle condition node", () => {
    const rule = makeRule({
      logic: {
        conditions: [
          { field: "a", op: "==", value: 1 },
          { field: "b", op: "==", value: 2 },
        ],
        mapping: [],
      },
    });
    const graph = buildGraphFromRule(rule);
    const withoutFirstCondition = graph.nodes.filter((n) => n.id !== "condition-0");
    const edges = relinkEdges(withoutFirstCondition);
    const edgePairs = edges.map((e) => [e.source, e.target]);
    expect(edgePairs).toContainEqual(["trigger", "condition-1"]);
    expect(edgePairs).toContainEqual(["condition-1", "transform"]);
  });
});

describe("newConditionNode / newActionNode", () => {
  it("stacks new nodes below existing ones of the same kind", () => {
    const base: FlowGraphNode[] = buildGraphFromRule(makeRule()).nodes;
    const withOneCondition = [...base, newConditionNode(base)];
    const second = newConditionNode(withOneCondition);
    expect(second.position.y).toBeGreaterThan(withOneCondition[withOneCondition.length - 1].position.y);
  });

  it("newActionNode seeds the node with the given output", () => {
    const base = buildGraphFromRule(makeRule()).nodes;
    const node = newActionNode(base, { type: "createTask", title: "T", projectRef: "explicit" });
    expect(node.data).toEqual({
      kind: "action",
      output: { type: "createTask", title: "T", projectRef: "explicit" },
    });
  });
});
