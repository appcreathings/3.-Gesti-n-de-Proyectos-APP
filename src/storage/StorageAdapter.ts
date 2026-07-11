import type { z } from "zod";
import {
  AutomationRuleSchema,
  ChecklistTemplateSchema,
  ProcessTemplateSchema,
  ProductSchema,
  ProjectSchema,
  ProjectTypeSchema,
  QuarterSchema,
  type Workspace,
} from "@/domain/schemas";

/** Collections stored as one-file-per-entity. */
export type Collection =
  | "products"
  | "projects"
  | "project-types"
  | "checklist-templates"
  | "process-templates"
  | "automations"
  | "quarters";

/** Aggregated single-file documents. */
export type DocName = "people" | "notifications" | "activity" | "flows" | "flow-runs";

/** Default content for each aggregated doc when the file doesn't exist yet. */
export function emptyDoc(name: DocName): Record<string, unknown> {
  switch (name) {
    case "people":
      return { schemaVersion: 1, people: [] };
    case "notifications":
      return { schemaVersion: 1, notifications: [] };
    case "activity":
      return { schemaVersion: 1, entries: [] };
    case "flows":
      return { schemaVersion: 1, flows: [] };
    case "flow-runs":
      return { schemaVersion: 1, runs: [] };
  }
}

/** Zod schema registry: validate at the I/O boundary (constitución, principio II). */
export const collectionSchema: Record<Collection, z.ZodTypeAny> = {
  products: ProductSchema,
  projects: ProjectSchema,
  "project-types": ProjectTypeSchema,
  "checklist-templates": ChecklistTemplateSchema,
  "process-templates": ProcessTemplateSchema,
  automations: AutomationRuleSchema,
  quarters: QuarterSchema,
};

export interface StorageAdapter {
  /** Kind of backend, for UI messaging. */
  readonly kind: "filesystem" | "download";

  /** Recover/prepare the data location; create workspace.json if missing. */
  init(): Promise<void>;
  isReady(): boolean;
  /** Prompt the user to pick a folder (filesystem) — requires a user gesture. */
  connect(): Promise<void>;
  /** Re-verify permission for a previously stored handle. */
  reconnect(): Promise<boolean>;
  /** Prompt for a new folder, replacing the current one. */
  changeFolder(): Promise<void>;
  /** Name of the currently connected folder, or null if unavailable. */
  getRootName(): string | null;

  readWorkspace(): Promise<Workspace>;
  writeWorkspace(ws: Workspace): Promise<void>;

  list(col: Collection): Promise<string[]>;
  read<T>(col: Collection, id: string): Promise<T>;
  write<T extends { id: string }>(col: Collection, data: T): Promise<void>;
  remove(col: Collection, id: string): Promise<void>;

  readDoc<T>(name: DocName): Promise<T>;
  writeDoc<T>(name: DocName, data: T): Promise<void>;

  exportAll(): Promise<Blob>;
  importAll(blob: Blob): Promise<void>;
  backup(): Promise<void>;
}
