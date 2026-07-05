import { describe, expect, it } from "vitest";
import { migrateRecord, type Migration, type MigrationKind } from "./migrations";

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

  it("defaults the target to the current SCHEMA_VERSION (no-op at v1)", () => {
    const v1 = { id: "p1", schemaVersion: 1, name: "Demo" };
    const { migrated } = migrateRecord("projects", v1);
    expect(migrated).toBe(false);
  });
});
