export interface PollingConfig {
  intervalMs: number;
  backoffOnFailure: boolean;
  maxIntervalMs: number;
  enabled: boolean;
}

export interface PollResult {
  success: boolean;
  newRecords: number;
  lastExternalTimestamp: string;
  error?: string;
  /** The actual fetched records (flattened), for handlers that apply them (e.g. flows). */
  records?: Record<string, unknown>[];
  /** Spec 033 A2: entregas que quedan acumuladas en el proxy inbox tras el
   *  drenado (lo reporta el proxy). Opcional — solo el inbox lo provee. */
  backlog?: number;
}

type PollHandler = () => Promise<PollResult>;

interface PollingRegistration {
  config: PollingConfig;
  handler: PollHandler;
  currentInterval: number;
  timer: ReturnType<typeof setInterval> | null;
  isPaused: boolean;
}

class PollingManager {
  private registrations = new Map<string, PollingRegistration>();

  register(provider: string, config: PollingConfig, handler: PollHandler): void {
    if (!config.enabled) return;

    // Clear any pre-existing timer for this key first: overwriting the map
    // entry below without this would orphan the previous interval (it keeps
    // firing forever, referencing nothing reachable) if `register` is ever
    // called twice for the same key without an intervening `unregister`.
    this.unregister(provider);

    const registration: PollingRegistration = {
      config,
      handler,
      currentInterval: config.intervalMs,
      timer: null,
      isPaused: false,
    };

    this.registrations.set(provider, registration);
    this.startPolling(provider);
  }

  unregister(provider: string): void {
    const registration = this.registrations.get(provider);
    if (registration?.timer) {
      clearInterval(registration.timer);
    }
    this.registrations.delete(provider);
  }

  pauseAll(): void {
    for (const registration of this.registrations.values()) {
      if (registration.timer) {
        clearInterval(registration.timer);
        registration.timer = null;
        registration.isPaused = true;
      }
    }
  }

  resumeAll(): void {
    for (const [provider, registration] of this.registrations) {
      if (registration.isPaused && registration.config.enabled) {
        this.startPolling(provider);
        registration.isPaused = false;
      }
    }
  }

  async pollNow(provider: string): Promise<PollResult | null> {
    const registration = this.registrations.get(provider);
    if (!registration) return null;

    return this.executePoll(provider, registration);
  }

  stopAll(): void {
    for (const registration of this.registrations.values()) {
      if (registration.timer) {
        clearInterval(registration.timer);
        registration.timer = null;
      }
    }
    this.registrations.clear();
  }

  getStatus(provider: string): { isPolling: boolean; currentInterval: number } | null {
    const registration = this.registrations.get(provider);
    if (!registration) return null;

    return {
      isPolling: registration.timer !== null,
      currentInterval: registration.currentInterval,
    };
  }

  /** Todos los registros activos, para el panel de servicios programados
   * (spec 023 §F) — `getStatus` exige conocer la key de antemano, así que no
   * alcanza para listar qué está corriendo. */
  getAllStatuses(): Record<
    string,
    { isPolling: boolean; currentInterval: number; baseIntervalMs: number; maxIntervalMs: number }
  > {
    const result: Record<
      string,
      { isPolling: boolean; currentInterval: number; baseIntervalMs: number; maxIntervalMs: number }
    > = {};
    for (const [provider, registration] of this.registrations) {
      result[provider] = {
        isPolling: registration.timer !== null,
        currentInterval: registration.currentInterval,
        baseIntervalMs: registration.config.intervalMs,
        maxIntervalMs: registration.config.maxIntervalMs,
      };
    }
    return result;
  }

  private startPolling(provider: string): void {
    const registration = this.registrations.get(provider);
    if (!registration) return;

    if (registration.timer) {
      clearInterval(registration.timer);
    }

    registration.timer = setInterval(() => {
      void this.executePoll(provider, registration);
    }, registration.currentInterval);
  }

  private async executePoll(provider: string, registration: PollingRegistration): Promise<PollResult> {
    try {
      const result = await registration.handler();

      if (!result.success && registration.config.backoffOnFailure) {
        const nextInterval = Math.min(
          registration.currentInterval * 2,
          registration.config.maxIntervalMs
        );
        registration.currentInterval = nextInterval;
        this.startPolling(provider);
      } else if (result.success && registration.currentInterval !== registration.config.intervalMs) {
        registration.currentInterval = registration.config.intervalMs;
        this.startPolling(provider);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (registration.config.backoffOnFailure) {
        const nextInterval = Math.min(
          registration.currentInterval * 2,
          registration.config.maxIntervalMs
        );
        registration.currentInterval = nextInterval;
        this.startPolling(provider);
      }

      return {
        success: false,
        newRecords: 0,
        lastExternalTimestamp: new Date().toISOString(),
        error: errorMessage,
      };
    }
  }
}

export const pollingManager = new PollingManager();
