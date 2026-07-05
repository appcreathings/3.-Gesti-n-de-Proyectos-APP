import { z } from "zod";
import { defineTool, type AiTool, type ToolContext } from "../types";

export function createTemplateReadTools(ctx: ToolContext): AiTool[] {
  const { getData } = ctx;
  return [
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
  ];
}
