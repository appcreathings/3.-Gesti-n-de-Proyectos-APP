import { describe, it, expect } from "vitest";
import { insertTokenAt } from "./insertToken";

describe("insertTokenAt (spec 036 §C3)", () => {
  it("inserts {{campo}} at the cursor position and returns the new cursor", () => {
    // "Hola |mundo" (cursor at index 5)
    const el = { selectionStart: 5, selectionEnd: 5 };
    const r = insertTokenAt("Hola mundo", "name", el);
    expect(r.value).toBe("Hola {{name}}mundo");
    expect(r.cursor).toBe(5 + "{{name}}".length);
  });

  it("appends at the end when el is null (no selection info)", () => {
    const r = insertTokenAt("Hola ", "name", null);
    expect(r.value).toBe("Hola {{name}}");
    expect(r.cursor).toBe("Hola {{name}}".length);
  });

  it("replaces the selected range when start !== end", () => {
    // Select "mundo" (indices 5..10) and replace it with the token.
    const el = { selectionStart: 5, selectionEnd: 10 };
    const r = insertTokenAt("Hola mundo", "name", el);
    expect(r.value).toBe("Hola {{name}}");
  });

  it("applies a format modifier as {{campo|mod}}", () => {
    const r = insertTokenAt("", "closedate", null, "date");
    expect(r.value).toBe("{{closedate|date}}");
    expect(r.cursor).toBe("{{closedate|date}}".length);
  });

  it("supports field names with spaces and accents (Sheets columns)", () => {
    const r = insertTokenAt("", "Nombre Cliente", null);
    expect(r.value).toBe("{{Nombre Cliente}}");
  });
});
