import { nowIso, uuid } from "@/lib/utils";
import {
  areaProgress,
  checklistProgress,
  projectChecklistProgress,
} from "@/domain/compute";
import { newChecklist, newItem, newTask } from "@/domain/factories";
import * as ops from "@/domain/projectOps";
import type {
  Action,
  AutomationRule,
  ChecklistTemplate,
  Condition,
  Notification,
  Project,
  Scope,
} from "@/domain/schemas";
import type { DomainEvent } from "./events";

export interface EngineInput {
  events: DomainEvent[];
  rules: AutomationRule[];
  projects: Project[];
  checklistTemplates: ChecklistTemplate[];
}

export interface EngineResult {
  changedProjects: Project[];
  notifications: Notification[];
}

/** Pure evaluation of event-driven automation rules. No side effects. */
export function runEngine(input: EngineInput): EngineResult {
  const working = new Map(input.projects.map((p) => [p.id, p]));
  const touched = new Set<string>();
  const notifications: Notification[] = [];

  const enabled = input.rules.filter((r) => r.enabled);

  for (const event of input.events) {
    const project = working.get(event.projectId);
    if (!project) continue;

    for (const rule of enabled) {
      if (rule.trigger.type !== event.type) continue;
      if (!scopeMatches(rule.scope, project)) continue;
      const ctx = buildContext(event, working.get(event.projectId)!);
      if (!conditionsPass(rule.conditions, ctx)) continue;

      for (const action of rule.actions) {
        const current = working.get(event.projectId)!;
        const next = applyAction(action, event, current, input.checklistTemplates, notifications);
        if (next && next !== current) {
          working.set(event.projectId, next);
          touched.add(event.projectId);
        }
      }
    }
  }

  return {
    changedProjects: [...touched].map((id) => working.get(id)!),
    notifications,
  };
}

function scopeMatches(scope: Scope, project: Project): boolean {
  switch (scope.kind) {
    case "global":
      return true;
    case "project":
      return scope.id === project.id;
    case "product":
      return scope.id === project.productId;
    case "type":
      return scope.id === project.typeId;
  }
}

function buildContext(event: DomainEvent, project: Project): Record<string, unknown> {
  const ctx: Record<string, unknown> = {
    "project.status": project.status,
    "project.priority": project.priority,
    "project.health": project.health,
    "project.progress": projectChecklistProgress(project).pct,
  };
  if ("areaId" in event) {
    const area = project.areas.find((a) => a.id === event.areaId);
    if (area) ctx["area.progress"] = areaProgress(area).pct;
  }
  if ("checklistId" in event) {
    const area = project.areas.find((a) => a.id === (event as { areaId: string }).areaId);
    const cl = area?.checklists.find((c) => c.id === event.checklistId);
    if (cl) ctx["checklist.progress"] = checklistProgress(cl).pct;
  }
  return ctx;
}

function conditionsPass(conditions: Condition[], ctx: Record<string, unknown>): boolean {
  return conditions.every((c) => evalCondition(c, ctx));
}

function evalCondition(c: Condition, ctx: Record<string, unknown>): boolean {
  const left = ctx[c.field];
  const right = c.value;
  const ln = toNum(left);
  const rn = toNum(right);
  const numeric = ln !== null && rn !== null;
  switch (c.op) {
    case "==":
      return numeric ? ln === rn : String(left) === String(right);
    case "!=":
      return numeric ? ln !== rn : String(left) !== String(right);
    case ">":
      return numeric && ln! > rn!;
    case ">=":
      return numeric && ln! >= rn!;
    case "<":
      return numeric && ln! < rn!;
    case "<=":
      return numeric && ln! <= rn!;
    case "in":
      return Array.isArray(right) && right.map(String).includes(String(left));
    case "contains":
      return String(left).includes(String(right));
  }
}

function toNum(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
  return null;
}

function applyAction(
  action: Action,
  event: DomainEvent,
  project: Project,
  templates: ChecklistTemplate[],
  notifications: Notification[],
): Project | null {
  const areaId = "areaId" in event ? event.areaId : undefined;

  switch (action.type) {
    case "setProjectStatus":
      if (project.status === action.status) return null;
      return { ...project, status: action.status as Project["status"] };

    case "markAreaComplete": {
      if (!areaId) return null;
      const area = project.areas.find((a) => a.id === areaId);
      if (!area || area.completed) return null;
      return ops.updateArea(project, { ...area, completed: true });
    }

    case "setField": {
      if (action.field === "project.health")
        return { ...project, health: action.value as Project["health"] };
      if (action.field === "project.status")
        return { ...project, status: action.value as Project["status"] };
      if (action.field === "project.priority")
        return { ...project, priority: action.value as Project["priority"] };
      return null;
    }

    case "createChecklistFromTemplate": {
      const targetAreaId = action.areaId ?? areaId;
      if (!targetAreaId) return null;
      const area = project.areas.find((a) => a.id === targetAreaId);
      const tpl = templates.find((t) => t.id === action.templateId);
      if (!area || !tpl) return null;
      // Idempotency: skip if a checklist from this template already exists.
      if (area.checklists.some((c) => c.templateId === tpl.id)) return null;
      const cl = newChecklist(tpl.name, tpl.id);
      cl.items = tpl.items.map((it) => newItem(it.text, it.required));
      return ops.addChecklist(project, targetAreaId, cl);
    }

    case "createTask": {
      const task = newTask(action.title, action.areaId ?? areaId ?? null);
      if (action.priority) task.priority = action.priority as Project["priority"];
      return ops.addTask(project, task);
    }

    case "createNotification":
      notifications.push({
        id: uuid(),
        type: event.type,
        severity: action.severity,
        message: action.message,
        entityRef: { kind: "project", projectId: project.id },
        read: false,
        createdAt: nowIso(),
      });
      return null;

    case "recreateRecurringChecklist":
      // Handled by the temporal scheduler (M4).
      return null;
  }
}
