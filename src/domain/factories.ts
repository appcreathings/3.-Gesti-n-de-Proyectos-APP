import { nowIso, uuid } from "@/lib/utils";
import { SCHEMA_VERSION } from "./schemas/common";
import type {
  Area,
  AutomationRule,
  Checklist,
  ChecklistItem,
  ChecklistTemplate,
  Person,
  Process,
  ProcessTemplate,
  Product,
  Project,
  ProjectType,
  Quarter,
  Sprint,
  Task,
} from "./schemas";

export function newProduct(name: string): Product {
  const ts = nowIso();
  return {
    id: uuid(),
    schemaVersion: SCHEMA_VERSION,
    name,
    description: "",
    vision: "",
    objectives: [],
    status: "active",
    ownerId: null,
    tags: [],
    createdAt: ts,
    updatedAt: ts,
  };
}

export function newProject(name: string, productId: string | null = null): Project {
  const ts = nowIso();
  return {
    id: uuid(),
    schemaVersion: SCHEMA_VERSION,
    productId,
    typeId: null,
    quarterId: null,
    name,
    description: "",
    status: "active",
    priority: "medium",
    health: "green",
    ownerId: null,
    stakeholders: [],
    startDate: null,
    dueDate: null,
    tags: [],
    areas: [],
    tasks: [],
    milestones: [],
    sprints: [],
    wipLimits: {
      todo: null,
      doing: null,
      blocked: null,
      done: null,
    },
    dedupeKey: null,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function newArea(name: string, icon = "folder"): Area {
  const ts = nowIso();
  return {
    id: uuid(),
    name,
    icon,
    ownerId: null,
    completed: false,
    processes: [],
    checklists: [],
    createdAt: ts,
    updatedAt: ts,
  };
}

export function newProcess(name: string): Process {
  const ts = nowIso();
  return {
    id: uuid(),
    name,
    description: "",
    steps: [],
    version: 1,
    ownerId: null,
    templateId: null,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function newChecklist(name: string, templateId: string | null = null): Checklist {
  const ts = nowIso();
  return {
    id: uuid(),
    name,
    templateId,
    recurrence: "none",
    items: [],
    createdAt: ts,
    updatedAt: ts,
  };
}

export function newItem(text: string, required = false): ChecklistItem {
  return {
    id: uuid(),
    text,
    done: false,
    required,
    assigneeId: null,
    dueDate: null,
    notes: "",
    linkedTaskId: null,
  };
}

export function newTask(title: string, areaId: string | null = null): Task {
  const ts = nowIso();
  return {
    id: uuid(),
    title,
    description: "",
    summary: "",
    status: "todo",
    priority: "medium",
    assigneeId: null,
    dueDate: null,
    areaId,
    sourceItemId: null,
    sprintId: null,
    tags: [],
    comments: [],
    archived: false,
    estimate: null,
    subtasks: [],
    dedupeKey: null,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function newSprint(name: string): Sprint {
  const ts = nowIso();
  return {
    id: uuid(),
    name,
    goal: "",
    startDate: null,
    endDate: null,
    status: "planned",
    createdAt: ts,
    updatedAt: ts,
  };
}

export function newQuarter(name: string): Quarter {
  const ts = nowIso();
  return {
    id: uuid(),
    schemaVersion: SCHEMA_VERSION,
    name,
    goal: "",
    startDate: null,
    endDate: null,
    status: "planned",
    tags: [],
    createdAt: ts,
    updatedAt: ts,
  };
}

export function newPerson(name: string): Person {
  const ts = nowIso();
  return {
    id: uuid(),
    name,
    email: "",
    roleTitle: "",
    createdAt: ts,
    updatedAt: ts,
  };
}

export function newChecklistTemplate(name: string): ChecklistTemplate {
  const ts = nowIso();
  return {
    id: uuid(),
    schemaVersion: SCHEMA_VERSION,
    name,
    category: "",
    items: [],
    tags: [],
    createdAt: ts,
    updatedAt: ts,
  };
}

export function newProcessTemplate(name: string): ProcessTemplate {
  const ts = nowIso();
  return {
    id: uuid(),
    schemaVersion: SCHEMA_VERSION,
    name,
    description: "",
    category: "",
    steps: [],
    createdAt: ts,
    updatedAt: ts,
  };
}

export function newAutomation(name: string): AutomationRule {
  const ts = nowIso();
  return {
    id: uuid(),
    schemaVersion: SCHEMA_VERSION,
    name,
    enabled: true,
    scope: { kind: "global" },
    trigger: { type: "checklist.completed" },
    conditions: [],
    actions: [],
    lastRunAt: null,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function newProjectType(name: string): ProjectType {
  const ts = nowIso();
  return {
    id: uuid(),
    schemaVersion: SCHEMA_VERSION,
    name,
    description: "",
    statusWorkflow: ["backlog", "active", "paused", "blocked", "done", "archived"],
    defaultAreas: [],
    defaultAutomationIds: [],
    createdAt: ts,
    updatedAt: ts,
  };
}
