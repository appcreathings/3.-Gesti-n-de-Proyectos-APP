import { z } from "zod";
import { idbDel, idbGet, idbSet } from "@/storage/idb";

/**
 * Device-local AI configuration. Lives in IndexedDB, NEVER in workspace.json:
 * the workspace is exported/shared and the API key must never travel with it
 * (constitución, principio I — nada a la nube sin acción explícita).
 */

export const AI_MODELS = [
  {
    value: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    hint: "Rápido y económico (recomendado)",
  },
  {
    value: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    hint: "Razonamiento más profundo, más lento",
  },
] as const;

export const AiConfigSchema = z.object({
  apiKey: z.string().default(""),
  model: z.enum(["gemini-2.5-flash", "gemini-2.5-pro"]).default("gemini-2.5-flash"),
  confirmWrites: z.boolean().default(true),
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
