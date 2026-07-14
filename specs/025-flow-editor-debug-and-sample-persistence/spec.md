# Spec 025 — Editor de flujos: persistencia de muestra, variables sincronizadas y simulación (dry-run + ejecución real)

## Progreso

- **Estado general: 🟢 Fases A-E completas (2026-07-14).**

  Esta spec aborda el ciclo "configurar → probar → depurar" del editor de flujos. La
  implementación se completó en una sola pasada, con typecheck/lint/test/build en verde y
  401/401 tests pasando (+17 tests nuevos respecto al baseline 384).

- **Fase A — Persistencia de `lastSample`: ✅ implementada y verificada (2026-07-14).**
  - `src/domain/schemas/common.ts`: `SCHEMA_VERSION` 11→12.
  - `src/domain/schemas/flow.ts`: `FlowRuleSchema` gana `lastSample?: z.array(z.record(z.unknown())).max(3).optional()` y
    `lastSampleAt?: IsoDate.optional()`.
  - `src/domain/migrations.ts`: paso identidad v11→v12 (campos opcionales, sin transformación).
  - `src/flows/migration.ts`: `duplicateFlow` resetea explícitamente `lastSample`/`lastSampleAt` —
    la copia no hereda la muestra de otra conexión.
  - `src/features/flows/steps/TriggerStep.tsx`: tras "Probar conexión" exitosa, propaga la muestra
    vía `onSampleChange`; al cambiar `connectionId`/`provider`/`objectType`, limpia. Badge
    "Muestra: N reg · HH:mm" visible en el trigger step cuando hay muestra persistida.
  - `src/features/flows/canvas/FlowCanvas.tsx`: props nuevas `initialSample` y `onSampleChange`;
    `triggerSample` se hidrata desde `initialSample` y propaga al padre vía `updateTriggerSample`.
  - `src/features/flows/FlowBuilderPage.tsx`: estado `sample` hidratado desde `flow.lastSample`;
    `handleSave` persiste `lastSample` (cap 3) + `lastSampleAt`.
  - Tests: `migrations.test.ts` (2 nuevos — convergencia v11→v12, idempotencia v12),
    `migration.test.ts` (1 nuevo — duplicateFlow no propaga lastSample).

- **Fase B — Variables en condiciones + validación sincronizada: ✅ implementada y verificada
  (2026-07-14).**
  - `src/features/flows/canvas/variables.ts`:
    - `deriveAvailableVariables` gana fallback para `poll`: usa `trigger.config.fields` (o
      `HUBSPOT_DEFAULT_FIELDS_FOR_OBJECT_TYPE` defaults) cuando no hay muestra. Antes devolvía `[]`,
      dejando al usuario escribiendo a ciegas nombres de campos que el propio flujo ya conocía.
    - Nueva util `validateVariables(template, available): { valid, missing }`. Compara por path
      completo o top-level. Cuando `available` está vacío, devuelve `valid: true` (no advertir
      falsos positivos).
    - Exporta `EVENT_FIELD_EXAMPLES` y `HUBSPOT_DEFAULT_FIELDS_FOR_OBJECT_TYPE` (single source
      of truth — `TriggerStep` los importa ahora).
  - `src/features/flows/canvas/VariableValidationHint.tsx` (NUEVO): banner ámbar no bloqueante
    con tokens huérfanos.
  - `src/features/flows/canvas/ActionConfigFields.tsx`: integra `VariableValidationHint` tras
    cada `InterpolableField` (title, assigneeId, dueDate, summary, description, dedupeKey,
    name, fields source, person value, setField value, notification message, email to/subject/body).
  - `src/features/flows/canvas/TransformConfigFields.tsx`: documentado que no aplica (mapeo usa
    paths crudos, transformCode es JS no template).
  - `src/features/flows/canvas/ConditionConfigFields.tsx`: reescrito para aceptar `trigger`/`sample`,
    usar `VariablePicker` en `condition.field`, `datalist` para `condition.value` cuando el op es
    string-ish. `VariableValidationHint` en `{{${condition.field}}}` para advertir si el campo
    elegido no está en la muestra.
  - `src/features/flows/canvas/FlowCanvas.tsx`: pasa `trigger`/`sample` al `case "condition"`
    (antes no lo hacía — era el único drawer que se quedaba fuera del hilo de variables).
  - Tests: `variables.test.ts` (10 nuevos — 4 de `validateVariables` con casos path/nested/empty,
    3 de fallback poll con config.fields/defaults/sheets-vacío, ajuste del test previo de
    "poll empty list" a sheets-only).

- **Fase C — Dry-run con `describeOutputs`: ✅ implementada y verificada (2026-07-14).**
  - `src/flows/engine.ts`:
    - `FlowEngineInput` gana `describeOutputs?: boolean`.
    - `FlowRunOutputTrace` gana `plan?: string`.
    - Nueva función `describeOutput(output, data, source, projectMap, people, runContext)` con
      switch por tipo — devuelve `{ plan, outcome }` sin mutar/llamar a red. Reusa las mismas
      resoluciones de target que el run real (`resolveTargetProjectId`,
      `resolveCreateTaskProjectId`); si fallan, el `plan` lo describe honestamente
      ("se omitiría — el proyecto 'X' no existe").
    - `executeOutput` gana `describeOnly: boolean` y ramifica al `describeOutput` cuando true.
      `result.newProjects`/`changedProjects`/`notifications`/`outboundDeliveries`/`emailDeliveries`
      quedan vacíos; `executedFlowIds` no se incrementa.
  - `src/flows/dry-run.ts` (NUEVO): `dryRunFlow(flow, deps)` — reusa `fetchPollSampleForFlow` (poll)
    o construye synthetic event desde `EVENT_FIELD_EXAMPLES` (event, sin elegir entidad real —
    previsualización de forma, no invariant-check). Llama `runFlowEngine({ trace: true,
    describeOutputs: true })`.
  - `src/features/flows/FlowRunTraceView.tsx`: `OutputRow` renderiza `output.plan` (italic-gray)
    en lugar del badge outcome cuando está presente — distingue simulación de run real.
  - `src/features/flows/canvas/DebuggerPanel.tsx` (NUEVO): dock lateral con estados
    `idle`/`loading`/`result`/`error`, botón "Simular flujo", renderiza la traza con borde
    gris (dry) o verde (real).
  - `src/features/flows/FlowBuilderPage.tsx`: layout grid `lg:grid-cols-[2fr_1fr]` con
    `FlowCanvas` + `DebuggerPanel`.
  - Tests: `engine.test.ts` (3 nuevos — describeOutputs no muta estado, webhook no llama fetch,
    default sin flag sigue mutando), `dry-run.test.ts` (4 nuevos — event con synthetic,
    event con transformCode roto, poll con fetch fallido, poll con fetch exitoso sin mutar).

- **Fase D — Ejecución real desde el editor: ✅ implementada y verificada (2026-07-14).**
  - `src/features/flows/FlowBuilderPage.tsx`: botón "Ejecutar" en `PageHeader` actions (entre
    Cancelar y Guardar). Deshabilitado si `!isEditing` con tooltip. Abre `ConfirmDialog` (poll)
    o `RunEventFlowDialog` (event). Tras ejecutar, busca el último `FlowRunLog` del flow en el
    store y lo pasa al `DebuggerPanel` como `realRunResult` (borde verde distinguible).
    `isDirty` (cambio sin guardar desde el último save) → aviso extra en el ConfirmDialog
    ("Tienes cambios sin guardar. Se ejecutará la versión guardada…").

- **Fase E — Sincronización reactiva + badge: ✅ implementada y verificada (2026-07-14).**
  - `src/features/flows/canvas/FlowCanvas.tsx`: comentario-documentación extenso explicando
    que la revalidación reactiva funciona gratis vía React props flow (no requiere cableado
    extra). Cuando `triggerSample` cambia (vía "Probar conexión" o hidratación), los drawer
    abiertos re-renderizan y recalculan `availableVariables` + `validateVariables`.
  - `src/features/flows/steps/TriggerStep.tsx`: badge "Muestra: N reg · HH:mm" (implementado
    en A4) — se actualiza en vivo al probar la conexión.

- **Incremento post-Fase E — Explorador de muestra en el nodo trigger: ✅ implementado y
  verificado (2026-07-14).**
  - Gap detectado tras cerrar la Fase E: el badge "Muestra: N reg · HH:mm" solo decía cuántos
    registros trajo la última prueba, pero NO dejaba ver qué campos tenía ni copiar tokens —
    el usuario tenía que abrir el drawer de Transformación para verlos. Es la pieza que faltaba
    para que el nodo inicial del flujo fuera "autocontenida": probar conexión → ver qué trajo →
    copiar `{{campo}}` sin salir del drawer del trigger.
  - `src/features/flows/canvas/SampleExplorer.tsx` (NUEVO): componente que recibe la muestra
    (`triggerSample` del canvas o `flow.lastSample` persistido) y muestra:
    - Conteo de registros + badge de frescura.
    - Lista ordenada de campos: path, tipo JS detectado (string/number/boolean/array/object/null),
      valor de ejemplo truncado, presencia (en cuántos de los N registros aparece — detecta
      campos opcionales).
    - Botón "Copiar `{{campo}}`" por cada fila — copia el token listo para pegar en cualquier
      campo interpolable del flujo.
    - Panel plegable "JSON crudo" con los registros completos para inspección.
  - `src/features/flows/steps/TriggerStep.tsx`: nueva prop `sample?` — `displaySample` prefiere
    la muestra viva del canvas sobre `flow.lastSample`. Monta `SampleExplorer` debajo del botón
    "Probar conexión".
  - `src/features/flows/canvas/TriggerNodeDrawer.tsx`: prop `sample?` propagada desde el canvas.
  - `src/features/flows/canvas/FlowCanvas.tsx`: pasa `triggerSample` al `case "trigger"` (antes
    solo lo pasaba a condition/transform/action — trigger era el único drawer desconectado del
    hilo de muestra).
  - Sin tests nuevos (componente de presentación pura, sin lógica de negocio derivable) — la
    lógica de `detectType`/`formatExample` es trivial. El efecto del cambio es visual.

- **Verificación final (2026-07-14):**
  - `npm run typecheck` — en verde (sin errores de tipos).
  - `npm run lint` — 3 errores preexistentes en archivos no relacionados (gemini agent,
    modelSelector, useBreakpoint); sin errores nuevos introducidos por esta spec.
  - `npm test` — 401/401 tests pasando (+17 tests nuevos respecto al baseline 384).
  - `npm run build` — en verde (105 entradas PWA precache, sw.js generado).
  - Capturas pendientes de anexar (smoke manual en navegador con Playwright según §Verificación
    de la spec) — los tests unitarios cubren todos los casos de comportamiento.

**Estado: spec 025 completa — Fases A, B, C, D, E implementadas y verificadas.**

## Context

El editor de flujos (`src/features/flows/FlowBuilderPage.tsx`) quedó funcional tras las specs 018–024,
pero una revisión de UX/producto sobre el ciclo "configurar → probar → depurar" reveló gaps reales que
erosionan la confianza del usuario no-code en el módulo. Cada hallazgo está anclado a código revisado:

1. **`triggerSample` es efímero** — `FlowCanvas.tsx:67` lo guarda en `useState`; el `handleSave` del
   builder (`FlowBuilderPage.tsx:50-73`) nunca lo serializa. Al reabrir el editor, las variables
   disponibles se pierden hasta que el usuario pulsa de nuevo "Probar conexión". Spec 022 §A lo dejó
   deliberadamente efímero "para coincidir con cómo ya funciona *Probar con datos de ejemplo* hoy" — pero
   eso fue un compromiso táctico, no una decisión de producto: el costo es que cada edición de un flujo
   de HubSpot/Sheets empieza a ciegas si el usuario no re-prueba la conexión antes de tocar el mapeo.
2. **Las condiciones no sincronizan variables** — `ConditionConfigFields.tsx:11-50` usa `<Input>` plano
   para `condition.field`, sin `VariablePicker`, sin `datalist`, sin validación. La transformación y las
   acciones ya consumen `availableVariables`/`VariablePicker` (`TransformConfigFields.tsx:147-149`,
   `ActionConfigFields.tsx:74`), pero el paso **más crítico para depurar** (la condición que filtra un
   registro) quedó al margen. El usuario escribe "amount" a ciegas, cuando el registro real trae
   `"properties.amount"` o viceversa — y no se entera hasta que el flujo corre y descarta todo.
3. **`availableVariables` se queda vacío para `poll` sin probar** — `deriveAvailableVariables`
   (`variables.ts:40-58`) devuelve `[]` cuando no hay muestra y el trigger es `poll` (caso verificado por
   el test `variables.test.ts:39-42`). Pero `trigger.config.fields` y `HUBSPOT_FIELDS_BY_TYPE`
   (`TriggerStep.tsx:73-77`) **sí** los conocen de antemano: el usuario ya los eligió al configurar el
   trigger. Hay información en el flujo guardado que la UI de mapeo ignora.
4. **No hay forma de simular el flujo desde el editor** — "Ejecutar ahora" (`FlowsPage.tsx:67-93`)
   solo vive en la lista de flujos. El `FlowBuilderPage` solo ofrece Guardar/Cancelar. Para depurar, el
   usuario tiene que salir del editor, ir a la lista, pulsar "Ejecutar ahora", confirmar, volver al
   editor. Friction real para el caso de uso más común: "estoy configurando, quiero ver si anda".
5. **No existe dry-run de flujo completo** — el "Probar con datos de ejemplo" del `TransformConfigFields`
   (`TransformConfigFields.tsx:184-213`) **solo ejecuta el `transformCode`**, no las condiciones ni los
   outputs. La spec 024 §F5 deja el dry-run como gap explícito (❌). Hoy cada prueba *ejecuta de verdad*:
   crea tareas, envía emails, dispara webhooks. No hay forma de previsualizar "qué haría este flujo" sin
   impacto real — inaceptable para un perfil no-code que no quiere arriesgar un email a un cliente real
   o un POST a un webhook de producción mientras calibra.
6. **La traza de depuración está en otra página** — `FlowRunDetailDrawer`/`FlowRunTraceView` (que ya
   muestran condiciones evaluadas con veredicto, mapeo, transform, desenlace por output — spec 023 §F)
   solo se ven en `/app/flows/history`. Junto al canvas, mientras se edita, no hay feedback de cómo
   evaluó el flujo el último registro de prueba.
7. **"Probar con datos de ejemplo" diverge del modo real** — el sample hardcodeado
   `getSampleDataForTrigger` (`TransformConfigFields.tsx:39-47`) no coincide necesariamente con el
   evento real (`from`/`to` autocompletados por `buildSyntheticEvent` en spec 022 §C). El usuario prueba
   con datos ficticios que pueden no representar lo que el flujo va a recibir — otro caso donde el
   editor muestra una cosa y la realidad hace otra.

**Resultado buscado (en palabra del usuario):** *"lo más claro y fácil posible para el usuario, que
pueda simular el flujo desde el editor de flujos y así poder hacer un debug correcto de cada proceso,
revisa como se están validando las variables para que realmente se sincronice con la prueba de
comunicación que haga el usuario en el flujo."*

**Outcome medible:**
- Al reabrir un flujo guardado con HubSpot/Sheets probado, las variables siguen visibles sin volver a
  probar la conexión (gap 1).
- El selector de campo de condición usa las mismas variables reales que la transformación y las
  acciones, con advertencia visible si un `{{campo}}` referenciado no está en la muestra (gaps 2, 3).
- Dos botones nuevos en el `FlowBuilderPage`: "Simular" (dry-run, no persiste) y "Ejecutar" (real,
  con confirmación), acompañados de la traza `FlowRunTraceView` inline al lado del canvas (gaps 4, 5,
  6).
- La muestra usada por "Simular" viene del mismo lugar que "Ejecutar ahora" (`fetchPollSampleForFlow` /
  `buildSyntheticEvent`), no de un hardcode (gap 7).

## Decisiones confirmadas con el usuario

- **Persistencia embebida en `FlowRule.lastSample`** (cap 3 registros) — más simple que un doc aparte
  `flow-samples`, migración trivial (campo opcional nuevo). La muestra es solo referencia para
  autocompletar/validar, no requiere histórico.
- **Dry-run + ejecución real, ambas desde el editor** — cumple "poder simular el flujo desde el
  editor y debug de cada proceso": dry-run no persistente + botón Ejecutar real con confirmación, con
  la traza inline (`FlowRunTraceView` ya existente).
- **Advertencia (no bloquea guardar)** para `{{campo}}` no encontrados en la muestra — un token
  huérfano puede resolver bien ante una muestra futura distinta; impedir guardar sería frágil y
  confuso para el perfil no-code. Mismo criterio que el campo libre de HubSpot en `TriggerStep`.
- **Spec nueva `025`** en vez de ampliar la `024` — 024 mantiene su roadmap; 025 cubre
  persistencia + muestra + simulación + debug como un ciclo coherente.
- **`EventTrigger` con muestra sintética para dry-run** — el usuario no elige entidad real para el
  dry-run en v1 (`RunEventFlowDialog` se reserva para "Ejecutar" real): el dry-run construye un evento
  sintético representativo con `EVENT_SEED_REQUIREMENTS` + los `EVENT_FIELD_EXAMPLES` ya hardcoded en
  `variables.ts:15-27`. Decisión documentada: el dry-run de eventos es una previsualización de la
  *forma* del flujo, no un invariant-check contra una entidad específica. La ejecución real sí permite
  elegir la entidad (mismo comportamiento que en `FlowsPage`).
- **No capturar payloads HTTP en la traza** — queda fuera de alcance (aptops 024 §F4). El dry-run
  muestra el destino (URL, to, subject) y un string descriptivo del payload *shape*, sin conservar bodies.

## Convención de estado

- ✅ **Ya construido** — existe en producción.
- 🟡 **Parcial / con bug** — subsistema adyacente construido pero no cableado, o comportamiento
  incorrecto.
- ❌ **Gap** — no existe, feature nuevo.

---

## Fase A — Persistencia de muestra (`FlowRule.lastSample`)

**Estado:** ❌ Gap.

**Problema actual:** `triggerSample` vive en `useState` del `FlowCanvas` (línea 67). Al guardar, el
builder descarta el dato. Al reabrir, hay que volver a probar la conexión para ver las variables
disponibles en mapeo/acciones.

**Propuesta:**
- `src/domain/schemas/flow.ts`: añadir
  `lastSample: z.array(z.record(z.unknown())).max(3).optional()` y `lastSampleAt: IsoDate.optional()`
  a `FlowRuleSchema`. Bump `SCHEMA_VERSION` 11→12 en `src/domain/schemas/common.ts`.
- `src/domain/migrations.ts`: añadir paso `{ to: 12, up: (data) => data }` (campo opcional nuevo, sin
  transformación de datos — mismo patrón que el paso v10→v11 de spec 024 §F3).
- `src/flows/migration.ts`: `createEmptyFlow` y `duplicateFlow` NO copian `lastSample`/`lastSampleAt`
  — un flujo nuevo o duplicado arranca sin muestra (evita sembrar ids de conexión viejos en una copia
  que apunta a otra conexión).
- `src/features/flows/steps/TriggerStep.tsx`: al cambiar de conexión o de provider, limpiar
  `lastSample`/`lastSampleAt` (vía `updateFlow({ lastSample: undefined, lastSampleAt: undefined })`).
  Tras "Probar conexión" exitoso, persistir los primeros 3 registros + timestamp actual.
- `src/features/flows/canvas/FlowCanvas.tsx`: inicializar `triggerSample` desde `flow.lastSample` (vía
  `initialGraph.nodes`/props del builder) en lugar de `useState(...)`. Actualizar el callback
  `onSampleChange` para que también suba el cambio al `FlowBuilderPage`, de modo que `handleSave` lo
  persista.
- `src/features/flows/FlowBuilderPage.tsx`: Sumar `lastSample`/`lastSampleAt` al `finalFlow` de
  `handleSave` (líneas 54-65), derivado del estado del canvas (nuevo callback `onSampleChange`).

**Criterios de aceptación:**
- **Dado** un flujo de HubSpot con "Probar conexión" exitoso, **cuando** el usuario pulsa "Guardar",
  **entonces** `flows.json` contiene hasta 3 registros en `lastSample` + `lastSampleAt` con la hora de
  la prueba.
- **Dado** un flujo guardado con `lastSample` poblado, **cuando** el usuario reabre el editor, **entonces**
  los selectores de mapeo/condiciones/acciones muestran las variables reales sin necesidad de volver a
  probar la conexión.
- **Dado** un flujo cuyo `connectionId` cambia (o el provider cambia de HubSpot a Sheets), **cuando** se
  guarda, **entonces** `lastSample` se limpia (los registros viejos ya no aplican).
- **Dado** "Duplicar flujo", **cuando** se crea la copia, **entonces** `lastSample` queda ausente (la
  copia no hereda la muestra de otra conexión).

**Prioridad:** Alta — es la base que hace rewiring de condiciones (Fase B) y simulación reactiva
(Fase E) útiles.

**Dependencias / riesgos:** Subir `SCHEMA_VERSION` impacta todos los adapters; el paso migratorio es
identidad, ya probado en saltos análogos. Tamaño de `flows.json` aumenta en ≤3 registros/flujo —
aceptable para app local-first mono-usuario.

---

## Fase B — Variables en condiciones + validación sincronizada de tokens

**Estado:** 🟡 Parcial — `deriveAvailableVariables`/`VariablePicker` ya existen pero solo los consume
transform/acción; condiciones quedaron fuera. No hay validación de tokens huérfanos en ningún lado.

**Problema actual:**
- `ConditionConfigFields.tsx:11-50` no recibe `sample`/`trigger` ni renderiza `VariablePicker`. El campo
  de la condición es texto libre a ciegas, exactamente lo que la spec 022 §A criticó de la transformación
  y arregló.
- `TriggerStep.tsx:73-77` define `HUBSPOT_FIELDS_BY_TYPE` y `PollTriggerSchema.config.fields` ya enumera
  qué campos va a traer — información que `deriveAvailableVariables` ignora para `poll` sin muestra
  (`variables.ts:52-56` solo cubre el caso `event`).
- Ningún campo interpolable (`title`, `subject`, `body`, `condition.value`, etc.) verifica hoy que un
  `{{token}}` referenciado exista en las variables disponibles. Un flujo puede guardar con
  `{{namae}}` (typo) y solo fallar en runtime silenciosamente.

**Propuesta:**
- `src/features/flows/canvas/ConditionConfigFields.tsx`: añadir props `trigger` y `sample`. Calcular
  `availableVariables = deriveAvailableVariables(trigger, sample)` y envolver el input de `field` con un
  `VariablePicker` (igual que `ActionConfigFields`). Para `condition.value` cuando el op es
  `contains`/`==`/`in`, ofrecer un `datalist` con los valores vistos en la muestra del campo elegido.
- `src/features/flows/canvas/FlowCanvas.tsx`: pasar `triggerSample` al `case "condition"` (hoy no se
  pasa, líneas 182-194) — mismo patrón que ya se usa para `transform`/`action`.
- `src/features/flows/canvas/variables.ts` — `deriveAvailableVariables` gana un fallback para `poll`:
  si no hay muestra, usar `trigger.config.fields` (HubSpot) o, para Sheets, leer las claves si
  `lastSample` ya trae algo (la hidratación cubre el caso "reabrir sin re-probar"). Mantener el test
  `returns an empty list for a poll trigger with no sample` solo cuando `config.fields === []`.
- Nueva util `validateVariables(template: string, available: AvailableVariable[]): { valid: boolean;
  missing: string[] }` en `variables.ts`. Recorre `template.match(/\{\{(\w+(?:\.\w+)*)\}\}/g)`,
  resuelve cada token contra `available`, devuelve los faltantes. Tests en `variables.test.ts`.
- Aplicar validación reactiva en cada campo interpolable de `ConditionConfigFields`,
  `TransformConfigFields` y `ActionConfigFields`: si `missing.length > 0`, mostrar un
  `<AlertCircle className="text-warning">` con texto `{{namae}} no está en la muestra — verificar`. No
  bloquea guardar. Se recalcula al cambiar `availableVariables`. Encapsular en un componente
  `VariableValidationHint` (en `src/features/flows/canvas/VariableValidationHint.tsx`) para reusar.

**Criterios de aceptación:**
- **Dado** un flujo de HubSpot contacts con `lastSample` persistido, **cuando** el usuario abre el drawer
  de una condición, **entonces** el input de "Campo" ofrece el mismo `VariablePicker` que la
  transformación, con `email`, `firstname`, etc.
- **Dado** un flujo de HubSpot contacts sin muestra pero con `config.fields: ["email", "firstname"]`,
  **cuando** el usuario abre los drawers del flujo, **entonces** `availableVariables` incluye
  `email`/`firstname` (no `[]` como hoy).
- **Dado** un campo interpolable con `{{namae}}` (typo de `name`), **cuando** la muestra no contiene
  `namae`, **entonces** se ve un icono ámbar `AlertCircle` con mensaje accionable al lado del campo.
- **Dado** un flujo con tokens huérfanos, **cuando** el usuario pulsa "Guardar", **entonces** el guardado
  procede (advertencia, no bloqueo) — las advertencias ya están visibles en pantalla.
- **Dado** el usuario corrige el typo a `{{name}}`, **cuando** el campo se revalida, **entonces** la
  advertencia desaparece.

**Prioridad:** Alta — es el "que realmente se sincronice con la prueba de comunicación" del pedido. Sin
esto, persistir la muestra (Fase A) no se materializa en UX.

**Dependencias / riesgos:** Fase A debe estar合并 (sin muestra persistida, la sincronización solo
ayuda a la sesión actual). Riesgo deUI ruidosa si hay muchos tokens — mitigar: solo mostrar advertencia
cuando el drawer está abierto y el campo tiene foco, o静默 después de 30s sin interacción.

---

## Fase C — Previsualización depuradora en el editor (dry-run)

**Estado:** ❌ Gap — corresponde a la `F5` de spec 024 (dry-run de flujo completo), marcada allí como
gap y explícitamente fuera del alcance de 022.

**Problema actual:** El único "Probar" del builder es "Probar con datos de ejemplo" del
`TransformConfigFields` (líneas 184-213), que solo ejecuta el `transformCode` contra un sample
hardcodeado. No evalúa condiciones, no ejecuta outputs, no produce traza. "Ejecutar ahora" corre de
verdad — no hay modo no-op.

**Propuesta:**
- `src/flows/dry-run.ts` (nuevo): `dryRunFlow(flow: FlowRule): Promise<DryRunResult>`.
  - `poll`: llama `fetchPollSampleForFlow(flow.trigger)` (reusando `src/flows/manual-run.ts`).
  - `event`: construye un evento sintético representativo con `buildSyntheticEvent` (spec 022 §C) y los
    `EVENT_FIELD_EXAMPLES` ya en `variables.ts:15-27`. No requiere elegir entidad real (decisión
    documentada arriba).
  - Invoca `runFlowEngine({ ...input, trace: true, describeOutputs: true })` — nuevo flag en el engine.
  - Devuelve `{ records: FlowRunRecordTrace[]; triggerMatched: boolean; recordCount: number }`.
- `src/flows/engine.ts`: añadir `input.describeOutputs?: boolean` a `FlowEngineInput`. Cuando es true:
  - Cada `executeOutput` devuelve `{ mutatedProjectIds: [], outcome: "executed", plan?: string }` en
    vez de mutar `result`/lanzar fetch. El `plan` es un string descriptivo en español natural:
    - `createTask` → `"Se crearía la tarea '<title interpolado>' en el proyecto '<nombre>'"`
    - `createProject` → `"Se crearía el proyecto '<name interpolado>'"` (con tipo si aplica)
    - `createPerson` → `"Se crearía/actualizaría la persona '<name/email>'"`
    - `setProjectStatus` → `"El proyecto '<X>' pasaría a estado '<Y>'"`
    - `setField` → `"Se setearía <field>='<value>' en proyecto '<X>'"`
    - `createNotification` → `"Se generaría una notificación: '<message interpolado>'"`
    - `markAreaComplete` → `"Se marcaría completa el área '<X' del proyecto '<Y>'"`
    - `webhook` → `"Se enviaría POST a <host> con payload <shape>"` (no captura body real, solo keys)
    - `email` → `"Se enviaría email a '<to>' con asunto '<subject>'"`
  - `result.newProjects`/`changedProjects`/`notifications`/`outboundDeliveries`/`emailDeliveries`
    quedan vacíos. `errors` sigue poblado para detectar fallos reales de validación/transformación.
  - `executedFlowIds` no se incrementa (no fue una corrida real).
- Nueva interface `FlowRunOutputTrace` gana campo opcional `plan?: string` — el `FlowRunTraceView`
  ya existente renderiza esta columna cuando está presente (`OutputRow` muestra "Se crearía…" en
  color neutro, distinguible del "ejecutado"/"error" de un run real).
- `src/features/flows/canvas/DebuggerPanel.tsx` (nuevo): dock colapsable a la derecha del canvas.
  - Botón "Simular flujo" → corre `dryRunFlow`, muestra resultado en `FlowRunTraceView` inline.
  - Modal "Simulando…" mientras corre; en caso de error de red (conexión HubSpot inaccesible, etc.),
    error explícito con el mismo `AlertCircle` rojo.
  - Texto guía: "Esta simulación no crea tareas ni envía emails. Muestra qué pasaría si el flujo
    corriese con los datos de tu última prueba de conexión."
- `src/features/flows/FlowBuilderPage.tsx`: montar el `DebuggerPanel` al lado del canvas (en grid de
  2 columnas en `md:`, stack vertical en mobile).
- Tests: `src/flows/dry-run.test.ts` — cubre los 9 tipos de output en modo describeOnly confirmando
  que `result.newProjects`/`notifications`/etc. quedan vacíos y `plan` se interpola correctamente;
  cubre poll sin registros (trigger no matcheó) y poll con falla de red (error reportado, sin
  excepción). `src/flows/engine.test.ts` — tests anexos del flag `describeOutputs`.

**Criterios de aceptación:**
- **Dado** un flujo con `createTask` + `email`, **cuando** el usuario pulsa "Simular flujo" en el editor,
  **entonces** ve en el `DebuggerPanel` un registro con la traza: condición evaluada, mapeo, transform,
  output 1 = "Se crearía la tarea 'X' en el proyecto 'Y'", output 2 = "Se enviaría email a '…'".
- **Dado** la simulación corre, **cuando** termina, **entonces** no aparecen nuevas tareas en el store,
  no se envían emails, no se disparan webhooks, no se modifica `runCount` ni `flow-runs`.
- **Dado** el `transformCode` tiene un error de sintaxis, **cuando** se simula, **entonces** la traza
  muestra el error exacto (mismo camino que un run real).
- **Dado** un flujo de evento (no poll), **cuando** se simula, **entonces** la traza usa el evento
  sintético de `EVENT_FIELD_EXAMPLES` y muestra el resultado.

**Prioridad:** Alta — es el "poder simular el flujo desde el editor" del pedido. Cumple 024§F5
(dry-run) que estaba como gap.

**Dependencias / riesgos:** Requiere Fase A (usar `lastSample` como entrada si "Probar conexión" ya
corrió). Riesgo: el dry-run puede divergir del real si el "plan" describe algo que en runtime
encuentra un error (ej. `projectId` no existe). Mitigar: el flag `describeOutputs` solo suprime la
mutación, las resoluciones de target siguen corriendo y REPORTAN si fallan (motivo en `plan`:
"Se crearía la tarea, pero el proyecto 'X' no existe — en una corrida real se omitiría").

---

## Fase D — Ejecución real desde el editor

**Estado:** ❌ Gap (fricción UI, no de motor — `runFlowNow` ya existe).

**Problema actual:** "Ejecutar ahora" está en `FlowsPage.tsx:146-148` (rama poll → ConfirmDialog,
rama event → `RunEventFlowDialog`). El `FlowBuilderPage` no lo reproduce — el usuario debe salir del
editor y volver para probar.

**Propuesta:**
- `src/features/flows/FlowBuilderPage.tsx`: nuevo botón "Ejecutar" junto a "Guardar Cambios"
  (`PageHeader`'s `actions`). Deshabilitado si `!isEditing` con tooltip "Guarda el flujo primero para
  poder ejecutarlo" (porque `runFlowNow` opera por `flowId` ya persistido).
- Reusar `ConfirmDialog` (poll) / `RunEventFlowDialog` (event) — misma lógica del `FlowsPage`. Tras
  ejecutar:
  - Si el flujo está *dirty* (cambios sin guardar), advertir con `ConfirmDialog` "Tienes cambios sin
    guardar; se ejecutará la versión guardada. ¿Continuar?" (mismo patrón que salir con cambios
    pendientes).
  - Expandir inline el `DebuggerPanel` (de la Fase C) con la traza del run real, reutilizando
    `FlowRunTraceView`. Botón "Ver en Historial global" para saltar a `/app/flows/history`.
- Tras "Ejecutar", si el flujo estaba dirty, no se autoguarda (decisión conservadora — el usuario
  puede querer descartar).

**Criterios de aceptación:**
- **Dado** un flujo guardado de HubSpot, **cuando** el usuario pulsa "Ejecutar" desde el editor,
  **entonces** se abre el `ConfirmDialog` con el mismo aviso de "no es simulación".
- **Dado** un flujo de evento en edición, **cuando** el usuario pulsa "Ejecutar", **entonces** se abre
  `RunEventFlowDialog` para elegir la entidad real, y la corrida registra su traza en el historial
  como si hubiera corrido desde la lista.
- **Dado** el flujo tiene cambios sin guardar, **cuando** el usuario pulsa "Ejecutar", **entonces** se
  le advierte antes de correr la versión guardada.
- **Dado** el flujo está recién creado (`isEditing === false`), **cuando** el usuario intenta
  ejecutar, **entonces** el botón está deshabilitado con el tooltip explicativo.

**Prioridad:** Alta — es el "poder ejecutar el flujo desde el editor y hacer debug" del pedido.
Reusar todo (no toca el motor).

**Dependencias / riesgos:** Fase C debe estar completa (reusa el `DebuggerPanel`). Riesgo mínimo: el
camino de `runFlowNow` ya tiene tests (`useDataStore.runFlowNow.test.ts`).

---

## Fase E — Sincronización reactiva y feedback visual coherente

**Estado:** ❌ Gap (cross-fase).

**Problema actual:** Hoy, "Probar conexión" actualiza `triggerSample` efímero, pero no hay nada que
repinte las advertencias de tokens huérfanos si el usuario ya tiene drawers abiertos. Tampoco hay
feedback visible de "la última prueba trajo N registros el día X" fuera del `TriggerStep` (que
solo dice ok/fallo en texto plano).

**Propuesta:**
- En el `FlowCanvas`, el `triggerSample` (ahora hidratado desde `lastSample` — Fase A) y los cambios
  de "Probar conexión" disparan un efecto que recalcule `availableVariables` y empuje validación a
  los drawer abiertos. Implementación: el `selectedNode` (id del drawer abierto) se pasa como prop a
  `TransformConfigFields`/`ConditionConfigFields`/`ActionConfigFields` no es necesario — ya reciben
  `sample` y recalculan `availableVariables` en render, alcanza con que el estado del canvas
  re-renderice (Zustand ya lo gatilla).
- `src/features/flows/steps/TriggerStep.tsx`: tras "Probar conexión" exitoso, mostrar badge con el
  conteo `Muestra: 3 registros · 13:45` (usando `lastSample.length` + `lastSampleAt`). Reemplaza el
  string actual `✅ Conexión OK`.
- Documentar en el `design.md` de la spec el flujo de datos:
  ```
  TriggerStep "Probar conexión"
     → onSampleChange(sample)
     → FlowCanvas setTriggerSample + onSampleChange al builder
     → FlowBuilderPage setFlow(prev => ({...prev, lastSample: sample.slice(0,3), lastSampleAt: now}))
     → handleSave persiste lastSample en flows.json
  Reabrir editor:
     → FlowBuilderPage useEffect carga flow.lastSample → FlowCanvas initialGraph
     → triggerSample inicial = flow.lastSample
     → deriveAvailableVariables(trigger, triggerSample) en cada drawer
  ```
- Revisión visual de Fase B: la advertencia de token huérfano solo aparece si `availableVariables` no
  está vacío (si no hay muestra para un poll sin `config.fields`, no 比较 falsos positivos).

**Criterios de aceptación:**
- **Dado** un drawer abierto con `{{namae}}` advertido, **cuando** el usuario prueba la conexión y la
  nueva muestra no contiene `namae` tampoco, **entonces** la advertencia permanece visible (es
  correcta — el token sigue roto).
- **Dado** un drawer abierto con `{{namae}}` advertido, **cuando** el usuario corrige el typo a
  `{{name}}` (campo presente), **entonces** la advertencia desaparece sin necesidad de cerrar/abrir el
  drawer.
- **Dado** el usuario prueba la conexión, **cuando** vuelve exitosa, **entonces** el `TriggerStep`
  muestra `Muestra: 3 registros · 13:45` en un `Badge`.
- **Dado** dos flujos con la misma conexión pero distintos `config.fields`, **cuando** se prueba la
  conexión en cada uno, **entonces** las `availableVariables` de cada drawer reflejan los
  `config.fields` de ese flujo (no se mezclan).

**Prioridad:** Media — es el pegamento que hace coherentes las Fases A-D. Bajo esfuerzo.

**Dependencias / riesgos:** A, B, C deben estar合并. Riesgo de loops infinitos si el efecto no está
debounce — no aplica (el cambio solo dispara re-render, no re-fetch).

---

## Fuera de alcance (documentado)

- Grupos AND/OR en condiciones (F6 v1 de spec 024) — este spec no cambia el modelo de condiciones,
  solo las cablea a variables existentes.
- Galería de plantillas (F8), versionado (F9), branching por salida (F6 v2).
- Captura de payloads HTTP reales en la traza de webhook/email (F4 de 024) — el dry-run describe la
  forma del payload sin conservar bodies; persistir bodies reales queda en 024 F4 backlog.
- Captura real de response status/message de webhook/email en corridas reales (024 F4) — el
  `DebuggerPanel` para runs reales reusa `FlowRunTraceView` tal cual; ampliar su contenido es 024.
- Edición de `from`/`to` a mano en `RunEventFlowDialog` — ya fuera de alcance en 022 §C, sigue fuera.

## Roadmap (impacto vs. esfuerzo)

| Fase | Esfuerzo | Prioridad | Bloquea |
|---|---|---|---|
| A · Persistencia de `lastSample` | Bajo | Alta | B, C, E |
| B · Variables en condiciones + validación | Medio | Alta | E |
| C · Dry-run con `describeOutputs` | Medio | Alta | D, E |
| D · Ejecución real desde el editor | Bajo | Alta | — |
| E · Sincronización reactiva + badge | Bajo | Media | — |

Secuencia sugerida: **A → B → C → D → E** (D puede paralelizarse con C — reusa el
`DebuggerPanel` pero no lo requiere para habilitarse).

## Archivos clave

- **Schema/migraciones:** `src/domain/schemas/flow.ts`, `src/domain/schemas/common.ts`
  (`SCHEMA_VERSION` 11→12), `src/domain/migrations.ts` (paso v11→v12), `src/flows/migration.ts`
  (`createEmptyFlow`/`duplicateFlow` no copian `lastSample`).
- **Motor + dry-run:** `src/flows/engine.ts` (flag `describeOutputs` + campo `plan` en traza),
  `src/flows/dry-run.ts` (NUEVO), `src/flows/manual-run.ts` (reusar `fetchPollSampleForFlow`),
  `src/flows/synthetic-event.ts` (reusar para dry-run de eventos).
- **UI canvas:** `src/features/flows/canvas/FlowCanvas.tsx`, `ConditionConfigFields.tsx`,
  `TransformConfigFields.tsx`, `ActionConfigFields.tsx`, `VariableValidationHint.tsx` (NUEVO),
  `variables.ts` + `variables.test.ts` (`validateVariables` + fallback fields-poll).
- **UI builder:** `src/features/flows/FlowBuilderPage.tsx` (botones Simular/Ejecutar + handleSave
  persiste `lastSample`), `src/features/flows/canvas/DebuggerPanel.tsx` (NUEVO),
  `src/features/flows/steps/TriggerStep.tsx` (badge de muestra), `src/features/flows/RunEventFlowDialog.tsx`
  (reusar desde el editor).
- **Tests:** `src/flows/dry-run.test.ts` (NUEVO), `src/flows/engine.test.ts` (extendido),
  `src/features/flows/canvas/variables.test.ts` (extendido).

## Verificación

- `npm run typecheck && npm run lint && npm test` en verde con tests nuevos de cada fase.
- `npm run build` en verde.
- Smoke en navegador real (Playwright contra `npm run dev`):
  - **Fase A:** crear flujo de HubSpot → "Probar conexión" → Guardar → recargar página → reabrir
    editor → variables siguen disponibles en mapeo/condiciones/acciones sin re-probar.
  - **Fase B:** en el drawer de condición, el `VariablePicker` ofrece los campos reales; escribir
    `{{namae}}` muestra advertencia ámbar.
  - **Fase C:** pulsar "Simular flujo" en el editor → aparece la traza inline en el `DebuggerPanel`
    con "Se crearía la tarea 'X'…" — verificar que no se crea ninguna tarea real (listar tasks en el
    store tras la simulación, debe estar vacío).
  - **Fase D:** pulsar "Ejecutar" → ConfirmDialog → confirmar → aparece traza en el
    `DebuggerPanel`; verificar que se crea la tarea real (en el store).
  - **Fase E:** con drawer abierto y `{{namae}}` advertido, pulsar "Probar conexión" con nueva
    muestra → la advertencia se revalida en vivo; el badge del `TriggerStep` muestra la cuenta.
- Revisión visual (Playwright screenshot): incluir screenshot del editor con el `DebuggerPanel`
  expandido, adjuntar a la sección `Progreso` de esta spec al cerrar la implementación.