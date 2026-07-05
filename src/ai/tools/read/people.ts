import { z } from "zod";
import { personView } from "../serializers";
import { defineTool, type AiTool, type ToolContext } from "../types";

export function createPeopleReadTools(ctx: ToolContext): AiTool[] {
  const { getData } = ctx;
  return [
    defineTool({
      name: "list_people",
      description: "Lista las personas del workspace (para asignaciones y RACI).",
      mode: "read",
      input: z.object({}),
      execute: () => getData().people.map(personView),
    }),
  ];
}
