import type { ToolContext } from "./types";

/**
 * Shared resolvers for writeTool descriptions ("describeCall"). Centralized here
 * so each per-domain write tool module stays small and consistent.
 */
export function projectName(ctx: ToolContext, id: string): string {
  return ctx.getData().projects.find((p) => p.id === id)?.name ?? id;
}

export function productName(ctx: ToolContext, id: string): string {
  return ctx.getData().products.find((p) => p.id === id)?.name ?? id;
}

export function checklistTemplateName(ctx: ToolContext, id: string): string {
  return ctx.getData().checklistTemplates.find((t) => t.id === id)?.name ?? id;
}

export function processTemplateName(ctx: ToolContext, id: string): string {
  return ctx.getData().processTemplates.find((t) => t.id === id)?.name ?? id;
}

export function typeName(ctx: ToolContext, id: string): string {
  return ctx.getData().projectTypes.find((t) => t.id === id)?.name ?? id;
}

export function personLabel(ctx: ToolContext, id: string): string {
  return ctx.getData().people.find((p) => p.id === id)?.name ?? id;
}

export function automationName(ctx: ToolContext, id: string): string {
  return ctx.getData().automations.find((r) => r.id === id)?.name ?? id;
}

export function areaLabel(
  ctx: ToolContext,
  projectId: string,
  areaId: string,
): string {
  return (
    ctx
      .getData()
      .projects.find((p) => p.id === projectId)
      ?.areas.find((a) => a.id === areaId)?.name ?? areaId
  );
}
