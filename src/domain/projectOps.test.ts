import { describe, expect, it } from "vitest";
import { newArea, newChecklist, newItem, newProject, newTask } from "./factories";
import {
  addArea,
  addChecklist,
  addItem,
  addTask,
  reorderAreas,
  reorderChecklistItems,
  reorderTasks,
} from "./projectOps";
import type { Project } from "./schemas";

function projectWithChecklist() {
  const area = newArea("Desarrollo");
  const cl = newChecklist("Lanzamiento");
  const items = [newItem("a"), newItem("b"), newItem("c")];
  let p = addArea(newProject("Demo"), area);
  p = addChecklist(p, area.id, cl);
  for (const item of items) p = addItem(p, area.id, cl.id, item);
  return { p, area, cl, items };
}

describe("reorderChecklistItems", () => {
  it("reordena los ítems según orderedIds", () => {
    const { p, area, cl, items } = projectWithChecklist();
    const next = reorderChecklistItems(p, area.id, cl.id, [
      items[2].id,
      items[0].id,
      items[1].id,
    ]);
    const got = next.areas[0].checklists[0].items.map((i) => i.text);
    expect(got).toEqual(["c", "a", "b"]);
  });

  it("ignora ids inexistentes", () => {
    const { p, area, cl, items } = projectWithChecklist();
    const next = reorderChecklistItems(p, area.id, cl.id, [
      "nope",
      items[1].id,
      items[0].id,
      "otro",
    ]);
    const got = next.areas[0].checklists[0].items.map((i) => i.text);
    expect(got).toEqual(["b", "a", "c"]);
  });

  it("no muta el Project de entrada", () => {
    const { p, area, cl, items } = projectWithChecklist();
    const before = JSON.stringify(p);
    reorderChecklistItems(p, area.id, cl.id, [items[2].id, items[1].id, items[0].id]);
    expect(JSON.stringify(p)).toBe(before);
  });
});

describe("reorderAreas", () => {
  function projectWithAreas() {
    const areas = [newArea("A"), newArea("B"), newArea("C")];
    let p = newProject("Demo");
    for (const a of areas) p = addArea(p, a);
    return { p, areas };
  }

  it("reordena las áreas según orderedIds", () => {
    const { p, areas } = projectWithAreas();
    const next = reorderAreas(p, [areas[1].id, areas[2].id, areas[0].id]);
    expect(next.areas.map((a) => a.name)).toEqual(["B", "C", "A"]);
  });

  it("ignora ids inexistentes y no muta la entrada", () => {
    const { p, areas } = projectWithAreas();
    const before = JSON.stringify(p);
    const next = reorderAreas(p, ["x", areas[2].id, areas[0].id]);
    expect(next.areas.map((a) => a.name)).toEqual(["C", "B", "A"]);
    expect(JSON.stringify(p)).toBe(before);
  });
});

describe("reorderTasks", () => {
  function projectWithTasks() {
    const tasks = ["t1", "t2", "t3", "t4", "t5"].map((t) => newTask(t));
    let p: Project = newProject("Demo");
    for (const t of tasks) p = addTask(p, t);
    return { p, tasks };
  }

  it("reordena el conjunto completo", () => {
    const { p, tasks } = projectWithTasks();
    const next = reorderTasks(
      p,
      [...tasks].reverse().map((t) => t.id),
    );
    expect(next.tasks.map((t) => t.title)).toEqual(["t5", "t4", "t3", "t2", "t1"]);
  });

  it("con un subconjunto (filtro de área activo) no descoloca las tareas de fuera", () => {
    const { p, tasks } = projectWithTasks();
    // Subconjunto visible: t2 y t4 (posiciones 1 y 3). Se invierten entre sí.
    const next = reorderTasks(p, [tasks[3].id, tasks[1].id]);
    expect(next.tasks.map((t) => t.title)).toEqual(["t1", "t4", "t3", "t2", "t5"]);
  });

  it("devuelve el mismo array si no hay cambio efectivo", () => {
    const { p, tasks } = projectWithTasks();
    const next = reorderTasks(
      p,
      tasks.map((t) => t.id),
    );
    expect(next.tasks).toBe(p.tasks);
  });
});
