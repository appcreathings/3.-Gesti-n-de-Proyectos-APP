import { z } from "zod";
import {
  newArea,
  newChecklistTemplate,
  newProcessTemplate,
  newProduct,
  newProject,
  newProjectType,
  newTask,
} from "@/domain/factories";
import * as ops from "@/domain/projectOps";
import { uuid } from "@/lib/utils";
import { Health, Priority, ProjectStatus, TaskStatus } from "@/domain/schemas";
import type { Project } from "@/domain/schemas";
import { projectSummary, taskView } from "./serializers";
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
  ];
}
