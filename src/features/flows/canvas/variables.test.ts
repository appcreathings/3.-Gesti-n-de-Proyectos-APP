import { describe, it, expect } from "vitest";
import {
  deriveAvailableVariables,
  allInternalTargetFields,
  suggestFieldMappingPairs,
  INTERNAL_TARGET_FIELDS,
  validateVariables,
  nodeUsedVariables,
  HUBSPOT_DEFAULT_FIELDS_FOR_OBJECT_TYPE,
} from "./variables";
import type { Trigger } from "@/domain/schemas/flow";
import type { FlowNodeData } from "@/flows/graph";

const eventTrigger: Trigger = { type: "event", event: "task.statusChanged" };
const pollTrigger: Trigger = {
  type: "poll",
  provider: "hubspot",
  config: { connectionId: "conn-1", objectType: "contacts", fields: [], filters: [], intervalMs: 300_000 },
};
const sheetsTrigger: Trigger = {
  type: "poll",
  provider: "google-sheets",
  config: { connectionId: "conn-2", fields: [], filters: [], intervalMs: 300_000 },
};
const hubspotFieldsTrigger: Trigger = {
  type: "poll",
  provider: "hubspot",
  config: { connectionId: "conn-3", objectType: "deals", fields: ["dealname", "amount"], filters: [], intervalMs: 300_000 },
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

  it("returns an empty list for a google-sheets poll with no sample and no config.fields (nothing known)", () => {
    const result = deriveAvailableVariables(sheetsTrigger);
    expect(result).toEqual([]);
  });

  it("falls back to config.fields for a hubspot poll when there is no sample (spec 025 §B)", () => {
    const result = deriveAvailableVariables(hubspotFieldsTrigger);
    expect(result.map((v) => v.field)).toEqual(["dealname", "amount"]);
    // Sin ejemplo conocido — el usuario no ha probado la conexión todavía.
    expect(result.every((v) => v.example === undefined)).toBe(true);
  });

  it("falls back to HUBSPOT_DEFAULT_FIELDS_FOR_OBJECT_TYPE when config.fields is empty (spec 025 §B)", () => {
    const result = deriveAvailableVariables(pollTrigger);
    expect(result.map((v) => v.field)).toEqual(HUBSPOT_DEFAULT_FIELDS_FOR_OBJECT_TYPE.contacts);
  });

  it("prefers the real sample over the event fallback when both could apply", () => {
    const result = deriveAvailableVariables(eventTrigger, [{ dealname: "Acme deal" }]);
    expect(result.map((v) => v.field)).toEqual(["dealname"]);
  });
});

describe("validateVariables (spec 025 §B)", () => {
  it("returns valid when the template has no tokens", () => {
    const r = validateVariables("Hello world", [{ field: "name" }]);
    expect(r.valid).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it("returns valid when all tokens are present in available (top-level match)", () => {
    const r = validateVariables("Hola {{name}}, tu email es {{email}}", [
      { field: "name" },
      { field: "email" },
    ]);
    expect(r.valid).toBe(true);
  });

  it("returns missing for a token not in available", () => {
    const r = validateVariables("Hola {{namae}}", [{ field: "name" }]);
    expect(r.valid).toBe(false);
    expect(r.missing).toEqual(["namae"]);
  });

  it("dedupes missing tokens and collects all of them", () => {
    const r = validateVariables("Hola {{namae}} {{namae}} y {{wrong}}", [
      { field: "name" },
    ]);
    expect(r.valid).toBe(false);
    expect(r.missing.sort()).toEqual(["namae", "wrong"]);
  });

  it("matches a nested path token when the full path is available (e.g. {{a.b}} matches 'a.b')", () => {
    const r = validateVariables("{{record.email}}", [{ field: "record.email" }]);
    expect(r.valid).toBe(true);
  });

  it("does not match a nested path token against a sibling top ({{record.email}} vs 'email')", () => {
    const r = validateVariables("{{record.email}}", [{ field: "email" }]);
    expect(r.valid).toBe(false);
    expect(r.missing).toEqual(["record.email"]);
  });

  it("does not match a top-level token against a nested available ({{email}} vs 'email.x') — runtime would not resolve it", () => {
    // `getNestedValue({email: {x: 1}}, "email")` returns the object, but the
    // common case is the user expecting a scalar — keep the strict match.
    const r = validateVariables("{{email}}", [{ field: "email.x" }]);
    expect(r.valid).toBe(false);
  });

  // Spec 026 §A5: el tokenizador previo era `\w`-only y nunca detectaba
  // columnas de Sheets con espacios/acentos como huérfanas — doble fallo
  // silencioso junto con el motor (que tampoco las interpolaba).
  it("detects a token with spaces (Sheets column) as missing when it's not in available", () => {
    const r = validateVariables("{{Nombre Cliente}}", [{ field: "email" }]);
    expect(r.valid).toBe(false);
    expect(r.missing).toEqual(["Nombre Cliente"]);
  });

  it("recognizes a token with spaces/accents as valid once it's in available", () => {
    const r = validateVariables("{{Nombre Cliente}} — {{Teléfono}}", [
      { field: "Nombre Cliente" },
      { field: "Teléfono" },
    ]);
    expect(r.valid).toBe(true);
  });

  it("returns valid (no warn) when available is empty — avoid false positives when there is no information to validate against", () => {
    const r = validateVariables("Hola {{namae}}", []);
    expect(r.valid).toBe(true);
    expect(r.missing).toEqual([]);
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

describe("nodeUsedVariables (spec 036 §C5)", () => {
  it("returns the condition field (raw path, not a token)", () => {
    const data: FlowNodeData = { kind: "condition", condition: { field: "amount", op: ">", value: 1000 } };
    expect(nodeUsedVariables(data)).toEqual(["amount"]);
  });

  it("returns nothing for an unconfigured condition (empty field)", () => {
    const data: FlowNodeData = { kind: "condition", condition: { field: "", op: "==", value: "" } };
    expect(nodeUsedVariables(data)).toEqual([]);
  });

  it("returns nothing for a trigger node (it is the source of variables)", () => {
    const data: FlowNodeData = { kind: "trigger", trigger: { type: "event", event: "task.added" } };
    expect(nodeUsedVariables(data)).toEqual([]);
  });

  it("collects transform tokens from both the code and the mapping sources", () => {
    const data: FlowNodeData = {
      kind: "transform",
      mapping: [
        { source: "email", target: "email" },
        { source: "properties.amount", target: "estimate" },
        { source: "", target: "ignored" },
      ],
      transformCode: "record.full = `${record.firstname} {{lastname}}`; return record;",
    };
    const used = nodeUsedVariables(data);
    // Token from the code + non-empty mapping sources.
    expect(used).toContain("lastname");
    expect(used).toContain("email");
    expect(used).toContain("properties.amount");
    // Empty mapping source is skipped.
    expect(used).not.toContain("");
  });

  it("returns nothing for a transform with no code and no mapping", () => {
    const data: FlowNodeData = { kind: "transform", mapping: [] };
    expect(nodeUsedVariables(data)).toEqual([]);
  });

  it("collects tokens from interpolable action strings (title, message)", () => {
    const data: FlowNodeData = {
      kind: "action",
      output: { type: "createTask", title: "Deal {{dealname}} — {{amount}}", projectRef: "explicit" },
    };
    const used = nodeUsedVariables(data);
    expect(used.sort()).toEqual(["amount", "dealname"]);
  });

  it("walks nested action strings (createPerson.data record and arrays)", () => {
    const data: FlowNodeData = {
      kind: "action",
      output: {
        type: "createPerson",
        matchField: "email",
        ifNotFound: "create",
        data: { email: "{{email}}", name: "{{firstname}} {{lastname}}" },
      },
    };
    const used = nodeUsedVariables(data);
    expect(used.sort()).toEqual(["email", "firstname", "lastname"]);
  });

  it("dedupes a token used in more than one field", () => {
    const data: FlowNodeData = {
      kind: "action",
      output: { type: "email", connectionId: "c", to: "{{email}}", subject: "Hi {{name}}", body: "{{name}} — {{email}}" },
    };
    const used = nodeUsedVariables(data);
    expect(used.sort()).toEqual(["email", "name"]);
  });

  it("returns nothing when action strings have no tokens", () => {
    const data: FlowNodeData = {
      kind: "action",
      output: { type: "createNotification", severity: "info", message: "Static message" },
    };
    expect(nodeUsedVariables(data)).toEqual([]);
  });
});
