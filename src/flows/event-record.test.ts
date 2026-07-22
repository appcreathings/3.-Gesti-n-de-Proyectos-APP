import { describe, it, expect } from "vitest";
import { buildEventRecordDeps, eventRecord } from "./event-record";
import { resolvePath } from "./interpolation";
import { EVENT_SEED_REQUIREMENTS } from "./synthetic-event";
import type { DomainEventType } from "@/automations/events";
import type { Area, Checklist, ChecklistItem, Person, Project, Task } from "@/domain/schemas";

const now = new Date().toISOString();

const person: Person = {
  id: "person-1",
  name: "Ana Gómez",
  email: "ana@acme.test",
  roleTitle: "PM",
  createdAt: now,
  updatedAt: now,
};

const task: Task = {
  id: "task-1",
  title: "Llamar a ACME",
  description: "",
  summary: "",
  status: "doing",
  priority: "high",
  assigneeId: "person-1",
  dueDate: "2026-08-15",
  areaId: null,
  sourceItemId: null,
  sprintId: null,
  tags: ["comercial"],
  comments: [],
  archived: false,
  estimate: null,
  subtasks: [],
  dedupeKey: null,
  createdAt: now,
  updatedAt: now,
};

const item: ChecklistItem = {
  id: "item-1",
  text: "Firmar el contrato",
  done: false,
  required: false,
  assigneeId: null,
  dueDate: null,
  notes: "",
  linkedTaskId: null,
};

const checklist: Checklist = {
  id: "checklist-1",
  name: "Alta de cliente",
  templateId: null,
  recurrence: "none",
  items: [item],
  createdAt: now,
  updatedAt: now,
};

const area: Area = {
  id: "area-1",
  name: "Descubrimiento",
  icon: "folder",
  ownerId: null,
  completed: false,
  processes: [],
  checklists: [checklist],
  createdAt: now,
  updatedAt: now,
};

const project: Project = {
  id: "proj-1",
  schemaVersion: 7,
  productId: null,
  typeId: "type-1",
  quarterId: null,
  name: "Migración ACME",
  description: "",
  status: "active",
  priority: "medium",
  health: "green",
  ownerId: null,
  stakeholders: [],
  startDate: null,
  dueDate: null,
  tags: [],
  areas: [area],
  tasks: [task],
  milestones: [],
  sprints: [],
  wipLimits: { todo: null, doing: null, blocked: null, done: null },
  dedupeKey: null,
  createdAt: now,
  updatedAt: now,
};

const deps = buildEventRecordDeps([project], [person]);

describe("eventRecord", () => {
  it("añade los datos legibles de la tarea y del proyecto", () => {
    const record = eventRecord(
      { type: "task.statusChanged", projectId: "proj-1", taskId: "task-1", from: "todo", to: "doing" },
      deps,
    );
    expect(record["task.title"]).toBe("Llamar a ACME");
    expect(record["task.status"]).toBe("doing");
    expect(record["task.priority"]).toBe("high");
    expect(record["task.dueDate"]).toBe("2026-08-15");
    expect(record["task.assigneeId"]).toBe("person-1");
    expect(record["task.assigneeName"]).toBe("Ana Gómez");
    expect(record["task.tags"]).toEqual(["comercial"]);
    expect(record["project.name"]).toBe("Migración ACME");
    expect(record["project.status"]).toBe("active");
    expect(record["project.health"]).toBe("green");
    expect(record["project.priority"]).toBe("medium");
  });

  it("es aditivo: los campos crudos del evento sobreviven con su valor", () => {
    const record = eventRecord(
      { type: "task.statusChanged", projectId: "proj-1", taskId: "task-1", from: "todo", to: "doing" },
      deps,
    );
    expect(record.type).toBe("task.statusChanged");
    expect(record.projectId).toBe("proj-1");
    expect(record.taskId).toBe("task-1");
    expect(record.from).toBe("todo");
    expect(record.to).toBe("doing");
  });

  it("el EVENTO gana en la colisión: ningún campo calculado pisa uno del evento", () => {
    // La composición es `{ ...enrichment, ...event }`, nunca al revés. Si se
    // invirtiera, un `status` de proyecto podría pisar el `to` del evento y un
    // flujo guardado cambiaría de comportamiento en silencio (CA-03.2).
    // Se fija comparando contra un enriquecimiento que usa a propósito los
    // mismos nombres de clave que el evento.
    const colliding: Project = { ...project, id: "proj-collide", name: "X", status: "archived" };
    const record = eventRecord(
      { type: "project.statusChanged", projectId: "proj-collide", from: "active", to: "done" },
      buildEventRecordDeps([colliding], []),
    );
    expect(record.type).toBe("project.statusChanged");
    expect(record.from).toBe("active");
    expect(record.to).toBe("done");
    expect(record.projectId).toBe("proj-collide");
    // El estado real del proyecto viaja en su propia clave, no pisando `to`.
    expect(record["project.status"]).toBe("archived");
  });

  it("entidad inexistente: no trae esos campos, no lanza y no inventa valores", () => {
    const record = eventRecord(
      { type: "task.statusChanged", projectId: "proj-1", taskId: "task-borrada", from: "todo", to: "done" },
      deps,
    );
    expect(record.taskId).toBe("task-borrada");
    expect("task.title" in record).toBe(false);
    // "" se leería como "no tiene responsable" en vez de "no lo pude resolver".
    expect("task.assigneeName" in record).toBe(false);
    // El proyecto sí existe, así que sus campos siguen ahí.
    expect(record["project.name"]).toBe("Migración ACME");
  });

  it("proyecto inexistente: registro sin enriquecer, sin excepción", () => {
    const record = eventRecord({ type: "task.added", projectId: "fantasma", taskId: "t" }, deps);
    expect(record).toEqual({ type: "task.added", projectId: "fantasma", taskId: "t" });
  });

  it("omite assigneeName si la persona no está en el índice", () => {
    const sinGente = buildEventRecordDeps([project], []);
    const record = eventRecord({ type: "task.added", projectId: "proj-1", taskId: "task-1" }, sinGente);
    expect(record["task.assigneeId"]).toBe("person-1");
    expect("task.assigneeName" in record).toBe(false);
  });

  it("omite los campos nulos de la tarea en vez de emitir vacíos", () => {
    const pelada: Project = {
      ...project,
      tasks: [{ ...task, assigneeId: null, dueDate: null }],
    };
    const record = eventRecord(
      { type: "task.added", projectId: "proj-1", taskId: "task-1" },
      buildEventRecordDeps([pelada], [person]),
    );
    expect("task.dueDate" in record).toBe(false);
    expect("task.assigneeId" in record).toBe(false);
    expect("task.assigneeName" in record).toBe(false);
    expect(record["task.title"]).toBe("Llamar a ACME");
  });

  it("enriquece área, checklist e ítem según lo que el evento referencia", () => {
    const record = eventRecord(
      {
        type: "item.checked",
        projectId: "proj-1",
        areaId: "area-1",
        checklistId: "checklist-1",
        itemId: "item-1",
      },
      deps,
    );
    expect(record["area.name"]).toBe("Descubrimiento");
    expect(record["checklist.name"]).toBe("Alta de cliente");
    expect(record["item.text"]).toBe("Firmar el contrato");
  });

  it("los once tipos de evento producen registro sin lanzar", () => {
    const types = Object.keys(EVENT_SEED_REQUIREMENTS) as DomainEventType[];
    expect(types).toHaveLength(11);
    for (const type of types) {
      const record = eventRecord(
        {
          type,
          projectId: "proj-1",
          taskId: "task-1",
          areaId: "area-1",
          checklistId: "checklist-1",
          itemId: "item-1",
        } as never,
        deps,
      );
      expect(record.type).toBe(type);
      expect(record["project.name"]).toBe("Migración ACME");
    }
  });
});

describe("eventRecord + resolvePath (claves planas punteadas)", () => {
  // Fija la decisión de design §B3: el enriquecimiento emite `record["task.title"]`,
  // NO `record.task.title`. `resolvePath` prueba la clave literal ANTES de partir
  // por puntos, y `sampleFields` sólo recorre el nivel superior — con claves planas
  // el panel, el picker, la interpolación y la validación funcionan sin tocarlos.
  // Si alguien pasa a objetos anidados, este test lo delata.
  const record = eventRecord(
    { type: "task.added", projectId: "proj-1", taskId: "task-1" },
    deps,
  );

  it("resolvePath resuelve `task.title` por clave literal", () => {
    expect(resolvePath(record, "task.title")).toBe("Llamar a ACME");
  });

  it("el registro NO tiene un objeto anidado `task`", () => {
    expect(record.task).toBeUndefined();
    expect(Object.keys(record)).toContain("task.title");
  });

  it("los campos enriquecidos están en el nivel superior (lo que recorre sampleFields)", () => {
    const topLevel = Object.keys(record);
    expect(topLevel).toContain("project.name");
    expect(topLevel).toContain("task.status");
  });
});
