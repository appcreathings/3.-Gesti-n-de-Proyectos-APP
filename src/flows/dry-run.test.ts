import { describe, it, expect, vi, beforeEach } from "vitest";
import { dryRunFlow } from "./dry-run";
import type { FlowRule } from "@/domain/schemas/flow";
import { newProject } from "@/domain/factories";

// Mock `fetchPollSampleForFlow` — el dry-run no debe llamar a red real
// durante los tests, solo probar las ramas ok/error del fetch.
vi.mock("./manual-run", () => ({
  fetchPollSampleForFlow: vi.fn(),
}));

import { fetchPollSampleForFlow } from "./manual-run";

const mockFetch = fetchPollSampleForFlow as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch.mockReset();
});

function makeProject(): ReturnType<typeof newProject> {
  const p = newProject("Test Project");
  p.id = "project-1";
  return p;
}

describe("dryRunFlow (spec 025 §C)", () => {
  describe("event-trigger flow", () => {
    const eventFlow: FlowRule = {
      id: "flow-event",
      schemaVersion: 12,
      name: "Notify on status change",
      enabled: false, // bypass: dry-run debe correr igual
      notifyOnFailure: true,
      trigger: { type: "event", event: "task.statusChanged" },
      logic: { conditions: [], mapping: [] },
      outputs: [
        { type: "createNotification", severity: "info", message: "Cambio: {{to}}" },
      ],
      lastRunAt: null,
      runCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("returns ok=true with a trace populated by the synthetic event", async () => {
      const result = await dryRunFlow(eventFlow, {
        projects: [makeProject()],
        people: [],
        projectTypes: [],
        checklistTemplates: [],
        processTemplates: [],
      });

      expect(result.ok).toBe(true);
      expect(result.trace).toBeDefined();
      expect(result.trace!.triggerMatched).toBe(true);
      expect(result.trace!.recordCount).toBeGreaterThan(0);
      // Output describe el plan, no ejecuta.
      const out = result.trace!.records[0].outputs[0];
      expect(out.outcome).toBe("executed");
      expect(out.plan).toContain("Se generaría una notificación");
      expect(out.plan).toContain("done"); // {{to}} interpolado del synthetic.
    });

    it("dry-run de evento con transformCode que lanza reporta error en la traza", async () => {
      const flow: FlowRule = {
        ...eventFlow,
        id: "flow-event-broken-transform",
        logic: {
          conditions: [],
          mapping: [],
          transformCode: "throw new Error('bad transform');",
        },
      };
      const result = await dryRunFlow(flow, {
        projects: [makeProject()],
        people: [],
        projectTypes: [],
        checklistTemplates: [],
        processTemplates: [],
      });

      expect(result.ok).toBe(true); // el dry-run OK; el error está en la traza
      const rec = result.trace!.records[0];
      expect(rec.transform?.error).toContain("bad transform");
      // No se ejecutaron outputs (transform falló → continue).
      expect(rec.outputs).toEqual([]);
    });

    // Spec 039 §B5 (CA-03.6): con el registro enriquecido, sembrar desde
    // `proj-123` —que no existe— haría que la simulación mostrara los campos
    // nuevos vacíos. Se siembra desde una entidad real cuando la hay.
    it("siembra el evento desde una entidad real y la simulación ve los datos legibles", async () => {
      const project = makeProject();
      project.tasks = [
        {
          id: "task-real",
          title: "Llamar a ACME",
          description: "",
          summary: "",
          status: "doing",
          priority: "high",
          assigneeId: null,
          dueDate: null,
          areaId: null,
          sourceItemId: null,
          sprintId: null,
          tags: [],
          comments: [],
          archived: false,
          estimate: null,
          subtasks: [],
          dedupeKey: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      const flow: FlowRule = {
        ...eventFlow,
        id: "flow-event-real-seed",
        outputs: [{ type: "createNotification", severity: "info", message: "Tarea: {{task.title}}" }],
      };

      const result = await dryRunFlow(flow, {
        projects: [project],
        people: [],
        projectTypes: [],
        checklistTemplates: [],
        processTemplates: [],
      });

      expect(result.ok).toBe(true);
      const rec = result.trace!.records[0];
      expect(rec.record.taskId).toBe("task-real");
      expect(rec.record["task.title"]).toBe("Llamar a ACME");
      expect(result.trace!.records[0].outputs[0].plan).toContain("Llamar a ACME");
    });

    it("sin ninguna entidad que sirva de semilla, cae al sintético de ejemplos", async () => {
      // Un proyecto sin tareas no puede sembrar un `task.statusChanged`.
      const result = await dryRunFlow(eventFlow, {
        projects: [makeProject()],
        people: [],
        projectTypes: [],
        checklistTemplates: [],
        processTemplates: [],
      });

      expect(result.ok).toBe(true);
      const rec = result.trace!.records[0];
      expect(rec.record.projectId).toBe("proj-123");
      // El sintético lleva sólo los campos crudos: el enriquecimiento es del
      // motor y `proj-123` no existe, así que no resuelve nada.
      expect("task.title" in rec.record).toBe(false);
    });
  });

  describe("poll-trigger flow", () => {
    const pollFlow: FlowRule = {
      id: "flow-poll",
      schemaVersion: 12,
      name: "From HubSpot",
      enabled: true,
      notifyOnFailure: true,
      trigger: {
        type: "poll",
        provider: "hubspot",
        config: { connectionId: "conn-1", objectType: "contacts", fields: ["email"], filters: [], intervalMs: 300_000 },
      },
      logic: { conditions: [], mapping: [] },
      outputs: [{ type: "createTask", title: "Seguimiento a {{email}}", projectId: "project-1", projectRef: "explicit" }],
      lastRunAt: null,
      runCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it("returns ok=false with the fetch error when poll sample fetch fails", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, error: "Conexión inaccesible" });
      const result = await dryRunFlow(pollFlow, {
        projects: [makeProject()],
        people: [],
        projectTypes: [],
        checklistTemplates: [],
        processTemplates: [],
      });
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Conexión inaccesible");
      expect(result.trace).toBeUndefined();
    });

    it("returns ok=true and trace when poll sample fetch succeeds, without mutating projects", async () => {
      const project = makeProject();
      const beforeTasks = project.tasks.length;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        records: [{ email: "ana@example.com", firstname: "Ana" }],
      });

      const result = await dryRunFlow(pollFlow, {
        projects: [project],
        people: [],
        projectTypes: [],
        checklistTemplates: [],
        processTemplates: [],
      });

      expect(result.ok).toBe(true);
      expect(result.trace).toBeDefined();
      // No mutó el proyecto original.
      expect(project.tasks.length).toBe(beforeTasks);
      // Plan describe la tarea que se crearía.
      const out = result.trace!.records[0].outputs[0];
      expect(out.outcome).toBe("executed");
      expect(out.plan).toContain("Seguimiento a ana@example.com");
    });
  });
});