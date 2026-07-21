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
  /** Mensaje crudo del último error del SDK (ApiError.message), para mostrar como detalle
   * técnico colapsable en la UI. Vive solo en la sesión del cliente (no se envía a ningún
   * servicio externo, Principio I). spec 031 §6. */
  rawMessage?: string;
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
  // `chat` se inicializa con el modelo resuelto y se reasigna dentro de `attemptTurn` en cada
  // fallback. El `let` con valor undefined es seguro porque `attemptTurn` siempre lo reescribe
  // antes de usarlo para enviar el stream; el único uso previo es `chat.getHistory(true)` que
  // aparece únicamente dentro de `attemptTurn` después de la reasignación.
  let chat = createChatWithModel(currentModelId, opts.history);

  /** Un intento puntual contra `modelId`. Devuelve el resultado clasificado en vez de lanzar,
   * para que el bucle de fallback decida si probar otro modelo o cortar.
   * Reemplaza al bloque try/catch de reintento único de specs 006/012 (ver design.md §3). */
  async function attemptTurn(
    modelId: string,
    message: PartListUnion,
  ): Promise<{ ok: true; calls: FunctionCall[] } | { ok: false; kind: AiErrorKind; rawMessage?: string }> {
    const history = chat.getHistory(true);
    chat = createChatWithModel(modelId, history);
    try {
      const stream = await chat.sendMessageStream({ message });
      const calls: FunctionCall[] = [];
      for await (const chunk of stream) {
        if (signal?.aborted) throw new DOMException("aborted", "AbortError");
        if (chunk.text) callbacks.onTextDelta(chunk.text);
        if (chunk.functionCalls?.length) calls.push(...chunk.functionCalls);
      }
      return { ok: true, calls };
    } catch (e) {
      return {
        ok: false,
        kind: classifyAiError(e),
        rawMessage: e instanceof Error ? e.message : String(e),
      };
    }
  }

  let message: PartListUnion = opts.userMessage;
  let roundsExceeded = false;
  // Conserva el último mensaje crudo del SDK para reportarlo como detalle técnico aunque el
  // fallback recorra varios modelos antes de rendirse (spec 031 §6).
  let lastRawMessage: string | undefined;

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      // Bucle de fallback real: recorre el grupo completo (corrección de bug de reintento único,
      // spec 031). `tried` acumula todos los modelos probados en este round para que
      // modelSelector.select() no los vuelva a ofrecer.
      const tried = new Set<string>();
      let modelId: string = currentModelId;
      tried.add(modelId);
      let outcome = await attemptTurn(modelId, message);

      while (!outcome.ok) {
        // Solo los errores que pueden ser de un modelo específico ameritan probar otro.
        // project-quota-zero / invalid-key / offline / unknown / aborted cortan en el primer fallo.
        if (outcome.kind !== "rate-limit" && outcome.kind !== "quota-exhausted") {
          return {
            history: chat.getHistory(true),
            roundsExceeded,
            error: outcome.kind,
            rawMessage: outcome.rawMessage,
            modelSwitch: lastFallbackEvent,
          };
        }
        rateLimiter.markSaturated(modelId, 60);
        lastRawMessage = outcome.rawMessage ?? lastRawMessage;
        if (!autoFallback) {
          return {
            history: chat.getHistory(true),
            roundsExceeded,
            error: outcome.kind,
            rawMessage: outcome.rawMessage,
            modelSwitch: lastFallbackEvent,
          };
        }
        const selection = modelSelector.select(preferredModel, fallbackGroup, tried);
        if (!selection.modelId) {
          return {
            history: chat.getHistory(true),
            roundsExceeded,
            error: "all-models-exhausted",
            rawMessage: lastRawMessage,
            modelSwitch: lastFallbackEvent,
          };
        }
        if (selection.fallbackEvent) {
          lastFallbackEvent = selection.fallbackEvent;
          callbacks.onModelSwitch?.(selection.fallbackEvent);
        }
        modelId = selection.modelId;
        tried.add(modelId);
        currentModelId = modelId;
        outcome = await attemptTurn(modelId, message);
      }

      const calls = outcome.calls;

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
      rawMessage: e instanceof Error ? e.message : String(e),
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
