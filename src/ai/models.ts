export interface ModelLimit {
  rpm: number;
  tpm: number;
  rpd: number;
}

export interface ModelDefinition {
  id: string;
  label: string;
  category: "texto" | "multimodal" | "agentes" | "audio" | "embedding" | "live" | "otros";
  limits: ModelLimit;
  unlimitedTpm?: boolean;
  unlimitedRpm?: boolean;
  unlimitedRpd?: boolean;
  fallbackGroup: string;
  priority: number;
}

export const MODEL_REGISTRY: ModelDefinition[] = [
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    category: "texto",
    limits: { rpm: 6, tpm: 250_000, rpd: 20 },
    fallbackGroup: "flash",
    priority: 1,
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    category: "texto",
    limits: { rpm: 10, tpm: 250_000, rpd: 20 },
    fallbackGroup: "flash",
    priority: 2,
  },
  {
    id: "gemini-3-flash",
    label: "Gemini 3 Flash",
    category: "texto",
    limits: { rpm: 5, tpm: 250_000, rpd: 20 },
    fallbackGroup: "flash",
    priority: 3,
  },
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    category: "texto",
    limits: { rpm: 5, tpm: 250_000, rpd: 20 },
    fallbackGroup: "flash",
    priority: 4,
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite",
    category: "texto",
    limits: { rpm: 15, tpm: 250_000, rpd: 500 },
    fallbackGroup: "flash-extended",
    priority: 1,
  },
  {
    id: "gemma-4-26b",
    label: "Gemma 4 26B",
    category: "otros",
    limits: { rpm: 15, tpm: 0, rpd: 1_500 },
    unlimitedTpm: true,
    fallbackGroup: "flash-extended",
    priority: 2,
  },
  {
    id: "gemma-4-31b",
    label: "Gemma 4 31B",
    category: "otros",
    limits: { rpm: 15, tpm: 0, rpd: 1_500 },
    unlimitedTpm: true,
    fallbackGroup: "flash-extended",
    priority: 3,
  },
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    category: "texto",
    limits: { rpm: 0, tpm: 0, rpd: 0 },
    fallbackGroup: "pro",
    priority: 1,
  },
  {
    id: "gemini-3.1-pro",
    label: "Gemini 3.1 Pro",
    category: "texto",
    limits: { rpm: 0, tpm: 0, rpd: 0 },
    fallbackGroup: "pro",
    priority: 2,
  },
  {
    id: "gemini-2.5-flash-tts",
    label: "Gemini 2.5 Flash TTS",
    category: "audio",
    limits: { rpm: 3, tpm: 10_000, rpd: 10 },
    fallbackGroup: "audio",
    priority: 1,
  },
  {
    id: "gemini-3.1-flash-tts",
    label: "Gemini 3.1 Flash TTS",
    category: "audio",
    limits: { rpm: 3, tpm: 10_000, rpd: 10 },
    fallbackGroup: "audio",
    priority: 2,
  },
  {
    id: "gemini-embedding-1",
    label: "Gemini Embedding 1",
    category: "embedding",
    limits: { rpm: 100, tpm: 30_000, rpd: 1_000 },
    fallbackGroup: "embedding",
    priority: 1,
  },
  {
    id: "gemini-embedding-2",
    label: "Gemini Embedding 2",
    category: "embedding",
    limits: { rpm: 100, tpm: 30_000, rpd: 1_000 },
    fallbackGroup: "embedding",
    priority: 2,
  },
];

export interface FallbackChain {
  group: string;
  label: string;
  models: string[];
}

export const FALLBACK_CHAINS: FallbackChain[] = [
  {
    group: "flash",
    label: "Flash (rápido, propósito general)",
    models: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3-flash", "gemini-3.5-flash"],
  },
  {
    group: "flash-extended",
    label: "Flash extendido (más cuota)",
    models: ["gemini-3.1-flash-lite", "gemma-4-26b", "gemma-4-31b"],
  },
  {
    group: "pro",
    label: "Pro (razonamiento profundo)",
    models: ["gemini-2.5-pro", "gemini-3.1-pro"],
  },
  {
    group: "audio",
    label: "Audio / TTS",
    models: ["gemini-2.5-flash-tts", "gemini-3.1-flash-tts"],
  },
  {
    group: "embedding",
    label: "Embeddings",
    models: ["gemini-embedding-1", "gemini-embedding-2"],
  },
];

export function getModelDef(id: string): ModelDefinition | undefined {
  return MODEL_REGISTRY.find((m) => m.id === id);
}

export function getModelsByGroup(group: string): ModelDefinition[] {
  return MODEL_REGISTRY.filter((m) => m.fallbackGroup === group).sort(
    (a, b) => a.priority - b.priority,
  );
}

export function getChainForGroup(group: string): FallbackChain | undefined {
  return FALLBACK_CHAINS.find((c) => c.group === group);
}

export function getDefaultGroup(): string {
  return "flash";
}

export function isModelAvailable(def: ModelDefinition): boolean {
  return def.limits.rpm > 0 || def.limits.tpm > 0 || def.limits.rpd > 0 || !!def.unlimitedTpm;
}
