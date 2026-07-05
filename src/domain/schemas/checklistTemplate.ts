import { z } from "zod";
import { Id, IsoDate, SCHEMA_VERSION } from "./common";

export const TemplateItemSchema = z.object({
  id: Id,
  text: z.string(),
  required: z.boolean().default(false),
});
export type TemplateItem = z.infer<typeof TemplateItemSchema>;

export const ChecklistTemplateSchema = z.object({
  id: Id,
  schemaVersion: z.number().default(SCHEMA_VERSION),
  name: z.string().min(1),
  category: z.string().default(""),
  items: z.array(TemplateItemSchema).default([]),
  tags: z.array(z.string()).default([]),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type ChecklistTemplate = z.infer<typeof ChecklistTemplateSchema>;

export const ProcessTemplateStepSchema = z.object({
  id: Id,
  text: z.string(),
  details: z.string().default(""),
});

export const ProcessTemplateSchema = z.object({
  id: Id,
  schemaVersion: z.number().default(SCHEMA_VERSION),
  name: z.string().min(1),
  description: z.string().default(""),
  category: z.string().default(""),
  steps: z.array(ProcessTemplateStepSchema).default([]),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type ProcessTemplate = z.infer<typeof ProcessTemplateSchema>;
