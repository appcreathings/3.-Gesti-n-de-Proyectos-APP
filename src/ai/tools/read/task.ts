import { z } from "zod";
import { TaskStatus } from "@/domain/schemas";
import { daysUntil } from "@/domain/compute";
import { taskView } from "../serializers";
import { defineTool, type AiTool, type ToolContext } from "../types";

export function createTaskReadTools(ctx: ToolContext): AiTool[] {
  const { getData } = ctx;
  return [
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
  ];
}
