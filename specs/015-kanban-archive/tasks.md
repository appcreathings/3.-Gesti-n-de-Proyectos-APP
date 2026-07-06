# Tasks — Archivado de tareas (015)

Tareas numeradas por fase. `[P]` = paralelizable dentro de la fase. Cada fase deja la app usable de
punta a punta y termina con `tsc --noEmit` + `vitest run` + smoke visual manual confirmado antes de
avanzar.

**Prerequisito:** spec 013 (kanban-task-detail-drawer) debe estar implementado y mergeado.

## Fase 1 — Schema y migración
- [x] T1501 `src/domain/schemas/common.ts`: actualizar `SCHEMA_VERSION` de 4 a 5.
- [x] T1502 `src/domain/schemas/project.ts`: agregar `archived: z.boolean().default(false)` a
  `TaskSchema`.
- [x] T1503 `src/domain/migrations.ts`: agregar migración v4→v5 que agrega `archived: false` a tareas
  existentes (si no tienen el campo).
- [x] T1504 `src/domain/factories.ts`: actualizar `newTask()` para incluir `archived: false`.
- [x] T1505 Verificar: `npx tsc --noEmit` y `npx vitest run` pasan sin errores.

## Fase 2 — Filtrado y toggle en TasksTab
- [x] T1510 `TasksTab.tsx`: filtrar `project.tasks` para excluir `archived: true` por defecto. El
  filtro se aplica antes de derivar las columnas del kanban.
- [x] T1511 `TasksTab.tsx`: agregar estado `showArchived: boolean` (default: false).
- [x] T1512 `TasksTab.tsx`: agregar toggle/botón "Archivadas" en la barra del kanban (junto a filtros
  de área y sprint). Mostrar contador de tareas archivadas.
- [x] T1513 `TasksTab.tsx`: cuando `showArchived` es true, ocultar el kanban y mostrar componente
  `ArchivedTasksList`.
- [x] T1514 `TasksTab.tsx`: cuando `showArchived` es true, el `SprintSwitcher` no cuenta tareas
  archivadas.
- [x] T1515 Verificar: tareas archivadas no aparecen en el tablero por defecto, toggle funciona.

## Fase 3 — ArchivedTasksList y botones de archivar
- [x] T1520 Crear `src/features/projects/components/kanban/ArchivedTasksList.tsx` con lista plana de
  tareas archivadas.
- [x] T1521 `ArchivedTasksList.tsx`: implementar ordenamiento por fecha de archivado (default: más
  reciente primero) o fecha de creación.
- [x] T1522 `ArchivedTasksList.tsx`: cada card muestra título, summary, status, priority, assignee,
  fecha de archivado. Click abre drawer en modo lectura.
- [x] T1523 `TaskDetailDrawer.tsx`: agregar botón "Archivar" al final del drawer (con ícono `Archive`).
  Si la tarea ya está archivada, el botón cambia a "Desarchivar" (ícono `ArchiveRestore`).
- [x] T1524 `TaskDetailDrawer.tsx`: implementar lógica de archivar/desarchivar: llamar a `mutate()` con
  `ops.updateTask(taskId, { archived: true/false })`. Cerrar el drawer después de archivar.
- [x] T1525 Verificar: archivar desde drawer funciona, lista de archivadas se muestra correctamente,
  desarchivar restaura la tarea al tablero.

## Fase 4 — Integración con actividad
- [x] T1530 `src/automations/events.ts`: agregar detección de eventos `task.archived` y
  `task.unarchived`. Comparar `prevTask.archived` vs `nextTask.archived`.
- [x] T1531 `src/automations/activity.ts`: agregar mensajes para `task.archived` ("Tarea 'X' archivada")
  y `task.unarchived` ("Tarea 'X' desarchivada").
- [x] T1532 Verificar: eventos se registran en activity log, mensajes aparecen correctamente.
- [x] T1533 Verificar final: `npx tsc --noEmit`, `npx vitest run`, `npm run build` pasan sin errores.
  Smoke visual de HU-01 a HU-05. Actualizar memoria del proyecto con resumen de 015.

## Explícitamente fuera de este tasks.md
- Archivado automático de tareas hechas después de X días
- Eliminación permanente de tareas archivadas (purge)
- Exportar tareas archivadas a CSV/JSON
- Búsqueda dentro de tareas archivadas
- Archivado de proyectos completos (ya existe `ProjectStatus.archived`)

## Verificación por fase
Tras cada fase: `npx tsc --noEmit`, `npx vitest run`, smoke visual manual en dev server de los
casos listados. No se avanza con typecheck o tests rotos, ni sin confirmación visual. Al cerrar la
fase 4: `npm run build` y actualización de la memoria del proyecto con el resumen de 015.
