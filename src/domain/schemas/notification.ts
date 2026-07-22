import { z } from "zod";
import { Id, IsoDate, SCHEMA_VERSION, Severity } from "./common";

export const EntityRefSchema = z.object({
  // `kind: "flow"` se añadió en spec 033 C1 (bump 16) para que la notificación
  // de fallo de un Flujo pueda deep-linkear al run en el historial. Los demás
  // kinds ignoran `runId`.
  kind: z.enum(["project", "area", "checklist", "checklistItem", "task", "flow"]),
  projectId: Id.optional(),
  areaId: Id.optional(),
  checklistId: Id.optional(),
  itemId: Id.optional(),
  taskId: Id.optional(),
  /** Id del Flow (cuando `kind === "flow"`) — el destino del deep-link.
   *  Resuelto por el centro de notificaciones a FlowHistoryPage. */
  id: Id.optional(),
  /** Id del run dentro del historial del Flujo (spec 033 C1) — abre
   *  `FlowRunDetailDrawer` directamente. Solo aplica a `kind: "flow"`. */
  runId: Id.optional(),
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
