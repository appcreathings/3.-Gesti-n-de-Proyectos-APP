# Plan — Spec 026 · Interpolación confiable + llenado de objetos + webhooks

> Plan de ejecución por fases. Cada tarea incluye archivo, cambio y verificación.
> Ejecutar en orden (Fase A bloquea al resto; B/C/D paralelizables tras A).
> Baseline actual: 401/401 tests, typecheck/build en verde.

## Fase A — Módulo de interpolación unificado y robusto

### A1. Crear `src/flows/interpolation.ts`
- **Archivo:** `src/flows/interpolation.ts` (NUEVO)
- **Cambio:** `TOKEN_RE`, `parseTokens`, `parseToken`, `resolvePath`, `interpolateString`
  (retorna `{ value, unresolved }`), `interpolateObject` (retorna `{ value, unresolved }`).
  Soporte `{{campo||default}}` y resolución literal-primero-luego-anidada (ver `design.md` §2).
- **Dependencias:** —.
- **Verificación:** `npm run typecheck`.

### A2. Tests del módulo
- **Archivo:** `src/flows/interpolation.test.ts` (NUEVO)
- **Cambio:** cubrir: clave con espacios (`{{Nombre Cliente}}`), acentos/eñe (`{{Teléfono}}`),
  guiones, path anidado (`{{properties.amount}}`), clave literal con punto que gana sobre path,
  default `{{x||fallback}}`, token no resuelto → `""` + listado en `unresolved`, `interpolateObject`
  recursivo, token `\w` legacy resuelve idéntico.
- **Dependencias:** A1.
- **Verificación:** `npm test src/flows/interpolation.test.ts`.

### A3. `engine.ts` consume el módulo compartido
- **Archivo:** `src/flows/engine.ts`
- **Cambio:** eliminar `interpolateString`/`interpolateObject`/`getNestedValue` locales
  (`:1073-1104`), importar del módulo. Actualizar TODOS los call sites para leer `.value`
  (createTask title/description/summary/assigneeId/dueDate/tags/dedupeKey, createProject name/dedupeKey,
  createPerson data, createNotification message, email to/subject/body, webhook payload).
  `getNestedValue` sigue disponible (lo re-exporta `interpolation.ts` como `resolvePath` o alias).
- **Dependencias:** A1.
- **Verificación:** `npm run typecheck && npm test src/flows/engine.test.ts` (los 401 existentes
  no deben romperse).

### A4. `==`/`!=` coercionan números-como-string
- **Archivo:** `src/flows/engine.ts` (`evaluateCondition:427-451`)
- **Cambio:** `==`/`!=` usan `toComparableNumber` en ambos lados; si ambos coercibles → comparación
  numérica, si no → estricta actual (ver `design.md` §3).
- **Dependencias:** —.
- **Verificación:** `engine.test.ts` — 2 tests nuevos (`"5000" == 5000` pasa; `"active" == "active"`
  sigue por rama estricta).

### A5. `validateVariables` sobre el tokenizador compartido
- **Archivo:** `src/features/flows/canvas/variables.ts` (`:107-124`)
- **Cambio:** reescribir el `TOKEN_RE` local para tokenizar con `parseTokens` del módulo A1 — el hint
  dispara para `{{Nombre Cliente}}`. Mantener "available vacío → valid: true".
- **Dependencias:** A1.
- **Verificación:** `variables.test.ts` — 2 tests nuevos (token con espacios detectado como
  faltante/presente).

**Cierre Fase A:** `npm run typecheck && npm run lint && npm test` en verde. La interpolación de un
`{{Nombre Cliente}}` de Sheets ya funciona en runtime (verificable con un test de engine).

---

## Fase B — Llenado real de campos en creación de objetos

### B1. Schema `matchSource` + bump v13
- **Archivo:** `src/domain/schemas/flow.ts` (`CreatePersonOutputSchema`),
  `src/domain/schemas/common.ts` (`SCHEMA_VERSION` 12→13), `src/domain/migrations.ts`
  (paso `{ to: 13, up: (data) => data }` en `flows`).
- **Cambio:** `matchSource: z.string().optional()` en `CreatePersonOutputSchema`.
- **Dependencias:** —.
- **Verificación:** `migrations.test.ts` — test v12→v13 identidad.

### B2. `setField` interpola el valor
- **Archivo:** `src/flows/engine.ts` (`:919-930` ejecución, `:600-615` describe)
- **Cambio:** interpolar `output.value` cuando es string, en ambos caminos (ver `design.md` §4.1).
- **Dependencias:** A3.
- **Verificación:** `engine.test.ts` — setField con `{{amount}}` string → valor real; no-string
  intacto.

### B3. `createProject.fields` bimodal
- **Archivo:** `src/flows/engine.ts` (`:807-812`)
- **Cambio:** `source` con `{{` → interpolar; sin → `getNestedValue` (ver `design.md` §4.2). Guard
  `value !== ""`.
- **Dependencias:** A3.
- **Verificación:** `engine.test.ts` — `{{amount}}` llena el campo; path crudo `amount` sigue
  funcionando.

### B4. `createPerson` con `matchSource` + resolvePath
- **Archivo:** `src/flows/engine.ts` (`:858-904`)
- **Cambio:** valor de match vía `matchSource`/`resolvePath` (soporta `properties.email`); fallbacks
  `data.name`/`data.email` por `resolvePath` (ver `design.md` §4.3).
- **Dependencias:** A3, B1.
- **Verificación:** `engine.test.ts` — match anidado encuentra persona existente; `matchSource`
  interpolado.

### B5. `createTask.assigneeId` resuelto contra Personas
- **Archivo:** `src/flows/engine.ts` (`:846`, nueva `resolvePersonId`)
- **Cambio:** tras interpolar, resolver `id`→email→nombre; sin match → `undefined` + traza (ver
  `design.md` §4.4). La UI (`ActionConfigFields.tsx:208-218`) actualiza placeholder/ayuda.
- **Dependencias:** A3.
- **Verificación:** `engine.test.ts` — `{{email}}` → persona correcta; sin match → sin responsable.

### B6. `createTask.dueDate` coaccionada
- **Archivo:** `src/flows/engine.ts` (`:847`, nueva `coerceDueDate`)
- **Cambio:** ISO/epoch-ms → `YYYY-MM-DD`; no parseable → sin fecha + warning en traza (ver
  `design.md` §4.5).
- **Dependencias:** A3.
- **Verificación:** `engine.test.ts` — epoch-ms de HubSpot → fecha válida; ISO recortado; basura →
  undefined.

### B7. Selects de campo destino
- **Archivo:** `src/features/flows/canvas/ActionConfigFields.tsx` (`setField.field:527`,
  `createProject.fields[*].target:375-384`)
- **Cambio:** `Input` libre → `Select` con `INTERNAL_TARGET_FIELDS.project` + "otro…" (ver
  `design.md` §8).
- **Dependencias:** —.
- **Verificación:** visual — el select ofrece name/status/productId/description.

**Cierre Fase B:** tests en verde. Screenshot: crear tarea con `setField {{amount}}` → proyecto
recibe el valor real.

---

## Fase C — Webhook configurable, previsualizable y probable

### C1. Builder de request compartido
- **Archivo:** `src/flows/webhook-request.ts` (NUEVO)
- **Cambio:** extraer de `engine.ts:968-1022` `buildWebhookRequest(output, data)` → `{ url, init,
  payload, unresolved }` (payload interpolado + `signPayload` + headers). `engine.ts` webhook lo
  consume (refactor sin cambio de comportamiento).
- **Dependencias:** A3.
- **Verificación:** `engine.test.ts` webhook existentes siguen en verde; test del builder (firma
  presente, payload custom interpolado vs registro completo).

### C2. `webhook-test.ts`
- **Archivo:** `src/flows/webhook-test.ts` (NUEVO) + `webhook-test.test.ts`
- **Cambio:** `testWebhook(output, sampleRecord)` → POST real vía `buildWebhookRequest`, status +
  respuesta truncada (ver `design.md` §6.3).
- **Dependencias:** C1.
- **Verificación:** `webhook-test.test.ts` — fetch mockeado 2xx/4xx/red caída.

### C3. UI del webhook: modos de payload + preview + prueba
- **Archivo:** `src/features/flows/canvas/ActionConfigFields.tsx` (caso `webhook:579-601`)
- **Cambio:** selector "Registro completo"/"Personalizado"; editor de filas clave→`InterpolableField`;
  panel plegable de vista previa interpolada; botón "Probar webhook" con `ConfirmDialog`; validación
  live de URL (ver `design.md` §6.1). Requiere `sample` prop en el caso webhook (bajar desde
  `FlowCanvas`).
- **Dependencias:** C2, D1 (InterpolableField promovido — o inline temporal).
- **Verificación:** visual — payload custom + preview + prueba de envío con status inline.

### C4. `describeOutput` webhook muestra payload
- **Archivo:** `src/flows/engine.ts` (`:645-661`)
- **Cambio:** plan del dry-run con payload interpolado truncado (ver `design.md` §6.4).
- **Dependencias:** C1.
- **Verificación:** `engine.test.ts` describeOutputs webhook → plan contiene el payload.

**Cierre Fase C:** tests en verde. Screenshot: drawer de webhook con payload custom + vista previa +
resultado de "Probar webhook".

---

## Fase D — Vista previa en vivo por campo (UX transversal)

### D1. Promover `InterpolableField` a componente propio
- **Archivo:** `src/features/flows/canvas/InterpolableField.tsx` (NUEVO), refactor de
  `ActionConfigFields.tsx:36-64`.
- **Cambio:** componente con `VariablePicker` + `VariableValidationHint` + `InterpolationPreview`
  integrados (ver `design.md` §7.1). `ActionConfigFields` importa y elimina los montajes manuales de
  hint tras cada campo.
- **Dependencias:** D2.
- **Verificación:** typecheck; los hints existentes siguen apareciendo.

### D2. `InterpolationPreview`
- **Archivo:** `src/features/flows/canvas/InterpolationPreview.tsx` (NUEVO)
- **Cambio:** presentación pura sobre el módulo A1 (ver `design.md` §7.2).
- **Dependencias:** A1.
- **Verificación:** typecheck; sin muestra → no renderiza.

### D3. Selector de registro en `SampleExplorer` + `previewRecordIndex`
- **Archivo:** `src/features/flows/canvas/SampleExplorer.tsx`,
  `src/features/flows/canvas/FlowCanvas.tsx`
- **Cambio:** selector "Registro N" cuando `sample.length > 1`; estado `previewRecordIndex` en
  `FlowCanvas`, bajado como prop a los drawer y a `InterpolableField` (ver `design.md` §7.3).
- **Dependencias:** D1.
- **Verificación:** visual — cambiar de registro actualiza las previews.

### D4. Cablear preview en todos los `InterpolableField` de `ActionConfigFields`
- **Archivo:** `src/features/flows/canvas/ActionConfigFields.tsx`
- **Cambio:** pasar `sample`/`previewRecordIndex` a cada `InterpolableField` (title, name, message,
  to, subject, body, setField value, person values, dedupeKeys, webhook payload values).
- **Dependencias:** D1, D3.
- **Verificación:** visual — vista previa bajo cada campo con muestra cargada.

**Cierre Fase D:** typecheck/lint en verde. Screenshot: drawer con vistas previas en vivo + selector
de registro.

---

## Fase E — Valores finales interpolados en la traza

### E1. `FlowRunOutputTrace` gana `resolved`/`unresolvedTokens`
- **Archivo:** `src/flows/engine.ts` (interface `:77-91`, `executeOutput` por tipo)
- **Cambio:** poblar `resolved` (truncado, sin secretos) y `unresolvedTokens` por output (ver
  `design.md` §5).
- **Dependencias:** A3, B2-B6.
- **Verificación:** `engine.test.ts` — `resolved` por tipo; secretos ausentes; `unresolvedTokens`
  presente con token roto.

### E2. `FlowRunTraceView` renderiza `resolved` + chips
- **Archivo:** `src/features/flows/FlowRunTraceView.tsx` (`OutputRow:27-66`)
- **Cambio:** pares clave→valor de `resolved`; chips ámbar de `unresolvedTokens`.
- **Dependencias:** E1.
- **Verificación:** visual — traza muestra título final; chip ámbar para token roto. DebuggerPanel lo
  hereda.

**Cierre Fase E (y de spec):** `npm run typecheck && npm run lint && npm test && npm run build` en
verde. Smoke Playwright end-to-end (ver `spec.md` §Verificación). Screenshots anexados a
`spec.md` §Progreso.

---

## Secuencia de ejecución resumida

```
A1 → A2 → A3 → A4 → A5   [Cierre Fase A — desbloquea todo]
                  │
      ┌───────────┼───────────┬───────────┐
      ▼           ▼           ▼           ▼
   Fase B      Fase C      Fase D      (E depende de B)
 B1→B2→B3→    C1→C2→C3→   D2→D1→D3→
 B4→B5→B6→B7  C4          D4
      └───────────┴───────────┴──────► E1 → E2  [Cierre spec]
```

C3 usa el `InterpolableField` de D1 — si C se hace antes que D, montar el editor de payload con el
`InterpolableField` inline actual y migrarlo en D1. E depende de que B (llenado real) esté cerrada
para que `resolved` refleje los valores post-resolución.

## Tests nuevos (resumen)

| Archivo | Tests nuevos (aprox.) |
|---|---|
| `src/flows/interpolation.test.ts` | 9 (nuevo archivo) |
| `src/flows/engine.test.ts` | 10 (`==` coerción, setField, createProject.fields, createPerson, assigneeId, dueDate, resolved/unresolved, describe webhook) |
| `src/flows/webhook-request` (en engine.test o propio) | 2 |
| `src/flows/webhook-test.test.ts` | 3 (nuevo archivo) |
| `src/features/flows/canvas/variables.test.ts` | 2 (tokens con espacios) |
| `src/domain/migrations.test.ts` | 1 (v12→v13) |
| **Total estimado** | **~27 tests nuevos** |

## Riesgos abiertos a resolver durante implementación

1. **Shape de retorno de `interpolateString`** (§2/§10 del design): el cambio string→objeto toca
   todos los call sites del engine. Hacerlo en A3 de una pasada, apoyándose en el compilador.
2. **`InterpolableField` promovido antes que Fase C** — decidir si C3 usa el inline actual o espera
   D1. Recomendado: D1 primero si se paraleliza D antes de C.
3. **`previewRecordIndex` fuera de rango** si la muestra cambia — clamp a `[0, sample.length-1]`.
4. **`dueDate` epoch-s (10 dígitos)** — fuera de v1 (HubSpot usa ms); documentar en el helper.
