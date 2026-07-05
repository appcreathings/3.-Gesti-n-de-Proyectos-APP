import { describe, expect, it, vi } from "vitest";
import {
  newArea,
  newChecklist,
  newChecklistTemplate,
  newItem,
  newProduct,
  newProject,
  newTask,
} from "@/domain/factories";
import {
  emptyWorkspace,
  type AutomationRule,
  type ChecklistTemplate,
  type Notification,
  type Person,
  type ProcessTemplate,
  type Product,
  type Project,
  type ProjectType,
} from "@/domain/schemas";
import { createAiTools, callTool, getFunctionDeclarations } from "./registry";
import type { ToolContext, ToolData } from "./types";

/** Fake context over in-memory state: no browser, no network, no stores. */
function makeCtx(overrides: Partial<ToolData> = {}) {
  const area = newArea("Lanzamiento");
  const cl = newChecklist("QA");
  cl.items = [newItem("Probar build")];
  area.checklists = [cl];
  const task = newTask("Deploy");
  const project: Project = {
    ...newProject("Demo"),
    areas: [area],
    tasks: [task],
  };
  const product = newProduct("Producto X");

  const data: ToolData = {
    products: [product],
    projects: [project],
    people: [],
    checklistTemplates: [],
    processTemplates: [],
    projectTypes: [],
    automations: [],
    notifications: [],
    ...overrides,
  };

  const actions = {
    mutateProject: vi.fn(async (id: string, recipe: (p: Project) => Project) => {
      data.projects = data.projects.map((p) => (p.id === id ? recipe(p) : p));
    }),
    saveProject: vi.fn(async (p: Project) => {
      data.projects = data.projects.map((x) => (x.id === p.id ? p : x));
    }),
    createProject: vi.fn(async (p: Project) => {
      data.projects = [...data.projects, p];
    }),
    createProjectFromType: vi.fn(async () => null),
    deleteProject: vi.fn(async (id: string) => {
      data.projects = data.projects.filter((p) => p.id !== id);
    }),

    createProduct: vi.fn(async (p: Product) => {
      data.products = [...data.products, p];
    }),
    updateProduct: vi.fn(async (p: Product) => {
      data.products = data.products.map((x) => (x.id === p.id ? p : x));
    }),
    deleteProduct: vi.fn(async (id: string) => {
      data.products = data.products.filter((p) => p.id !== id);
    }),

    createChecklistTemplate: vi.fn(async (t: ChecklistTemplate) => {
      data.checklistTemplates = [...data.checklistTemplates, t];
    }),
    updateChecklistTemplate: vi.fn(async (t: ChecklistTemplate) => {
      data.checklistTemplates = data.checklistTemplates.map((x) =>
        x.id === t.id ? t : x,
      );
    }),
    deleteChecklistTemplate: vi.fn(async (id: string) => {
      data.checklistTemplates = data.checklistTemplates.filter((t) => t.id !== id);
    }),

    createProcessTemplate: vi.fn(async (t: ProcessTemplate) => {
      data.processTemplates = [...data.processTemplates, t];
    }),
    updateProcessTemplate: vi.fn(async (t: ProcessTemplate) => {
      data.processTemplates = data.processTemplates.map((x) => (x.id === t.id ? t : x));
    }),
    deleteProcessTemplate: vi.fn(async (id: string) => {
      data.processTemplates = data.processTemplates.filter((t) => t.id !== id);
    }),

    createProjectType: vi.fn(async (t: ProjectType) => {
      data.projectTypes = [...data.projectTypes, t];
    }),
    updateProjectType: vi.fn(async (t: ProjectType) => {
      data.projectTypes = data.projectTypes.map((x) => (x.id === t.id ? t : x));
    }),
    deleteProjectType: vi.fn(async (id: string) => {
      data.projectTypes = data.projectTypes.filter((t) => t.id !== id);
    }),

    createAutomation: vi.fn(async (r: AutomationRule) => {
      data.automations = [...data.automations, r];
    }),
    updateAutomation: vi.fn(async (r: AutomationRule) => {
      data.automations = data.automations.map((x) => (x.id === r.id ? r : x));
    }),
    deleteAutomation: vi.fn(async (id: string) => {
      data.automations = data.automations.filter((r) => r.id !== id);
    }),

    createPerson: vi.fn(async (p: Person) => {
      data.people = [...data.people, p];
    }),
    updatePerson: vi.fn(async (p: Person) => {
      data.people = data.people.map((x) => (x.id === p.id ? p : x));
    }),
    deletePerson: vi.fn(async (id: string) => {
      data.people = data.people.filter((p) => p.id !== id);
    }),

    addNotifications: vi.fn(async (list: Notification[]) => {
      data.notifications = [...data.notifications, ...list];
    }),
    markNotificationRead: vi.fn(async (id: string) => {
      data.notifications = data.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
    }),
    markAllNotificationsRead: vi.fn(async () => {
      data.notifications = data.notifications.map((n) => ({ ...n, read: true }));
    }),
    clearNotifications: vi.fn(async () => {
      data.notifications = [];
    }),
  };

  const ctx: ToolContext = {
    getData: () => data,
    getWorkspace: () => emptyWorkspace(),
    actions,
  };
  return { ctx, actions, project, product, area, cl, task };
}

describe("function declarations", () => {
  it("genera JSON Schema inline (sin $ref ni $schema) con required correcto", () => {
    const { ctx } = makeCtx();
    const decls = getFunctionDeclarations(createAiTools(ctx));
    expect(decls.length).toBeGreaterThanOrEqual(45);
    const json = JSON.stringify(decls);
    expect(json).not.toContain("$ref");
    expect(json).not.toContain("$schema");

    const createTask = decls.find((d) => d.name === "create_task")!;
    const params = createTask.parametersJsonSchema as {
      type: string;
      required?: string[];
      properties: Record<string, unknown>;
    };
    expect(params.type).toBe("object");
    expect(params.required).toEqual(
      expect.arrayContaining(["projectId", "title"]),
    );
    expect(params.required).not.toContain("dueDate");
  });

  it("todos los nombres son snake_case únicos", () => {
    const { ctx } = makeCtx();
    const tools = createAiTools(ctx);
    const names = tools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n).toMatch(/^[a-z][a-z0-9_]*$/);
  });
});

describe("dispatcher", () => {
  it("rechaza herramienta desconocida con error legible", async () => {
    const { ctx } = makeCtx();
    const res = await callTool(createAiTools(ctx), "no_existe", {});
    expect(res.ok).toBe(false);
    expect(res.error).toContain("no_existe");
  });

  it("rechaza args inválidos devolviendo el detalle de Zod (no lanza)", async () => {
    const { ctx } = makeCtx();
    const res = await callTool(createAiTools(ctx), "create_task", { title: "x" });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("projectId");
  });

  it("devuelve error de ejecución como dato (id inexistente)", async () => {
    const { ctx } = makeCtx();
    const res = await callTool(createAiTools(ctx), "get_project", {
      projectId: "nope",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("nope");
  });
});

describe("read tools", () => {
  it("get_workspace_overview resume el portafolio", async () => {
    const { ctx } = makeCtx();
    const res = await callTool(createAiTools(ctx), "get_workspace_overview", {});
    expect(res.ok).toBe(true);
    const r = res.result as { totalProjects: number; openProjects: number };
    expect(r.totalProjects).toBe(1);
    expect(r.openProjects).toBe(1);
  });

  it("get_project devuelve áreas con ids de checklists e ítems", async () => {
    const { ctx, project, cl } = makeCtx();
    const res = await callTool(createAiTools(ctx), "get_project", {
      projectId: project.id,
    });
    expect(res.ok).toBe(true);
    const detail = res.result as {
      areas: { checklists: { id: string; items: { id: string }[] }[] }[];
    };
    expect(detail.areas[0].checklists[0].id).toBe(cl.id);
    expect(detail.areas[0].checklists[0].items[0].id).toBe(cl.items[0].id);
  });

  it("list_tasks filtra por estado", async () => {
    const { ctx } = makeCtx();
    const tools = createAiTools(ctx);
    const todo = await callTool(tools, "list_tasks", { status: "todo" });
    const done = await callTool(tools, "list_tasks", { status: "done" });
    expect((todo.result as unknown[]).length).toBe(1);
    expect((done.result as unknown[]).length).toBe(0);
  });

  it("search_workspace encuentra tareas e ítems con ids para follow-up", async () => {
    const { ctx, project } = makeCtx();
    const res = await callTool(createAiTools(ctx), "search_workspace", {
      query: "deploy",
    });
    const matches = res.result as { kind: string; projectId?: string }[];
    expect(matches.some((m) => m.kind === "task" && m.projectId === project.id)).toBe(
      true,
    );
  });
});

describe("write tools", () => {
  it("create_task valida el área y llama a mutateProject", async () => {
    const { ctx, actions, project, area } = makeCtx();
    const tools = createAiTools(ctx);
    const res = await callTool(tools, "create_task", {
      projectId: project.id,
      title: "Nueva tarea",
      areaId: area.id,
      priority: "high",
    });
    expect(res.ok).toBe(true);
    expect(actions.mutateProject).toHaveBeenCalledOnce();
    const list = await callTool(tools, "list_tasks", { projectId: project.id });
    expect((list.result as { title: string }[]).map((t) => t.title)).toContain(
      "Nueva tarea",
    );
  });

  it("set_checklist_item marca el ítem vía mutateProject", async () => {
    const { ctx, actions, project, area, cl } = makeCtx();
    const res = await callTool(createAiTools(ctx), "set_checklist_item", {
      projectId: project.id,
      areaId: area.id,
      checklistId: cl.id,
      itemId: cl.items[0].id,
      done: true,
    });
    expect(res.ok).toBe(true);
    expect(actions.mutateProject).toHaveBeenCalledOnce();
    const updated = ctx
      .getData()
      .projects[0].areas[0].checklists[0].items[0];
    expect(updated.done).toBe(true);
  });

  it("update_project usa saveProject (dispara automatizaciones)", async () => {
    const { ctx, actions, project } = makeCtx();
    const res = await callTool(createAiTools(ctx), "update_project", {
      projectId: project.id,
      status: "done",
    });
    expect(res.ok).toBe(true);
    expect(actions.saveProject).toHaveBeenCalledOnce();
    expect(actions.saveProject.mock.calls[0][0].status).toBe("done");
  });

  it("los write tools exponen describeCall humano para la confirmación", () => {
    const { ctx, project } = makeCtx();
    const tools = createAiTools(ctx);
    for (const t of tools.filter((x) => x.mode === "write")) {
      expect(t.describeCall, `${t.name} sin describeCall`).toBeDefined();
    }
    const createTask = tools.find((t) => t.name === "create_task")!;
    expect(
      createTask.describeCall!({ projectId: project.id, title: "Probar" }),
    ).toContain(`Crear tarea "Probar" en el proyecto "Demo"`);
  });

  it("create_checklist_template genera ids/timestamps y llama a la acción", async () => {
    const { ctx, actions } = makeCtx();
    const tools = createAiTools(ctx);
    const res = await callTool(tools, "create_checklist_template", {
      name: "Checklist de lanzamiento",
      category: "Lanzamiento",
      items: [{ text: "Probar build", required: true }, { text: "Avisar al equipo" }],
    });
    expect(res.ok).toBe(true);
    expect(actions.createChecklistTemplate).toHaveBeenCalledOnce();
    const saved = ctx.getData().checklistTemplates[0];
    expect(saved.id).toBeTruthy();
    expect(saved.createdAt).toBeTruthy();
    expect(saved.items).toHaveLength(2);
    expect(saved.items[0].id).toBeTruthy();
    expect(saved.items[0].required).toBe(true);
    expect(saved.items[1].required).toBe(false);

    const empty = await callTool(tools, "create_checklist_template", {
      name: "Vacía",
      items: [],
    });
    expect(empty.ok).toBe(false);
    expect(empty.error).toContain("items");
  });

  it("create_process_template rellena details por defecto y genera ids de pasos", async () => {
    const { ctx, actions } = makeCtx();
    const res = await callTool(createAiTools(ctx), "create_process_template", {
      name: "SOP Publicación",
      steps: [{ text: "Redactar borrador" }, { text: "Revisar", details: "Con el PM" }],
    });
    expect(res.ok).toBe(true);
    expect(actions.createProcessTemplate).toHaveBeenCalledOnce();
    const saved = ctx.getData().processTemplates[0];
    expect(saved.steps[0].id).toBeTruthy();
    expect(saved.steps[0].details).toBe("");
    expect(saved.steps[1].details).toBe("Con el PM");
  });

  it("create_project_type valida ids de plantillas referenciadas", async () => {
    const { ctx } = makeCtx();
    const bad = await callTool(createAiTools(ctx), "create_project_type", {
      name: "Tipo roto",
      defaultAreas: [{ name: "Área X", checklistTemplateIds: ["nope"] }],
    });
    expect(bad.ok).toBe(false);
    expect(bad.error).toContain("nope");

    const tpl = newChecklistTemplate("Checklist QA");
    const seeded = makeCtx({ checklistTemplates: [tpl] });
    const res = await callTool(createAiTools(seeded.ctx), "create_project_type", {
      name: "Lanzamiento estándar",
      defaultAreas: [{ name: "QA", checklistTemplateIds: [tpl.id] }],
    });
    expect(res.ok).toBe(true);
    expect(seeded.actions.createProjectType).toHaveBeenCalledOnce();
    const saved = seeded.ctx.getData().projectTypes[0];
    expect(saved.statusWorkflow).toHaveLength(6);
    expect(saved.defaultAreas[0].icon).toBe("folder");
    expect(saved.defaultAreas[0].checklistTemplateIds).toEqual([tpl.id]);
  });

  it("update_product y delete_product completan el ciclo CRUD", async () => {
    const { ctx, actions, product } = makeCtx();
    const tools = createAiTools(ctx);
    const upd = await callTool(tools, "update_product", {
      productId: product.id,
      status: "maintenance",
    });
    expect(upd.ok).toBe(true);
    expect(actions.updateProduct).toHaveBeenCalledOnce();
    expect(ctx.getData().products[0].status).toBe("maintenance");

    const del = await callTool(tools, "delete_product", { productId: product.id });
    expect(del.ok).toBe(true);
    expect(ctx.getData().products).toHaveLength(0);

    const bad = await callTool(tools, "update_product", {
      productId: "nope",
      name: "x",
    });
    expect(bad.ok).toBe(false);
  });

  it("delete_project elimina el proyecto", async () => {
    const { ctx, actions, project } = makeCtx();
    const res = await callTool(createAiTools(ctx), "delete_project", {
      projectId: project.id,
    });
    expect(res.ok).toBe(true);
    expect(actions.deleteProject).toHaveBeenCalledWith(project.id);
    expect(ctx.getData().projects).toHaveLength(0);
  });

  it("update_area y delete_area operan vía mutateProject", async () => {
    const { ctx, actions, project, area } = makeCtx();
    const tools = createAiTools(ctx);
    const upd = await callTool(tools, "update_area", {
      projectId: project.id,
      areaId: area.id,
      name: "Lanzamiento v2",
      completed: true,
    });
    expect(upd.ok).toBe(true);
    const updatedArea = ctx.getData().projects[0].areas[0];
    expect(updatedArea.name).toBe("Lanzamiento v2");
    expect(updatedArea.completed).toBe(true);

    const del = await callTool(tools, "delete_area", {
      projectId: project.id,
      areaId: area.id,
    });
    expect(del.ok).toBe(true);
    expect(ctx.getData().projects[0].areas).toHaveLength(0);
    expect(actions.mutateProject).toHaveBeenCalledTimes(2);
  });

  it("add/update/remove_checklist_item completan el ciclo del ítem", async () => {
    const { ctx, project, area, cl } = makeCtx();
    const tools = createAiTools(ctx);
    const add = await callTool(tools, "add_checklist_item", {
      projectId: project.id,
      areaId: area.id,
      checklistId: cl.id,
      text: "Nuevo ítem",
    });
    expect(add.ok).toBe(true);
    const newItemId = (add.result as { item: { id: string } }).item.id;

    const upd = await callTool(tools, "update_checklist_item", {
      projectId: project.id,
      areaId: area.id,
      checklistId: cl.id,
      itemId: newItemId,
      text: "Ítem editado",
      done: true,
    });
    expect(upd.ok).toBe(true);
    const items = ctx.getData().projects[0].areas[0].checklists[0].items;
    expect(items.find((i) => i.id === newItemId)?.text).toBe("Ítem editado");
    expect(items.find((i) => i.id === newItemId)?.done).toBe(true);

    const rm = await callTool(tools, "remove_checklist_item", {
      projectId: project.id,
      areaId: area.id,
      checklistId: cl.id,
      itemId: newItemId,
    });
    expect(rm.ok).toBe(true);
    expect(
      ctx.getData().projects[0].areas[0].checklists[0].items.find(
        (i) => i.id === newItemId,
      ),
    ).toBeUndefined();
  });

  it("update_checklist_template y delete_checklist_template completan el ciclo", async () => {
    const tpl = newChecklistTemplate("Checklist QA");
    tpl.items = [{ id: "i1", text: "Paso 1", required: false }];
    const { ctx, actions } = makeCtx({ checklistTemplates: [tpl] });
    const tools = createAiTools(ctx);

    const upd = await callTool(tools, "update_checklist_template", {
      templateId: tpl.id,
      name: "Checklist QA v2",
      items: [{ text: "Paso único", required: true }],
    });
    expect(upd.ok).toBe(true);
    expect(actions.updateChecklistTemplate).toHaveBeenCalledOnce();
    const saved = ctx.getData().checklistTemplates[0];
    expect(saved.name).toBe("Checklist QA v2");
    expect(saved.items).toHaveLength(1);
    expect(saved.items[0].required).toBe(true);

    const del = await callTool(tools, "delete_checklist_template", {
      templateId: tpl.id,
    });
    expect(del.ok).toBe(true);
    expect(ctx.getData().checklistTemplates).toHaveLength(0);
  });

  it("update_project_type revalida ids y delete_project_type elimina", async () => {
    const tpl = newChecklistTemplate("Checklist QA");
    const type: ProjectType = {
      ...newProjectTypeFixture(),
    };
    const { ctx } = makeCtx({ checklistTemplates: [tpl], projectTypes: [type] });
    const tools = createAiTools(ctx);

    const bad = await callTool(tools, "update_project_type", {
      typeId: type.id,
      defaultAreas: [{ name: "Área rota", checklistTemplateIds: ["nope"] }],
    });
    expect(bad.ok).toBe(false);
    expect(bad.error).toContain("nope");

    const ok = await callTool(tools, "update_project_type", {
      typeId: type.id,
      name: "Tipo renombrado",
      defaultAreas: [{ name: "QA", checklistTemplateIds: [tpl.id] }],
    });
    expect(ok.ok).toBe(true);
    expect(ctx.getData().projectTypes[0].name).toBe("Tipo renombrado");

    const del = await callTool(tools, "delete_project_type", { typeId: type.id });
    expect(del.ok).toBe(true);
    expect(ctx.getData().projectTypes).toHaveLength(0);
  });

  it("create/update/delete_person completan el ciclo CRUD", async () => {
    const { ctx, actions } = makeCtx();
    const tools = createAiTools(ctx);
    const created = await callTool(tools, "create_person", { name: "Ana Pérez" });
    expect(created.ok).toBe(true);
    expect(actions.createPerson).toHaveBeenCalledOnce();
    const personId = (created.result as { id: string }).id;

    const upd = await callTool(tools, "update_person", {
      personId,
      roleTitle: "PM",
    });
    expect(upd.ok).toBe(true);
    expect(ctx.getData().people[0].roleTitle).toBe("PM");

    const del = await callTool(tools, "delete_person", { personId });
    expect(del.ok).toBe(true);
    expect(ctx.getData().people).toHaveLength(0);
  });

  it("create/update/delete_automation completan el ciclo CRUD", async () => {
    const { ctx, actions } = makeCtx();
    const tools = createAiTools(ctx);
    const created = await callTool(tools, "create_automation", {
      name: "Auto QA",
      trigger: { type: "checklist.completed" },
      actions: [{ type: "markAreaComplete" }],
    });
    expect(created.ok).toBe(true);
    expect(actions.createAutomation).toHaveBeenCalledOnce();
    const automationId = (created.result as { id: string }).id;

    const upd = await callTool(tools, "update_automation", {
      automationId,
      enabled: false,
    });
    expect(upd.ok).toBe(true);
    expect(ctx.getData().automations[0].enabled).toBe(false);

    const del = await callTool(tools, "delete_automation", { automationId });
    expect(del.ok).toBe(true);
    expect(ctx.getData().automations).toHaveLength(0);
  });

  it("create_notification, mark_notification_read y clear_notifications operan sobre el feed", async () => {
    const { ctx, actions } = makeCtx();
    const tools = createAiTools(ctx);
    const created = await callTool(tools, "create_notification", {
      type: "recommendation",
      message: "Proyecto estancado",
    });
    expect(created.ok).toBe(true);
    expect(actions.addNotifications).toHaveBeenCalledOnce();
    const notifId = (created.result as { id: string }).id;

    const marked = await callTool(tools, "mark_notification_read", {
      notificationId: notifId,
    });
    expect(marked.ok).toBe(true);
    expect(ctx.getData().notifications[0].read).toBe(true);

    const cleared = await callTool(tools, "clear_notifications", {});
    expect(cleared.ok).toBe(true);
    expect(ctx.getData().notifications).toHaveLength(0);
  });
});

function newProjectTypeFixture(): ProjectType {
  const ts = new Date().toISOString();
  return {
    id: "type-1",
    schemaVersion: 1,
    name: "Lanzamiento estándar",
    description: "",
    statusWorkflow: ["backlog", "active", "paused", "blocked", "done", "archived"],
    defaultAreas: [],
    defaultAutomationIds: [],
    createdAt: ts,
    updatedAt: ts,
  };
}
