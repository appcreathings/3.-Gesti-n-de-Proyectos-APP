import type { Content, FunctionCall, Part, PartListUnion } from "@google/genai";
import { callTool, getFunctionDeclarations, findTool, type AiTool } from "@/ai/tools";
import { createClient } from "./client";
import { classifyAiError, type AiErrorKind } from "./errors";
import { rateLimiter } from "@/ai/rateLimiter";
import { modelSelector, type FallbackEvent } from "@/ai/modelSelector";

const MAX_ROUNDS = 8;

export interface ToolCallView {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface AgentCallbacks {
  onTextDelta: (text: string) => void;
  onToolCallStart: (call: ToolCallView) => void;
  onToolCallEnd: (
    call: ToolCallView,
    outcome: { status: "ok" | "error" | "cancelled"; result?: unknown; error?: string },
  ) => void;
  onConfirmWrite: (call: ToolCallView, description: string) => Promise<boolean>;
  onModelSwitch?: (event: FallbackEvent) => void;
}

export interface AgentTurnOptions {
  apiKey: string;
  preferredModel: string;
  autoFallback?: boolean;
  fallbackGroup?: string;
  confirmWrites: boolean;
  tools: AiTool[];
  systemInstruction: string;
  history: Content[];
  userMessage: string;
  signal?: AbortSignal;
  callbacks: AgentCallbacks;
}

export interface AgentTurnResult {
  history: Content[];
  roundsExceeded: boolean;
  error?: AiErrorKind;
  modelSwitch?: FallbackEvent;
}

export async function runAgentTurn(opts: AgentTurnOptions): Promise<AgentTurnResult> {
  const { callbacks, tools, signal, preferredModel, autoFallback = true, fallbackGroup } = opts;
  const ai = await createClient(opts.apiKey);

  let currentModelId: string | null = null;
  let lastFallbackEvent: FallbackEvent | undefined;

  async function resolveInitialModel(): Promise<string | null> {
    if (!autoFallback) {
      return rateLimiter.canMakeRequest(preferredModel) ? preferredModel : null;
    }
    const selection = modelSelector.select(preferredModel, fallbackGroup);
    if (selection.fallbackEvent) {
      lastFallbackEvent = selection.fallbackEvent;
      callbacks.onModelSwitch?.(selection.fallbackEvent);
    }
    return selection.modelId;
  }

  async function handleRateLimit(excludedId: string): Promise<string | null> {
    rateLimiter.markSaturated(excludedId);
    if (!autoFallback) return null;
    const selection = modelSelector.selectAfterRateLimit(preferredModel, fallbackGroup);
    if (selection.fallbackEvent) {
      lastFallbackEvent = selection.fallbackEvent;
      callbacks.onModelSwitch?.(selection.fallbackEvent);
    }
    return selection.modelId;
  }

  function createChatWithModel(modelId: string, history: Content[]) {
    return ai.chats.create({
      model: modelId,
      history,
      config: {
        systemInstruction: opts.systemInstruction,
        tools: [{ functionDeclarations: getFunctionDeclarations(tools) }],
        abortSignal: signal,
      },
    });
  }

  const resolved = await resolveInitialModel();
  if (!resolved) {
    return {
      history: opts.history,
      roundsExceeded: false,
      error: autoFallback ? "all-models-exhausted" : "rate-limit",
    };
  }
  currentModelId = resolved;
  let chat = createChatWithModel(currentModelId, opts.history);

  let message: PartListUnion = opts.userMessage;
  let roundsExceeded = false;

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      let calls: FunctionCall[] = [];

      try {
        const stream = await chat.sendMessageStream({ message });
        for await (const chunk of stream) {
          if (signal?.aborted) throw new DOMException("aborted", "AbortError");
          if (chunk.text) callbacks.onTextDelta(chunk.text);
          if (chunk.functionCalls?.length) calls.push(...chunk.functionCalls);
        }
      } catch (e) {
        const kind = classifyAiError(e);
        if (kind === "rate-limit" && currentModelId) {
          const fallbackId = await handleRateLimit(currentModelId);
          if (fallbackId) {
            currentModelId = fallbackId;
            chat = createChatWithModel(currentModelId, chat.getHistory(true));
            const stream = await chat.sendMessageStream({ message });
            calls = [];
            for await (const chunk of stream) {
              if (signal?.aborted) throw new DOMException("aborted", "AbortError");
              if (chunk.text) callbacks.onTextDelta(chunk.text);
              if (chunk.functionCalls?.length) calls.push(...chunk.functionCalls);
            }
          } else {
            return {
              history: chat.getHistory(true),
              roundsExceeded,
              error: "all-models-exhausted",
              modelSwitch: lastFallbackEvent,
            };
          }
        } else {
          throw e;
        }
      }

      if (calls.length === 0) {
        rateLimiter.recordRequest(currentModelId ?? preferredModel);
        return { history: chat.getHistory(true), roundsExceeded: false, modelSwitch: lastFallbackEvent };
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
          functionResponse: { id: raw.id, name: call.name, response },
        });
      }
      message = parts;
    }
    roundsExceeded = true;
    rateLimiter.recordRequest(currentModelId ?? preferredModel);
    return { history: chat.getHistory(true), roundsExceeded, modelSwitch: lastFallbackEvent };
  } catch (e) {
    return {
      history: chat.getHistory(true),
      roundsExceeded,
      error: classifyAiError(e),
      modelSwitch: lastFallbackEvent,
    };
  }
}

async function executeCall(
  call: ToolCallView,
  opts: AgentTurnOptions,
): Promise<Record<string, unknown>> {
  const { callbacks, tools } = opts;
  const tool = findTool(tools, call.name);

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
    const parsed = tool.input.safeParse(args);
    if (!parsed.success || !tool.describeCall) return null;
    return tool.describeCall(parsed.data);
  } catch {
    return null;
  }
}
