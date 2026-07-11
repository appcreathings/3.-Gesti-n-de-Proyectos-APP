import { createClient } from "@/ai/gemini/client";
import { classifyAiError } from "@/ai/gemini/errors";
import { rateLimiter } from "@/ai/rateLimiter";
import { getModelsByGroup } from "@/ai/models";
import type { AiErrorKind } from "@/ai/gemini/errors";

/** Genera el cuerpo de `transformCode` (`LogicSchema.transformCode`, spec
 * 023 §G) a partir de una instrucción en lenguaje natural — mismo plumbing
 * de IA que `src/ai/improve.ts` (cliente Gemini, rate limiter, fallback por
 * grupo de modelos), pero el prompt/parseo son propios: aquí se genera
 * código JS, no un JSON de sugerencias. */

export type GenerateTransformResult = { ok: true; code: string } | { ok: false; error: AiErrorKind };

const SYSTEM_PROMPT = `Eres un experto en JavaScript ayudando a escribir la lógica de transformación de un flujo de automatización de Hito.

Contexto: el motor ejecuta tu código así — \`new Function("record", tuCodigo)\`, llamado con el registro ya mapeado. Tu código debe usar el parámetro "record" y terminar con un "return" del objeto transformado.

Reglas:
1. Responde ÚNICAMENTE con el cuerpo de la función en JavaScript — sin explicación, sin markdown, sin \`\`\`.
2. Siempre debes terminar con "return record;" o "return <objeto nuevo>;" — el motor descarta cualquier resultado que no sea un objeto.
3. Usa únicamente los campos que aparecen en el registro de muestra (o los "campos disponibles" listados) — no inventes nombres de campo.
4. Si la instrucción del usuario es ambigua o no calza con los datos disponibles, escribe la mejor aproximación razonable y agrega un comentario breve (// ...) explicando la limitación — nunca dejes de responder código.
5. Preferí mutar y devolver "record" en vez de construir un objeto nuevo, salvo que la instrucción pida explícitamente lo contrario.`;

export function buildGenerateTransformPrompt(
  instruction: string,
  sampleRecord: Record<string, unknown> | undefined,
  availableFields: string[]
): string {
  const fieldsText = availableFields.length > 0 ? availableFields.join(", ") : "(sin campos conocidos todavía)";
  const sampleText = sampleRecord
    ? JSON.stringify(sampleRecord, null, 2)
    : "(sin muestra real todavía — prueba la conexión del trigger primero para dar mejores resultados)";

  return `Instrucción: ${instruction}\n\nCampos disponibles: ${fieldsText}\n\nRegistro de muestra:\n${sampleText}\n\nEscribe el código.`;
}

/** Limpia el markdown que el modelo pueda agregar pese a la instrucción, y
 * valida que el resultado sea sintácticamente válido con la misma regla que
 * usa `LogicSchema.transformCode` al guardar — así un código generado roto
 * nunca llega al campo del formulario. */
export function parseGenerateTransformResponse(text: string): GenerateTransformResult {
  if (!text.trim()) return { ok: false, error: "unknown" };

  const cleaned = text
    .replace(/```(?:javascript|js)?\s*/gi, "")
    .replace(/```\s*$/g, "")
    .trim();

  if (!cleaned) return { ok: false, error: "unknown" };

  try {
    new Function("record", cleaned);
  } catch {
    return { ok: false, error: "unknown" };
  }

  return { ok: true, code: cleaned };
}

export interface GenerateTransformOptions {
  apiKey: string;
  model?: string;
  instruction: string;
  sampleRecord?: Record<string, unknown>;
  availableFields?: string[];
  signal?: AbortSignal;
}

export async function runGenerateTransform(options: GenerateTransformOptions): Promise<GenerateTransformResult> {
  const { apiKey, model = "gemini-2.5-flash", instruction, sampleRecord, availableFields = [], signal } = options;

  const ai = await createClient(apiKey);
  const prompt = buildGenerateTransformPrompt(instruction, sampleRecord, availableFields);

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

    return parseGenerateTransformResponse(response.text ?? "");
  } catch (e) {
    if (signal?.aborted) {
      return { ok: false, error: "aborted" };
    }
    rateLimiter.recordRequest(model);
    return { ok: false, error: classifyAiError(e) };
  }
}

export interface GenerateTransformOptionsWithFallback extends GenerateTransformOptions {
  autoFallback?: boolean;
  fallbackGroup?: string;
  onFallback?: (from: string, to: string, reason: string) => void;
}

export type GenerateTransformResultWithMeta =
  | { ok: true; code: string; modelUsed?: string; fallbackChain?: string[] }
  | { ok: false; error: AiErrorKind; modelUsed?: string; fallbackChain?: string[] };

export async function runGenerateTransformWithFallback(
  options: GenerateTransformOptionsWithFallback
): Promise<GenerateTransformResultWithMeta> {
  const {
    apiKey,
    model: preferredModel = "gemini-2.5-flash",
    instruction,
    sampleRecord,
    availableFields,
    signal,
    autoFallback = true,
    fallbackGroup = "flash",
    onFallback,
  } = options;

  if (!autoFallback) {
    const result = await runGenerateTransform({
      apiKey,
      model: preferredModel,
      instruction,
      sampleRecord,
      availableFields,
      signal,
    });
    return { ...result, modelUsed: preferredModel };
  }

  const groupModels = getModelsByGroup(fallbackGroup);
  const fallbackChain: string[] = [];

  for (const modelDef of groupModels) {
    if (!rateLimiter.canMakeRequest(modelDef.id)) {
      continue;
    }

    fallbackChain.push(modelDef.id);

    try {
      const result = await runGenerateTransform({
        apiKey,
        model: modelDef.id,
        instruction,
        sampleRecord,
        availableFields,
        signal,
      });

      if (result.ok) {
        return { ...result, modelUsed: modelDef.id, fallbackChain };
      }

      if (result.error === "rate-limit" || result.error === "quota-exhausted") {
        rateLimiter.markSaturated(modelDef.id, 60);
        if (onFallback) {
          const nextModel = groupModels.find(
            (m) => m.priority > modelDef.priority && rateLimiter.canMakeRequest(m.id)
          );
          if (nextModel) {
            onFallback(modelDef.id, nextModel.id, result.error);
          }
        }
        continue;
      }

      return { ...result, modelUsed: modelDef.id, fallbackChain };
    } catch {
      continue;
    }
  }

  return {
    ok: false,
    error: "all-models-exhausted",
    fallbackChain,
  };
}
