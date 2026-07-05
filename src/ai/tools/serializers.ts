import {
  areaProgress,
  daysUntil,
  projectChecklistProgress,
  projectTaskProgress,
} from "@/domain/compute";
import type {
  AutomationRule,
  Notification,
  Person,
  Product,
  Project,
  Task,
} from "@/domain/schemas";

/**
 * Token-budget-aware views of the domain entities. Projects embed areas,
 * checklists and tasks and can be huge — list tools return summaries and only
 * `get_project` returns the detailed view.
 */

function personName(people: Person[], id: string | null): string | null {
  if (!id) return null;
  return people.find((p) => p.id === id)?.name ?? null;
}

export function taskView(t: Task, project: Project, people: Person[]) {
  return {
    id: t.id,
    projectId: project.id,
    projectName: project.name,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
    daysUntilDue: daysUntil(t.dueDate),
    assignee: personName(people, t.assigneeId),
    area: project.areas.find((a) => a.id === t.areaId)?.name ?? null,
  };
}

export function projectSummary(p: Project) {
  const checklists = projectChecklistProgress(p);
  const tasks = projectTaskProgress(p);
  return {
    id: p.id,
    name: p.name,
    productId: p.productId,
    typeId: p.typeId,
    status: p.status,
    health: p.health,
    priority: p.priority,
    startDate: p.startDate,
    dueDate: p.dueDate,
    daysUntilDue: daysUntil(p.dueDate),
    checklistProgressPct: checklists.pct,
    taskCounts: {
      total: p.tasks.length,
      todo: p.tasks.filter((t) => t.status === "todo").length,
      doing: p.tasks.filter((t) => t.status === "doing").length,
      blocked: p.tasks.filter((t) => t.status === "blocked").length,
      done: tasks.done,
    },
    areas: p.areas.map((a) => a.name),
    updatedAt: p.updatedAt,
  };
}

export function projectDetail(p: Project, people: Person[]) {
  return {
    ...projectSummary(p),
    description: p.description,
    owner: personName(people, p.ownerId),
    tags: p.tags,
    areas: p.areas.map((a) => ({
      id: a.id,
      name: a.name,
      completed: a.completed,
      progressPct: areaProgress(a).pct,
      processes: a.processes.map((pr) => ({ id: pr.id, name: pr.name })),
      checklists: a.checklists.map((c) => ({
        id: c.id,
        name: c.name,
        recurrence: c.recurrence,
        items: c.items.map((i) => ({
          id: i.id,
          text: i.text,
          done: i.done,
          required: i.required,
          dueDate: i.dueDate,
          assignee: personName(people, i.assigneeId),
        })),
      })),
    })),
    tasks: p.tasks.map((t) => taskView(t, p, people)),
  };
}

export function productView(p: Product) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    vision: p.vision,
    objectives: p.objectives,
    status: p.status,
    tags: p.tags,
  };
}

export function personView(p: Person) {
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    roleTitle: p.roleTitle,
  };
}

export function automationView(r: AutomationRule) {
  return {
    id: r.id,
    name: r.name,
    enabled: r.enabled,
    scope: r.scope,
    trigger: r.trigger.type,
    actions: r.actions.map((a) => a.type),
  };
}

export function notificationView(n: Notification) {
  return {
    id: n.id,
    type: n.type,
    severity: n.severity,
    message: n.message,
    read: n.read,
    createdAt: n.createdAt,
    projectId: n.entityRef?.projectId ?? null,
  };
}
