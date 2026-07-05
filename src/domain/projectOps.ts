import { nowIso } from "@/lib/utils";
import type {
  Area,
  Checklist,
  ChecklistItem,
  Process,
  Project,
  Task,
} from "./schemas";

/** Pure, immutable update helpers for the aggregated Project document. */

function touchArea(a: Area): Area {
  return { ...a, updatedAt: nowIso() };
}

export function addArea(p: Project, area: Area): Project {
  return { ...p, areas: [...p.areas, area] };
}

export function updateArea(p: Project, area: Area): Project {
  return {
    ...p,
    areas: p.areas.map((a) => (a.id === area.id ? touchArea(area) : a)),
  };
}

export function removeArea(p: Project, areaId: string): Project {
  return { ...p, areas: p.areas.filter((a) => a.id !== areaId) };
}

function mapArea(p: Project, areaId: string, fn: (a: Area) => Area): Project {
  return {
    ...p,
    areas: p.areas.map((a) => (a.id === areaId ? touchArea(fn(a)) : a)),
  };
}

export function addProcess(p: Project, areaId: string, proc: Process): Project {
  return mapArea(p, areaId, (a) => ({ ...a, processes: [...a.processes, proc] }));
}

export function updateProcess(p: Project, areaId: string, proc: Process): Project {
  return mapArea(p, areaId, (a) => ({
    ...a,
    processes: a.processes.map((x) =>
      x.id === proc.id ? { ...proc, updatedAt: nowIso() } : x,
    ),
  }));
}

export function removeProcess(p: Project, areaId: string, procId: string): Project {
  return mapArea(p, areaId, (a) => ({
    ...a,
    processes: a.processes.filter((x) => x.id !== procId),
  }));
}

export function addChecklist(p: Project, areaId: string, cl: Checklist): Project {
  return mapArea(p, areaId, (a) => ({ ...a, checklists: [...a.checklists, cl] }));
}

export function removeChecklist(p: Project, areaId: string, clId: string): Project {
  return mapArea(p, areaId, (a) => ({
    ...a,
    checklists: a.checklists.filter((c) => c.id !== clId),
  }));
}

function mapChecklist(
  p: Project,
  areaId: string,
  clId: string,
  fn: (c: Checklist) => Checklist,
): Project {
  return mapArea(p, areaId, (a) => ({
    ...a,
    checklists: a.checklists.map((c) =>
      c.id === clId ? { ...fn(c), updatedAt: nowIso() } : c,
    ),
  }));
}

export function addItem(
  p: Project,
  areaId: string,
  clId: string,
  item: ChecklistItem,
): Project {
  return mapChecklist(p, areaId, clId, (c) => ({ ...c, items: [...c.items, item] }));
}

export function updateItem(
  p: Project,
  areaId: string,
  clId: string,
  item: ChecklistItem,
): Project {
  return mapChecklist(p, areaId, clId, (c) => ({
    ...c,
    items: c.items.map((i) => (i.id === item.id ? item : i)),
  }));
}

export function removeItem(
  p: Project,
  areaId: string,
  clId: string,
  itemId: string,
): Project {
  return mapChecklist(p, areaId, clId, (c) => ({
    ...c,
    items: c.items.filter((i) => i.id !== itemId),
  }));
}

export function addTask(p: Project, task: Task): Project {
  return { ...p, tasks: [...p.tasks, task] };
}

export function updateTask(p: Project, task: Task): Project {
  return {
    ...p,
    tasks: p.tasks.map((t) =>
      t.id === task.id ? { ...task, updatedAt: nowIso() } : t,
    ),
  };
}

export function removeTask(p: Project, taskId: string): Project {
  return { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) };
}

/**
 * Reorder the elements whose ids appear in `orderedIds` into that sequence,
 * keeping every other element in its original slot. Ids not present in the
 * array (or duplicated) are ignored. Returns the input array untouched when
 * nothing effectively changes.
 */
function reorderByIds<T extends { id: string }>(arr: T[], orderedIds: string[]): T[] {
  const byId = new Map(arr.map((x) => [x.id, x] as const));
  const seen = new Set<string>();
  const validIds = orderedIds.filter((id) => {
    if (!byId.has(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  if (validIds.length < 2) return arr;
  const slots: number[] = [];
  arr.forEach((x, i) => {
    if (seen.has(x.id)) slots.push(i);
  });
  const next = [...arr];
  let changed = false;
  slots.forEach((slot, k) => {
    const el = byId.get(validIds[k])!;
    if (next[slot] !== el) {
      next[slot] = el;
      changed = true;
    }
  });
  return changed ? next : arr;
}

export function reorderChecklistItems(
  p: Project,
  areaId: string,
  clId: string,
  orderedIds: string[],
): Project {
  return mapChecklist(p, areaId, clId, (c) => ({
    ...c,
    items: reorderByIds(c.items, orderedIds),
  }));
}

export function reorderAreas(p: Project, orderedIds: string[]): Project {
  return { ...p, areas: reorderByIds(p.areas, orderedIds) };
}

export function reorderTasks(p: Project, orderedIds: string[]): Project {
  return { ...p, tasks: reorderByIds(p.tasks, orderedIds) };
}

/** Apply a checklist to an existing area (non-destructive: always adds). */
export function applyChecklistToArea(
  p: Project,
  areaId: string,
  checklist: Checklist,
): Project {
  return mapArea(p, areaId, (a) => ({ ...a, checklists: [...a.checklists, checklist] }));
}

/** Apply a process to an existing area (non-destructive: always adds). */
export function applyProcessToArea(
  p: Project,
  areaId: string,
  process: Process,
): Project {
  return mapArea(p, areaId, (a) => ({ ...a, processes: [...a.processes, process] }));
}
