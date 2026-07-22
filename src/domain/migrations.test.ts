import { describe, expect, it } from "vitest";
import { migrateRecord, MIGRATIONS, type Migration, type MigrationKind } from "./migrations";

// Fictional registry used only by these tests: projects gain a `priority`
// default at v2 and a `tags` array at v3.
const REGISTRY: Partial<Record<MigrationKind, Migration[]>> = {
  projects: [
    { to: 2, up: (d) => ({ ...d, priority: d.priority ?? "medium" }) },
    { to: 3, up: (d) => ({ ...d, tags: d.tags ?? [] }) },
  ],
};

describe("migrateRecord", () => {
  it("migrates a v1 record up to v2 (fictional)", () => {
    const v1 = { id: "p1", schemaVersion: 1, name: "Demo" };
    const { value, migrated } = migrateRecord("projects", v1, 2, REGISTRY);
    expect(migrated).toBe(true);
    expect(value).toMatchObject({ schemaVersion: 2, priority: "medium" });
  });

  it("applies the full chain v1 -> v3 in order", () => {
    const v1 = { id: "p1", schemaVersion: 1, name: "Demo" };
    const { value } = migrateRecord("projects", v1, 3, REGISTRY);
    expect(value).toMatchObject({ schemaVersion: 3, priority: "medium", tags: [] });
  });

  it("does not touch a record already at the target version", () => {
    const v2 = { id: "p1", schemaVersion: 2, name: "Demo", priority: "high" };
    const { value, migrated } = migrateRecord("projects", v2, 2, REGISTRY);
    expect(migrated).toBe(false);
    expect(value).toBe(v2);
  });

  it("is a pass-through when no steps are registered but version is below target", () => {
    const v1 = { id: "x", schemaVersion: 1 };
    const { value, migrated } = migrateRecord("people", v1, 2, {});
    expect(migrated).toBe(true);
    expect(value.schemaVersion).toBe(2);
  });

  it("treats a missing schemaVersion as v1", () => {
    const legacy = { id: "p1", name: "Demo" };
    const { value, migrated } = migrateRecord("projects", legacy, 2, REGISTRY);
    expect(migrated).toBe(true);
    expect(value).toMatchObject({ schemaVersion: 2, priority: "medium" });
  });

  it("defaults the target to the current SCHEMA_VERSION (real registry: projects v1 -> v15, via v1-v7 field steps, a v10 step for spec 023's dedupeKey addition, then converging to v15 with no projects-specific change — spec 024/025/026/027/032 only touched `flows`)", () => {
    const v1 = { id: "p1", schemaVersion: 1, name: "Demo" };
    const { value, migrated } = migrateRecord("projects", v1);
    expect(migrated).toBe(true);
    expect(value.schemaVersion).toBe(15);
  });
});

describe("flows v11 -> v12 (spec 025: lastSample/lastSampleAt)", () => {
  it("converges a v11 doc to v12 without touching inner flows (identity step)", () => {
    const doc = {
      schemaVersion: 11,
      flows: [
        {
          id: "flow-a",
          name: "Demo",
          trigger: { type: "event", event: "task.added" },
          outputs: [{ type: "createNotification", severity: "info", message: "hi" }],
        },
      ],
    };

    const { value, migrated } = migrateRecord("flows", doc, 12, MIGRATIONS);
    expect(migrated).toBe(true);
    expect(value.schemaVersion).toBe(12);
    const flow = (value as { flows: Record<string, unknown>[] }).flows[0];
    // Sin-transform step: trigger and outputs preserved as-is.
    expect(flow.trigger).toEqual({ type: "event", event: "task.added" });
    expect(flow.outputs).toEqual([{ type: "createNotification", severity: "info", message: "hi" }]);
    // Optional new fields are not added — they stay `undefined` for the
    // Zod schema's `.optional()` to default them at parse time.
    expect(flow).not.toHaveProperty("lastSample");
    expect(flow).not.toHaveProperty("lastSampleAt");
  });

  it("is idempotent: a v12 doc is not touched", () => {
    const doc = {
      schemaVersion: 12,
      flows: [
        {
          id: "flow-b",
          name: "Demo v12",
          trigger: { type: "poll", provider: "hubspot",
            config: { connectionId: "c1", objectType: "contacts", fields: ["email"], filters: [], intervalMs: 300_000 } },
          outputs: [],
        },
      ],
    };

    const { migrated } = migrateRecord("flows", doc, 12, MIGRATIONS);
    expect(migrated).toBe(false);
  });
});

describe("flows v12 -> v13 (spec 026 §B1: createPerson.matchSource)", () => {
  it("converges a v12 doc to v13 without touching inner flows (identity step)", () => {
    const doc = {
      schemaVersion: 12,
      flows: [
        {
          id: "flow-a",
          name: "Demo",
          trigger: { type: "event", event: "task.added" },
          outputs: [
            { type: "createPerson", matchField: "email", ifNotFound: "create", data: { email: "{{email}}" } },
          ],
        },
      ],
    };

    const { value, migrated } = migrateRecord("flows", doc, 13, MIGRATIONS);
    expect(migrated).toBe(true);
    expect(value.schemaVersion).toBe(13);
    const flow = (value as { flows: Record<string, unknown>[] }).flows[0];
    expect(flow.outputs).toEqual([
      { type: "createPerson", matchField: "email", ifNotFound: "create", data: { email: "{{email}}" } },
    ]);
    expect((flow.outputs as Record<string, unknown>[])[0]).not.toHaveProperty("matchSource");
  });

  it("is idempotent: a v13 doc is not touched", () => {
    const doc = {
      schemaVersion: 13,
      flows: [{ id: "flow-b", name: "Demo v13", trigger: { type: "event", event: "task.added" }, outputs: [] }],
    };
    const { migrated } = migrateRecord("flows", doc, 13, MIGRATIONS);
    expect(migrated).toBe(false);
  });
});

describe("flows v13 -> v14 (spec 027: tags/conditionMode/onErrorPolicy/retry, identity step)", () => {
  it("converges a v13 doc to v14 without touching inner flows", () => {
    const doc = {
      schemaVersion: 13,
      flows: [
        {
          id: "flow-a",
          name: "Demo",
          trigger: { type: "event", event: "task.added" },
          logic: { conditions: [{ field: "to", op: "==", value: "done" }], mapping: [] },
          outputs: [{ type: "webhook", url: "https://example.com/hook", secret: "s" }],
        },
      ],
    };

    const { value, migrated } = migrateRecord("flows", doc, 14, MIGRATIONS);
    expect(migrated).toBe(true);
    expect(value.schemaVersion).toBe(14);
    const flow = (value as { flows: Record<string, unknown>[] }).flows[0];
    // Identity step: nothing added — the new fields stay absent and the
    // engine treats that as "no tags / continue / all / no retry".
    expect(flow).not.toHaveProperty("tags");
    expect(flow).not.toHaveProperty("onErrorPolicy");
    expect(flow.logic).not.toHaveProperty("conditionMode");
    expect((flow.outputs as Record<string, unknown>[])[0]).not.toHaveProperty("retry");
  });

  it("is idempotent: a v14 doc is not touched", () => {
    const doc = {
      schemaVersion: 14,
      flows: [{ id: "flow-b", name: "Demo v14", trigger: { type: "event", event: "task.added" }, outputs: [] }],
    };
    const { migrated } = migrateRecord("flows", doc, 14, MIGRATIONS);
    expect(migrated).toBe(false);
  });
});

describe("flows v14 -> v15 (spec 032: provider 'inbox' + webhook payloadShape, identity step)", () => {
  it("converges a v14 doc to v15 without touching inner flows", () => {
    const doc = {
      schemaVersion: 14,
      flows: [
        {
          id: "flow-a",
          name: "Demo",
          trigger: { type: "event", event: "task.statusChanged" },
          outputs: [{ type: "webhook", url: "https://example.com/hook", secret: "s" }],
        },
      ],
    };

    const { value, migrated } = migrateRecord("flows", doc, 15, MIGRATIONS);
    expect(migrated).toBe(true);
    expect(value.schemaVersion).toBe(15);
    const flow = (value as { flows: Record<string, unknown>[] }).flows[0];
    // Identity step: el webhook existente no gana `payloadShape` — el motor lo
    // trata como "bare" (body plano histórico, ahora firmado sobre el body real).
    expect((flow.outputs as Record<string, unknown>[])[0]).not.toHaveProperty("payloadShape");
  });

  it("is idempotent: a v15 doc is not touched", () => {
    const doc = {
      schemaVersion: 15,
      flows: [{ id: "flow-c", name: "Demo v15", trigger: { type: "event", event: "task.added" }, outputs: [] }],
    };
    const { migrated } = migrateRecord("flows", doc, 15, MIGRATIONS);
    expect(migrated).toBe(false);
  });
});

describe("flows v7 -> v8 (spec 020: connections instead of embedded credentials)", () => {
  it("strips a legacy embedded HubSpot poll trigger and clears connectionId for reconnection", () => {
    const doc = {
      schemaVersion: 1,
      flows: [
        {
          id: "flow-1",
          trigger: {
            type: "poll",
            provider: "hubspot",
            config: {
              proxyUrl: "https://script.google.com/macros/s/old/exec",
              encryptedToken: { ciphertext: "plaintext-token", iv: "", salt: "" },
              objectType: "deals",
              fields: ["dealname"],
              filters: [],
              intervalMs: 300_000,
            },
          },
          outputs: [],
        },
      ],
    };

    const { value, migrated } = migrateRecord("flows", doc, 8, MIGRATIONS);
    expect(migrated).toBe(true);
    const flow = (value as { flows: Record<string, unknown>[] }).flows[0];
    const trigger = flow.trigger as { config: Record<string, unknown> };
    expect(trigger.config).not.toHaveProperty("proxyUrl");
    expect(trigger.config).not.toHaveProperty("encryptedToken");
    expect(trigger.config.connectionId).toBe("");
    expect(trigger.config.objectType).toBe("deals");
    expect(flow.schemaVersion).toBe(8);
  });

  it("strips a legacy embedded email output's proxyUrl and clears connectionId", () => {
    const doc = {
      schemaVersion: 1,
      flows: [
        {
          id: "flow-1",
          trigger: { type: "event", event: "task.added" },
          outputs: [
            { type: "email", proxyUrl: "https://old/exec", to: "a@b.com", subject: "s", body: "b" },
          ],
        },
      ],
    };

    const { value } = migrateRecord("flows", doc, 8, MIGRATIONS);
    const flow = (value as { flows: Record<string, unknown>[] }).flows[0];
    const output = (flow.outputs as Record<string, unknown>[])[0];
    expect(output).not.toHaveProperty("proxyUrl");
    expect(output.connectionId).toBe("");
  });

  it("does not touch event-trigger flows with no legacy shape", () => {
    const doc = {
      schemaVersion: 1,
      flows: [
        {
          id: "flow-1",
          trigger: { type: "event", event: "task.added" },
          outputs: [{ type: "createNotification", severity: "info", message: "hi" }],
        },
      ],
    };

    const { value } = migrateRecord("flows", doc, 8, MIGRATIONS);
    const flow = (value as { flows: Record<string, unknown>[] }).flows[0];
    expect(flow.trigger).toEqual({ type: "event", event: "task.added" });
    expect(flow.outputs).toEqual([{ type: "createNotification", severity: "info", message: "hi" }]);
  });

  it("is idempotent: re-running on already-migrated data never wipes a real connectionId", () => {
    const alreadyMigrated = {
      schemaVersion: 1, // simulates the doc-level version having drifted below target again
      flows: [
        {
          id: "flow-1",
          trigger: {
            type: "poll",
            provider: "hubspot",
            config: {
              connectionId: "real-connection-id",
              objectType: "deals",
              fields: [],
              filters: [],
              intervalMs: 300_000,
            },
          },
          outputs: [],
        },
      ],
    };

    const { value } = migrateRecord("flows", alreadyMigrated, 8, MIGRATIONS);
    const flow = (value as { flows: Record<string, unknown>[] }).flows[0];
    const trigger = flow.trigger as { config: Record<string, unknown> };
    expect(trigger.config.connectionId).toBe("real-connection-id");
  });
});
