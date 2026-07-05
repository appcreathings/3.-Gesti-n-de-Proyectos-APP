import type { GoogleGenAI } from "@google/genai";
import { classifyAiError, type AiErrorKind } from "./errors";

/**
 * Lazy-load the Gemini SDK so it stays out of the main bundle: the app must
 * boot fast even for users who never configure the assistant.
 */
export async function createClient(apiKey: string): Promise<GoogleGenAI> {
  const { GoogleGenAI } = await import("@google/genai");
  return new GoogleGenAI({ apiKey });
}

export type KeyValidation = { ok: true } | { ok: false; error: AiErrorKind };

/** Cheapest authenticated call: list models. 400/403 ⇒ invalid key. */
export async function validateApiKey(apiKey: string): Promise<KeyValidation> {
  try {
    const ai = await createClient(apiKey);
    await ai.models.list({ config: { pageSize: 1 } });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: classifyAiError(e) };
  }
}
