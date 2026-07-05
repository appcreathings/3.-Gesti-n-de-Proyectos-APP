import { create } from "zustand";
import { nowIso } from "@/lib/utils";
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
  notifications: Notification[];
  activity: ActivityEntry[];

  hydrate: () => Promise<void>;
  runTemporal: () => Promise<void>;

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
  notifications: [],
  activity: [],

  async hydrate() {
    const a = adapter();
    const [productIds, projectIds, clTplIds, procTplIds, typeIds, autoIds] =
      await Promise.all([
        a.list("products"),
        a.list("projects"),
        a.list("checklist-templates"),
        a.list("process-templates"),
        a.list("project-types"),
        a.list("automations"),
      ]);
    const [
      products,
      projects,
      checklistTemplates,
      processTemplates,
      projectTypes,
      automations,
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

/** Run event-driven automations and apply their effects (no re-entrancy). */
async function runAutomations(events: DomainEvent[]) {
  if (events.length === 0) return;
  const s = useDataStore.getState();
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
