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
      createProduct: (p) => useDataStore.getState().createProduct(p),
      createChecklistTemplate: (t) =>
        useDataStore.getState().createChecklistTemplate(t),
      createProcessTemplate: (t) =>
        useDataStore.getState().createProcessTemplate(t),
      createProjectType: (t) => useDataStore.getState().createProjectType(t),
    },
  };
  return createAiTools(ctx);
}
