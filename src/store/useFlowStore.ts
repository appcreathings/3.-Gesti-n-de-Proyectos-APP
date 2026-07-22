import { create } from "zustand";
import { uuid } from "@/lib/utils";
import type { FlowRule } from "@/domain/schemas/flow";
import type { AutomationRule } from "@/domain/schemas";
import type { FlowRunTrace } from "@/flows/engine";
import { SCHEMA_VERSION } from "@/domain/schemas/common";
import { migrateAutomationsToFlows, type MigrationResult } from "@/flows/migration";
import { useAppStore } from "./useAppStore";

/** Guards the one-time legacy Automations → Flows migration from re-running
 * every session (it would otherwise duplicate flows on every app boot). */
const AUTOMATIONS_MIGRATED_KEY = "hito:automations-migrated";

/** Cap on persisted execution log entries (oldest dropped first), same
 * pattern as the activity log (`ACTIVITY_CAP`) elsewhere in the app. */
const RUN_LOG_CAP = 200;

/** One entry in a flow's execution history — surfaced in FlowsPage so a run
 * (or a transform/output error) isn't invisible the way it used to be. */
export interface FlowRunLog {
  id: string;
  flowId: string;
  flowName: string;
  at: string;
  /** "partial" = al menos un output tuvo éxito y al menos otro falló en la
   * misma corrida — antes esto se reportaba como dos entradas separadas
   * ("success" + "error") para el mismo run, lo cual además dependía de que
   * el output fallido reportara error para empezar (spec 024 §F2: webhook/
   * email fallidos por red se contaban como "executed"). */
  status: "success" | "partial" | "error";
  detail: string;
  /** Primer registro procesado en esta corrida, si el engine llegó a
   * matchear el trigger — para que el historial muestre datos reales, no
   * solo "se ejecutó" (spec 023 §B/§F). */
  preview?: Record<string, unknown>;
  /** Traza paso a paso (condiciones, mapeo, transform, desenlace por
   * output) — solo presente cuando la corrida pidió tracing
   * (`runFlowEngine({ trace: true })`). Alimenta el drawer de depuración
   * del historial (spec 023 §F). */
  trace?: FlowRunTrace;
}

interface FlowState {
  flows: FlowRule[];
  runs: FlowRunLog[];
  hydrated: boolean;

  hydrate: () => Promise<void>;
  addFlow: (flow: FlowRule) => Promise<void>;
  updateFlow: (flow: FlowRule) => Promise<void>;
  deleteFlow: (id: string) => Promise<void>;
  incrementRunCount: (id: string) => Promise<void>;
  /** Append entries to the execution history, capped and persisted.
   *  Acepta entradas con `id` ya asignado (spec 033 C1) — así el caller
   *  (`applyFlowResult`) puede usar ese mismo id como `runId` para el
   *  deep-link de la notificación de fallo y para vincular las entregas
   *  salientes al run, antes de que se persistan. */
  recordRuns: (entries: FlowRunLog[]) => Promise<void>;
  /** One-time migration of legacy AutomationRules into Flows. No-ops if
   * already run in this browser (see `AUTOMATIONS_MIGRATED_KEY`). */
  migrateLegacyAutomations: (rules: AutomationRule[]) => Promise<MigrationResult>;
}

function adapter() {
  return useAppStore.getState().adapter;
}

/** Registra el polling de un trigger, despachando al manager del proveedor
 * correcto. No-op silencioso para triggers de tipo "event". */
async function registerPollTrigger(trigger: FlowRule["trigger"]): Promise<void> {
  if (trigger.type !== "poll") return;
  try {
    if (trigger.provider === "hubspot") {
      const { registerHubSpotPolling } = await import("@/integrations/inbound/hubspot-polling-manager");
      await registerHubSpotPolling(trigger);
    } else if (trigger.provider === "inbox") {
      const { registerInboxPolling } = await import("@/integrations/inbound/inbox-polling-manager");
      await registerInboxPolling(trigger);
    } else {
      const { registerSheetsPolling } = await import("@/integrations/inbound/sheets-polling-manager");
      await registerSheetsPolling(trigger);
    }
  } catch (error) {
    console.error(`Error registering ${trigger.provider} polling:`, error);
  }
}

async function unregisterPollTrigger(trigger: FlowRule["trigger"]): Promise<void> {
  if (trigger.type !== "poll") return;
  try {
    if (trigger.provider === "hubspot") {
      const { unregisterHubSpotPolling } = await import("@/integrations/inbound/hubspot-polling-manager");
      unregisterHubSpotPolling(trigger);
    } else if (trigger.provider === "inbox") {
      const { unregisterInboxPolling } = await import("@/integrations/inbound/inbox-polling-manager");
      unregisterInboxPolling(trigger);
    } else {
      const { unregisterSheetsPolling } = await import("@/integrations/inbound/sheets-polling-manager");
      unregisterSheetsPolling(trigger);
    }
  } catch (error) {
    console.error(`Error unregistering ${trigger.provider} polling:`, error);
  }
}

async function persistFlows(flows: FlowRule[]) {
  // Antes escribía `schemaVersion: 1` fijo: cada guardado deshacía la
  // migración que `readDoc` acababa de aplicar (`migrateOnRead` volvía a
  // detectar `from < target` en la siguiente lectura y repetía el paso —
  // inofensivo pero costoso, y ahora que el paso v7→v8 hace transformación
  // real en vez de ser identidad, más vale escribir siempre el target real).
  await adapter().writeDoc("flows", { schemaVersion: SCHEMA_VERSION, flows });
}

async function persistRuns(runs: FlowRunLog[]) {
  await adapter().writeDoc("flow-runs", { schemaVersion: SCHEMA_VERSION, runs });
}

export const useFlowStore = create<FlowState>((set, get) => ({
  flows: [],
  runs: [],
  hydrated: false,

  async hydrate() {
    try {
      const doc = await adapter().readDoc<{ flows: FlowRule[] }>("flows");
      set({ flows: doc.flows || [], hydrated: true });
    } catch {
      // Si no existe el archivo, empezar con array vacío
      set({ flows: [], hydrated: true });
    }
    try {
      const runsDoc = await adapter().readDoc<{ runs: FlowRunLog[] }>("flow-runs");
      set({ runs: runsDoc.runs || [] });
    } catch {
      set({ runs: [] });
    }
  },

  async addFlow(flow) {
    const flows = [...get().flows, flow];
    set({ flows });
    await persistFlows(flows);

    if (flow.enabled) await registerPollTrigger(flow.trigger);
  },

  async updateFlow(flow) {
    const previous = get().flows.find((f) => f.id === flow.id);
    const flows = get().flows.map((f) => (f.id === flow.id ? flow : f));
    set({ flows });
    await persistFlows(flows);

    // Siempre desregistrar el polling previo primero: si el trigger cambió de
    // provider/objectType, o el flow se deshabilitó, el timer anterior debe
    // pararse. Antes solo `deleteFlow` desregistraba, así que deshabilitar un
    // flow de poll dejaba el timer corriendo indefinidamente (fuga de polling).
    if (previous) await unregisterPollTrigger(previous.trigger);
    if (flow.enabled) await registerPollTrigger(flow.trigger);
  },

  async deleteFlow(id) {
    const flow = get().flows.find((f) => f.id === id);
    const flows = get().flows.filter((f) => f.id !== id);
    set({ flows });
    await persistFlows(flows);

    if (flow) await unregisterPollTrigger(flow.trigger);
  },

  async incrementRunCount(id) {
    const flows = get().flows.map((f) =>
      f.id === id ? { ...f, runCount: f.runCount + 1, lastRunAt: new Date().toISOString() } : f
    );
    set({ flows });
    await persistFlows(flows);
  },

  async recordRuns(entries) {
    if (entries.length === 0) return;
    // Spec 033 C1: el caller ya asigna los ids (para vincular entregas +
    // notificaciones al run); aquí solo se asegura de que exista uno (no
    // rompe callers legacy que pasen entradas sin id).
    const withIds = entries.map((e) => ({ ...e, id: e.id ?? uuid() }));
    const runs = [...withIds, ...get().runs].slice(0, RUN_LOG_CAP);
    set({ runs });
    await persistRuns(runs);
  },

  async migrateLegacyAutomations(rules) {
    let alreadyMigrated = false;
    try {
      alreadyMigrated = localStorage.getItem(AUTOMATIONS_MIGRATED_KEY) === "true";
    } catch {
      // localStorage unavailable — treat as not migrated; worst case this
      // runs again next session, which is a duplicate flows risk but safer
      // than silently never migrating.
    }
    if (alreadyMigrated || rules.length === 0) {
      try {
        localStorage.setItem(AUTOMATIONS_MIGRATED_KEY, "true");
      } catch {
        // ignore
      }
      return { flows: [], skipped: [] };
    }

    const { flows: migratedFlows, skipped } = migrateAutomationsToFlows(rules);

    const existingIds = new Set(get().flows.map((f) => f.id));
    const newFlows = migratedFlows.filter((f) => !existingIds.has(f.id));

    if (newFlows.length > 0) {
      const flows = [...get().flows, ...newFlows];
      set({ flows });
      await persistFlows(flows);
    }

    try {
      localStorage.setItem(AUTOMATIONS_MIGRATED_KEY, "true");
    } catch {
      // ignore — worst case the migration is retried next session
    }

    return { flows: newFlows, skipped };
  },
}));
