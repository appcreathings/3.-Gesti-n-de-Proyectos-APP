import { zodToJsonSchema } from "zod-to-json-schema";
import type { AiTool } from "./types";

/** Shape consumed by @google/genai `tools: [{ functionDeclarations }]`. */
export interface FunctionDeclarationLike {
  name: string;
  description: string;
  parametersJsonSchema: Record<string, unknown>;
}

/** Shape of an MCP `Tool` — kept for parity so this layer can back a real MCP server. */
export interface McpToolLike {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/** Inline JSON Schema (no $refs — Gemini does not resolve them). */
function toJsonSchema(tool: AiTool): Record<string, unknown> {
  const schema = zodToJsonSchema(tool.input, { $refStrategy: "none" }) as Record<
    string,
    unknown
  >;
  delete schema.$schema;
  return schema;
}

export function toFunctionDeclaration(tool: AiTool): FunctionDeclarationLike {
  return {
    name: tool.name,
    description: tool.description,
    parametersJsonSchema: toJsonSchema(tool),
  };
}

export function toMcpTool(tool: AiTool): McpToolLike {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: toJsonSchema(tool),
  };
}
