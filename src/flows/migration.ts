import { nowIso, uuid } from "@/lib/utils";
import type { AutomationRule } from "@/domain/schemas";
import type { FlowRule, Output, EventTrigger } from "@/domain/schemas/flow";
import { SCHEMA_VERSION } from "@/domain/schemas/common";

/**
 * Legacy trigger types with no FlowRule equivalent: flows only support
 * discrete internal events + HubSpot polling — there is no cron/schedule or
 * "on app open" trigger (and `date.due`/`date.approaching` are driven by the
 * temporal engine, which emits notifications directly, not DomainEvents).
 */
const UNSUPPORTED_TRIGGER_TYPES = new Set<string>([
  "date.due",
  "date.approaching",
  "app.opened",
  "schedule",
]);

export interface MigrationSkip {
  ruleId: string;
  ruleName: string;
  reason: string;
}

export interface MigrationResult {
  flows: FlowRule[];
  skipped: MigrationSkip[];
}

/**
 * Migrates a legacy AutomationRule to the new FlowRule schema. Returns null
 * when the rule's trigger has no FlowRule equivalent — the caller
 * (`migrateAutomationsToFlows`) decides how to report that.
 * This is a one-way migration — FlowRules cannot be downgraded to AutomationRules.
 */
export function migrateAutomationToFlow(rule: AutomationRule): FlowRule | null {
  if (UNSUPPORTED_TRIGGER_TYPES.has(rule.trigger.type)) return null;

  return {
    id: rule.id,
    schemaVersion: SCHEMA_VERSION,
    name: rule.name,
    enabled: rule.enabled,
    notifyOnFailure: true,
    trigger: {
      type: "event",
      // Safe: every value reaching here already passed the trigger-type guard
      // above, so it's one of the event types Flows and legacy Automations
      // share (see `automations/events.ts` / `domain/schemas/flow.ts`).
      event: rule.trigger.type as EventTrigger["event"],
    },
    logic: {
      conditions: rule.conditions.map((c) => ({
        field: c.field,
        op: c.op,
        value: c.value,
      })),
      mapping: [],
    },
    outputs: rule.actions
      .map(migrateAction)
      .filter((o): o is Output => o !== null),
    lastRunAt: rule.lastRunAt,
    runCount: 0,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

function migrateAction(action: AutomationRule["actions"][number]): Output | null {
  switch (action.type) {
    case "setProjectStatus":
      return { type: "setProjectStatus", status: action.status };
    case "markAreaComplete":
      return { type: "markAreaComplete" };
    case "createTask":
      return {
        type: "createTask",
        title: action.title,
        areaId: action.areaId,
        priority: action.priority,
        projectRef: "explicit",
      };
    case "createNotification":
      return {
        type: "createNotification",
        severity: action.severity,
        message: action.message,
      };
    case "setField":
      return { type: "setField", field: action.field, value: action.value };
    case "createChecklistFromTemplate":
      // No FlowRule output equivalent — skip with a warning instead of
      // silently dropping the whole rule.
      console.warn(
        `[Migración Flows] La acción "createChecklistFromTemplate" no tiene equivalente en Flows y se omitió.`
      );
      return null;
    case "recreateRecurringChecklist":
      console.warn(
        `[Migración Flows] La acción "recreateRecurringChecklist" no tiene equivalente en Flows y se omitió.`
      );
      return null;
    default:
      return null;
  }
}

/**
 * Migrates an array of legacy AutomationRules to FlowRules. Rules whose
 * trigger has no FlowRule equivalent, or that end up with zero outputs and
 * zero conditions after dropping unsupported actions, are reported in
 * `skipped` instead of silently disappearing — the caller can surface this
 * to the user.
 */
export function migrateAutomationsToFlows(rules: AutomationRule[]): MigrationResult {
  const flows: FlowRule[] = [];
  const skipped: MigrationSkip[] = [];

  for (const rule of rules) {
    if (UNSUPPORTED_TRIGGER_TYPES.has(rule.trigger.type)) {
      skipped.push({
        ruleId: rule.id,
        ruleName: rule.name,
        reason: `El trigger "${rule.trigger.type}" no tiene equivalente en Flows (solo eventos internos y polling de HubSpot).`,
      });
      continue;
    }

    const flow = migrateAutomationToFlow(rule);
    if (!flow) continue;

    if (flow.outputs.length === 0 && flow.logic.conditions.length === 0) {
      skipped.push({
        ruleId: rule.id,
        ruleName: rule.name,
        reason: "Todas sus acciones eran de tipos sin equivalente en Flows; quedó sin outputs.",
      });
      continue;
    }

    flows.push(flow);
  }

  return { flows, skipped };
}

/**
 * Creates a new empty FlowRule with sensible defaults.
 */
export function createEmptyFlow(name: string): FlowRule {
  const now = nowIso();
  return {
    id: uuid(),
    schemaVersion: SCHEMA_VERSION,
    name,
    enabled: true,
    notifyOnFailure: true,
    trigger: { type: "event", event: "task.statusChanged" },
    logic: { conditions: [], mapping: [] },
    outputs: [],
    lastRunAt: null,
    runCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Clona un flujo existente para "Duplicar" (spec 024 §F7): copia
 * trigger/logic/outputs/graph tal cual, pero con id nuevo, nombre "(copia)",
 * inactivo (para no registrar polling hasta que el usuario lo active a
 * propósito) y sin historial propio — `runCount`/`lastRunAt` arrancan en
 * cero, igual que un flujo recién creado.
 *
 * No hereda `lastSample`/`lastSampleAt` del original (spec 025 §A): la copia
 * puede apuntar a otra conexión o la muestra del original puede referenciar
 * registros ya no vigentes — mejor arrancar sin muestra y dejar al usuario
 * "Probar conexión" cuando lo active.
 */
export function duplicateFlow(flow: FlowRule): FlowRule {
  const now = nowIso();
  const clone: FlowRule = {
    ...flow,
    id: uuid(),
    schemaVersion: SCHEMA_VERSION,
    name: `${flow.name} (copia)`,
    enabled: false,
    lastRunAt: null,
    runCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  // Limpieza explícita: el spread arriba rebota `undefined` traídos de flow,
  // pero el original sí puede tener `lastSample` poblado — lo forzamos a
  // undefined para que el JSON persistido no lo conserve.
  clone.lastSample = undefined;
  clone.lastSampleAt = undefined;
  return clone;
}
