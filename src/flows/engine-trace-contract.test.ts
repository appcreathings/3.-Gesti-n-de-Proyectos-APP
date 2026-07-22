import { describe, it, expect, vi, afterEach } from "vitest";
import { runFlowEngine } from "./engine";
import type { FlowRule, Output, FlowCondition } from "@/domain/schemas/flow";
import type { DomainEvent } from "@/automations/events";
import { newProject } from "@/domain/factories";
import type { Project } from "@/domain/schemas";

/**
 * Contrato posicional traza↔configuración (spec 038 §D1, R2).
 *
 * La proyección de la simulación sobre el canvas (`trace-projection.ts`)
 * depende de que `recordTrace.conditions[i]` y `recordTrace.outputs[i]` sean
 * 1:1 con `flow.logic.conditions` y `flow.outputs`. Hoy lo son, pero es una
 * **propiedad emergente** del motor: nada lo garantizaba. Estos tests la fijan
 * ANTES de construir UI encima, para que si algún día alguien reordena los
 * `push` falle aquí y no una pantalla en silencio.
 *
 * `engine.ts` no se modifica: es un test *sobre* comportamiento existente.
 */
describe("Contrato posicional de la traza (spec 038 §D1 / R2)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const project = (): Project => {
    const p = newProject("Proyecto de prueba");
    p.id = "project-1";
    return p;
  };

  const changeEvent: DomainEvent = {
    type: "task.statusChanged",
    projectId: "project-1",
    taskId: "task-1",
    from: "todo",
    to: "done",
  };

  const flowWith = (
    conditions: FlowCondition[],
    outputs: Output[],
    extra: Partial<FlowRule> = {},
  ): FlowRule => ({
    id: "flow-contract",
    schemaVersion: 14,
    name: "Contrato",
    enabled: true,
    notifyOnFailure: true,
    trigger: { type: "event", event: "task.statusChanged" },
    logic: { conditions, mapping: [] },
    outputs,
    lastRunAt: null,
    runCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...extra,
  });

  const run = (flow: FlowRule) =>
    runFlowEngine({
      flows: [flow],
      events: [changeEvent],
      projects: [project()],
      people: [],
      checklistTemplates: [],
      projectTypes: [],
      processTemplates: [],
      trace: true,
    });

  const notification = (message: string): Output => ({
    type: "createNotification",
    severity: "info",
    message,
  });

  it("conditions[i] es la i-ésima condición configurada, en el mismo orden", async () => {
    const conditions: FlowCondition[] = [
      { field: "to", op: "==", value: "done" },
      { field: "from", op: "!=", value: "done" },
      { field: "taskId", op: "contains", value: "task" },
    ];
    const result = await run(flowWith(conditions, [notification("ok")]));

    const record = result.traces["flow-contract"]!.records[0];
    expect(record.conditions).toHaveLength(conditions.length);
    conditions.forEach((c, i) => {
      expect(record.conditions[i].field).toBe(c.field);
      expect(record.conditions[i].op).toBe(c.op);
      expect(record.conditions[i].expected).toBe(c.value);
    });
    expect(record.conditions.every((c) => c.passed)).toBe(true);
    expect(record.conditionsPassed).toBe(true);
  });

  it("una condición que no se cumple queda en SU índice, sin desplazar a las demás", async () => {
    const result = await run(
      flowWith(
        [
          { field: "to", op: "==", value: "done" },
          { field: "from", op: "==", value: "bloqueada" }, // no se cumple
          { field: "type", op: "==", value: "task.statusChanged" },
        ],
        [notification("ok")],
      ),
    );

    const record = result.traces["flow-contract"]!.records[0];
    expect(record.conditions.map((c) => c.passed)).toEqual([true, false, true]);
    expect(record.conditions[1].actual).toBe("todo");
  });

  it("outputs[i] es el i-ésimo output, incluidos los `skipped` de la política \"detener\"", async () => {
    // El webhook del índice 1 falla (HTTP 400) y la política es "detener": el
    // output 2 no se ejecuta, pero SÍ queda en la traza — si no, la acción 3
    // del canvas se proyectaría con el desenlace de otra acción.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 400 })));

    const outputs: Output[] = [
      notification("primera"),
      { type: "webhook", url: "https://example.com/hook", secret: "s" },
      notification("tercera"),
    ];
    const result = await run(flowWith([], outputs, { onErrorPolicy: "stop" }));

    const record = result.traces["flow-contract"]!.records[0];
    expect(record.outputs).toHaveLength(outputs.length);
    expect(record.outputs.map((o) => o.type)).toEqual(outputs.map((o) => o.type));
    expect(record.outputs.map((o) => o.outcome)).toEqual(["executed", "error", "skipped"]);
    // La acción posterior no corrió de verdad: solo la primera notificó.
    expect(result.notifications).toHaveLength(1);
  });

  it("con política \"continuar\", el fallo tampoco desplaza los índices", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 400 })));

    const outputs: Output[] = [
      { type: "webhook", url: "https://example.com/hook", secret: "s" },
      notification("sigue"),
    ];
    const result = await run(flowWith([], outputs));

    const record = result.traces["flow-contract"]!.records[0];
    expect(record.outputs).toHaveLength(2);
    expect(record.outputs.map((o) => o.outcome)).toEqual(["error", "executed"]);
  });

  it("si las condiciones no pasan, outputs queda VACÍO (no 'omitidas por error')", async () => {
    const result = await run(
      flowWith([{ field: "to", op: "==", value: "archivada" }], [notification("a"), notification("b")]),
    );

    const record = result.traces["flow-contract"]!.records[0];
    expect(record.conditionsPassed).toBe(false);
    // Vacío ≠ "todas omitidas": es "no se llegó" — la distinción que sostiene
    // el estado `not-reached` de la proyección (CA-04.3).
    expect(record.outputs).toEqual([]);
  });

  it("si el código de transformación falla, outputs también queda vacío", async () => {
    const result = await run(
      flowWith([], [notification("a")], {
        logic: { conditions: [], mapping: [], transformCode: "return record.nope.nope;" },
      }),
    );

    const record = result.traces["flow-contract"]!.records[0];
    expect(record.conditionsPassed).toBe(true);
    expect(record.transform?.error).toBeTruthy();
    expect(record.outputs).toEqual([]);
  });
});
