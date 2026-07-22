import { describe, expect, it } from "vitest";
import {
  buildGraphFromRule,
  compileGraphToRule,
  relinkEdges,
  newConditionNode,
  newActionNode,
  sortNodesByColumnAndY,
  seedCanvasNodes,
  insertionY,
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
    notifyOnFailure: true,
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

describe("sortNodesByColumnAndY (spec 036 §B)", () => {
  const cond = (id: string, y: number): FlowGraphNode => ({
    id,
    type: "condition",
    position: { x: 340, y },
    data: { kind: "condition", condition: { field: id, op: "==", value: "" } },
  });
  const action = (id: string, y: number): FlowGraphNode => ({
    id,
    type: "action",
    position: { x: 940, y },
    data: { kind: "action", output: { type: "createNotification", severity: "info", message: id } },
  });

  it("groups by column order (trigger→condition→transform→action) regardless of input order", () => {
    const nodes = buildGraphFromRule(
      makeRule({
        logic: { conditions: [{ field: "a", op: "==", value: 1 }], mapping: [] },
        outputs: [{ type: "createNotification", severity: "info", message: "m" }],
      }),
    ).nodes;
    const shuffled = [nodes[3], nodes[1], nodes[0], nodes[2]]; // action, condition, trigger, transform
    const sorted = sortNodesByColumnAndY(shuffled);
    expect(sorted.map((n) => n.data.kind)).toEqual(["trigger", "condition", "transform", "action"]);
  });

  it("orders same-kind nodes so more-up (smaller y) comes first", () => {
    const sorted = sortNodesByColumnAndY([cond("c-low", 300), cond("c-high", 40)]);
    expect(sorted.map((n) => n.id)).toEqual(["c-high", "c-low"]);
  });

  it("makes 'more up = earlier' the logical order compileGraphToRule sees", () => {
    // Two actions dragged so the second one sits visually above the first.
    const base = buildGraphFromRule(makeRule()).nodes; // trigger + transform
    const nodes = [...base, action("action-A", 300), action("action-B", 40)];
    const sorted = sortNodesByColumnAndY(nodes);
    const compiled = compileGraphToRule({ nodes: sorted, edges: [] });
    // action-B is higher → its output (message "action-B") compiles first.
    expect(compiled.outputs.map((o) => (o.type === "createNotification" ? o.message : ""))).toEqual([
      "action-B",
      "action-A",
    ]);
  });

  it("is a stable sort: equal-y nodes keep their prior order", () => {
    const sorted = sortNodesByColumnAndY([cond("first", 40), cond("second", 40)]);
    expect(sorted.map((n) => n.id)).toEqual(["first", "second"]);
  });

  describe("insertionY (spec 036 §B, CA-03.4)", () => {
    it("returns the first row when the column is empty", () => {
      const nodes = buildGraphFromRule(makeRule()).nodes; // no conditions
      expect(insertionY(nodes, "condition", "transform")).toBe(40);
    });

    it("stacks below the last node when the target is not in the column (chain end)", () => {
      const nodes = [cond("c1", 40), cond("c2", 180)];
      // Target is the transform node — closes the condition chain.
      expect(insertionY(nodes, "condition", "transform")).toBe(180 + 140);
    });

    it("places the new node midway between the target and its predecessor", () => {
      const nodes = [cond("c1", 40), cond("c2", 180)];
      expect(insertionY(nodes, "condition", "c2")).toBe((40 + 180) / 2);
    });

    it("places it half a row above when the target is the first of the column", () => {
      const nodes = [cond("c1", 40), cond("c2", 180)];
      expect(insertionY(nodes, "condition", "c1")).toBe(40 - 70);
    });

    it("inserting before a node makes it sort earlier (order follows y)", () => {
      const nodes = [action("a1", 40), action("a2", 180)];
      const y = insertionY(nodes, "action", "a2");
      const inserted = action("a-new", y);
      const sorted = sortNodesByColumnAndY([...nodes, inserted]);
      expect(sorted.map((n) => n.id)).toEqual(["a1", "a-new", "a2"]);
    });
  });
});

describe("seedCanvasNodes (spec 036 §B)", () => {
  it("marks trigger and transform as not deletable", () => {
    const nodes = buildGraphFromRule(makeRule()).nodes.map((n) => ({ ...n, deletable: undefined }));
    const seeded = seedCanvasNodes(nodes);
    const byKind = Object.fromEntries(seeded.map((n) => [n.data.kind, n.deletable]));
    expect(byKind.trigger).toBe(false);
    expect(byKind.transform).toBe(false);
  });

  it("leaves condition/action deletable (React Flow default)", () => {
    const nodes = buildGraphFromRule(
      makeRule({
        logic: { conditions: [{ field: "a", op: "==", value: 1 }], mapping: [] },
        outputs: [{ type: "createNotification", severity: "info", message: "m" }],
      }),
    ).nodes;
    const seeded = seedCanvasNodes(nodes);
    const condition = seeded.find((n) => n.data.kind === "condition");
    const action = seeded.find((n) => n.data.kind === "action");
    expect(condition?.deletable).toBeUndefined();
    expect(action?.deletable).toBeUndefined();
  });

  it("normalizes graphs persisted before spec 036 (no deletable field)", () => {
    // Un grafo guardado antes de 036 no trae `deletable` — al sembrarlo, los
    // nodos fijos deben quedar protegidos igual (retrocompat, R2).
    const legacy: FlowGraphNode[] = [
      { id: "trigger", type: "trigger", position: { x: 40, y: 40 }, data: { kind: "trigger", trigger: { type: "event", event: "task.added" } } },
      { id: "transform", type: "transform", position: { x: 640, y: 40 }, data: { kind: "transform", mapping: [] } },
    ];
    expect(legacy.every((n) => n.deletable === undefined)).toBe(true);
    expect(seedCanvasNodes(legacy).every((n) => n.deletable === false)).toBe(true);
  });
});
