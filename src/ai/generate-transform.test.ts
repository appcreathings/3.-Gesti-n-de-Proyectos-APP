import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildGenerateTransformPrompt,
  parseGenerateTransformResponse,
  runGenerateTransform,
} from "./generate-transform";
import { rateLimiter } from "./rateLimiter";

describe("buildGenerateTransformPrompt", () => {
  it("includes the instruction, available fields, and sample record", () => {
    const prompt = buildGenerateTransformPrompt(
      "pasa el email a minúsculas",
      { email: "Ana@Example.com", firstname: "Ana" },
      ["email", "firstname"]
    );
    expect(prompt).toContain("pasa el email a minúsculas");
    expect(prompt).toContain("email, firstname");
    expect(prompt).toContain("Ana@Example.com");
  });

  it("is honest when there is no sample record yet", () => {
    const prompt = buildGenerateTransformPrompt("algo", undefined, []);
    expect(prompt).toContain("sin muestra real todavía");
    expect(prompt).toContain("sin campos conocidos todavía");
  });
});

describe("parseGenerateTransformResponse", () => {
  it("accepts syntactically valid JS as-is", () => {
    const res = parseGenerateTransformResponse("record.email = record.email.toLowerCase();\nreturn record;");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.code).toContain("toLowerCase");
  });

  it("strips ```js fences", () => {
    const res = parseGenerateTransformResponse("```js\nreturn record;\n```");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.code).toBe("return record;");
  });

  it("strips ```javascript fences (case-insensitive)", () => {
    const res = parseGenerateTransformResponse("```JavaScript\nreturn record;\n```");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.code).toBe("return record;");
  });

  it("strips bare ``` fences with no language tag", () => {
    const res = parseGenerateTransformResponse("```\nreturn record;\n```");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.code).toBe("return record;");
  });

  it("rejects an empty response", () => {
    const res = parseGenerateTransformResponse("");
    expect(res.ok).toBe(false);
  });

  it("rejects a response that becomes empty after stripping fences", () => {
    const res = parseGenerateTransformResponse("```js\n```");
    expect(res.ok).toBe(false);
  });

  it("rejects syntactically invalid JavaScript", () => {
    const res = parseGenerateTransformResponse("this is not { valid js at all (((");
    expect(res.ok).toBe(false);
  });
});

describe("runGenerateTransform", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns rate-limit without ever calling the model when the rate limiter is saturated", async () => {
    vi.spyOn(rateLimiter, "canMakeRequest").mockReturnValue(false);

    const res = await runGenerateTransform({
      apiKey: "fake-key",
      model: "gemini-2.5-flash",
      instruction: "algo",
    });

    expect(res).toEqual({ ok: false, error: "rate-limit" });
  });
});
