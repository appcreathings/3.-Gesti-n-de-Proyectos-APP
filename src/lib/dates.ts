import type { EntityRef, Project } from "@/domain/schemas";

/** Pure date/period helpers used by the temporal evaluator (M4). */

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local calendar day key, `YYYY-MM-DD`. */
export function todayKey(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** ISO-8601 week key, `YYYY-Www`. */
export function weekKey(now: Date): string {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = d.getUTCDay() || 7; // Mon=1..Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - day); // shift to the Thursday of this week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${pad(weekNo)}`;
}

export interface DatedEntity {
  ref: EntityRef;
  dueDate: string; // YYYY-MM-DD (non-null)
  label: string;
}

/**
 * Enumerate the open, dated entities of a project (project due date, pending
 * tasks, pending checklist items). Milestones are omitted: `EntityRef` has no
 * milestone kind and they are not yet surfaced in the UI.
 */
export function collectDatedEntities(p: Project): DatedEntity[] {
  const out: DatedEntity[] = [];

  if (p.dueDate) {
    out.push({ ref: { kind: "project", projectId: p.id }, dueDate: p.dueDate, label: p.name });
  }

  for (const t of p.tasks) {
    if (t.dueDate && t.status !== "done") {
      out.push({
        ref: { kind: "task", projectId: p.id, taskId: t.id },
        dueDate: t.dueDate,
        label: t.title,
      });
    }
  }

  for (const a of p.areas) {
    for (const cl of a.checklists) {
      for (const it of cl.items) {
        if (it.dueDate && !it.done) {
          out.push({
            ref: {
              kind: "checklistItem",
              projectId: p.id,
              areaId: a.id,
              checklistId: cl.id,
              itemId: it.id,
            },
            dueDate: it.dueDate,
            label: it.text,
          });
        }
      }
    }
  }

  return out;
}

/** Stable key for an entity reference, used to build deterministic ids. */
export function entityKey(ref: EntityRef): string {
  return [ref.projectId, ref.areaId, ref.checklistId, ref.itemId, ref.taskId]
    .filter(Boolean)
    .join("/");
}
