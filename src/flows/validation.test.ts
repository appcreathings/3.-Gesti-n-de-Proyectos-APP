import { describe, it, expect } from "vitest";
import { validateFlow, flowErrors, type FlowIssue } from "./validation";
import type { FlowRule, Output, Trigger } from "@/domain/schemas/flow";
import { newProject } from "@/domain/factories";

const eventTrigger: Trigger = { type: "event", event: "task.statusChanged" };

function makeFlow(overrides: Partial<FlowRule> = {}): FlowRule {
  return {
    id: "flow-1",
    schemaVersion: 14,
    name: "Test",
    enabled: true,
    notifyOnFailure: true,
    trigger: eventTrigger,
    logic: { conditions: [], mapping: [] },
    outputs: [{ type: "createNotification", severity: "info", message: "hola" }],
    lastRunAt: null,
    runCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function messages(issues: FlowIssue[]): string[] {
  return issues.map((i) => i.message);
}

describe("validateFlow (spec 027 §A)", () => {
  const project = (() => {
    const p = newProject("Proyecto real");
    p.id = "proj-1";
    return p;
  })();
  const deps = { projects: [project] };

  it("returns [] for a valid flow", () => {
    expect(validateFlow(makeFlow(), deps)).toEqual([]);
  });

  it("flags a poll trigger without connection as error", () => {
    const flow = makeFlow({
      trigger: {
        type: "poll",
        provider: "hubspot",
        config: { connectionId: "", objectType: "deals", fields: [], filters: [], intervalMs: 300_000 },
      },
    });
    const issues = validateFlow(flow, deps);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "error", nodeKind: "trigger" });
    expect(issues[0].message).toContain("HubSpot");
  });

  it("flags a flow without outputs as error", () => {
    const issues = validateFlow(makeFlow({ outputs: [] }), deps);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "error", nodeKind: "flow" });
  });

  it("flags a webhook without URL as error and without secret as warning", () => {
    const flow = makeFlow({
      outputs: [{ type: "webhook", url: "", secret: "" }],
    });
    const issues = validateFlow(flow, deps);
    expect(flowErrors(issues)).toHaveLength(1);
    expect(flowErrors(issues)[0]).toMatchObject({ nodeKind: "action", outputIndex: 0 });
    const warnings = issues.filter((i) => i.severity === "warning");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain("secret");
  });

  it("flags an unparseable webhook URL as error", () => {
    const flow = makeFlow({
      outputs: [{ type: "webhook", url: "no-es-una-url", secret: "s" }],
    });
    const errors = flowErrors(validateFlow(flow, deps));
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("no es válida");
  });

  it("flags an email without connection and without recipient as two errors", () => {
    const flow = makeFlow({
      outputs: [{ type: "email", connectionId: "", to: "", subject: "s", body: "b" }],
    });
    const errors = flowErrors(validateFlow(flow, deps));
    expect(errors).toHaveLength(2);
    expect(messages(errors).join(" ")).toContain("conexión");
    expect(messages(errors).join(" ")).toContain("destinatario");
  });

  it("flags a createTask explicit without projectId as error", () => {
    const flow = makeFlow({
      outputs: [{ type: "createTask", title: "T", projectRef: "explicit" }],
    });
    const errors = flowErrors(validateFlow(flow, deps));
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("proyecto destino");
  });

  it("flags a createTask pointing to a nonexistent project as error", () => {
    const flow = makeFlow({
      outputs: [{ type: "createTask", title: "T", projectRef: "explicit", projectId: "borrado" }],
    });
    const errors = flowErrors(validateFlow(flow, deps));
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("ya no existe");
  });

  it("accepts a createTask pointing to an existing project", () => {
    const flow = makeFlow({
      outputs: [{ type: "createTask", title: "T", projectRef: "explicit", projectId: "proj-1" }],
    });
    expect(validateFlow(flow, deps)).toEqual([]);
  });

  it("flags createTask projectRef=createdProject without a prior createProject as error", () => {
    const flow = makeFlow({
      outputs: [{ type: "createTask", title: "T", projectRef: "createdProject" }],
    });
    const errors = flowErrors(validateFlow(flow, deps));
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Crear Proyecto");
  });

  it("accepts createTask projectRef=createdProject when a createProject comes BEFORE it", () => {
    const outputs: Output[] = [
      { type: "createProject", name: "{{dealname}}", fields: [] },
      { type: "createTask", title: "T", projectRef: "createdProject" },
    ];
    expect(validateFlow(makeFlow({ outputs }), deps)).toEqual([]);
  });

  it("still flags createdProject when the createProject comes AFTER the task", () => {
    const outputs: Output[] = [
      { type: "createTask", title: "T", projectRef: "createdProject" },
      { type: "createProject", name: "{{dealname}}", fields: [] },
    ];
    const errors = flowErrors(validateFlow(makeFlow({ outputs }), deps));
    expect(errors).toHaveLength(1);
    expect(errors[0].outputIndex).toBe(0);
  });

  it("flags a createProject with empty name as error", () => {
    const flow = makeFlow({ outputs: [{ type: "createProject", name: "", fields: [] }] });
    const errors = flowErrors(validateFlow(flow, deps));
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("nombre");
  });

  it("flags a setField without field as error", () => {
    const flow = makeFlow({ outputs: [{ type: "setField", field: "", value: "x" }] });
    const errors = flowErrors(validateFlow(flow, deps));
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("campo");
  });

  it("flags a condition with empty field as warning with its index", () => {
    const flow = makeFlow({
      logic: {
        conditions: [
          { field: "to", op: "==", value: "done" },
          { field: "", op: "==", value: "" },
        ],
        mapping: [],
      },
    });
    const issues = validateFlow(flow, deps);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "warning", nodeKind: "condition", outputIndex: 1 });
  });

  it("warns about orphan tokens ONLY when a persisted sample exists", () => {
    const outputs: Output[] = [
      { type: "createNotification", severity: "info", message: "Deal: {{noexiste}}" },
    ];

    // Sin muestra: sin información para advertir.
    expect(validateFlow(makeFlow({ outputs }), deps)).toEqual([]);

    // Con muestra: warning con el token exacto.
    const flow = makeFlow({
      outputs,
      trigger: {
        type: "poll",
        provider: "hubspot",
        config: { connectionId: "c1", objectType: "deals", fields: [], filters: [], intervalMs: 300_000 },
      },
      lastSample: [{ dealname: "ACME", amount: "5000" }],
    });
    const issues = validateFlow(flow, deps);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ severity: "warning", nodeKind: "action", outputIndex: 0 });
    expect(issues[0].message).toContain("{{noexiste}}");
  });

  it("does not warn about tokens present in the sample", () => {
    const flow = makeFlow({
      outputs: [{ type: "createNotification", severity: "info", message: "Deal: {{dealname}}" }],
      trigger: {
        type: "poll",
        provider: "hubspot",
        config: { connectionId: "c1", objectType: "deals", fields: [], filters: [], intervalMs: 300_000 },
      },
      lastSample: [{ dealname: "ACME" }],
    });
    expect(validateFlow(flow, deps)).toEqual([]);
  });
});
