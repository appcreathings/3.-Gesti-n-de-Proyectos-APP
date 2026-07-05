import { getModelDef, getModelsByGroup } from "./models";

interface ModelWindow {
  rpm: number[];
  tpm: { ts: number; tokens: number }[];
  rpd: number[];
  saturated: boolean;
  retryAt: number;
}

export interface RateLimitStatus {
  modelId: string;
  rpmUsed: number;
  rpmLimit: number;
  tpmUsed: number;
  tpmLimit: number;
  rpdUsed: number;
  rpdLimit: number;
  saturated: boolean;
  retryAt: number | null;
  resetsAt: {
    rpm: number | null;
    tpm: number | null;
    rpd: number | null;
  };
}

const RPM_WINDOW = 60_000;
const TPM_WINDOW = 60_000;
const RPD_WINDOW = 86_400_000;

export class RateLimiter {
  private windows = new Map<string, ModelWindow>();

  private getOrCreate(id: string): ModelWindow {
    let w = this.windows.get(id);
    if (!w) {
      w = { rpm: [], tpm: [], rpd: [], saturated: false, retryAt: 0 };
      this.windows.set(id, w);
    }
    return w;
  }

  private prune(w: ModelWindow): void {
    const now = Date.now();
    w.rpm = w.rpm.filter((ts) => now - ts < RPM_WINDOW);
    w.tpm = w.tpm.filter((e) => now - e.ts < TPM_WINDOW);
    w.rpd = w.rpd.filter((ts) => now - ts < RPD_WINDOW);
    if (w.saturated && w.retryAt > 0 && now >= w.retryAt) {
      w.saturated = false;
      w.retryAt = 0;
    }
  }

  canMakeRequest(modelId: string): boolean {
    const w = this.getOrCreate(modelId);
    this.prune(w);
    if (w.saturated) return false;

    const def = getModelDef(modelId);
    if (!def) return true;

    if (
      !def.unlimitedRpm &&
      def.limits.rpm > 0 &&
      w.rpm.length >= def.limits.rpm
    ) {
      return false;
    }

    if (
      !def.unlimitedRpd &&
      def.limits.rpd > 0 &&
      w.rpd.length >= def.limits.rpd
    ) {
      return false;
    }

    return true;
  }

  recordRequest(modelId: string, tokenEstimate = 500): void {
    const w = this.getOrCreate(modelId);
    this.prune(w);
    const now = Date.now();
    w.rpm.push(now);
    w.rpd.push(now);
    w.tpm.push({ ts: now, tokens: tokenEstimate });
  }

  recordTokens(modelId: string, tokenCount: number): void {
    const w = this.getOrCreate(modelId);
    this.prune(w);
    const now = Date.now();
    w.tpm.push({ ts: now, tokens: tokenCount });
  }

  markSaturated(modelId: string, retryAfterSeconds = 60): void {
    const w = this.getOrCreate(modelId);
    w.saturated = true;
    w.retryAt = Date.now() + retryAfterSeconds * 1000;
  }

  getStatus(modelId: string): RateLimitStatus {
    const w = this.getOrCreate(modelId);
    this.prune(w);
    const def = getModelDef(modelId);

    const rpmSum = w.tpm.reduce((s, e) => s + e.tokens, 0);

    return {
      modelId,
      rpmUsed: w.rpm.length,
      rpmLimit: def?.limits.rpm ?? Infinity,
      tpmUsed: rpmSum,
      tpmLimit: def?.limits.tpm ?? Infinity,
      rpdUsed: w.rpd.length,
      rpdLimit: def?.limits.rpd ?? Infinity,
      saturated: w.saturated,
      retryAt: w.retryAt > 0 ? w.retryAt : null,
      resetsAt: {
        rpm: w.rpm.length > 0 ? w.rpm[0] + RPM_WINDOW : null,
        tpm: w.tpm.length > 0 ? w.tpm[0].ts + TPM_WINDOW : null,
        rpd: w.rpd.length > 0 ? w.rpd[0] + RPD_WINDOW : null,
      },
    };
  }

  getAllStatuses(): RateLimitStatus[] {
    const ids = Array.from(this.windows.keys());
    return ids.map((id) => this.getStatus(id));
  }

  getAvailableInGroup(group: string): string[] {
    const models = getModelsByGroup(group);
    return models.filter((m) => this.canMakeRequest(m.id)).map((m) => m.id);
  }

  onModelUnblocked?: (modelId: string) => void;
}

export const rateLimiter = new RateLimiter();
