# Tasks — Drag & Drop para reordenar (003)

Tareas numeradas por fase. `[P]` = paralelizable dentro de la fase. Cada fase deja la app usable de
punta a punta (Principio V) y termina con `npm run typecheck` + `npm run test` + smoke visual
manual confirmado antes de avanzar.

## Fase 1 — Fundaciones ✅
- [x] T301 Instalado `@dnd-kit/sortable@10.0.0`.
- [x] T302 `src/components/dnd/SortableItem.tsx`: wrapper de `useSortable` (children-function con
  `{ setNodeRef, style, attributes, listeners, isDragging }`).

## Fase 2 — Listas locales de diálogo ✅
- [x] T310 [P] `ProcessEditorDialog`: el `GripVertical` decorativo (línea 134) pasa a ser el handle
  real de `SortableItem`; `onDragEnd` local llama `setSteps(arrayMove(steps, oldIndex, newIndex))`.
- [x] T311 [P] `ChecklistTemplateDialog`: handle de arrastre en cada `TemplateItem`; mismo patrón
  `arrayMove` sobre `setItems`.
- [x] T312 [P] `ProcessTemplateDialog`: handle de arrastre en cada paso; mismo patrón sobre
  `setSteps`.

  Verificado: `tsc --noEmit` limpio, 56/56 tests Vitest, `vite build` OK (~66 kB gzip bundle
  principal, sin cambio). Pendiente smoke visual en navegador.

## Fase 3 — Listas respaldadas por el store ✅
- [x] T320 `projectOps.reorderChecklistItems(p, areaId, checklistId, orderedIds)` + tests en
  `projectOps.test.ts` (nuevo archivo: reorden correcto, ids inexistentes ignorados, inmutabilidad
  del `Project` de entrada). Implementado sobre helper genérico `reorderByIds` (reordena el
  subconjunto en sus mismas posiciones del array).
- [x] T321 `projectOps.reorderAreas(p, orderedIds)` + tests (mismos casos que T320).
- [x] T322 `ChecklistSection`: handle de arrastre en cada `<li>`; conecta a
  `reorderChecklistItems` vía nueva prop `onReorderItems` cableada en `AreaCard`.
- [x] T323 `AreasTab`/`AreaCard`: handle de arrastre en el header de `AreaCard` (prop
  `dragHandle`); conecta a `reorderAreas` vía `mutate`.

  Verificado: `tsc --noEmit` limpio, 64/64 tests. Pendiente smoke visual en navegador.

## Fase 4 — Kanban intra-columna ✅
- [x] T330 `projectOps.reorderTasks(p, orderedIds)` + tests (incluye caso con filtro de área activo:
  las tareas fuera del subconjunto reordenado no cambian de posición relativa).
- [x] T331 `KanbanColumn`: además de `useDroppable`, envuelve sus tarjetas en `SortableContext`
  (`verticalListSortingStrategy`) con los ids de las tareas visibles de esa columna (prop `taskIds`).
- [x] T332 `TaskCard`: `useDraggable` → `useSortable` (mismo handle `GripVertical`; añade
  `transition` al style).
- [x] T333 `TasksTab.onDragEnd`: distingue soltar sobre tarjeta de la misma columna (reorder vía
  T330), sobre tarjeta de otra columna (cambia `status` + inserta en esa posición) y sobre área
  vacía de otra columna (cambia `status` al final — comportamiento actual, sin regresión).
  `collisionDetection` pasa a `closestCorners`.

  Verificado: `tsc --noEmit` limpio, 64/64 tests. Pendiente smoke visual: (a) cambiar status
  arrastrando entre columnas, (b) reorder dentro de la misma columna, (c) reorder con `?area=`
  activo no descoloca tareas fuera del filtro.

## Explícitamente fuera de este tasks.md
- Reordenar columnas del Kanban (estados fijos).
- Arrastrar ítems entre listas distintas (checklist→checklist, proceso→proceso).
- Evento de Actividad para reorder (queda silencioso — ver `spec.md`, Fuera de alcance).
- Reordenar Productos, Tipos de Proyecto o Personas.

## Verificación por fase
Tras cada fase: `npm run typecheck`, `npm run test`, smoke visual manual en dev server de las
listas tocadas. No se avanza con typecheck o tests rotos, ni sin confirmación visual del usuario.
