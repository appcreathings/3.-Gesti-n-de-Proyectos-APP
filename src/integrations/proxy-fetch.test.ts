import { describe, it, expect, vi, beforeEach } from "vitest";
import { postToProxy } from "./proxy-fetch";

describe("postToProxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends Content-Type: text/plain (never application/json — avoids the CORS preflight Apps Script can't answer)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 200, data: { results: [] } }),
    });

    await postToProxy("https://proxy.example/exec", { foo: "bar" });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://proxy.example/exec",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      })
    );
  });

  it("returns ok:true with the unwrapped data on a successful envelope", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 200, data: { results: [{ id: "1" }] } }),
    });

    const result = await postToProxy<{ results: unknown[] }>("https://proxy.example/exec", {});
    expect(result).toEqual({ ok: true, data: { results: [{ id: "1" }] } });
  });

  it("also accepts a raw (unwrapped) proxy response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [{ id: "1" }] }),
    });

    const result = await postToProxy<{ results: unknown[] }>("https://proxy.example/exec", {});
    expect(result).toEqual({ ok: true, data: { results: [{ id: "1" }] } });
  });

  it("treats envelope.status >= 400 as an error even though the HTTP transport status is 200 (Apps Script always returns HTTP 200)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true, // HTTP-level: Apps Script Web Apps never fail at this layer
      json: () => Promise.resolve({ status: 401, data: { message: "invalid token" } }),
    });

    const result = await postToProxy("https://proxy.example/exec", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("remote-error");
      expect(result.message).toBe("invalid token");
    }
  });

  it("falls back to data.error, then a generic message, when the remote error has no data.message", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 500, data: { error: "boom" } }),
    });
    const result = await postToProxy("https://proxy.example/exec", {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toBe("boom");
  });

  it("classifies a TypeError (Failed to fetch) as a CORS-flavored error with an actionable message", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await postToProxy("https://proxy.example/exec", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("cors");
      expect(result.message).toContain("CORS");
    }
  });

  it("classifies an AbortError as a timeout", async () => {
    global.fetch = vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"));

    const result = await postToProxy("https://proxy.example/exec", {}, 5000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("timeout");
      expect(result.message).toContain("5s");
    }
  });

  it("returns an http error when the transport response itself is not ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 502 });

    const result = await postToProxy("https://proxy.example/exec", {});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("http");
      expect(result.message).toContain("502");
    }
  });
});
