import { createReadTools } from "./readTools";
import { createWriteTools } from "./writeTools";
import { toFunctionDeclaration, type FunctionDeclarationLike } from "./schema";
import type { AiTool, ToolContext } from "./types";

/** Full MCP-style tool registry bound to a context (real stores or test fakes). */
export function createAiTools(ctx: ToolContext): AiTool[] {
  return [...createReadTools(ctx), ...createWriteTools(ctx)];
}

export function getFunctionDeclarations(tools: AiTool[]): FunctionDeclarationLike[] {
  return tools.map(toFunctionDeclaration);
}

export function findTool(tools: AiTool[], name: string): AiTool | undefined {
  return tools.find((t) => t.name === name);
}

export interface ToolCallResult {
  ok: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Validate and execute a tool call. Errors (unknown tool, invalid args,
 * execution failure) are returned as data — the agent loop sends them back to
 * the model as a functionResponse so it can self-correct instead of crashing.
 */
export async function callTool(
  tools: AiTool[],
  name: string,
  rawArgs: unknown,
): Promise<ToolCallResult> {
  const tool = findTool(tools, name);
  if (!tool) {
    return { ok: false, error: `Herramienta desconocida: ${name}` };
  }
  const parsed = tool.input.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(raíz)"}: ${i.message}`)
      .join("; ");
    return { ok: false, error: `Argumentos inválidos para ${name}: ${issues}` };
  }
  try {
    const result = await tool.execute(parsed.data);
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
