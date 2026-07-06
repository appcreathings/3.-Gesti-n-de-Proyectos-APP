# Tasks — Comentarios en tareas (014)

Tareas numeradas por fase. `[P]` = paralelizable dentro de la fase. Cada fase deja la app usable de
punta a punta y termina con `tsc --noEmit` + `vitest run` + smoke visual manual confirmado antes de
avanzar.

**Prerequisito:** spec 013 (kanban-task-detail-drawer) debe estar implementado y mergeado.

## Fase 1 — Schema y migración
- [x] T1401 `src/domain/schemas/common.ts`: actualizar `SCHEMA_VERSION` de 3 a 4.
- [x] T1402 `src/domain/schemas/project.ts`: definir `CommentSchema` con campos `id`, `authorId`,
  `text`, `createdAt`, `updatedAt`.
- [x] T1403 `src/domain/schemas/project.ts`: agregar `comments: z.array(CommentSchema).default([])`
  a `TaskSchema`.
- [x] T1404 `src/domain/migrations.ts`: agregar migración v3→v4 que agrega `comments: []` a tareas
  existentes (si no tienen el campo).
- [x] T1405 `src/domain/factories.ts`: actualizar `newTask()` para incluir `comments: []`.
- [x] T1406 Verificar: `npx tsc --noEmit` y `npx vitest run` pasan sin errores.

## Fase 2 — UI de comentarios en el drawer
- [x] T1410 `TaskDetailDrawer.tsx`: agregar sección "Comentarios" al final del drawer, debajo de la
  metadata.
- [x] T1411 `TaskDetailDrawer.tsx`: implementar lista de comentarios en orden cronológico (más antiguo
  arriba, más reciente abajo). Cada comentario muestra: texto, fecha relativa, autor (si tiene
  `authorId`).
- [x] T1412 `TaskDetailDrawer.tsx`: implementar textarea para escribir nuevo comentario al final de la
  sección.
- [x] T1413 `TaskDetailDrawer.tsx`: implementar botón "Comentar" (deshabilitado si textarea está vacío)
  y atajo `Ctrl+Enter` para publicar.
- [x] T1414 `TaskDetailDrawer.tsx`: implementar persistencia al publicar: generar nuevo `Comment` con
  UUID, `authorId: null`, `text`, timestamps. Llamar a `mutate()` con `ops.updateTask(taskId, { comments: [...task.comments, newComment] })`.
- [x] T1415 `TaskDetailDrawer.tsx`: limpiar textarea después de publicar. Scroll automático al último
  comentario.
- [x] T1416 Verificar: comentarios se agregan, persisten entre recargas, se muestran correctamente.
  Smoke visual de la sección de comentarios.

## Fase 3 — Integración con actividad y card
- [x] T1420 `src/automations/events.ts`: agregar detección de evento `task.commented`. Comparar
  `prevTask.comments.length` vs `nextTask.comments.length`. Si aumentó, emitir evento con el último
  comentario.
- [x] T1421 `src/automations/activity.ts`: agregar mensaje para `task.commented`: "Comentario en 'X':
  [primeros 50 chars del texto]...". Incluir `taskId` para deep-link.
- [x] T1422 `src/features/projects/components/ActivityTab.tsx`: verificar que click en entrada de
  actividad de comentario abre drawer con `?detail=<taskId>`.
- [x] T1423 `TaskCard.tsx`: agregar badge contador de comentarios. Si `task.comments.length > 0`,
  mostrar ícono `MessageCircle` + número. Estilo: `text-xs text-muted-foreground`.
- [x] T1424 `TaskCard.tsx`: posicionar badge junto a los demás badges (assignee, due date).
- [x] T1425 Verificar: evento se registra en activity log, mensaje aparece correctamente, badge se
  muestra en card cuando hay comentarios.
- [x] T1426 Verificar final: `npx tsc --noEmit`, `npx vitest run`, `npm run build` pasan sin errores.
  Smoke visual de HU-01 a HU-04. Actualizar memoria del proyecto con resumen de 014.

## Explícitamente fuera de este tasks.md
- Edición o eliminación de comentarios
- Formato markdown o enriquecido
- Notificaciones push/email
- Mencionar a otros usuarios (@mention)
- Adjuntar archivos o imágenes
- Comentarios en checklists o procesos (solo en tareas)

## Verificación por fase
Tras cada fase: `npx tsc --noEmit`, `npx vitest run`, smoke visual manual en dev server de los
casos listados. No se avanza con typecheck o tests rotos, ni sin confirmación visual. Al cerrar la
fase 3: `npm run build` y actualización de la memoria del proyecto con el resumen de 014.
