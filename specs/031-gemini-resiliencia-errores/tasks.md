# Tasks — Resiliencia de la integración con Gemini (031)

Tareas numeradas por fase. Cada fase debe dejar la app usable de punta a punta (Principio V) y
verificarse con `tsc --noEmit` + `vitest run` + `vite build` antes de avanzar (mismo criterio que
specs 003/010/029/030). **Ninguna tarea está iniciada** — este documento es la guía para la sesión de
implementación (spec escrita para handoff a otra conversación, ver `spec.md`).

## Fase 0 — Confirmación previa (obligatoria, no saltar)
- [x] T3100 Releer `src/ai/gemini/errors.ts`, `src/ai/gemini/agent.ts`, `src/store/useChatStore.ts`,
  `src/ai/rag/search.ts`, `src/ai/modelSelector.ts`, `src/ai/improve.ts`,
  `src/features/assistant/AssistantPanel.tsx`, `src/components/ai/AiSuggestionsPanel.tsx` y confirmar
  que coinciden con lo descrito en `design.md` §1-§6. Si algo cambió desde 2026-07-20, actualizar
  `design.md` antes de seguir.
- [x] T3101 Reproducir o inspeccionar un `Error` real lanzado por `@google/genai` ante un 429 (con la
  API key del usuario, o mockeando la respuesta HTTP) y confirmar dónde vive exactamente el cuerpo
  JSON (`e.message`, `e.cause`, u otra propiedad del `ApiError`). Ajustar el diseño de
  `hasZeroQuota`/`extractStatus` en `design.md` §2 si el supuesto no se sostiene, antes de escribir
  código.

## Fase 1 — Clasificación de errores (`errors.ts`)
- [x] T3110 Agregar `"project-quota-zero"` a `AiErrorKind` y su entrada en `AI_ERROR_MESSAGES` (texto
  en `design.md` §2).
- [x] T3111 Implementar `hasZeroQuota(e)` y llamarla en `classifyAiError` **antes** del chequeo de
  `status === 429` genérico (orden importa, ver design.md §2).
- [x] T3112 Test: alimentar el JSON de error exacto reportado por el usuario y confirmar
  `classifyAiError(...) === "project-quota-zero"`.
- [x] T3113 Test: confirmar que un 429 genérico *sin* `quota_limit_value` (o con un valor > 0) sigue
  clasificando como `"rate-limit"` (no regresión).

  Verificar: `tsc --noEmit` (debe señalar cada `Record<AiErrorKind, ...>` que aún no cubre el caso
  nuevo — usar esos errores como checklist para las fases siguientes), tests en verde.

## Fase 2 — Fallback real en el agente (`agent.ts`)
- [x] T3120 Extraer `attemptTurn(modelId, message)` (ver design.md §3) y reemplazar el bloque
  try/catch de reintento único por el bucle `while (!outcome.ok)` que recorre el grupo completo,
  usando `modelSelector.select(preferredModel, fallbackGroup, tried)` con un `Set` acumulativo.
- [x] T3121 Confirmar que `"project-quota-zero"` (y cualquier kind que no sea `"rate-limit"`/
  `"quota-exhausted"`) corta el bucle en el primer intento sin probar más modelos.
- [x] T3122 Evaluar si `ModelSelector.selectAfterRateLimit` (`modelSelector.ts:74-84`) queda sin uso
  tras este cambio; si es así, eliminarlo (buscar otros call-sites primero).
- [x] T3123 Test: mockear `chat.sendMessageStream` fallando con `"rate-limit"` en 3 modelos distintos
  del grupo "flash" en secuencia y confirmar que `runAgentTurn` los prueba todos antes de devolver
  `"all-models-exhausted"`.
- [x] T3124 Test: mockear el primer intento fallando con `"project-quota-zero"` y confirmar que
  `runAgentTurn` devuelve ese error inmediatamente, sin llamar a `sendMessageStream` una segunda vez.
- [x] T3125 Test de regresión: el camino feliz (sin errores) y el camino de éxito tras un solo
  fallback (como ya cubría el test existente, si lo hay) siguen pasando.

  Verificar: `tsc --noEmit`, tests en verde. Este es el cambio de mayor riesgo — no avanzar sin
  correr toda la suite de `agent.ts`.

## Fase 3 — RAG resiliente
- [x] T3130 `src/store/useChatStore.ts:121-124`: envolver `buildRagContext(...)` con
  `.catch(() => "")`.
- [x] T3131 `src/ai/rag/search.ts`: reescribir `embedText` para recorrer
  `getModelsByGroup("embedding")` con `classifyAiError`, igual patrón que `runImproveWithFallback`
  (`src/ai/improve.ts:154-232`, spec 012) — ver pseudocódigo en design.md §5.
- [x] T3132 Test: `buildRagContext` con un mock que lanza error nunca propaga la excepción fuera de
  `send()` — el turno del agente continúa igual.
- [x] T3133 Test: `embedText` prueba `gemini-embedding-2` cuando `gemini-embedding-001` falla por
  `"rate-limit"`/`"quota-exhausted"`, y no lo prueba (relanza directo) si falla por
  `"project-quota-zero"`.

  Verificar: `tsc --noEmit`, tests en verde, `vite build`.

## Fase 4 — UI: mensaje distinto + detalle técnico
- [x] T3140 Releer `AssistantPanel.tsx` y `AiSuggestionsPanel.tsx` (ya cubierto por T3100) y ubicar
  dónde renderizan `AI_ERROR_MESSAGES`/`AiErrorKind` hoy.
- [x] T3141 Agregar el caso `"project-quota-zero"` a cualquier mapeo local que no delegue
  directamente a `AI_ERROR_MESSAGES` (dejar que `tsc --noEmit` de la Fase 1 sirva de checklist).
- [x] T3142 Agregar un `<details>`/disclosure "Ver detalle técnico" con el mensaje crudo del SDK
  cuando esté disponible — puede requerir agregar `rawMessage?: string` a `AgentTurnResult`/
  `ImproveResultWithMeta` (ver design.md §6).
- [x] T3143 Confirmar que ningún detalle técnico se envía a un servicio externo (Principio I) — solo
  vive en el estado de React de la sesión.

  Verificar: `tsc --noEmit`, tests en verde, `vite build`. Smoke manual: forzar cada `AiErrorKind`
  (mock o desconectar red) y confirmar que el mensaje + detalle se ven bien en ambos componentes.

## Fase 5 — Cierre
- [x] T3150 `npm run typecheck && npm test && npm run build` (usar Bash tool o `npm.cmd`, no
  `Start-Process`, en este entorno Windows).
- [ ] T3151 Si Google restableció la cuota real del usuario para cuando se implemente esto, hacer un
  smoke test end-to-end real: enviar un mensaje al asistente y confirmar que funciona; si sigue en
  cero, documentar en `spec.md`/memoria que la verificación completa de HU-01 quedó pendiente de una
  cuenta con el error real disponible. **PENDIENTE:** requiere una API key real con cuota en 0 — la
  verificación unitaria con el JSON exacto reportado por el usuario cubre lo que la app controla.
- [x] T3152 Actualizar memoria del proyecto (`gestor-proyectos-app.md`) con el resumen de spec 031,
  mismo hábito que specs anteriores.
- [x] T3153 Cambiar `Estado` de `spec.md` de "Borrador" a "Implementado" (con fecha) si todo lo
  anterior quedó en verde; si algo queda pendiente, dejarlo anotado explícitamente como en specs
  previas.

## Explícitamente fuera de este tasks.md
- Cualquier backoff exponencial o cola de reintentos diferidos con temporizador.
- Cambios a `MODEL_REGISTRY`/`FALLBACK_CHAINS` (límites RPM/TPM/RPD documentados).
- Telemetría o logging remoto de errores.
- Rediseño visual de `AiSettingsCard.tsx`, `AiModelSelector.tsx` u otra UI de specs 006/012 más allá
  del detalle técnico colapsable de la Fase 4.

## Verificación por fase
Tras cada fase: `npx tsc --noEmit`, `npx vitest run`, y el smoke manual descrito en esa fase. La Fase
2 (bucle de fallback en `agent.ts`) es la de mayor riesgo de regresión — no avanzar a Fase 3 sin la
suite completa de tests de `agent.ts` en verde, incluyendo los casos que ya existían antes de esta
spec.
