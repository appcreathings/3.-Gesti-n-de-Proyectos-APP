import { z } from "zod";
import { Id, IsoDate, SCHEMA_VERSION, Severity } from "./common";

export const TriggerType = z.enum([
  "item.checked",
  "checklist.completed",
  "area.completed",
  "project.created",
  "project.statusChanged",
  "area.added",
  "task.added",
  "task.statusChanged",
  "date.due",
  "date.approaching",
  "app.opened",
  "schedule",
]);
export type TriggerType = z.infer<typeof TriggerType>;

export const TriggerSchema = z.object({
  type: TriggerType,
  cadence: z.enum(["daily", "weekly"]).optional(),
});
export type Trigger = z.infer<typeof TriggerSchema>;

export const ConditionOp = z.enum([
  "==",
  "!=",
  ">",
  ">=",
  "<",
  "<=",
  "in",
  "contains",
]);

export const ConditionSchema = z.object({
  field: z.string(),
  op: ConditionOp,
  value: z.unknown(),
});
export type Condition = z.infer<typeof ConditionSchema>;

export const ActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("setProjectStatus"), status: z.string() }),
  z.object({ type: z.literal("markAreaComplete") }),
  z.object({
    type: z.literal("createChecklistFromTemplate"),
    templateId: Id,
    areaId: Id.optional(),
  }),
  z.object({
    type: z.literal("createTask"),
    title: z.string(),
    areaId: Id.optional(),
    priority: z.string().optional(),
  }),
  z.object({
    type: z.literal("createNotification"),
    severity: Severity,
    message: z.string(),
  }),
  z.object({ type: z.literal("setField"), field: z.string(), value: z.unknown() }),
  z.object({ type: z.literal("recreateRecurringChecklist"), checklistId: Id }),
]);
export type Action = z.infer<typeof ActionSchema>;

export const ScopeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("global") }),
  z.object({ kind: z.literal("product"), id: Id }),
  z.object({ kind: z.literal("project"), id: Id }),
  z.object({ kind: z.literal("type"), id: Id }),
]);
export type Scope = z.infer<typeof ScopeSchema>;

export const AutomationRuleSchema = z.object({
  id: Id,
  schemaVersion: z.number().default(SCHEMA_VERSION),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  scope: ScopeSchema.default({ kind: "global" }),
  trigger: TriggerSchema,
  conditions: z.array(ConditionSchema).default([]),
  actions: z.array(ActionSchema).default([]),
  lastRunAt: IsoDate.nullable().default(null),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type AutomationRule = z.infer<typeof AutomationRuleSchema>;
