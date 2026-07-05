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
