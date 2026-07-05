import { z } from "zod";
import {
  DayDate,
  Health,
  Id,
  IsoDate,
  Priority,
  ProjectStatus,
  RaciRole,
  Recurrence,
  SCHEMA_VERSION,
  TaskStatus,
} from "./common";

export const ChecklistItemSchema = z.object({
  id: Id,
  text: z.string(),
  done: z.boolean().default(false),
  required: z.boolean().default(false),
  assigneeId: Id.nullable().default(null),
  dueDate: DayDate.default(null),
  notes: z.string().default(""),
  linkedTaskId: Id.nullable().default(null),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const ChecklistSchema = z.object({
  id: Id,
  name: z.string(),
  templateId: Id.nullable().default(null),
  recurrence: Recurrence.default("none"),
  items: z.array(ChecklistItemSchema).default([]),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type Checklist = z.infer<typeof ChecklistSchema>;

export const ProcessStepSchema = z.object({
  id: Id,
  text: z.string(),
  details: z.string().default(""),
});
export type ProcessStep = z.infer<typeof ProcessStepSchema>;

export const ProcessSchema = z.object({
  id: Id,
  name: z.string(),
  description: z.string().default(""),
  steps: z.array(ProcessStepSchema).default([]),
  version: z.number().default(1),
  ownerId: Id.nullable().default(null),
  templateId: Id.nullable().default(null),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type Process = z.infer<typeof ProcessSchema>;

export const AreaSchema = z.object({
  id: Id,
  name: z.string(),
  icon: z.string().default("folder"),
  ownerId: Id.nullable().default(null),
  completed: z.boolean().default(false),
  processes: z.array(ProcessSchema).default([]),
  checklists: z.array(ChecklistSchema).default([]),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type Area = z.infer<typeof AreaSchema>;

export const TaskSchema = z.object({
  id: Id,
  title: z.string(),
  description: z.string().default(""),
  status: TaskStatus.default("todo"),
  priority: Priority.default("medium"),
  assigneeId: Id.nullable().default(null),
  dueDate: DayDate.default(null),
  areaId: Id.nullable().default(null),
  sourceItemId: Id.nullable().default(null),
  tags: z.array(z.string()).default([]),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type Task = z.infer<typeof TaskSchema>;

export const MilestoneSchema = z.object({
  id: Id,
  name: z.string(),
  dueDate: DayDate.default(null),
  taskIds: z.array(Id).default([]),
  done: z.boolean().default(false),
});
export type Milestone = z.infer<typeof MilestoneSchema>;

export const StakeholderSchema = z.object({
  personId: Id,
  role: RaciRole,
});
export type Stakeholder = z.infer<typeof StakeholderSchema>;

export const ProjectSchema = z.object({
  id: Id,
  schemaVersion: z.number().default(SCHEMA_VERSION),
  productId: Id.nullable().default(null),
  typeId: Id.nullable().default(null),
  name: z.string().min(1),
  description: z.string().default(""),
  status: ProjectStatus.default("active"),
  priority: Priority.default("medium"),
  health: Health.default("green"),
  ownerId: Id.nullable().default(null),
  stakeholders: z.array(StakeholderSchema).default([]),
  startDate: DayDate.default(null),
  dueDate: DayDate.default(null),
  tags: z.array(z.string()).default([]),
  areas: z.array(AreaSchema).default([]),
  tasks: z.array(TaskSchema).default([]),
  milestones: z.array(MilestoneSchema).default([]),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type Project = z.infer<typeof ProjectSchema>;
