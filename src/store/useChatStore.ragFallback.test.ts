import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * T3132 — `send()` debe aislar fallos de `buildRagContext`: si el embedding de la pregunta
 * del usuario falla (cuota, red, etc.), el turno del agente continúa con contexto RAG vacío
 * en vez de propagar la excepción fuera de send (spec 031 §4, HU-03).
 *
 * Mocks mínimos: buildRagContext lanza, runAgentTurn resuelve ok, el resto es no-op.
 */

const ragContextCalls = vi.hoisted(() => vi.fn());
const agentCalls = vi.hoisted(() => vi.fn());

vi.mock("@/ai/gemini/systemPrompt", () => ({
  buildRagContext: async (...args: unknown[]) => {
    ragContextCalls(...args);
    // async throw → se convierte en Promise rejected, que el .catch(() => "") del store atrapa.
    throw new Error("simulated RAG failure");
  },
  buildSystemPrompt: () => "system prompt",
}));

vi.mock("@/ai/gemini/agent", () => ({
  runAgentTurn: (...args: unknown[]) => {
    agentCalls(...args);
    return Promise.resolve({
      history: [],
      roundsExceeded: false,
      // sin error: el agente respondió bien.
    });
  },
}));

vi.mock("@/ai/tools", () => ({
  createBoundTools: () => [],
}));

vi.mock("@/storage/idb", () => ({
  idbGet: () => Promise.resolve(null),
  idbSet: () => Promise.resolve(),
  idbDel: () => Promise.resolve(),
}));

import { useChatStore } from "./useChatStore";
import { useAiConfigStore } from "./useAiConfigStore";
import { useAppStore } from "./useAppStore";

beforeEach(() => {
  vi.clearAllMocks();
  // Estado de mensajes limpio para que el snapshot persistido no interfiera.
  useChatStore.setState({
    messages: [],
    status: "idle",
    error: null,
    open: true,
    hydrated: true,
  });
  useAiConfigStore.setState({
    config: {
      apiKey: "test-key",
      model: "gemini-2.5-flash",
      autoFallback: true,
      fallbackGroup: "flash",
      confirmWrites: false,
      ragEnabled: true,
    } as never,
    loaded: true,
    keyStatus: "valid",
    lastError: null,
  });
  useAppStore.setState({ workspace: { projects: [], products: [] } } as never);
});

describe("useChatStore.send — aislamiento de fallos RAG (T3132)", () => {
  it("si buildRagContext lanza, runAgentTurn igual se llama y status final no es error", async () => {
    await useChatStore.getState().send("hola");

    expect(ragContextCalls).toHaveBeenCalledTimes(1);
    expect(agentCalls).toHaveBeenCalledTimes(1);
    // El agente respondió bien → no debe quedar en status "error".
    expect(useChatStore.getState().status).toBe("idle");
    expect(useChatStore.getState().error).toBeNull();
  });

  it("el mensaje del usuario sí queda registrado aunque RAG falle (no se perdió la entrada)", async () => {
    await useChatStore.getState().send("hola");

    const messages = useChatStore.getState().messages;
    expect(messages.length).toBe(2);
    expect(messages[0].role).toBe("user");
    expect(messages[0].parts[0]).toMatchObject({ kind: "text", text: "hola" });
    expect(messages[1].role).toBe("assistant");
  });

  it("si ragEnabled=false, buildRagContext NO se llama (no hay siquiera intento)", async () => {
    const current = useAiConfigStore.getState().config as Record<string, unknown>;
    useAiConfigStore.setState({
      config: { ...current, ragEnabled: false } as never,
    });

    await useChatStore.getState().send("hola");

    expect(ragContextCalls).not.toHaveBeenCalled();
    expect(agentCalls).toHaveBeenCalledTimes(1);
    expect(useChatStore.getState().status).toBe("idle");
  });
});
