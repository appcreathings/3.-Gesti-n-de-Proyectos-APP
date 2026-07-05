import { describe, expect, it, beforeEach, vi } from "vitest";
import { RateLimiter } from "./rateLimiter";

describe("RateLimiter", () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter();
  });

  it("permite requests cuando no hay consumo", () => {
    expect(limiter.canMakeRequest("gemini-2.5-flash")).toBe(true);
  });

  it("bloquea cuando se alcanza el límite de RPM", () => {
    // gemini-2.5-flash tiene rpm: 6
    for (let i = 0; i < 6; i++) {
      expect(limiter.canMakeRequest("gemini-2.5-flash")).toBe(true);
      limiter.recordRequest("gemini-2.5-flash");
    }
    expect(limiter.canMakeRequest("gemini-2.5-flash")).toBe(false);
  });

  it("permite requests para modelo sin límites definidos", () => {
    expect(limiter.canMakeRequest("modelo-desconocido")).toBe(true);
    limiter.recordRequest("modelo-desconocido");
    expect(limiter.canMakeRequest("modelo-desconocido")).toBe(true);
  });

  it("marca como saturado y bloquea requests", () => {
    expect(limiter.canMakeRequest("gemini-2.5-flash")).toBe(true);
    limiter.markSaturated("gemini-2.5-flash", 60);
    expect(limiter.canMakeRequest("gemini-2.5-flash")).toBe(false);
  });

  it("reporta estado correcto", () => {
    limiter.recordRequest("gemini-2.5-flash", 100);
    const status = limiter.getStatus("gemini-2.5-flash");
    expect(status.modelId).toBe("gemini-2.5-flash");
    expect(status.rpmUsed).toBe(1);
    expect(status.rpmLimit).toBe(6);
    expect(status.tpmUsed).toBe(100);
    expect(status.tpmLimit).toBe(250_000);
    expect(status.rpdUsed).toBe(1);
    expect(status.rpdLimit).toBe(20);
    expect(status.saturated).toBe(false);
  });

  it("saturación se refleja en el estado", () => {
    limiter.markSaturated("gemini-2.5-flash", 30);
    const status = limiter.getStatus("gemini-2.5-flash");
    expect(status.saturated).toBe(true);
    expect(status.retryAt).not.toBeNull();
  });

  it("getAvailableInGroup devuelve solo modelos disponibles", () => {
    const available = limiter.getAvailableInGroup("flash");
    expect(available).toContain("gemini-2.5-flash");
    expect(available).toContain("gemini-2.5-flash-lite");
    expect(available).toContain("gemini-3-flash");
    expect(available).toContain("gemini-3.5-flash");
  });

  it("modelo saturado no aparece disponible en getAvailableInGroup", () => {
    limiter.markSaturated("gemini-2.5-flash", 60);
    const available = limiter.getAvailableInGroup("flash");
    expect(available).not.toContain("gemini-2.5-flash");
    expect(available).toContain("gemini-2.5-flash-lite");
  });
});

describe("RateLimiter - sliding windows", () => {
  it("libera RPM después de la ventana de 60s", () => {
    vi.useFakeTimers();
    const limiter = new RateLimiter();

    for (let i = 0; i < 6; i++) {
      limiter.recordRequest("gemini-2.5-flash");
    }
    expect(limiter.canMakeRequest("gemini-2.5-flash")).toBe(false);

    vi.advanceTimersByTime(61_000);
    expect(limiter.canMakeRequest("gemini-2.5-flash")).toBe(true);

    vi.useRealTimers();
  });

  it("libera saturated después de retryAfter", () => {
    vi.useFakeTimers();
    const limiter = new RateLimiter();

    limiter.markSaturated("gemini-2.5-flash", 10);
    expect(limiter.canMakeRequest("gemini-2.5-flash")).toBe(false);

    vi.advanceTimersByTime(11_000);
    expect(limiter.canMakeRequest("gemini-2.5-flash")).toBe(true);

    vi.useRealTimers();
  });
});
