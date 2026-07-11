import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pollingManager } from "./polling-manager";

describe("polling-manager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    pollingManager.stopAll();
    vi.useRealTimers();
  });

  it("registers and polls provider at configured interval", async () => {
    const handler = vi.fn().mockResolvedValue({
      success: true,
      newRecords: 5,
      lastExternalTimestamp: new Date().toISOString(),
    });

    pollingManager.register("test-provider", {
      intervalMs: 1000,
      backoffOnFailure: false,
      maxIntervalMs: 30000,
      enabled: true,
    }, handler);

    expect(handler).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    await vi.runAllTicks();
    expect(handler).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    await vi.runAllTicks();
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("does not register disabled provider", () => {
    const handler = vi.fn();

    pollingManager.register("disabled-provider", {
      intervalMs: 1000,
      backoffOnFailure: false,
      maxIntervalMs: 30000,
      enabled: false,
    }, handler);

    vi.advanceTimersByTime(5000);
    expect(handler).not.toHaveBeenCalled();
  });

  it("unregisters provider", async () => {
    const handler = vi.fn().mockResolvedValue({
      success: true,
      newRecords: 0,
      lastExternalTimestamp: new Date().toISOString(),
    });

    pollingManager.register("to-remove", {
      intervalMs: 1000,
      backoffOnFailure: false,
      maxIntervalMs: 30000,
      enabled: true,
    }, handler);

    pollingManager.unregister("to-remove");

    vi.advanceTimersByTime(5000);
    expect(handler).not.toHaveBeenCalled();
  });

  it("pauses and resumes all polling", async () => {
    const handler = vi.fn().mockResolvedValue({
      success: true,
      newRecords: 0,
      lastExternalTimestamp: new Date().toISOString(),
    });

    pollingManager.register("pausable", {
      intervalMs: 1000,
      backoffOnFailure: false,
      maxIntervalMs: 30000,
      enabled: true,
    }, handler);

    pollingManager.pauseAll();
    vi.advanceTimersByTime(5000);
    expect(handler).not.toHaveBeenCalled();

    pollingManager.resumeAll();
    vi.advanceTimersByTime(1000);
    await vi.runAllTicks();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("polls immediately on demand", async () => {
    const handler = vi.fn().mockResolvedValue({
      success: true,
      newRecords: 3,
      lastExternalTimestamp: new Date().toISOString(),
    });

    pollingManager.register("on-demand", {
      intervalMs: 60000,
      backoffOnFailure: false,
      maxIntervalMs: 300000,
      enabled: true,
    }, handler);

    const result = await pollingManager.pollNow("on-demand");

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      success: true,
      newRecords: 3,
      lastExternalTimestamp: expect.any(String),
    });
  });

  it("returns null for unknown provider on pollNow", async () => {
    const result = await pollingManager.pollNow("nonexistent");
    expect(result).toBeNull();
  });

  it("returns status for registered provider", () => {
    const handler = vi.fn().mockResolvedValue({
      success: true,
      newRecords: 0,
      lastExternalTimestamp: new Date().toISOString(),
    });

    pollingManager.register("status-check", {
      intervalMs: 5000,
      backoffOnFailure: false,
      maxIntervalMs: 30000,
      enabled: true,
    }, handler);

    const status = pollingManager.getStatus("status-check");

    expect(status).toEqual({
      isPolling: true,
      currentInterval: 5000,
    });
  });

  it("returns null status for unknown provider", () => {
    const status = pollingManager.getStatus("unknown");
    expect(status).toBeNull();
  });

  describe("getAllStatuses (spec 023 §F, panel de servicios programados)", () => {
    it("lists every active registration, keyed by provider", () => {
      const handler = vi.fn().mockResolvedValue({
        success: true,
        newRecords: 0,
        lastExternalTimestamp: new Date().toISOString(),
      });

      pollingManager.register("hubspot", { intervalMs: 300_000, backoffOnFailure: true, maxIntervalMs: 1_800_000, enabled: true }, handler);
      pollingManager.register("google-sheets", { intervalMs: 60_000, backoffOnFailure: false, maxIntervalMs: 60_000, enabled: true }, handler);

      const statuses = pollingManager.getAllStatuses();

      expect(Object.keys(statuses).sort()).toEqual(["google-sheets", "hubspot"]);
      expect(statuses.hubspot).toEqual({
        isPolling: true,
        currentInterval: 300_000,
        baseIntervalMs: 300_000,
        maxIntervalMs: 1_800_000,
      });
    });

    it("reflects unregister() by dropping the entry", () => {
      const handler = vi.fn().mockResolvedValue({
        success: true,
        newRecords: 0,
        lastExternalTimestamp: new Date().toISOString(),
      });
      pollingManager.register("to-drop", { intervalMs: 1000, backoffOnFailure: false, maxIntervalMs: 30000, enabled: true }, handler);

      pollingManager.unregister("to-drop");

      expect(pollingManager.getAllStatuses()).toEqual({});
    });

    it("returns an empty object when nothing is registered", () => {
      expect(pollingManager.getAllStatuses()).toEqual({});
    });
  });
});
