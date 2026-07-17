# Spec 026 — Editor de flujos: interpolación de variables confiable, llenado real de objetos y webhooks configurables

## Progreso

- **Estado general: 🟢 Fases A-E completas (2026-07-16).**
  Implementación en una sola pasada. `npm run typecheck`/`npm run lint`/`npm run build` en verde;
  446/446 tests (+45 respecto al baseline 401).

- **Fase A — Módulo de interpolación unificado: ✅ implementada y verificada (2026-07-16).**
  - `src/flows/interpolation.ts` (NUEVO): `TOKEN_RE` acepta cualquier contenido salvo `}}` (antes
    `\w`-only, rechazaba columnas de Sheets con espacios/acentos como `{{Nombre Cliente}}`).
    `parseTokens`, `resolvePath` (clave literal completa → path anidado por puntos),
    `interpolateString`/`interpolateObject` devuelven `{ value, unresolved }` — un token no resuelto
    ya no queda como texto `{{x}}` literal, se reemplaza por su default (`{{x||d}}`) o cadena vacía
    y el path queda en `unresolved`. `interpolateObject` además preserva arrays (antes los
    convertía en objetos con claves numéricas al iterar `Object.entries`).
  - `src/flows/engine.ts`: `interpolateString`/`interpolateObject`/`getNestedValue` locales
    eliminados; ahora son wrappers de compatibilidad sobre el módulo compartido (`getNestedValue =
    resolvePath`). `evaluateCondition` — `==`/`!=` coaccionan numéricamente cuando ambos lados son
    coercibles (mismo criterio que 024 §F6 para `>`/`<`), si no comparación estricta.
  - `src/features/flows/canvas/variables.ts`: `validateVariables` tokeniza con `parseTokens`
    compartido — el hint ámbar ahora detecta `{{Nombre Cliente}}` como huérfano (antes su propio
    regex `\w`-only lo ignoraba, igual que el motor).
  - Tests: `src/flows/interpolation.test.ts` (NUEVO, 17), `engine.test.ts` (+2 coerción `==`),
    `variables.test.ts` (+2 tokens con espacios/acentos).

- **Fase B — Llenado real de campos en creación de objetos: ✅ implementada y verificada
  (2026-07-16).**
  - `src/domain/schemas/flow.ts`: `CreatePersonOutputSchema` gana `matchSource?: string`.
    `SCHEMA_VERSION` 12→13 (`common.ts`), paso identidad v12→v13 (`migrations.ts`).
  - `src/flows/engine.ts`:
    - `setField` interpola `output.value` cuando es string (antes se guardaba el template crudo:
      `{{amount}}` terminaba literal en el proyecto).
    - `createProject.fields[*].source` bimodal: si contiene `{{`, se interpola (el
      `VariablePicker` de la UI ya insertaba `{{campo}}`, pero el motor esperaba path crudo y el
      campo quedaba vacío en silencio); si no, path crudo (retrocompat).
    - `createPerson` — nuevo `matchSource` para matchear contra paths anidados
      (`{{properties.email}}` de HubSpot); fallbacks `name`/`email`/`roleTitle` vía `resolvePath`.
    - `createTask.assigneeId` — nueva `resolvePersonId`: el valor interpolado se resuelve contra
      `Person.id`/email/nombre; sin match, `null` (nunca un id huérfano).
    - `createTask.dueDate` — nueva `coerceDueDate`: ISO/epoch-ms (HubSpot `closedate`) →
      `YYYY-MM-DD`; no parseable → sin fecha.
  - `src/features/flows/canvas/ActionConfigFields.tsx`: `setField.field` y
    `createProject.fields[*].target` pasan de `Input` libre a `TargetFieldSelect` (NUEVO, local) —
    select con `INTERNAL_TARGET_FIELDS.project` + "Otro…".
  - Tests: 11 nuevos en `engine.test.ts` (setField interpolado/no-string, createProject.fields
    template/raw/no-overwrite-con-vacío, createPerson matchSource anidado, assigneeId
    resuelto/sin-match, dueDate epoch-ms/no-parseable), 2 en `migrations.test.ts` (v12→v13).
    Test existente de `assigneeId`/`dueDate` (spec 023 §D) actualizado con fixture de `Person` real
    (antes pasaba un id sin verificar que existiera).

- **Fase C — Webhook configurable, previsualizable y probable: ✅ implementada y verificada
  (2026-07-16).**
  - `src/flows/webhook-request.ts` (NUEVO): `buildWebhookRequest(output, data)` — payload
    interpolado + firma HMAC + headers `X-Hito-*`, extraído de `engine.ts` para que el motor y
    "Probar webhook" compartan la misma construcción de request.
  - `src/flows/webhook-test.ts` (NUEVO): `testWebhook(output, sampleRecord)` — POST real con
    `AbortSignal.timeout(10_000)`, devuelve `{ ok, status?, responseText?, error? }`.
  - `src/features/flows/canvas/ActionConfigFields.tsx` caso `webhook`: selector "Registro
    completo"/"Personalizado" (payload custom con filas clave→`InterpolableField`), vista previa
    plegable del JSON interpolado (pasiva, sin red) con tokens no resueltos resaltados, validación
    de formato `https://` en vivo, botón "Probar webhook" tras `ConfirmDialog` (envío real
    explícito, mismo criterio que "Ejecutar" de spec 025 §D) con resultado inline (status HTTP o
    error de red).
  - `src/flows/engine.ts` `describeOutput` webhook: el plan del dry-run muestra el payload
    interpolado completo (truncado a 200 chars) en vez de solo las keys.
  - Tests: `webhook-request.test.ts` (NUEVO, 5), `webhook-test.test.ts` (NUEVO, 4).
  - **Bug encontrado y corregido durante el smoke visual (Playwright headless contra `npm run
    dev`):** el editor de payload personalizado construía `payloadEntries` derivándolo en cada
    render de `Object.entries(output.payload ?? {})`, y el updater filtraba cualquier fila con
    clave vacía (`if (k) payload[k] = v`) antes de persistir — al pulsar "Añadir campo", la fila
    en blanco nunca llegaba a mostrarse porque se descartaba antes del siguiente render. El mismo
    patrón ya existía en `createPerson.data` (spec 023), pre-existente y no descubierto hasta
    replicarlo aquí. Fix: `personDataRows`/`payloadRows` pasan a ser estado local de
    `ActionConfigFields` (sembrado una sola vez desde `output` vía inicializador perezoso), y
    `FlowCanvas.tsx` le agrega `key={node.id}` al componente para que cada nodo tenga su propia
    instancia (evita que el estado local de un nodo se filtre a otro al cambiar de drawer).
    Verificado visualmente: "Añadir campo" ahora muestra la fila, se puede escribir clave/valor, y
    el `VariableValidationHint`/`{}` picker funcionan dentro de la fila dinámica.

- **Fase D — Vista previa en vivo por campo: ✅ implementada y verificada (2026-07-16).**
  - `src/features/flows/canvas/InterpolationPreview.tsx` (NUEVO): presentación pura — sin muestra o
    sin `{{` en el template, no renderiza nada.
  - `src/features/flows/canvas/InterpolableField.tsx` (NUEVO, promovido desde el wrapper local de
    `ActionConfigFields.tsx`): integra `VariablePicker` + `VariableValidationHint` +
    `InterpolationPreview` en un solo componente, con `ref` interno (elimina 15 `useRef` manuales
    que existían solo para el picker). Reemplaza los montajes dispersos donde algunos campos tenían
    hint y otros no (ej. `createProject.fields[*].source` no lo tenía).
  - `src/features/flows/canvas/SampleExplorer.tsx`: selector "Registro N" cuando `sample.length >
    1`, controla qué registro alimentan todas las vistas previas del canvas.
  - `src/features/flows/canvas/FlowCanvas.tsx`: estado `previewRecordIndex`, bajado a
    `TriggerNodeDrawer`/`TriggerStep`/`SampleExplorer` y a `ActionConfigFields`.
  - Sin tests nuevos (presentación pura sobre el módulo ya testeado de Fase A — mismo criterio que
    `SampleExplorer` en spec 025).

- **Fase E — Valores finales interpolados en la traza: ✅ implementada y verificada (2026-07-16).**
  - `src/flows/engine.ts`: `FlowRunOutputTrace`/`OutputExecutionOutcome` ganan
    `resolved?: Record<string, string>` (truncado a 120 chars) y `unresolvedTokens?: string[]`.
    Poblados por tipo en la ejecución real (`createTask` → title/assigneeId/dueDate resueltos,
    `createProject` → name + fields, `createPerson` → match, `setField` → field=valor,
    `createNotification` → message, `webhook` → host + payload keys — nunca el secret,
    `email` → to/subject — nunca el body).
  - `src/features/flows/FlowRunTraceView.tsx`: `OutputRow` renderiza `resolved` como pares
    clave→valor y `unresolvedTokens` como chips ámbar con el token exacto. `DebuggerPanel` (spec
    025 §C) lo hereda gratis al reusar `FlowRunTraceView`.
  - Tests: 3 nuevos en `engine.test.ts` (título final interpolado en la traza, token no resuelto
    reportado, secret de webhook ausente de la traza).

- **Verificación final (2026-07-16):**
  - `npm run typecheck` — en verde.
  - `npm run lint` — 3 errores preexistentes en archivos no relacionados (gemini agent,
    modelSelector, useBreakpoint), documentados desde spec 025; sin errores nuevos.
  - `npm test` — 446/446 (+45 respecto al baseline 401).
  - `npm run build` — en verde (105 entradas PWA precache).
  - Smoke en navegador real (Playwright headless contra `npm run dev`, con `showDirectoryPicker`
    enmascarado): creado un flujo nuevo → agregado nodo "Crear Tarea" → título
    `{{Nombre Cliente}} - seguimiento` → el `VariableValidationHint` detecta correctamente el token
    con espacio como huérfano (confirma el fix de Fase A) → campo "Responsable" muestra el nuevo
    placeholder/ayuda de resolución por persona (Fase B) → agregado nodo "Webhook" → cambiado a
    payload "Personalizado" → "Añadir campo" (bug encontrado y corregido, ver Fase C) → fila con
    `{{Nombre Cliente}}` muestra el mismo hint de token huérfano dentro del editor dinámico →
    validación en vivo de URL no-https visible. Cero errores de consola/página en las 4 corridas.

**Estado: spec 026 completa — Fases A, B, C, D, E implementadas y verificadas, incluyendo smoke
visual en navegador real.**

## Context

Las specs 018–025 dejaron el ciclo "configurar → probar → depurar" del editor de flujos
(`/app/flows`) funcional: muestra persistida (`lastSample`), variables sincronizadas en
condiciones/transformación/acciones, dry-run con `describeOutputs`, ejecución real desde el editor y
`SampleExplorer` en el trigger. Sin embargo, el reporte del usuario es contundente: **"en este
momento no se llenan los datos a partir de las variables que se asignan dinámicamente con `{}`"** al
crear objetos (tareas/proyectos/personas) y al enviar webhooks.

La auditoría de código de esta spec confirmó que el síntoma es real y tiene **causas raíz
concretas**, todas ancladas a código verificado. No es un bug único: es una familia de
inconsistencias entre lo que la UI ofrece (insertar `{{variable}}` con el `VariablePicker`) y lo que
el motor realmente interpola.

### Hallazgos de la auditoría (2026-07-16)

1. **El regex de interpolación solo acepta `\w` (ASCII)** — `interpolateString`
   (`src/flows/engine.ts:1082-1087`) matchea `\{\{(\w+(?:\.\w+)*)\}\}`. `\w` en JavaScript es
   `[A-Za-z0-9_]`: **ni espacios, ni acentos, ni eñes, ni guiones**. Pero Google Sheets genera las
   claves del registro con el encabezado de columna tal cual
   (`src/integrations/inbound/sheets-poller.ts:31` — `record[header] = row[colIdx]`), y el
   `VariablePicker` (`src/features/flows/canvas/VariablePicker.tsx:30-32`) inserta felizmente
   `{{Nombre Cliente}}` o `{{Teléfono}}`. Resultado: el usuario elige la variable desde el picker
   oficial, el motor nunca la sustituye, y la tarea se crea con el texto literal `{{Nombre Cliente}}`
   — exactamente el síntoma reportado.
2. **La validación de tokens usa el mismo regex roto** — `validateVariables`
   (`src/features/flows/canvas/variables.ts:113`) tampoco parsea `{{Nombre Cliente}}`, así que el
   `VariableValidationHint` (spec 025 §B) **ni siquiera advierte** del token que va a fallar. Doble
   fallo silencioso: la UI lo inserta, el validador lo ignora, el motor lo deja literal.
3. **Token no resuelto queda como texto literal, sin aviso** — `interpolateString` devuelve `match`
   cuando el valor es `undefined` (`engine.ts:1085`). Un typo o un campo ausente en el registro real
   produce tareas tituladas `{{dealname}} - seguimiento` sin ninguna señal en la traza del run.
4. **`setField` nunca interpola el valor** — la UI ofrece `InterpolableField` + `VariablePicker` +
   `VariableValidationHint` para el valor (`ActionConfigFields.tsx:529-539`), pero el motor escribe
   `output.value` crudo (`engine.ts:927` — `{ ...project, [output.field]: output.value }`). El
   usuario configura `{{amount}}` y el proyecto termina con el string literal `"{{amount}}"`.
5. **`createProject.fields` — la UI y el motor hablan idiomas distintos** — el motor resuelve
   `mapping.source` como **path crudo** (`engine.ts:807-812` — `getNestedValue(data, mapping.source)`),
   pero la UI envuelve ese mismo campo en un `InterpolableField` cuyo picker inserta `{{campo}}`
   (`ActionConfigFields.tsx:361-372`). Si el usuario usa el picker (el camino natural),
   `getNestedValue(data, "{{amount}}")` devuelve `undefined` y el campo del proyecto queda vacío en
   silencio — la otra mitad del síntoma "no se llenan los datos al crear objetos".
6. **`createPerson.matchField` solo lee claves top-level** — `data[matchField]`
   (`engine.ts:859-860`) no soporta paths anidados (`properties.email` de HubSpot) ni interpolación.
   Con registros anidados, el match nunca encuentra a nadie y se crean personas duplicadas o con
   "Sin nombre".
7. **El output webhook no tiene editor de payload** — `WebhookOutputSchema.payload` existe y el motor
   lo interpola (`engine.ts:969-971` vía `interpolateObject`), pero la UI solo muestra URL + Secret
   (`ActionConfigFields.tsx:579-601`). El usuario no puede dar forma al body, ni usar `{{}}` en él,
   ni probar el envío, ni ver qué shape saldría. Hoy siempre se envía el registro transformado
   completo, sin control ni visibilidad.
8. **`==`/`!=` no coercionan números-como-string** — spec 024 §F6 arregló `>`/`>=`/`<`/`<=` con
   `toComparableNumber`, pero `==` sigue siendo `value === target` estricto (`engine.ts:428-431`):
   `"5000" == 5000` falla en silencio, mismo patrón de bug ya corregido para los operadores de orden.
9. **`assigneeId`/`dueDate` interpolan pero no resuelven** — `{{email}}` en Responsable produce una
   tarea asignada al string del email (ningún `Person.id` coincide → la UI muestra "sin responsable"
   o un id huérfano). `{{closedate}}` de HubSpot llega como timestamp en milisegundos y se guarda
   crudo en `dueDate`, rompiendo el formato `YYYY-MM-DD` que la app espera.
10. **La traza de un run real no muestra los valores finales interpolados** — `FlowRunOutputTrace`
    lleva `outcome`/`reason` pero no qué título/destinatario/payload final se usó. Para depurar "por
    qué mi tarea salió con el campo vacío" hay que adivinar.

**Resultado buscado (en palabras del usuario):** que la transformación de variables, la asignación
de campos, la creación de objetos y el envío de webhooks **llenen los datos de verdad** a partir de
las variables `{{}}` asignadas dinámicamente, con una experiencia clara para el perfil no-code en
todo el proceso de crear automatizaciones.

**Outcome medible:**
- Cualquier variable que el `VariablePicker` ofrece se interpola correctamente en runtime — incluidas
  columnas de Sheets con espacios/acentos y paths anidados de HubSpot (hallazgos 1, 2).
- Un token no resoluble se ve ANTES de ejecutar (hint ámbar + vista previa en vivo) y DESPUÉS
  (advertencia en la traza), y nunca deja `{{...}}` literal en un objeto creado (hallazgo 3).
- `setField`, `createProject.fields` y `createPerson` llenan sus campos desde variables con la misma
  semántica `{{}}` que el resto de la UI (hallazgos 4, 5, 6).
- El webhook tiene payload configurable con `{{}}`, vista previa interpolada y prueba de envío desde
  el editor (hallazgo 7).
- La traza de cada run (real o simulado) muestra los valores finales interpolados por output
  (hallazgo 10).

## Decisiones de diseño propuestas (a confirmar al iniciar implementación)

- **Un único módulo de interpolación** (`src/flows/interpolation.ts`) como single source of truth
  para motor + validación UI + vistas previas. Hoy el regex vive duplicado en `engine.ts` y
  `variables.ts`, y ya divergieron en efecto (el motor deja literal, el validador ignora).
- **Sintaxis de token ampliada, retrocompatible:** `{{...}}` acepta cualquier secuencia que no
  contenga `}}`, con trim de espacios en los bordes (`{{ Nombre Cliente }}` ≡ `{{Nombre Cliente}}`).
  Resolución en dos pasos: primero la clave **literal completa** (`data["Nombre Cliente"]`,
  `data["properties.amount"]` si existiera tal cual), después como **path anidado** por puntos
  (`properties.amount`). Los tokens `\w` actuales siguen resolviendo idéntico — sin migración.
- **Token no resuelto → string vacío + advertencia en traza**, no texto literal. Dejar `{{x}}`
  literal en el título de una tarea real es peor que dejarlo vacío, siempre que el hueco sea
  visible: la traza del run lista los tokens no resueltos por output, y la UI ya advierte antes
  (hint + preview). Se descartó bloquear la ejecución: una muestra vieja no prueba que el registro
  futuro no traiga el campo.
- **Soporte opcional de default:** `{{campo||valor por defecto}}` — barato de implementar en el
  módulo nuevo y resuelve el caso legítimo "el campo a veces no viene".
- **`createProject.fields.source` acepta ambas semánticas:** si contiene `{{` se trata como template
  interpolable (lo que la UI ya sugiere); si no, path crudo (retrocompatible con flujos guardados).
- **Payload de webhook: dos modos.** "Registro completo" (default, comportamiento actual) o
  "Personalizado" — filas clave/valor donde el valor es un `InterpolableField`. Sin editor JSON
  libre en v1 (el perfil es no-code; el modo personalizado cubre el 90% y no puede producir JSON
  inválido). El schema actual (`payload: z.record(z.unknown()).optional()`) ya soporta ambos.
- **"Probar webhook" hace un envío REAL con confirmación explícita** (mismo criterio que el botón
  "Ejecutar" de spec 025 §D) usando el primer registro de `lastSample`; la vista previa interpolada
  del payload, en cambio, es pasiva y no llama a la red.
- **Resolución de `assigneeId` contra Personas:** el valor interpolado se busca como
  `Person.id` → email exacto → nombre exacto; sin match, la tarea queda sin responsable y la traza
  lo advierte (nunca se guarda un id huérfano).
- **Coerción de `dueDate`:** aceptar ISO (`YYYY-MM-DD`/datetime) y epoch-ms (HubSpot); si no parsea,
  tarea sin fecha + advertencia en traza. No se intenta adivinar formatos locales ambiguos
  (`DD/MM/YYYY`) en v1.

## Convención de estado

- ✅ **Ya construido** — existe en producción.
- 🟡 **Parcial / con bug** — subsistema construido pero con comportamiento incorrecto.
- ❌ **Gap** — no existe, feature nuevo.

---

## Fase A — Módulo de interpolación unificado y robusto

**Estado:** 🟡 Bug de correctitud — la interpolación existe pero rechaza en silencio los nombres de
campo reales de Sheets (espacios/acentos) y deja tokens literales al no resolver.

**Problema actual:** hallazgos 1, 2, 3 y 8 del Context.

**Propuesta:**
- `src/flows/interpolation.ts` (NUEVO):
  - `TOKEN_RE = /\{\{\s*([^}]+?)\s*\}\}/g` (cualquier contenido salvo `}`, trim implícito).
  - `parseTokens(template): { raw, path, defaultValue? }[]` — soporta `{{campo||default}}`.
  - `resolvePath(data, path)` — clave literal completa primero, después path anidado por puntos
    (reusa/absorbe `getNestedValue`).
  - `interpolateString(template, data): { value: string; unresolved: string[] }` — token no
    resuelto → `defaultValue ?? ""` y se acumula en `unresolved`.
  - `interpolateObject(obj, data)` — versión recursiva, misma semántica (absorbe la de `engine.ts`).
- `src/flows/engine.ts`: reemplazar `interpolateString`/`interpolateObject`/`getNestedValue` locales
  por el módulo nuevo. Cada output que interpola acumula los `unresolved` de todos sus campos en el
  nuevo `FlowRunOutputTrace.unresolvedTokens?: string[]`.
- `src/features/flows/canvas/variables.ts`: `validateVariables` pasa a tokenizar con
  `parseTokens` del módulo compartido — el hint ámbar por fin dispara para `{{Nombre Cliente}}`
  cuando esa columna no está en la muestra, y deja de disparar cuando sí está.
- `evaluateCondition` (`engine.ts:428-431`): `==`/`!=` ganan coerción numérica simétrica con
  `toComparableNumber` cuando **ambos** lados son coercibles (mismo criterio del fix 024 §F6);
  si no, comparación estricta actual.
- Tests: `src/flows/interpolation.test.ts` (NUEVO) — claves con espacios/acentos/guiones, paths
  anidados, clave literal con punto vs path, defaults `||`, unresolved → `""` + listado, objetos
  anidados. `engine.test.ts` — `==` con `"5000"` vs `5000`, tokens no resueltos reportados en traza.

**Criterios de aceptación:**
- **Dado** un flujo de Sheets con columna "Nombre Cliente", **cuando** un output usa
  `{{Nombre Cliente}}` y corre, **entonces** el valor real de la fila llena el campo.
- **Dado** `{{properties.amount}}` de HubSpot, **cuando** se interpola, **entonces** resuelve por
  path anidado (comportamiento actual preservado).
- **Dado** un token que no existe en el registro, **cuando** el flujo corre, **entonces** el campo
  queda vacío (o con el default `||`), y la traza del output lista el token no resuelto.
- **Dado** `{{ campo }}` con espacios internos, **cuando** se interpola, **entonces** equivale a
  `{{campo}}`.
- **Dado** una condición `==` entre `"5000"` y `5000`, **cuando** se evalúa, **entonces** pasa.

**Prioridad:** Alta — causa raíz del síntoma reportado; base de todas las demás fases.

**Dependencias / riesgos:** Ninguna previa. Riesgo: un template legacy con `{{algo raro}}` que hoy
queda literal *a propósito* pasaría a interpolarse/vaciarse — mitigado porque hoy no hay forma
legítima de querer `{{...}}` literal en estos campos, y la traza lo haría visible.

---

## Fase B — Llenado real de campos en creación de objetos

**Estado:** 🟡 Parcial — `createTask` interpola bien sus templates; `setField` no interpola,
`createProject.fields` diverge de su UI, `createPerson` no soporta registros anidados,
`assigneeId`/`dueDate` interpolan sin resolver/coercer.

**Problema actual:** hallazgos 4, 5, 6 y 9 del Context.

**Propuesta:**
- **`setField` (`engine.ts:919-930`):** cuando `output.value` es string, interpolarlo con el módulo
  de Fase A antes de asignar (la UI ya lo anuncia así). `describeOutput` idem para el plan del
  dry-run. Validar `output.field` contra `INTERNAL_TARGET_FIELDS.project` en la UI (Select en vez
  de texto libre, con opción "otro…" para no bloquear campos avanzados).
- **`createProject.fields` (`engine.ts:807-812`):** si `mapping.source` contiene `{{`, tratarlo como
  template interpolable; si no, path crudo (retrocompatible). El `target` en la UI pasa de `Input`
  libre a Select con `INTERNAL_TARGET_FIELDS.project` (+ "otro…").
- **`createPerson` (`engine.ts:858-904`):** el valor de match se resuelve con `resolvePath` (soporta
  `properties.email`); nuevo campo opcional `matchSource?: string` en `CreatePersonOutputSchema`
  (template, ej. `{{properties.email}}`) para cuando la clave del registro no coincide con el nombre
  del campo interno — default: comportamiento actual (`data[matchField]` vía resolvePath). Los
  fallbacks `data.name`/`data.email` del create también pasan por resolvePath.
- **`createTask.assigneeId` (`engine.ts:846`):** tras interpolar, resolver contra `input.people`:
  `Person.id` exacto → email (case-insensitive) → nombre exacto. Sin match: `assigneeId` queda
  `undefined` y la traza advierte (`unresolvedTokens`/`reason`). La UI actualiza el placeholder y
  el texto de ayuda ("puede ser un email del registro — se busca la persona automáticamente").
- **`createTask.dueDate` (`engine.ts:847`):** tras interpolar, coercer a `YYYY-MM-DD`: ISO válido →
  se recorta; número/string de 13 dígitos (epoch-ms de HubSpot) → conversión; no parseable → sin
  fecha + advertencia en traza.
- Schema: `matchSource` opcional → bump `SCHEMA_VERSION` 12→13 con paso identidad
  (`src/domain/schemas/common.ts`, `src/domain/migrations.ts` — mismo patrón que v11→v12).
- Tests: `engine.test.ts` — setField interpolado (string) y no-string intacto; createProject.fields
  con `{{template}}` y con path crudo; createPerson match anidado + matchSource; assigneeId
  resuelto por email / sin match; dueDate ISO/epoch/no-parseable.

**Criterios de aceptación:**
- **Dado** un `setField` con valor `Presupuesto: {{amount}}`, **cuando** el flujo corre, **entonces**
  el campo del proyecto recibe `Presupuesto: 5000`, no el template literal.
- **Dado** un campo adicional de `createProject` cuyo source se eligió con el `VariablePicker`
  (`{{amount}}`), **cuando** el flujo corre, **entonces** el campo destino se llena (hoy queda vacío).
- **Dado** un registro de HubSpot con `properties.email`, **cuando** un `createPerson` matchea por
  email, **entonces** encuentra a la persona existente en vez de duplicarla.
- **Dado** `{{email}}` en Responsable y una persona con ese email, **cuando** se crea la tarea,
  **entonces** queda asignada a esa persona; sin match, queda sin responsable con advertencia en
  traza (nunca un id huérfano).
- **Dado** `{{closedate}}` epoch-ms en Fecha límite, **cuando** se crea la tarea, **entonces**
  `dueDate` es `YYYY-MM-DD` válido.

**Prioridad:** Alta — es "la asignación de campos y la creación de objetos" del pedido.

**Dependencias / riesgos:** Requiere Fase A. Riesgo de retrocompat en `createProject.fields`:
flujos guardados con paths crudos siguen funcionando (la rama template solo activa con `{{`).

---

## Fase C — Webhook configurable, previsualizable y probable

**Estado:** 🟡 Parcial — el motor soporta `payload` interpolado; la UI no lo expone en absoluto.

**Problema actual:** hallazgo 7 del Context. La UI del output webhook
(`ActionConfigFields.tsx:579-601`) solo tiene URL y Secret. No hay forma de dar forma al body, ni
saber qué se enviará, ni probar el envío sin ejecutar el flujo completo.

**Propuesta:**
- `ActionConfigFields.tsx` caso `webhook`:
  - Selector "Payload": **Registro completo** (default — comportamiento actual, `payload`
    ausente) / **Personalizado** — editor de filas clave→valor donde el valor es un
    `InterpolableField` con `VariablePicker` + `VariableValidationHint` (mismo patrón que los
    campos de persona). Persiste en `output.payload` (schema ya existente, sin migración).
  - **Vista previa del envío** (pasiva, sin red): panel plegable que muestra el JSON final
    interpolado con el primer registro de `lastSample` (o del evento sintético para triggers de
    evento), con los tokens no resueltos resaltados en ámbar. Reusa `interpolateObject` de Fase A.
  - Validación de URL en vivo (formato https) — hoy un typo solo revienta en runtime.
- **Botón "Probar webhook"**: envía UN POST real (mismo camino del motor: firma HMAC +
  headers `X-Hito-*`) con el payload interpolado del primer registro de muestra, tras un
  `ConfirmDialog` que deja claro que es un envío real. Muestra status HTTP y primeros bytes de la
  respuesta inline (éxito verde / error rojo con mensaje accionable). Implementación:
  `src/flows/webhook-test.ts` (NUEVO) reusando `signPayload` — no duplica la lógica del engine,
  extrae el builder de request a una función compartida.
- `describeOutput` caso `webhook` (`engine.ts:645-661`): el plan del dry-run pasa de mostrar solo
  las keys a mostrar el payload interpolado completo (truncado a N chars), coherente con la vista
  previa del drawer.
- Tests: builder de request compartido (payload custom interpolado vs registro completo, firma
  presente), `webhook-test.ts` con fetch mockeado (2xx, 4xx, red caída).

**Criterios de aceptación:**
- **Dado** un webhook con payload personalizado `{ cliente: "{{Nombre Cliente}}", monto: "{{amount}}" }`,
  **cuando** el flujo corre, **entonces** el body enviado contiene los valores reales del registro.
- **Dado** el drawer del webhook con muestra disponible, **cuando** el usuario abre la vista previa,
  **entonces** ve el JSON exacto que se enviaría, con tokens no resueltos resaltados.
- **Dado** "Probar webhook" confirmado, **cuando** el endpoint responde 2xx, **entonces** se ve el
  status inline; **cuando** responde 4xx/5xx o no responde, **entonces** el error exacto es visible
  sin salir del editor.
- **Dado** un flujo guardado sin `payload` (registro completo), **cuando** se reabre y corre,
  **entonces** el comportamiento es idéntico al actual (retrocompatible).

**Prioridad:** Alta — es "el envío de webhooks" del pedido; sin editor de payload el output es una
caja negra.

**Dependencias / riesgos:** Requiere Fase A (interpolación compartida). El envío de prueba es una
llamada real — mitigado con confirmación explícita, mismo criterio que "Ejecutar" (spec 025 §D).

---

## Fase D — Vista previa en vivo por campo (UX transversal)

**Estado:** ❌ Gap — hoy el usuario escribe templates a ciegas: el hint ámbar avisa de tokens
huérfanos, pero nadie muestra **qué valor final** tendrá el campo hasta ejecutar o simular.

**Propuesta:**
- `src/features/flows/canvas/InterpolationPreview.tsx` (NUEVO): recibe `template` + `sample` y
  renderiza `Vista previa: "Deal ACME — 5000"` (interpolado con el primer registro de la muestra,
  vía el módulo de Fase A), en texto muted bajo el campo. Tokens no resueltos se muestran resaltados
  en ámbar dentro de la vista previa. Sin muestra disponible, no se renderiza (cero ruido).
- Integrarlo en cada `InterpolableField` de `ActionConfigFields` (title, name, message, to, subject,
  body, setField value, person values, dedupeKeys, webhook payload values) — encapsulado dentro del
  propio wrapper `InterpolableField` para no repetir el montaje 15 veces; `TransformConfigFields` y
  `ConditionConfigFields` quedan como están (ya tienen preview propio / datalist).
- Promover el wrapper `InterpolableField` (hoy local a `ActionConfigFields.tsx:36-64`) a
  `src/features/flows/canvas/InterpolableField.tsx`, con `VariablePicker` + `VariableValidationHint`
  + `InterpolationPreview` integrados — un solo componente coherente en vez de tres montados a mano
  por campo (hoy hay campos con hint y campos sin él, ej. `createProject.fields.source` no tiene).
- `SampleExplorer`: si hay más de un registro en la muestra, selector "Registro 1/2/3" que cambia
  qué registro alimenta TODAS las vistas previas del canvas (estado en `FlowCanvas`, prop nueva
  `previewRecordIndex`).
- Tests: `InterpolationPreview` es presentación pura sobre el módulo de Fase A (ya testeado);
  smoke visual en Verificación.

**Criterios de aceptación:**
- **Dado** un título `{{dealname}} - seguimiento` con muestra cargada, **cuando** el drawer está
  abierto, **entonces** debajo del campo se lee `Vista previa: "ACME Corp - seguimiento"`.
- **Dado** un token no resuelto en el template, **cuando** se muestra la vista previa, **entonces**
  el hueco aparece resaltado en ámbar (además del hint ya existente).
- **Dado** el usuario cambia al Registro 2 en el `SampleExplorer`, **cuando** vuelve al drawer,
  **entonces** las vistas previas reflejan ese registro.
- **Dado** un flujo sin muestra, **cuando** se abre cualquier drawer, **entonces** no aparece ningún
  bloque de vista previa (sin ruido).

**Prioridad:** Alta en valor UX, esfuerzo bajo-medio — convierte el "configurar a ciegas" en
feedback inmediato; es la mejora de experiencia principal del proceso de crear automatizaciones.

**Dependencias / riesgos:** Requiere Fase A. Riesgo de ruido visual — mitigado: solo con muestra
disponible y solo bajo campos con contenido.

---

## Fase E — Valores finales interpolados en la traza (real y dry-run)

**Estado:** 🟡 Parcial — la traza (spec 023 §F) muestra condiciones/mapeo/transform y
outcome/reason por output, y el dry-run muestra `plan`; pero un run REAL no muestra qué
título/destinatario/payload final usó cada output (hallazgo 10).

**Propuesta:**
- `FlowRunOutputTrace` gana `resolved?: Record<string, string>` (campos finales interpolados por
  output: `title`, `to`/`subject`, `name`, `field=value`, host del webhook + keys del payload…) y
  `unresolvedTokens?: string[]` (Fase A). Poblados en `executeOutput` por tipo — valores truncados
  (ej. 120 chars) y sin secretos (el secret del webhook y el body del email no se persisten, mismo
  criterio que 024 §F4).
- `FlowRunTraceView.tsx` (`OutputRow`): render de `resolved` como pares clave→valor compactos bajo
  el output, y de `unresolvedTokens` como chips ámbar "«token» no se resolvió — quedó vacío".
- `DebuggerPanel` hereda esto gratis (reusa `FlowRunTraceView`).
- Vigilar tamaño de `flow-runs`: `RUN_LOG_CAP = 200` ya limita entradas; `resolved` truncado y
  `MAX_TRACE_RECORDS = 5` acotan el crecimiento por entrada.
- Tests: `engine.test.ts` — `resolved` poblado por tipo de output en run real; secretos ausentes;
  `unresolvedTokens` presente cuando un token no resolvió.

**Criterios de aceptación:**
- **Dado** un run real con `createTask`, **cuando** se abre su traza (historial o DebuggerPanel),
  **entonces** se ve el título final interpolado que recibió la tarea.
- **Dado** un output con un token no resuelto, **cuando** se abre la traza, **entonces** un chip
  ámbar identifica el token exacto que quedó vacío.
- **Dado** un output webhook, **cuando** se inspecciona su traza, **entonces** se ve host + keys del
  payload pero nunca el secret.

**Prioridad:** Media — cierra el ciclo de depuración ("¿por qué salió vacío?") que las Fases A–D
hacen mucho menos frecuente pero no imposible.

**Dependencias / riesgos:** Requiere Fase A (fuente de `unresolvedTokens`). Cambio aditivo en la
interface de traza (opcional) — sin migración de datos (los runs viejos simplemente no traen
`resolved`).

---

## Fuera de alcance (documentado)

- Grupos AND/OR y branching por salida (024 §F6 v1/v2) — el modelo de condiciones no cambia aquí.
- Reintentos por acción / política detener-continuar (024 §F1).
- Editor JSON libre para el payload del webhook — el modo clave/valor cubre el caso no-code; JSON
  crudo con validación en vivo puede sumarse después sobre el mismo schema.
- Modificadores de formato en tokens (`{{campo|upper}}`, `{{fecha|date:DD/MM}}`) — el default `||`
  entra; un pipeline de formateadores es evolución natural del módulo de Fase A pero no se necesita
  para cerrar el síntoma reportado.
- Métodos/headers HTTP personalizados en webhook (hoy POST fijo + headers de firma).
- Captura persistente de request/response bodies reales de webhook/email (024 §F4 backlog) — Fase E
  persiste valores interpolados truncados, no bodies HTTP completos.

## Roadmap (impacto vs. esfuerzo)

| Fase | Esfuerzo | Prioridad | Bloquea |
|---|---|---|---|
| A · Módulo de interpolación unificado (fix raíz) | Medio | Alta | B, C, D, E |
| B · Llenado real de campos en objetos | Medio | Alta | — |
| C · Webhook configurable + prueba de envío | Medio | Alta | — |
| D · Vista previa en vivo por campo | Bajo-medio | Alta (UX) | — |
| E · Valores finales en la traza | Bajo | Media | — |

Secuencia sugerida: **A → B → C → D → E** (B, C y D son paralelizables entre sí una vez cerrada A).

## Archivos clave

- **Interpolación (NUEVO):** `src/flows/interpolation.ts` + `interpolation.test.ts` — absorbe
  `interpolateString`/`interpolateObject`/`getNestedValue` de `engine.ts` y el tokenizado de
  `variables.ts:113`.
- **Motor:** `src/flows/engine.ts` (outputs `setField:919`, `createProject.fields:807`,
  `createPerson:858`, `createTask:826`, `webhook:968`, `describeOutput`, coerción `==` en
  `evaluateCondition:428`, traza `resolved`/`unresolvedTokens`).
- **Schema:** `src/domain/schemas/flow.ts` (`CreatePersonOutputSchema.matchSource`),
  `src/domain/schemas/common.ts` (`SCHEMA_VERSION` 12→13), `src/domain/migrations.ts` (paso
  identidad).
- **UI canvas:** `src/features/flows/canvas/ActionConfigFields.tsx` (webhook payload editor, Selects
  de campo destino, ayudas), `InterpolableField.tsx` (NUEVO — promovido),
  `InterpolationPreview.tsx` (NUEVO), `variables.ts` (`validateVariables` sobre el tokenizador
  compartido), `SampleExplorer.tsx` (selector de registro), `FlowCanvas.tsx`
  (`previewRecordIndex`).
- **Webhook test (NUEVO):** `src/flows/webhook-test.ts` + builder de request compartido con el
  engine.
- **Traza:** `src/features/flows/FlowRunTraceView.tsx` (render `resolved` + chips ámbar).
- **Tests:** `interpolation.test.ts` (NUEVO), `engine.test.ts` (extendido), `variables.test.ts`
  (extendido — tokens con espacios/acentos), `webhook-test.test.ts` (NUEVO),
  `migrations.test.ts` (v12→v13).

## Verificación

- `npm run typecheck && npm run lint && npm test` en verde con los tests nuevos de cada fase
  (baseline actual: 401/401).
- `npm run build` en verde.
- Smoke en navegador real (Playwright contra `npm run dev`):
  - **Fase A/B:** flujo de Sheets con columnas "Nombre Cliente" y "Teléfono" → crear tarea con
    título `{{Nombre Cliente}} - llamada` → Ejecutar → la tarea real lleva el nombre de la fila, no
    el template literal. `setField` con `{{amount}}` → el proyecto recibe el valor.
  - **Fase C:** configurar payload personalizado → vista previa muestra el JSON interpolado →
    "Probar webhook" contra un endpoint de prueba (webhook.site / listener local) → status visible
    inline; verificar firma `X-Hito-Signature` presente.
  - **Fase D:** abrir drawer de acción con muestra cargada → vista previa en vivo bajo cada campo;
    cambiar de registro en el SampleExplorer → previews actualizan.
  - **Fase E:** correr flujo real → abrir traza → valores finales interpolados visibles; forzar un
    token roto → chip ámbar con el token exacto.
- Revisión visual (screenshots) adjunta a `Progreso` al cerrar cada fase, convención specs 018–025.
