import { z } from "zod";
import { Id, IsoDate, SCHEMA_VERSION, Severity } from "./common";

export const EntityRefSchema = z.object({
  kind: z.enum(["project", "area", "checklist", "checklistItem", "task"]),
  projectId: Id.optional(),
  areaId: Id.optional(),
  checklistId: Id.optional(),
  itemId: Id.optional(),
  taskId: Id.optional(),
});
export type EntityRef = z.infer<typeof EntityRefSchema>;

export const NotificationSchema = z.object({
  id: Id,
  type: z.string(),
  severity: Severity.default("info"),
  message: z.string(),
  entityRef: EntityRefSchema.nullable().default(null),
  read: z.boolean().default(false),
  createdAt: IsoDate,
});
export type Notification = z.infer<typeof NotificationSchema>;

export const NotificationsDocSchema = z.object({
  schemaVersion: z.number().default(SCHEMA_VERSION),
  notifications: z.array(NotificationSchema).default([]),
});
export type NotificationsDoc = z.infer<typeof NotificationsDocSchema>;
