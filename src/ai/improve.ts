import { z } from "zod";
import { createClient } from "@/ai/gemini/client";
import { classifyAiError } from "@/ai/gemini/errors";
import { rateLimiter } from "@/ai/rateLimiter";
import type { AiErrorKind } from "@/ai/gemini/errors";

export const SUGGESTION_FIELDS = [
  "name",
  "description",
  "status",
  "priority",
  "title",
  "steps",
  "notes",
  "category",
  "icon",
  "text",
  "areas",
  "ownerId",
  "assigneeId",
  "dueDate",
  "startDate",
] as const;
export type SuggestionField = (typeof SUGGESTION_FIELDS)[number];

export const FieldSuggestionSchema = z.object({
  field: z.string(),
  originalValue: z.unknown(),
  suggestedValue: z.unknown(),
  reason: z.string(),
});
export type FieldSuggestion = z.infer<typeof FieldSuggestionSchema>;

export const AiImproveResultSchema = z.object({
  suggestions: z.array(FieldSuggestionSchema),
  summary: z.string(),
});
export type AiImproveResult = z.infer<typeof AiImproveResultSchema>;

export type EntityType =
  | "project"
  | "task"
  | "process"
  | "area"
  | "checklist-item"
  | "checklist-template"
  | "process-template"
  | "project-type";

export interface ImproveOptions {
  apiKey: string;
  model?: string;
  entityType: EntityType;
  fields: Record<string, unknown>;
  signal?: AbortSignal;
}

export type ImproveResult =
  { ok: true; data: AiImproveResult } | { ok: false; error: AiErrorKind };

export function parseImproveResponse(text: string): ImproveResult {
  if (!text.trim()) {
    return { ok: false, error: "unknown" };
  }

  try {
    const cleaned = text.replace(/```(?:json)?\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const validated = AiImproveResultSchema.safeParse(parsed);

    if (!validated.success) {
      return { ok: false, error: "unknown" };
    }

    return { ok: true, data: validated.data };
  } catch {
    return { ok: false, error: "unknown" };
  }
}

const SYSTEM_PROMPT = `Eres un experto en gestión de proyectos con excelente redacción profesional.
Tu tarea es revisar datos de una entidad y sugerir mejoras concretas.

Reglas:
1. Solo sugiere cambios que aporten valor real — nada de reemplazar "Hola" por "Saludo"
2. Si un campo de texto está vacío y hay contexto suficiente para llenarlo, genera contenido relevante
3. Si fechas (start/due) están ausentes y el contexto permite sugerirlas, proponlas
4. NO sugieras cambios directos sobre arrays (pasos, ítems, áreas). Úsalos como contexto para sugerir mejoras en campos de texto como descripción o notas.
5. Para campos de selección como status/priority/icon, usa exactamente los valores permitidos originales (p. ej. "high", "medium", "low" para prioridad).
6. Respeta el idioma español — las sugerencias deben ser en español
7. Responde ÚNICAMENTE con JSON válido. Sin markdown, sin \`\`\`, sin texto adicional.`;

export function buildImprovePrompt(
  entityType: EntityType,
  fields: Record<string, unknown>,
): string {
  const labels: Record<EntityType, string> = {
    project: "proyecto",
    task: "tarea",
    process: "proceso (SOP)",
    area: "área",
    "checklist-item": "ítem de checklist",
    "checklist-template": "plantilla de checklist",
    "process-template": "plantilla de proceso",
    "project-type": "tipo de proyecto",
  };

  return `Datos del ${labels[entityType]}:\n${JSON.stringify(fields, null, 2)}\n\nFormato de respuesta JSON:\n{\n  "suggestions": [{ "field": "nombre_campo", "originalValue": "valor actual", "suggestedValue": "valor sugerido", "reason": "por qué" }],\n  "summary": "resumen de cambios"}`;
}

export async function runImprove(options: ImproveOptions): Promise<ImproveResult> {
  const { apiKey, model = "gemini-2.5-flash", entityType, fields, signal } = options;

  const ai = await createClient(apiKey);
  const prompt = buildImprovePrompt(entityType, fields);

  if (!rateLimiter.canMakeRequest(model)) {
    return { ok: false, error: "rate-limit" };
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        abortSignal: signal,
      },
    });

    rateLimiter.recordRequest(model);

    return parseImproveResponse(response.text ?? "");
  } catch (e) {
    if (signal?.aborted) {
      return { ok: false, error: "aborted" };
    }
    rateLimiter.recordRequest(model);
    return { ok: false, error: classifyAiError(e) };
  }
}
