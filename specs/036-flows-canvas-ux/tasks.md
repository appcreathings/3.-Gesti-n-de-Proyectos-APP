# Tasks 036 — Canvas de Flujos: interacción + variables

> Numeración T3600+. Fases verticales; cada fase deja la app usable y se verifica
> (`tsc --noEmit` + Vitest + `vite build`). Sin cambio de schema/migración.
> `∥` = paralelizable. Ancla cada tarea a `design.md`.

## Fase 0 — Fundaciones compartidas (sin UI visible)
Extraer helpers reusables antes de tocar UI, con tests de unidad.

- **T3600** `sampleFields(sample)` extraído de `SampleExplorer` a `canvas/useSampleFields.ts`
  (o función pura); `SampleExplorer` lo consume sin cambio de comportamiento. (design §C1)
- **T3601** `insertTokenAt(value, field, el, mod?)` en un helper compartido; `VariablePicker`
  refactor para usarlo (sin cambio de comportamiento). (design §C3)
- **T3602** `nodeUsedVariables(data): string[]` en `variables.ts` + walker de strings del
  output. (design §C5)
- **T3603** `sortNodesByColumnAndY(nodes)` en `graph.ts`. (design §B)
- **T3604** Tests Vitest: `nodeUsedVariables` (condición/transform/action, con/sin tokens,
  tokens en mapping+code), `sortNodesByColumnAndY`, `insertTokenAt`, `sampleFields`.
- **Checkpoint 0:** `tsc` + Vitest verdes. Sin cambio visible en la app.

## Fase A — Maximizar + controles de zoom (HU-01, HU-02) ∥ con B
- **T3610** `canvas/CanvasControls.tsx`: cluster con Acercar/Alejar/Ajustar vía `useReactFlow`,
  estilado con `Button` + tokens; `title`/`aria-label`. (design §A2)
- **T3611** `FlowCanvas`: retirar `<Controls>`, montar `CanvasControls`; conservar
  `<Background>`. (design §A2)
- **T3612** Estado `maximized` + clases condicionales `fixed inset-0 z-50 …` en el wrapper;
  botón Maximizar/Restaurar en `CanvasControls`. (design §A1)
- **T3613** `Esc` sale de maximizado (listener con guard `maximized`); `fitView` en efecto
  dependiente de `maximized` (`requestAnimationFrame`). (design §A1)
- **T3614** Verificar conservación de selección/drawer/grafo al alternar (CA-01.5).
- **Checkpoint A:** smoke — maximizar/restaurar/`Esc`, zoom en claro y oscuro, contraste AA.

## Fase B — Interacción de nodos (HU-03) ∥ con A
- **T3620** `deletable: false` en nodos trigger/transform al construir el grafo
  (`buildGraphFromRule` + inserciones); confirmar que persiste bien en `flow.graph`. (design §B)
- **T3621** `ReactFlow`: `deleteKeyCode`, `onNodesDelete` filtrando fijos (defensa extra),
  selección múltiple (`selectionOnDrag`/`multiSelectionKeyCode`). (design §B)
- **T3622** Estilo de selección en `NodeShell` (`selected` → `ring-2 ring-primary`) + hover
  reforzado; resaltar aristas de la selección. (design §B)
- **T3623** `onNodeDragStop` → reordenar array por `sortNodesByColumnAndY` para que "más
  arriba = antes" sea el orden lógico. Verificar que `compileGraphToRule` produce el orden
  esperado. (design §B)
- **T3624** *(opcional)* `canvas/InsertEdge.tsx` con botón "＋" en aristas (`EdgeLabelRenderer`)
  + menú Condición/Acción; registrar en `edgeTypes`; insertar con `newConditionNode`/
  `newActionNode` + `relinkEdges`. Si se difiere, los botones existentes cubren la capacidad.
  (design §B, CA-03.4)
- **Checkpoint B:** smoke — borrar acción/condición con `Supr`; trigger/transform NO se
  borran; reordenar refleja orden de ejecución; (si T3624) insertar en arista.

## Fase C — Variables de primera clase (HU-04, HU-05, HU-06)
Depende de Fase 0. Es el grueso del valor.

- **T3630** `canvas/VariablesPanel.tsx`: overlay colapsable derecho dentro del canvas; usa
  `sampleFields`/`deriveAvailableVariables`; filas con tipo/ejemplo/presencia + copiar token;
  encabezado de origen; estado vacío con CTA que abre el drawer del Trigger. (design §C2)
- **T3631** Montar `VariablesPanel` en `CanvasInner` (recibe `triggerData`/`triggerSample`);
  toggle de colapso con estado en `CanvasInner` (opcional `localStorage`). (design §C2)
- **T3632** Drag-to-field: filas `draggable` en el panel (`dataTransfer`
  `application/x-hito-variable`); `InterpolableField` con `onDragOver`/`onDrop` → `insertTokenAt`.
  (design §C3, CA-05.1)
- **T3633** Input libre en `VariablePicker` (footer con `<Input>` + insertar `{{loEscrito}}`;
  `stopPropagation` de teclado). (design §C4, punto 5)
- **T3634** Chips en `NodeShell`: fila opcional con `nodeUsedVariables`; huérfanos en color
  `warning` (comparar con set de campos disponibles vía context nuevo `VariablesContext`);
  límite ~4 + "＋N". (design §C5, HU-06)
- **T3635** Proveer `availableFields`/`Set` a los nodos vía context (sin engordar `data`
  persistida). (design §C5)
- **Checkpoint C:** smoke — panel con y sin muestra; copiar y arrastrar variable a un campo;
  input libre inserta; chips correctos incl. huérfano; vista previa/hint siguen andando.

## Fase D — Nodo Transformar (HU-07) ∥ con C
- **T3640** Link a docs de JavaScript (MDN, `es`, `target="_blank"`) junto al editor de
  código en `TransformConfigFields`. (design §D, CA-07.1)
- **T3641** Bloque plegable "Ejemplos" con 3–4 snippets copiables/"usar" que insertan a
  `transformCode`. (design §D, CA-07.2)
- **T3642** Reforzar contrato `record`/`return` (mini-esquema visual) y separar visualmente
  "Mapeo" (no-código) de "Código" (avanzado). (design §D, CA-07.4)
- **Checkpoint D:** smoke — link abre; snippets insertan; "Probar"/"Generar con IA" intactos.

## Fase E — Cierre
- **T3650** Repaso de accesibilidad (aria/foco/contraste AA claro-oscuro) de todo lo nuevo.
- **T3651** Verificación final: `tsc --noEmit` limpio, Vitest completo verde (baseline +
  tests de T3604), `vite build` OK, lint sin errores nuevos.
- **T3652** Guion de smoke visual para el usuario (checklist §6 de design.md) — no hay
  Playwright en el repo.

## Secuencia sugerida
`Fase 0` → (`A` ∥ `B`) → `C` → `D` → `E`. C es el mayor valor; si hay que recortar, T3624
(insertar en arista) y el `localStorage` del panel son los primeros candidatos a diferir.

## Invariantes (no violar)
- Sin conexiones manuales / ramificación (`nodesConnectable` sigue `false`; aristas derivadas
  por `relinkEdges`).
- Sin tocar `engine.ts`, `compileGraphToRule` ni el schema `FlowRule`/`graph`. Sin
  `schemaVersion` nuevo.
- El grafo se sigue persistiendo en `flow.graph` (posiciones + `deletable`), compatible hacia
  atrás con flujos ya guardados.
