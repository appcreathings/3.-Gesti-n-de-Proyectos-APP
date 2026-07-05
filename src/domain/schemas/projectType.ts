import { z } from "zod";
import { Id, IsoDate, ProjectStatus, SCHEMA_VERSION } from "./common";

export const DefaultAreaSchema = z.object({
  name: z.string(),
  icon: z.string().default("folder"),
  processTemplateIds: z.array(Id).default([]),
  checklistTemplateIds: z.array(Id).default([]),
});
export type DefaultArea = z.infer<typeof DefaultAreaSchema>;

export const ProjectTypeSchema = z.object({
  id: Id,
  schemaVersion: z.number().default(SCHEMA_VERSION),
  name: z.string().min(1),
  description: z.string().default(""),
  statusWorkflow: z.array(ProjectStatus).default([
    "backlog",
    "active",
    "paused",
    "blocked",
    "done",
    "archived",
  ]),
  defaultAreas: z.array(DefaultAreaSchema).default([]),
  defaultAutomationIds: z.array(Id).default([]),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type ProjectType = z.infer<typeof ProjectTypeSchema>;
