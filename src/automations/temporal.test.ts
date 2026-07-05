import { describe, expect, it } from "vitest";
import { newArea, newChecklist, newItem, newProject, newTask } from "@/domain/factories";
import type { Project, Settings } from "@/domain/schemas";
import { evaluateTemporal } from "./temporal";

const SETTINGS: Settings = {
  theme: "system",
  stalledAfterDays: 14,
  dueSoonDays: 7,
  deriveHealth: false,
};

const NOW = new Date();

/** YYYY-MM-DD offset by `days` from a base date. */
function dayOffset(days: number, base = NOW): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function projectWithTaskDue(due: string): Project {
  const p = newProject("Demo");
  const t = newTask("Entregar informe");
  t.dueDate = due;
  p.tasks = [t];
  return p;
}

describe("evaluateTemporal — dates", () => {
  it("creates one overdue notification for a past task due date", () => {
    const project = projectWithTaskDue(dayOffset(-5));
    const { notifications } = evaluateTemporal({
      projects: [project],
      settings: SETTINGS,
      now: NOW,
      existing: [],
    });
    const overdue = notifications.filter((n) => n.type === "date.overdue");
    expect(overdue).toHaveLength(1);
    expect(overdue[0].entityRef?.kind).toBe("task");
  });

  it("flags a due-soon date within dueSoonDays", () => {
    const project = projectWithTaskDue(dayOffset(3));
    const { notifications } = evaluateTemporal({
      projects: [project],
      settings: SETTINGS,
      now: NOW,
      existing: [],
    });
    expect(notifications.filter((n) => n.type === "date.approaching")).toHaveLength(1);
  });

  it("ignores dates beyond the due-soon window", () => {
    const project = projectWithTaskDue(dayOffset(30));
    const { notifications } = evaluateTemporal({
      projects: [project],
      settings: SETTINGS,
      now: NOW,
      existing: [],
    });
    expect(notifications).toHaveLength(0);
  });

  it("skips done/archived projects", () => {
    const project: Project = { ...projectWithTaskDue(dayOffset(-5)), status: "done" };
    const { notifications } = evaluateTemporal({
      projects: [project],
      settings: SETTINGS,
      now: NOW,
      existing: [],
    });
    expect(notifications).toHaveLength(0);
  });
});

describe("evaluateTemporal — stalled", () => {
  it("flags a project with no recent activity", () => {
    const project: Project = { ...newProject("Vieja"), updatedAt: dayOffset(-20) + "T10:00:00.000Z" };
    const { notifications } = evaluateTemporal({
      projects: [project],
      settings: SETTINGS,
      now: NOW,
      existing: [],
    });
    expect(notifications.filter((n) => n.type === "project.stalled")).toHaveLength(1);
  });

  it("does not flag a fresh project", () => {
    const { notifications } = evaluateTemporal({
      projects: [newProject("Nueva")],
      settings: SETTINGS,
      now: NOW,
      existing: [],
    });
    expect(notifications).toHaveLength(0);
  });
});

describe("evaluateTemporal — idempotency", () => {
  it("does not duplicate notifications on a second run with the same now", () => {
    const project = projectWithTaskDue(dayOffset(-5));
    const input = { projects: [project], settings: SETTINGS, now: NOW, existing: [] };
    const first = evaluateTemporal(input);
    const second = evaluateTemporal({ ...input, existing: first.notifications });
    expect(first.notifications.length).toBeGreaterThan(0);
    expect(second.notifications).toHaveLength(0);
  });
});

describe("evaluateTemporal — recurring checklists", () => {
  function dailyCompletedYesterday(): Project {
    const p = newProject("Rutina");
    const area = newArea("Operaciones");
    const cl = newChecklist("Apertura");
    cl.recurrence = "daily";
    cl.items = [newItem("Revisar caja"), newItem("Abrir local")].map((i) => ({ ...i, done: true }));
    cl.updatedAt = dayOffset(-1) + "T10:00:00.000Z";
    area.checklists = [cl];
    p.areas = [area];
    return p;
  }

  it("resets a completed daily checklist from a previous day, once", () => {
    const project = dailyCompletedYesterday();
    const first = evaluateTemporal({
      projects: [project],
      settings: SETTINGS,
      now: NOW,
      existing: [],
    });
    expect(first.changedProjects).toHaveLength(1);
    const items = first.changedProjects[0].areas[0].checklists[0].items;
    expect(items.every((i) => !i.done)).toBe(true);

    // Re-running over the reset project (updatedAt = now) must not roll it over again.
    const second = evaluateTemporal({
      projects: first.changedProjects,
      settings: SETTINGS,
      now: NOW,
      existing: [],
    });
    expect(second.changedProjects).toHaveLength(0);
  });

  it("leaves an incomplete recurring checklist untouched", () => {
    const project = dailyCompletedYesterday();
    project.areas[0].checklists[0].items[0].done = false;
    const { changedProjects } = evaluateTemporal({
      projects: [project],
      settings: SETTINGS,
      now: NOW,
      existing: [],
    });
    expect(changedProjects).toHaveLength(0);
  });
});
