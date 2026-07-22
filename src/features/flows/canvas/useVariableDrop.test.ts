import { describe, it, expect } from "vitest";
import { variableDropText } from "./useVariableDrop";

describe("variableDropText (spec 037 §B1)", () => {
  it('mode "token" wraps the field for interpolable action fields', () => {
    expect(variableDropText("firstname", "token")).toBe("{{firstname}}");
  });

  it('mode "path" inserts the raw path — condition.field and mapping.source are NOT interpolated', () => {
    expect(variableDropText("amount", "path")).toBe("amount");
    expect(variableDropText("properties.amount", "path")).toBe("properties.amount");
  });

  it('mode "code" inserts a JS expression that reads the field off `record`', () => {
    expect(variableDropText("amount", "code")).toBe("record.amount");
    expect(variableDropText("properties.amount", "code")).toBe("record.properties.amount");
  });

  it('mode "code" falls back to bracket access when the name is not a valid JS identifier', () => {
    // `record.Nombre Cliente` sería un error de sintaxis y rompería "Probar".
    expect(variableDropText("Nombre Cliente", "code")).toBe('record["Nombre Cliente"]');
    expect(variableDropText("Teléfono", "code")).toBe('record["Teléfono"]');
    expect(variableDropText("2024", "code")).toBe('record["2024"]');
  });

  it('mode "code" brackets only the segments that need it', () => {
    expect(variableDropText("properties.Nombre Cliente", "code")).toBe(
      'record.properties["Nombre Cliente"]',
    );
  });

  it('mode "code" escapes quotes and backslashes inside the bracket form', () => {
    expect(variableDropText('a"b', "code")).toBe('record["a\\"b"]');
    expect(variableDropText("a\\b", "code")).toBe('record["a\\\\b"]');
  });

  it("keeps token/path untouched for names with spaces and accents", () => {
    expect(variableDropText("Nombre Cliente", "token")).toBe("{{Nombre Cliente}}");
    expect(variableDropText("Nombre Cliente", "path")).toBe("Nombre Cliente");
  });
});
