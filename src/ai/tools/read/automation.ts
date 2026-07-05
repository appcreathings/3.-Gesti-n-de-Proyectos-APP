import { z } from "zod";
import { automationView } from "../serializers";
import { defineTool, type AiTool, type ToolContext } from "../types";

export function createAutomationReadTools(ctx: ToolContext): AiTool[] {
  const { getData } = ctx;
  return [
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
  ];
}
