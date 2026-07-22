import { describe, it, expect } from "vitest";
import { sampleFields } from "./useSampleFields";

describe("sampleFields (spec 036 §C1)", () => {
  it("returns an empty list for no sample", () => {
    expect(sampleFields(undefined)).toEqual([]);
    expect(sampleFields([])).toEqual([]);
  });

  it("unions keys across records and counts presence as N/M", () => {
    const fields = sampleFields([
      { email: "a@b.com", firstname: "Ana" },
      { email: "c@d.com", firstname: "Beto", company: "Acme" },
    ]);
    const byPath = Object.fromEntries(fields.map((f) => [f.path, f]));
    expect(byPath.email.presence).toBe("2/2");
    expect(byPath.company.presence).toBe("1/2");
  });

  it("sorts fields alphabetically by path", () => {
    const fields = sampleFields([{ zeta: 1, alpha: 2, mid: 3 }]);
    expect(fields.map((f) => f.path)).toEqual(["alpha", "mid", "zeta"]);
  });

  it("infers types and keeps the first example value", () => {
    const fields = sampleFields([{ n: 42, s: "hi", b: true, arr: [1, 2], obj: { x: 1 } }]);
    const byPath = Object.fromEntries(fields.map((f) => [f.path, f]));
    expect(byPath.n.type).toBe("number");
    expect(byPath.s.type).toBe("string");
    expect(byPath.b.type).toBe("boolean");
    expect(byPath.arr.type).toBe("array");
    expect(byPath.obj.type).toBe("object");
    expect(byPath.s.example).toBe("hi");
  });

  it("shows (vacío) for null/undefined and truncates long examples", () => {
    const long = "x".repeat(100);
    const fields = sampleFields([{ empty: null, big: long }]);
    const byPath = Object.fromEntries(fields.map((f) => [f.path, f]));
    expect(byPath.empty.example).toBe("(vacío)");
    expect(byPath.empty.type).toBe("null");
    expect(byPath.big.example).toBe(`${long.slice(0, 57)}...`);
    expect(byPath.big.example.length).toBe(60);
  });
});
