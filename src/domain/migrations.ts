import { SCHEMA_VERSION } from "./schemas/common";

/** Every persisted record kind that carries a top-level `schemaVersion`. */
export type MigrationKind =
  | "products"
  | "projects"
  | "project-types"
  | "checklist-templates"
  | "process-templates"
  | "automations"
  | "quarters"
  | "people"
  | "notifications"
  | "activity"
  | "workspace";

/** A single forward migration: brings a record from version `to - 1` to `to`. */
export interface Migration {
  to: number;
  up: (data: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Registry of forward migrations per kind. When a schema changes, bump
 * `SCHEMA_VERSION` and add the `{ to, up }` steps here.
 */
export const MIGRATIONS: Partial<Record<MigrationKind, Migration[]>> = {
  // v1 -> v2: added Sprints (spec 008). All new fields (`Project.sprints`,
  // `Project.quarterId`, `Task.sprintId`) are optional/defaulted in the Zod
  // schema, so existing v1 records need no data transformation — this step
  // exists to document the bump and trigger the pre-migration snapshot.
  projects: [
    { to: 2, up: (data) => data },
    // v2 -> v3: added Task.summary (spec 013). New field is optional/defaulted
    // in the Zod schema, so existing v2 records need no data transformation.
    { to: 3, up: (data) => data },
    // v3 -> v4: added Task.comments (spec 014). New field is optional/defaulted
    // in the Zod schema, so existing v3 records need no data transformation.
    { to: 4, up: (data) => data },
    // v4 -> v5: added Task.archived (spec 015). New field is optional/defaulted
    // in the Zod schema, so existing v4 records need no data transformation.
    { to: 5, up: (data) => data },
    // v5 -> v6: added Task.estimate and Task.subtasks (spec 017). New fields are
    // optional/defaulted in the Zod schema, so existing v5 records need no data transformation.
    { to: 6, up: (data) => data },
    // v6 -> v7: added Project.wipLimits (spec 017). New field is optional/defaulted
    // in the Zod schema, so existing v6 records need no data transformation.
    { to: 7, up: (data) => data },
  ],
};

export interface MigrationResult<T> {
  value: T;
  migrated: boolean;
}

/**
 * Bring a single record up to `target` (default: current `SCHEMA_VERSION`) by
 * applying its registered forward migrations in order. Pure and deterministic.
 * `migrated` is true when the record was below `target` (caller should snapshot
 * before persisting — see the adapters' backup-before-migrate guard).
 */
export function migrateRecord<T extends Record<string, unknown>>(
  kind: MigrationKind,
  data: T,
  target: number = SCHEMA_VERSION,
  registry: Partial<Record<MigrationKind, Migration[]>> = MIGRATIONS,
): MigrationResult<T> {
  const from = typeof data.schemaVersion === "number" ? data.schemaVersion : 1;
  if (from >= target) return { value: data, migrated: false };

  const steps = (registry[kind] ?? [])
    .filter((m) => m.to > from && m.to <= target)
    .sort((a, b) => a.to - b.to);

  let value: Record<string, unknown> = data;
  for (const step of steps) value = { ...step.up(value), schemaVersion: step.to };

  // Converge to the target version even if no explicit step was registered.
  if (value.schemaVersion !== target) value = { ...value, schemaVersion: target };
  return { value: value as T, migrated: true };
}
