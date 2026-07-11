import { describe, it, expect } from "vitest";
import { calculateRetryDelay } from "./retry-engine";

describe("retry-engine", () => {
  describe("calculateRetryDelay", () => {
    it("returns base delay for first attempt", () => {
      const delay = calculateRetryDelay(0, {
        maxRetries: 5,
        baseDelayMs: 1000,
        maxDelayMs: 300000,
        jitterFactor: 0,
      });
      
      expect(delay).toBe(1000);
    });

    it("doubles delay exponentially", () => {
      const config = {
        maxRetries: 5,
        baseDelayMs: 1000,
        maxDelayMs: 300000,
        jitterFactor: 0,
      };
      
      expect(calculateRetryDelay(0, config)).toBe(1000);
      expect(calculateRetryDelay(1, config)).toBe(2000);
      expect(calculateRetryDelay(2, config)).toBe(4000);
      expect(calculateRetryDelay(3, config)).toBe(8000);
      expect(calculateRetryDelay(4, config)).toBe(16000);
    });

    it("caps at maxDelayMs", () => {
      const delay = calculateRetryDelay(10, {
        maxRetries: 5,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        jitterFactor: 0,
      });
      
      expect(delay).toBeLessThanOrEqual(30000);
    });

    it("applies jitter within configured factor", () => {
      const delays: number[] = [];
      
      for (let i = 0; i < 100; i++) {
        delays.push(
          calculateRetryDelay(2, {
            maxRetries: 5,
            baseDelayMs: 1000,
            maxDelayMs: 300000,
            jitterFactor: 0.2,
          })
        );
      }
      
      const baseDelay = 4000;
      const minExpected = baseDelay * 0.8;
      const maxExpected = baseDelay * 1.2;
      
      expect(Math.min(...delays)).toBeGreaterThanOrEqual(minExpected);
      expect(Math.max(...delays)).toBeLessThanOrEqual(maxExpected);
    });
  });
});
