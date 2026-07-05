import { z } from "zod";
import { computePortfolio } from "@/features/dashboard/portfolio";
import { Health, ProductStatus, ProjectStatus, TaskStatus } from "@/domain/schemas";
import { daysUntil } from "@/domain/compute";
import {
  automationView,
  notificationView,
  personView,
  productView,
  projectDetail,
  projectSummary,
  taskView,
} from "./serializers";
import { defineTool, type AiTool, type ToolContext } from "./types";

/** Read-only tools: executed automatically, never require confirmation. */
export function createReadTools(ctx: ToolContext): AiTool[] {
  const { getData, getWorkspace } = ctx;

  return [
    defineTool({
      name: "get_workspace_overview",
      description:
        "Resumen del portafolio: KPIs (proyectos activos, avance medio, vencidos, por vencer, estancados), distribución por estado y salud, y rollup por producto. Úsalo para preguntas generales tipo '¿cómo va todo?'.",
      mode: "read",
      input: z.object({}),
      execute: () => {
        const ws = getWorkspace();
        const data = getData();
        const settings = ws?.settings ?? {
          theme: "system" as const,
          stalledAfterDays: 14,
          dueSoonDays: 7,
          deriveHealth: false,
        };
        const stats = computePortfolio(data.projects, data.products, settings, new Date());
        return {
          org: ws?.org.name ?? null,
          totalProjects: stats.total,
          openProjects: stats.active,
          avgChecklistProgressPct: stats.avgProgress,
          byStatus: stats.byStatus,
          byHealth: stats.byHealth,
          overdue: stats.overdue.map((r) => ({
            label: r.label,
            dueDate: r.dueDate,
            daysLate: -r.d,
            projectId: r.projectId,
          })),
          dueSoon: stats.dueSoon.map((r) => ({
            label: r.label,
            dueDate: r.dueDate,
            daysLeft: r.d,
            projectId: r.projectId,
          })),
          stalledProjects: stats.stalled.map((p) => ({ id: p.id, name: p.name })),
          byProduct: stats.byProduct,
        };
      },
    }),

    defineTool({
      name: "list_products",
      description: "Lista los productos del workspace, con filtro opcional por estado.",
      mode: "read",
      input: z.object({ status: ProductStatus.optional() }),
      execute: ({ status }) =>
        getData()
          .products.filter((p) => !status || p.status === status)
          .map(productView),
    }),

    defineTool({
      name: "list_projects",
      description:
        "Lista proyectos como resúmenes (estado, salud, avance, conteo de tareas). Filtros opcionales por estado, producto o salud.",
      mode: "read",
      input: z.object({
        status: ProjectStatus.optional(),
        productId: z.string().optional(),
        health: Health.optional(),
      }),
      execute: ({ status, productId, health }) =>
        getData()
          .projects.filter(
            (p) =>
              (!status || p.status === status) &&
              (!productId || p.productId === productId) &&
              (!health || p.health === health),
          )
          .map(projectSummary),
    }),

    defineTool({
      name: "get_project",
      description:
        "Detalle completo de un proyecto: áreas con checklists e ítems (con sus ids), procesos y tareas. Necesario antes de escrituras que requieren ids internos (áreas, checklists, ítems).",
      mode: "read",
      input: z.object({ projectId: z.string() }),
      execute: ({ projectId }) => {
        const data = getData();
        const p = data.projects.find((x) => x.id === projectId);
        if (!p) throw new Error(`Proyecto no encontrado: ${projectId}`);
        return projectDetail(p, data.people);
      },
    }),

    defineTool({
      name: "list_tasks",
      description:
        "Lista tareas de todos los proyectos (o de uno). Filtros: estado, responsable (nombre), solo vencidas.",
      mode: "read",
      input: z.object({
        projectId: z.string().optional(),
        status: TaskStatus.optional(),
        assignee: z.string().optional().describe("Nombre (o parte) del responsable"),
        overdueOnly: z.boolean().optional(),
      }),
      execute: ({ projectId, status, assignee, overdueOnly }) => {
        const data = getData();
        const projects = projectId
          ? data.projects.filter((p) => p.id === projectId)
          : data.projects;
        const out = [];
        for (const p of projects) {
          for (const t of p.tasks) {
            if (status && t.status !== status) continue;
            const view = taskView(t, p, data.people);
            if (
              assignee &&
              !(view.assignee ?? "").toLowerCase().includes(assignee.toLowerCase())
            )
              continue;
            if (overdueOnly) {
              const d = daysUntil(t.dueDate);
              if (t.status === "done" || d === null || d >= 0) continue;
            }
            out.push(view);
          }
        }
        return out;
      },
    }),

    defineTool({
      name: "list_project_types",
      description:
        "Lista los Tipos de Proyecto (blueprints con áreas y plantillas por defecto), usables con create_project_from_type.",
      mode: "read",
      input: z.object({}),
      execute: () =>
        getData().projectTypes.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          defaultAreas: t.defaultAreas.map((a) => a.name),
        })),
    }),

    defineTool({
      name: "list_templates",
      description: "Lista las plantillas de checklist y de proceso disponibles.",
      mode: "read",
      input: z.object({}),
      execute: () => {
        const data = getData();
        return {
          checklistTemplates: data.checklistTemplates.map((t) => ({
            id: t.id,
            name: t.name,
            category: t.category,
            itemCount: t.items.length,
          })),
          processTemplates: data.processTemplates.map((t) => ({
            id: t.id,
            name: t.name,
            category: t.category,
          })),
        };
      },
    }),

    defineTool({
      name: "list_people",
      description: "Lista las personas del workspace (para asignaciones y RACI).",
      mode: "read",
      input: z.object({}),
      execute: () => getData().people.map(personView),
    }),

    defineTool({
      name: "list_automations",
      description:
        "Lista las reglas de automatización (disparador → condición → acción). Con projectId, solo las que aplican a ese proyecto por su ámbito.",
      mode: "read",
      input: z.object({ projectId: z.string().optional() }),
      execute: ({ projectId }) => {
        const data = getData();
        const project = projectId
          ? data.projects.find((p) => p.id === projectId)
          : undefined;
        return data.automations
          .filter((r) => {
            if (!project) return true;
            switch (r.scope.kind) {
              case "global":
                return true;
              case "project":
                return r.scope.id === project.id;
              case "product":
                return r.scope.id === project.productId;
              case "type":
                return r.scope.id === project.typeId;
            }
          })
          .map(automationView);
      },
    }),

    defineTool({
      name: "list_notifications",
      description: "Lista las notificaciones del workspace, opcionalmente solo no leídas.",
      mode: "read",
      input: z.object({ unreadOnly: z.boolean().optional() }),
      execute: ({ unreadOnly }) =>
        getData()
          .notifications.filter((n) => !unreadOnly || !n.read)
          .map(notificationView),
    }),

    defineTool({
      name: "search_workspace",
      description:
        "Búsqueda por texto en proyectos, productos, tareas, ítems de checklist y plantillas. Devuelve coincidencias tipadas con ids para consultas de seguimiento.",
      mode: "read",
      input: z.object({ query: z.string().min(1) }),
      execute: ({ query }) => {
        const q = query.toLowerCase();
        const data = getData();
        const hit = (s: string | null | undefined) =>
          Boolean(s && s.toLowerCase().includes(q));
        const matches: Array<Record<string, unknown>> = [];

        for (const p of data.products) {
          if (hit(p.name) || hit(p.description))
            matches.push({ kind: "product", id: p.id, name: p.name });
        }
        for (const p of data.projects) {
          if (hit(p.name) || hit(p.description))
            matches.push({ kind: "project", id: p.id, name: p.name, status: p.status });
          for (const t of p.tasks) {
            if (hit(t.title))
              matches.push({
                kind: "task",
                id: t.id,
                title: t.title,
                status: t.status,
                projectId: p.id,
                projectName: p.name,
              });
          }
          for (const a of p.areas) {
            for (const c of a.checklists) {
              for (const i of c.items) {
                if (hit(i.text))
                  matches.push({
                    kind: "checklistItem",
                    id: i.id,
                    text: i.text,
                    done: i.done,
                    projectId: p.id,
                    areaId: a.id,
                    checklistId: c.id,
                    projectName: p.name,
                  });
              }
            }
          }
        }
        for (const t of data.checklistTemplates) {
          if (hit(t.name))
            matches.push({ kind: "checklistTemplate", id: t.id, name: t.name });
        }
        for (const t of data.projectTypes) {
          if (hit(t.name)) matches.push({ kind: "projectType", id: t.id, name: t.name });
        }
        return matches.slice(0, 50);
      },
    }),
  ];
}
