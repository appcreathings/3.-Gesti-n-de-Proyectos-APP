import type { z } from "zod";
import type {
  AutomationRule,
  ChecklistTemplate,
  Notification,
  Person,
  ProcessTemplate,
  Product,
  Project,
  ProjectType,
  Workspace,
} from "@/domain/schemas";

/**
 * MCP-style tool layer (spec: plan M9). Tools are defined against an injected
 * ToolContext — never against the stores directly — so they are testable with
 * fake state and could be exposed from a real MCP server in the future.
 */

/** Read snapshot of every entity collection the assistant can inspect. */
export interface ToolData {
  products: Product[];
  projects: Project[];
  people: Person[];
  checklistTemplates: ChecklistTemplate[];
  processTemplates: ProcessTemplate[];
  projectTypes: ProjectType[];
  automations: AutomationRule[];
  notifications: Notification[];
}

/**
 * Write operations, injected from useDataStore. Going through the store's own
 * actions means AI writes trigger automations, reindex the workspace and
 * persist via the StorageAdapter exactly like manual edits.
 */
export interface ToolActions {
  mutateProject: (id: string, recipe: (p: Project) => Project) => Promise<void>;
  saveProject: (p: Project) => Promise<void>;
  createProject: (p: Project) => Promise<void>;
  createProjectFromType: (
    typeId: string,
    name: string,
    productId: string | null,
  ) => Promise<string | null>;
  createProduct: (p: Product) => Promise<void>;
  createChecklistTemplate: (t: ChecklistTemplate) => Promise<void>;
  createProcessTemplate: (t: ProcessTemplate) => Promise<void>;
  createProjectType: (t: ProjectType) => Promise<void>;
}

export interface ToolContext {
  getData: () => ToolData;
  getWorkspace: () => Workspace | null;
  actions: ToolActions;
}

export interface AiTool {
  /** Stable snake_case identifier (MCP-compatible contract). */
  name: string;
  description: string;
  mode: "read" | "write";
  /** Zod input schema — the source of truth, converted to JSON Schema for the LLM. */
  input: z.ZodTypeAny;
  execute: (args: unknown) => Promise<unknown>;
  /** Human sentence for the write-confirmation card (write tools only). */
  describeCall?: (args: unknown) => string;
}

/** Typed helper so tool definitions get full inference from their Zod schema. */
export function defineTool<S extends z.ZodTypeAny>(tool: {
  name: string;
  description: string;
  mode: "read" | "write";
  input: S;
  execute: (args: z.infer<S>) => Promise<unknown> | unknown;
  describeCall?: (args: z.infer<S>) => string;
}): AiTool {
  return {
    ...tool,
    execute: async (args) => tool.execute(args as z.infer<S>),
    describeCall: tool.describeCall
      ? (args) => tool.describeCall!(args as z.infer<S>)
      : undefined,
  };
}
