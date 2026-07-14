import { describe, it, expect, vi, afterEach } from "vitest";
import { runFlowEngine, pollTriggerKey } from "./engine";
import type { FlowRule, PollTrigger } from "@/domain/schemas/flow";
import type { DomainEvent } from "@/automations/events";
import type { Project } from "@/domain/schemas";
import { newProject, newTask } from "@/domain/factories";

vi.mock("@/integrations/outbound/email-via-apps-script", () => ({
  sendEmailViaAppsScript: vi.fn(),
}));
vi.mock("@/integrations/connections", () => ({
  getConnection: vi.fn(),
}));

describe("FlowEngine", () => {
  const createTestProject = (): Project => {
    const project = newProject("Test Project");
    project.id = "project-1";
    return project;
  };

  describe("Event Trigger", () => {
    it("executes flow when event matches", async () => {
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 7,
        name: "Test Flow",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.statusChanged" },
        logic: { conditions: [], mapping: [] },
        outputs: [
          {
            type: "createNotification",
            severity: "info",
            message: "Task changed",
          },
        ],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const events: DomainEvent[] = [
        {
          type: "task.statusChanged",
          projectId: "project-1",
          taskId: "task-1",
          from: "todo",
          to: "done",
        },
      ];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].message).toBe("Task changed");
    });

    it("skips flow when event does not match", async () => {
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 7,
        name: "Test Flow",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.statusChanged" },
        logic: { conditions: [], mapping: [] },
        outputs: [
          {
            type: "createNotification",
            severity: "info",
            message: "Task changed",
          },
        ],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const events: DomainEvent[] = [
        {
          type: "project.statusChanged",
          projectId: "project-1",
          from: "active",
          to: "done",
        },
      ];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.notifications).toHaveLength(0);
    });

    it("skips disabled flows", async () => {
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 7,
        name: "Test Flow",
        enabled: false,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.statusChanged" },
        logic: { conditions: [], mapping: [] },
        outputs: [
          {
            type: "createNotification",
            severity: "info",
            message: "Task changed",
          },
        ],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const events: DomainEvent[] = [
        {
          type: "task.statusChanged",
          projectId: "project-1",
          taskId: "task-1",
          from: "todo",
          to: "done",
        },
      ];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.notifications).toHaveLength(0);
    });
  });

  describe("Conditions", () => {
    it("filters records by conditions", async () => {
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 7,
        name: "Test Flow",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.statusChanged" },
        logic: {
          conditions: [{ field: "to", op: "==", value: "done" }],
          mapping: [],
        },
        outputs: [
          {
            type: "createNotification",
            severity: "info",
            message: "Task completed",
          },
        ],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const events: DomainEvent[] = [
        {
          type: "task.statusChanged",
          projectId: "project-1",
          taskId: "task-1",
          from: "todo",
          to: "doing",
        },
      ];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.notifications).toHaveLength(0);
    });

    // Spec 024 §F6 (fix): HubSpot (y fuentes externas en general) suele
    // devolver campos numéricos como string — antes `>`/`>=`/`<`/`<=`
    // exigían `typeof === "number"` en ambos lados, así que una condición
    // como "monto > 1000" nunca pasaba contra un deal real, sin ningún error
    // visible para el usuario.
    const numericStringFlow = (op: ">" | ">=" | "<" | "<=", value: unknown): FlowRule => ({
      id: "flow-1",
      schemaVersion: 11,
      name: "Numeric coercion flow",
      enabled: true,
      notifyOnFailure: true,
      trigger: {
        type: "poll",
        provider: "hubspot",
        config: { connectionId: "conn-1", objectType: "deals", fields: [], filters: [], intervalMs: 300_000 },
      },
      logic: { conditions: [{ field: "amount", op, value }], mapping: [] },
      outputs: [{ type: "createNotification", severity: "info", message: "Big deal" }],
      lastRunAt: null,
      runCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    it("passes a numeric comparison when the record's value arrives as a string (HubSpot-style)", async () => {
      const externalData = new Map([["hubspot:conn-1:deals", [{ amount: "5000" }]]]);
      const result = await runFlowEngine({
        flows: [numericStringFlow(">", 1000)],
        events: [],
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
        externalData,
      });
      expect(result.notifications).toHaveLength(1);
    });

    it("passes a numeric comparison when the condition's own configured value is a string", async () => {
      const externalData = new Map([["hubspot:conn-1:deals", [{ amount: 5000 }]]]);
      const result = await runFlowEngine({
        flows: [numericStringFlow(">=", "1000")],
        events: [],
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
        externalData,
      });
      expect(result.notifications).toHaveLength(1);
    });

    it("does not coerce a genuinely non-numeric string and fails the condition safely", async () => {
      const externalData = new Map([["hubspot:conn-1:deals", [{ amount: "n/a" }]]]);
      const result = await runFlowEngine({
        flows: [numericStringFlow(">", 1000)],
        events: [],
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
        externalData,
      });
      expect(result.notifications).toHaveLength(0);
    });

    it("correctly rejects a numeric-string comparison that doesn't hold", async () => {
      const externalData = new Map([["hubspot:conn-1:deals", [{ amount: "500" }]]]);
      const result = await runFlowEngine({
        flows: [numericStringFlow(">", 1000)],
        events: [],
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
        externalData,
      });
      expect(result.notifications).toHaveLength(0);
    });
  });

  describe("pollTriggerKey (spec 024 §F10)", () => {
    it("includes connectionId so two connections of the same provider/objectType never share a key", () => {
      const hubspotA: PollTrigger = {
        type: "poll",
        provider: "hubspot",
        config: { connectionId: "conn-a", objectType: "contacts", fields: [], filters: [], intervalMs: 300_000 },
      };
      const hubspotB: PollTrigger = { ...hubspotA, config: { ...hubspotA.config, connectionId: "conn-b" } };
      const sheetsA: PollTrigger = {
        type: "poll",
        provider: "google-sheets",
        config: { connectionId: "conn-a", fields: [], filters: [], intervalMs: 300_000 },
      };
      const sheetsB: PollTrigger = { ...sheetsA, config: { ...sheetsA.config, connectionId: "conn-b" } };

      expect(pollTriggerKey(hubspotA)).not.toBe(pollTriggerKey(hubspotB));
      expect(pollTriggerKey(sheetsA)).not.toBe(pollTriggerKey(sheetsB));
      // Misma conexión + mismo objectType → misma key (determinístico).
      expect(pollTriggerKey(hubspotA)).toBe(pollTriggerKey({ ...hubspotA }));
    });
  });

  describe("Poll Trigger", () => {
    it("processes external data from polling", async () => {
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 7,
        name: "HubSpot Sync",
        enabled: true,
        notifyOnFailure: true,
        trigger: {
          type: "poll",
          provider: "hubspot",
          config: {
            connectionId: "conn-1",
            objectType: "contacts",
            fields: ["email", "firstname"],
            filters: [],
            intervalMs: 300000,
          },
        },
        logic: {
          conditions: [],
          mapping: [
            { source: "email", target: "email" },
            { source: "firstname", target: "name" },
          ],
        },
        outputs: [
          {
            type: "createPerson",
            matchField: "email",
            ifNotFound: "create",
            data: {
              email: "{{email}}",
              name: "{{name}}",
            },
          },
        ],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const externalData = new Map<string, Record<string, unknown>[]>();
      externalData.set("hubspot:conn-1:contacts", [
        { email: "jane@example.com", firstname: "Jane" },
      ]);

      const result = await runFlowEngine({
        flows: [flow],
        events: [],
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
        externalData,
      });

      expect(result.newPeople).toHaveLength(1);
      expect(result.newPeople[0].email).toBe("jane@example.com");
      expect(result.newPeople[0].name).toBe("Jane");
    });

    it("does not leak records between two flows polling the same provider/objectType via different connections (spec 024 §F10)", async () => {
      // Antes, `pollTriggerKey` solo dependía de provider+objectType — dos
      // flujos de HubSpot contacts con conexiones distintas mapeaban a la
      // MISMA key ("hubspot"), así que ambos habrían recibido los mismos
      // registros aunque vinieran de cuentas de HubSpot completamente
      // distintas. Ahora la key incluye `connectionId`, así que cada flujo
      // solo procesa los registros de su propia conexión.
      const pollTrigger = (connectionId: string): FlowRule["trigger"] => ({
        type: "poll",
        provider: "hubspot",
        config: { connectionId, objectType: "contacts", fields: [], filters: [], intervalMs: 300_000 },
      });

      const flowA: FlowRule = {
        id: "flow-a",
        schemaVersion: 10,
        name: "Sync conexión A",
        enabled: true,
        notifyOnFailure: true,
        trigger: pollTrigger("conn-a"),
        logic: { conditions: [], mapping: [{ source: "email", target: "email" }] },
        outputs: [{ type: "createPerson", matchField: "email", ifNotFound: "create", data: { email: "{{email}}" } }],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const flowB: FlowRule = { ...flowA, id: "flow-b", name: "Sync conexión B", trigger: pollTrigger("conn-b") };

      const externalData = new Map<string, Record<string, unknown>[]>();
      externalData.set("hubspot:conn-a:contacts", [{ email: "a@conn-a.com" }]);
      externalData.set("hubspot:conn-b:contacts", [{ email: "b@conn-b.com" }]);

      const result = await runFlowEngine({
        flows: [flowA, flowB],
        events: [],
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
        externalData,
      });

      expect(result.newPeople.map((p) => p.email).sort()).toEqual(["a@conn-a.com", "b@conn-b.com"]);
      expect(result.executedFlowIds.sort()).toEqual(["flow-a", "flow-b"]);
    });
  });

  describe("Multiple Outputs", () => {
    it("executes all outputs for each record", async () => {
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 7,
        name: "Multi Output Flow",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.statusChanged" },
        logic: { conditions: [], mapping: [] },
        outputs: [
          {
            type: "createNotification",
            severity: "info",
            message: "Task changed",
          },
          {
            type: "webhook",
            url: "https://example.com/webhook",
            secret: "secret123",
          },
        ],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const events: DomainEvent[] = [
        {
          type: "task.statusChanged",
          projectId: "project-1",
          taskId: "task-1",
          from: "todo",
          to: "done",
        },
      ];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.notifications).toHaveLength(1);
      expect(result.outboundDeliveries).toHaveLength(1);
      expect(result.outboundDeliveries[0].url).toBe("https://example.com/webhook");
    });
  });

  // Spec 024 §F2: antes de este fix, un webhook/email que fallaba por red se
  // registraba igual como "executed" — el run entero terminaba marcado
  // "Ejecutado correctamente" en el historial aunque la entrega real jamás
  // saliera. Estos tests fijan el comportamiento correcto: un fallo real
  // debe contar como error del output, no como éxito.
  describe("Webhook/Email failure handling (spec 024 §F2)", () => {
    const webhookFlow = (): FlowRule => ({
      id: "flow-webhook",
      schemaVersion: 10,
      name: "Webhook Flow",
      enabled: true,
      notifyOnFailure: true,
      trigger: { type: "event", event: "task.statusChanged" },
      logic: { conditions: [], mapping: [] },
      outputs: [{ type: "webhook", url: "https://example.com/webhook", secret: "secret123" }],
      lastRunAt: null,
      runCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const emailFlow = (): FlowRule => ({
      id: "flow-email",
      schemaVersion: 10,
      name: "Email Flow",
      enabled: true,
      notifyOnFailure: true,
      trigger: { type: "event", event: "task.statusChanged" },
      logic: { conditions: [], mapping: [] },
      outputs: [{ type: "email", connectionId: "conn-1", to: "a@example.com", subject: "Hi", body: "Body" }],
      lastRunAt: null,
      runCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const changeEvent: DomainEvent = {
      type: "task.statusChanged",
      projectId: "project-1",
      taskId: "task-1",
      from: "todo",
      to: "done",
    };

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.clearAllMocks();
    });

    it("does not count a webhook that fails on network error as executed", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("fetch failed"))
      );

      const result = await runFlowEngine({
        flows: [webhookFlow()],
        events: [changeEvent],
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.executedFlowIds).not.toContain("flow-webhook");
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stage).toBe("output");
      expect(result.errors[0].message).toContain("Entrega fallida");
      // El intento igual queda registrado, aunque haya fallado.
      expect(result.outboundDeliveries).toHaveLength(1);
    });

    it("does not count a webhook that responds non-2xx as executed", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response(null, { status: 500 }))
      );

      const result = await runFlowEngine({
        flows: [webhookFlow()],
        events: [changeEvent],
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.executedFlowIds).not.toContain("flow-webhook");
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("500");
    });

    it("counts a webhook that responds 2xx as executed, with no errors", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
      );

      const result = await runFlowEngine({
        flows: [webhookFlow()],
        events: [changeEvent],
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.executedFlowIds).toContain("flow-webhook");
      expect(result.errors).toHaveLength(0);
    });

    it("does not count a failed email send as executed", async () => {
      const { getConnection } = await import("@/integrations/connections");
      const { sendEmailViaAppsScript } = await import("@/integrations/outbound/email-via-apps-script");
      vi.mocked(getConnection).mockResolvedValue({
        id: "conn-1",
        provider: "email",
        name: "Test email",
        config: { proxyUrl: "https://script.google.com/macros/s/abc/exec", fromEmail: "from@example.com" },
        encryptedSecret: null,
        enabled: true,
        lastTestedAt: null,
        lastTestOk: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      vi.mocked(sendEmailViaAppsScript).mockResolvedValue({ success: false, error: "Email proxy error: 500" });

      const result = await runFlowEngine({
        flows: [emailFlow()],
        events: [changeEvent],
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.executedFlowIds).not.toContain("flow-email");
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Envío fallido");
      expect(result.emailDeliveries).toHaveLength(1);
    });

    it("counts a successful email send as executed, with no errors", async () => {
      const { getConnection } = await import("@/integrations/connections");
      const { sendEmailViaAppsScript } = await import("@/integrations/outbound/email-via-apps-script");
      vi.mocked(getConnection).mockResolvedValue({
        id: "conn-1",
        provider: "email",
        name: "Test email",
        config: { proxyUrl: "https://script.google.com/macros/s/abc/exec", fromEmail: "from@example.com" },
        encryptedSecret: null,
        enabled: true,
        lastTestedAt: null,
        lastTestOk: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      vi.mocked(sendEmailViaAppsScript).mockResolvedValue({ success: true });

      const result = await runFlowEngine({
        flows: [emailFlow()],
        events: [changeEvent],
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.executedFlowIds).toContain("flow-email");
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Transform Code", () => {
    it("applies custom transformation", async () => {
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 7,
        name: "Transform Flow",
        enabled: true,
        notifyOnFailure: true,
        trigger: {
          type: "poll",
          provider: "hubspot",
          config: {
            connectionId: "conn-1",
            objectType: "contacts",
            fields: ["email", "name"],
            filters: [],
            intervalMs: 300000,
          },
        },
        logic: {
          conditions: [],
          mapping: [
            { source: "email", target: "email" },
            { source: "name", target: "name" },
          ],
          transformCode: "record.name = record.name.toUpperCase(); return record;",
        },
        outputs: [
          {
            type: "createPerson",
            matchField: "email",
            ifNotFound: "create",
            data: {
              email: "{{email}}",
              name: "{{name}}",
            },
          },
        ],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const externalData = new Map<string, Record<string, unknown>[]>();
      externalData.set("hubspot:conn-1:contacts", [
        { email: "jane@example.com", name: "Jane" },
      ]);

      const result = await runFlowEngine({
        flows: [flow],
        events: [],
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
        externalData,
      });

      expect(result.newPeople).toHaveLength(1);
      expect(result.newPeople[0].name).toBe("JANE");
    });
  });

  describe("Targeting", () => {
    const createSecondProject = (): Project => {
      const project = newProject("Other Project");
      project.id = "project-2";
      return project;
    };

    it("createTask targets the project from the triggering event, not the first project in the map", async () => {
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 7,
        name: "Task Flow",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "checklist.completed" },
        logic: { conditions: [], mapping: [] },
        outputs: [{ type: "createTask", title: "Follow up", projectRef: "explicit" }],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // "project-1" is inserted first in the map but the event targets "project-2".
      const events: DomainEvent[] = [
        { type: "checklist.completed", projectId: "project-2", areaId: "area-1", checklistId: "cl-1" },
      ];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [createTestProject(), createSecondProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.changedProjects).toHaveLength(1);
      expect(result.changedProjects[0].id).toBe("project-2");
      expect(result.changedProjects[0].tasks).toHaveLength(1);
      expect(result.changedProjects[0].tasks[0].title).toBe("Follow up");
    });

    it("does not mutate unrelated projects (change tracking is precise, not all-projects)", async () => {
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 7,
        name: "Status Flow",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "project.statusChanged" },
        logic: { conditions: [], mapping: [] },
        outputs: [{ type: "setProjectStatus", status: "done" }],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const events: DomainEvent[] = [
        { type: "project.statusChanged", projectId: "project-1", from: "active", to: "done" },
      ];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [createTestProject(), createSecondProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.changedProjects.map((p) => p.id)).toEqual(["project-1"]);
    });

    it("skips the output (without throwing) when the target project can't be resolved", async () => {
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 7,
        name: "Orphan Flow",
        enabled: true,
        notifyOnFailure: true,
        // Poll triggers have no source project — createTask needs an explicit projectId.
        trigger: {
          type: "poll",
          provider: "hubspot",
          config: {
            connectionId: "conn-1",
            objectType: "contacts",
            fields: [],
            filters: [],
            intervalMs: 300000,
          },
        },
        logic: { conditions: [], mapping: [] },
        outputs: [{ type: "createTask", title: "Untargeted", projectRef: "explicit" }],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const externalData = new Map<string, Record<string, unknown>[]>();
      externalData.set("hubspot:conn-1:contacts", [{ email: "x@example.com" }]);

      const result = await runFlowEngine({
        flows: [flow],
        events: [],
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
        externalData,
      });

      expect(result.changedProjects).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it("createNotification links entityRef to the event's project/task", async () => {
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 7,
        name: "Notify Flow",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.statusChanged" },
        logic: { conditions: [], mapping: [] },
        outputs: [{ type: "createNotification", severity: "info", message: "Task changed" }],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const events: DomainEvent[] = [
        { type: "task.statusChanged", projectId: "project-1", taskId: "task-1", from: "todo", to: "done" },
      ];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.notifications[0].entityRef).toEqual({
        kind: "task",
        projectId: "project-1",
        taskId: "task-1",
      });
    });
  });

  describe("Run tracking", () => {
    it("only reports executedFlowIds for flows that actually matched and ran", async () => {
      const matching: FlowRule = {
        id: "flow-matching",
        schemaVersion: 7,
        name: "Matching Flow",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.statusChanged" },
        logic: { conditions: [], mapping: [] },
        outputs: [{ type: "createNotification", severity: "info", message: "x" }],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const nonMatching: FlowRule = {
        ...matching,
        id: "flow-non-matching",
        name: "Non-matching Flow",
        trigger: { type: "event", event: "project.statusChanged" },
      };

      const events: DomainEvent[] = [
        { type: "task.statusChanged", projectId: "project-1", taskId: "task-1", from: "todo", to: "done" },
      ];

      const result = await runFlowEngine({
        flows: [matching, nonMatching],
        events,
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.executedFlowIds).toEqual(["flow-matching"]);
    });

    it("captures transform errors instead of throwing, and skips only the failing record", async () => {
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 7,
        name: "Broken Transform Flow",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.statusChanged" },
        logic: {
          conditions: [],
          mapping: [],
          transformCode: "throw new Error('boom');",
        },
        outputs: [{ type: "createNotification", severity: "info", message: "x" }],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const events: DomainEvent[] = [
        { type: "task.statusChanged", projectId: "project-1", taskId: "task-1", from: "todo", to: "done" },
      ];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.notifications).toHaveLength(0);
      expect(result.executedFlowIds).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stage).toBe("transform");
      expect(result.errors[0].message).toContain("boom");
    });
  });

  describe("Mapping passthrough", () => {
    it("passes the full record through when no mapping is configured (event fields stay interpolatable)", async () => {
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 7,
        name: "Passthrough Flow",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.statusChanged" },
        logic: { conditions: [], mapping: [] },
        outputs: [
          { type: "createNotification", severity: "info", message: "Tarea {{taskId}}: {{from}} -> {{to}}" },
        ],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const events: DomainEvent[] = [
        { type: "task.statusChanged", projectId: "project-1", taskId: "task-42", from: "todo", to: "done" },
      ];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.notifications[0].message).toBe("Tarea task-42: todo -> done");
    });
  });

  describe("createTask projectRef (spec 023 §D)", () => {
    it("projectRef 'createdProject' targets the project a prior createProject output just created", async () => {
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 9,
        name: "Deal to Project + Task",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "project.created" },
        logic: { conditions: [], mapping: [] },
        outputs: [
          { type: "createProject", name: "New Project From Deal", fields: [] },
          { type: "createTask", title: "Kickoff", projectRef: "createdProject" },
        ],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const events: DomainEvent[] = [
        { type: "project.created", projectId: "project-1", typeId: null },
      ];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.newProjects).toHaveLength(1);
      const created = result.newProjects[0];
      expect(created.name).toBe("New Project From Deal");
      expect(created.tasks.map((t) => t.title)).toContain("Kickoff");
      // The newly created project must not also appear as "changed" — it
      // would be persisted twice and the task would get silently dropped
      // (see the `newProjectIds` filter in `runFlowEngine`).
      expect(result.changedProjects.some((p) => p.id === created.id)).toBe(false);
    });

    it("projectRef 'trigger' uses the triggering event's project even if projectId is also set", async () => {
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 9,
        name: "Task on trigger project",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.added" },
        logic: { conditions: [], mapping: [] },
        outputs: [
          { type: "createTask", title: "Follow-up", projectRef: "trigger", projectId: "some-other-project" },
        ],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const events: DomainEvent[] = [
        { type: "task.added", projectId: "project-1", taskId: "seed-task" },
      ];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.changedProjects).toHaveLength(1);
      expect(result.changedProjects[0].id).toBe("project-1");
      expect(result.changedProjects[0].tasks.map((t) => t.title)).toContain("Follow-up");
    });

    it("projectRef 'explicit' (default) keeps the previous projectId-with-fallback behavior", async () => {
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 9,
        name: "Explicit target",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.added" },
        logic: { conditions: [], mapping: [] },
        outputs: [{ type: "createTask", title: "Explicit", projectRef: "explicit", projectId: "project-1" }],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const events: DomainEvent[] = [
        { type: "task.added", projectId: "some-unrelated-project", taskId: "seed-task" },
      ];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.changedProjects).toHaveLength(1);
      expect(result.changedProjects[0].id).toBe("project-1");
      expect(result.changedProjects[0].tasks.map((t) => t.title)).toContain("Explicit");
    });

    it("applies the new task fields (status, assigneeId, dueDate, tags, estimate, summary)", async () => {
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 9,
        name: "Full fields",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.added" },
        logic: { conditions: [], mapping: [] },
        outputs: [
          {
            type: "createTask",
            title: "Rich task",
            projectRef: "explicit",
            projectId: "project-1",
            status: "doing",
            assigneeId: "person-1",
            dueDate: "2026-08-01",
            tags: ["urgente", "cliente-x"],
            estimate: 5,
            summary: "Resumen corto",
          },
        ],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const events: DomainEvent[] = [
        { type: "task.added", projectId: "project-1", taskId: "seed-task" },
      ];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      const task = result.changedProjects[0].tasks.find((t) => t.title === "Rich task");
      expect(task).toMatchObject({
        status: "doing",
        assigneeId: "person-1",
        dueDate: "2026-08-01",
        tags: ["urgente", "cliente-x"],
        estimate: 5,
        summary: "Resumen corto",
      });
    });
  });

  describe("Deduplicación por clave (spec 023 §E)", () => {
    it("createTask with dedupeKey omits creating a duplicate when a task with that key already exists", async () => {
      const existingTask = { ...newTask("Existing"), dedupeKey: "ext-1" };
      const project = createTestProject();
      project.tasks = [existingTask];

      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 10,
        name: "Dedup task",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.statusChanged" },
        logic: { conditions: [], mapping: [] },
        outputs: [
          { type: "createTask", title: "Should not duplicate", projectRef: "trigger", dedupeKey: "{{taskId}}" },
        ],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const events: DomainEvent[] = [
        { type: "task.statusChanged", projectId: "project-1", taskId: "ext-1", from: "todo", to: "done" },
      ];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [project],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.changedProjects).toHaveLength(0);
    });

    it("createTask without dedupeKey keeps creating every time (backward-compat baseline)", async () => {
      const project = createTestProject();

      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 10,
        name: "No dedup",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.statusChanged" },
        logic: { conditions: [], mapping: [] },
        outputs: [{ type: "createTask", title: "Always created", projectRef: "trigger" }],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const events: DomainEvent[] = [
        { type: "task.statusChanged", projectId: "project-1", taskId: "ext-1", from: "todo", to: "done" },
      ];

      const firstRun = await runFlowEngine({
        flows: [flow],
        events,
        projects: [project],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });
      const secondRun = await runFlowEngine({
        flows: [flow],
        events,
        projects: [firstRun.changedProjects[0]],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(secondRun.changedProjects[0].tasks.filter((t) => t.title === "Always created")).toHaveLength(2);
    });

    it("createProject with dedupeKey omits creating a duplicate, and a chained createTask still targets the existing project via 'createdProject'", async () => {
      const existingProject = { ...createTestProject(), dedupeKey: "deal-1" };

      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 10,
        name: "Dedup project + chained task",
        enabled: true,
        notifyOnFailure: true,
        trigger: {
          type: "poll",
          provider: "hubspot",
          config: { connectionId: "conn-1", objectType: "deals", fields: [], filters: [], intervalMs: 300_000 },
        },
        logic: { conditions: [], mapping: [] },
        outputs: [
          { type: "createProject", name: "Should not duplicate", dedupeKey: "{{dealId}}", fields: [] },
          { type: "createTask", title: "Follow-up", projectRef: "createdProject" },
        ],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const externalData = new Map([["hubspot:conn-1:deals", [{ dealId: "deal-1", dealname: "Acme Deal" }]]]);

      const result = await runFlowEngine({
        flows: [flow],
        events: [],
        projects: [existingProject],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
        externalData,
      });

      expect(result.newProjects).toHaveLength(0);
      expect(result.changedProjects).toHaveLength(1);
      expect(result.changedProjects[0].id).toBe(existingProject.id);
      expect(result.changedProjects[0].tasks.map((t) => t.title)).toContain("Follow-up");
    });

    it("running the same poll record twice with a fixed dedupeKey creates only one task total (no duplicates across runs)", async () => {
      const project = createTestProject();
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 10,
        name: "Poll dedup",
        enabled: true,
        notifyOnFailure: true,
        trigger: {
          type: "poll",
          provider: "hubspot",
          config: { connectionId: "conn-1", objectType: "contacts", fields: [], filters: [], intervalMs: 300_000 },
        },
        logic: { conditions: [], mapping: [] },
        outputs: [
          {
            type: "createTask",
            title: "{{firstname}}",
            projectRef: "explicit",
            projectId: "project-1",
            dedupeKey: "{{id}}",
          },
        ],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const externalData = new Map([["hubspot:conn-1:contacts", [{ id: "contact-1", firstname: "Ana" }]]]);

      const firstRun = await runFlowEngine({
        flows: [flow],
        events: [],
        projects: [project],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
        externalData,
      });
      expect(firstRun.changedProjects[0].tasks).toHaveLength(1);

      // Simulate persistence between runs: the second run sees the project
      // as it stands after the first (same pattern as "Ejecutar ahora" run
      // twice, or two consecutive automatic polls).
      const secondRun = await runFlowEngine({
        flows: [flow],
        events: [],
        projects: [firstRun.changedProjects[0]],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
        externalData,
      });

      expect(secondRun.changedProjects).toHaveLength(0);
    });
  });

  describe("Traza de depuración (spec 023 §F)", () => {
    it("does not populate traces when input.trace is omitted (opt-in, no overhead by default)", async () => {
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 10,
        name: "No trace",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.statusChanged" },
        logic: { conditions: [], mapping: [] },
        outputs: [{ type: "createNotification", severity: "info", message: "hi" }],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const events: DomainEvent[] = [
        { type: "task.statusChanged", projectId: "project-1", taskId: "t1", from: "todo", to: "done" },
      ];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
      });

      expect(result.traces).toEqual({});
    });

    it("records a failed condition with its evaluated operands", async () => {
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 10,
        name: "Condition trace",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.statusChanged" },
        logic: {
          conditions: [{ field: "to", op: "==", value: "archived" }],
          mapping: [],
        },
        outputs: [{ type: "createNotification", severity: "info", message: "hi" }],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const events: DomainEvent[] = [
        { type: "task.statusChanged", projectId: "project-1", taskId: "t1", from: "todo", to: "done" },
      ];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [createTestProject()],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
        trace: true,
      });

      const trace = result.traces["flow-1"];
      expect(trace.triggerMatched).toBe(true);
      expect(trace.recordCount).toBe(1);
      expect(trace.records[0].conditionsPassed).toBe(false);
      expect(trace.records[0].conditions).toEqual([
        { field: "to", op: "==", expected: "archived", actual: "done", passed: false },
      ]);
      // Condition failed -> the record never reaches outputs.
      expect(trace.records[0].outputs).toEqual([]);
    });

    it("records a skipped output with its reason (dedup match)", async () => {
      const existingTask = { ...newTask("Existing"), dedupeKey: "ext-1" };
      const project = createTestProject();
      project.tasks = [existingTask];

      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 10,
        name: "Skip trace",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.statusChanged" },
        logic: { conditions: [], mapping: [] },
        outputs: [{ type: "createTask", title: "Dup", projectRef: "trigger", dedupeKey: "{{taskId}}" }],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const events: DomainEvent[] = [
        { type: "task.statusChanged", projectId: "project-1", taskId: "ext-1", from: "todo", to: "done" },
      ];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [project],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
        trace: true,
      });

      const outputTrace = result.traces["flow-1"].records[0].outputs[0];
      expect(outputTrace).toMatchObject({
        type: "createTask",
        outcome: "skipped",
        reason: 'Ya existe una tarea con dedupeKey "ext-1".',
      });
    });

    it("records the mapped/transform steps and an executed output for a successful record", async () => {
      const project = createTestProject();
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 10,
        name: "Full trace",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.statusChanged" },
        logic: {
          conditions: [],
          mapping: [{ source: "to", target: "status" }],
          transformCode: "record.status = record.status.toUpperCase(); return record;",
        },
        outputs: [{ type: "createTask", title: "{{status}}", projectRef: "trigger" }],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const events: DomainEvent[] = [
        { type: "task.statusChanged", projectId: "project-1", taskId: "t1", from: "todo", to: "done" },
      ];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [project],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
        trace: true,
      });

      const recordTrace = result.traces["flow-1"].records[0];
      expect(recordTrace.mapped).toEqual({ status: "done" });
      expect(recordTrace.transform).toEqual({ input: { status: "done" }, output: { status: "DONE" } });
      expect(recordTrace.outputs[0]).toMatchObject({
        type: "createTask",
        outcome: "executed",
        mutatedProjectIds: ["project-1"],
      });
    });

    it("caps the number of traced records at MAX_TRACE_RECORDS while still processing every record", async () => {
      const project = createTestProject();
      const flow: FlowRule = {
        id: "flow-1",
        schemaVersion: 10,
        name: "Many records",
        enabled: true,
        notifyOnFailure: true,
        trigger: {
          type: "poll",
          provider: "hubspot",
          config: { connectionId: "conn-1", objectType: "contacts", fields: [], filters: [], intervalMs: 300_000 },
        },
        logic: { conditions: [], mapping: [] },
        outputs: [
          { type: "createTask", title: "{{id}}", projectRef: "explicit", projectId: "project-1" },
        ],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const records = Array.from({ length: 8 }, (_, i) => ({ id: `c-${i}` }));
      const externalData = new Map([["hubspot:conn-1:contacts", records]]);

      const result = await runFlowEngine({
        flows: [flow],
        events: [],
        projects: [project],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
        externalData,
        trace: true,
      });

      const trace = result.traces["flow-1"];
      expect(trace.recordCount).toBe(8);
      expect(trace.records.length).toBeLessThan(8);
      // Every record was still processed for real, regardless of trace cap.
      expect(result.changedProjects[0].tasks).toHaveLength(8);
    });
  });

  // ── spec 025 §C — describeOutputs (dry-run) ──────────────────────────────
  describe("describeOutputs (spec 025 §C — dry-run)", () => {
    it("does NOT mutate state when describeOutputs is true", async () => {
      const project = createTestProject();
      const beforeTasks = project.tasks.length;
      const flow: FlowRule = {
        id: "flow-dry-1",
        schemaVersion: 12,
        name: "Dry-run test",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.statusChanged" },
        logic: { conditions: [], mapping: [] },
        outputs: [{ type: "createTask", title: "Dry task", projectId: "project-1", projectRef: "explicit" }],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const events: DomainEvent[] = [{ type: "task.statusChanged", projectId: "project-1", taskId: "task-1", from: "todo", to: "done" }];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [project],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
        trace: true,
        describeOutputs: true,
      });

      // Estado real intacto.
      expect(project.tasks.length).toBe(beforeTasks);
      expect(result.changedProjects).toEqual([]);
      expect(result.newProjects).toEqual([]);
      expect(result.newPeople).toEqual([]);
      expect(result.notifications).toEqual([]);
      expect(result.outboundDeliveries).toEqual([]);
      expect(result.emailDeliveries).toEqual([]);
      expect(result.executedFlowIds).toEqual([]); // nunca se ejecutó de verdad.

      // La traza describe el plan.
      const trace = result.traces["flow-dry-1"];
      expect(trace).toBeDefined();
      const out = trace.records[0].outputs[0];
      expect(out.outcome).toBe("executed");
      expect(out.plan).toContain("Se crearía la tarea");
      expect(out.plan).toContain("Dry task");
      expect(out.plan).toContain("Test Project");
    });

    it("describeOnly webhook/email produces a plan and no network calls", async () => {
      const project = createTestProject();
      const flow: FlowRule = {
        id: "flow-dry-2",
        schemaVersion: 12,
        name: "Dry webhook/email",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.statusChanged" },
        logic: { conditions: [], mapping: [] },
        outputs: [
          { type: "webhook", url: "https://hooks.example.com/catch/x", secret: "whsec_test" },
        ],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const events: DomainEvent[] = [{ type: "task.statusChanged", projectId: "project-1", taskId: "task-1", from: "todo", to: "done" }];

      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [project],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
        trace: true,
        describeOutputs: true,
      });

      // No se llama a la red.
      expect(fetchSpy).not.toHaveBeenCalled();
      // No registro intentos de outbound.
      expect(result.outboundDeliveries).toEqual([]);
      // La traza describe el host sin exponer secretos.
      const out = result.traces["flow-dry-2"]!.records[0].outputs[0];
      expect(out.outcome).toBe("executed");
      expect(out.plan).toContain("hooks.example.com");
      expect(out.plan).not.toContain("whsec_test");
      fetchSpy.mockRestore();
    });

    it("default behavior (describeOutputs undefined) remains real — createTask mutates state as before", async () => {
      const project = createTestProject();
      const beforeTasks = project.tasks.length;
      const flow: FlowRule = {
        id: "flow-notdry",
        schemaVersion: 12,
        name: "Real run",
        enabled: true,
        notifyOnFailure: true,
        trigger: { type: "event", event: "task.statusChanged" },
        logic: { conditions: [], mapping: [] },
        outputs: [{ type: "createTask", title: "Real task", projectId: "project-1", projectRef: "explicit" }],
        lastRunAt: null,
        runCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const events: DomainEvent[] = [{ type: "task.statusChanged", projectId: "project-1", taskId: "task-1", from: "todo", to: "done" }];

      const result = await runFlowEngine({
        flows: [flow],
        events,
        projects: [project],
        people: [],
        checklistTemplates: [],
        projectTypes: [],
        processTemplates: [],
        trace: true,
      });

      expect(project.tasks.length).toBe(beforeTasks); // original not mutated...
      expect(result.changedProjects[0].tasks).toHaveLength(beforeTasks + 1); // ...mutated in `changedProjects` (clón).

      const out = result.traces["flow-notdry"]!.records[0].outputs[0];
      expect(out.outcome).toBe("executed");
      expect(out.plan).toBeUndefined(); // sin plan: fue un run real.
    });
  });
});
