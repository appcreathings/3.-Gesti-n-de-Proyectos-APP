import { create } from "zustand";
import type { Content } from "@google/genai";
import { uuid } from "@/lib/utils";
import { runAgentTurn, type ToolCallView } from "@/ai/gemini/agent";
import { buildSystemPrompt } from "@/ai/gemini/systemPrompt";
import type { AiErrorKind } from "@/ai/gemini/errors";
import { createBoundTools } from "@/ai/tools";
import { idbDel, idbGet, idbSet } from "@/storage/idb";
import { useAppStore } from "./useAppStore";
import { useAiConfigStore } from "./useAiConfigStore";

export type ChatPart =
  | { kind: "text"; text: string }
  | {
      kind: "toolCall";
      id: string;
      name: string;
      args: Record<string, unknown>;
      status: "running" | "ok" | "error" | "cancelled";
      result?: unknown;
      error?: string;
    }
  | { kind: "pendingWrite"; id: string; name: string; description: string };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: ChatPart[];
}

export type ChatStatus = "idle" | "streaming" | "awaiting-confirmation" | "error";

interface ChatState {
  /** Panel visibility (persisted in localStorage, per device). */
  open: boolean;
  messages: ChatMessage[];
  status: ChatStatus;
  error: AiErrorKind | null;
  hydrated: boolean;

  toggleOpen: (v?: boolean) => void;
  send: (text: string) => Promise<void>;
  stop: () => void;
  approvePendingWrite: (id: string, approved: boolean) => void;
  newConversation: () => Promise<void>;
  hydrateFromIdb: () => Promise<void>;
}

/** Device-local snapshot of the last conversation (never in the workspace). */
const IDB_KEY = "aiChat:last";
const MAX_PERSISTED_MESSAGES = 50;

/** Gemini-format history for the next turn; parallel to `messages` for the UI. */
let geminiHistory: Content[] = [];
let abortController: AbortController | null = null;
const pendingResolvers = new Map<string, (approved: boolean) => void>();

const OPEN_KEY = "assistant.open";

export const useChatStore = create<ChatState>((set, get) => ({
  open: typeof localStorage !== "undefined" && localStorage.getItem(OPEN_KEY) === "1",
  messages: [],
  status: "idle",
  error: null,
  hydrated: false,

  toggleOpen(v) {
    const open = v ?? !get().open;
    localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    set({ open });
  },

  async hydrateFromIdb() {
    try {
      const snap = await idbGet<{ messages: ChatMessage[]; history: Content[] }>(
        IDB_KEY,
      );
      if (snap) {
        geminiHistory = snap.history ?? [];
        set({ messages: snap.messages ?? [] });
      }
    } catch {
      // best-effort: chat history is disposable
    }
    set({ hydrated: true });
  },

  async send(text) {
    const trimmed = text.trim();
    if (!trimmed || get().status === "streaming") return;
    const { config } = useAiConfigStore.getState();
    if (!config.apiKey) return;

    const assistantId = uuid();
    set({
      status: "streaming",
      error: null,
      messages: [
        ...get().messages,
        { id: uuid(), role: "user", parts: [{ kind: "text", text: trimmed }] },
        { id: assistantId, role: "assistant", parts: [] },
      ],
    });

    abortController = new AbortController();

    const patchAssistant = (fn: (parts: ChatPart[]) => ChatPart[]) => {
      set({
        messages: get().messages.map((m) =>
          m.id === assistantId ? { ...m, parts: fn(m.parts) } : m,
        ),
      });
    };
    const patchToolCall = (id: string, patch: Partial<ChatPart & { kind: "toolCall" }>) =>
      patchAssistant((parts) =>
        parts.map((p) =>
          p.kind === "toolCall" && p.id === id ? { ...p, ...patch } : p,
        ),
      );

    const result = await runAgentTurn({
      apiKey: config.apiKey,
      preferredModel: config.model,
      autoFallback: config.autoFallback,
      fallbackGroup: config.autoFallback ? config.fallbackGroup : undefined,
      confirmWrites: config.confirmWrites,
      tools: createBoundTools(),
      systemInstruction: buildSystemPrompt(useAppStore.getState().workspace),
      history: geminiHistory,
      userMessage: trimmed,
      signal: abortController.signal,
      callbacks: {
        onTextDelta: (delta) =>
          patchAssistant((parts) => {
            const last = parts[parts.length - 1];
            if (last?.kind === "text") {
              return [...parts.slice(0, -1), { kind: "text", text: last.text + delta }];
            }
            return [...parts, { kind: "text", text: delta }];
          }),
        onToolCallStart: (call) =>
          patchAssistant((parts) => [
            ...parts,
            {
              kind: "toolCall",
              id: call.id,
              name: call.name,
              args: call.args,
              status: "running",
            },
          ]),
        onToolCallEnd: (call, outcome) => {
          const exists = get()
            .messages.find((m) => m.id === assistantId)
            ?.parts.some((p) => p.kind === "toolCall" && p.id === call.id);
          if (!exists) {
            patchAssistant((parts) => [
              ...parts,
              {
                kind: "toolCall",
                id: call.id,
                name: call.name,
                args: call.args,
                status: outcome.status,
                result: outcome.result,
                error: outcome.error,
              },
            ]);
            return;
          }
          patchToolCall(call.id, {
            status: outcome.status,
            result: outcome.result,
            error: outcome.error,
          });
        },
        onConfirmWrite: (call: ToolCallView, description: string) =>
          new Promise<boolean>((resolve) => {
            pendingResolvers.set(call.id, resolve);
            set({ status: "awaiting-confirmation" });
            patchAssistant((parts) => [
              ...parts,
              { kind: "pendingWrite", id: call.id, name: call.name, description },
            ]);
          }),
        onModelSwitch: (event) => {
          const from = event.from.replace("gemini-", "");
          const to = event.to.replace("gemini-", "");
          patchAssistant((parts) => [
            ...parts,
            {
              kind: "text",
              text: `\n\n_🤖 Cambio automático: ${from} → ${to} (${event.reason === "saturated" ? "saturado" : "límite alcanzado"})_`,
            },
          ]);
        },
      },
    });

    abortController = null;
    geminiHistory = result.history;

    if (result.roundsExceeded) {
      patchAssistant((parts) => [
        ...parts,
        {
          kind: "text",
          text: "\n\n_He alcanzado el límite de pasos de esta petición. Dime «continúa» si quieres que siga._",
        },
      ]);
    }

    set({
      status: result.error && result.error !== "aborted" ? "error" : "idle",
      error: result.error && result.error !== "aborted" ? result.error : null,
    });
    await persistSnapshot(get().messages);
  },

  stop() {
    // Cancel any pending confirmation first so the loop can unwind.
    for (const [id, resolve] of pendingResolvers) {
      resolve(false);
      pendingResolvers.delete(id);
    }
    abortController?.abort();
  },

  approvePendingWrite(id, approved) {
    const resolve = pendingResolvers.get(id);
    if (!resolve) return;
    pendingResolvers.delete(id);
    // Replace the pending card; the tool chip arrives via onToolCallStart/End.
    set({
      status: "streaming",
      messages: get().messages.map((m) => ({
        ...m,
        parts: m.parts.filter((p) => !(p.kind === "pendingWrite" && p.id === id)),
      })),
    });
    resolve(approved);
  },

  async newConversation() {
    get().stop();
    geminiHistory = [];
    set({ messages: [], status: "idle", error: null });
    await idbDel(IDB_KEY).catch(() => undefined);
  },
}));

async function persistSnapshot(messages: ChatMessage[]): Promise<void> {
  try {
    const trimmed = messages
      .slice(-MAX_PERSISTED_MESSAGES)
      .map((m) => ({
        ...m,
        // Drop tool payloads and stale confirmations from the snapshot.
        parts: m.parts
          .filter((p) => p.kind !== "pendingWrite")
          .map((p) => (p.kind === "toolCall" ? { ...p, result: undefined } : p)),
      }));
    await idbSet(IDB_KEY, { messages: trimmed, history: geminiHistory });
  } catch {
    // best-effort
  }
}
