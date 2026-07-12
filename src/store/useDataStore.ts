import { create } from "zustand";
import { nowIso, uuid } from "@/lib/utils";
import type {
  ActivityDoc,
  ActivityEntry,
  AutomationRule,
  ChecklistTemplate,
  Notification,
  NotificationsDoc,
  PeopleDoc,
  Person,
  ProcessTemplate,
  Product,
  Project,
  ProjectType,
  Quarter,
} from "@/domain/schemas";
import { instantiateProjectFromType } from "@/domain/instantiate";
import { diffProjectEvents, type DomainEvent } from "@/automations/events";
import { appendEntries, describeEvents } from "@/automations/activity";
import { runEngine } from "@/automations/engine";
import { evaluateTemporal } from "@/automations/temporal";
import { useAppStore } from "./useAppStore";

interface DataState {
  hydrated: boolean;
  products: Product[];
  projects: Project[];
  people: Person[];
  checklistTemplates: ChecklistTemplate[];
  processTemplates: ProcessTemplate[];
  projectTypes: ProjectType[];
  automations: AutomationRule[];
  quarters: Quarter[];
  notifications: Notification[];
  activity: ActivityEntry[];

  hydrate: () => Promise<void>;
  runTemporal: () => Promise<void>;
  /** Run poll-triggered flows (e.g. HubSpot) against freshly-fetched external records. */
  runPolledFlow: (pollKey: string, records: Record<string, unknown>[]) => Promise<void>;
  /** Ejecuta un flujo específico ahora mismo — "Ejecutar ahora" (spec 022 §B/§C).
   * Trae datos frescos de verdad (poll) o corre contra un evento sintético
   * (evento, requiere `syntheticEvent`) y aplica el resultado real, igual que
   * una ejecución automática (sube runCount, entra al historial). Bypassea
   * `enabled` sin tocar el flujo guardado. */
  runFlowNow: (
    flowId: string,
    options?: { syntheticEvent?: DomainEvent },
  ) => Promise<import("@/flows/manual-run").ManualRunOutcome>;

  createProduct: (p: Product) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  createProject: (p: Project) => Promise<void>;
  saveProject: (p: Project) => Promise<void>;
  mutateProject: (id: string, recipe: (p: Project) => Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  createProjectFromType: (
    typeId: string,
    name: string,
    productId: string | null,
  ) => Promise<string | null>;

  createChecklistTemplate: (t: ChecklistTemplate) => Promise<void>;
  updateChecklistTemplate: (t: ChecklistTemplate) => Promise<void>;
  deleteChecklistTemplate: (id: string) => Promise<void>;

  createProcessTemplate: (t: ProcessTemplate) => Promise<void>;
  updateProcessTemplate: (t: ProcessTemplate) => Promise<void>;
  deleteProcessTemplate: (id: string) => Promise<void>;

  createProjectType: (t: ProjectType) => Promise<void>;
  updateProjectType: (t: ProjectType) => Promise<void>;
  deleteProjectType: (id: string) => Promise<void>;

  createAutomation: (r: AutomationRule) => Promise<void>;
  updateAutomation: (r: AutomationRule) => Promise<void>;
  deleteAutomation: (id: string) => Promise<void>;

  createQuarter: (q: Quarter) => Promise<void>;
  updateQuarter: (q: Quarter) => Promise<void>;
  deleteQuarter: (id: string) => Promise<void>;

  addNotifications: (list: Notification[]) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  clearNotifications: () => Promise<void>;

  createPerson: (p: Person) => Promise<void>;
  updatePerson: (p: Person) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
}

function adapter() {
  return useAppStore.getState().adapter;
}

export const useDataStore = create<DataState>((set, get) => ({
  hydrated: false,
  products: [],
  projects: [],
  people: [],
  checklistTemplates: [],
  processTemplates: [],
  projectTypes: [],
  automations: [],
  quarters: [],
  notifications: [],
  activity: [],

  async hydrate() {
    const a = adapter();
    const [productIds, projectIds, clTplIds, procTplIds, typeIds, autoIds, quarterIds] =
      await Promise.all([
        a.list("products"),
        a.list("projects"),
        a.list("checklist-templates"),
        a.list("process-templates"),
        a.list("project-types"),
        a.list("automations"),
        a.list("quarters"),
      ]);
    const [
      products,
      projects,
      checklistTemplates,
      processTemplates,
      projectTypes,
      automations,
      quarters,
      peopleDoc,
      notificationsDoc,
      activityDoc,
    ] = await Promise.all([
      Promise.all(productIds.map((id) => a.read<Product>("products", id))),
      Promise.all(projectIds.map((id) => a.read<Project>("projects", id))),
      Promise.all(
        clTplIds.map((id) => a.read<ChecklistTemplate>("checklist-templates", id)),
      ),
      Promise.all(
        procTplIds.map((id) => a.read<ProcessTemplate>("process-templates", id)),
      ),
      Promise.all(typeIds.map((id) => a.read<ProjectType>("project-types", id))),
      Promise.all(autoIds.map((id) => a.read<AutomationRule>("automations", id))),
      Promise.all(quarterIds.map((id) => a.read<Quarter>("quarters", id))),
      a.readDoc<PeopleDoc>("people"),
      a.readDoc<NotificationsDoc>("notifications"),
      a.readDoc<ActivityDoc>("activity"),
    ]);
    set({
      products,
      projects,
      checklistTemplates,
      processTemplates,
      projectTypes,
      automations,
      quarters,
      people: peopleDoc.people,
      notifications: notificationsDoc.notifications,
      activity: activityDoc.entries,
      hydrated: true,
    });
  },

  async runTemporal() {
    const ws = useAppStore.getState().workspace;
    if (!ws) return;
    const s = get();
    const { notifications, changedProjects } = evaluateTemporal({
      projects: s.projects,
      settings: ws.settings,
      now: new Date(),
      existing: s.notifications,
    });
    for (const p of changedProjects) await persistProject(p);
    if (notifications.length > 0) await get().addNotifications(notifications);
  },

  async runPolledFlow(pollKey, records) {
    await runPolledFlowImpl(pollKey, records);
  },

  async runFlowNow(flowId, options) {
    return runFlowNowImpl(flowId, options);
  },

  async createProduct(p) {
    await adapter().write("products", p);
    set({ products: [...get().products, p] });
    await reindex();
  },
  async updateProduct(p) {
    const updated = { ...p, updatedAt: nowIso() };
    await adapter().write("products", updated);
    set({ products: get().products.map((x) => (x.id === p.id ? updated : x)) });
    await reindex();
  },
  async deleteProduct(id) {
    await adapter().remove("products", id);
    const detached = get().projects.map((p) =>
      p.productId === id ? { ...p, productId: null } : p,
    );
    await Promise.all(
      detached
        .filter((p, i) => p !== get().projects[i])
        .map((p) => adapter().write("projects", p)),
    );
    set({
      products: get().products.filter((x) => x.id !== id),
      projects: detached,
    });
    await reindex();
  },

  async createProject(p) {
    await persistProject(p);
    const events: DomainEvent[] = [
      { type: "project.created", projectId: p.id, typeId: p.typeId },
    ];
    await logActivity(events, p);
    await runAutomations(events);
  },
  async saveProject(p) {
    const prev = get().projects.find((x) => x.id === p.id);
    await persistProject(p);
    if (prev) {
      const events = diffProjectEvents(prev, p);
      await logActivity(events, p);
      await runAutomations(events);
    }
  },
  async mutateProject(id, recipe) {
    const current = get().projects.find((p) => p.id === id);
    if (!current) return;
    const next = { ...recipe(current), updatedAt: nowIso() };
    await get().saveProject(next);
  },
  async deleteProject(id) {
    await adapter().remove("projects", id);
    set({ projects: get().projects.filter((x) => x.id !== id) });
    await reindex();
  },
  async createProjectFromType(typeId, name, productId) {
    const type = get().projectTypes.find((t) => t.id === typeId);
    if (!type) return null;
    const project = instantiateProjectFromType(
      type,
      name,
      productId,
      get().checklistTemplates,
      get().processTemplates,
    );
    await get().createProject(project);
    return project.id;
  },

  async createChecklistTemplate(t) {
    await adapter().write("checklist-templates", t);
    set({ checklistTemplates: [...get().checklistTemplates, t] });
    await reindex();
  },
  async updateChecklistTemplate(t) {
    const updated = { ...t, updatedAt: nowIso() };
    await adapter().write("checklist-templates", updated);
    set({
      checklistTemplates: get().checklistTemplates.map((x) =>
        x.id === t.id ? updated : x,
      ),
    });
    await reindex();
  },
  async deleteChecklistTemplate(id) {
    await adapter().remove("checklist-templates", id);
    set({ checklistTemplates: get().checklistTemplates.filter((x) => x.id !== id) });
    await reindex();
  },

  async createProcessTemplate(t) {
    await adapter().write("process-templates", t);
    set({ processTemplates: [...get().processTemplates, t] });
    await reindex();
  },
  async updateProcessTemplate(t) {
    const updated = { ...t, updatedAt: nowIso() };
    await adapter().write("process-templates", updated);
    set({
      processTemplates: get().processTemplates.map((x) =>
        x.id === t.id ? updated : x,
      ),
    });
    await reindex();
  },
  async deleteProcessTemplate(id) {
    await adapter().remove("process-templates", id);
    set({ processTemplates: get().processTemplates.filter((x) => x.id !== id) });
    await reindex();
  },

  async createProjectType(t) {
    await adapter().write("project-types", t);
    set({ projectTypes: [...get().projectTypes, t] });
    await reindex();
  },
  async updateProjectType(t) {
    const updated = { ...t, updatedAt: nowIso() };
    await adapter().write("project-types", updated);
    set({ projectTypes: get().projectTypes.map((x) => (x.id === t.id ? updated : x)) });
    await reindex();
  },
  async deleteProjectType(id) {
    await adapter().remove("project-types", id);
    set({ projectTypes: get().projectTypes.filter((x) => x.id !== id) });
    await reindex();
  },

  async createAutomation(r) {
    await adapter().write("automations", r);
    set({ automations: [...get().automations, r] });
    await reindex();
  },
  async updateAutomation(r) {
    const updated = { ...r, updatedAt: nowIso() };
    await adapter().write("automations", updated);
    set({ automations: get().automations.map((x) => (x.id === r.id ? updated : x)) });
    await reindex();
  },
  async deleteAutomation(id) {
    await adapter().remove("automations", id);
    set({ automations: get().automations.filter((x) => x.id !== id) });
    await reindex();
  },

  async createQuarter(q) {
    await adapter().write("quarters", q);
    set({ quarters: [...get().quarters, q] });
    await reindex();
  },
  async updateQuarter(q) {
    const updated = { ...q, updatedAt: nowIso() };
    await adapter().write("quarters", updated);
    set({ quarters: get().quarters.map((x) => (x.id === q.id ? updated : x)) });
    await reindex();
  },
  async deleteQuarter(id) {
    await adapter().remove("quarters", id);
    const detached = get().projects.map((p) =>
      p.quarterId === id ? { ...p, quarterId: null } : p,
    );
    await Promise.all(
      detached
        .filter((p, i) => p !== get().projects[i])
        .map((p) => adapter().write("projects", p)),
    );
    set({
      quarters: get().quarters.filter((x) => x.id !== id),
      projects: detached,
    });
    await reindex();
  },

  async addNotifications(list) {
    const existing = new Set(get().notifications.map((n) => n.id));
    const fresh = list.filter((n) => !existing.has(n.id));
    if (fresh.length === 0) return;
    const next = [...fresh, ...get().notifications];
    set({ notifications: next });
    await persistNotifications(next);
  },
  async markNotificationRead(id) {
    const next = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    set({ notifications: next });
    await persistNotifications(next);
  },
  async markAllNotificationsRead() {
    const next = get().notifications.map((n) => ({ ...n, read: true }));
    set({ notifications: next });
    await persistNotifications(next);
  },
  async clearNotifications() {
    set({ notifications: [] });
    await persistNotifications([]);
  },

  async createPerson(p) {
    set({ people: [...get().people, p] });
    await persistPeople(get().people);
  },
  async updatePerson(p) {
    const updated = { ...p, updatedAt: nowIso() };
    set({ people: get().people.map((x) => (x.id === p.id ? updated : x)) });
    await persistPeople(get().people);
  },
  async deletePerson(id) {
    set({ people: get().people.filter((x) => x.id !== id) });
    await persistPeople(get().people);
  },
}));

/** Low-level project write (no automations) used by saves and engine effects. */
async function persistProject(p: Project) {
  const s = useDataStore.getState();
  await adapter().write("projects", p);
  const exists = s.projects.some((x) => x.id === p.id);
  useDataStore.setState({
    projects: exists
      ? s.projects.map((x) => (x.id === p.id ? p : x))
      : [...s.projects, p],
  });
  await reindex();
}

/** Append human-readable entries to the aggregated activity doc (project history). */
async function logActivity(events: DomainEvent[], project: Project) {
  if (events.length === 0) return;
  const entries = describeEvents(events, project);
  if (entries.length === 0) return;
  const s = useDataStore.getState();
  const doc = appendEntries({ schemaVersion: 1, entries: s.activity }, entries);
  useDataStore.setState({ activity: doc.entries });
  await adapter().writeDoc<ActivityDoc>("activity", doc);
}

/** Cooldown entre notificaciones de fallo del mismo flow (spec 024 §F3) —
 * sin esto, un flow de poll que falla cada 5 min generaría una notificación
 * nueva cada 5 min indefinidamente ("5 veces en 10 min" del criterio de
 * aceptación). En memoria por pestaña, mismo patrón que el resto del estado
 * de polling/backoff de este código base — no se persiste entre sesiones. */
const FLOW_FAILURE_NOTIFY_COOLDOWN_MS = 15 * 60_000;
const lastFlowFailureNotifiedAt = new Map<string, number>();

/**
 * Apply the effects of a flow engine run: persist mutated projects, create/
 * update people, push notifications, bump runCount only for flows that
 * actually executed, and log any transform/output errors. Shared by the
 * event-triggered path (`runAutomations`) and the poll-triggered path
 * (`runPolledFlow`) so both apply results identically.
 *
 * `isAutomatic` gates the failure-notification (spec 024 §F3): solo corridas
 * automáticas (poll/evento) de un flow activo notifican al fallar — una
 * corrida manual ("Ejecutar ahora") es una prueba que el usuario ya está
 * viendo en pantalla, así que nunca notifica, sin importar el estado del
 * flow.
 */
async function applyFlowResult(
  flowResult: import("@/flows/engine").FlowEngineResult,
  flowStore: {
    flows: import("@/domain/schemas/flow").FlowRule[];
    incrementRunCount: (id: string) => Promise<void>;
    recordRuns: (
      entries: Omit<import("@/store/useFlowStore").FlowRunLog, "id">[],
    ) => Promise<void>;
  },
  options: { isAutomatic: boolean },
) {
  const s = useDataStore.getState();
  for (const p of flowResult.changedProjects) {
    await persistProject({ ...p, updatedAt: nowIso() });
  }
  // `createProject` (no `persistProject`/`saveProject`): dispara el evento
  // `project.created` + registro de actividad + webhooks salientes, igual
  // que un proyecto creado a mano — un deal de HubSpot que se convierte en
  // proyecto debe pasar por el mismo camino que cualquier otro alta.
  for (const p of flowResult.newProjects) {
    await s.createProject(p);
  }
  for (const person of flowResult.newPeople) {
    await s.createPerson(person);
  }
  for (const person of flowResult.updatedPeople) {
    await s.updatePerson(person);
  }
  if (flowResult.notifications.length > 0) {
    await s.addNotifications(flowResult.notifications);
  }

  const now = nowIso();
  const runLogs: Omit<import("@/store/useFlowStore").FlowRunLog, "id">[] = [];

  // Igual que un run log ya se le adjunta la traza de esa corrida (si se
  // pidió con `trace: true`) y un preview del primer registro procesado —
  // convierte el historial en un depurador real en vez de solo éxito/error
  // (spec 023 §F).
  const traceFor = (flowId: string) => flowResult.traces[flowId];
  const previewFor = (flowId: string) => traceFor(flowId)?.records[0]?.record;

  // Agrupar errores por flow: un mismo run puede fallar en varios registros
  // (ej. un poll de 50 filas donde 10 fallan el mismo output). Antes cada
  // error generaba su propia entrada "error" en el historial, y si el flow
  // también había ejecutado outputs con éxito en otros registros, terminaba
  // apareciendo dos veces (una línea "success" y otra "error") para la misma
  // corrida — spec 024 §F2.
  const errorsByFlow = new Map<string, typeof flowResult.errors>();
  for (const err of flowResult.errors) {
    console.error(`[FlowEngine] "${err.flowName}" (${err.stage}):`, err.message);
    const list = errorsByFlow.get(err.flowId) ?? [];
    list.push(err);
    errorsByFlow.set(err.flowId, list);
  }

  // Increment run count only for flows that actually matched and executed
  // al menos un output — si además tuvo errores en otros outputs/registros
  // de la misma corrida, se reporta "partial" en vez de "success".
  for (const flowId of flowResult.executedFlowIds) {
    await flowStore.incrementRunCount(flowId);
    const flow = flowStore.flows.find((f) => f.id === flowId);
    const flowErrors = errorsByFlow.get(flowId);
    runLogs.push(
      flowErrors && flowErrors.length > 0
        ? {
            flowId,
            flowName: flow?.name ?? flowId,
            at: now,
            status: "partial",
            detail: `Ejecutado con errores: ${summarizeFlowErrors(flowErrors)}`,
            trace: traceFor(flowId),
            preview: previewFor(flowId),
          }
        : {
            flowId,
            flowName: flow?.name ?? flowId,
            at: now,
            status: "success",
            detail: "Ejecutado correctamente.",
            trace: traceFor(flowId),
            preview: previewFor(flowId),
          }
    );
  }

  // Flows que fallaron sin llegar a ejecutar ningún output (ej. el
  // transform falló para todos los registros) — no incrementan runCount,
  // igual que antes.
  for (const [flowId, flowErrors] of errorsByFlow) {
    if (flowResult.executedFlowIds.includes(flowId)) continue;
    runLogs.push({
      flowId,
      flowName: flowErrors[0].flowName,
      at: now,
      status: "error",
      detail: summarizeFlowErrors(flowErrors),
      trace: traceFor(flowId),
      preview: previewFor(flowId),
    });
  }

  if (runLogs.length > 0) {
    await flowStore.recordRuns(runLogs);
  }

  if (options.isAutomatic) {
    const nowMs = Date.now();
    const failureNotifications: import("@/domain/schemas").Notification[] = [];
    for (const log of runLogs) {
      if (log.status === "success") continue;
      const flow = flowStore.flows.find((f) => f.id === log.flowId);
      // Solo flows activos con la opción encendida (default true) — y
      // respeta el cooldown para no inundar el buzón si el mismo flow sigue
      // fallando en cada poll.
      if (!flow?.enabled || flow.notifyOnFailure === false) continue;
      const lastNotified = lastFlowFailureNotifiedAt.get(log.flowId) ?? 0;
      if (nowMs - lastNotified < FLOW_FAILURE_NOTIFY_COOLDOWN_MS) continue;
      lastFlowFailureNotifiedAt.set(log.flowId, nowMs);

      failureNotifications.push({
        id: uuid(),
        type: "flow.failed",
        severity: log.status === "error" ? "critical" : "warning",
        message:
          log.status === "error"
            ? `El flujo "${log.flowName}" falló: ${log.detail}`
            : `El flujo "${log.flowName}" terminó con errores: ${log.detail}`,
        entityRef: null,
        read: false,
        createdAt: log.at,
      });
    }
    if (failureNotifications.length > 0) {
      await s.addNotifications(failureNotifications);
    }
  }
}

/** Combina los errores de un mismo flow en un solo texto: agrupa mensajes
 * idénticos (ej. el mismo output fallando en 10 registros de un poll) y
 * recorta a los primeros 3 distintos para que el historial no se vuelva
 * ilegible con corridas grandes. */
function summarizeFlowErrors(errors: import("@/flows/engine").FlowExecutionError[]): string {
  const counts = new Map<string, number>();
  for (const e of errors) {
    const key = `[${e.stage}] ${e.message}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const entries = Array.from(counts.entries());
  const shown = entries
    .slice(0, 3)
    .map(([msg, count]) => (count > 1 ? `${msg} (x${count})` : msg));
  const extra = entries.length - shown.length;
  return shown.join(" | ") + (extra > 0 ? ` | +${extra} más` : "");
}

/** Run event-driven automations and apply their effects (no re-entrancy). */
async function runAutomations(events: DomainEvent[]) {
  if (events.length === 0) return;
  const s = useDataStore.getState();

  // Run legacy automations
  const { changedProjects, notifications } = runEngine({
    events,
    rules: s.automations,
    projects: s.projects,
    checklistTemplates: s.checklistTemplates,
  });
  for (const p of changedProjects) {
    await persistProject({ ...p, updatedAt: nowIso() });
  }
  if (notifications.length > 0) await s.addNotifications(notifications);

  // Run new flow rules
  try {
    const { useFlowStore } = await import("./useFlowStore");
    const { runFlowEngine } = await import("@/flows/engine");

    const flowStore = useFlowStore.getState();
    if (flowStore.flows.length > 0) {
      const flowResult = await runFlowEngine({
        flows: flowStore.flows,
        events,
        projects: s.projects,
        people: s.people,
        checklistTemplates: s.checklistTemplates,
        projectTypes: s.projectTypes,
        processTemplates: s.processTemplates,
        trace: true,
      });
      await applyFlowResult(flowResult, flowStore, { isAutomatic: true });
    }
  } catch (error) {
    console.error("Error running flow rules:", error);
  }

  // Dispatch outbound webhooks for integration events
  try {
    const { dispatchOutboundEvents } = await import("@/integrations/outbound/dispatcher");
    const app = useAppStore.getState();
    const orgName = app.workspace?.org.name ?? "Hito";
    await dispatchOutboundEvents(events, orgName);
  } catch {
    // Silently fail — integrations are optional
  }
}

/**
 * Run flows whose trigger is a poll (e.g. HubSpot) against freshly-fetched
 * external records. Called by the polling manager's registered handler once
 * per successful poll — separate from `runAutomations` because there are no
 * internal DomainEvents involved, only `externalData`. Exposed on the store
 * as `runPolledFlow`.
 */
async function runPolledFlowImpl(pollKey: string, records: Record<string, unknown>[]) {
  if (records.length === 0) return;
  const s = useDataStore.getState();

  try {
    const { useFlowStore } = await import("./useFlowStore");
    const { runFlowEngine } = await import("@/flows/engine");

    const flowStore = useFlowStore.getState();
    if (flowStore.flows.length === 0) return;

    const externalData = new Map<string, Record<string, unknown>[]>();
    externalData.set(pollKey, records);

    const flowResult = await runFlowEngine({
      flows: flowStore.flows,
      events: [],
      projects: s.projects,
      people: s.people,
      checklistTemplates: s.checklistTemplates,
      projectTypes: s.projectTypes,
      processTemplates: s.processTemplates,
      externalData,
      trace: true,
    });
    await applyFlowResult(flowResult, flowStore, { isAutomatic: true });
  } catch (error) {
    console.error("Error running polled flow:", error);
  }
}

/**
 * "Ejecutar ahora" (spec 022 §B/§C) — corre UN flujo específico de inmediato,
 * de verdad (aplica igual que una ejecución automática: sube runCount, entra
 * al historial), sin esperar al próximo poll o al evento real:
 * - Trigger `poll`: trae datos frescos vía `fetchPollSampleForFlow` (ignora
 *   el watermark incremental — nunca da "0 resultados" solo porque nada
 *   cambió desde el último poll real).
 * - Trigger `event`: requiere `options.syntheticEvent` (la Fase C construye
 *   uno real a partir de una entidad elegida por el usuario).
 * Corre `{...flow, enabled: true}` transitorio — bypassea el filtro de
 * `enabled` del engine sin tocar el flujo guardado, así se puede probar un
 * flujo que todavía no se activó.
 */
async function runFlowNowImpl(
  flowId: string,
  options?: { syntheticEvent?: DomainEvent },
): Promise<import("@/flows/manual-run").ManualRunOutcome> {
  const s = useDataStore.getState();
  const { useFlowStore } = await import("./useFlowStore");
  const { runFlowEngine, pollTriggerKey } = await import("@/flows/engine");

  const flowStore = useFlowStore.getState();
  const flow = flowStore.flows.find((f) => f.id === flowId);
  if (!flow) return { success: false, message: "Flujo no encontrado." };

  // A diferencia de una ejecución automática (que solo entra al historial si
  // el engine llegó a correr), "Ejecutar ahora" es una acción explícita del
  // usuario — todo desenlace, incluyendo un fallo *antes* de llegar al
  // engine (conexión no encontrada, vault bloqueado, CORS), debe quedar
  // visible en el historial. Sin esto, un fallo temprano se devolvía al
  // llamador pero el panel de Historial se veía vacío — el usuario no tenía
  // forma de saber qué pasó.
  const recordOutcome = async (outcome: import("@/flows/manual-run").ManualRunOutcome) => {
    await flowStore.recordRuns([
      {
        flowId: flow.id,
        flowName: flow.name,
        at: nowIso(),
        status: outcome.success ? "success" : "error",
        detail: `[Ejecutar ahora] ${outcome.message}`,
      },
    ]);
    return outcome;
  };

  let events: DomainEvent[] = [];
  let externalData: Map<string, Record<string, unknown>[]> | undefined;

  if (flow.trigger.type === "poll") {
    const { fetchPollSampleForFlow } = await import("@/flows/manual-run");
    const fetchResult = await fetchPollSampleForFlow(flow.trigger);
    if (!fetchResult.ok) {
      return recordOutcome({
        success: false,
        message: fetchResult.error ?? "Error al traer datos de la conexión.",
      });
    }
    const records = fetchResult.records ?? [];
    if (records.length === 0) {
      return recordOutcome({
        success: true,
        message: "No se encontraron registros para procesar en este momento.",
      });
    }
    externalData = new Map([[pollTriggerKey(flow.trigger), records]]);
  } else if (flow.trigger.type === "event") {
    if (!options?.syntheticEvent) {
      return recordOutcome({
        success: false,
        message: "Este flujo necesita elegir una entidad real para simular el evento.",
      });
    }
    events = [options.syntheticEvent];
  }

  const transientFlow = { ...flow, enabled: true };

  const flowResult = await runFlowEngine({
    flows: [transientFlow],
    events,
    projects: s.projects,
    people: s.people,
    checklistTemplates: s.checklistTemplates,
    projectTypes: s.projectTypes,
    processTemplates: s.processTemplates,
    externalData,
    trace: true,
  });

  // `applyFlowResult` ya registra en el historial el desenlace normal
  // (ejecutado / error de transform-output) vía `executedFlowIds`/`errors` —
  // no duplicar esa entrada aquí, solo construir el mensaje de retorno para
  // quien llamó a `runFlowNow`. `isAutomatic: false` — "Ejecutar ahora" es
  // una prueba manual que el usuario ya está viendo en pantalla, nunca debe
  // generar una notificación de fallo (spec 024 §F3).
  await applyFlowResult(flowResult, flowStore, { isAutomatic: false });

  // Los casos "hubo error" y "se ejecutó" ya quedan en el historial gracias a
  // `applyFlowResult` (itera `errors`/`executedFlowIds`). El caso restante —
  // corrió sin errores pero no ejecutó nada (0 outputs configurados, o las
  // condiciones filtraron todos los registros) — NO cae en ninguno de esos
  // dos arrays, así que sin este `recordOutcome` quedaba silenciosamente
  // fuera del historial (encontrado por el smoke test de spec 022 §C).
  const flowErrors = flowResult.errors.filter((e) => e.flowId === flow.id);
  if (flowErrors.length > 0) {
    return {
      success: false,
      message: flowErrors.map((e) => `[${e.stage}] ${e.message}`).join(" · "),
    };
  }
  if (flowResult.executedFlowIds.includes(flow.id)) {
    return { success: true, message: "El flujo se ejecutó correctamente." };
  }
  return recordOutcome({
    success: true,
    message:
      flow.outputs.length === 0
        ? "El flujo corrió pero no tiene ninguna acción configurada."
        : "El flujo corrió pero ningún registro cumplió las condiciones configuradas.",
  });
}

/** Rebuild the lightweight index in workspace.json from the loaded entities. */
async function reindex() {
  const app = useAppStore.getState();
  const ws = app.workspace;
  if (!ws) return;
  const s = useDataStore.getState();
  const named = (x: { id: string; name: string }) => ({ id: x.id, name: x.name });
  const next = {
    ...ws,
    index: {
      ...ws.index,
      products: s.products.map((p) => ({ id: p.id, name: p.name, status: p.status })),
      projects: s.projects.map((p) => ({
        id: p.id,
        name: p.name,
        productId: p.productId,
        status: p.status,
        health: p.health,
        updatedAt: p.updatedAt,
      })),
      types: s.projectTypes.map(named),
      templates: s.checklistTemplates.map(named),
      processTemplates: s.processTemplates.map(named),
      automations: s.automations.map((r) => ({
        id: r.id,
        name: r.name,
        enabled: r.enabled,
      })),
      quarters: s.quarters.map((q) => ({ id: q.id, name: q.name, status: q.status })),
    },
  };
  await app.adapter.writeWorkspace(next);
  useAppStore.setState({ workspace: next });
}

async function persistPeople(people: Person[]) {
  await adapter().writeDoc<PeopleDoc>("people", { schemaVersion: 1, people });
}

async function persistNotifications(notifications: Notification[]) {
  await adapter().writeDoc<NotificationsDoc>("notifications", {
    schemaVersion: 1,
    notifications,
  });
}
