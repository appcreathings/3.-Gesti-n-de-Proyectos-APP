import type { Content, FunctionCall, Part, PartListUnion } from "@google/genai";
import { callTool, getFunctionDeclarations, findTool, type AiTool } from "@/ai/tools";
import { createClient } from "./client";
import { classifyAiError, type AiErrorKind } from "./errors";

/** Safety valve: max function-calling rounds per user message. */
const MAX_ROUNDS = 8;

export interface ToolCallView {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface AgentCallbacks {
  /** Streaming text chunk from the model. */
  onTextDelta: (text: string) => void;
  /** A tool call is about to execute (render the chip as "running"). */
  onToolCallStart: (call: ToolCallView) => void;
  /** A tool call finished. */
  onToolCallEnd: (
    call: ToolCallView,
    outcome: { status: "ok" | "error" | "cancelled"; result?: unknown; error?: string },
  ) => void;
  /**
   * Ask the user to approve a write. Resolve `true` to execute, `false` to
   * cancel (the model receives a cancellation functionResponse).
   */
  onConfirmWrite: (call: ToolCallView, description: string) => Promise<boolean>;
}

export interface AgentTurnOptions {
  apiKey: string;
  model: string;
  confirmWrites: boolean;
  tools: AiTool[];
  systemInstruction: string;
  /** Prior conversation in Gemini Content format. */
  history: Content[];
  userMessage: string;
  signal?: AbortSignal;
  callbacks: AgentCallbacks;
}

export interface AgentTurnResult {
  /** Updated curated history (to persist for the next turn). */
  history: Content[];
  /** Set when the turn ended by hitting MAX_ROUNDS. */
  roundsExceeded: boolean;
  /** Set when the turn failed; partial text may have streamed already. */
  error?: AiErrorKind;
}

/**
 * One user turn: stream the model's answer, executing function calls in
 * multiple rounds until the model produces a final text response.
 */
export async function runAgentTurn(opts: AgentTurnOptions): Promise<AgentTurnResult> {
  const { callbacks, tools, signal } = opts;
  const ai = await createClient(opts.apiKey);
  const chat = ai.chats.create({
    model: opts.model,
    history: opts.history,
    config: {
      systemInstruction: opts.systemInstruction,
      tools: [{ functionDeclarations: getFunctionDeclarations(tools) }],
      abortSignal: signal,
    },
  });

  let message: PartListUnion = opts.userMessage;
  let roundsExceeded = false;

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const stream = await chat.sendMessageStream({ message });
      const calls: FunctionCall[] = [];
      for await (const chunk of stream) {
        if (signal?.aborted) throw new DOMException("aborted", "AbortError");
        if (chunk.text) callbacks.onTextDelta(chunk.text);
        if (chunk.functionCalls?.length) calls.push(...chunk.functionCalls);
      }

      if (calls.length === 0) {
        return { history: chat.getHistory(true), roundsExceeded: false };
      }

      const parts: Part[] = [];
      for (const raw of calls) {
        const call: ToolCallView = {
          id: raw.id ?? crypto.randomUUID(),
          name: raw.name ?? "",
          args: raw.args ?? {},
        };
        const response = await executeCall(call, opts);
        parts.push({
          functionResponse: {
            id: raw.id,
            name: call.name,
            response,
          },
        });
      }
      message = parts;
    }
    roundsExceeded = true;
    return { history: chat.getHistory(true), roundsExceeded };
  } catch (e) {
    return {
      history: chat.getHistory(true),
      roundsExceeded,
      error: classifyAiError(e),
    };
  }
}

async function executeCall(
  call: ToolCallView,
  opts: AgentTurnOptions,
): Promise<Record<string, unknown>> {
  const { callbacks, tools } = opts;
  const tool = findTool(tools, call.name);

  // Writes may need explicit user approval before touching data.
  if (tool?.mode === "write" && opts.confirmWrites) {
    const description = safeDescribe(tool, call.args) ?? `Ejecutar ${call.name}`;
    const approved = await callbacks.onConfirmWrite(call, description);
    if (!approved) {
      callbacks.onToolCallEnd(call, {
        status: "cancelled",
        error: "Cancelada por el usuario",
      });
      return {
        error: "El usuario canceló esta acción. No la reintentes; pregunta qué prefiere.",
      };
    }
  }

  callbacks.onToolCallStart(call);
  const res = await callTool(tools, call.name, call.args);
  if (res.ok) {
    callbacks.onToolCallEnd(call, { status: "ok", result: res.result });
    return { output: res.result ?? null };
  }
  callbacks.onToolCallEnd(call, { status: "error", error: res.error });
  return { error: res.error ?? "Error desconocido" };
}

function safeDescribe(tool: AiTool, args: Record<string, unknown>): string | null {
  try {
    // describeCall may read from state; validate args first so it sees clean input.
    const parsed = tool.input.safeParse(args);
    if (!parsed.success || !tool.describeCall) return null;
    return tool.describeCall(parsed.data);
  } catch {
    return null;
  }
}
