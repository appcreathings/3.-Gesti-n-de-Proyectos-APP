import { getModelDef, getModelsByGroup, getChainForGroup, type ModelDefinition, type FallbackChain } from "./models";
import { rateLimiter, type RateLimiter } from "./rateLimiter";

export interface FallbackEvent {
  from: string;
  to: string;
  reason: "rate-limited" | "saturated" | "preferred-unavailable";
  timestamp: Date;
}

export interface ModelSelection {
  modelId: string | null;
  switched: boolean;
  reason: "preferred" | "fallback" | "none-available";
  fallbackEvent?: FallbackEvent;
}

export class ModelSelector {
  constructor(
    private limiter: RateLimiter = rateLimiter,
  ) {}

  onFallback: ((event: FallbackEvent) => void) | null = null;

  select(
    preferredId: string,
    groupOverride?: string,
    excludeIds?: Set<string>,
  ): ModelSelection {
    const preferred = getModelDef(preferredId);
    if (!preferred) {
      return { modelId: null, switched: false, reason: "none-available" };
    }

    const groupId = groupOverride ?? preferred.fallbackGroup;
    const chain = getChainForGroup(groupId);
    const candidates = chain
      ? this.resolveChainModels(chain)
      : getModelsByGroup(groupId);

    const preferredInChain = candidates.find((m) => m.id === preferredId);

    if (preferredInChain && !excludeIds?.has(preferredInChain.id)) {
      if (this.limiter.canMakeRequest(preferredInChain.id)) {
        return { modelId: preferredInChain.id, switched: false, reason: "preferred" };
      }
    }

    for (const candidate of candidates) {
      if (excludeIds?.has(candidate.id)) continue;
      if (candidate.id === preferredId) continue;
      if (this.limiter.canMakeRequest(candidate.id)) {
        const ev: FallbackEvent = {
          from: preferredId,
          to: candidate.id,
          reason: preferredInChain && !this.limiter.canMakeRequest(preferredInChain.id)
            ? (this.limiter.getStatus(preferredId).saturated ? "saturated" : "rate-limited")
            : "preferred-unavailable",
          timestamp: new Date(),
        };
        this.onFallback?.(ev);
        return {
          modelId: candidate.id,
          switched: true,
          reason: "fallback",
          fallbackEvent: ev,
        };
      }
    }

    return { modelId: null, switched: false, reason: "none-available" };
  }

  private resolveChainModels(chain: FallbackChain): ModelDefinition[] {
    const models: ModelDefinition[] = [];
    const seen = new Set<string>();
    for (const id of chain.models) {
      if (seen.has(id)) continue;
      seen.add(id);
      const def = getModelDef(id);
      if (def) models.push(def);
    }
    return models.sort((a, b) => a.priority - b.priority);
  }
}

export const modelSelector = new ModelSelector();
