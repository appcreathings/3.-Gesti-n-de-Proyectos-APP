# Plan — Spec 025 · Editor de flujos: muestra persistente + dry-run + debug

> Plan de ejecución por fases. Cada tarea incluye archivo, checksum esperado y
> dependencias. Ejecutar en orden (las dependencias están anotadas).

## Fase A — Persistencia de `lastSample`

### A1. Schema: añadir `lastSample` y `lastSampleAt` a `FlowRuleSchema`
- **Archivo:** `src/domain/schemas/flow.ts`
- **Cambio:** Sumar dos campos opcionales (ver `design.md` §2). Bump
  `SCHEMA_VERSION` 11→12 en `src/domain/schemas/common.ts`.
- **Dependencias:** ninguna.
- **Verificación:** `npm run typecheck` pasa.

### A2. Migración v11→v12 (identidad)
- **Archivo:** `src/domain/migrations.ts`
- **Cambio:** Añadir `{ to: 12, up: (data) => data }` en el array `flows`.
- **Dependencias:** A1.
- **Verificación:** `npm run typecheck && npm test` — los tests de
  `migrations.test.ts` que ya validan la convergencia siguen en verde; añadir
  test `flows v11 → v12` que ejercite el paso.

### A3. `createEmptyFlow` y `duplicateFlow` no propagan muestra
- **Archivo:** `src/flows/migration.ts`
- **Cambio:** `duplicateFlow` debe explícitamente resetear `lastSample: undefined`
  and `lastSampleAt: undefined` (ver `design.md` §2). `createEmptyFlow` ya no
  los setea, no hace falta tocarlo.
- **Dependencias:** A1.
- **Verificación:** ampliar `src/flows/migration.test.ts` con un test que
  compruebe que `duplicateFlow(flowConMuestra)` produce una copia SIN
  `lastSample`.

### A4. `TriggerStep` persiste y limpia la muestra
- **Archivo:** `src/features/flows/steps/TriggerStep.tsx`
- **Cambio:**
  - En `handleTestConnection` (líneas 173-198): tras resultado exitoso, llamar
    `updateFlow({ lastSample: result.sample?.slice(0,3), lastSampleAt:
    new Date().toISOString() })`.
  - En `TriggerStep` "Connection" select (líneas 304-322) y en
    `handleTriggerTypeChange` (líneas 101-131) y en HubSpot object type select
    (líneas 331-351): al cambiar, llamar `updateFlow({ lastSample: undefined,
    lastSampleAt: undefined })`.
  - Mostrar `Badge` con `Muestra: N reg · HH:mm` cuando `flow.lastSampleAt`
    existe (reemplaza el string `✅ Result.detail` actual o se muestra junto a
    él — preferencia: badge más prominente).
- **Dependencias:** A1, A3.
- **Verificación:** test visual Fase A en navegador (ver A6); tipo OK.

### A5. `FlowCanvas` inicializa y sube `triggerSample`
- **Archivo:** `src/features/flows/canvas/FlowCanvas.tsx`
- **Cambio:**
  - Props nuevas: `initialSample?: Record<string, unknown>[]`,
    `onSampleChange?: (sample, isPersistable) => void`. (El `isPersistable`
    distingue "Probar conexión" exitosa, que debe persistir, de una muestra
    efímera interna.)
  - `useState(triggerSample)` inicializa con `initialSample` (en vez de
    `undefined`).
  - En `onSampleChange` prop desde TriggerStep (ya existe línea 178), propagar
    también al padre (`onSampleChange` del canvas).
- **Dependencias:** A4.
- **Verificación:** integración visual Fase A6.

### A6. `FlowBuilderPage` persiste `lastSample` al guardar
- **Archivo:** `src/features/flows/FlowBuilderPage.tsx`
- **Cambio:**
  - Estado nuevo: `const [sample, setSample] = useState<Record<string,unknown>[] | undefined>(flow.lastSample)`.
  - `useEffect` que cuando `flow.lastSample` cambia (carga async vía store)
    actualiza `setSample(flow.lastSample)`.
  - Pasar `initialSample={sample}` y `onSampleChange={setSample}` al
    `FlowCanvas`.
  - En `handleSave` (líneas 50-73): añadir campos al `finalFlow`:
    `lastSample: sample?.slice(0,3), lastSampleAt: sample ? new Date().toISOString() : undefined`.
    Si `sample === undefined`, NO borrar `lastSample` existente (puede ser el
    hidratado sin re-probar); si `sample` pasó a estar vacío, sí limpiarlo.
- **Dependencias:** A5.
- **Verificación:**
  - Test e2e (Playwright) contra `npm run dev` con conexión mock:
    - Crear flujo de Sheets → seleccionar conexión → "Probar conexión" → Guardar
      → recargar → reabrir editor → el mapeo de transform ve los campos de la
      muestra persistida.
  - Test unitario nuevo `src/features/flows/canvas/variables.test.ts`:
    "si `lastSample` está definido, `deriveAvailableVariables(trigger, lastSample)`
    devuelve las claves reales."

**Cierre de Fase A:** `npm run typecheck && npm run lint && npm test` en verde.
Captura de pantalla del editor reabierto con variables visibles → anexar a
`spec.md` §Progreso (entrada "Fase A — implementada y verificada").

---

## Fase B — Variables en condiciones + validación sincronizada

### B1. `deriveAvailableVariables` — fallback para poll
- **Archivo:** `src/features/flows/canvas/variables.ts`
- **Cambio:** Añadir fallback para `trigger.type === "poll"` cuando no hay sample
  (ver `design.md` §4). Mover `HUBSPOT_FIELDS_BY_TYPE` desde `TriggerStep.tsx` a
  `variables.ts` como `HUBSPOT_DEFAULT_FIELDS_FOR_OBJECT_TYPE` (exportar) — TriggerStep 
  la reusa por import.
- **Dependencias:** A1 (no estricta, pero conviene).
- **Verificación:** actualizar `variables.test.ts:39-42` (test original pasa a
  usar `provider: "google-sheets"` sin `fields`; el test que ya usa `hubspot`
  ahora cubre el retorno `["email","firstname","lastname"]`).

### B2. `validateVariables` util nuevo
- **Archivo:** `src/features/flows/canvas/variables.ts` + `variables.test.ts`
- **Cambio:** Implementar `validateVariables(template, available)` (ver
  `design.md` §5). 5 tests nuevos: template sin tokens (`valid: true`);
  template con 1 token válido; template con 1 token faltante; template con 2
  tokens donde solo 1 falta; template con `{{record.email}}` cuando available
  tiene `email` (comparación top).
- **Dependencias:** B1.
- **Verificación:** `npm test src/features/flows/canvas/variables.test.ts`.

### B3. `VariableValidationHint` componente nuevo
- **Archivo:** `src/features/flows/canvas/VariableValidationHint.tsx` (NUEVO)
- **Cambio:** Ver §6 del design.
- **Dependencias:** B2.
- **Verificación:** typecheck OK; solo se renderiza el componente sin integrarlo
  en este paso (se integra en B4-B6).

### B4. Integrar `VariableValidationHint` en `ActionConfigFields`
- **Archivo:** `src/features/flows/canvas/ActionConfigFields.tsx`
- **Cambio:** Tras cada `<InterpolableField>` de string-interpolable, añadir un
  `<VariableValidationHint template={value} available={availableVariables} />`.
  Lista de campos a cubrir (de §6 del design):
  - `createTask`: title, description, assigneeId, dueDate, summary, dedupeKey.
  - `createProject`: name, dedupeKey, fields[*].source.
  - `createPerson`: data[*] value.
  - `setField`: value.
  - `createNotification`: message.
  - `email`: to, subject, body.
- **Dependencias:** B3.
- **Verificación:** visual en navegador con typo `{{namae}}` → aparece alerta
  ámbar.

### B5. Integrar `VariableValidationHint` en `TransformConfigFields`
- **Archivo:** `src/features/flows/canvas/TransformConfigFields.tsx`
- **Cambio:** Sin cambios estructurales — MCP "Probar con datos de ejemplo"
  sigue测试ando `transformCode`. Aplicar `VariableValidationHint` a los inputs
  interpolables si los hubiera en transform (hoy no hay string templates en
  transform — mapeo usa source/target como paths, no como tokens). Documentarlo
  en el archivo (comentario) y cerrar esta tarea comprobando que no aplica.
- **Dependencias:** B3.
- **Verificación:** N/A — solo documentación.

### B6. `ConditionConfigFields` — picker de variables + validación
- **Archivo:** `src/features/flows/canvas/ConditionConfigFields.tsx`
- **Cambio:**
  - Props nuevas: `trigger: Trigger`, `sample?: Record<string, unknown>[]`.
  - Calcular `availableVariables = deriveAvailableVariables(trigger, sample)`.
  - Sustituir el `<Input>` de `condition.field` (línea 14-20) por una versión
    con `VariablePicker` al lado — reusar el patrón `InterpolableField` de
    `ActionConfigFields` (extraerlo a un componente compartido si procede, sino
    duplicar `Variant` aquí).
  - `<VariableValidationHint template={\`{{${condition.field}}\}`}
    available={availableVariables} />` cuando `condition.field` no está
    vacío — aprovechar para advertir si el campo elegido no está en la muestra.
  - `condition.value`: si `op === "contains"|"=="`, datalist con valores del
    sample correspondientes al campo elegido (`availableVariables` examples).
- **Dependencias:** B1, B3.
- **Verificación:** test visual: abrir drawer de condición en un flujo HubSpot
  → el selector ofrece `email`, `firstname`, etc.; escribir un campo inexistente
  → advertencia visible.

### B7. `FlowCanvas` pasa `sample` al `case "condition"`
- **Archivo:** `src/features/flows/canvas/FlowCanvas.tsx`
- **Cambio:** En el `switch (node.data.kind)` (líneas 171-230), el
  `case "condition"` actualmente NO recibe `trigger`/`sample`. Añadir:
  ```tsx
  case "condition": {
    const data = node.data;
    return (
      <ConditionConfigFields
        condition={data.condition}
        trigger={triggerData?.trigger ?? { type: "event", event: "task.statusChanged" }}
        sample={triggerSample}
        onChange={...}
      />
    );
  }
  ```
- **Dependencias:** B6, A5.
- **Verificación:** typecheck OK; el drawer de condición renderiza con
  `VariablePicker` funcionando.

**Cierre de Fase B:** `npm run typecheck && npm run lint && npm test` en verde
con tests nuevos. Captura del drawer de condición con `VariablePicker` y
banner amarillo por typo → anexar a `spec.md` §Progreso.

---

## Fase C — Dry-run con `describeOutputs`

### C1. `engine.ts` — flag `describeOutputs` y `plan` en traza
- **Archivo:** `src/flows/engine.ts`
- **Cambio:**
  - `FlowEngineInput` gana `describeOutputs?: boolean`.
  - `FlowRunOutputTrace` gana `plan?: string`.
  - `executeOutput` gana parametro `describeOnly: boolean` (pasado desde
    `runFlowEngine` con `input.describeOutputs ?? false`). Si true, NO muta
    result ni llama a fetch/envío; retorna `{ mutatedProjectIds: [], outcome:
    "executed", plan: ... }`.
  - Nueva función privada `describeOutput(output, data, source, flow,
    projectMap)` con switch por `output.type` (ver §9 del design).
  - En `runFlowEngine`, propagar `input.describeOutputs ?? false` al
    `executeOutput`.
- **Dependencias:** A1.
- **Verificación:** ampliar `src/flows/engine.test.ts`:
  - Test: `describeOutputs=true` con `createTask` → `result.newProjects` y
    `changedProjects` vacíos; `traces[flow.id].records[0].outputs[0].plan`
    contiene "Se crearía la tarea".
  - Test: `describeOutputs=true` con webhook → `result.outboundDeliveries`
    vacío; `plan` describe el host.
  - Test: `describeOutputs=false` (default) no rompe ningún test existente.

### C2. `dry-run.ts` — nuevo
- **Archivo:** `src/flows/dry-run.ts` (NUEVO)
- **Cambio:** Implementar `dryRunFlow(flow, deps)` (ver §7 del design). Para
  `event`, usar `EVENT_FIELD_EXAMPLES` (importar desde
  `src/features/flows/canvas/variables.ts`) y construir el synthetic a mano
  (casting `as unknown as DomainEvent`).
- **Dependencias:** C1.
- **Verificación:** nuevo test `src/flows/dry-run.test.ts`:
  - `dryRunFlow` con poll exitoso → ok=true, trace poblada, sin resultados en
    store (mock provisto).
  - `dryRunFlow` con poll fallido (mock reject) → ok=false, error message.
  - `dryRunFlow` con event → ok=true, trace con el synthetic sample.
  - `dryRunFlow` con `transformCode` que lanza → trace con error.

### C3. `FlowRunTraceView` renderiza `plan`
- **Archivo:** `src/features/flows/FlowRunTraceView.tsx`
- **Cambio:** En `OutputRow`, si `output.plan` está presente, mostrarlo en lugar
  del badge "ejecutado"/"omitido" (ver §11 del design). Estilo: italic-gray.
- **Dependencias:** C1.
- **Verificación:** visual OK.

### C4. `DebuggerPanel` nuevo componente
- **Archivo:** `src/features/flows/canvas/DebuggerPanel.tsx` (NUEVO)
- **Cambio:**
  - Props: `flow: FlowRule`, `deps: { projects, people, projectTypes,
    checklistTemplates, processTemplates }`, `realRunResult?: FlowRunLog`
    (cdo el padre invoca "Ejecutar"), `clearRealRun: () => void`.
  - Estado interno: `status: "idle"|"loading"|"result"|"error"`,
    `result?: DryRunResult | null`, `error?: string`.
  - `handleDryRun` async: set loading, aguarda `dryRunFlow`, set result.
  - Botones:
    - "Simular flujo" (Fase C — reusa `dryRunFlow`).
    - Botón "Ejecutar" se delega al padre (Fase D — panel lo muestra si
      proviene de ejecución real).
  - Render: cuando `result.trace`, usa `<FlowRunTraceView trace={result.trace} />`
    con borde arriba gris (dry). Cuando `realRunResult`, lo mismo con borde
    verde (real) + botón "Ver en Historial global" que navega a
    `ROUTES.flowHistory`.
- **Dependencias:** C2, C3.
- **Verificación:** integración visual C5.

### C5. Montar `DebuggerPanel` en `FlowBuilderPage`
- **Archivo:** `src/features/flows/FlowBuilderPage.tsx`
- **Cambio:** Layout grid de 2 columnas en `md:` — canvas a la izquierda,
  `DebuggerPanel` a la derecha. En mobile, stack vertical (panel debajo del
  canvas, collapsable por defecto).
  ```tsx
  <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
    <FlowCanvas ... />
    <DebuggerPanel flow={flow} deps={...} />
  </div>
  ```
  Inyectar las dependencias desde `useDataStore` (projects, people,
  projectTypes, processTemplates, checklistTemplates).
- **Dependencias:** C4.
- **Verificación:** test e2e Playwright:
  - Abrir editor de un flujo de HubSpot ya guardado con sample → pulsar
    "Simular flujo" en DebuggerPanel → aparece traza con "Se crearía la
    tarea 'X'…".
  - Tras simular, en el store no hay nuevas tareas (`useDataStore.getState().projects`
    sin cambios).

**Cierre de Fase C:** tests OK + screenshot del `DebuggerPanel` tras dry-run
anexado a `spec.md` §Progreso.

---

## Fase D — Ejecución real desde el editor

### D1. Botón "Ejecutar" en `FlowBuilderPage`
- **Archivo:** `src/features/flows/FlowBuilderPage.tsx`
- **Cambio:**
  - Importar `useDataStore.runFlowNow` y `ConfirmDialog`, `RunEventFlowDialog`.
  - Estado: `toRun`, `toRunEvent`, `lastRealRunLog: FlowRunLog | null`.
  - `openRunDialog`:
    - Si `!isEditing`: no-op (botón deshabilitado).
    - Si el canvas está dirty (cambios sin guardar): abrir `ConfirmDialog` con
      texto "Tienes cambios sin guardar; se ejecutará la versión guardada.
      ¿Continuar?" → si confirma, proceder.
    - Si `flow.trigger.type === "poll"`: abrir `ConfirmDialog` estándar (igual
      que `FlowsPage.handleRunConfirm`).
    - Si `flow.trigger.type === "event"`: abrir `RunEventFlowDialog`.
  - `handleRunConfirm` (poll): esperar `runFlowNow(flow.id)`, luego buscar el
    último `FlowRunLog` para `flow.id` en `useFlowStore.runs` y setear
    `lastRealRunLog`.
  - `handleRunEventFlow` (event): igual pero con `syntheticEvent` (igual que
    `FlowsPage.handleRunEventFlow`).
  - Pasar `realRunResult={lastRealRunLog}` y `clearRealRun={() =>
    setLastRealRunLog(null)}` al `DebuggerPanel`.
  - Render del botón en `PageHeader` actions (ver §12 del design).
- **Dependencias:** C5.
- **Verificación:** test e2e Playwright:
  - Editar un flujo de Sheets ya guardado → pulsar "Ejecutar" → ConfirmDialog →
    confirmar → tras 5s, DebuggerPanel muestra la traza del run real; verificar
    que se crea una tarea real en el store.

### D2. Refinar: advertencia dirty + tooltip de botón deshabilitado
- **Archivo:** `src/features/flows/FlowBuilderPage.tsx`
- **Cambio:**
  - Detectar dirty: trackear un flag `isDirty` en el builder via cambio de
    `graph`/`flow` desde el último guardado (puede con `useRef(lastSavedGraph)`
    + comparación con `JSON.stringify`).
  - Botón "Ejecutar" disabled + tooltip "Guarda el flujo primero" si
    `!isEditing`. Botón "Simular" igual pero habilitado en `!isEditing` (no
    requiere flow guardado — pero sí requiere `flow.id` para el motor; opción:
    permitir Simular en flujo nuevo generando id provisional — decisión:
    **en v1**, "Simular" también require guardado, simplificando. Ajuste final
    documentado en `design.md`).
- **Dependencias:** D1.
- **Verificación:** manual.

**Cierre de Fase D:** test e2e OK + screenshot de DebuggerPanel mostrando
traza real (borde verde distinguible del dry-run) → anexar.

---

## Fase E — Sincronización reactiva y badge de muestra

### E1. Revalidación reactiva
- **Archivo:** `src/features/flows/canvas/FlowCanvas.tsx` y componentes hijos.
- **Cambio:** No es necesaria acoplación nueva — `triggerSample` (ya existente
  como estado del canvas) se pasa como prop a los drawer hijos que ya
  recalculan `availableVariables` en su render. Solo confirmar:
  - Tras "Probar conexión" (`TriggerStep`), el nuevo sample sube al canvas y
    provoca re-render de `FlowCanvas` → re-render de drawer abierto (porque
    tienen props nuevas).
  - Documentar este comportamiento con un comentario en `FlowCanvas.tsx`
    (línea ~67) — aclarar que la "sincronización reactiva" funciona Gratis
    vía el flujo de React props.
- **Dependencias:** B7.
- **Verificación:** test e2e (mismo que B6/B7):
  - Abrir drawer de condición con `{{namae}}` advertido → Probar conexión con
    muestra nueva → advertencia persiste (correcto — no está en la nueva
    muestra) → cambiar `namae` → `name` → advertencia desaparece sin cerrar drawer.

### E2. Badge en `TriggerStep`
- **Archivo:** `src/features/flows/steps/TriggerStep.tsx`
- **Cambio:** Tras "Probar conexión" exitoso (o al hidratarse con `lastSample`
  existente), mostrar `Badge` con `Muestra: N reg · HH:mm` al lado del botón.
  Reemplaza el `✅ Conexión OK` actual (que ahora no persiste). Mantiene el
  icono de color para distinguir verde/rojo.
- **Dependencias:** A4 (ya debe estar hecho — esta tarea confirma y limpia).
- **Verificación:** visual OK.

**Cierre de Fase E (y de spec 025):** `npm run typecheck && npm run lint && npm
test && npm run build` en verde. Captura de pantalla final del editor con:
badge de muestra visible, drawer de condición con \`VariablePicker\`, banner
amarillo de typo, DebuggerPanel con traza de dry-run, botón Ejecutar visible.

---

## Secuencia de ejecución resumida

```
A1 → A2 → A3
   ↓
A4 → A5 → A6   [Cierre Fase A]
   ↓
B1 → B2 → B3 → B4 → B5
                   ↓
                   B6 → B7   [Cierre Fase B]
                          ↓
                          C1 → C2 → C3 → C4 → C5   [Cierre Fase C]
                                              ↓
                                              D1 → D2   [Cierre Fase D]
                                                    ↓
                                                    E1 → E2   [Cierre spec]
```

Tareas paralelizables entre fases (no dentro de una fase):
- D1/D2 puede adelantarse trabajo una vez C5 合并 (sin bloquear).
- E1 puede quedarse solo pendiente de B7 + A5 + C4 合并.

## Tests nuevos (resumen)

| Archivo | Tests nuevos |
|---|---|
| `src/domain/migrations.test.ts` | 1 (flujo v11 → v12) |
| `src/flows/migration.test.ts` | 1 (duplicateFlow no copia lastSample) |
| `src/features/flows/canvas/variables.test.ts` | 5 (`validateVariables`) + 1 (poll fallback fields) |
| `src/flows/engine.test.ts` | 3 (`describeOutputs` createTask/webhook/default) |
| `src/flows/dry-run.test.ts` | 4 (nuevo archivo, casos dry-run) |
| **Total estimado:** | **~15 tests nuevos** |

## Riesgos / abiertas a resolver durante implementación

1. **`buildSyntheticEvent` vs synthetic a mano** (§8 del design): ya decisión
   tomada (synthetic a mano). Confirmar después de C2 que no rompe el motor.
2. **`Sample at reload` flip:** Si `flow.lastSample` no sube a `FlowCanvas`
   como `initialSample`, el usuario no ve las variables hasta re-probar. Cuidar
   A5/A6.
3. **Layout responsitvo del `DebuggerPanel`:** dock colapsable en mobile, dock
   fijo en md+. Probar con viewport 375px y 1280px.
4. **`Enable` bypass en dry-run de flujo inactivo:** el builder puede estar
   editando un flow con `enabled: false` (recién duplicado). El dry-run debe
   funcionar igual — `dryRunFlow` ya hace `{...flow, enabled: true}` transitorio
   (igual que `manual-run.ts`). Test新增.