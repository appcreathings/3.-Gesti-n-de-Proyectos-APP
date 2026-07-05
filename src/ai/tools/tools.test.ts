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
  type ChecklistTemplate,
  type ProcessTemplate,
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

  let projects = [project];
  const data: ToolData = {
    products: [product],
    projects,
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
      projects = projects.map((p) => (p.id === id ? recipe(p) : p));
      data.projects = projects;
    }),
    saveProject: vi.fn(async (p: Project) => {
      projects = projects.map((x) => (x.id === p.id ? p : x));
      data.projects = projects;
    }),
    createProject: vi.fn(async (p: Project) => {
      projects = [...projects, p];
      data.projects = projects;
    }),
    createProjectFromType: vi.fn(async () => null),
    createProduct: vi.fn(async () => undefined),
    createChecklistTemplate: vi.fn(async (t: ChecklistTemplate) => {
      data.checklistTemplates = [...data.checklistTemplates, t];
    }),
    createProcessTemplate: vi.fn(async (t: ProcessTemplate) => {
      data.processTemplates = [...data.processTemplates, t];
    }),
    createProjectType: vi.fn(async (t: ProjectType) => {
      data.projectTypes = [...data.projectTypes, t];
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
    expect(decls.length).toBeGreaterThanOrEqual(21);
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
});
