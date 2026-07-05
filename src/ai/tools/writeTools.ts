import { z } from "zod";
import {
  newArea,
  newAutomation,
  newChecklistTemplate,
  newItem,
  newPerson,
  newProcessTemplate,
  newProduct,
  newProject,
  newProjectType,
  newTask,
} from "@/domain/factories";
import * as ops from "@/domain/projectOps";
import { nowIso, uuid } from "@/lib/utils";
import {
  ActionSchema,
  ConditionSchema,
  EntityRefSchema,
  Health,
  Priority,
  ProductStatus,
  ProjectStatus,
  ScopeSchema,
  Severity,
  TaskStatus,
  TriggerSchema,
} from "@/domain/schemas";
import type { AutomationRule, Notification, Project } from "@/domain/schemas";
import {
  automationView,
  notificationView,
  personView,
  productView,
  projectSummary,
  taskView,
} from "./serializers";
import { defineTool, type AiTool, type ToolContext } from "./types";

const DayDateInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato requerido: YYYY-MM-DD");

/**
 * Write tools: mutate data through the store's own actions (so automations
 * fire, the index is rebuilt and everything persists via the StorageAdapter).
 * The chat UI asks the user for confirmation before executing these.
 */
export function createWriteTools(ctx: ToolContext): AiTool[] {
  const { getData, actions } = ctx;

  function requireProject(projectId: string): Project {
    const p = getData().projects.find((x) => x.id === projectId);
    if (!p) throw new Error(`Proyecto no encontrado: ${projectId}`);
    return p;
  }

  const projectName = (id: string) =>
    getData().projects.find((p) => p.id === id)?.name ?? id;

  function requireProduct(productId: string) {
    const p = getData().products.find((x) => x.id === productId);
    if (!p) throw new Error(`Producto no encontrado: ${productId}`);
    return p;
  }
  const productName = (id: string) =>
    getData().products.find((p) => p.id === id)?.name ?? id;

  function areaLabel(projectId: string, areaId: string) {
    return (
      getData()
        .projects.find((p) => p.id === projectId)
        ?.areas.find((a) => a.id === areaId)?.name ?? areaId
    );
  }

  function requireChecklistTemplate(templateId: string) {
    const t = getData().checklistTemplates.find((x) => x.id === templateId);
    if (!t) throw new Error(`Plantilla de checklist no encontrada: ${templateId}`);
    return t;
  }
  function requireProcessTemplate(templateId: string) {
    const t = getData().processTemplates.find((x) => x.id === templateId);
    if (!t) throw new Error(`Plantilla de proceso no encontrada: ${templateId}`);
    return t;
  }
  const checklistTemplateName = (id: string) =>
    getData().checklistTemplates.find((t) => t.id === id)?.name ?? id;
  const processTemplateName = (id: string) =>
    getData().processTemplates.find((t) => t.id === id)?.name ?? id;

  function requireProjectType(typeId: string) {
    const t = getData().projectTypes.find((x) => x.id === typeId);
    if (!t) throw new Error(`Tipo de proyecto no encontrado: ${typeId}`);
    return t;
  }
  const typeName = (id: string) =>
    getData().projectTypes.find((t) => t.id === id)?.name ?? id;

  function requirePerson(personId: string) {
    const p = getData().people.find((x) => x.id === personId);
    if (!p) throw new Error(`Persona no encontrada: ${personId}`);
    return p;
  }
  const personLabel = (id: string) =>
    getData().people.find((p) => p.id === id)?.name ?? id;

  function requireAutomation(automationId: string) {
    const r = getData().automations.find((x) => x.id === automationId);
    if (!r) throw new Error(`Automatización no encontrada: ${automationId}`);
    return r;
  }
  const automationName = (id: string) =>
    getData().automations.find((r) => r.id === id)?.name ?? id;

  return [
    defineTool({
      name: "create_task",
      description:
        "Crea una tarea en el Kanban de un proyecto. areaId y assigneeId son opcionales (usa get_project / list_people para obtenerlos).",
      mode: "write",
      input: z.object({
        projectId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        status: TaskStatus.optional(),
        priority: Priority.optional(),
        areaId: z.string().optional(),
        assigneeId: z.string().optional(),
        dueDate: DayDateInput.optional(),
      }),
      describeCall: (a) =>
        `Crear tarea "${a.title}" en el proyecto "${projectName(a.projectId)}"`,
      execute: async (a) => {
        const project = requireProject(a.projectId);
        if (a.areaId && !project.areas.some((x) => x.id === a.areaId))
          throw new Error(`Área no encontrada: ${a.areaId}`);
        const task = newTask(a.title, a.areaId ?? null);
        if (a.description) task.description = a.description;
        if (a.status) task.status = a.status;
        if (a.priority) task.priority = a.priority;
        if (a.assigneeId) task.assigneeId = a.assigneeId;
        if (a.dueDate) task.dueDate = a.dueDate;
        await actions.mutateProject(a.projectId, (p) => ops.addTask(p, task));
        return taskView(task, requireProject(a.projectId), getData().people);
      },
    }),

    defineTool({
      name: "update_task",
      description:
        "Actualiza campos de una tarea existente (estado, prioridad, fecha, responsable, título, descripción).",
      mode: "write",
      input: z.object({
        projectId: z.string(),
        taskId: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: TaskStatus.optional(),
        priority: Priority.optional(),
        assigneeId: z.string().nullable().optional(),
        dueDate: DayDateInput.nullable().optional(),
      }),
      describeCall: (a) => {
        const t = getData()
          .projects.find((p) => p.id === a.projectId)
          ?.tasks.find((x) => x.id === a.taskId);
        const changes = [
          a.status && `estado → ${a.status}`,
          a.priority && `prioridad → ${a.priority}`,
          a.dueDate !== undefined && `fecha → ${a.dueDate ?? "sin fecha"}`,
          a.title && `título → "${a.title}"`,
        ]
          .filter(Boolean)
          .join(", ");
        return `Actualizar tarea "${t?.title ?? a.taskId}" (${changes || "cambios"})`;
      },
      execute: async (a) => {
        const project = requireProject(a.projectId);
        const task = project.tasks.find((t) => t.id === a.taskId);
        if (!task) throw new Error(`Tarea no encontrada: ${a.taskId}`);
        const next = {
          ...task,
          ...(a.title !== undefined && { title: a.title }),
          ...(a.description !== undefined && { description: a.description }),
          ...(a.status !== undefined && { status: a.status }),
          ...(a.priority !== undefined && { priority: a.priority }),
          ...(a.assigneeId !== undefined && { assigneeId: a.assigneeId }),
          ...(a.dueDate !== undefined && { dueDate: a.dueDate }),
        };
        await actions.mutateProject(a.projectId, (p) => ops.updateTask(p, next));
        return taskView(next, requireProject(a.projectId), getData().people);
      },
    }),

    defineTool({
      name: "set_checklist_item",
      description:
        "Marca o desmarca un ítem de checklist. Usa get_project para obtener areaId, checklistId e itemId.",
      mode: "write",
      input: z.object({
        projectId: z.string(),
        areaId: z.string(),
        checklistId: z.string(),
        itemId: z.string(),
        done: z.boolean(),
      }),
      describeCall: (a) => {
        const p = getData().projects.find((x) => x.id === a.projectId);
        const item = p?.areas
          .find((x) => x.id === a.areaId)
          ?.checklists.find((c) => c.id === a.checklistId)
          ?.items.find((i) => i.id === a.itemId);
        return `${a.done ? "Marcar" : "Desmarcar"} el ítem "${item?.text ?? a.itemId}" en "${p?.name ?? a.projectId}"`;
      },
      execute: async (a) => {
        const project = requireProject(a.projectId);
        const item = project.areas
          .find((x) => x.id === a.areaId)
          ?.checklists.find((c) => c.id === a.checklistId)
          ?.items.find((i) => i.id === a.itemId);
        if (!item) throw new Error(`Ítem no encontrado: ${a.itemId}`);
        await actions.mutateProject(a.projectId, (p) =>
          ops.updateItem(p, a.areaId, a.checklistId, { ...item, done: a.done }),
        );
        return { ok: true, item: { id: item.id, text: item.text, done: a.done } };
      },
    }),

    defineTool({
      name: "create_project",
      description:
        "Crea un proyecto vacío. Si existe un Tipo de Proyecto adecuado, prefiere create_project_from_type (despliega áreas, procesos y checklists).",
      mode: "write",
      input: z.object({
        name: z.string().min(1),
        productId: z.string().optional(),
        description: z.string().optional(),
        priority: Priority.optional(),
        dueDate: DayDateInput.optional(),
      }),
      describeCall: (a) => `Crear proyecto "${a.name}"`,
      execute: async (a) => {
        const project = newProject(a.name, a.productId ?? null);
        if (a.description) project.description = a.description;
        if (a.priority) project.priority = a.priority;
        if (a.dueDate) project.dueDate = a.dueDate;
        await actions.createProject(project);
        return projectSummary(project);
      },
    }),

    defineTool({
      name: "create_project_from_type",
      description:
        "Crea un proyecto instanciando un Tipo de Proyecto (despliega sus áreas, procesos y checklists por defecto). Usa list_project_types para ver los tipos.",
      mode: "write",
      input: z.object({
        typeId: z.string(),
        name: z.string().min(1),
        productId: z.string().optional(),
      }),
      describeCall: (a) => {
        const type = getData().projectTypes.find((t) => t.id === a.typeId);
        return `Crear proyecto "${a.name}" desde el tipo "${type?.name ?? a.typeId}"`;
      },
      execute: async (a) => {
        const id = await actions.createProjectFromType(
          a.typeId,
          a.name,
          a.productId ?? null,
        );
        if (!id) throw new Error(`Tipo de proyecto no encontrado: ${a.typeId}`);
        return projectSummary(requireProject(id));
      },
    }),

    defineTool({
      name: "update_project",
      description:
        "Actualiza campos de un proyecto (estado, salud, prioridad, fecha límite, descripción, nombre).",
      mode: "write",
      input: z.object({
        projectId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: ProjectStatus.optional(),
        health: Health.optional(),
        priority: Priority.optional(),
        dueDate: DayDateInput.nullable().optional(),
      }),
      describeCall: (a) => {
        const changes = [
          a.status && `estado → ${a.status}`,
          a.health && `salud → ${a.health}`,
          a.priority && `prioridad → ${a.priority}`,
          a.dueDate !== undefined && `fecha límite → ${a.dueDate ?? "sin fecha"}`,
          a.name && `nombre → "${a.name}"`,
        ]
          .filter(Boolean)
          .join(", ");
        return `Actualizar proyecto "${projectName(a.projectId)}" (${changes || "cambios"})`;
      },
      execute: async (a) => {
        const project = requireProject(a.projectId);
        const next = {
          ...project,
          ...(a.name !== undefined && { name: a.name }),
          ...(a.description !== undefined && { description: a.description }),
          ...(a.status !== undefined && { status: a.status }),
          ...(a.health !== undefined && { health: a.health }),
          ...(a.priority !== undefined && { priority: a.priority }),
          ...(a.dueDate !== undefined && { dueDate: a.dueDate }),
        };
        await actions.saveProject(next);
        return projectSummary(next);
      },
    }),

    defineTool({
      name: "add_area",
      description:
        "Añade un área a un proyecto (puede disparar automatizaciones de plantillas automáticas).",
      mode: "write",
      input: z.object({
        projectId: z.string(),
        name: z.string().min(1),
        icon: z.string().optional().describe("Nombre de icono lucide, p. ej. 'rocket'"),
      }),
      describeCall: (a) =>
        `Añadir área "${a.name}" al proyecto "${projectName(a.projectId)}"`,
      execute: async (a) => {
        requireProject(a.projectId);
        const area = newArea(a.name, a.icon ?? "folder");
        await actions.mutateProject(a.projectId, (p) => ops.addArea(p, area));
        return { ok: true, area: { id: area.id, name: area.name } };
      },
    }),

    defineTool({
      name: "create_product",
      description: "Crea un producto (contenedor de proyectos).",
      mode: "write",
      input: z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        vision: z.string().optional(),
      }),
      describeCall: (a) => `Crear producto "${a.name}"`,
      execute: async (a) => {
        const product = newProduct(a.name);
        if (a.description) product.description = a.description;
        if (a.vision) product.vision = a.vision;
        await actions.createProduct(product);
        return { ok: true, product: { id: product.id, name: product.name } };
      },
    }),

    defineTool({
      name: "create_checklist_template",
      description:
        "Crea una plantilla de checklist reutilizable (ítems verificables). Úsala para estandarizar controles repetibles; luego puede referenciarse desde un Tipo de Proyecto o instanciarse en áreas. Verifica con list_templates que no exista una similar.",
      mode: "write",
      input: z.object({
        name: z.string().min(1),
        category: z
          .string()
          .optional()
          .describe("Categoría libre, p. ej. 'Lanzamiento', 'QA'"),
        items: z
          .array(
            z.object({
              text: z.string().min(1),
              required: z.boolean().optional(),
            }),
          )
          .min(1),
        tags: z.array(z.string()).optional(),
      }),
      describeCall: (a) =>
        `Crear plantilla de checklist "${a.name}" con ${a.items.length} ítems`,
      execute: async (a) => {
        const tpl = newChecklistTemplate(a.name);
        if (a.category) tpl.category = a.category;
        if (a.tags) tpl.tags = a.tags;
        tpl.items = a.items.map((i) => ({
          id: uuid(),
          text: i.text,
          required: i.required ?? false,
        }));
        await actions.createChecklistTemplate(tpl);
        return {
          ok: true,
          template: { id: tpl.id, name: tpl.name, itemCount: tpl.items.length },
        };
      },
    }),

    defineTool({
      name: "create_process_template",
      description:
        "Crea una plantilla de proceso (SOP) con pasos ordenados. Cada paso puede llevar detalles de ejecución. Referénciala desde un Tipo de Proyecto o instánciala en áreas.",
      mode: "write",
      input: z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        steps: z
          .array(
            z.object({
              text: z.string().min(1),
              details: z.string().optional(),
            }),
          )
          .min(1)
          .describe("Pasos en orden de ejecución"),
      }),
      describeCall: (a) =>
        `Crear plantilla de proceso "${a.name}" con ${a.steps.length} pasos`,
      execute: async (a) => {
        const tpl = newProcessTemplate(a.name);
        if (a.description) tpl.description = a.description;
        if (a.category) tpl.category = a.category;
        tpl.steps = a.steps.map((s) => ({
          id: uuid(),
          text: s.text,
          details: s.details ?? "",
        }));
        await actions.createProcessTemplate(tpl);
        return {
          ok: true,
          template: { id: tpl.id, name: tpl.name, stepCount: tpl.steps.length },
        };
      },
    }),

    defineTool({
      name: "create_project_type",
      description:
        "Crea un Tipo de Proyecto (blueprint) con áreas por defecto que referencian plantillas de checklist y proceso EXISTENTES por id (usa list_templates o crea las plantillas primero). Después instáncialo con create_project_from_type.",
      mode: "write",
      input: z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        statusWorkflow: z
          .array(ProjectStatus)
          .min(1)
          .optional()
          .describe("Opcional; por defecto el flujo completo backlog→archived"),
        defaultAreas: z
          .array(
            z.object({
              name: z.string().min(1),
              icon: z
                .string()
                .optional()
                .describe("Nombre de icono lucide, p. ej. 'rocket'"),
              checklistTemplateIds: z.array(z.string()).optional(),
              processTemplateIds: z.array(z.string()).optional(),
            }),
          )
          .min(1),
      }),
      describeCall: (a) =>
        `Crear tipo de proyecto "${a.name}" con ${a.defaultAreas.length} áreas por defecto`,
      execute: async (a) => {
        const data = getData();
        const clIds = new Set(data.checklistTemplates.map((t) => t.id));
        const prIds = new Set(data.processTemplates.map((t) => t.id));
        for (const area of a.defaultAreas) {
          for (const id of area.checklistTemplateIds ?? [])
            if (!clIds.has(id))
              throw new Error(
                `Plantilla de checklist no encontrada: ${id} (área "${area.name}")`,
              );
          for (const id of area.processTemplateIds ?? [])
            if (!prIds.has(id))
              throw new Error(
                `Plantilla de proceso no encontrada: ${id} (área "${area.name}")`,
              );
        }
        const type = newProjectType(a.name);
        if (a.description) type.description = a.description;
        if (a.statusWorkflow) type.statusWorkflow = a.statusWorkflow;
        type.defaultAreas = a.defaultAreas.map((area) => ({
          name: area.name,
          icon: area.icon ?? "folder",
          checklistTemplateIds: area.checklistTemplateIds ?? [],
          processTemplateIds: area.processTemplateIds ?? [],
        }));
        await actions.createProjectType(type);
        return {
          ok: true,
          projectType: {
            id: type.id,
            name: type.name,
            defaultAreas: type.defaultAreas.map((x) => x.name),
          },
        };
      },
    }),

    // --- Producto: update/delete ---

    defineTool({
      name: "update_product",
      description: "Actualiza campos de un producto (nombre, descripción, visión, estado).",
      mode: "write",
      input: z.object({
        productId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        vision: z.string().optional(),
        status: ProductStatus.optional(),
      }),
      describeCall: (a) => {
        const changes = [a.name && `nombre → "${a.name}"`, a.status && `estado → ${a.status}`]
          .filter(Boolean)
          .join(", ");
        return `Actualizar producto "${productName(a.productId)}" (${changes || "cambios"})`;
      },
      execute: async (a) => {
        const product = requireProduct(a.productId);
        const next = {
          ...product,
          ...(a.name !== undefined && { name: a.name }),
          ...(a.description !== undefined && { description: a.description }),
          ...(a.vision !== undefined && { vision: a.vision }),
          ...(a.status !== undefined && { status: a.status }),
        };
        await actions.updateProduct(next);
        return productView(next);
      },
    }),

    defineTool({
      name: "delete_product",
      description:
        "Elimina un producto. Los proyectos asociados no se eliminan, quedan sin producto asignado. Requiere confirmación.",
      mode: "write",
      input: z.object({ productId: z.string() }),
      describeCall: (a) =>
        `Eliminar el producto "${productName(a.productId)}" (los proyectos asociados quedarán sin producto)`,
      execute: async (a) => {
        requireProduct(a.productId);
        await actions.deleteProduct(a.productId);
        return { ok: true };
      },
    }),

    // --- Proyecto: delete ---

    defineTool({
      name: "delete_project",
      description:
        "Elimina un proyecto completo, incluidas sus áreas, procesos, checklists y tareas. Acción irreversible; requiere confirmación explícita del usuario, nunca la asumas.",
      mode: "write",
      input: z.object({ projectId: z.string() }),
      describeCall: (a) =>
        `Eliminar el proyecto "${projectName(a.projectId)}" y todo su contenido (áreas, checklists, tareas)`,
      execute: async (a) => {
        requireProject(a.projectId);
        await actions.deleteProject(a.projectId);
        return { ok: true };
      },
    }),

    // --- Área: update/delete ---

    defineTool({
      name: "update_area",
      description:
        "Actualiza campos de un área (nombre, icono, responsable, completada). Usa get_project para obtener areaId.",
      mode: "write",
      input: z.object({
        projectId: z.string(),
        areaId: z.string(),
        name: z.string().optional(),
        icon: z.string().optional(),
        ownerId: z.string().nullable().optional(),
        completed: z.boolean().optional(),
      }),
      describeCall: (a) =>
        `Actualizar área "${areaLabel(a.projectId, a.areaId)}" en "${projectName(a.projectId)}"`,
      execute: async (a) => {
        const project = requireProject(a.projectId);
        const area = project.areas.find((x) => x.id === a.areaId);
        if (!area) throw new Error(`Área no encontrada: ${a.areaId}`);
        const next = {
          ...area,
          ...(a.name !== undefined && { name: a.name }),
          ...(a.icon !== undefined && { icon: a.icon }),
          ...(a.ownerId !== undefined && { ownerId: a.ownerId }),
          ...(a.completed !== undefined && { completed: a.completed }),
        };
        await actions.mutateProject(a.projectId, (p) => ops.updateArea(p, next));
        return { ok: true, area: { id: next.id, name: next.name, completed: next.completed } };
      },
    }),

    defineTool({
      name: "delete_area",
      description:
        "Elimina un área de un proyecto junto con sus procesos y checklists. Requiere confirmación.",
      mode: "write",
      input: z.object({ projectId: z.string(), areaId: z.string() }),
      describeCall: (a) =>
        `Eliminar el área "${areaLabel(a.projectId, a.areaId)}" (y sus procesos/checklists) de "${projectName(a.projectId)}"`,
      execute: async (a) => {
        requireProject(a.projectId);
        await actions.mutateProject(a.projectId, (p) => ops.removeArea(p, a.areaId));
        return { ok: true };
      },
    }),

    // --- Ítem de checklist: edición completa (set_checklist_item solo togglea done) ---

    defineTool({
      name: "add_checklist_item",
      description:
        "Añade un ítem a un checklist existente. Usa get_project para obtener areaId y checklistId.",
      mode: "write",
      input: z.object({
        projectId: z.string(),
        areaId: z.string(),
        checklistId: z.string(),
        text: z.string().min(1),
        required: z.boolean().optional(),
      }),
      describeCall: (a) => `Añadir ítem "${a.text}" al checklist en "${projectName(a.projectId)}"`,
      execute: async (a) => {
        requireProject(a.projectId);
        const item = newItem(a.text, a.required ?? false);
        await actions.mutateProject(a.projectId, (p) =>
          ops.addItem(p, a.areaId, a.checklistId, item),
        );
        return { ok: true, item: { id: item.id, text: item.text } };
      },
    }),

    defineTool({
      name: "update_checklist_item",
      description:
        "Actualiza un ítem de checklist (texto, obligatoriedad, estado, fecha, responsable, notas). Usa get_project para los ids.",
      mode: "write",
      input: z.object({
        projectId: z.string(),
        areaId: z.string(),
        checklistId: z.string(),
        itemId: z.string(),
        text: z.string().optional(),
        required: z.boolean().optional(),
        done: z.boolean().optional(),
        dueDate: DayDateInput.nullable().optional(),
        assigneeId: z.string().nullable().optional(),
        notes: z.string().optional(),
      }),
      describeCall: (a) => {
        const item = getData()
          .projects.find((p) => p.id === a.projectId)
          ?.areas.find((x) => x.id === a.areaId)
          ?.checklists.find((c) => c.id === a.checklistId)
          ?.items.find((i) => i.id === a.itemId);
        return `Actualizar ítem "${item?.text ?? a.itemId}" en "${projectName(a.projectId)}"`;
      },
      execute: async (a) => {
        const project = requireProject(a.projectId);
        const item = project.areas
          .find((x) => x.id === a.areaId)
          ?.checklists.find((c) => c.id === a.checklistId)
          ?.items.find((i) => i.id === a.itemId);
        if (!item) throw new Error(`Ítem no encontrado: ${a.itemId}`);
        const next = {
          ...item,
          ...(a.text !== undefined && { text: a.text }),
          ...(a.required !== undefined && { required: a.required }),
          ...(a.done !== undefined && { done: a.done }),
          ...(a.dueDate !== undefined && { dueDate: a.dueDate }),
          ...(a.assigneeId !== undefined && { assigneeId: a.assigneeId }),
          ...(a.notes !== undefined && { notes: a.notes }),
        };
        await actions.mutateProject(a.projectId, (p) =>
          ops.updateItem(p, a.areaId, a.checklistId, next),
        );
        return { ok: true, item: { id: next.id, text: next.text, done: next.done } };
      },
    }),

    defineTool({
      name: "remove_checklist_item",
      description: "Elimina un ítem de checklist. Requiere confirmación.",
      mode: "write",
      input: z.object({
        projectId: z.string(),
        areaId: z.string(),
        checklistId: z.string(),
        itemId: z.string(),
      }),
      describeCall: (a) => `Eliminar el ítem del checklist en "${projectName(a.projectId)}"`,
      execute: async (a) => {
        requireProject(a.projectId);
        await actions.mutateProject(a.projectId, (p) =>
          ops.removeItem(p, a.areaId, a.checklistId, a.itemId),
        );
        return { ok: true };
      },
    }),

    // --- Plantilla de checklist: update/delete ---

    defineTool({
      name: "update_checklist_template",
      description:
        "Actualiza una plantilla de checklist (nombre, categoría, tags). Si se provee items, reemplaza la lista completa.",
      mode: "write",
      input: z.object({
        templateId: z.string(),
        name: z.string().optional(),
        category: z.string().optional(),
        items: z
          .array(z.object({ text: z.string().min(1), required: z.boolean().optional() }))
          .optional(),
        tags: z.array(z.string()).optional(),
      }),
      describeCall: (a) =>
        `Actualizar plantilla de checklist "${checklistTemplateName(a.templateId)}"`,
      execute: async (a) => {
        const tpl = requireChecklistTemplate(a.templateId);
        const next = {
          ...tpl,
          ...(a.name !== undefined && { name: a.name }),
          ...(a.category !== undefined && { category: a.category }),
          ...(a.tags !== undefined && { tags: a.tags }),
          ...(a.items !== undefined && {
            items: a.items.map((i) => ({
              id: uuid(),
              text: i.text,
              required: i.required ?? false,
            })),
          }),
        };
        await actions.updateChecklistTemplate(next);
        return {
          ok: true,
          template: { id: next.id, name: next.name, itemCount: next.items.length },
        };
      },
    }),

    defineTool({
      name: "delete_checklist_template",
      description:
        "Elimina una plantilla de checklist. No afecta checklists ya instanciados en proyectos existentes. Requiere confirmación.",
      mode: "write",
      input: z.object({ templateId: z.string() }),
      describeCall: (a) =>
        `Eliminar la plantilla de checklist "${checklistTemplateName(a.templateId)}"`,
      execute: async (a) => {
        requireChecklistTemplate(a.templateId);
        await actions.deleteChecklistTemplate(a.templateId);
        return { ok: true };
      },
    }),

    // --- Plantilla de proceso: update/delete ---

    defineTool({
      name: "update_process_template",
      description:
        "Actualiza una plantilla de proceso (nombre, descripción, categoría). Si se provee steps, reemplaza la lista completa de pasos.",
      mode: "write",
      input: z.object({
        templateId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        steps: z
          .array(z.object({ text: z.string().min(1), details: z.string().optional() }))
          .optional(),
      }),
      describeCall: (a) =>
        `Actualizar plantilla de proceso "${processTemplateName(a.templateId)}"`,
      execute: async (a) => {
        const tpl = requireProcessTemplate(a.templateId);
        const next = {
          ...tpl,
          ...(a.name !== undefined && { name: a.name }),
          ...(a.description !== undefined && { description: a.description }),
          ...(a.category !== undefined && { category: a.category }),
          ...(a.steps !== undefined && {
            steps: a.steps.map((s) => ({
              id: uuid(),
              text: s.text,
              details: s.details ?? "",
            })),
          }),
        };
        await actions.updateProcessTemplate(next);
        return {
          ok: true,
          template: { id: next.id, name: next.name, stepCount: next.steps.length },
        };
      },
    }),

    defineTool({
      name: "delete_process_template",
      description:
        "Elimina una plantilla de proceso. No afecta procesos ya instanciados en proyectos existentes. Requiere confirmación.",
      mode: "write",
      input: z.object({ templateId: z.string() }),
      describeCall: (a) => `Eliminar la plantilla de proceso "${processTemplateName(a.templateId)}"`,
      execute: async (a) => {
        requireProcessTemplate(a.templateId);
        await actions.deleteProcessTemplate(a.templateId);
        return { ok: true };
      },
    }),

    // --- Tipo de proyecto: update/delete ---

    defineTool({
      name: "update_project_type",
      description:
        "Actualiza un Tipo de Proyecto (nombre, descripción, flujo de estados, áreas por defecto). Si se provee defaultAreas, revalida que las plantillas referenciadas existan y reemplaza la lista completa.",
      mode: "write",
      input: z.object({
        typeId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        statusWorkflow: z.array(ProjectStatus).min(1).optional(),
        defaultAreas: z
          .array(
            z.object({
              name: z.string().min(1),
              icon: z.string().optional(),
              checklistTemplateIds: z.array(z.string()).optional(),
              processTemplateIds: z.array(z.string()).optional(),
            }),
          )
          .min(1)
          .optional(),
      }),
      describeCall: (a) => `Actualizar tipo de proyecto "${typeName(a.typeId)}"`,
      execute: async (a) => {
        const type = requireProjectType(a.typeId);
        if (a.defaultAreas) {
          const data = getData();
          const clIds = new Set(data.checklistTemplates.map((t) => t.id));
          const prIds = new Set(data.processTemplates.map((t) => t.id));
          for (const area of a.defaultAreas) {
            for (const id of area.checklistTemplateIds ?? [])
              if (!clIds.has(id))
                throw new Error(
                  `Plantilla de checklist no encontrada: ${id} (área "${area.name}")`,
                );
            for (const id of area.processTemplateIds ?? [])
              if (!prIds.has(id))
                throw new Error(
                  `Plantilla de proceso no encontrada: ${id} (área "${area.name}")`,
                );
          }
        }
        const next = {
          ...type,
          ...(a.name !== undefined && { name: a.name }),
          ...(a.description !== undefined && { description: a.description }),
          ...(a.statusWorkflow !== undefined && { statusWorkflow: a.statusWorkflow }),
          ...(a.defaultAreas !== undefined && {
            defaultAreas: a.defaultAreas.map((area) => ({
              name: area.name,
              icon: area.icon ?? "folder",
              checklistTemplateIds: area.checklistTemplateIds ?? [],
              processTemplateIds: area.processTemplateIds ?? [],
            })),
          }),
        };
        await actions.updateProjectType(next);
        return {
          ok: true,
          projectType: {
            id: next.id,
            name: next.name,
            defaultAreas: next.defaultAreas.map((x) => x.name),
          },
        };
      },
    }),

    defineTool({
      name: "delete_project_type",
      description:
        "Elimina un Tipo de Proyecto. No afecta proyectos ya creados a partir de él. Requiere confirmación.",
      mode: "write",
      input: z.object({ typeId: z.string() }),
      describeCall: (a) => `Eliminar el tipo de proyecto "${typeName(a.typeId)}"`,
      execute: async (a) => {
        requireProjectType(a.typeId);
        await actions.deleteProjectType(a.typeId);
        return { ok: true };
      },
    }),

    // --- Persona: create/update/delete ---

    defineTool({
      name: "create_person",
      description: "Crea una persona para asignaciones de tareas y roles RACI.",
      mode: "write",
      input: z.object({
        name: z.string().min(1),
        email: z.string().optional(),
        roleTitle: z.string().optional(),
      }),
      describeCall: (a) => `Crear persona "${a.name}"`,
      execute: async (a) => {
        const person = newPerson(a.name);
        if (a.email) person.email = a.email;
        if (a.roleTitle) person.roleTitle = a.roleTitle;
        await actions.createPerson(person);
        return personView(person);
      },
    }),

    defineTool({
      name: "update_person",
      description: "Actualiza los datos de una persona (nombre, email, rol).",
      mode: "write",
      input: z.object({
        personId: z.string(),
        name: z.string().optional(),
        email: z.string().optional(),
        roleTitle: z.string().optional(),
      }),
      describeCall: (a) => `Actualizar persona "${personLabel(a.personId)}"`,
      execute: async (a) => {
        const person = requirePerson(a.personId);
        const next = {
          ...person,
          ...(a.name !== undefined && { name: a.name }),
          ...(a.email !== undefined && { email: a.email }),
          ...(a.roleTitle !== undefined && { roleTitle: a.roleTitle }),
        };
        await actions.updatePerson(next);
        return personView(next);
      },
    }),

    defineTool({
      name: "delete_person",
      description:
        "Elimina una persona. No reasigna automáticamente sus tareas o roles RACI existentes. Requiere confirmación.",
      mode: "write",
      input: z.object({ personId: z.string() }),
      describeCall: (a) => `Eliminar la persona "${personLabel(a.personId)}"`,
      execute: async (a) => {
        requirePerson(a.personId);
        await actions.deletePerson(a.personId);
        return { ok: true };
      },
    }),

    // --- Automatización: create/update/delete ---

    defineTool({
      name: "create_automation",
      description:
        "Crea una regla de automatización (disparador → condiciones → acciones). Usa list_automations para revisar reglas existentes y evitar duplicados.",
      mode: "write",
      input: z.object({
        name: z.string().min(1),
        enabled: z.boolean().optional(),
        scope: ScopeSchema.optional().describe("Por defecto ámbito global"),
        trigger: TriggerSchema,
        conditions: z.array(ConditionSchema).optional(),
        actions: z.array(ActionSchema).min(1),
      }),
      describeCall: (a) => `Crear automatización "${a.name}" (disparador: ${a.trigger.type})`,
      execute: async (a) => {
        const rule: AutomationRule = newAutomation(a.name);
        if (a.enabled !== undefined) rule.enabled = a.enabled;
        if (a.scope) rule.scope = a.scope;
        rule.trigger = a.trigger;
        if (a.conditions) rule.conditions = a.conditions;
        rule.actions = a.actions;
        await actions.createAutomation(rule);
        return automationView(rule);
      },
    }),

    defineTool({
      name: "update_automation",
      description:
        "Actualiza una regla de automatización existente (nombre, activa/inactiva, ámbito, disparador, condiciones, acciones).",
      mode: "write",
      input: z.object({
        automationId: z.string(),
        name: z.string().optional(),
        enabled: z.boolean().optional(),
        scope: ScopeSchema.optional(),
        trigger: TriggerSchema.optional(),
        conditions: z.array(ConditionSchema).optional(),
        actions: z.array(ActionSchema).min(1).optional(),
      }),
      describeCall: (a) => `Actualizar automatización "${automationName(a.automationId)}"`,
      execute: async (a) => {
        const rule = requireAutomation(a.automationId);
        const next = {
          ...rule,
          ...(a.name !== undefined && { name: a.name }),
          ...(a.enabled !== undefined && { enabled: a.enabled }),
          ...(a.scope !== undefined && { scope: a.scope }),
          ...(a.trigger !== undefined && { trigger: a.trigger }),
          ...(a.conditions !== undefined && { conditions: a.conditions }),
          ...(a.actions !== undefined && { actions: a.actions }),
        };
        await actions.updateAutomation(next);
        return automationView(next);
      },
    }),

    defineTool({
      name: "delete_automation",
      description: "Elimina una regla de automatización. Requiere confirmación.",
      mode: "write",
      input: z.object({ automationId: z.string() }),
      describeCall: (a) => `Eliminar la automatización "${automationName(a.automationId)}"`,
      execute: async (a) => {
        requireAutomation(a.automationId);
        await actions.deleteAutomation(a.automationId);
        return { ok: true };
      },
    }),

    // --- Notificaciones ---

    defineTool({
      name: "create_notification",
      description:
        "Crea una notificación manual (p. ej. para registrar una recomendación o alerta accionable). Usa list_notifications antes para evitar duplicados.",
      mode: "write",
      input: z.object({
        type: z.string().min(1),
        message: z.string().min(1),
        severity: Severity.optional(),
        entityRef: EntityRefSchema.optional(),
      }),
      describeCall: (a) => `Crear notificación: "${a.message}"`,
      execute: async (a) => {
        const notification: Notification = {
          id: uuid(),
          type: a.type,
          severity: a.severity ?? "info",
          message: a.message,
          entityRef: a.entityRef ?? null,
          read: false,
          createdAt: nowIso(),
        };
        await actions.addNotifications([notification]);
        return notificationView(notification);
      },
    }),

    defineTool({
      name: "mark_notification_read",
      description: "Marca una notificación como leída.",
      mode: "write",
      input: z.object({ notificationId: z.string() }),
      describeCall: (a) => `Marcar como leída la notificación ${a.notificationId}`,
      execute: async (a) => {
        const exists = getData().notifications.some((n) => n.id === a.notificationId);
        if (!exists) throw new Error(`Notificación no encontrada: ${a.notificationId}`);
        await actions.markNotificationRead(a.notificationId);
        return { ok: true };
      },
    }),

    defineTool({
      name: "clear_notifications",
      description: "Elimina todas las notificaciones del workspace. Requiere confirmación.",
      mode: "write",
      input: z.object({}),
      describeCall: () => `Eliminar todas las notificaciones`,
      execute: async () => {
        await actions.clearNotifications();
        return { ok: true };
      },
    }),
  ];
}
