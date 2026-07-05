import { describe, expect, it } from "vitest";
import { newProject, newTask } from "@/domain/factories";
import * as ops from "@/domain/projectOps";
import { diffProjectEvents } from "./events";

describe("diffProjectEvents — task events", () => {
  it("emite task.added al añadir una tarea", () => {
    const prev = newProject("P");
    const task = newTask("Nueva");
    const next = ops.addTask(prev, task);

    const events = diffProjectEvents(prev, next);
    expect(events).toContainEqual({
      type: "task.added",
      projectId: prev.id,
      taskId: task.id,
    });
  });

  it("emite task.statusChanged al mover una tarea", () => {
    const task = newTask("Mover");
    const prev = ops.addTask(newProject("P"), task);
    const next = ops.updateTask(prev, { ...task, status: "doing" });

    const events = diffProjectEvents(prev, next);
    expect(events).toContainEqual({
      type: "task.statusChanged",
      projectId: prev.id,
      taskId: task.id,
      from: "todo",
      to: "doing",
    });
  });

  it("no emite eventos de tarea si nada cambió", () => {
    const task = newTask("Igual");
    const prev = ops.addTask(newProject("P"), task);

    const events = diffProjectEvents(prev, prev);
    expect(events.filter((e) => e.type.startsWith("task."))).toHaveLength(0);
  });

  it("no emite task.statusChanged al editar otros campos", () => {
    const task = newTask("Editar");
    const prev = ops.addTask(newProject("P"), task);
    const next = ops.updateTask(prev, { ...task, title: "Editada" });

    const events = diffProjectEvents(prev, next);
    expect(events.filter((e) => e.type === "task.statusChanged")).toHaveLength(0);
  });
});
