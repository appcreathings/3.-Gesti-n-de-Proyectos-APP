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
  | "flows"
  | "flow-runs"
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
    // v7 -> v10: added Project.dedupeKey and Task.dedupeKey (spec 023 §E). New
    // field is optional/defaulted in the Zod schema, so existing records need
    // no data transformation. No project-level change happened at v8/v9
    // (those bumps came from `flows`-only changes in spec 020/023 §D) — the
    // convergence fallback in `migrateRecord` carries a v7 project straight to
    // v10 via this single step.
    { to: 10, up: (data) => data },
  ],
  // v7 -> v8 (spec 020): PollTrigger and the `email` output stopped embedding
  // credentials/proxy URLs per-flow and now reference a reusable
  // `IntegrationConnection` (`connectionId`) instead. Unlike previous steps,
  // this one is NOT an identity transform — old embedded HubSpot credentials
  // were never actually encrypted (a bug; see spec 020 §D) and are discarded
  // rather than migrated into a real vault-encrypted connection, since doing
  // that would require an async vault write inside a pure/sync migration
  // step. The flow is left with an empty `connectionId` ("" — no connection
  // selected yet) so the user reconnects it once from the Flow builder to a
  // connection created in Integraciones.
  // v8 -> v9 (spec 023 §D): `createTask` output gained `projectRef` and
  // several optional Task fields (status/assigneeId/dueDate/tags/estimate/
  // summary). All new fields are optional/defaulted in the Zod schema, so
  // existing v8 records need no data transformation.
  // v9 -> v10 (spec 023 §E): `createTask`/`createProject` outputs gained
  // `dedupeKey`. Optional/defaulted, no data transformation needed.
  flows: [
    { to: 8, up: migrateFlowsDocV7ToV8 },
    { to: 9, up: (data) => data },
    { to: 10, up: (data) => data },
  ],
};

function migrateFlowsDocV7ToV8(doc: Record<string, unknown>): Record<string, unknown> {
  const flows = Array.isArray(doc.flows) ? (doc.flows as Record<string, unknown>[]) : [];
  return { ...doc, flows: flows.map(migrateFlowRuleV7ToV8) };
}

function migrateFlowRuleV7ToV8(flow: Record<string, unknown>): Record<string, unknown> {
  let trigger = flow.trigger as Record<string, unknown> | undefined;
  if (trigger?.type === "poll") {
    const config = (trigger.config as Record<string, unknown>) ?? {};
    // Guard: only strip if this is really the old embedded shape. Without
    // this check, re-running the step (e.g. after the doc-level
    // schemaVersion drifted below target again) would wipe out a
    // `connectionId` the user already set after reconnecting.
    if ("proxyUrl" in config || "encryptedToken" in config) {
      trigger = {
        type: "poll",
        provider: trigger.provider ?? "hubspot",
        config: {
          connectionId: "",
          objectType: config.objectType,
          fields: config.fields ?? [],
          filters: config.filters ?? [],
          intervalMs: config.intervalMs ?? 300_000,
        },
      };
    }
  }

  const outputs = Array.isArray(flow.outputs) ? (flow.outputs as Record<string, unknown>[]) : [];
  const migratedOutputs = outputs.map((output) => {
    if (output.type === "email" && "proxyUrl" in output) {
      const rest = { ...output };
      delete rest.proxyUrl;
      return { ...rest, connectionId: "" };
    }
    return output;
  });

  return { ...flow, trigger, outputs: migratedOutputs, schemaVersion: 8 };
}

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
