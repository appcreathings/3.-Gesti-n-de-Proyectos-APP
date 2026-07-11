import { describe, it, expect } from "vitest";
import { buildSyntheticEvent, EVENT_SEED_REQUIREMENTS } from "./synthetic-event";
import type { Area, Checklist, ChecklistItem, Project, Task } from "@/domain/schemas";

const now = new Date().toISOString();

const project: Project = {
  id: "proj-1",
  schemaVersion: 7,
  productId: null,
  typeId: "type-1",
  quarterId: null,
  name: "P",
  description: "",
  status: "active",
  priority: "medium",
  health: "green",
  ownerId: null,
  stakeholders: [],
  startDate: null,
  dueDate: null,
  tags: [],
  areas: [],
  tasks: [],
  milestones: [],
  sprints: [],
  wipLimits: { todo: null, doing: null, blocked: null, done: null },
  dedupeKey: null,
  createdAt: now,
  updatedAt: now,
};

const task: Task = {
  id: "task-1",
  title: "T",
  description: "",
  summary: "",
  status: "doing",
  priority: "medium",
  assigneeId: null,
  dueDate: null,
  areaId: null,
  sourceItemId: null,
  sprintId: null,
  tags: [],
  comments: [],
  archived: false,
  estimate: null,
  subtasks: [],
  dedupeKey: null,
  createdAt: now,
  updatedAt: now,
};

const item: ChecklistItem = {
  id: "item-1",
  text: "Do it",
  done: false,
  required: false,
  assigneeId: null,
  dueDate: null,
  notes: "",
  linkedTaskId: null,
};

const checklist: Checklist = {
  id: "checklist-1",
  name: "Checklist",
  templateId: null,
  recurrence: "none",
  items: [item],
  createdAt: now,
  updatedAt: now,
};

const area: Area = {
  id: "area-1",
  name: "Area",
  icon: "folder",
  ownerId: null,
  completed: false,
  processes: [],
  checklists: [checklist],
  createdAt: now,
  updatedAt: now,
};

describe("EVENT_SEED_REQUIREMENTS", () => {
  it("covers all 11 DomainEvent types", () => {
    expect(Object.keys(EVENT_SEED_REQUIREMENTS)).toHaveLength(11);
  });
});

describe("buildSyntheticEvent", () => {
  it("project.created uses the project's current typeId", () => {
    expect(buildSyntheticEvent("project.created", { project })).toEqual({
      type: "project.created",
      projectId: "proj-1",
      typeId: "type-1",
    });
  });

  it("project.statusChanged defaults from=to=current status (v1 simplification)", () => {
    expect(buildSyntheticEvent("project.statusChanged", { project })).toEqual({
      type: "project.statusChanged",
      projectId: "proj-1",
      from: "active",
      to: "active",
    });
  });

  it("task.statusChanged defaults from=to=current task status", () => {
    expect(buildSyntheticEvent("task.statusChanged", { project, task })).toEqual({
      type: "task.statusChanged",
      projectId: "proj-1",
      taskId: "task-1",
      from: "doing",
      to: "doing",
    });
  });

  it("task.commented uses the task's last real comment id when one exists", () => {
    const commentedTask: Task = {
      ...task,
      comments: [
        { id: "c1", authorId: null, text: "hi", createdAt: now, updatedAt: now },
        { id: "c2", authorId: null, text: "bye", createdAt: now, updatedAt: now },
      ],
    };
    const event = buildSyntheticEvent("task.commented", { project, task: commentedTask });
    expect(event).toMatchObject({ type: "task.commented", projectId: "proj-1", taskId: "task-1", commentId: "c2" });
  });

  it("task.commented synthesizes an inert id when the task has no comments", () => {
    const event = buildSyntheticEvent("task.commented", { project, task });
    expect(event.type).toBe("task.commented");
    if (event.type === "task.commented") expect(event.commentId).toBeTruthy();
  });

  it("area.completed targets the chosen area", () => {
    expect(buildSyntheticEvent("area.completed", { project, area })).toEqual({
      type: "area.completed",
      projectId: "proj-1",
      areaId: "area-1",
    });
  });

  it("checklist.completed targets the chosen area + checklist", () => {
    expect(buildSyntheticEvent("checklist.completed", { project, area, checklist })).toEqual({
      type: "checklist.completed",
      projectId: "proj-1",
      areaId: "area-1",
      checklistId: "checklist-1",
    });
  });

  it("item.checked targets the chosen area + checklist + item", () => {
    expect(buildSyntheticEvent("item.checked", { project, area, checklist, item })).toEqual({
      type: "item.checked",
      projectId: "proj-1",
      areaId: "area-1",
      checklistId: "checklist-1",
      itemId: "item-1",
    });
  });

  it("throws a clear error instead of silently building a broken event when the required entity is missing", () => {
    expect(() => buildSyntheticEvent("task.added", { project })).toThrow(/tarea/i);
    expect(() => buildSyntheticEvent("area.added", { project })).toThrow(/área/i);
    expect(() => buildSyntheticEvent("checklist.completed", { project, area })).toThrow(/checklist/i);
    expect(() => buildSyntheticEvent("item.checked", { project, area, checklist })).toThrow(/ítem/i);
  });
});
