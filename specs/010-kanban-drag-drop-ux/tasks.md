# Tasks — Refactor UX del Drag & Drop del Kanban (010)

Tareas numeradas por fase. `[P]` = paralelizable dentro de la fase. Cada fase deja la app usable de
punta a punta (Principio V) y termina con `tsc --noEmit` + `vitest run` + smoke visual manual
confirmado antes de avanzar (mismo criterio que spec 003).

## Fase 1 — Sensores y colisión
- [ ] T1001 `TasksTab`: reemplazar `PointerSensor` por `MouseSensor` en `useSensors` (mantener
  `activationConstraint: { distance: 5 }`); `TouchSensor` queda solo, sin doble activación.
- [ ] T1002 `TasksTab`: implementar colisión compuesta (`pointerWithin` → `rectIntersection` →
  `closestCorners`) y pasarla como `collisionDetection` del `DndContext`.
- [ ] T1003 `TasksTab`: quitar `restrictToWindowEdges` de `modifiers`; revisar/calmar los
  parámetros de `autoScroll`.
- [ ] T1004 Smoke visual: soltar sobre una columna vacía ya no produce error, incluso antes de las
  fases siguientes.

## Fase 2 — Estado efímero `dragBoard` (núcleo)
- [ ] T1010 `TasksTab`: extraer `boardFromScope: Record<TaskStatus, string[]>` memoizado desde
  `tasksInScope` (reemplaza el filtro inline dentro del `.map` de columnas en el render).
- [ ] T1011 `TasksTab`: agregar estado `dragBoard: Record<TaskStatus, string[]> | null`,
  `activeId: string | null`, `isTouchDragRef`.
- [ ] T1012 `TasksTab`: `onDragStart` — detectar touch desde `event.activatorEvent`; snapshot de
  `boardFromScope` en `dragBoard`; set `activeId`.
- [ ] T1013 `TasksTab`: `onDragOver` — resolver columna origen/destino desde `dragBoard`; si
  `isTouchDragRef.current` y origen≠destino, ignorar; si no, mover/reordenar el id en `dragBoard`
  (misma columna → `arrayMove`; distinta columna → splice entre listas).
- [ ] T1014 `TasksTab`: `onDragEnd` — diffear `dragBoard` final contra `boardFromScope` para
  detectar cambio de `status`; aplicar en una sola `mutate`: `ops.updateTask` (si aplica) +
  `ops.reorderTasks(ordered)`; limpiar `dragBoard`/`activeId`.
- [ ] T1015 `TasksTab`: `onDragCancel` — limpiar `dragBoard`/`activeId` sin mutar.
- [ ] T1016 `TasksTab`: el render de `KanbanColumn`/`TaskCard` lee `dragBoard ?? boardFromScope` en
  vez de recalcular el filtro por columna en cada `.map`.
- [ ] T1017 `TasksTab`: corregir `DragOverlay` — lookup seguro de la tarea activa (sin `!`); no
  renderizar si no se encuentra.
- [ ] T1018 Smoke visual: HU-01 (preview intra-columna), HU-02 (preview entre columnas en
  desktop), HU-04 (táctil: reorder sí, cambio de columna no).

## Fase 3 — `KanbanColumn` sin layout shift
- [ ] T1020 `KanbanColumn`: zona de tarjetas con altura mínima estable, montada siempre (no
  condicional a `taskIds.length`); mensaje "Arrastra tareas aquí" visible solo cuando está vacía,
  sin des-montar/montar el contenedor.
- [ ] T1021 `KanbanColumn`: resaltado `isOver` de columna sin `shadow-lg`; `transition-colors` en
  vez de `transition-all`.
- [ ] T1022 Smoke visual: HU-05 (sin saltos de layout al iniciar/soltar arrastre, con y sin
  columnas vacías).

## Fase 4 — `TaskCard` calmado
- [ ] T1030 `TaskCard`: quitar prop `isOver` y su línea `absolute ... animate-pulse`.
- [ ] T1031 `TaskCard`: placeholder de origen simplificado mientras `isDragging` (borde punteado
  atenuado, sin badges/acciones) en vez de tarjeta semi-transparente con contenido completo.
- [ ] T1032 `TaskCard`: overlay (`isOverlay`) calmado — `shadow-2xl`, `cursor-grabbing`,
  `scale-[1.02]`, sin `rotate`.
- [ ] T1033 Smoke visual: HU-03 (columna vacía), HU-06 (teclado: flechas + Enter/Escape siguen
  funcionando igual que antes del refactor).

## Explícitamente fuera de este tasks.md
- Reordenar columnas del Kanban (estados fijos).
- Arrastrar entre columnas en dispositivos táctiles.
- Evento de Actividad para reorder/cambio de estado (sigue silencioso).
- Cualquier cambio en `src/domain/projectOps.ts` (se reutiliza tal cual).

## Verificación por fase
Tras cada fase: `npx tsc --noEmit`, `npx vitest run`, smoke visual manual en dev server de los
casos listados. No se avanza con typecheck o tests rotos, ni sin confirmación visual. Al cerrar la
fase 4: `npm run build` y actualización de la memoria del proyecto con el resumen de 010.
