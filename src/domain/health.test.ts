import { describe, expect, it } from "vitest";
import { newProject, newTask } from "./factories";
import type { Project, Settings } from "./schemas";
import { deriveHealth, effectiveHealth } from "./health";

const SETTINGS: Settings = {
  theme: "system",
  stalledAfterDays: 14,
  dueSoonDays: 7,
  deriveHealth: true,
};

const NOW = new Date();

function dayOffset(days: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function withTaskDue(due: string): Project {
  const p = newProject("Demo");
  const t = newTask("Entrega");
  t.dueDate = due;
  p.tasks = [t];
  return p;
}

describe("deriveHealth", () => {
  it("is green for a fresh project with no dates", () => {
    expect(deriveHealth(newProject("Nuevo"), SETTINGS, NOW)).toBe("green");
  });

  it("is red when stalled", () => {
    const p: Project = { ...newProject("Viejo"), updatedAt: dayOffset(-20) + "T10:00:00.000Z" };
    expect(deriveHealth(p, SETTINGS, NOW)).toBe("red");
  });

  it("is red with an overdue date", () => {
    expect(deriveHealth(withTaskDue(dayOffset(-5)), SETTINGS, NOW)).toBe("red");
  });

  it("is amber with a due-soon date", () => {
    expect(deriveHealth(withTaskDue(dayOffset(3)), SETTINGS, NOW)).toBe("amber");
  });

  it("is green when dates are far out", () => {
    expect(deriveHealth(withTaskDue(dayOffset(30)), SETTINGS, NOW)).toBe("green");
  });

  it("is green for done/archived projects regardless of dates", () => {
    const p: Project = { ...withTaskDue(dayOffset(-5)), status: "done" };
    expect(deriveHealth(p, SETTINGS, NOW)).toBe("green");
  });
});

describe("effectiveHealth", () => {
  it("returns the manual health when derivation is off", () => {
    const p: Project = { ...withTaskDue(dayOffset(-5)), health: "green" };
    expect(effectiveHealth(p, { ...SETTINGS, deriveHealth: false }, NOW)).toBe("green");
  });

  it("returns the derived health when derivation is on", () => {
    const p: Project = { ...withTaskDue(dayOffset(-5)), health: "green" };
    expect(effectiveHealth(p, { ...SETTINGS, deriveHealth: true }, NOW)).toBe("red");
  });
});
