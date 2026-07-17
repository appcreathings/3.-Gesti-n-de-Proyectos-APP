/**
 * Cálculo puro del delay de reintento con backoff exponencial + jitter.
 * Extraído de `retry-engine.ts` (spec 027 §E) para que el motor de flujos
 * (`src/flows/engine.ts`) pueda reusar exactamente el mismo criterio sin
 * importar el procesador de cola completo (que arrastra `integrationDb`/
 * Dexie a nivel de módulo — inaceptable para un módulo unit-testeable).
 * `retry-engine.ts` lo re-exporta para no romper sus call sites previos.
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelayMs: 1_000,
  maxDelayMs: 300_000,
  jitterFactor: 0.2,
};

export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const exponential = config.baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(exponential, config.maxDelayMs);
  const jitter = 1 + (Math.random() * 2 - 1) * config.jitterFactor;
  return Math.round(capped * jitter);
}
