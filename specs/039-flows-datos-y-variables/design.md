# Design 039 — Datos legibles y una sola forma de elegir variables

> Decisiones técnicas para `spec.md`. Ancladas al código actual (líneas verificadas sobre el
> árbol post-038). Sin cambio de schema.

## 0. Mapa de archivos tocados (previsto)

| Área | Archivos | Naturaleza |
|------|----------|------------|
| A · Controles y paneles | `canvas/CanvasControls.tsx`; `FlowBuilderPage.tsx`, `canvas/DebuggerPanel.tsx` | Historial vertical + depurador plegable |
| B · Registro del evento | **nuevo** `flows/event-record.ts`; `flows/engine.ts`, `canvas/variables.ts`, `flows/dry-run.ts`, `canvas/ActionConfigFields.tsx` | Enriquecimiento aditivo en un solo punto |
| C · Variables por etapa | `canvas/variables.ts`; `canvas/ActionConfigFields.tsx`, `canvas/VariablesPanel.tsx`, `flows/validation.ts`, `canvas/FlowCanvas.tsx` | Lista pre/post-mapeo |
| D · Picker homologado | **nuevo** `canvas/VariableMenu.tsx`; `canvas/VariablePicker.tsx`, `canvas/ConditionConfigFields.tsx` | Carcasa compartida, inserción propia |
| E · Valor de la condición | `canvas/ConditionConfigFields.tsx` | Elegir/pre-rellenar desde datos reales |
| F · Retirada del drag&drop | **borrar** `canvas/useVariableDrop.ts` + su test; `canvas/VariablesPanel.tsx`, `canvas/InterpolableField.tsx`, `canvas/ConditionConfigFields.tsx`, `canvas/TransformConfigFields.tsx` | Reversión de 037 §B |

**Sin cambios de comportamiento** en: `applyMapping`, `conditions.ts`, `interpolation.ts`,
`graph.ts`, `migration.ts`, `node-issues.ts`, `trace-projection.ts`, `useGraphHistory.ts`, schema
`FlowRule`. Sin `schemaVersion` nuevo (Principio II).

---

## 1. Área A — Controles y paneles (HU-01, HU-02)

### A1. El escalón del cluster de historial (HU-01)

038 dejó esto en `CanvasControls.tsx:44`:

```tsx
<Panel position="bottom-left" className="m-4 flex flex-col gap-2">
  <div className="flex …">        {/* historial: 2 botones EN FILA → 72px de ancho */}
  <div className="flex flex-col …">{/* encuadre: 5 botones EN COLUMNA → 36px de ancho */}
```

Dos bloques de anchos distintos apilados: el escalón de 36px a la derecha de la columna inferior
es el hueco que se ve. La corrección es de una línea conceptual — el cluster de historial pasa a
`flex-col`, con `border-t` entre botones como el de abajo — y **se conservan los dos grupos**
(CA-01.2): siguen separados por el `gap-2` del `Panel`, que es lo que distingue "deshacer/rehacer"
de "zoom/ajustar/maximizar/atajos" sin convertirlos en una tira de siete iconos.

Nada más cambia: `disabled`, `aria-disabled` y el `title` con la operación concreta son de 038 y
se quedan.

### A2. Depurador plegable (HU-02)

El layout vive en `FlowBuilderPage.tsx:479`:

```tsx
<div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
  <FlowCanvas … />
  <div className="h-[calc(100vh-260px)] min-h-[480px]"><DebuggerPanel … /></div>
```

El estado `debuggerCollapsed` vive en `FlowBuilderPage` (es quien define la rejilla), no en el
panel: plegado, la rejilla pasa a `lg:grid-cols-[1fr_auto]` y el hueco derecho lo ocupa una
pestaña vertical.

**La pestaña copia la de Variables** (`VariablesPanel.tsx:61-79`): mismo alto, mismo borde
redondeado hacia adentro, misma `Badge` de conteo, mismos `aria-expanded`/`aria-label`. Es el
punto de CA-02.1: el editor ya tiene un idioma para "esto se pliega", y un segundo idioma para lo
mismo sería peor que no plegar.

`DebuggerPanel` recibe `collapsed` + `onToggle` y hace `return <rail/>` temprano cuando está
plegado. **Su estado interno (`status`, `error`) no se toca** — es el mismo componente, no se
desmonta, así que la traza sigue ahí al desplegar (CA-02.3). La traza ya vive en el padre desde
038 §D3, con lo cual tampoco dependía de esto.

**No se re-encuadra el canvas al plegar** (R5): React Flow no reacciona al cambio de ancho del
contenedor y forzar un `fitView` movería el viewport que el usuario acaba de ajustar. Aparece
espacio a la derecha y los nodos se quedan donde estaban; "Ajustar a pantalla" está a un clic.

---

## 2. Área B — El registro del evento (HU-03)

### B1. El defecto, con precisión

```ts
// events.ts:12-13 — todo lo que un evento de tarea sabe decir
| { type: "task.added"; projectId: string; taskId: string }
| { type: "task.statusChanged"; projectId: string; taskId: string; from: string; to: string }

// engine.ts:521-526 — el evento ES el registro, tal cual
const matching = events.filter((e) => e.type === trigger.event);
return { records: matching.map((e) => e as unknown as Record<string, unknown>), … };
```

De ahí en adelante todo el pipeline ve solo ids: las condiciones comparan uuids, el mapeo mapea
uuids, y el webhook sin `payload` explícito manda el registro entero (`engine.ts:1260` →
`buildWebhookRequest(output, data)`), o sea uuids.

### B2. Corrección — enriquecer una vez, en el motor

Nuevo `src/flows/event-record.ts`, puro:

```ts
export interface EventRecordDeps {
  projects: Project[];
  people: Person[];
}

/** Registro que ve el pipeline para un evento interno: el evento tal cual,
 *  más los datos legibles de las entidades que referencia. */
export function eventRecord(event: DomainEvent, deps: EventRecordDeps): Record<string, unknown>
```

Se llama desde `resolveTriggerData` (`engine.ts:521-526`), el **único** punto donde un evento se
convierte en registro. Ahí ya está `eventToSource` haciendo algo emparentado (extrae los ids para
el targeting), así que el sitio es el correcto y el cambio es de una línea en el motor.

`runFlowEngine` tiene `input.projects` e `input.people`; `resolveTriggerData` recibe los índices
ya construidos (`Map` por id, uno por corrida — R6), no los arrays.

### B3. Claves planas punteadas — por qué, y por qué importa

El enriquecimiento emite `record["task.title"]`, **no** `record.task.title`. Tres razones, todas
verificadas en el código:

- `resolvePath` (`interpolation.ts:76-86`) prueba **`hasOwnProperty(data, path)` primero** y solo
  parte por puntos si falla. Una clave literal `"task.title"` resuelve por el primer camino, así
  que `{{task.title}}` en una acción y `task.title` en una condición funcionan sin tocar nada.
- `sampleFields` (`useSampleFields.ts:41-50`) recorre **solo el nivel superior** del registro. Con
  objetos anidados, el panel de Variables mostraría una fila `task` de tipo `object` y ejemplo
  `{"title":…}` — inútil — y el picker no ofrecería `task.title`. Con claves planas, cada campo
  nuevo aparece como fila propia, con su tipo y su ejemplo, **gratis**.
- `validateVariables` (`variables.ts:157-162`) valida `path` o su primer segmento: con claves
  planas el match es exacto, sin la laxitud de aceptar cualquier `task.*`.

El precio es que el JSON del webhook lleva claves con punto (`{"task.title": "…"}`). Es JSON
válido y Make/Zapier lo consume sin problema.

### B4. Qué se añade

Por entidad referenciada por el evento, y **solo si la entidad existe** (CA-03.5):

| Prefijo | Campos |
|---|---|
| `task.` | `title`, `status`, `priority`, `dueDate`, `assigneeId`, `assigneeName`, `tags` |
| `project.` | `name`, `status`, `health`, `priority` |
| `area.` | `name` |
| `checklist.` | `name` |
| `item.` | `text` |

Regla de colisión: **el evento gana siempre**. La composición es
`{ ...enrichment, ...event }`, no al revés — así ningún campo calculado puede pisar `from`/`to`/
`taskId` y ningún flujo guardado cambia de significado (CA-03.2). Un test lo fija.

`assigneeName` sale de `deps.people`; sin coincidencia, se omite (no se emite `""`, que se leería
como "no tiene responsable" en vez de "no lo pude resolver").

### B5. Los ejemplos y la simulación

- `EVENT_FIELD_EXAMPLES` (`variables.ts:21-33`) gana los campos nuevos con valores de ejemplo
  ("Llamar a ACME", "todo", "alta"…). Es la fuente del panel de Variables y de los pickers cuando
  no hay muestra real, así que sin esto los campos nuevos existirían en ejecución pero serían
  invisibles en el editor (CA-03.3). La tabla es un `Record<DomainEventType, …>`, así que el
  compilador obliga a cubrir los once eventos.
- `dry-run.ts` construye hoy un evento sintético desde esa tabla, con `projectId: "proj-123"` —
  que no existe, así que el enriquecimiento no encontraría nada y la simulación mostraría los
  campos nuevos vacíos: exactamente la clase de mentira que 038 combatió. Pasa a **sembrar desde
  una entidad real** cuando la hay, reusando `EVENT_SEED_REQUIREMENTS` + `buildSyntheticEvent`
  (`synthetic-event.ts`), que ya resuelven "qué entidad necesita cada tipo de evento" para
  "Ejecutar ahora". Sin ninguna entidad válida, cae al sintético de ejemplos como hoy (CA-03.6).
- El drawer del webhook dice, donde ya explica el modo Simple, que sin payload explícito se envía
  el registro completo y qué incluye ahora (CA-03.7).

---

## 3. Área C — Variables por etapa del pipeline (HU-04)

### C1. El defecto

`applyMapping` (`engine.ts:604-612`):

```ts
if (mapping.length === 0) return { ...record };   // passthrough
const result = {};
for (const m of mapping) result[m.target] = getNestedValue(record, m.source);
return result;                                    // ← SOLO los targets
```

Con mapeo configurado el registro se **reemplaza**. Entonces, hoy:

- el picker de una acción ofrece `dealname` (que ya no existe post-mapeo) → el token interpola a
  vacío, en silencio;
- **no** ofrece `title` (que sí existe) → hay que escribirlo a ciegas;
- `validateFlow` (`validation.ts:259`) valida los tokens de las acciones contra la lista
  **pre-mapeo**: no avisa del primer caso y avisa en falso del segundo (CA-04.5).

### C2. Corrección — una función pura más

En `canvas/variables.ts`:

```ts
export interface StageVariables {
  /** Antes del Transformar: lo que ven las condiciones. */
  before: AvailableVariable[];
  /** Después del Transformar: lo que ven las acciones. */
  after: AvailableVariable[];
  /** `after` no es exhaustiva: hay `transformCode` y puede añadir o quitar claves. */
  afterIsPartial: boolean;
}

export function stageVariables(
  base: AvailableVariable[],
  mapping: FieldMapping[],
  transformCode?: string,
): StageVariables
```

- `mapping.length === 0` → `after === before` (el passthrough de `applyMapping`).
- `mapping.length > 0` → `after` son los `target`, cada uno **heredando el `example` de su
  `source`** (el valor no cambia al renombrar, así que la lista sigue siendo reconocible).
- `transformCode` presente → `afterIsPartial: true`. **No se parsea el código** (CA-04.6):
  adivinar asignaciones sería frágil y fallaría en silencio, que es peor que declararse
  incompleta.

Es pura y sin DOM, del mismo tipo que `nodeIssueMap` y `projectTrace` de 038.

### C3. Quién recibe qué

`FlowCanvas` ya conoce el nodo transform (lo usa para `actionUsedTokens`, `FlowCanvas.tsx:334`),
así que calcula `stageVariables` una vez y reparte:

| Consumidor | Lista |
|---|---|
| `ConditionConfigFields` | `before` (se evalúan pre-mapeo — CA-04.3) |
| `TransformConfigFields` (origen del mapeo) | `before` |
| `ActionConfigFields` (`ActionConfigFields.tsx:145`) | `after` |
| `VariablesPanel` | las dos, en secciones separadas (CA-04.4) |
| `validateFlow`, tokens de outputs | `after` |

`validateFlow` recibe el mapeo por `flow.logic.mapping` — ya lo tiene, no hace falta prop nueva.
El mensaje del warning nombra la causa: *"…el Transformar renombró los campos: después del mapeo
existen `title`, `amount`"* (R2) — un warning que no explica por qué es un warning que el usuario
apaga ignorándolo.

El panel etiqueta las dos secciones con el vocabulario del canvas ("Del trigger" / "Después de
Transformar") y, si `afterIsPartial`, lo dice: *"el código puede añadir o quitar campos"*.

---

## 4. Área D — Un picker, dos inserciones (HU-05)

### D1. Por qué NO se fusionan del todo

037 separó `ConditionFieldPicker` de `VariablePicker` por una razón que sigue viva
(`ConditionConfigFields.tsx:246-254`): el picker de condiciones antes reusaba el de acciones,
insertaba `{{campo}}` y después le quitaba las llaves con un regex `\w`-only. `Nombre Cliente` no
matcheaba, y `condition.field` quedaba con llaves dentro — una condición que no se cumple jamás.

La homologación es de **carcasa y gesto**, no de semántica. Nuevo `canvas/VariableMenu.tsx`:

```tsx
export interface VariableMenuOption { label: string; hint?: string; value: string }

export function VariableMenu({ rows, options, onPick, … }: {
  rows: VariableRow[];
  /** Submenú por variable. `[]` = un solo nivel. */
  options: (row: VariableRow) => VariableMenuOption[];
  /** `option` ausente = "tal cual". El llamador decide qué significa. */
  onPick: (field: string, option?: VariableMenuOption) => void;
})
```

**La carcasa no construye texto** (R4): no sabe qué es un `{{}}` ni un operador. Recibe filas,
pinta el menú de dos niveles, y devuelve `(field, option?)`. Quien inserta es cada llamador:

| Llamador | `options` | `onPick` |
|---|---|---|
| `VariablePicker` (acciones) | `FORMAT_OPTIONS` (`VariablePicker.tsx:29-35`) | `insertTokenAt(value, field, el, mod)` → `{{campo\|mod}}` |
| `ConditionFieldPicker` | los 8 operadores de `FlowCondition["op"]` | `onChange({ field, op })` — path crudo, sin llaves |

CA-05.5 sale gratis: el submenú llama al **mismo** `onChange({op})` que el `<select>` de abajo, no
a un estado paralelo.

### D2. La lista compartida

Las dos superficies muestran `VariableRow` (`variables.ts:107-114`: campo + tipo + ejemplo +
presencia) — hoy el de condiciones ya la usa y el de acciones usa `AvailableVariable`, que es un
subconjunto. Unificar hacia `VariableRow` es lo que hace que se vean iguales (CA-05.1).

### D3. Lo que se borra

El bloque de "escribir campo…" (`VariablePicker.tsx:119-158` y
`ConditionConfigFields.tsx:318-351`) — 40 líneas × 2, con su `stopPropagation` de teclado y
puntero peleando contra el typeahead de Radix, que es justamente por lo que no funciona. Se retira
(CA-05.4). No se pierde capacidad: los dos campos son inputs de texto libre y se puede escribir
directamente en ellos; lo que se pierde es un camino roto que prometía funcionar.

---

## 5. Área E — El valor de la condición (HU-06)

Hoy (`ConditionConfigFields.tsx:73-83`, `:204-221`) los valores observados existen pero viven en
un `<datalist>`: invisible hasta escribir, e inexistente para operadores no string-ish.

- **Elegir** (CA-06.1): un `VariableMenu` de un solo nivel junto al input de valor, con los
  valores distintos que el campo tiene en la muestra (dedupe, tope 50 — ya calculado en
  `valueOptions`), o el `example` del trigger si no hay muestra. Con `op === "in"`, elegir
  **añade** a la lista en vez de reemplazar (CA-06.3): es el `InValuesEditor` de 037 §D3 el que
  recibe el valor.
- **Pre-rellenar** (CA-06.2): al cambiar `condition.field`, si `value` está vacío se rellena con
  el ejemplo de ese campo. **Solo si está vacío** — pisar lo que el usuario escribió sería peor
  que no sugerir nada. Vive en el `onChange` del picker de campo, no en un `useEffect`: un efecto
  que escribe estado derivado del estado se dispararía también al cargar el flujo y al deshacer.
- El `datalist` se conserva (no estorba y cubre el teclado), y el texto de "es un valor literal"
  (`:229-232`) también: sigue siendo verdad (CA-06.4).

---

## 6. Área F — Retirada del arrastrar y soltar (HU-07)

Se borra `canvas/useVariableDrop.ts` (133 líneas) y `useVariableDrop.test.ts` (7 tests), y se
desconectan sus cuatro destinos: `InterpolableField.tsx` (`mode: "token"`),
`ConditionConfigFields.tsx` (`"path"`), `TransformConfigFields.tsx` (origen del mapeo y textarea de
código, `"path"`/`"code"`). En cada uno desaparecen `dropProps`, el anillo `VARIABLE_DROP_RING`
y el `<span className="sr-only">` del `aria-describedby`.

En `VariablesPanel.tsx`: la fila deja de ser `draggable` (`:146`), se van `onDragStart` y el
`title` de "arrastra…", y el párrafo de ayuda (`:132-137`) pasa de explicar el arrastre a explicar
**qué forma espera cada destino** (CA-07.4) — la información útil que el arrastre encapsulaba.

Se revisa si `insertTextAt` (`insertToken.ts`) queda sin consumidores al irse el drop; si es así,
se borra con su test. `insertTokenAt` se queda: lo usa el picker.

**Va al final a propósito** (R3): HU-05 y HU-06 tienen que estar en pie antes de quitar el
arrastre, o durante unas horas el editor tiene menos formas de poner una variable que antes.

---

## 7. Accesibilidad

- Pestaña del depurador: `aria-expanded`, `aria-label` explícito, objetivo ≥ 32px — calcado de la
  de Variables, que ya cumple.
- `VariableMenu`: navegable por teclado en sus dos niveles (Radix lo da), cada fila anuncia campo
  + tipo + ejemplo, y el submenú anuncia qué aplica.
- Botones de historial en vertical: se conservan `aria-disabled` y el `title` con la operación.
- Selector de valor de la condición: `aria-label` que lo distinga del input ("Elegir un valor
  visto en la muestra").
- Al retirar el drop desaparecen cuatro `aria-describedby`; verificar que ningún campo queda
  apuntando a un id que ya no existe.
- Secciones del panel de Variables con encabezado real, no solo un cambio de color.

## 8. Verificación (por fase)

- `tsc --noEmit` limpio · Vitest completo verde · `vite build` OK · lint sin errores nuevos
  (3 preexistentes conocidos en `ai/gemini/agent.ts`, `ai/modelSelector.test.ts`,
  `hooks/useBreakpoint.ts` — no se tocan).
- **Cuenta de tests:** baseline **771**. La Fase F **resta 7** (los de `useVariableDrop`) más los
  de `insertTextAt` si queda huérfano. El total final no se fija de antemano; lo que no se negocia
  es que ningún test existente quede rojo sin una razón escrita.
- **Tests nuevos (unidad, sin DOM):**
  - `eventRecord`: añade los campos de la tarea y del proyecto; **el evento gana en la colisión**;
    entidad inexistente → sin esos campos y sin excepción; `assigneeName` ausente si no hay
    persona; los once tipos de evento producen registro.
  - `eventRecord` + `resolvePath`: `resolvePath(record, "task.title")` resuelve por clave literal
    (fija la decisión de §B3 — si alguien pasa a objetos anidados, este test lo delata).
  - `stageVariables`: sin mapeo `after === before`; con mapeo `after` son los targets con el
    ejemplo del source; `transformCode` → `afterIsPartial`.
  - `validateFlow`: un token que apunta a un campo **pre**-mapeo con mapeo configurado ahora
    avisa; un token que apunta a un `target` **deja** de avisar (los dos sentidos del defecto).
  - `EVENT_FIELD_EXAMPLES`: cubre los once eventos e incluye los campos enriquecidos (que la tabla
    de ejemplos no se quede corta respecto de `eventRecord` es lo que hace visible HU-03).
  - Picker de condición: `onPick` con operador devuelve `{field, op}` y **nunca** un string con
    `{{`; picker de acción: devuelve `{{campo|mod}}` bien formado.
  - Valor de condición: pre-rellena si está vacío, **no** pisa un valor escrito; con `in` añade.
- **Smoke visual del usuario** (no hay Playwright en el repo): ver §9.

## 9. Guion de smoke (resumen)

1. **Controles:** deshacer/rehacer en columna, sin escalón; los dos grupos siguen distinguibles;
   deshabilitados cuando corresponde.
2. **Depurador:** plegar → el canvas se ensancha; desplegar → la traza sigue ahí. La pestaña se ve
   y se comporta como la de Variables. Simular, plegar, desplegar: la proyección sobre los nodos
   no se altera.
3. **Datos del evento:** flujo con trigger "Al cambiar el estado de una tarea" → el panel de
   Variables lista `task.title`, `task.status`, `project.name`… con ejemplos. Poner
   `{{task.title}}` en un webhook y usar "Probar webhook" → llega el título, no el uuid. Una
   condición `task.status == done` se cumple. Borrar la tarea y ejecutar → no rompe.
4. **Transformar:** mapear `dealname → title`. En una acción, el picker ofrece `title` y **ya no**
   `dealname`. Un token `{{dealname}}` que antes estaba callado ahora avisa, diciendo que el mapeo
   renombró el campo. La condición sigue ofreciendo `dealname` (pre-mapeo). El panel muestra las
   dos etapas. Con código en el Transformar, la lista se declara incompleta.
5. **Picker:** en una acción y en una condición, la misma lista con el mismo aspecto. En la acción,
   variable → formato → se inserta `{{campo|date}}`. En la condición, variable → operador → se
   setean campo y operador, y el `<select>` de abajo muestra el mismo operador. En ninguna de las
   dos aparece ya "escribir campo…", y escribir a mano en el input sigue funcionando.
6. **Valor de la condición:** elegir el campo con el valor vacío lo pre-rellena; con el valor ya
   escrito **no** lo pisa. El selector lista los valores reales del campo. Con `in`, elegir añade
   a la lista.
7. **Sin arrastre:** las filas del panel ya no se arrastran; copiar el token sigue funcionando y
   el texto explica qué forma espera cada destino. Ningún campo del editor muestra el anillo de
   drop ni deja un `aria-describedby` colgando.
