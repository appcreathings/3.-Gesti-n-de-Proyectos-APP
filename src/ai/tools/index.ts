import { useAppStore } from "@/store/useAppStore";
import { useDataStore } from "@/store/useDataStore";
import { createAiTools } from "./registry";
import type { AiTool, ToolContext } from "./types";

export * from "./types";
export * from "./schema";
export * from "./registry";

/** Tool registry bound to the live Zustand stores (used by the chat agent). */
export function createBoundTools(): AiTool[] {
  const ctx: ToolContext = {
    getData: () => {
      const s = useDataStore.getState();
      return {
        products: s.products,
        projects: s.projects,
        people: s.people,
        checklistTemplates: s.checklistTemplates,
        processTemplates: s.processTemplates,
        projectTypes: s.projectTypes,
        automations: s.automations,
        notifications: s.notifications,
      };
    },
    getWorkspace: () => useAppStore.getState().workspace,
    actions: {
      mutateProject: (id, recipe) => useDataStore.getState().mutateProject(id, recipe),
      saveProject: (p) => useDataStore.getState().saveProject(p),
      createProject: (p) => useDataStore.getState().createProject(p),
      createProjectFromType: (typeId, name, productId) =>
        useDataStore.getState().createProjectFromType(typeId, name, productId),
      deleteProject: (id) => useDataStore.getState().deleteProject(id),

      createProduct: (p) => useDataStore.getState().createProduct(p),
      updateProduct: (p) => useDataStore.getState().updateProduct(p),
      deleteProduct: (id) => useDataStore.getState().deleteProduct(id),

      createChecklistTemplate: (t) =>
        useDataStore.getState().createChecklistTemplate(t),
      updateChecklistTemplate: (t) =>
        useDataStore.getState().updateChecklistTemplate(t),
      deleteChecklistTemplate: (id) =>
        useDataStore.getState().deleteChecklistTemplate(id),

      createProcessTemplate: (t) =>
        useDataStore.getState().createProcessTemplate(t),
      updateProcessTemplate: (t) =>
        useDataStore.getState().updateProcessTemplate(t),
      deleteProcessTemplate: (id) =>
        useDataStore.getState().deleteProcessTemplate(id),

      createProjectType: (t) => useDataStore.getState().createProjectType(t),
      updateProjectType: (t) => useDataStore.getState().updateProjectType(t),
      deleteProjectType: (id) => useDataStore.getState().deleteProjectType(id),

      createAutomation: (r) => useDataStore.getState().createAutomation(r),
      updateAutomation: (r) => useDataStore.getState().updateAutomation(r),
      deleteAutomation: (id) => useDataStore.getState().deleteAutomation(id),

      createPerson: (p) => useDataStore.getState().createPerson(p),
      updatePerson: (p) => useDataStore.getState().updatePerson(p),
      deletePerson: (id) => useDataStore.getState().deletePerson(id),

      addNotifications: (list) => useDataStore.getState().addNotifications(list),
      markNotificationRead: (id) =>
        useDataStore.getState().markNotificationRead(id),
      markAllNotificationsRead: () =>
        useDataStore.getState().markAllNotificationsRead(),
      clearNotifications: () => useDataStore.getState().clearNotifications(),
    },
  };
  return createAiTools(ctx);
}
