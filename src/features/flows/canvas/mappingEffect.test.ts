import { describe, it, expect } from "vitest";
import { mappingEffect } from "./mappingEffect";

const SAMPLE_FIELDS = ["email", "firstname", "lastname", "company"];

describe("mappingEffect (spec 037 §C1)", () => {
  it("keeps every field when there is no mapping row", () => {
    const r = mappingEffect([], SAMPLE_FIELDS, ["firstname"]);
    expect(r.kept).toEqual(SAMPLE_FIELDS);
    expect(r.dropped).toEqual([]);
    expect(r.brokenTokens).toEqual([]);
  });

  it("drops every sample field that is not a mapping target (applyMapping replaces the record)", () => {
    const r = mappingEffect([{ source: "email", target: "email" }], SAMPLE_FIELDS);
    expect(r.kept).toEqual(["email"]);
    expect(r.dropped).toEqual(["firstname", "lastname", "company"]);
  });

  it("reports the action tokens that would stop resolving because their field was dropped", () => {
    const r = mappingEffect(
      [{ source: "email", target: "email" }],
      SAMPLE_FIELDS,
      ["firstname", "email"],
    );
    expect(r.brokenTokens).toEqual(["firstname"]);
  });

  it("does not blame the mapping for tokens that never resolved anyway", () => {
    const r = mappingEffect(
      [{ source: "email", target: "email" }],
      SAMPLE_FIELDS,
      ["noExisteEnLaMuestra"],
    );
    expect(r.brokenTokens).toEqual([]);
  });

  it("uses the root segment of a dotted token to decide whether it breaks", () => {
    const r = mappingEffect(
      [{ source: "properties.amount", target: "amount" }],
      ["properties", "email"],
      ["properties.dealname", "amount"],
    );
    expect(r.dropped).toEqual(["properties", "email"]);
    expect(r.brokenTokens).toEqual(["properties.dealname"]);
  });

  it("counts a target as kept even when the sample does not have that name", () => {
    const r = mappingEffect([{ source: "firstname", target: "name" }], SAMPLE_FIELDS);
    expect(r.kept).toEqual(["name"]);
    expect(r.dropped).toEqual(SAMPLE_FIELDS);
  });

  it("ignores rows with an empty target (half-written row) and dedupes", () => {
    const r = mappingEffect(
      [
        { source: "email", target: "email" },
        { source: "firstname", target: "" },
        { source: "lastname", target: "email" },
      ],
      SAMPLE_FIELDS,
    );
    expect(r.kept).toEqual(["email"]);
  });

  it("dedupes broken tokens repeated across actions", () => {
    const r = mappingEffect(
      [{ source: "email", target: "email" }],
      SAMPLE_FIELDS,
      ["firstname", "firstname"],
    );
    expect(r.brokenTokens).toEqual(["firstname"]);
  });
});
