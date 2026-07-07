import { describe, expect, it } from "vitest";
import { collectEntities, makeEntityId } from "./indexer";
import type { ToolData } from "@/ai/tools/types";
import type {
  Product,
  Project,
  Person,
  ChecklistTemplate,
  ProcessTemplate,
  ProjectType,
  AutomationRule,
} from "@/domain/schemas";

const NOW = "2026-07-05T12:00:00.000Z";

const empty: ToolData = {
  products: [],
  projects: [],
  people: [],
  checklistTemplates: [],
  processTemplates: [],
  projectTypes: [],
  automations: [],
  notifications: [],
};

const sample: ToolData = {
  products: [
    {
      id: "p1",
      schemaVersion: 2,
      name: "Producto Alpha",
      description: "Descripcion del producto",
      vision: "Ser el mejor",
      objectives: [{ id: "o1", text: "Objetivo 1", target: "", done: false }],
      status: "active",
      ownerId: null,
      tags: [],
      createdAt: NOW,
      updatedAt: NOW,
    } satisfies Product,
  ],
  projects: [
    {
      id: "prj1",
      schemaVersion: 2,
      name: "Proyecto Uno",
      description: "Primer proyecto",
      typeId: null,
      productId: "p1",
      quarterId: null,
      status: "active",
      priority: "medium",
      health: "green",
      ownerId: null,
      stakeholders: [],
      startDate: null,
      dueDate: null,
      tags: [],
      areas: [
        {
          id: "area1",
          name: "Area de prueba",
          icon: "folder",
          ownerId: null,
          completed: false,
          processes: [],
          checklists: [
            {
              id: "cl1",
              name: "Checklist 1",
              templateId: null,
              recurrence: "none",
              items: [
                {
                  id: "item1",
                  text: "Hacer algo",
                  done: false,
                  required: false,
                  assigneeId: null,
                  dueDate: null,
                  notes: "Nota importante",
                  linkedTaskId: null,
                },
              ],
              createdAt: NOW,
              updatedAt: NOW,
            },
          ],
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
      tasks: [
        {
          id: "t1",
          title: "Tarea inicial",
          description: "Descripcion de la tarea",
          summary: "",
          status: "todo",
          priority: "medium",
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
          createdAt: NOW,
          updatedAt: NOW,
        },
      ],
      milestones: [],
      sprints: [],
      wipLimits: {
        todo: null,
        doing: null,
        blocked: null,
        done: null,
      },
      createdAt: NOW,
      updatedAt: NOW,
    } satisfies Project,
  ],
  people: [
    {
      id: "person1",
      name: "Juan Perez",
      roleTitle: "Project Manager",
      email: "juan@test.com",
      createdAt: NOW,
      updatedAt: NOW,
    } satisfies Person,
  ],
  checklistTemplates: [
    {
      id: "ct1",
      schemaVersion: 2,
      name: "Checklist QA",
      category: "QA",
      items: [],
      tags: [],
      createdAt: NOW,
      updatedAt: NOW,
    } satisfies ChecklistTemplate,
  ],
  processTemplates: [
    {
      id: "pt1",
      schemaVersion: 2,
      name: "SOP Publicacion",
      description: "Pasos para publicar",
      category: "Ops",
      steps: [],
      createdAt: NOW,
      updatedAt: NOW,
    } satisfies ProcessTemplate,
  ],
  projectTypes: [
    {
      id: "type1",
      schemaVersion: 2,
      name: "Tipo Estandar",
      description: "Un tipo de proyecto",
      statusWorkflow: ["backlog", "active", "paused", "blocked", "done", "archived"],
      defaultAreas: [],
      defaultAutomationIds: [],
      createdAt: NOW,
      updatedAt: NOW,
    } satisfies ProjectType,
  ],
  automations: [
    {
      id: "auto1",
      schemaVersion: 2,
      name: "Auto notificar",
      enabled: true,
      scope: { kind: "global" },
      trigger: { type: "task.statusChanged" },
      conditions: [],
      actions: [{ type: "createNotification", severity: "info", message: "Auto activado" }],
      lastRunAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    } satisfies AutomationRule,
  ],
  notifications: [],
};

describe("makeEntityId", () => {
  it("combina tipo e id con dos puntos", () => {
    expect(makeEntityId("project", "abc")).toBe("project:abc");
    expect(makeEntityId("task", "123")).toBe("task:123");
  });
});

describe("collectEntities", () => {
  it("devuelve array vacio para datos vacios", () => {
    const entities = collectEntities(empty);
    expect(entities).toEqual([]);
  });

  it("indexa productos", () => {
    const entities = collectEntities(sample);
    const product = entities.find((e) => e.entityType === "product");
    expect(product).toBeDefined();
    expect(product!.entityId).toBe("p1");
    expect(product!.text).toContain("Producto Alpha");
    expect(product!.text).toContain("Objetivo 1");
  });

  it("indexa proyectos", () => {
    const entities = collectEntities(sample);
    const project = entities.find((e) => e.entityType === "project");
    expect(project).toBeDefined();
    expect(project!.entityId).toBe("prj1");
    expect(project!.text).toContain("Proyecto Uno");
  });

  it("indexa tareas", () => {
    const entities = collectEntities(sample);
    const task = entities.find((e) => e.entityType === "task");
    expect(task).toBeDefined();
    expect(task!.entityId).toBe("t1");
    expect(task!.text).toContain("Tarea inicial");
    expect(task!.parentProjectId).toBe("prj1");
  });

  it("indexa areas", () => {
    const entities = collectEntities(sample);
    const area = entities.find((e) => e.entityType === "area");
    expect(area).toBeDefined();
    expect(area!.entityId).toBe("area1");
    expect(area!.text).toContain("Area de prueba");
  });

  it("indexa checklist items", () => {
    const entities = collectEntities(sample);
    const item = entities.find((e) => e.entityType === "checklist_item");
    expect(item).toBeDefined();
    expect(item!.entityId).toBe("item1");
    expect(item!.text).toContain("Hacer algo");
    expect(item!.text).toContain("Nota importante");
  });

  it("indexa personas", () => {
    const entities = collectEntities(sample);
    const person = entities.find((e) => e.entityType === "person");
    expect(person).toBeDefined();
    expect(person!.entityId).toBe("person1");
    expect(person!.text).toContain("Juan Perez");
    expect(person!.text).toContain("Project Manager");
  });

  it("indexa checklist templates", () => {
    const entities = collectEntities(sample);
    const ct = entities.find((e) => e.entityType === "checklist_template");
    expect(ct).toBeDefined();
    expect(ct!.entityId).toBe("ct1");
    expect(ct!.text).toContain("Checklist QA");
    expect(ct!.text).toContain("QA");
  });

  it("indexa process templates", () => {
    const entities = collectEntities(sample);
    const pt = entities.find((e) => e.entityType === "process_template");
    expect(pt).toBeDefined();
    expect(pt!.entityId).toBe("pt1");
    expect(pt!.text).toContain("SOP Publicacion");
  });

  it("indexa project types", () => {
    const entities = collectEntities(sample);
    const ptype = entities.find((e) => e.entityType === "project_type");
    expect(ptype).toBeDefined();
    expect(ptype!.entityId).toBe("type1");
    expect(ptype!.text).toContain("Tipo Estandar");
  });

  it("indexa automations", () => {
    const entities = collectEntities(sample);
    const auto = entities.find((e) => e.entityType === "automation");
    expect(auto).toBeDefined();
    expect(auto!.entityId).toBe("auto1");
    expect(auto!.text).toContain("Auto notificar");
  });

  it("asigna parentProjectId a tareas y areas", () => {
    const entities = collectEntities(sample);
    const task = entities.find((e) => e.entityType === "task")!;
    const area = entities.find((e) => e.entityType === "area")!;
    expect(task.parentProjectId).toBe("prj1");
    expect(area.parentProjectId).toBe("prj1");
  });
});
