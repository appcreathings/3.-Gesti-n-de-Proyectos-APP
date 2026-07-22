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

  it("flags a webhook without URL as error; an empty secret is NOT flagged (spec 034 §A: modo Simple)", () => {
    const flow = makeFlow({
      outputs: [{ type: "webhook", url: "", secret: "" }],
    });
    const issues = validateFlow(flow, deps);
    expect(flowErrors(issues)).toHaveLength(1);
    expect(flowErrors(issues)[0]).toMatchObject({ nodeKind: "action", outputIndex: 0 });
    // El modo Simple (sin secreto) es válido y recomendado — sin warnings.
    const warnings = issues.filter((i) => i.severity === "warning");
    expect(warnings).toHaveLength(0);
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

  // Spec 039 §C3 (CA-04.5, R2). `applyMapping` REEMPLAZA el registro por los
  // `target` cuando hay mapeo, así que validar contra los campos del trigger
  // fallaba en las DOS direcciones. Un test por dirección.
  describe("tokens huérfanos con mapeo configurado (spec 039 CA-04.5)", () => {
    const dealsTrigger: Trigger = {
      type: "poll",
      provider: "hubspot",
      config: { connectionId: "c1", objectType: "deals", fields: [], filters: [], intervalMs: 300_000 },
    };

    it("AHORA avisa del token que apunta a un campo PRE-mapeo (antes callaba)", () => {
      const flow = makeFlow({
        trigger: dealsTrigger,
        logic: { conditions: [], mapping: [{ source: "dealname", target: "title" }] },
        outputs: [{ type: "createNotification", severity: "info", message: "Deal: {{dealname}}" }],
        lastSample: [{ dealname: "ACME" }],
      });
      const issues = validateFlow(flow, deps);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({ severity: "warning", nodeKind: "action", outputIndex: 0 });
      expect(issues[0].message).toContain("{{dealname}}");
      // El mensaje nombra la CAUSA, no solo el síntoma (R2).
      expect(issues[0].message).toContain("Transformar renombró los campos");
      expect(issues[0].message).toContain("`title`");
    });

    it("DEJA de avisar del token que apunta a un `target` (antes avisaba en falso)", () => {
      const flow = makeFlow({
        trigger: dealsTrigger,
        logic: { conditions: [], mapping: [{ source: "dealname", target: "title" }] },
        outputs: [{ type: "createNotification", severity: "info", message: "Deal: {{title}}" }],
        lastSample: [{ dealname: "ACME" }],
      });
      expect(validateFlow(flow, deps)).toEqual([]);
    });

    it("es un warning, no un error: no bloquea guardar ni activar", () => {
      const flow = makeFlow({
        trigger: dealsTrigger,
        logic: { conditions: [], mapping: [{ source: "dealname", target: "title" }] },
        outputs: [{ type: "createNotification", severity: "info", message: "Deal: {{dealname}}" }],
        lastSample: [{ dealname: "ACME" }],
      });
      expect(flowErrors(validateFlow(flow, deps))).toEqual([]);
    });

    it("con transformCode no avisa: la lista post-mapeo no es exhaustiva (CA-04.6)", () => {
      const flow = makeFlow({
        trigger: dealsTrigger,
        logic: {
          conditions: [],
          mapping: [{ source: "dealname", target: "title" }],
          transformCode: "record.extra = 1; return record;",
        },
        outputs: [{ type: "createNotification", severity: "info", message: "Deal: {{extra}}" }],
        lastSample: [{ dealname: "ACME" }],
      });
      expect(validateFlow(flow, deps)).toEqual([]);
    });

    it("sin mapeo el mensaje no habla del Transformar", () => {
      const flow = makeFlow({
        trigger: dealsTrigger,
        outputs: [{ type: "createNotification", severity: "info", message: "Deal: {{noexiste}}" }],
        lastSample: [{ dealname: "ACME" }],
      });
      const issues = validateFlow(flow, deps);
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain("no existe en la muestra");
      expect(issues[0].message).not.toContain("Transformar");
    });
  });
});
