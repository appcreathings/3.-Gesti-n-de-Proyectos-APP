import { describe, it, expect } from "vitest";
import { migrateAutomationToFlow, migrateAutomationsToFlows, createEmptyFlow } from "./migration";
import type { AutomationRule } from "@/domain/schemas";

function makeRule(overrides: Partial<AutomationRule> = {}): AutomationRule {
  return {
    id: "rule-1",
    schemaVersion: 7,
    name: "Test rule",
    enabled: true,
    scope: { kind: "global" },
    trigger: { type: "task.statusChanged" },
    conditions: [],
    actions: [{ type: "createNotification", severity: "info", message: "Done" }],
    lastRunAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("migrateAutomationToFlow", () => {
  it("converts a supported trigger + action into a FlowRule", () => {
    const rule = makeRule();
    const flow = migrateAutomationToFlow(rule);

    expect(flow).not.toBeNull();
    expect(flow!.trigger).toEqual({ type: "event", event: "task.statusChanged" });
    expect(flow!.outputs).toEqual([{ type: "createNotification", severity: "info", message: "Done" }]);
  });

  it("returns null for a schedule/date trigger with no FlowRule equivalent", () => {
    expect(migrateAutomationToFlow(makeRule({ trigger: { type: "schedule", cadence: "daily" } }))).toBeNull();
    expect(migrateAutomationToFlow(makeRule({ trigger: { type: "date.due" } }))).toBeNull();
    expect(migrateAutomationToFlow(makeRule({ trigger: { type: "date.approaching" } }))).toBeNull();
    expect(migrateAutomationToFlow(makeRule({ trigger: { type: "app.opened" } }))).toBeNull();
  });

  it("drops actions with no FlowRule output equivalent, keeping the rest", () => {
    const rule = makeRule({
      actions: [
        { type: "createChecklistFromTemplate", templateId: "tpl-1" },
        { type: "createTask", title: "Follow up" },
      ],
    });
    const flow = migrateAutomationToFlow(rule);

    expect(flow!.outputs).toEqual([
      { type: "createTask", title: "Follow up", areaId: undefined, priority: undefined, projectRef: "explicit" },
    ]);
  });
});

describe("migrateAutomationsToFlows", () => {
  it("migrates supported rules and reports the ones it skipped, with a reason", () => {
    const supported = makeRule({ id: "rule-a" });
    const unsupportedTrigger = makeRule({ id: "rule-b", name: "App opened", trigger: { type: "app.opened" } });
    const emptiedOut = makeRule({
      id: "rule-c",
      name: "Only unsupported actions",
      actions: [{ type: "recreateRecurringChecklist", checklistId: "cl-1" }],
    });

    const { flows, skipped } = migrateAutomationsToFlows([supported, unsupportedTrigger, emptiedOut]);

    expect(flows).toHaveLength(1);
    expect(flows[0].id).toBe("rule-a");
    expect(skipped.map((s) => s.ruleId)).toEqual(["rule-b", "rule-c"]);
    expect(skipped.every((s) => s.reason.length > 0)).toBe(true);
  });

  it("returns no flows and no skips for an empty input", () => {
    expect(migrateAutomationsToFlows([])).toEqual({ flows: [], skipped: [] });
  });
});

describe("createEmptyFlow", () => {
  it("creates a valid default flow with no outputs", () => {
    const flow = createEmptyFlow("New flow");

    expect(flow.name).toBe("New flow");
    expect(flow.enabled).toBe(true);
    expect(flow.trigger).toEqual({ type: "event", event: "task.statusChanged" });
    expect(flow.outputs).toEqual([]);
  });
});
