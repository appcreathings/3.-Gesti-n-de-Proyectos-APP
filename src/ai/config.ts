import { z } from "zod";
import { idbDel, idbGet, idbSet } from "@/storage/idb";
import { MODEL_REGISTRY, isModelAvailable } from "./models";

/**
 * Device-local AI configuration. Lives in IndexedDB, NEVER in workspace.json:
 * the workspace is exported/shared and the API key must never travel with it
 * (constitución, principio I — nada a la nube sin acción explícita).
 */

export const AI_MODELS = MODEL_REGISTRY.map((m) => ({
  value: m.id,
  label: m.label,
  hint: isModelAvailable(m)
    ? `${m.limits.rpm > 0 ? `${m.limits.rpm} req/min` : ""}${m.limits.tpm > 0 ? ` · ${(m.limits.tpm / 1000).toFixed(0)}K tok/min` : ""}${m.unlimitedTpm ? " · tok ilimitado" : ""}`
    : `sin cuota disponible`,
  available: isModelAvailable(m),
}));

export const AiConfigSchema = z.object({
  apiKey: z.string().default(""),
  model: z.string().default("gemini-2.5-flash"),
  confirmWrites: z.boolean().default(true),
  autoFallback: z.boolean().default(true),
  fallbackGroup: z.string().default("flash"),
});
export type AiConfig = z.infer<typeof AiConfigSchema>;

const IDB_KEY = "aiConfig";

export function defaultAiConfig(): AiConfig {
  return AiConfigSchema.parse({});
}

export async function loadAiConfig(): Promise<AiConfig> {
  try {
    const raw = await idbGet<unknown>(IDB_KEY);
    const parsed = AiConfigSchema.safeParse(raw ?? {});
    return parsed.success ? parsed.data : defaultAiConfig();
  } catch {
    return defaultAiConfig();
  }
}

export async function saveAiConfig(config: AiConfig): Promise<void> {
  await idbSet(IDB_KEY, AiConfigSchema.parse(config));
}

export async function clearAiConfig(): Promise<void> {
  await idbDel(IDB_KEY);
}
