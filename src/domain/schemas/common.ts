import { z } from "zod";

export const SCHEMA_VERSION = 16;

/** Enumerations (constitución / data-model.md). */
export const ProductStatus = z.enum(["idea", "active", "maintenance", "sunset"]);
export type ProductStatus = z.infer<typeof ProductStatus>;

export const ProjectStatus = z.enum([
  "backlog",
  "active",
  "paused",
  "blocked",
  "done",
  "archived",
]);
export type ProjectStatus = z.infer<typeof ProjectStatus>;

export const Health = z.enum(["green", "amber", "red"]);
export type Health = z.infer<typeof Health>;

export const Priority = z.enum(["low", "medium", "high", "critical"]);
export type Priority = z.infer<typeof Priority>;

export const TaskStatus = z.enum(["todo", "doing", "blocked", "done"]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const RaciRole = z.enum([
  "responsible",
  "accountable",
  "consulted",
  "informed",
]);
export type RaciRole = z.infer<typeof RaciRole>;

export const Severity = z.enum(["info", "warning", "critical"]);
export type Severity = z.infer<typeof Severity>;

export const Recurrence = z.enum(["none", "daily", "weekly"]);
export type Recurrence = z.infer<typeof Recurrence>;

export const SprintStatus = z.enum(["planned", "active", "done"]);
export type SprintStatus = z.infer<typeof SprintStatus>;

export const QuarterStatus = z.enum(["planned", "active", "done"]);
export type QuarterStatus = z.infer<typeof QuarterStatus>;

/** Reusable primitives. */
export const Id = z.string().min(1);
export const IsoDate = z.string(); // ISO 8601 timestamp
export const DayDate = z.string().nullable(); // YYYY-MM-DD or null

/** Mixin applied to every persisted entity with timestamps. */
export const Timestamps = z.object({
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
