import type { Area, Checklist, Project } from "./schemas";

export interface ProgressStat {
  done: number;
  total: number;
  pct: number; // 0..100
}

function stat(done: number, total: number): ProgressStat {
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function checklistProgress(c: Checklist): ProgressStat {
  const done = c.items.filter((i) => i.done).length;
  return stat(done, c.items.length);
}

export function areaProgress(a: Area): ProgressStat {
  let done = 0;
  let total = 0;
  for (const c of a.checklists) {
    done += c.items.filter((i) => i.done).length;
    total += c.items.length;
  }
  return stat(done, total);
}

export function projectChecklistProgress(p: Project): ProgressStat {
  let done = 0;
  let total = 0;
  for (const a of p.areas) {
    const s = areaProgress(a);
    done += s.done;
    total += s.total;
  }
  return stat(done, total);
}

export function projectTaskProgress(p: Project): ProgressStat {
  const done = p.tasks.filter((t) => t.status === "done").length;
  return stat(done, p.tasks.length);
}

export function isStalled(p: Project, stalledAfterDays: number): boolean {
  if (p.status === "done" || p.status === "archived") return false;
  const ageMs = Date.now() - new Date(p.updatedAt).getTime();
  return ageMs > stalledAfterDays * 24 * 60 * 60 * 1000;
}

/** Days until a YYYY-MM-DD date; negative = overdue. null if no date. */
export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const target = new Date(date + "T23:59:59");
  return Math.ceil((target.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}
