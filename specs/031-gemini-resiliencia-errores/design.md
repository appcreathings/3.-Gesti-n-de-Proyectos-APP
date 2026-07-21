# Design — Resiliencia de la integración con Gemini (031)

Contrapartida técnica de `spec.md`. Todas las citas de archivo/línea fueron verificadas leyendo el
código directamente el 2026-07-20.

## 1. Estado actual (línea base) — los 4 puntos concretos del bug

### 1.1 `classifyAiError` no distingue cuota-cero — `src/ai/gemini/errors.ts:25-46`

```ts
export function classifyAiError(e: unknown): AiErrorKind {
  if (e instanceof DOMException && e.name === "AbortError") return "aborted";
  if (e instanceof Error && e.name === "AbortError") return "aborted";
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  if (e instanceof TypeError) return "offline";

  const status = extractStatus(e);
  if (status === 400 || status === 401 || status === 403) return "invalid-key";
  if (status === 429) return "rate-limit";          // <- todo 429 cae aquí, sin mirar el cuerpo

  const msg = e instanceof Error ? e.message.toLowerCase() : String(e).toLowerCase();
  if (msg.includes("api key")) return "invalid-key";
  if (msg.includes("quota") || msg.includes("rate")) {
    if (msg.includes("token") || msg.includes("exceeded") || msg.includes("daily limit")) {
      return "quota-exhausted";
    }
    return "rate-limit";
  }
  ...
}
```

`extractStatus()` (`errors.ts:48-57`) ya asume que el cuerpo JSON de la respuesta HTTP viaja embebido
como texto dentro de `Error.message` (regex `"code"\s*:\s*(\d{3})`) — mismo lugar de donde hay que
leer `quota_limit_value`.

### 1.2 El fallback de `agent.ts` se rinde tras un solo reintento sin protección — `src/ai/gemini/agent.ts:104-140`

```ts
try {
  for (let round = 0; round < MAX_ROUNDS; round++) {
    let calls: FunctionCall[] = [];
    try {
      const stream = await chat.sendMessageStream({ message });
      for await (const chunk of stream) { /* ... */ }
    } catch (e) {
      const kind = classifyAiError(e);
      if (kind === "rate-limit" && currentModelId) {
        const fallbackId = await handleRateLimit(currentModelId);
        if (fallbackId) {
          currentModelId = fallbackId;
          chat = createChatWithModel(currentModelId, chat.getHistory(true));
          const stream = await chat.sendMessageStream({ message }); // <- SIN try/catch, único intento
          calls = [];
          for await (const chunk of stream) { /* ... */ }
        } else {
          return { ...error: "all-models-exhausted" };
        }
      } else {
        throw e;
      }
    }
    /* ... */
  }
} catch (e) {
  return { ...error: classifyAiError(e) };  // <- si el reintento de arriba falla, cae aquí
}
```

Si el segundo `sendMessageStream` (línea 122) también lanza —muy probable cuando la cuota es de
proyecto, no de modelo, porque **todos** los modelos van a fallar igual—, la excepción no está
capturada localmente: se escapa al `catch` externo (línea 164-171), se reclasifica y vuelve a salir
como `"rate-limit"` (porque sigue siendo un 429). El usuario nunca ve `"all-models-exhausted"`; ve el
mismo `"rate-limit"` sin importar cuántos modelos existan en el grupo. Esto es el motivo técnico
exacto del síntoma reportado ("me da siempre este error").

### 1.3 `buildRagContext` sin protección en el envío del chat — `src/store/useChatStore.ts:121-124`

```ts
const ragContext =
  config.ragEnabled && config.apiKey
    ? await buildRagContext(trimmed, config.apiKey)   // <- sin try/catch
    : "";
const result = await runAgentTurn({ ... });
```

Si `buildRagContext` lanza, `send()` completo revienta antes de llegar a `runAgentTurn` — el usuario
con RAG activo pierde el chat entero por un fallo en una mejora opcional.

### 1.4 `embedText` sin clasificación ni fallback — `src/ai/rag/search.ts:21-37`

```ts
export async function embedText(text: string, apiKey: string): Promise<number[]> {
  if (!rateLimiter.canMakeRequest(EMBEDDING_MODEL)) {
    throw new Error("rate-limit");
  }
  const ai = await createClient(apiKey);
  const response = await ai.models.embedContent({
    model: `models/${EMBEDDING_MODEL}`,   // siempre "gemini-embedding-001", nunca el 2do del grupo
    contents: [text],
  });
  const embedding = response.embeddings?.[0]?.values;
  if (!embedding) throw new Error("No embedding returned");
  rateLimiter.recordRequest(EMBEDDING_MODEL, Math.ceil(text.length / 4));
  return embedding;
}
```

A diferencia de `runImproveWithFallback` (`src/ai/improve.ts:154-232`, spec 012), que sí recorre
`getModelsByGroup(fallbackGroup)` probando cada uno, `embedText` está hardcodeado a un solo modelo y
relanza el error crudo del SDK sin pasar por `classifyAiError`.

## 2. `errors.ts` — nuevo `AiErrorKind` "project-quota-zero"

```ts
export type AiErrorKind =
  | "invalid-key"
  | "rate-limit"
  | "quota-exhausted"
  | "project-quota-zero"   // NUEVO
  | "all-models-exhausted"
  | "offline"
  | "aborted"
  | "unknown";

export const AI_ERROR_MESSAGES: Record<AiErrorKind, string> = {
  // ...existentes...
  "project-quota-zero":
    "Tu proyecto de Google Cloud tiene esta cuota en 0 en la región asignada — no es un límite " +
    "temporal, reintentar no lo va a arreglar. Revisa las cuotas de tu proyecto en Google Cloud " +
    "Console, o genera una API key nueva en otro proyecto desde Google AI Studio (Ajustes → " +
    "Asistente IA).",
};

function hasZeroQuota(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  // Cubre `"quota_limit_value":"0"` (string) y `"quota_limit_value":0` (numérico)
  return /"quota_limit_value"\s*:\s*"?0"?(?!\d)/.test(msg);
}

export function classifyAiError(e: unknown): AiErrorKind {
  if (e instanceof DOMException && e.name === "AbortError") return "aborted";
  if (e instanceof Error && e.name === "AbortError") return "aborted";
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  if (e instanceof TypeError) return "offline";

  if (hasZeroQuota(e)) return "project-quota-zero";   // ANTES de mirar el status 429 genérico

  const status = extractStatus(e);
  if (status === 400 || status === 401 || status === 403) return "invalid-key";
  if (status === 429) return "rate-limit";
  // ...resto sin cambios...
}
```

**Por qué chequear `hasZeroQuota` antes del status 429 genérico:** un 429 con `quota_limit_value: 0`
es más específico y más accionable que el genérico `"rate-limit"` — clasificarlo primero evita que el
`if (status === 429) return "rate-limit"` lo capture antes.

**Nota de implementación — supuesto confirmado en Fase 0 (T3101, 2026-07-20):** inspeccionado
`node_modules/@google/genai/dist/index.mjs` (versión `@google/genai@2.10.0`). El SDK construye el
`ApiError` con `message = JSON.stringify(errorBody)` para el camino no-streaming
(`index.mjs:8407-8413`, usado por `embedContent`/`generateContent`) y con
`message = "got status: ${status}. ${JSON.stringify(chunkJson)}"` para el camino streaming
(`index.mjs:8164`, usado por `sendMessageStream`). En **ambos** casos el cuerpo JSON completo —
incluyendo `"quota_limit_value":"0"` — viaja como texto dentro de `Error.message`. No hace falta
inspeccionar `e.cause` ni otra propiedad. El supuesto de la spec se sostiene tal cual y
`hasZeroQuota`/`extractStatus` pueden leer directamente de `e.message` como está diseñado.

## 3. `agent.ts` — bucle de fallback real (reemplaza el reintento único)

Se extrae la lógica de "un intento contra un modelo" a una función y se envuelve en un bucle que
recorre el grupo completo, distinguiendo errores que ameritan probar otro modelo de los que no:

```ts
async function attemptTurn(
  modelId: string,
  message: PartListUnion,
): Promise<{ ok: true; calls: FunctionCall[] } | { ok: false; kind: AiErrorKind }> {
  chat = createChatWithModel(modelId, chat.getHistory(true));
  try {
    const stream = await chat.sendMessageStream({ message });
    const calls: FunctionCall[] = [];
    for await (const chunk of stream) {
      if (signal?.aborted) throw new DOMException("aborted", "AbortError");
      if (chunk.text) callbacks.onTextDelta(chunk.text);
      if (chunk.functionCalls?.length) calls.push(...chunk.functionCalls);
    }
    return { ok: true, calls };
  } catch (e) {
    return { ok: false, kind: classifyAiError(e) };
  }
}

// Dentro del round loop, reemplaza el bloque try/catch de sendMessageStream actual:
const tried = new Set<string>();
let modelId: string | null = currentModelId;
let outcome = await attemptTurn(modelId!, message);
tried.add(modelId!);

while (!outcome.ok) {
  // Errores no ligados a un modelo específico: no tiene sentido probar otro.
  if (outcome.kind !== "rate-limit" && outcome.kind !== "quota-exhausted") {
    return { history: chat.getHistory(true), roundsExceeded, error: outcome.kind, modelSwitch: lastFallbackEvent };
  }
  rateLimiter.markSaturated(modelId!, 60);
  const selection = modelSelector.select(preferredModel, fallbackGroup, tried);
  if (!selection.modelId) {
    return { history: chat.getHistory(true), roundsExceeded, error: "all-models-exhausted", modelSwitch: lastFallbackEvent };
  }
  if (selection.fallbackEvent) {
    lastFallbackEvent = selection.fallbackEvent;
    callbacks.onModelSwitch?.(selection.fallbackEvent);
  }
  modelId = selection.modelId;
  tried.add(modelId);
  currentModelId = modelId;
  outcome = await attemptTurn(modelId, message);
}
const calls = outcome.calls;
```

Puntos clave del diseño:
- **`"project-quota-zero"` corta el bucle en el primer intento** (cae en la rama `outcome.kind !==
  "rate-limit" && !== "quota-exhausted"`, junto con `"invalid-key"`, `"offline"`, `"unknown"`) — no
  vale la pena gastar cupo real probando 3 modelos más contra el mismo proyecto/región agotado.
- **`tried` (un `Set` acumulativo)** reemplaza al `excludeIds` de un solo elemento que usaba
  `handleRateLimit`/`selectAfterRateLimit` — `modelSelector.select()` ya acepta `excludeIds` como
  tercer parámetro (`src/ai/modelSelector.ts:25-29`), no hace falta tocar `modelSelector.ts`.
  `selectAfterRateLimit` (`modelSelector.ts:74-84`) queda sin uso tras este cambio y se puede eliminar
  si no lo usa nadie más (verificar en Fase 0 de `tasks.md`).
- **Cota implícita:** el bucle termina solo cuando `modelSelector.select()` no encuentra más
  candidatos sin probar en el grupo (tamaño del grupo, hoy máx. 4 en "flash") — no hace falta un
  contador aparte, `getAvailableInGroup`/`select` ya filtran por `tried`.
- El resto de `runAgentTurn` (manejo de `calls`, ejecución de tools, `MAX_ROUNDS`) no cambia.

## 4. `useChatStore.ts` — proteger `buildRagContext`

```ts
const ragContext =
  config.ragEnabled && config.apiKey
    ? await buildRagContext(trimmed, config.apiKey).catch(() => "")
    : "";
```

Un solo `.catch(() => "")` — mismo nivel de esfuerzo que el patrón "best-effort" ya usado en
`hydrateFromIdb`/`persistSnapshot` de este mismo archivo (`useChatStore.ts:73-86`, `256-271`).

## 5. `rag/search.ts` — `embedText` con fallback entre modelos de embedding

```ts
import { classifyAiError } from "@/ai/gemini/errors";
import { getModelsByGroup } from "@/ai/models";

export async function embedText(text: string, apiKey: string): Promise<number[]> {
  const candidates = getModelsByGroup("embedding"); // gemini-embedding-001, gemini-embedding-2
  let lastError: unknown = new Error("no embedding models available");

  for (const modelDef of candidates) {
    if (!rateLimiter.canMakeRequest(modelDef.id)) continue;
    try {
      const ai = await createClient(apiKey);
      const response = await ai.models.embedContent({
        model: `models/${modelDef.id}`,
        contents: [text],
      });
      const embedding = response.embeddings?.[0]?.values;
      if (!embedding) throw new Error("No embedding returned");
      rateLimiter.recordRequest(modelDef.id, Math.ceil(text.length / 4));
      return embedding;
    } catch (e) {
      const kind = classifyAiError(e);
      lastError = e;
      if (kind === "rate-limit" || kind === "quota-exhausted") {
        rateLimiter.markSaturated(modelDef.id, 60);
        continue; // probar el siguiente modelo de embedding
      }
      throw e; // project-quota-zero / invalid-key / offline: no tiene caso probar el otro modelo
    }
  }
  throw lastError;
}
```

`semanticSearch`/`buildRagContext` no cambian — ya propagan lo que `embedText` lance, y ahora eso
queda absorbido por el `.catch(() => "")` de §4.

## 6. UI — mensaje distinto + detalle técnico colapsable

**Fase 0 obligatoria (ver `tasks.md`):** releer `src/features/assistant/AssistantPanel.tsx` y
`src/components/ai/AiSuggestionsPanel.tsx` tal como existen al momento de implementar (esta spec no
volvió a leer esos dos archivos completos, solo se citan por nombre en el reporte de exploración
inicial) antes de tocarlos, dado que este documento fue escrito para handoff a otra sesión.

Cambios necesarios en ambos puntos de UI que ya consumen `AiErrorKind`/`AI_ERROR_MESSAGES`:
- Agregar el caso `"project-quota-zero"` a cualquier mapeo local de mensajes/acciones que no lea
  directamente de `AI_ERROR_MESSAGES` (TypeScript ya fuerza esto si el mapeo es un `Record<AiErrorKind,
  ...>` exhaustivo — dejar que el compilador señale los sitios).
- Un elemento `<details>`/disclosure con el mensaje crudo del error (si se conserva en el resultado —
  puede requerir agregar un campo opcional `rawMessage?: string` a `AgentTurnResult`/
  `ImproveResultWithMeta` para no perder el texto original al clasificarlo).
- Sin telemetría/logging remoto — el detalle vive solo en el estado de React de esa sesión.

## Archivos afectados

| Acción | Archivo |
|---|---|
| Modificar | `src/ai/gemini/errors.ts` (nuevo `AiErrorKind`, `hasZeroQuota`, mensaje nuevo) |
| Modificar | `src/ai/gemini/agent.ts` (bucle de fallback real, ver §3) |
| Modificar | `src/store/useChatStore.ts` (proteger `buildRagContext`, línea 121-124) |
| Modificar | `src/ai/rag/search.ts` (`embedText` con fallback entre modelos de embedding) |
| Modificar | `src/ai/improve.ts`, `src/ai/generate-transform.ts` (agregar el caso `"project-quota-zero"`
  a cualquier lógica que distinga tipos de error explícitamente — confirmar en Fase 0 si ya delegan
  todo a `AI_ERROR_MESSAGES` o tienen mapeos propios) |
| Modificar | `src/features/assistant/AssistantPanel.tsx`, `src/components/ai/AiSuggestionsPanel.tsx`
  (detalle técnico colapsable, ver §6) |
| Posible cleanup | `src/ai/modelSelector.ts` — evaluar si `selectAfterRateLimit` queda sin uso tras
  §3 y se puede eliminar (no romper si algo más lo llama) |
| Nuevo (tests) | Casos nuevos en `src/ai/gemini/errors.test.ts` (o crear si no existe),
  `src/ai/gemini/agent.test.ts`, `src/store/useChatStore.test.ts` (o el archivo de test existente
  correspondiente), `src/ai/rag/search.test.ts` |

## Riesgos ya identificados

1. **El supuesto sobre dónde vive el cuerpo del error en el `Error` del SDK no está 100% confirmado**
   (spec.md → Supuestos) — si `hasZeroQuota`/`extractStatus` leen del lugar equivocado, la detección
   de `"project-quota-zero"` simplemente no dispara y el error cae como `"rate-limit"` (regresión
   nula, no falla peor de lo que falla hoy) — pero HU-01 no se cumple. Mitigación: Fase 0 exige
   reproducir o inspeccionar un error real antes de dar por buena la implementación.
2. **Cambiar el tipo `AiErrorKind` es un breaking change de TypeScript en todo `Record<AiErrorKind,
   ...>` existente** — es una ventaja, no un riesgo: el compilador señala cada sitio que necesita el
   caso nuevo (`tsc --noEmit` como red de seguridad, mismo criterio que el resto del proyecto).
3. **Cortar el fallback en `"project-quota-zero"` asume que la cuota-cero es siempre de
   proyecto/región, nunca casualmente coincidente con un modelo específico** — es la lectura correcta
   del error real reportado (`quota_unit: "1/min/{project}/{region}"`, no `{model}`), pero si Google
   alguna vez devuelve un `quota_limit_value: 0` en un quota_unit por-modelo, esta spec lo trataría
   igual (fail-fast) en vez de intentar otro modelo — trade-off aceptado explícitamente (ver
   Decisiones en spec.md): es mejor fallar rápido y claro que quemar 4 requests contra una cuota que
   casi siempre es de cuenta completa.

## Verificación / testing manual

- `npx tsc --noEmit`, `npx vitest run`, `npm run build` (usar Bash tool o `npm.cmd`; `Start-Process`
  no ejecuta npm en este entorno Windows).
- Test dirigido: alimentar a `classifyAiError` un `Error` cuyo `.message` contenga el JSON exacto
  reportado por el usuario (pegar tal cual) y confirmar `"project-quota-zero"`.
- Test dirigido: mockear `chat.sendMessageStream` para que falle 3 veces seguidas con `"rate-limit"`
  contra 3 modelos distintos del grupo "flash" y confirmar que `runAgentTurn` prueba los 3 antes de
  devolver `"all-models-exhausted"`.
- Smoke manual (si el usuario tiene forma de simular una key sin cuota, o cuando Google restablezca
  la cuota real): enviar un mensaje de chat con RAG activo y observar que, ante fallo del embedding,
  el mensaje de todos modos se responde (sin bloque de contexto semántico).
- Confirmar que ningún mapeo `Record<AiErrorKind, ...>` quedó sin el caso nuevo (`tsc --noEmit` debe
  fallar y señalar los sitios si falta alguno).
