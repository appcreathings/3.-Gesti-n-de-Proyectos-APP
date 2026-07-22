import { describe, it, expect } from "vitest";
import { insertTextAt, buildToken } from "./insertToken";

describe("insertTextAt (spec 037 §B2)", () => {
  it("inserts arbitrary text at the cursor position and returns the new cursor", () => {
    const el = { selectionStart: 5, selectionEnd: 5 };
    const r = insertTextAt("Hola mundo", "amount", el);
    expect(r.value).toBe("Hola amountmundo");
    expect(r.cursor).toBe(5 + "amount".length);
  });

  it("appends at the end when el is null (no selection info)", () => {
    const r = insertTextAt("return ", "record.amount", null);
    expect(r.value).toBe("return record.amount");
    expect(r.cursor).toBe("return record.amount".length);
  });

  it("replaces the selected range when start !== end", () => {
    const el = { selectionStart: 5, selectionEnd: 10 };
    const r = insertTextAt("Hola mundo", "amount", el);
    expect(r.value).toBe("Hola amount");
    expect(r.cursor).toBe("Hola amount".length);
  });

  it("inserts an empty string without moving the cursor", () => {
    const el = { selectionStart: 2, selectionEnd: 2 };
    const r = insertTextAt("abcd", "", el);
    expect(r.value).toBe("abcd");
    expect(r.cursor).toBe(2);
  });
});

describe("buildToken (spec 039 §F)", () => {
  // Los tests del viejo `insertTokenAt` que seguían diciendo algo: el que
  // probaba la mecánica del cursor ya lo cubre `insertTextAt` arriba; lo que
  // queda propio del token es cómo se arma.
  it("arma {{campo}}", () => {
    expect(buildToken("name")).toBe("{{name}}");
  });

  it("aplica el modificador de formato como {{campo|mod}}", () => {
    expect(buildToken("closedate", "date")).toBe("{{closedate|date}}");
  });

  it("admite nombres con espacios y acentos (columnas de Sheets)", () => {
    expect(buildToken("Nombre Cliente")).toBe("{{Nombre Cliente}}");
    expect(buildToken("Teléfono")).toBe("{{Teléfono}}");
  });
});
