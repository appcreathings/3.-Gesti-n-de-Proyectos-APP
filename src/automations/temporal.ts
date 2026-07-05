import { checklistProgress, daysUntil, isStalled } from "@/domain/compute";
import { nowIso } from "@/lib/utils";
import {
  collectDatedEntities,
  entityKey,
  todayKey,
  weekKey,
  type DatedEntity,
} from "@/lib/dates";
import type { Notification, Project, Settings, Severity } from "@/domain/schemas";

export interface TemporalInput {
  projects: Project[];
  settings: Settings;
  now: Date;
  /** Notifications already persisted; used to keep the pass idempotent. */
  existing: Notification[];
}

export interface TemporalResult {
  notifications: Notification[];
  changedProjects: Project[];
}

/**
 * Pure temporal evaluation (M4): scans projects for overdue / due-soon dates and
 * stalled projects, and rolls over completed recurring checklists. Deterministic
 * and idempotent — running twice with the same `now` and `existing` adds nothing.
 */
export function evaluateTemporal(input: TemporalInput): TemporalResult {
  const { settings, now } = input;
  const dayKey = todayKey(now);
  const existingIds = new Set(input.existing.map((n) => n.id));
  const seen = new Set<string>();
  const notifications: Notification[] = [];
  const changedProjects: Project[] = [];

  const push = (
    id: string,
    type: string,
    severity: Severity,
    message: string,
    ref: Notification["entityRef"],
  ) => {
    if (existingIds.has(id) || seen.has(id)) return;
    seen.add(id);
    notifications.push({
      id,
      type,
      severity,
      message,
      entityRef: ref,
      read: false,
      createdAt: nowIso(),
    });
  };

  for (const original of input.projects) {
    if (original.status === "done" || original.status === "archived") continue;

    // T051 — roll over completed recurring checklists into a fresh period.
    const { project, mutated } = rolloverRecurring(original, now);
    if (mutated) changedProjects.push(project);

    // T050 — date notifications.
    for (const de of collectDatedEntities(project)) {
      const d = daysUntil(de.dueDate);
      if (d === null) continue;

      if (d < 0) {
        push(
          `date.overdue:${entityKey(de.ref)}:${dayKey}`,
          "date.overdue",
          overdueSeverity(project, de),
          overdueMessage(project, de, -d),
          de.ref,
        );
      } else if (d <= settings.dueSoonDays) {
        push(
          `date.approaching:${entityKey(de.ref)}:${dayKey}`,
          "date.approaching",
          "info",
          approachingMessage(project, de, d),
          de.ref,
        );
      }
    }

    // T050 — stalled projects.
    if (isStalled(project, settings.stalledAfterDays)) {
      push(
        `project.stalled:${project.id}:${dayKey}`,
        "project.stalled",
        "warning",
        `Proyecto «${project.name}» sin actividad hace ${settings.stalledAfterDays}+ días`,
        { kind: "project", projectId: project.id },
      );
    }
  }

  return { notifications, changedProjects };
}

function overdueSeverity(project: Project, de: DatedEntity): Severity {
  if (de.ref.kind === "project" && project.priority === "critical") return "critical";
  return "warning";
}

function overdueMessage(project: Project, de: DatedEntity, daysLate: number): string {
  const suffix = `hace ${daysLate} día${daysLate === 1 ? "" : "s"}`;
  if (de.ref.kind === "project") return `Proyecto «${de.label}» vencido ${suffix}`;
  return `«${de.label}» vencido ${suffix} · ${project.name}`;
}

function approachingMessage(project: Project, de: DatedEntity, daysLeft: number): string {
  const when = daysLeft === 0 ? "vence hoy" : `vence en ${daysLeft} día${daysLeft === 1 ? "" : "s"}`;
  if (de.ref.kind === "project") return `Proyecto «${de.label}» ${when}`;
  return `«${de.label}» ${when} · ${project.name}`;
}

/**
 * Reset every fully-completed recurring checklist whose last update belongs to a
 * previous period. Bumping `updatedAt` to now makes re-runs in the same period a
 * no-op (idempotency guard).
 */
function rolloverRecurring(p: Project, now: Date): { project: Project; mutated: boolean } {
  let mutated = false;
  const ts = nowIso();

  const areas = p.areas.map((area) => ({
    ...area,
    checklists: area.checklists.map((cl) => {
      if (cl.recurrence === "none") return cl;
      const prog = checklistProgress(cl);
      if (prog.total === 0 || prog.pct !== 100) return cl;

      const updated = new Date(cl.updatedAt);
      const rolled =
        cl.recurrence === "daily"
          ? todayKey(updated) !== todayKey(now)
          : weekKey(updated) !== weekKey(now);
      if (!rolled) return cl;

      mutated = true;
      return {
        ...cl,
        items: cl.items.map((it) => ({ ...it, done: false })),
        updatedAt: ts,
      };
    }),
  }));

  if (!mutated) return { project: p, mutated: false };
  return { project: { ...p, areas, updatedAt: ts }, mutated: true };
}
