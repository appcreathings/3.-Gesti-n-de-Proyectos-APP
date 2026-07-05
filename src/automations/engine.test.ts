import { describe, expect, it } from "vitest";
import {
  newArea,
  newAutomation,
  newChecklist,
  newChecklistTemplate,
  newItem,
  newProject,
} from "@/domain/factories";
import type { AutomationRule, Project } from "@/domain/schemas";
import { diffProjectEvents } from "./events";
import { runEngine } from "./engine";

function projectWithChecklist(): { project: Project; ids: Record<string, string> } {
  const project = newProject("Demo");
  const area = newArea("Desarrollo");
  const cl = newChecklist("QA");
  const i1 = newItem("Paso 1");
  const i2 = newItem("Paso 2");
  cl.items = [i1, i2];
  area.checklists = [cl];
  project.areas = [area];
  return {
    project,
    ids: { area: area.id, checklist: cl.id, i1: i1.id, i2: i2.id },
  };
}

function checkAllItems(p: Project): Project {
  return {
    ...p,
    areas: p.areas.map((a) => ({
      ...a,
      checklists: a.checklists.map((c) => ({
        ...c,
        items: c.items.map((it) => ({ ...it, done: true })),
      })),
    })),
  };
}

describe("diffProjectEvents", () => {
  it("emits item.checked, checklist.completed and area.completed when all items get done", () => {
    const { project } = projectWithChecklist();
    const next = checkAllItems(project);
    const events = diffProjectEvents(project, next);
    const types = events.map((e) => e.type);
    expect(types).toContain("item.checked");
    expect(types).toContain("checklist.completed");
    expect(types).toContain("area.completed");
    // Two items checked.
    expect(types.filter((t) => t === "item.checked")).toHaveLength(2);
  });

  it("emits project.statusChanged on status transition", () => {
    const { project } = projectWithChecklist();
    const next: Project = { ...project, status: "done" };
    const events = diffProjectEvents(project, next);
    expect(events).toContainEqual({
      type: "project.statusChanged",
      projectId: project.id,
      from: "active",
      to: "done",
    });
  });
});

describe("runEngine", () => {
  it("marks the area complete when its checklist is completed (rule of state)", () => {
    const { project, ids } = projectWithChecklist();
    const next = checkAllItems(project);
    const events = diffProjectEvents(project, next);

    const rule: AutomationRule = {
      ...newAutomation("Cerrar área"),
      trigger: { type: "checklist.completed" },
      actions: [{ type: "markAreaComplete" }],
    };

    const result = runEngine({
      events,
      rules: [rule],
      projects: [next],
      checklistTemplates: [],
    });

    expect(result.changedProjects).toHaveLength(1);
    const area = result.changedProjects[0].areas.find((a) => a.id === ids.area);
    expect(area?.completed).toBe(true);
  });

  it("creates a checklist from template on area.added, and is idempotent", () => {
    const tpl = newChecklistTemplate("Onboarding");
    tpl.items = [{ id: "x", text: "Bienvenida", required: true }];
    const project = newProject("Demo");
    const area = newArea("Marketing");
    project.areas = [area];

    const rule: AutomationRule = {
      ...newAutomation("Sembrar checklist"),
      trigger: { type: "area.added" },
      actions: [{ type: "createChecklistFromTemplate", templateId: tpl.id }],
    };
    const event = { type: "area.added" as const, projectId: project.id, areaId: area.id };

    const first = runEngine({
      events: [event],
      rules: [rule],
      projects: [project],
      checklistTemplates: [tpl],
    });
    expect(first.changedProjects).toHaveLength(1);
    const seeded = first.changedProjects[0];
    expect(seeded.areas[0].checklists).toHaveLength(1);
    expect(seeded.areas[0].checklists[0].items[0].text).toBe("Bienvenida");

    // Running again over the seeded project must not duplicate.
    const second = runEngine({
      events: [event],
      rules: [rule],
      projects: [seeded],
      checklistTemplates: [tpl],
    });
    expect(second.changedProjects).toHaveLength(0);
  });

  it("respects enabled flag and project scope", () => {
    const { project, ids } = projectWithChecklist();
    const next = checkAllItems(project);
    const events = diffProjectEvents(project, next);

    const disabled: AutomationRule = {
      ...newAutomation("off"),
      enabled: false,
      trigger: { type: "checklist.completed" },
      actions: [{ type: "markAreaComplete" }],
    };
    expect(
      runEngine({ events, rules: [disabled], projects: [next], checklistTemplates: [] })
        .changedProjects,
    ).toHaveLength(0);

    const otherScope: AutomationRule = {
      ...newAutomation("scoped"),
      scope: { kind: "project", id: "another-id" },
      trigger: { type: "checklist.completed" },
      actions: [{ type: "markAreaComplete" }],
    };
    expect(
      runEngine({ events, rules: [otherScope], projects: [next], checklistTemplates: [] })
        .changedProjects,
    ).toHaveLength(0);
    void ids;
  });

  it("evaluates numeric conditions on progress", () => {
    const { project } = projectWithChecklist();
    const next = checkAllItems(project);
    const events = diffProjectEvents(project, next);

    const rule: AutomationRule = {
      ...newAutomation("only when 100"),
      trigger: { type: "checklist.completed" },
      conditions: [{ field: "checklist.progress", op: ">=", value: "100" }],
      actions: [{ type: "setProjectStatus", status: "done" }],
    };
    const result = runEngine({
      events,
      rules: [rule],
      projects: [next],
      checklistTemplates: [],
    });
    expect(result.changedProjects[0]?.status).toBe("done");
  });
});
