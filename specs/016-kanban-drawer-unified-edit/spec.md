# Especificación — Unificación de edición en drawer + resize horizontal

- **Feature ID:** 016-kanban-drawer-unified-edit
- **Estado:** Borrador
- **Fecha:** 2026-07-06
- **Epic:** kanban-task-experience
- **Depende de:** 013, 014, 015
- **Principios afectados (constitución):** IV (diseño limpio y enfocado), V (simplicidad)

## Resumen

Unificar la experiencia de edición de tareas en el drawer lateral (spec 013), eliminando el `TaskFormDialog` para edición y agregando resize horizontal al drawer. Además, corrige gaps identificados en el audit de specs 013-015: menú contextual "..." en card, drag blocking, y filtros de archivadas.

## Problema / Necesidad

1. **Duplicación de interfaces**: el `TaskFormDialog` (modal) y el `TaskDetailDrawer` (drawer) ofrecen funcionalidad similar para editar tareas, lo que genera inconsistencia y código duplicado.
2. **El modal tapa el tablero**: al editar con el dialog, el PM pierde el contexto visual del kanban.
3. **El drawer no es redimensionable**: el ancho fijo de 400px puede ser insuficiente para tareas con descripciones largas o muchos comentarios.
4. **Gaps de usabilidad**: faltan el menú contextual "..." en card (HU-02 de spec 015), el drag blocking efectivo, y el filtro de archivadas no debe aplicar sprint scope.

## Decisiones explícitas

- **Unificar edición en el drawer**: el botón de editar (lápiz) abre el drawer en vez del dialog. El `TaskFormDialog` queda solo para **crear tareas nuevas**.
- **Resize horizontal del drawer**: handle en el borde izquierdo, arrastrable con mouse. Ancho mínimo 320px, máximo 800px, default 400px.
- **Persistir ancho en localStorage**: recordar la preferencia del usuario entre sesiones.
- **Menú contextual "..." en card**: dropdown con opciones Editar, Archivar, Eliminar.
- **Drag blocking efectivo**: deshabilitar drag en TaskCard cuando el drawer está abierto.
- **Archivadas sin sprint scope**: el filtro de archivadas muestra todas las tareas archivadas del proyecto, ignorando el sprint scope.

## Historias de usuario

### HU-01 — Editar tarea desde el drawer
**Como** PM, **quiero** que el botón de editar abra el drawer **para** tener una experiencia consistente sin perder el contexto del tablero.
- ✅ Click en botón de editar (lápiz) abre el drawer con los datos de la tarea.
- ✅ El `TaskFormDialog` solo se abre para crear tareas nuevas.
- ✅ Todos los campos editables en el drawer funcionan igual que antes.

### HU-02 — Redimensionar el drawer horizontalmente
**Como** PM, **quiero** poder cambiar el ancho del drawer arrastrando su borde izquierdo **para** adaptar el espacio a tareas con mucho contenido.
- ✅ Un handle de 4px en el borde izquierdo del drawer permite arrastrar.
- ✅ El cursor cambia a `col-resize` al hacer hover sobre el handle.
- ✅ Arrastrar cambia el ancho del drawer en tiempo real.
- ✅ Ancho mínimo: 320px, máximo: 800px, default: 400px.
- ✅ El ancho se persiste en localStorage y se restaura al recargar.
- ✅ En móvil (< md), el resize no está disponible (drawer ocupa 100%).

### HU-03 — Menú contextual en card
**Como** PM, **quiero** un menú "..." en la card con opciones rápidas **para** archivar o eliminar sin abrir el drawer.
- ✅ Botón "..." (MoreVertical) en la card abre un dropdown.
- ✅ Opciones: Editar, Archivar/Desarchivar, Eliminar.
- ✅ Click en "Editar" abre el drawer.
- ✅ Click en "Archivar" marca la tarea como archivada y la oculta del tablero.
- ✅ Click en "Eliminar" elimina la tarea con confirmación.

### HU-04 — Drag blocking efectivo
**Como** PM, **quiero** que el drag-and-drop se desactive cuando el drawer está abierto **para** evitar conflictos de interacción.
- ✅ Cuando el drawer está abierto, las cards no son arrastrables.
- ✅ El handle de drag (GripVertical) no responde a mouse/touch.
- ✅ Al cerrar el drawer, el drag-and-drop se reactiva.

### HU-05 — Archivadas sin sprint scope
**Como** PM, **quiero** ver todas las tareas archivadas del proyecto sin importar el sprint **para** tener una vista completa del historial.
- ✅ El toggle "Archivadas" muestra todas las tareas archivadas del proyecto.
- ✅ El filtro de sprint no aplica cuando se muestran archivadas.
- ✅ El filtro de área sí aplica (permite filtrar archivadas por área).

## Requisitos no funcionales

- **Performance**: el resize debe ser fluido, sin lag perceptible. Usar `requestAnimationFrame` si es necesario.
- **Accesibilidad**: el handle de resize debe ser accesible por teclado (flechas izquierda/derecha para cambiar ancho).
- **Persistencia**: el ancho se guarda en localStorage con key `kanban-drawer-width`.
- **Responsive**: en móvil, el drawer ocupa 100% y no tiene resize.

## Archivos afectados

| Archivo | Cambio |
|---------|--------|
| `src/features/projects/components/kanban/TaskDetailDrawer.tsx` | Agregar resize handle con lógica de drag. Leer/escribir ancho en localStorage. |
| `src/features/projects/components/kanban/TaskCard.tsx` | Cambiar `onEdit` para abrir drawer. Agregar menú contextual "..." con dropdown. Deshabilitar drag cuando drawer está abierto. |
| `src/features/projects/components/TasksTab.tsx` | Eliminar `TaskFormDialog` para edición (mantener solo para crear). Pasar `onOpenDetail` como `onEdit`. Pasar `detailTaskId` a TaskCard para deshabilitar drag. Corregir filtro de archivadas para ignorar sprint scope. |
| `src/features/projects/components/ActivityTab.tsx` | Cambiar click en `task.commented` para abrir `?detail=` en vez de `?focus=`. |
| `src/features/projects/components/OverviewTab.tsx` | Agregar tooltip para tareas archivadas en el progress bar. |

## Fuera de alcance (este spec)

- Edición de comentarios (siguen siendo inmutables en v1).
- Formato markdown en comentarios.
- Subtareas / checklists embebidos.
- Filtros enriquecidos (prioridad, assignee, fecha).

## Métricas de éxito

- Las 5 historias de usuario cumplen sus criterios de aceptación.
- `tsc --noEmit`, `vitest run` y `vite build` en verde.
- El resize es fluido y persiste entre sesiones.
- El menú contextual funciona correctamente.
- El drag se desactiva cuando el drawer está abierto.
