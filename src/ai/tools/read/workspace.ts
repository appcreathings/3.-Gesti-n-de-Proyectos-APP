import { z } from "zod";
import type { AiTool, ToolContext } from "./types";
import { defineTool } from "./types";
import { Health, ProductStatus, ProjectStatus } from "@/domain/schemas";
import { computePortfolio } from "@/features/dashboard/portfolio";
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
