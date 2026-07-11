import { describe, it, expect } from "vitest";
import {
  deriveAvailableVariables,
  allInternalTargetFields,
  suggestFieldMappingPairs,
  INTERNAL_TARGET_FIELDS,
} from "./variables";
import type { Trigger } from "@/domain/schemas/flow";

const eventTrigger: Trigger = { type: "event", event: "task.statusChanged" };
const pollTrigger: Trigger = {
  type: "poll",
  provider: "hubspot",
  config: { connectionId: "conn-1", objectType: "contacts", fields: [], filters: [], intervalMs: 300_000 },
};

describe("deriveAvailableVariables", () => {
  it("unions keys across all sample records, deduping and keeping the first example value", () => {
    const sample = [
      { email: "a@b.com", firstname: "Ana" },
      { email: "c@d.com", firstname: "Beto", company: "Acme" },
    ];
    const result = deriveAvailableVariables(eventTrigger, sample);

    expect(result.map((v) => v.field).sort()).toEqual(["company", "email", "firstname"]);
    const email = result.find((v) => v.field === "email");
    expect(email?.example).toBe("a@b.com");
  });

  it("falls back to known event fields when there is no sample and the trigger is an event", () => {
    const result = deriveAvailableVariables(eventTrigger);
    const fields = result.map((v) => v.field);
    expect(fields).toContain("projectId");
    expect(fields).toContain("taskId");
    expect(fields).toContain("from");
    expect(fields).toContain("to");
  });

  it("returns an empty list for a poll trigger with no sample (nothing to guess from)", () => {
    const result = deriveAvailableVariables(pollTrigger);
    expect(result).toEqual([]);
  });

  it("prefers the real sample over the event fallback when both could apply", () => {
    const result = deriveAvailableVariables(eventTrigger, [{ dealname: "Acme deal" }]);
    expect(result.map((v) => v.field)).toEqual(["dealname"]);
  });
});

describe("allInternalTargetFields / INTERNAL_TARGET_FIELDS", () => {
  it("covers task, project and person entities", () => {
    expect(INTERNAL_TARGET_FIELDS.task.map((f) => f.field)).toContain("title");
    expect(INTERNAL_TARGET_FIELDS.project.map((f) => f.field)).toContain("name");
    expect(INTERNAL_TARGET_FIELDS.person.map((f) => f.field)).toContain("email");
  });

  it("deduplicates fields shared across entities (e.g. status)", () => {
    const all = allInternalTargetFields();
    const statusCount = all.filter((f) => f.field === "status").length;
    expect(statusCount).toBe(1);
  });
});

describe("suggestFieldMappingPairs", () => {
  it("matches identical names directly", () => {
    const pairs = suggestFieldMappingPairs([{ field: "email" }, { field: "status" }]);
    expect(pairs).toContainEqual({ source: "email", target: "email" });
    expect(pairs).toContainEqual({ source: "status", target: "status" });
  });

  it("resolves common HubSpot aliases (firstname/dealname) to internal fields", () => {
    const pairs = suggestFieldMappingPairs([{ field: "firstname" }, { field: "dealname" }]);
    expect(pairs).toContainEqual({ source: "firstname", target: "name" });
    expect(pairs).toContainEqual({ source: "dealname", target: "name" });
  });

  it("ignores case and separators when matching", () => {
    const pairs = suggestFieldMappingPairs([{ field: "Due_Date" }]);
    expect(pairs).toContainEqual({ source: "Due_Date", target: "dueDate" });
  });

  it("skips variables with no plausible internal match", () => {
    const pairs = suggestFieldMappingPairs([{ field: "some_random_hubspot_property" }]);
    expect(pairs).toEqual([]);
  });
});
