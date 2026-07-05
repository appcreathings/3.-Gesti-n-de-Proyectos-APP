import { create } from "zustand";
import {
  clearAiConfig,
  defaultAiConfig,
  loadAiConfig,
  saveAiConfig,
  type AiConfig,
} from "@/ai/config";
import { validateApiKey } from "@/ai/gemini/client";
import type { AiErrorKind } from "@/ai/gemini/errors";

export type KeyStatus = "unset" | "validating" | "valid" | "invalid" | "network-error";

interface AiConfigState {
  config: AiConfig;
  loaded: boolean;
  /** Only validated keys are persisted, so a saved key implies "valid". */
  keyStatus: KeyStatus;
  lastError: AiErrorKind | null;

  hydrate: () => Promise<void>;
  /** Validate against the API and persist only on success. */
  saveAndValidateKey: (apiKey: string) => Promise<boolean>;
  clearKey: () => Promise<void>;
  setModel: (model: AiConfig["model"]) => Promise<void>;
  setConfirmWrites: (v: boolean) => Promise<void>;
  setAutoFallback: (v: boolean) => Promise<void>;
  setFallbackGroup: (group: string) => Promise<void>;
}

export const useAiConfigStore = create<AiConfigState>((set, get) => ({
  config: defaultAiConfig(),
  loaded: false,
  keyStatus: "unset",
  lastError: null,

  async hydrate() {
    const config = await loadAiConfig();
    set({ config, loaded: true, keyStatus: config.apiKey ? "valid" : "unset" });
  },

  async saveAndValidateKey(apiKey) {
    const trimmed = apiKey.trim();
    if (!trimmed) return false;
    set({ keyStatus: "validating", lastError: null });
    const res = await validateApiKey(trimmed);
    if (!res.ok) {
      set({
        keyStatus: res.error === "invalid-key" ? "invalid" : "network-error",
        lastError: res.error,
      });
      return false;
    }
    const config = { ...get().config, apiKey: trimmed };
    await saveAiConfig(config);
    set({ config, keyStatus: "valid", lastError: null });
    return true;
  },

  async clearKey() {
    await clearAiConfig();
    set({ config: defaultAiConfig(), keyStatus: "unset", lastError: null });
  },

  async setModel(model) {
    const config = { ...get().config, model };
    await saveAiConfig(config);
    set({ config });
  },

  async setConfirmWrites(confirmWrites) {
    const config = { ...get().config, confirmWrites };
    await saveAiConfig(config);
    set({ config });
  },

  async setAutoFallback(autoFallback) {
    const config = { ...get().config, autoFallback };
    await saveAiConfig(config);
    set({ config });
  },

  async setFallbackGroup(fallbackGroup) {
    const config = { ...get().config, fallbackGroup };
    await saveAiConfig(config);
    set({ config });
  },
}));
