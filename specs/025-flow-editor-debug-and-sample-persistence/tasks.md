# Tasks — Spec 025 · Editor de flujos: muestra persistente + dry-run + debug

> Checklist ejecutable. Marcar `[x]` al completar; `[~]` en progreso; `[!]`
> bloqueado (anotar motivo en una línea debajo).

## Fase A — Persistencia de `lastSample`

- [ ] **A1** — `src/domain/schemas/flow.ts`: añadir `lastSample?: z.array(z.record(z.unknown())).max(3).optional()` y `lastSampleAt?: IsoDate.optional()` a `FlowRuleSchema`. Bump `SCHEMA_VERSION` en `src/domain/schemas/common.ts` 11→12.
  - Verificación: `npm run typecheck` en verde.
  - Dependencias: —.

- [ ] **A2** — `src/domain/migrations.ts`: añadir paso `{ to: 12, up: (data) => data }` en el array `flows`. Añadir test en `src/domain/migrations.test.ts` que verifique el flujo de un doc v11 a v12 sin pérdida de datos.
  - Verificación: `npm test src/domain/migrations.test.ts`.
  - Dependencias: A1.

- [ ] **A3** — `src/flows/migration.ts`: `duplicateFlow` resetea explícitamente `lastSample: undefined` y `lastSampleAt: undefined`. Ampliar `src/flows/migration.test.ts` con test que verifique que la copia no los hereda.
  - Verificación: `npm test src/flows/migration.test.ts`.
  - Dependencias: A1.

- [ ] **A4** — `src/features/flows/steps/TriggerStep.tsx`: tras "Probar conexión" exitoso, persistir `lastSample = sample.slice(0,3)` y `lastSampleAt`. Al cambiar `connectionId`/`provider`/`objectType`, limpiar `lastSample`/`lastSampleAt`. Mostrar `Badge` con `Muestra: N reg · HH:mm` cuando `flow.lastSampleAt` existe.
  - Verificación: visual OK.
  - Dependencias: A1, A3.

- [ ] **A5** — `src/features/flows/canvas/FlowCanvas.tsx`: añadir props `initialSample?` y `onSampleChange?`. Inicializar `useState(triggerSample)` desde `initialSample`. Propagar "Probar conexión" exitosa al padre via `onSampleChange`.
  - Verificación: typecheck OK.
  - Dependencias: A4.

- [ ] **A6** — `src/features/flows/FlowBuilderPage.tsx`: estado `sample` inicializado desde `flow.lastSample`. Pasar `initialSample`/`onSampleChange` al canvas. En `handleSave`, incluir `lastSample` (cap 3) y `lastSampleAt` en `finalFlow`.
  - Verificación: e2e Playwright (crear flujo → probar conexión → guardar → recargar → variables siguen visibles).
  - Dependencias: A5.

- [ ] **Cierre Fase A:** `npm run typecheck && npm run lint && npm test` en verde. Screenshot anexado a `spec.md` §Progreso.

## Fase B — Variables en condiciones + validación sincronizada

- [ ] **B1** — `src/features/flows/canvas/variables.ts`: `deriveAvailableVariables` gana fallback para poll usando `trigger.config.fields` (o `HUBSPOT_DEFAULT_FIELDS_FOR_OBJECT_TYPE` si `fields` está vacío). Mover constantes desde `TriggerStep.tsx`.
  - Verificación: actualizar `variables.test.ts:39-42`.
  - Dependencias: A1.

- [ ] **B2** — `src/features/flows/canvas/variables.ts`: nueva `validateVariables(template, available): { valid, missing }`. 5 tests nuevos en `variables.test.ts`.
  - Verificación: `npm test src/features/flows/canvas/variables.test.ts`.
  - Dependencias: B1.

- [ ] **B3** — `src/features/flows/canvas/VariableValidationHint.tsx` (NUEVO): componente que renderiza advertencia ámbar con tokens faltantes. Ver `design.md` §6.
  - Verificación: typecheck OK.
  - Dependencias: B2.

- [ ] **B4** — `src/features/flows/canvas/ActionConfigFields.tsx`: tras cada `InterpolableField` de CAMPOS_INTERPOLABLES (ver §6 del design), añadir `<VariableValidationHint>`.
  - Verificación: visual con typo `{{namae}}` muestra advertencia.
  - Dependencias: B3.

- [ ] **B5** — `src/features/flows/canvas/TransformConfigFields.tsx`: confirmar que no aplica `VariableValidationHint` en v1 (mapeo usa paths, no templates) — añadir comentario documentando la decisión.
  - Verificación: N/A.
  - Dependencias: B3.

- [ ] **B6** — `src/features/flows/canvas/ConditionConfigFields.tsx`: añadir props `trigger`/`sample`. Sustituir el `<Input>` de `condition.field` por una variante con `VariablePicker`. Añadir `<VariableValidationHint>` con `template={\`{{${condition.field}}\`}``. Para `condition.value` con op `contains`/`==`, datalist con valores del sample.
  - Verificación: visual — drawer de condición con `VariablePicker`.
  - Dependencias: B1, B3.

- [ ] **B7** — `src/features/flows/canvas/FlowCanvas.tsx`: pasar `trigger` y `sample` al `case "condition"` del `switch` (líneas 182-194).
  - Verificación: typecheck OK + drawer pinta picker.
  - Dependencias: B6, A5.

- [ ] **Cierre Fase B:** tests en verde. Screenshot del drawer de condición con `VariablePicker` + banner amarillo de typo.

## Fase C — Dry-run con `describeOutputs`

- [ ] **C1** — `src/flows/engine.ts`: añadir `describeOutputs?: boolean` a `FlowEngineInput`. `FlowRunOutputTrace` gana `plan?: string`. `executeOutput` gana `describeOnly: boolean` y si true retorna `{ plan }` sin mutar. Nueva función privada `describeOutput` con switch por tipo. 3 tests nuevos en `engine.test.ts`.
  - Verificación: `npm test src/flows/engine.test.ts`.
  - Dependencias: A1.

- [ ] **C2** — `src/flows/dry-run.ts` (NUEVO): `dryRunFlow(flow, deps)`. Poll: reusa `fetchPollSampleForFlow`. Event: synthetic desde `EVENT_FIELD_EXAMPLES`. Llama `runFlowEngine({ ..., trace: true, describeOutputs: true })`. 4 tests nuevos en `dry-run.test.ts`.
  - Verificación: `npm test src/flows/dry-run.test.ts`.
  - Dependencias: C1.

- [ ] **C3** — `src/features/flows/FlowRunTraceView.tsx`: `OutputRow` renderiza `output.plan` (italic-gray) en lugar del badge outcome cuando esté presente.
  - Verificación: visual OK.
  - Dependencias: C1.

- [ ] **C4** — `src/features/flows/canvas/DebuggerPanel.tsx` (NUEVO): dock colapsable. Botones "Simular flujo" / "Ejecutar" (el último delega al padre). Estados `idle`/`loading`/`result`/`error`. Render del trace con borde gris (dry) o verde (real).
  - Verificación: typecheck OK.
  - Dependencias: C2, C3.

- [ ] **C5** — `src/features/flows/FlowBuilderPage.tsx`: layout grid `lg:grid-cols-[2fr_1fr]` con `FlowCanvas` + `DebuggerPanel`. Inyectar deps de `useDataStore` (projects, people, projectTypes, processTemplates, checklistTemplates).
  - Verificación: e2e — pulsar "Simular flujo" en editor → aparece traza; no se crean tareas reales.
  - Dependencias: C4.

- [ ] **Cierre Fase C:** tests en verde. Screenshot del DebuggerPanel tras dry-run.

## Fase D — Ejecución real desde el editor

- [ ] **D1** — `src/features/flows/FlowBuilderPage.tsx`: botón "Ejecutar" en `PageHeader` actions. Deshabilitado si `!isEditing` con tooltip. Abre `ConfirmDialog` (poll) o `RunEventFlowDialog` (event). Tras ejecutar, busca el último `FlowRunLog` para `flow.id` y lo pasa al `DebuggerPanel` como `realRunResult`.
  - Verificación: e2e — pulsar Ejecutar → ConfirmDialog → confirmar → panel muestra traza real; se crea tarea en store.
  - Dependencias: C5.

- [ ] **D2** — `src/features/flows/FlowBuilderPage.tsx`: detectar `isDirty` (via `lastSavedGraph` + comparación). Advertencia `ConfirmDialog` "Tienes cambios sin guardar; se ejecutará la versión guardada" antes de ejecutar un flow dirty. Tooltip del botón deshabilitado actualizado.
  - Verificación: visual OK.
  - Dependencias: D1.

- [ ] **Cierre Fase D:** tests en verde. Screenshot de DebuggerPanel con traza real (borde verde).

## Fase E — Sincronización reactiva y badge

- [ ] **E1** — `src/features/flows/canvas/FlowCanvas.tsx`: confirmar (y documentar con comentario) que `triggerSample` ya fluye reactivamente. No requiere cableado nuevo.
  - Verificación: e2e — drawer con `{{namae}}` advertido → Probar conexión → advertencia persiste → corregir typo → desaparece sin cerrar drawer.
  - Dependencias: B7.

- [ ] **E2** — `src/features/flows/steps/TriggerStep.tsx`: confirmar badge `Muestra: N reg · HH:mm` (A4 ya lo introdujo — aquí se ajusta visualmente con `Badge` del design system, alineado a la derecha del botón "Probar conexión").
  - Verificación: visual OK.
  - Dependencias: A4, B7.

- [ ] **Cierre de spec 025:** `npm run typecheck && npm run lint && npm test && npm run build` en verde. Screenshot final del editor completo (badge + drawer con picker + banner typo + DebuggerPanel con traza) anexado a `spec.md` §Progreso.

---

## Resumen de archivos tocados

**Modificados:**
- `src/domain/schemas/common.ts` (SCHEMA_VERSION)
- `src/domain/schemas/flow.ts`
- `src/domain/migrations.ts` + `src/domain/migrations.test.ts`
- `src/flows/migration.ts` + `src/flows/migration.test.ts`
- `src/flows/engine.ts` + `src/flows/engine.test.ts`
- `src/features/flows/steps/TriggerStep.tsx`
- `src/features/flows/canvas/FlowCanvas.tsx`
- `src/features/flows/canvas/ConditionConfigFields.tsx`
- `src/features/flows/canvas/TransformConfigFields.tsx`
- `src/features/flows/canvas/ActionConfigFields.tsx`
- `src/features/flows/canvas/variables.ts` + `variables.test.ts`
- `src/features/flows/FlowBuilderPage.tsx`
- `src/features/flows/FlowRunTraceView.tsx`

**Nuevos:**
- `src/flows/dry-run.ts` + `src/flows/dry-run.test.ts`
- `src/features/flows/canvas/VariableValidationHint.tsx`
- `src/features/flows/canvas/DebuggerPanel.tsx`

**Tests nuevos estimados:** ~15 (ver `plan.md` §"Tests nuevos").

---

## Criterio de done de la spec

- ✅ Las 5 fases (A, B, C, D, E) con todas sus tareas marcadas `[x]`.
- ✅ `npm run typecheck && npm run lint && npm test && npm run build` en verde
  (test count reportado en `spec.md` §Progreso con formato `NNN/NNN`).
- ✅ Screenshot anexado a `spec.md` §Progreso por cada fase.
- ✅ `spec.md` §Progreso actualizado con entradas por fase (estado, archivos
  tocados, tests, verificación end-to-end) — siguiendo la convención de las
  specs 018–024.
- ✅ Estado general al cierre: `🟢 Fases 1-5 completas` (o el rango que
  aplique) en el header de `spec.md` §Progreso.