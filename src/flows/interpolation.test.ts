import { describe, it, expect } from "vitest";
import {
  parseTokens,
  resolvePath,
  interpolateString,
  interpolateObject,
  coerceDateString,
} from "./interpolation";

describe("interpolation", () => {
  describe("parseTokens", () => {
    it("parses a plain token", () => {
      expect(parseTokens("Hola {{name}}")).toEqual([{ raw: "{{name}}", path: "name", mods: [] }]);
    });

    it("parses a token with spaces in the field name (Sheets column)", () => {
      expect(parseTokens("{{Nombre Cliente}}")).toEqual([
        { raw: "{{Nombre Cliente}}", path: "Nombre Cliente", mods: [] },
      ]);
    });

    it("parses a token with accents/ñ", () => {
      expect(parseTokens("{{Teléfono}}")).toEqual([{ raw: "{{Teléfono}}", path: "Teléfono", mods: [] }]);
    });

    it("parses a token with a default value", () => {
      expect(parseTokens("{{amount||0}}")).toEqual([
        { raw: "{{amount||0}}", path: "amount", mods: [], defaultValue: "0" },
      ]);
    });

    it("trims spaces around braces and around the default separator", () => {
      expect(parseTokens("{{ amount || 0 }}")).toEqual([
        { raw: "{{ amount || 0 }}", path: "amount", mods: [], defaultValue: "0" },
      ]);
    });

    it("parses format mods, resolving the default separator first (spec 027 §G)", () => {
      expect(parseTokens("{{amount|number:2||0}}")).toEqual([
        { raw: "{{amount|number:2||0}}", path: "amount", mods: ["number:2"], defaultValue: "0" },
      ]);
      expect(parseTokens("{{name|upper|trim}}")).toEqual([
        { raw: "{{name|upper|trim}}", path: "name", mods: ["upper", "trim"] },
      ]);
    });
  });

  describe("resolvePath", () => {
    it("resolves a literal key with spaces (Sheets column)", () => {
      expect(resolvePath({ "Nombre Cliente": "ACME" }, "Nombre Cliente")).toBe("ACME");
    });

    it("resolves a nested path by dots when no literal key matches", () => {
      expect(resolvePath({ properties: { amount: "5000" } }, "properties.amount")).toBe("5000");
    });

    it("prefers a literal key over dot-path traversal when both could match", () => {
      // A column literally named "a.b" must win over trying to traverse data.a.b.
      expect(resolvePath({ "a.b": "literal", a: { b: "nested" } }, "a.b")).toBe("literal");
    });

    it("returns undefined for a path that resolves nowhere", () => {
      expect(resolvePath({ email: "x@y.com" }, "missing")).toBeUndefined();
    });
  });

  describe("interpolateString", () => {
    it("interpolates a field with spaces/accents (Sheets column)", () => {
      const result = interpolateString("Cliente: {{Nombre Cliente}} — {{Teléfono}}", {
        "Nombre Cliente": "ACME Corp",
        Teléfono: "555-1234",
      });
      expect(result.value).toBe("Cliente: ACME Corp — 555-1234");
      expect(result.unresolved).toEqual([]);
    });

    it("interpolates a nested HubSpot-style path", () => {
      const result = interpolateString("{{properties.amount}}", { properties: { amount: 5000 } });
      expect(result.value).toBe("5000");
      expect(result.unresolved).toEqual([]);
    });

    it("uses the default value when the token is unresolved", () => {
      const result = interpolateString("{{missing||sin dato}}", {});
      expect(result.value).toBe("sin dato");
      expect(result.unresolved).toEqual([]);
    });

    it("replaces an unresolved token with an empty string and reports it, never leaves it literal", () => {
      const result = interpolateString("Hola {{namae}}", { name: "Ana" });
      expect(result.value).toBe("Hola ");
      expect(result.unresolved).toEqual(["namae"]);
    });

    it("resolves legacy \\w-only tokens identically to before", () => {
      const result = interpolateString("{{dealname}} - seguimiento", { dealname: "Deal ACME" });
      expect(result.value).toBe("Deal ACME - seguimiento");
      expect(result.unresolved).toEqual([]);
    });
  });

  describe("format mods (spec 027 §G)", () => {
    it("applies upper/lower/trim", () => {
      expect(interpolateString("{{name|upper}}", { name: "acme" }).value).toBe("ACME");
      expect(interpolateString("{{name|lower}}", { name: "ACME" }).value).toBe("acme");
      expect(interpolateString("{{name|trim}}", { name: "  acme  " }).value).toBe("acme");
    });

    it("chains mods in order", () => {
      const r = interpolateString("{{name|trim|upper}}", { name: "  acme  " });
      expect(r.value).toBe("ACME");
      expect(r.warnings).toEqual([]);
    });

    it("formats epoch-ms and ISO dates as YYYY-MM-DD with |date", () => {
      // 2026-07-27 en epoch-ms (formato closedate de HubSpot).
      expect(interpolateString("{{closedate|date}}", { closedate: "1785110400000" }).value).toBe(
        "2026-07-27"
      );
      expect(
        interpolateString("{{closedate|date}}", { closedate: "2026-07-27T10:00:00.000Z" }).value
      ).toBe("2026-07-27");
    });

    it("warns (without destroying the value) when |date cannot parse", () => {
      const r = interpolateString("{{x|date}}", { x: "no es fecha" });
      expect(r.value).toBe("no es fecha");
      expect(r.warnings).toHaveLength(1);
    });

    it("formats numbers with N decimals in es locale with |number:N", () => {
      const r = interpolateString("{{amount|number:2}}", { amount: "5000" });
      // Formato es: separador de miles "." y decimales "," → "5.000,00".
      expect(r.value).toBe("5.000,00");
      expect(r.warnings).toEqual([]);
    });

    it("warns on |number over a non-numeric value, leaving it untouched", () => {
      const r = interpolateString("{{x|number:2}}", { x: "abc" });
      expect(r.value).toBe("abc");
      expect(r.warnings).toHaveLength(1);
    });

    it("ignores an unknown mod with a warning, never breaking the value", () => {
      const r = interpolateString("{{x|nope}}", { x: "valor" });
      expect(r.value).toBe("valor");
      expect(r.warnings).toEqual(['Modificador desconocido: |nope (ignorado)']);
      expect(r.unresolved).toEqual([]);
    });

    it("combines mods with a default: mods apply to the resolved value, the default stays literal", () => {
      expect(interpolateString("{{name|upper||sin nombre}}", { name: "acme" }).value).toBe("ACME");
      const fallback = interpolateString("{{name|upper||sin nombre}}", {});
      expect(fallback.value).toBe("sin nombre");
      expect(fallback.unresolved).toEqual([]);
    });

    it("keeps tokens without mods byte-identical to the previous behavior (retrocompat)", () => {
      const r = interpolateString("{{dealname}} - {{amount||0}}", { dealname: "Deal ACME" });
      expect(r.value).toBe("Deal ACME - 0");
      expect(r.unresolved).toEqual([]);
      expect(r.warnings).toEqual([]);
    });
  });

  describe("coerceDateString", () => {
    it("coerces 13-digit epoch-ms", () => {
      expect(coerceDateString("1785110400000").value).toBe("2026-07-27");
    });

    it("coerces ISO datetimes", () => {
      expect(coerceDateString("2026-07-27T10:00:00.000Z").value).toBe("2026-07-27");
    });

    it("returns a warning for unparseable input", () => {
      const r = coerceDateString("mañana");
      expect(r.value).toBeUndefined();
      expect(r.warning).toBeTruthy();
    });
  });

  describe("interpolateObject", () => {
    it("interpolates string values recursively, including nested objects", () => {
      const result = interpolateObject(
        { cliente: "{{name}}", meta: { monto: "{{amount}}" } },
        { name: "ACME", amount: "5000" }
      );
      expect(result.value).toEqual({ cliente: "ACME", meta: { monto: "5000" } });
      expect(result.unresolved).toEqual([]);
    });

    it("preserves arrays untouched instead of converting them to indexed objects", () => {
      const result = interpolateObject({ tags: ["a", "b"] }, {});
      expect(result.value).toEqual({ tags: ["a", "b"] });
      expect(Array.isArray(result.value.tags)).toBe(true);
    });

    it("collects unresolved tokens across nested fields", () => {
      const result = interpolateObject({ a: "{{x}}", b: { c: "{{y}}" } }, {});
      expect(result.unresolved.sort()).toEqual(["x", "y"]);
    });
  });
});
