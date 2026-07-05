import { describe, expect, it } from "vitest";
import {
  newArea,
  newChecklist,
  newItem,
  newProject,
  newTask,
} from "@/domain/factories";
import * as ops from "@/domain/projectOps";
import { ACTIVITY_CAP, emptyActivityDoc } from "@/domain/schemas";
import { diffProjectEvents } from "./events";
import { appendEntries, describeEvents } from "./activity";

function projectWithChecklist() {
  const area = newArea("Lanzamiento");
  const cl = newChecklist("QA");
  cl.items = [newItem("Probar build")];
  area.checklists = [cl];
  const project = { ...newProject("Demo"), areas: [area] };
  return { project, area, cl, item: cl.items[0] };
}

describe("describeEvents", () => {
  it("describe un ítem marcado y una checklist completada", () => {
    const { project, area, cl, item } = projectWithChecklist();
    const next = ops.updateItem(project, area.id, cl.id, { ...item, done: true });

    const entries = describeEvents(diffProjectEvents(project, next), next);
    const messages = entries.map((e) => e.message);
    expect(messages).toContain(`Ítem "Probar build" marcado en "QA" (Lanzamiento)`);
    expect(messages).toContain(`Checklist "QA" completada en Lanzamiento`);
  });

  it("describe cambios de estado de tarea con etiquetas en español", () => {
    const task = newTask("Deploy");
    const prev = ops.addTask(newProject("Demo"), task);
    const next = ops.updateTask(prev, { ...task, status: "doing" });

    const entries = describeEvents(diffProjectEvents(prev, next), next);
    expect(entries).toHaveLength(1);
    expect(entries[0].message).toBe(`Tarea "Deploy": Por hacer → En curso`);
    expect(entries[0].entityRef).toMatchObject({ kind: "task", taskId: task.id });
  });

  it("ignora eventos cuyo objeto ya no existe en el proyecto", () => {
    const project = newProject("Demo");
    const entries = describeEvents(
      [{ type: "task.added", projectId: project.id, taskId: "fantasma" }],
      project,
    );
    expect(entries).toHaveLength(0);
  });
});

describe("appendEntries", () => {
  it("antepone lo nuevo y respeta el cap", () => {
    const project = newProject("Demo");
    const old = describeEvents(
      [{ type: "project.created", projectId: project.id, typeId: null }],
      project,
    );
    let doc = appendEntries(emptyActivityDoc(), old);
    const filler = Array.from({ length: ACTIVITY_CAP }, (_, i) =>
      describeEvents(
        [{ type: "project.statusChanged", projectId: project.id, from: "a", to: `s${i}` }],
        project,
      )[0],
    );
    doc = appendEntries(doc, filler);
    expect(doc.entries).toHaveLength(ACTIVITY_CAP);
    expect(doc.entries[0].message).toBe("Estado del proyecto: a → s0");
    // La entrada más vieja (project.created) quedó fuera por el cap.
    expect(doc.entries.some((e) => e.type === "project.created")).toBe(false);
  });
});
