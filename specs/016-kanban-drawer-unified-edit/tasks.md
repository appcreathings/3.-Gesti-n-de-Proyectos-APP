# Tasks — Unificación de edición en drawer + resize horizontal (016)

Tareas numeradas por fase. `[P]` = paralelizable dentro de la fase. Cada fase deja la app usable de
punta a punta y termina con `tsc --noEmit` + `vitest run` + smoke visual manual confirmado antes de
avanzar.

**Prerequisito:** specs 013, 014, 015 deben estar implementados y mergeados.

## Fase 1 — Resize horizontal
- [x] T1601 `TaskDetailDrawer.tsx`: agregar estado `drawerWidth` con inicialización desde localStorage
  (key: `kanban-drawer-width`, default: 400).
- [x] T1602 `TaskDetailDrawer.tsx`: agregar `isResizingRef` y listeners `mousemove`/`mouseup` en
  `useEffect` para manejar el drag del resize.
- [x] T1603 `TaskDetailDrawer.tsx`: agregar handle de resize (div de 4px en borde izquierdo con
  `cursor-col-resize`). Solo visible en desktop (no en móvil).
- [x] T1604 `TaskDetailDrawer.tsx`: aplicar ancho dinámico al drawer con `style={{ width: drawerWidth }}`.
  En móvil, mantener `w-full`.
- [x] T1605 `TaskDetailDrawer.tsx`: persistir ancho en localStorage al soltar el handle.
- [x] T1606 Verificar: resize funciona, persiste entre recargas, responsive (no resize en móvil).
  Smoke visual.

## Fase 2 — Unificar edición en drawer
- [x] T1610 `TaskCard.tsx`: agregar import de `DropdownMenu`, `DropdownMenuTrigger`,
  `DropdownMenuContent`, `DropdownMenuItem` de shadcn/ui.
- [x] T1611 `TaskCard.tsx`: reemplazar botón de editar (lápiz) con botón "..." (MoreVertical).
- [x] T1612 `TaskCard.tsx`: implementar dropdown con opciones: Editar, Archivar/Desarchivar, Eliminar.
- [x] T1613 `TaskCard.tsx`: agregar callback `onArchive` para archivar tarea desde el menú.
- [x] T1614 `TaskCard.tsx`: cambiar `onEdit` para que llame a `onOpenDetail` (abrir drawer en vez de dialog).
- [x] T1615 `TasksTab.tsx`: eliminar `TaskFormDialog` para edición. Mantener solo para crear tareas nuevas.
- [x] T1616 `TasksTab.tsx`: cambiar `onEdit={() => setDialog({ open: true, task: t })}` por
  `onEdit={() => openDetail(t.id)}` en TaskCard.
- [x] T1617 `TasksTab.tsx`: agregar callback `onArchive` que llama a `mutate()` con `archived: true`.
- [x] T1618 Verificar: editar abre drawer, menú funciona, crear sigue usando dialog. Smoke visual.

## Fase 3 — Drag blocking y fixes
- [x] T1620 `TaskCard.tsx`: agregar prop `disabled?: boolean` a la interfaz Props.
- [x] T1621 `TaskCard.tsx`: pasar `disabled` a `useSortable` hook.
- [x] T1622 `TaskCard.tsx`: cuando `disabled` es true, el handle de drag no responde (no pasar
  `listeners` ni `attributes` al botón GripVertical).
- [x] T1623 `TasksTab.tsx`: pasar `disabled={!!detailTaskId}` a cada TaskCard.
- [x] T1624 `TasksTab.tsx`: corregir filtro de archivadas para ignorar sprint scope. Crear array
  `archivedTasks` que solo aplique filtro de área, no sprint.
- [x] T1625 `TasksTab.tsx`: pasar `archivedTasks` a `ArchivedTasksList` en vez de `tasksInScope`.
- [x] T1626 Verificar: drag se desactiva con drawer abierto, archivadas muestran todas las tareas
  archivadas del proyecto (sin filtro de sprint). Smoke visual.

## Fase 4 — ActivityTab y OverviewTab
- [x] T1630 `ActivityTab.tsx`: cambiar click en entrada de actividad `task.commented` para abrir
  `?detail=<taskId>` en vez de `?focus=<taskId>`.
- [x] T1631 `OverviewTab.tsx`: agregar tooltip en progress bar que muestre cuántas tareas están
  archivadas vs activas.
- [x] T1632 Verificar: click en comentario abre drawer, tooltip muestra archivadas. Smoke visual.
- [x] T1633 Verificar final: `npx tsc --noEmit`, `npx vitest run`, `npm run build` pasan sin errores.
  Smoke visual de HU-01 a HU-05. Actualizar memoria del proyecto con resumen de 016.

## Explícitamente fuera de este tasks.md
- Edición de comentarios (siguen siendo inmutables en v1)
- Formato markdown en comentarios
- Subtareas / checklists embebidos
- Filtros enriquecidos (prioridad, assignee, fecha)

## Verificación por fase
Tras cada fase: `npx tsc --noEmit`, `npx vitest run`, smoke visual manual en dev server de los
casos listados. No se avanza con typecheck o tests rotos, ni sin confirmación visual. Al cerrar la
fase 4: `npm run build` y actualización de la memoria del proyecto con el resumen de 016.
