import { describe, it, expect } from "vitest";
import { mapPollFilterToHubSpot, buildHubSpotSearchBody, mergeProperties } from "./hubspot-search";
import type { PollFilter } from "@/domain/schemas/flow";

describe("mapPollFilterToHubSpot", () => {
  const cases: [PollFilter["op"], unknown, object][] = [
    ["==", "won", { operator: "EQ", value: "won" }],
    ["!=", "won", { operator: "NEQ", value: "won" }],
    [">", 1000, { operator: "GT", value: "1000" }],
    [">=", 1000, { operator: "GTE", value: "1000" }],
    ["<", 1000, { operator: "LT", value: "1000" }],
    ["<=", 1000, { operator: "LTE", value: "1000" }],
  ];

  it.each(cases)("maps op %s to the right HubSpot operator/value", (op, value, expected) => {
    const result = mapPollFilterToHubSpot({ field: "amount", op, value });
    expect(result).toMatchObject(expected);
    expect(result?.propertyName).toBe("amount");
  });

  it("maps 'contains' to CONTAINS_TOKEN with wildcards", () => {
    const result = mapPollFilterToHubSpot({ field: "dealname", op: "contains", value: "acme" });
    expect(result).toEqual({ propertyName: "dealname", operator: "CONTAINS_TOKEN", value: "*acme*" });
  });

  it("maps 'in' with a comma-separated string value into a values[] array", () => {
    const result = mapPollFilterToHubSpot({ field: "dealstage", op: "in", value: "won, lost , negotiation" });
    expect(result).toEqual({
      propertyName: "dealstage",
      operator: "IN",
      values: ["won", "lost", "negotiation"],
    });
  });

  it("maps 'in' with an already-array value", () => {
    const result = mapPollFilterToHubSpot({ field: "dealstage", op: "in", value: ["won", "lost"] });
    expect(result).toEqual({ propertyName: "dealstage", operator: "IN", values: ["won", "lost"] });
  });

  it("drops an 'in' filter with an empty value instead of sending a broken filter", () => {
    const result = mapPollFilterToHubSpot({ field: "dealstage", op: "in", value: "" });
    expect(result).toBeNull();
  });
});

describe("buildHubSpotSearchBody", () => {
  it("puts user filters and the incremental-sync filter in the same filterGroup (AND)", () => {
    const body = buildHubSpotSearchBody({
      properties: ["dealname", "amount"],
      filters: [{ field: "amount", op: ">", value: 1000 }],
      lastSyncAt: "2026-01-01T00:00:00Z",
    });

    expect(body.filterGroups).toHaveLength(1);
    expect(body.filterGroups[0].filters).toEqual([
      { propertyName: "amount", operator: "GT", value: "1000" },
      { propertyName: "lastmodifieddate", operator: "GT", value: "2026-01-01T00:00:00Z" },
    ]);
  });

  it("has no filterGroups when there are no filters and no lastSyncAt", () => {
    const body = buildHubSpotSearchBody({ properties: ["dealname"], filters: [] });
    expect(body.filterGroups).toEqual([]);
  });

  it("sorts ascending by lastmodifieddate so the incremental watermark always advances forward", () => {
    const body = buildHubSpotSearchBody({ properties: [], filters: [] });
    expect(body.sorts).toEqual([{ propertyName: "lastmodifieddate", direction: "ASCENDING" }]);
  });

  it("silently skips an unmappable operator without breaking the whole poll", () => {
    // "in" IS mappable; use a filter with an op the schema wouldn't normally
    // allow to simulate a future/unsupported operator reaching this code path.
    const body = buildHubSpotSearchBody({
      properties: [],
      filters: [{ field: "x", op: "unsupported-op" as PollFilter["op"], value: "y" }],
    });
    expect(body.filterGroups).toEqual([]);
  });

  it("includes `after` only when provided (cursor pagination)", () => {
    expect(buildHubSpotSearchBody({ properties: [], filters: [] }).after).toBeUndefined();
    expect(buildHubSpotSearchBody({ properties: [], filters: [], after: "cursor-1" }).after).toBe("cursor-1");
  });
});

describe("mergeProperties", () => {
  it("unions user fields with the mandatory floor, deduplicated", () => {
    const result = mergeProperties(["email", "company"], ["email", "lastmodifieddate", "createdate"]);
    expect(new Set(result)).toEqual(new Set(["email", "company", "lastmodifieddate", "createdate"]));
    expect(result).toHaveLength(4);
  });

  it("returns just the floor when the user selected no fields", () => {
    expect(mergeProperties([], ["a", "b"])).toEqual(["a", "b"]);
  });
});
