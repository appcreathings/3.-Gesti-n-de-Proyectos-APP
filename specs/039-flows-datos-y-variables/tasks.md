# Tasks 039 — Datos legibles y una sola forma de elegir variables

> Numeración T3900+. Fases verticales; cada fase deja la app usable y se verifica
> (`tsc --noEmit` + Vitest + `vite build` + lint). Sin cambio de schema/migración.
> `∥` = paralelizable. Cada tarea ancla a `design.md`.
> Baseline al empezar: **771 tests en 73 archivos** (post spec 038).

## Fase A — Espacio en pantalla (HU-01, HU-02) · ∥ con B
Independiente de todo lo demás y de riesgo casi nulo: primero, para despejar la pantalla donde se
va a verificar el resto.

- **T3900** `CanvasControls`: el cluster de historial pasa a `flex-col`, mismo ancho que el de
  encuadre, `border-t` entre botones; se conservan los dos grupos separados por el `gap` del
  `Panel`. (design §A1, CA-01.1–CA-01.3)
- **T3901** `DebuggerPanel` acepta `collapsed` + `onToggle` y renderiza la pestaña vertical
  **calcada de `VariablesPanel.tsx:61-79`**; su estado interno no se toca. (design §A2, CA-02.1)
- **T3902** `FlowBuilderPage`: estado `debuggerCollapsed` (sesión) y rejilla
  `lg:grid-cols-[2fr_1fr]` ↔ `lg:grid-cols-[1fr_auto]`. **No** se dispara `fitView` al plegar
  (R5, decisión explícita). (CA-02.2, CA-02.4, CA-02.5)
- **Checkpoint A:** smoke — sin escalón en los controles; plegar/desplegar conserva la traza del
  depurador y no altera la proyección de la simulación sobre los nodos.

## Fase B — El registro del evento (HU-03) · **DEFECTO** ∥ con A
El bloque de más valor: es lo que hace que exista el dato que todo lo demás quiere mostrar.

- **T3910** `flows/event-record.ts`: `eventRecord(event, deps)` puro, aditivo, con **claves planas
  punteadas** y la regla de colisión `{ ...enrichment, ...event }` (el evento gana).
  (design §B2–§B4, CA-03.1, CA-03.2, CA-03.5)
- **T3911** Cablearlo en `resolveTriggerData` (`engine.ts:521-526`), con índices `Map` construidos
  una vez por corrida — no una búsqueda lineal por evento. (R6)
- **T3912** `EVENT_FIELD_EXAMPLES` (`variables.ts:21-33`) gana los campos enriquecidos con valores
  de ejemplo, para los once eventos. Sin esto los campos existen en ejecución pero son invisibles
  en el editor. (CA-03.3)
- **T3913** `dry-run.ts`: sembrar el evento sintético desde una **entidad real** cuando la haya,
  reusando `EVENT_SEED_REQUIREMENTS` + `buildSyntheticEvent`; si no hay ninguna, el sintético de
  ejemplos de hoy. (design §B5, CA-03.6)
- **T3914** Nota en el drawer del webhook: sin payload explícito se envía el registro completo, y
  qué incluye ahora. (CA-03.7, R1)
- **T3915** Tests: los de `eventRecord` y el de `resolvePath` con clave literal (§8 de
  `design.md`) — este último es el que fija la decisión de claves planas.
- **Checkpoint B:** smoke — `{{task.title}}` llega con el título real a "Probar webhook";
  una condición sobre `task.status` se cumple; borrar la tarea antes de ejecutar no rompe nada;
  **ningún flujo guardado cambia de comportamiento** (los ids siguen valiendo lo mismo).

## Fase C — Variables por etapa (HU-04) · **DEFECTO**
Depende de B solo para el smoke (los campos nuevos hacen la demo más clara); el código es
independiente.

- **T3920** `stageVariables(base, mapping, transformCode)` en `canvas/variables.ts`: `before` /
  `after` / `afterIsPartial`, con el `example` del `source` heredado por el `target`.
  (design §C2, CA-04.1, CA-04.2, CA-04.6)
- **T3921** `FlowCanvas` la calcula una vez y reparte: `before` a condiciones y al origen del
  mapeo, `after` a las acciones. (design §C3, CA-04.3)
- **T3922** `VariablesPanel`: dos secciones etiquetadas ("Del trigger" / "Después de Transformar")
  y el aviso de lista incompleta con `transformCode`. (CA-04.4)
- **T3923** `validateFlow`: los tokens de los outputs se validan contra la lista **post-mapeo**, y
  el mensaje **nombra la causa** (el Transformar renombró los campos). (CA-04.5, R2)
- **T3924** Tests de `stageVariables` y de los **dos sentidos** del defecto de `validateFlow`.
- **Checkpoint C:** smoke — con `dealname → title` mapeado, la acción ofrece `title` y no
  `dealname`; el token viejo pasa a avisar con el motivo; la condición sigue viendo `dealname`.

## Fase D — Un picker, dos inserciones (HU-05)
Después de C: el picker homologado ya muestra la lista correcta por etapa.

- **T3930** `canvas/VariableMenu.tsx`: carcasa de dos niveles sobre `VariableRow`, con
  `options(row)` y `onPick(field, option?)`. **No construye texto** — no sabe qué es un `{{}}`.
  (design §D1, R4)
- **T3931** `VariablePicker` (acciones) pasa a usarla, con `FORMAT_OPTIONS` como submenú; sigue
  insertando con `insertTokenAt`. (CA-05.2, CA-05.3)
- **T3932** `ConditionFieldPicker` pasa a usarla, con los **operadores** como submenú; al elegir
  setea `{field, op}` en una sola llamada al mismo `onChange` que el `<select>`. (CA-05.2,
  CA-05.5)
- **T3933** **Borrar** el bloque "escribir campo…" de los dos pickers
  (`VariablePicker.tsx:119-158`, `ConditionConfigFields.tsx:318-351`). (CA-05.4)
- **T3934** Unificar las filas hacia `VariableRow` en las dos superficies. (CA-05.1)
- **T3935** Tests: el picker de condición **nunca** devuelve un string con `{{`; el de acción
  devuelve `{{campo|mod}}` bien formado. (R4)
- **Checkpoint D:** smoke — misma lista y mismo gesto en condición y acción; el operador elegido
  en el submenú coincide con el del `<select>`; escribir a mano en el input sigue funcionando.

## Fase E — El valor de la condición (HU-06)

- **T3940** Selector de valor junto al input, con los valores reales del campo (los de
  `valueOptions`, ya calculados) o el `example` del trigger. Con `in`, **añade** a la lista.
  (design §E, CA-06.1, CA-06.3)
- **T3941** Pre-rellenar al elegir campo **solo si el valor está vacío**, en el `onChange` del
  picker — **no** en un `useEffect` (se dispararía al cargar el flujo y al deshacer). (CA-06.2)
- **T3942** Tests: pre-rellena vacío, no pisa lo escrito, `in` añade.
- **Checkpoint E:** smoke — elegir campo con valor vacío lo rellena; con valor escrito no lo toca;
  el valor sigue siendo literal (no acepta tokens).

## Fase F — Retirada del arrastrar y soltar (HU-07)
**Al final a propósito** (R3): el reemplazo (D y E) tiene que estar en pie antes de quitar esto.

- **T3950** Borrar `canvas/useVariableDrop.ts` y `useVariableDrop.test.ts`; desconectar los cuatro
  destinos (`InterpolableField`, `ConditionConfigFields`, `TransformConfigFields` ×2): fuera
  `dropProps`, `VARIABLE_DROP_RING` y los `<span className="sr-only">`. (design §F, CA-07.1,
  CA-07.3)
- **T3951** `VariablesPanel`: filas no arrastrables; el párrafo de ayuda pasa a explicar **qué
  forma espera cada destino** (token / nombre / `record.campo`). Se conserva copiar token y toda
  la info de la fila. (CA-07.2, CA-07.4)
- **T3952** Barrer lo que quede huérfano: `insertTextAt` y su test si ya no tiene consumidores.
- **T3953** Verificar que ningún campo quedó con un `aria-describedby` apuntando a un id borrado.
  (design §7)
- **Checkpoint F:** smoke — nada se arrastra, nada muestra anillo de drop, copiar token funciona.

## Fase G — Cierre

- **T3960** Repaso de accesibilidad de todo lo nuevo (pestaña del depurador, menú de dos niveles,
  selector de valor, secciones del panel): foco, rótulos, contraste AA, información no solo por
  color. (design §7)
- **T3961** Verificación final: `tsc --noEmit`, Vitest completo, `vite build`, lint sin errores
  nuevos. Dejar escrito el delta de la cuenta de tests y por qué (Fase F resta 7).
- **T3962** Guion de smoke visual para el usuario (§9 de `design.md`).

## Secuencia sugerida

`(A ∥ B)` → `C` → `D` → `E` → `F` → `G`.

A es cosmética y despeja la pantalla donde se verifica el resto. B crea el dato que C, D y E
muestran, y es la única que toca el motor. C corrige un defecto que hoy hace interpolar a vacío en
silencio. F va última porque **quita** una función publicada y su reemplazo tiene que existir
antes.

Si hay que recortar, los candidatos a diferir son **T3914** (nota del webhook, informativa) y
**T3922** (las dos secciones del panel: se puede entregar C mostrando solo la lista que aplica a
cada drawer) — pero **no** T3923, que es lo que evita que un token siga interpolando a vacío sin
avisar.

## Invariantes (no violar)

- **`applyMapping` no se toca** (invariante de 037, reafirmado en 038). HU-04 **explica** lo que
  el mapeo hace; no cambia lo que hace.
- **El enriquecimiento es aditivo.** `{ ...enrichment, ...event }`, nunca al revés: ningún campo
  calculado puede pisar `type`/`projectId`/`taskId`/`from`/`to`. Un flujo guardado no puede
  cambiar de comportamiento por esta spec.
- **Claves planas punteadas**, no objetos anidados — `resolvePath` prueba la clave literal primero
  y `sampleFields` solo recorre el nivel superior (design §B3). Cambiarlo obliga a tocar la lista
  de variables, el picker y la validación a la vez.
- **La carcasa del picker no construye texto.** Quien decide entre `{{campo}}` y el path crudo es
  cada llamador; si la carcasa aprende a poner llaves, vuelve el bug de 037.
- **El valor de una condición es literal**: no se interpola ni acepta tokens (invariante de 037).
- **Pipeline lineal y auto-conectado**: `nodesConnectable={false}`, aristas por `relinkEdges`, sin
  ramificación. Invariante heredado de 036.
- **Sin `schemaVersion` nuevo ni migración.** El enriquecimiento es de ejecución, las listas son
  derivadas, el plegado es de sesión.
- **El `DebuggerPanel` no se rediseña** (invariante de 036/038): se pliega, no se toca por dentro.
