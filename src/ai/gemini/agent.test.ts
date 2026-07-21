import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock `./client` para controlar el comportamiento del chat sin tocar la red.
// Los demás singletons (`rateLimiter`, `modelSelector`) se usan reales para ejercitar
// el bucle de fallback y la exclusión por `tried`/`markSaturated` como en producción.
vi.mock("./client", () => ({
  createClient: vi.fn(),
}));

import { runAgentTurn, type AgentTurnOptions } from "./agent";
import { createClient } from "./client";
import { rateLimiter } from "@/ai/rateLimiter";

// El entorno de vitest es "node": `navigator.onLine` es undefined → falsy, lo que haría
// classifyAiError devolver siempre "offline". Forzamos online=true para aislar los demás branches.
const originalOnLine = navigator.onLine;
function forceOnline(on: boolean) {
  Object.defineProperty(navigator, "onLine", {
    value: on,
    configurable: true,
    writable: true,
  });
}

const FLASH_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash",
  "gemini-3.5-flash",
];

const rateLimit429Body =
  '{"error":{"code":429,"message":"Rate limit exceeded","status":"RESOURCE_EXHAUSTED"}}';
const projectQuotaZeroBody =
  '{"error":{"code":429,"message":"Quota exceeded","status":"RESOURCE_EXHAUSTED","details":[{"reason":"RATE_LIMIT_EXCEEDED","metadata":{"quota_limit_value":"0","quota_unit":"1/min/{project}/{region}"}}]}}';

function sdkError(body: string): Error {
  const err = new Error(body);
  (err as unknown as { status: number }).status = 429;
  err.name = "ApiError";
  return err;
}

type ChatBehavior =
  | { kind: "rate-limit" }
  | { kind: "project-quota-zero" }
  | { kind: "ok-text"; text?: string };

interface MockChat {
  sendMessageStream: ReturnType<typeof vi.fn>;
  getHistory: ReturnType<typeof vi.fn>;
}

function makeChat(behavior: ChatBehavior): MockChat {
  return {
    sendMessageStream: vi.fn().mockImplementation(() => {
      if (behavior.kind === "rate-limit") throw sdkError(rateLimit429Body);
      if (behavior.kind === "project-quota-zero") throw sdkError(projectQuotaZeroBody);
      const text = behavior.text ?? "Hola";
      return (async function* () {
        yield { text };
      })();
    }),
    getHistory: vi.fn().mockReturnValue([]),
  };
}

/**
 * Construye un cliente mockeado que devuelve chats según la secuencia `behaviors`.
 * El número de `sendMessageStream` lanzados equivale al número de intentos reales del bucle
 * de fallback (cada chat se usa exactamente una vez para enviar).
 */
function makeClientWithSequence(behaviors: ChatBehavior[]): {
  client: unknown;
  streamCalls: () => number;
} {
  let i = 0;
  let streams = 0;
  const chats: MockChat[] = [];
  const client = {
    chats: {
      create: vi.fn().mockImplementation(() => {
        // El agente crea un chat inicial + uno por attemptTurn. El chat "extra" del inicial
        // nunca se usa para enviar, así que lo dotamos de un comportamiento que falle ruidosamente
        // si algo lo invoca: si lo hace, significa que rompimos la estructura del agente.
        let behavior: ChatBehavior;
        if (chats.length === 0) {
          // primer create = chat inicial; no se envía nada con él
          behavior = { kind: "ok-text", text: "MUST-NOT-STREAM-INITIAL-CHAT" };
        } else {
          if (i >= behaviors.length) {
            throw new Error(
              `makeClientWithSequence: intento ${i + 1} fuera de rango (secuencia de ${behaviors.length}) — el agente intentó más modelos de los esperados`,
            );
          }
          behavior = behaviors[i];
          i++;
        }
        const chat = makeChat(behavior);
        const originalStream = chat.sendMessageStream;
        chat.sendMessageStream = vi.fn().mockImplementation((...args: unknown[]) => {
          streams++;
          return (originalStream as (...a: unknown[]) => unknown)(...args);
        });
        chats.push(chat);
        return chat;
      }),
    },
  };
  return { client, streamCalls: () => streams };
}

function baseOpts(overrides: Partial<AgentTurnOptions> = {}): AgentTurnOptions {
  return {
    apiKey: "test-key",
    preferredModel: "gemini-2.5-flash",
    autoFallback: true,
    fallbackGroup: "flash",
    confirmWrites: false,
    tools: [],
    systemInstruction: "",
    history: [],
    userMessage: "hola",
    callbacks: {
      onTextDelta: () => undefined,
      onToolCallStart: () => undefined,
      onToolCallEnd: () => undefined,
      onConfirmWrite: () => Promise.resolve(true),
    },
    ...overrides,
  };
}

beforeEach(async () => {
  vi.clearAllMocks();
  forceOnline(true);
  // El rateLimiter es un singleton real: resetea cualquier saturación de tests previos.
  for (const id of FLASH_MODELS) {
    rateLimiter.markSaturated(id, 0); // retryAt = now → expira en la próxima prune
    rateLimiter.canMakeRequest(id); // dispara prune y limpia saturated
  }
});

afterEach(() => {
  forceOnline(originalOnLine);
});

describe("runAgentTurn — bucle de fallback real (spec 031)", () => {
  it("T3123: recorre los 4 modelos del grupo flash antes de devolver all-models-exhausted", async () => {
    // Cada modelo del grupo falla con rate-limit: el bucle debe probar los 4 antes de rendirse.
    const behaviors: ChatBehavior[] = [
      { kind: "rate-limit" },
      { kind: "rate-limit" },
      { kind: "rate-limit" },
      { kind: "rate-limit" },
    ];
    const { client, streamCalls } = makeClientWithSequence(behaviors);
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await runAgentTurn(baseOpts());

    expect(result.error).toBe("all-models-exhausted");
    expect(result.roundsExceeded).toBe(false);
    // Los 4 modelos fueron intentados: el bucle no se rindió tras el primer reintento (bug de specs 006/012).
    expect(streamCalls()).toBe(4);
  });

  it("T3123 (variante): 3 fallos + éxito en el 4º modelo no reporta error", async () => {
    const behaviors: ChatBehavior[] = [
      { kind: "rate-limit" },
      { kind: "rate-limit" },
      { kind: "rate-limit" },
      { kind: "ok-text", text: "respuesta del 4º modelo" },
    ];
    const { client, streamCalls } = makeClientWithSequence(behaviors);
    vi.mocked(createClient).mockResolvedValue(client as never);

    const deltas: string[] = [];
    const result = await runAgentTurn(
      baseOpts({
        callbacks: {
          onTextDelta: (t) => deltas.push(t),
          onToolCallStart: () => undefined,
          onToolCallEnd: () => undefined,
          onConfirmWrite: () => Promise.resolve(true),
        },
      }),
    );

    expect(result.error).toBeUndefined();
    expect(streamCalls()).toBe(4);
    expect(deltas.join("")).toBe("respuesta del 4º modelo");
  });

  it("T3124: project-quota-zero corta el bucle en el primer intento sin intentar más modelos", async () => {
    const { client, streamCalls } = makeClientWithSequence([{ kind: "project-quota-zero" }]);
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await runAgentTurn(baseOpts());

    expect(result.error).toBe("project-quota-zero");
    expect(streamCalls()).toBe(1);
  });

  it("T3124 (variante): con project-quota-zero NO se llama a onModelSwitch (no tiene caso anunciar fallback)", async () => {
    const { client } = makeClientWithSequence([{ kind: "project-quota-zero" }]);
    vi.mocked(createClient).mockResolvedValue(client as never);

    const switches: { from: string; to: string }[] = [];
    await runAgentTurn(
      baseOpts({
        callbacks: {
          onTextDelta: () => undefined,
          onToolCallStart: () => undefined,
          onToolCallEnd: () => undefined,
          onConfirmWrite: () => Promise.resolve(true),
          onModelSwitch: (ev) => switches.push({ from: ev.from, to: ev.to }),
        },
      }),
    );

    expect(switches).toHaveLength(0);
  });

  it("T3125 (regresión): camino feliz sin errores devuelve texto y history sin error", async () => {
    const { client } = makeClientWithSequence([{ kind: "ok-text", text: "hola desde gemini" }]);
    vi.mocked(createClient).mockResolvedValue(client as never);

    const deltas: string[] = [];
    const result = await runAgentTurn(
      baseOpts({
        callbacks: {
          onTextDelta: (t) => deltas.push(t),
          onToolCallStart: () => undefined,
          onToolCallEnd: () => undefined,
          onConfirmWrite: () => Promise.resolve(true),
        },
      }),
    );

    expect(result.error).toBeUndefined();
    expect(result.roundsExceeded).toBe(false);
    expect(deltas.join("")).toBe("hola desde gemini");
  });

  it("T3125 (regresión): éxito tras un solo fallback sigue funcionando (camino que ya cubría specs 006/012)", async () => {
    const { client, streamCalls } = makeClientWithSequence([
      { kind: "rate-limit" },
      { kind: "ok-text", text: "ok del fallback" },
    ]);
    vi.mocked(createClient).mockResolvedValue(client as never);

    const switches: { from: string; to: string }[] = [];
    const result = await runAgentTurn(
      baseOpts({
        callbacks: {
          onTextDelta: () => undefined,
          onToolCallStart: () => undefined,
          onToolCallEnd: () => undefined,
          onConfirmWrite: () => Promise.resolve(true),
          onModelSwitch: (ev) => switches.push({ from: ev.from, to: ev.to }),
        },
      }),
    );

    expect(result.error).toBeUndefined();
    expect(streamCalls()).toBe(2);
    expect(switches).toHaveLength(1);
    expect(switches[0].from).toBe("gemini-2.5-flash");
  });

  it("T3121 (regresión): project-quota-zero en cualquier intento corta aunque modelos anteriores hayan caído por rate-limit", async () => {
    // Escenario realista: primer modelo rate-limit (transitorio), segundo modelo proyecto-cero.
    // El bucle debe cortar al detectar project-quota-zero, sin probar el 3º ni el 4º.
    const { client, streamCalls } = makeClientWithSequence([
      { kind: "rate-limit" },
      { kind: "project-quota-zero" },
    ]);
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await runAgentTurn(baseOpts());

    expect(result.error).toBe("project-quota-zero");
    expect(streamCalls()).toBe(2);
  });

  it("autoFallback=false: rate-limit se reporta tal cual sin intentar otro modelo", async () => {
    const { client, streamCalls } = makeClientWithSequence([{ kind: "rate-limit" }]);
    vi.mocked(createClient).mockResolvedValue(client as never);

    const result = await runAgentTurn(baseOpts({ autoFallback: false }));

    expect(result.error).toBe("rate-limit");
    expect(streamCalls()).toBe(1);
  });
});
