import { z } from "zod";
import { Health, Id, IsoDate, SCHEMA_VERSION } from "./common";

export const SettingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  stalledAfterDays: z.number().default(14),
  dueSoonDays: z.number().default(7),
  deriveHealth: z.boolean().default(false),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const ProductIndexEntry = z.object({
  id: Id,
  name: z.string(),
  status: z.string(),
});
export const ProjectIndexEntry = z.object({
  id: Id,
  name: z.string(),
  productId: Id.nullable().default(null),
  status: z.string(),
  health: Health.default("green"),
  updatedAt: IsoDate,
});
export const NamedIndexEntry = z.object({ id: Id, name: z.string() });
export const AutomationIndexEntry = z.object({
  id: Id,
  name: z.string(),
  enabled: z.boolean(),
});

export const WorkspaceIndexSchema = z.object({
  products: z.array(ProductIndexEntry).default([]),
  projects: z.array(ProjectIndexEntry).default([]),
  types: z.array(NamedIndexEntry).default([]),
  templates: z.array(NamedIndexEntry).default([]),
  processTemplates: z.array(NamedIndexEntry).default([]),
  automations: z.array(AutomationIndexEntry).default([]),
});
export type WorkspaceIndex = z.infer<typeof WorkspaceIndexSchema>;

export const WorkspaceSchema = z.object({
  schemaVersion: z.number().default(SCHEMA_VERSION),
  org: z.object({ name: z.string().default("Mi Empresa") }).default({ name: "Mi Empresa" }),
  settings: SettingsSchema.default({}),
  index: WorkspaceIndexSchema.default({}),
});
export type Workspace = z.infer<typeof WorkspaceSchema>;

export function emptyWorkspace(): Workspace {
  return WorkspaceSchema.parse({});
}
