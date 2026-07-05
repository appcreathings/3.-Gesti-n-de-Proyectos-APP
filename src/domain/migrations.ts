import { SCHEMA_VERSION } from "./schemas/common";

/** Every persisted record kind that carries a top-level `schemaVersion`. */
export type MigrationKind =
  | "products"
  | "projects"
  | "project-types"
  | "checklist-templates"
  | "process-templates"
  | "automations"
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
 * Registry of forward migrations per kind. Empty today — all data is at
 * `SCHEMA_VERSION` (1) — so `migrateRecord` is a pass-through. When a schema
 * changes, bump `SCHEMA_VERSION` and add the `{ to, up }` steps here.
 */
export const MIGRATIONS: Partial<Record<MigrationKind, Migration[]>> = {};

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
