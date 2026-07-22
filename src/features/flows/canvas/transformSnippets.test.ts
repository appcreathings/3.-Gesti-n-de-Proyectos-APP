import { describe, it, expect } from "vitest";
import { applySnippet, TRANSFORM_SNIPPETS, RETURN_LINE } from "./transformSnippets";

const BODY = 'record.name = "x";';

describe("applySnippet (spec 036 §D, CA-07.2)", () => {
  it("closes the snippet with a return when there is no code yet", () => {
    expect(applySnippet(undefined, BODY)).toBe(`${BODY}\n${RETURN_LINE}`);
    expect(applySnippet("", BODY)).toBe(`${BODY}\n${RETURN_LINE}`);
    expect(applySnippet("   \n ", BODY)).toBe(`${BODY}\n${RETURN_LINE}`);
  });

  it("inserts before an existing final return so the snippet is never dead code", () => {
    const current = `record.a = 1;\n${RETURN_LINE}`;
    const next = applySnippet(current, BODY);
    expect(next).toBe(`record.a = 1;\n${BODY}\n${RETURN_LINE}`);
    // Un solo return, y al final.
    expect(next.match(/return record;/g)).toHaveLength(1);
    expect(next.trimEnd().endsWith(RETURN_LINE)).toBe(true);
  });

  it("does not duplicate the return when the code is only a return", () => {
    const next = applySnippet(RETURN_LINE, BODY);
    expect(next).toBe(`${BODY}\n${RETURN_LINE}`);
    expect(next.match(/return record;/g)).toHaveLength(1);
  });

  it("appends at the end when the code does not end in a return", () => {
    const next = applySnippet("record.a = 1;", BODY);
    expect(next).toBe(`record.a = 1;\n${BODY}`);
  });

  it("chaining two snippets keeps exactly one trailing return", () => {
    const one = applySnippet("", TRANSFORM_SNIPPETS[0].body);
    const two = applySnippet(one, TRANSFORM_SNIPPETS[1].body);
    expect(two.match(/return record;/g)).toHaveLength(1);
    expect(two.trimEnd().endsWith(RETURN_LINE)).toBe(true);
    expect(two).toContain(TRANSFORM_SNIPPETS[0].body);
    expect(two).toContain(TRANSFORM_SNIPPETS[1].body);
  });

  it("every shipped snippet body is a statement without its own return", () => {
    for (const s of TRANSFORM_SNIPPETS) {
      expect(s.body).not.toContain("return");
      expect(s.label.length).toBeGreaterThan(0);
    }
  });

  it("a snippet applied to an empty editor is syntactically valid JS", () => {
    for (const s of TRANSFORM_SNIPPETS) {
      const code = applySnippet("", s.body);
      // Mismo constructor que usa "Probar con datos de ejemplo".
      expect(() => new Function("record", code)).not.toThrow();
    }
  });
});
