# Tasks 038 — Editor de Flujos: verdad, confianza y simulación visible

> Numeración T3800+. Fases verticales; cada fase deja la app usable y se verifica
> (`tsc --noEmit` + Vitest + `vite build` + lint). Sin cambio de schema/migración.
> `∥` = paralelizable. Cada tarea ancla a `design.md`.
> Baseline al empezar: **713 tests en 69 archivos** (post spec 037).

## Fase 0 — Helpers puros y el contrato del motor (sin UI visible)

- **T3800** `flows/node-issues.ts`: `nodeIssueMap(nodes, issues)` → `Map<nodeId, NodeIssues>`,
  repartiendo por clase e índice; `nodeKind: "flow"` no cuelga de ningún nodo. (design §A2)
- **T3801** `providerLabel` en `domain/labels` como `Record` completo sobre
  `PollTrigger["provider"]` (los tres proveedores). (design §B1)
- **T3802** `formatConditionValue(value)` puro: array → `[a, b]`, string → entrecomillado,
  resto → `String()`. (design §B2)
- **T3803** **Fijar el contrato posicional del motor (R2)** con un test dedicado sobre
  `runFlowEngine`: `conditions[i]` ↔ i-ésima condición; `outputs[i]` ↔ i-ésimo output incluidos
  los `skipped` de la política "detener"; condiciones que no pasan → `outputs: []`.
  **`engine.ts` no se modifica** — es un test sobre comportamiento existente. (design §D1)
- **T3804** `flows/trace-projection.ts`: `projectTrace(nodes, record)` → `Map<nodeId,
  NodeRunStatus>`, con `"not-reached"` sintetizado cuando la traza no llegó a los outputs.
  (design §D2)
- **T3805** `graph.ts`: `duplicateNode(nodes, id)` — id nuevo, `data` clonado, `y` posterior;
  rechaza trigger/transform. (design §E3)
- **T3806** Tests de todo lo anterior (§7 de `design.md`).
- **Checkpoint 0:** `tsc` + Vitest verdes, incluido T3803 (que debe pasar **sin tocar el
  motor** — si no pasa, el contrato no se cumple y hay que revisar §D1 antes de seguir).
  Sin cambio visible en la app.

## Fase A — El canvas dice la verdad (HU-01) · **DEFECTO** ∥ con B
La corrección de mayor valor por esfuerzo: **borra** lógica en vez de añadirla.

- **T3810** Pasar `issues` de `FlowBuilderPage` a `FlowCanvas` por prop (ya calculados en
  `FlowBuilderPage.tsx:147`; el canvas no debe conocer `projects`). (design §A3)
- **T3811** Contexto `CanvasNodeIssues` en `nodeTypes.tsx`, poblado con `nodeIssueMap` — mismo
  idioma que `CanvasVariables`, fuera de `node.data` (que se persiste). (design §A3)
- **T3812** `NodeShell`: insignia de issues en la esquina, con contador, severidad y mensajes en
  el `title`; `aria-label` que no dependa del color. (CA-01.1, CA-01.2)
- **T3813** **Eliminar** los tres criterios locales: `nodeTypes.tsx:159` (trigger),
  `nodeTypes.tsx:186` (condición) y la ausencia de criterio en `ActionNode`. El estado del nodo
  pasa a derivarse solo de `validateFlow`. (CA-01.3, CA-01.6)
- **Checkpoint A:** smoke — webhook sin URL, email sin conexión y proyecto destino borrado
  marcan los nodos; arreglar uno lo apaga en vivo; un flujo sin acciones sigue avisando solo en
  el banner.

## Fase B — Etiquetas honestas (HU-06) · **DEFECTOS** ∥ con A

- **T3820** Adoptar `providerLabel` en `triggerSummary` (`meta.ts:83` — el inbox que hoy dice
  "Google Sheets"), en `validateFlow` (`validation.ts:104-110`, que tenía la tabla buena) y en
  el origen del `VariablesPanel` (`VariablesPanel.tsx:50`). (CA-06.1, CA-06.3)
- **T3821** Adoptar `formatConditionValue` en `conditionSummary` (`meta.ts:91`), para que un
  `in` con array no se vea igual que el string legacy que nunca se cumple. (CA-06.2)
- **Checkpoint B:** smoke — flujo con trigger de inbox etiquetado correctamente en nodo y panel;
  condición `in` con dos valores resumida como lista.

## Fase C — Deshacer (HU-02)
Depende de nada, pero conviene después de A/B para no mezclar diagnósticos en el smoke.

- **T3830** `canvas/useGraphHistory.ts`: `commit(label, coalesceKey?)` / `undo` / `redo` /
  `canUndo` / `canRedo` / `undoLabel`; `commit` guarda el estado **previo**; tope 50; rehacer se
  limpia al editar. (design §C3, CA-02.8)
- **T3831** Cablear los puntos de commit: añadir, insertar desde arista, borrar (botón y
  `Supr`), editar en el drawer (con `coalesceKey = nodeId`) y `onNodeDragStop`.
  **`onNodesChange` no se toca** — el arrastre y la selección siguen fuera del historial.
  (design §C1, §C2, CA-02.3, CA-02.4)
- **T3832** Atajos `Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+Y` en el listener de ventana existente, con
  la guarda de foco editable (`input, textarea, select, [contenteditable=true]`). (CA-02.5)
- **T3833** Botones deshacer/rehacer en `CanvasControls`, con `disabled` y la operación concreta
  en el `title`. (CA-02.2)
- **T3834** Verificar los dos comportamientos que salen gratis del diseño existente, sin añadir
  código: el drawer se cierra si su nodo desaparece (CA-02.7) y deshacer hasta el estado
  guardado apaga `isDirty` (CA-02.6). Si alguno no se cumple, es un hallazgo, no una tarea de
  implementación silenciosa.
- **T3835** Nota visible de que el deshacer cubre el canvas y no los metadatos del flujo.
  (CA-02.9)
- **Checkpoint C:** smoke — borrar y recuperar un nodo configurado; un título largo se deshace
  de una; `Ctrl+Z` dentro de un input deshace texto, no nodos; el aviso de cambios sin guardar
  se apaga al volver al estado guardado.

## Fase D — La simulación sobre los nodos (HU-04)
Depende de T3803 y T3804. Es el bloque con más superficie.

- **T3840** Elevar `dryTrace` de `DebuggerPanel` a `FlowBuilderPage` (`onDryRunResult`),
  guardando también `atSignature = comparableFlow(currentFlow)` al simular. **La vista textual
  del panel no cambia.** (design §D3, CA-04.8)
- **T3841** Pasar la proyección al canvas y publicarla por contexto, junto a la de issues.
- **T3842** Franja de estado al pie del nodo: condición (`se cumple` / `no se cumple` + valor
  real), acción (`se ejecutaría` / `omitida` / `error` / `no alcanzada` + `plan`), transform
  (error de código). Verbo en texto, no solo color. (CA-04.1–CA-04.4)
- **T3843** Barra de simulación en el canvas: selector de registro, aviso de **desactualizada**
  cuando `atSignature` deja de coincidir, y botón **Limpiar**. (CA-04.5, CA-04.6, CA-04.7)
- **T3844** Confirmar la separación visual con la insignia de configuración (R3): esquina vs.
  franja, permanente vs. mientras haya proyección. (CA-01.5)
- **Checkpoint D:** smoke — simular con una condición que corta y ver las acciones como "no
  alcanzada"; cambiar de registro; editar un nodo y ver la proyección marcada desactualizada;
  limpiar y comprobar que el `DebuggerPanel` sigue igual que hoy.

## Fase E — Legibilidad y duplicar (HU-03, HU-05)

- **T3850** Numeración de condiciones y acciones derivada del **mismo** recorrido ordenado que
  alimenta issues y proyección — así los tres no pueden desincronizarse. (design §E1, CA-05.1)
- **T3851** Transform vacío en estado secundario (punteado + "opcional"); sigue fijo y no
  borrable. (CA-05.2)
- **T3852** Duplicar nodo: botón en condición/acción + `Ctrl+D`; es punto de commit del
  historial. (design §E3, CA-03.1–CA-03.4)
- **T3853** `ShortcutsDialog` desde un botón `?` en `CanvasControls`, incluyendo `Ctrl+S` (hoy
  solo en un `title`). (design §E4, CA-05.3)
- **Checkpoint E:** smoke — numeración correcta tras arrastrar y soltar; duplicar y deshacer;
  el diálogo de atajos lista todo lo que el canvas realmente acepta.

## Fase F — Cierre

- **T3860** Repaso de accesibilidad de todo lo nuevo (insignias, franjas, botones de historial,
  diálogo de atajos): foco, rótulos, contraste AA, información no solo por color. (design §6)
- **T3861** Verificación final: `tsc --noEmit`, Vitest completo (baseline 713 + los nuevos),
  `vite build`, lint sin errores nuevos.
- **T3862** Guion de smoke visual para el usuario (§8 de `design.md`).

## Secuencia sugerida

`Fase 0` → (`A` ∥ `B`) → `C` → `D` → `E` → `F`.

A y B son las de mejor relación valor/esfuerzo y **borran** código duplicado; A además hace que
toda regla futura de `validateFlow` aparezca en el canvas gratis. C es autocontenida. D es la
más grande y la única que depende de un contrato del motor (fijado en T3803).

Si hay que recortar, los candidatos a diferir son **T3851** (transform secundario, puramente
estético) y **T3843** parcialmente (se puede entregar la proyección sin el selector de registro,
proyectando siempre el primero — pero **no** sin el aviso de desactualizada, que es lo que evita
que la proyección mienta).

## Invariantes (no violar)

- **`applyMapping` no se toca** (invariante fijado en 037): el mapeo se explica, no se cambia.
- **Pipeline lineal y auto-conectado**: `nodesConnectable` sigue `false`, aristas derivadas por
  `relinkEdges`, sin ramificación ni guardas por salida (033 §B2 sigue en backlog).
  Invariante heredado de 036.
- **`engine.ts` no se modifica.** T3803 escribe un test *sobre* el motor; si para que pase
  hiciera falta cambiar el motor, el contrato de §D1 no se cumple y hay que replantear la
  proyección, no el motor.
- **Sin `schemaVersion` nuevo ni migración.** Nada de esta spec se persiste: historial, issues
  y proyección son estado de sesión o derivado.
- **El `DebuggerPanel` y el `VariablesPanel` no se rediseñan** (invariante heredado de 036).
  De D solo cambia de quién es el estado de la traza.
- **La validez de un nodo tiene una sola fuente**: `validateFlow`. Terminada la Fase A, ningún
  componente del canvas puede volver a decidir por su cuenta si un nodo está mal.
