import { nowIso, uuid } from "@/lib/utils";
import { taskStatusLabel } from "@/domain/labels";
import type { ActivityDoc, ActivityEntry, Project, TaskStatus } from "@/domain/schemas";
import { ACTIVITY_CAP } from "@/domain/schemas";
import type { DomainEvent } from "./events";

/**
 * Turn domain events into human-readable activity entries (Spanish).
 * Pure: the caller appends the result to the aggregated activity doc.
 */
export function describeEvents(
  events: DomainEvent[],
  project: Project,
  at: string = nowIso(),
): ActivityEntry[] {
  const entries: ActivityEntry[] = [];
  for (const event of events) {
    const message = describe(event, project);
    if (!message) continue;
    entries.push({
      id: uuid(),
      at,
      projectId: project.id,
      type: event.type,
      message,
      entityRef: refFor(event),
    });
  }
  return entries;
}

/** Append entries keeping the newest first and respecting the cap. */
export function appendEntries(doc: ActivityDoc, entries: ActivityEntry[]): ActivityDoc {
  if (entries.length === 0) return doc;
  return {
    ...doc,
    entries: [...entries, ...doc.entries].slice(0, ACTIVITY_CAP),
  };
}

function describe(event: DomainEvent, project: Project): string | null {
  switch (event.type) {
    case "item.checked": {
      const { area, checklist } = findChecklist(project, event.areaId, event.checklistId);
      const item = checklist?.items.find((i) => i.id === event.itemId);
      if (!item) return null;
      return `Ítem "${item.text}" marcado en "${checklist!.name}"${area ? ` (${area.name})` : ""}`;
    }
    case "checklist.completed": {
      const { area, checklist } = findChecklist(project, event.areaId, event.checklistId);
      if (!checklist) return null;
      return `Checklist "${checklist.name}" completada${area ? ` en ${area.name}` : ""}`;
    }
    case "area.completed": {
      const area = project.areas.find((a) => a.id === event.areaId);
      return area ? `Área "${area.name}" completada` : null;
    }
    case "area.added": {
      const area = project.areas.find((a) => a.id === event.areaId);
      return area ? `Área "${area.name}" añadida` : null;
    }
    case "project.created":
      return `Proyecto "${project.name}" creado`;
    case "project.statusChanged":
      return `Estado del proyecto: ${event.from} → ${event.to}`;
    case "task.added": {
      const task = project.tasks.find((t) => t.id === event.taskId);
      return task ? `Tarea "${task.title}" creada` : null;
    }
    case "task.statusChanged": {
      const task = project.tasks.find((t) => t.id === event.taskId);
      if (!task) return null;
      const from = taskStatusLabel[event.from as TaskStatus] ?? event.from;
      const to = taskStatusLabel[event.to as TaskStatus] ?? event.to;
      return `Tarea "${task.title}": ${from} → ${to}`;
    }
    case "task.commented": {
      const task = project.tasks.find((t) => t.id === event.taskId);
      if (!task) return null;
      const comment = task.comments?.find((c) => c.id === event.commentId);
      if (!comment) return null;
      const preview = comment.text.length > 50 ? comment.text.slice(0, 50) + "..." : comment.text;
      return `Comentario en "${task.title}": ${preview}`;
    }
    case "task.archived": {
      const task = project.tasks.find((t) => t.id === event.taskId);
      return task ? `Tarea "${task.title}" archivada` : null;
    }
    case "task.unarchived": {
      const task = project.tasks.find((t) => t.id === event.taskId);
      return task ? `Tarea "${task.title}" desarchivada` : null;
    }
  }
}

function refFor(event: DomainEvent): ActivityEntry["entityRef"] {
  switch (event.type) {
    case "item.checked":
      return {
        kind: "checklistItem",
        projectId: event.projectId,
        areaId: event.areaId,
        checklistId: event.checklistId,
        itemId: event.itemId,
      };
    case "checklist.completed":
      return {
        kind: "checklist",
        projectId: event.projectId,
        areaId: event.areaId,
        checklistId: event.checklistId,
      };
    case "area.completed":
    case "area.added":
      return { kind: "area", projectId: event.projectId, areaId: event.areaId };
    case "task.added":
    case "task.statusChanged":
    case "task.commented":
    case "task.archived":
    case "task.unarchived":
      return { kind: "task", projectId: event.projectId, taskId: event.taskId };
    default:
      return { kind: "project", projectId: event.projectId };
  }
}

function findChecklist(project: Project, areaId: string, checklistId: string) {
  const area = project.areas.find((a) => a.id === areaId);
  const checklist = area?.checklists.find((c) => c.id === checklistId);
  return { area, checklist };
}
