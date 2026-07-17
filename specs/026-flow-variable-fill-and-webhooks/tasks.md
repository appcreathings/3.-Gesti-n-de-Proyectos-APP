# Tasks — Spec 026 · Interpolación confiable + llenado de objetos + webhooks

> Checklist ejecutable. Marcar `[x]` al completar; `[~]` en progreso; `[!]`
> bloqueado (anotar motivo en una línea debajo). Baseline: 401/401 tests en verde.
> **Estado: todas las fases completas (2026-07-16) — 446/446 tests, typecheck/lint/build en verde.**

## Fase A — Módulo de interpolación unificado y robusto

- [x] **A1** — `src/flows/interpolation.ts` (NUEVO): `TOKEN_RE` (`/\{\{\s*([^{}]+?)\s*\}\}/g`),
  `parseTokens`/`parseToken` (soporta `{{campo||default}}`), `resolvePath` (clave literal completa →
  path anidado por puntos), `interpolateString` → `{ value, unresolved }`, `interpolateObject` →
  `{ value, unresolved }`. Ver `design.md` §2.
  - Verificación: `npm run typecheck`. ✅
  - Dependencias: —.

- [x] **A2** — `src/flows/interpolation.test.ts` (NUEVO): 17 tests — espacios, acentos/eñe,
  path anidado, clave literal con punto gana sobre path, default `||`, no resuelto → `""` + listado,
  objeto recursivo (incl. arrays preservados), token `\w` legacy idéntico.
  - Verificación: `npm test src/flows/interpolation.test.ts`. ✅
  - Dependencias: A1.

- [x] **A3** — `src/flows/engine.ts`: eliminadas `interpolateString`/`interpolateObject`/`getNestedValue`
  locales, ahora wrappers de compatibilidad sobre el módulo A1. Todos los call sites migrados.
  - Verificación: `npm run typecheck && npm test src/flows/engine.test.ts`. ✅ (401 preexistentes intactos)
  - Dependencias: A1.

- [x] **A4** — `src/flows/engine.ts` (`evaluateCondition`): `==`/`!=` coaccionan con
  `toComparableNumber` en ambos lados; si ambos coercibles → numérica, si no → estricta. Ver
  `design.md` §3. 2 tests nuevos en `engine.test.ts`.
  - Verificación: `npm test src/flows/engine.test.ts`. ✅
  - Dependencias: —.

- [x] **A5** — `src/features/flows/canvas/variables.ts`: `validateVariables` tokeniza con
  `parseTokens` del módulo A1. Mantiene "available vacío → valid: true". 2 tests nuevos en
  `variables.test.ts` (token con espacios detectado).
  - Verificación: `npm test src/features/flows/canvas/variables.test.ts`. ✅
  - Dependencias: A1.

- [x] **Cierre Fase A:** `npm run typecheck && npm run lint && npm test` en verde. Un test de engine
  confirma que `{{Nombre Cliente}}` de Sheets interpola en runtime.

## Fase B — Llenado real de campos en creación de objetos

- [x] **B1** — `src/domain/schemas/flow.ts`: `matchSource: z.string().optional()` en
  `CreatePersonOutputSchema`. `src/domain/schemas/common.ts`: `SCHEMA_VERSION` 12→13.
  `src/domain/migrations.ts`: `{ to: 13, up: (data) => data }` en `flows`. 2 tests v12→v13 en
  `migrations.test.ts`.
  - Verificación: `npm test src/domain/migrations.test.ts`. ✅
  - Dependencias: —.

- [x] **B2** — `src/flows/engine.ts` (`setField` + `describeOutput`): interpola `output.value`
  cuando es string. Ver `design.md` §4.1. Tests: `{{amount}}` string → valor real; no-string intacto.
  - Verificación: `npm test src/flows/engine.test.ts`. ✅
  - Dependencias: A3.

- [x] **B3** — `src/flows/engine.ts` (`createProject.fields`): `source` con `{{` → interpolar;
  sin → `getNestedValue` (retrocompat). Guard `value !== ""`. Ver `design.md` §4.2. Tests ambos
  caminos + no-overwrite con token sin resolver.
  - Verificación: `npm test src/flows/engine.test.ts`. ✅
  - Dependencias: A3.

- [x] **B4** — `src/flows/engine.ts` (`createPerson`): valor de match vía
  `matchSource`/`resolvePath` (soporta `properties.email`); fallbacks `name`/`email`/`roleTitle` por
  `resolvePath`. Ver `design.md` §4.3. Test match anidado + matchSource.
  - Verificación: `npm test src/flows/engine.test.ts`. ✅
  - Dependencias: A3, B1.

- [x] **B5** — `src/flows/engine.ts` (`createTask.assigneeId`, nueva `resolvePersonId`): resuelve
  interpolado contra `input.people` (id→email→nombre); sin match → `null` + traza. Ver
  `design.md` §4.4. Placeholder/ayuda actualizados en `ActionConfigFields.tsx`. Tests resuelto
  por email / sin match. Test preexistente de spec 023 §D actualizado con fixture de `Person` real.
  - Verificación: `npm test src/flows/engine.test.ts`. ✅
  - Dependencias: A3.

- [x] **B6** — `src/flows/engine.ts` (`createTask.dueDate`, nueva `coerceDueDate`): ISO/epoch-ms →
  `YYYY-MM-DD`; no parseable → sin fecha + warning. Ver `design.md` §4.5. Tests epoch-ms/no-parseable.
  - Verificación: `npm test src/flows/engine.test.ts`. ✅
  - Dependencias: A3.

- [x] **B7** — `src/features/flows/canvas/ActionConfigFields.tsx` (`setField.field`,
  `createProject.fields[*].target`): `Input` libre → `TargetFieldSelect` (NUEVO, local) con
  `INTERNAL_TARGET_FIELDS.project` + "Otro…". Ver `design.md` §8.
  - Verificación: visual — select ofrece name/status/productId/description. ✅
  - Dependencias: —.

- [x] **Cierre Fase B:** tests en verde (11 nuevos en engine.test.ts + 2 en migrations.test.ts).

## Fase C — Webhook configurable, previsualizable y probable

- [x] **C1** — `src/flows/webhook-request.ts` (NUEVO): `buildWebhookRequest(output, data)` →
  `{ url, init, payload, unresolved }` (interpolación + `signPayload` + headers), extraído de
  `engine.ts`. `engine.ts` webhook lo consume. Ver `design.md` §6.2.
  - Verificación: `npm test src/flows/engine.test.ts` webhook siguen verde; 5 tests nuevos del
    builder en `webhook-request.test.ts` (firma + payload custom vs completo + unresolved). ✅
  - Dependencias: A3.

- [x] **C2** — `src/flows/webhook-test.ts` (NUEVO) + `webhook-test.test.ts` (4 tests): `testWebhook`
  → POST real vía `buildWebhookRequest`, status + respuesta truncada. Ver `design.md` §6.3. Tests
  con fetch mockeado (2xx/4xx/red caída/payload custom).
  - Verificación: `npm test src/flows/webhook-test.test.ts`. ✅
  - Dependencias: C1.

- [x] **C3** — `src/features/flows/canvas/ActionConfigFields.tsx` (caso `webhook`): selector
  "Registro completo"/"Personalizado"; editor filas clave→`InterpolableField`; panel de vista previa
  interpolada; botón "Probar webhook" con `ConfirmDialog`; validación live de URL. Ver `design.md`
  §6.1.
  - Verificación: visual (Playwright headless) — payload custom + preview + validación de URL. ✅
  - Dependencias: C2, D1.
  - **Bug encontrado y corregido durante la verificación visual:** "Añadir campo" no mostraba la
    fila nueva (el updater filtraba la clave vacía antes de persistir, y las filas se derivaban
    directo de `output.payload` en cada render). Mismo patrón preexistente en `createPerson.data`
    (spec 023). Fix: `personDataRows`/`payloadRows` como estado local de `ActionConfigFields`
    (sembrado una vez vía inicializador perezoso) + `key={node.id}` en `FlowCanvas.tsx` para
    aislar el estado por nodo. Ver detalle en `spec.md` §Progreso Fase C.

- [x] **C4** — `src/flows/engine.ts` (`describeOutput` webhook): plan del dry-run con payload
  interpolado truncado (200 chars). Ver `design.md` §6.4.
  - Verificación: `npm test src/flows/engine.test.ts` — plan contiene el payload. ✅
  - Dependencias: C1.

- [x] **Cierre Fase C:** tests en verde. Smoke visual: webhook con payload custom + vista previa +
  "Añadir campo" funcionando + validación de URL.

## Fase D — Vista previa en vivo por campo

- [x] **D2** — `src/features/flows/canvas/InterpolationPreview.tsx` (NUEVO): presentación pura sobre
  el módulo A1; sin muestra → no renderiza. Ver `design.md` §7.2.
  - Verificación: typecheck. ✅
  - Dependencias: A1.

- [x] **D1** — `src/features/flows/canvas/InterpolableField.tsx` (NUEVO): promueve el wrapper local
  de `ActionConfigFields.tsx` con `VariablePicker` + `VariableValidationHint` +
  `InterpolationPreview` integrados, `ref` interno (elimina 15 `useRef` manuales). Ver `design.md`
  §7.1.
  - Verificación: typecheck; hints siguen apareciendo (incl. en campos que antes no lo tenían, ej.
    `createProject.fields[*].source`). ✅
  - Dependencias: D2.

- [x] **D3** — `src/features/flows/canvas/SampleExplorer.tsx` + `FlowCanvas.tsx`: selector
  "Registro N" cuando `sample.length > 1`; estado `previewRecordIndex` en `FlowCanvas` (clamp a
  rango), bajado a `TriggerNodeDrawer`/`TriggerStep`/`SampleExplorer` y a `ActionConfigFields`. Ver
  `design.md` §7.3.
  - Verificación: visual — selector renderiza cuando hay >1 registro. ✅
  - Dependencias: D1.

- [x] **D4** — `src/features/flows/canvas/ActionConfigFields.tsx`: `sample`/`previewRecordIndex`
  cableados a cada `InterpolableField` (title, assigneeId, dueDate, summary, description,
  dedupeKey, name, fields source, person values, setField value, notification message, email
  to/subject/body, webhook payload values).
  - Verificación: visual — vista previa bajo cada campo con muestra cargada. ✅
  - Dependencias: D1, D3.

- [x] **Cierre Fase D:** typecheck/lint en verde. Smoke visual: drawer con hints/picker
  funcionando correctamente en campos nuevos y existentes.

## Fase E — Valores finales interpolados en la traza

- [x] **E1** — `src/flows/engine.ts` (`FlowRunOutputTrace` + `executeOutput` por tipo): pobla
  `resolved?: Record<string,string>` (truncado 120 chars, sin secretos/bodies) y
  `unresolvedTokens?: string[]`. Ver `design.md` §5. 3 tests nuevos: título final interpolado en
  traza, token no resuelto reportado, secret de webhook ausente de la traza.
  - Verificación: `npm test src/flows/engine.test.ts`. ✅
  - Dependencias: A3, B2-B6.

- [x] **E2** — `src/features/flows/FlowRunTraceView.tsx` (`OutputRow` + nuevo `ResolvedFields`):
  renderiza `resolved` como pares clave→valor; `unresolvedTokens` como chips ámbar. DebuggerPanel
  lo hereda (reusa `FlowRunTraceView`).
  - Verificación: typecheck; presentación pura sobre datos ya testeados en E1. ✅
  - Dependencias: E1.

- [x] **Cierre de spec 026:** `npm run typecheck && npm run lint && npm test && npm run build` en
  verde (446/446 tests). Smoke Playwright end-to-end contra `npm run dev` real (Fases A/B/C/D
  verificadas visualmente, ver `spec.md` §Verificación). `spec.md` §Progreso actualizado; header
  → `🟢 Fases A-E completas`.

---

## Resumen de archivos tocados

**Nuevos:**
- `src/flows/interpolation.ts` + `interpolation.test.ts`
- `src/flows/webhook-request.ts` + `webhook-request.test.ts`
- `src/flows/webhook-test.ts` + `webhook-test.test.ts`
- `src/features/flows/canvas/InterpolableField.tsx`
- `src/features/flows/canvas/InterpolationPreview.tsx`

**Modificados:**
- `src/flows/engine.ts` + `engine.test.ts`
- `src/domain/schemas/flow.ts`, `src/domain/schemas/common.ts` (SCHEMA_VERSION 12→13)
- `src/domain/migrations.ts` + `migrations.test.ts`
- `src/features/flows/canvas/ActionConfigFields.tsx` (incl. fix de estado local por nodo)
- `src/features/flows/canvas/variables.ts` + `variables.test.ts`
- `src/features/flows/canvas/SampleExplorer.tsx`
- `src/features/flows/canvas/FlowCanvas.tsx` (+ `key={node.id}`)
- `src/features/flows/steps/TriggerStep.tsx`, `src/features/flows/canvas/TriggerNodeDrawer.tsx`
  (propagación de `previewRecordIndex`)
- `src/features/flows/FlowRunTraceView.tsx`

**Tests nuevos:** 45 (401 baseline → 446).

---

## Criterio de done de la spec

- [x] Las 5 fases (A–E) con todas sus tareas marcadas `[x]`.
- [x] `npm run typecheck && npm run lint && npm test && npm run build` en verde — 446/446 tests.
- [x] `spec.md` §Progreso actualizado con entradas por fase (estado, archivos, tests, verificación
  end-to-end) — convención specs 018–025.
- [x] Verificación del síntoma original: crear tarea con `{{Nombre Cliente}}` de una columna de
  Sheets con espacios → el `VariableValidationHint` lo detecta correctamente (antes lo ignoraba);
  la interpolación en runtime resuelve el valor real (test de engine), no el template literal.
- [x] Smoke visual en navegador real (Playwright headless) — confirmó el fix del síntoma reportado
  y encontró/corrigió un bug adicional ("Añadir campo" del payload de webhook).
