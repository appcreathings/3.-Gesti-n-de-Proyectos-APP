import { areaProgress, checklistProgress } from "@/domain/compute";
import type { Project } from "@/domain/schemas";

/** Domain events emitted when project data changes (contracts/storage-contract.md). */
export type DomainEvent =
  | { type: "item.checked"; projectId: string; areaId: string; checklistId: string; itemId: string }
  | { type: "checklist.completed"; projectId: string; areaId: string; checklistId: string }
  | { type: "area.completed"; projectId: string; areaId: string }
  | { type: "area.added"; projectId: string; areaId: string }
  | { type: "project.created"; projectId: string; typeId: string | null }
  | { type: "project.statusChanged"; projectId: string; from: string; to: string }
  | { type: "task.added"; projectId: string; taskId: string }
  | { type: "task.statusChanged"; projectId: string; taskId: string; from: string; to: string }
  | { type: "task.commented"; projectId: string; taskId: string; commentId: string }
  | { type: "task.archived"; projectId: string; taskId: string }
  | { type: "task.unarchived"; projectId: string; taskId: string };

export type DomainEventType = DomainEvent["type"];

/**
 * Compute the domain events implied by a project transition prev -> next.
 * Pure: drives the automation engine without a stateful pub/sub bus.
 */
export function diffProjectEvents(prev: Project, next: Project): DomainEvent[] {
  const events: DomainEvent[] = [];
  const prevAreas = new Map(prev.areas.map((a) => [a.id, a]));

  for (const area of next.areas) {
    const before = prevAreas.get(area.id);
    if (!before) {
      events.push({ type: "area.added", projectId: next.id, areaId: area.id });
      continue;
    }

    const beforeChecklists = new Map(before.checklists.map((c) => [c.id, c]));
    for (const cl of area.checklists) {
      const bcl = beforeChecklists.get(cl.id);
      if (!bcl) continue;
      const bItems = new Map(bcl.items.map((i) => [i.id, i]));
      for (const item of cl.items) {
        const bItem = bItems.get(item.id);
        if (bItem && !bItem.done && item.done) {
          events.push({
            type: "item.checked",
            projectId: next.id,
            areaId: area.id,
            checklistId: cl.id,
            itemId: item.id,
          });
        }
      }
      const before100 = checklistProgress(bcl);
      const after100 = checklistProgress(cl);
      if (after100.total > 0 && before100.pct < 100 && after100.pct === 100) {
        events.push({
          type: "checklist.completed",
          projectId: next.id,
          areaId: area.id,
          checklistId: cl.id,
        });
      }
    }

    const beforeAreaPct = areaProgress(before);
    const afterAreaPct = areaProgress(area);
    const completedByProgress =
      afterAreaPct.total > 0 && beforeAreaPct.pct < 100 && afterAreaPct.pct === 100;
    const completedByFlag = !before.completed && area.completed;
    if (completedByProgress || completedByFlag) {
      events.push({ type: "area.completed", projectId: next.id, areaId: area.id });
    }
  }

  const prevTasks = new Map(prev.tasks.map((t) => [t.id, t]));
  for (const task of next.tasks) {
    const before = prevTasks.get(task.id);
    if (!before) {
      events.push({ type: "task.added", projectId: next.id, taskId: task.id });
    } else {
      if (before.status !== task.status) {
        events.push({
          type: "task.statusChanged",
          projectId: next.id,
          taskId: task.id,
          from: before.status,
          to: task.status,
        });
      }
      const prevComments = before.comments ?? [];
      const nextComments = task.comments ?? [];
      if (nextComments.length > prevComments.length) {
        const newComment = nextComments[nextComments.length - 1];
        events.push({
          type: "task.commented",
          projectId: next.id,
          taskId: task.id,
          commentId: newComment.id,
        });
      }
      if (before.archived !== task.archived) {
        events.push({
          type: task.archived ? "task.archived" : "task.unarchived",
          projectId: next.id,
          taskId: task.id,
        });
      }
    }
  }

  if (prev.status !== next.status) {
    events.push({
      type: "project.statusChanged",
      projectId: next.id,
      from: prev.status,
      to: next.status,
    });
  }

  return events;
}
