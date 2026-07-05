# Plan Técnico — Drag & Drop para reordenar listas

- **Feature:** 003-drag-and-drop-reordenar
- **Constitución:** alineado con IV (diseño limpio) y V (simplicidad). Sin violaciones — no toca
  esquema de datos (II) ni storage (I/VI): el orden ya vive en la posición del array.

## Alcance técnico

Una dependencia nueva: `@dnd-kit/sortable` (mismo major que `@dnd-kit/core@6.3.1` y
`@dnd-kit/utilities`, ya adoptados en el Kanban). Se reutiliza `arrayMove` que exporta
`@dnd-kit/sortable` en vez de escribir una función propia de mover-posición.

## Componentes a crear / extender

| Componente | Acción | Ubicación propuesta | Reemplaza |
|---|---|---|---|
| `SortableItem` | Crear | `src/components/dnd/SortableItem.tsx` | boilerplate repetido de `useSortable`/`CSS.Transform` en cada lista |
| `ChecklistSection` | Extender | ya existe | `<li>` sin handle → `<li>` arrastrable |
| `ProcessEditorDialog` | Extender | ya existe | `GripVertical` decorativo (línea 134) → handle real |
| `AreasTab`/`AreaCard` | Extender | ya existen | orden fijo de `project.areas` → arrastrable |
| `TasksTab`/`KanbanColumn`/`TaskCard` | Extender | ya existen | `useDraggable` simple → `useSortable` + `SortableContext` por columna |
| `ChecklistTemplateDialog` | Extender | ya existe | ítems sin handle → arrastrables |
| `ProcessTemplateDialog` | Extender | ya existe | pasos sin handle → arrastrables |
| `projectOps.ts` | Extender | ya existe | + `reorderChecklistItems`, `reorderAreas`, `reorderTasks` |

`SortableItem` expone `{ setNodeRef, style, attributes, listeners, isDragging }` vía children-function,
igual de bajo nivel que el `useDraggable` que ya usa `TaskCard` — no se crea un `DndContext`
compartido genérico porque cada lista ya tiene su propio contexto de sensores/estado (local vs.
store) y forzar una abstracción única añadiría indirección sin ahorrar código real (Principio V).

## Orden de implementación (4 fases independientes)

**Fase 1 — Fundaciones (sin UI todavía):**
1. Instalar `@dnd-kit/sortable`.
2. `SortableItem` — primitivo de bajo nivel, sin consumidores todavía (se verifica con un uso
   trivial antes de fase 2).

**Fase 2 — Listas locales de diálogo (menor riesgo: estado 100% local, sin tocar el store):**
3. `ProcessEditorDialog` — conectar el `GripVertical` ya existente.
4. `ChecklistTemplateDialog` — handle en cada ítem.
5. `ProcessTemplateDialog` — handle en cada paso.

**Fase 3 — Listas respaldadas por el store (requieren funciones puras nuevas):**
6. `reorderChecklistItems(p, areaId, checklistId, orderedIds)` en `projectOps.ts` + tests.
7. `reorderAreas(p, orderedIds)` en `projectOps.ts` + tests.
8. `ChecklistSection` adopta `reorderChecklistItems`.
9. `AreasTab`/`AreaCard` adopta `reorderAreas`.

**Fase 4 — Kanban intra-columna (mayor riesgo, se hace al final):**
10. `reorderTasks(p, orderedIds)` en `projectOps.ts` + tests (preserva tareas fuera del filtro
    `?area=` activo).
11. `KanbanColumn` pasa de solo-`useDroppable` a también `SortableContext` con los ids de sus
    tareas visibles.
12. `TasksTab.onDragEnd` distingue 3 casos: soltar sobre tarjeta de la misma columna (reorder),
    sobre tarjeta de otra columna (cambia `status` + inserta en esa posición), sobre área vacía de
    otra columna (cambia `status` al final — comportamiento actual, sin regresión).

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Reordenar tareas con el filtro `?area=` activo podría reordenar solo el subconjunto visible y desordenar el resto de `project.tasks` | `reorderTasks` recibe la lista completa de ids en el nuevo orden deseado *dentro del scope visible* y reinserta solo esas tareas en sus posiciones relativas, dejando intacta la posición de las tareas fuera de scope |
| `useDraggable` actual de `TaskCard` se reemplaza por `useSortable` — riesgo de regresión en el cambio de columna que ya funciona | Cubrir con smoke test manual del flujo actual (cambiar status arrastrando) antes de agregar el caso nuevo (reorder intra-columna) |
| Handles de arrastre nuevos compiten visualmente con las acciones hover ya existentes (editar/eliminar) en `ChecklistSection`/`AreaCard` | Mismo patrón que `TaskCard`: handle discreto (`text-muted-foreground/50`) a la izquierda, acciones a la derecha, sin solaparse |
| `@dnd-kit/sortable` añade peso al bundle | Es peer del `@dnd-kit/core` ya cargado (no lazy, a diferencia de `@google/genai`); el paquete es pequeño (~15 kB) — no amerita carga diferida |

## Estrategia de verificación por fase

Después de cada fase: `npm run typecheck` (o `tsc --noEmit`), `npm run test` (Vitest en verde +
nuevos casos de `projectOps`), smoke visual manual en dev server arrastrando cada lista tocada.
**No se avanza a la siguiente fase sin confirmación visual del usuario** (a diferencia de
002-refactor-visual, donde varias fases quedaron sin ese smoke test).

## Gates de la constitución (revisión)

- ✅ **I Local-first:** sin cambios de persistencia ni red.
- ✅ **II Esquema-contrato:** sin cambios de esquema ni migraciones — el orden ya es la posición
  en el array.
- ✅ **III Plantillas/Tipos:** HU-05 extiende el mismo patrón a plantillas, sin tratarlas distinto.
- ✅ **IV Diseño limpio:** mismo lenguaje visual (`GripVertical`) ya establecido por el Kanban.
- ✅ **V Simplicidad/incremental:** 4 fases independientes; no se crea un `SortableList` genérico
  de alto nivel sin consumidores probados.
- ✅ **VI Migrabilidad:** no toca `StorageAdapter`.
