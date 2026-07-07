# Especificación — Mejora integral de la experiencia PM

- **Feature ID:** 017-pm-experience-enhancement
- **Estado:** Borrador
- **Fecha:** 2026-07-06
- **Principios afectados (constitución):** IV (diseño limpio y enfocado), V (simplicidad), VI (accesibilidad)

## Resumen

Mejora integral de la experiencia de gestión de proyectos, enfocada en **productividad del PM**, **visibilidad del trabajo** y **navegación eficiente**. Se organiza en 3 waves incrementales, cada una usable independientemente.

## Problema / Necesidad

El Kanban y el Dashboard funcionan correctamente (specs 010-016), pero el PM enfrenta fricciones diarias:

1. **Búsqueda y filtrado limitados**: solo puede filtrar por área, perdiendo tiempo buscando tareas por prioridad, assignee, fecha o texto.
2. **Visión fragmentada del trabajo**: no hay forma de ver "mis tareas" across-proyecto, lo que obliga a abrir cada proyecto individualmente.
3. **Comunicación visual deficiente**: las tareas bloqueadas/vencidas no destacan lo suficiente, y no hay vista de lista para quienes prefieren tablas.
4. **Flujo de trabajo interrumpido**: faltan atajos de teclado, "quick add" y una vista de daily standup.
5. **Planificación sin estimación**: no hay forma de estimar esfuerzo (horas/story points), lo que dificulta la planificación de capacidad.
6. **Dashboard estático**: no hay drill-down ni tendencias históricas, lo que limita el análisis.

## Decisiones explícitas

- **3 waves incrementales**: cada wave es usable independientemente y mejora aspectos diferentes.
- **Wave 1 primero**: aborda las fricciones más inmediatas (búsqueda y visibilidad).
- **Filtros en URL**: los filtros se persisten en searchParams para compartir links.
- **Vista "Mis tareas" como ruta separada**: no como filtro dentro de un proyecto.
- **Atajos de teclado opcionales**: no reemplazan la UI, la complementan.
- **Estimación opcional**: el campo `estimate` es nullable, no obligatorio.
- **Subtareas planas**: sin anidamiento profundo (una tarea puede tener subtareas, pero las subtareas no pueden tener subtareas).
- **WIP limits visuales**: no bloquean el drag-and-drop, solo muestran indicadores.

## Waves de implementación

### Wave 1 — Filtros, búsqueda y vista "Mis tareas" (Alta prioridad, 2-3 días)

**Objetivo**: Reducir el tiempo de búsqueda y dar visibilidad cross-proyecto.

#### HU-01 — Búsqueda por texto en Kanban
**Como** PM, **quiero** buscar tareas por título o descripción **para** encontrar rápidamente lo que necesito.
- ✅ Input de búsqueda en la barra superior del Kanban.
- ✅ Búsqueda en tiempo real (debounce 300ms) en título y descripción.
- ✅ Resaltado de coincidencias en los resultados.
- ✅ La búsqueda respeta el filtro de área y sprint activos.

#### HU-02 — Filtros enriquecidos en Kanban
**Como** PM, **quiero** filtrar tareas por prioridad, assignee, fecha y tags **para** enfocarme en lo importante.
- ✅ Dropdown de filtros junto al input de búsqueda.
- ✅ Filtros: prioridad (alta/media/baja), assignee (persona), fecha (vencidas/por vencer/esta semana), tags.
- ✅ Los filtros se combinan con el filtro de área y sprint.
- ✅ Los filtros se persisten en la URL (searchParams) para compartir links.

#### HU-03 — Vista "Mis tareas" cross-proyecto
**Como** PM, **quiero** ver todas mis tareas asignadas en todos los proyectos **para** tener una visión unificada de mi trabajo.
- ✅ Nueva ruta `/my-tasks` accesible desde el menú lateral.
- ✅ Lista de tareas asignadas al usuario actual (filtrado por `assigneeId`).
- ✅ Agrupación por proyecto (colapsable).
- ✅ Cada tarea muestra: título, proyecto, área, prioridad, fecha límite, estado.
- ✅ Click en tarea abre el drawer de detalle (igual que en el Kanban).
- ✅ Filtros: estado (todo/doing/blocked/done), prioridad, fecha.

#### HU-04 — Tags en UI
**Como** PM, **quiero** ver y gestionar tags en las tareas **para** organizar por categorías.
- ✅ Input de tags en el drawer de edición de tareas (autocomplete desde tags existentes).
- ✅ Los tags se muestran como badges en la card del Kanban.
- ✅ Los tags se pueden usar como filtro (ver HU-02).

### Wave 2 — Mejoras de UX en Kanban y productividad (Alta prioridad, 2-3 días)

**Objetivo**: Mejorar la comunicación visual y acelerar el flujo de trabajo.

#### HU-05 — Indicadores visuales prominentes
**Como** PM, **quiero** identificar rápidamente tareas bloqueadas y vencidas **para** priorizar atención.
- ✅ Tareas bloqueadas: borde izquierdo rojo + icono de candado visible.
- ✅ Tareas vencidas: fondo rojo suave + icono de alerta visible.
- ✅ Tareas por vencer (3 días): fondo ámbar suave.
- ✅ Los indicadores son consistentes en card y drawer.

#### HU-06 — Vista de lista en Kanban
**Como** PM, **quiero** alternar entre vista Kanban y vista de lista **para** elegir la que mejor se adapte a mi flujo.
- ✅ Toggle "Kanban / Lista" en la barra superior del Kanban.
- ✅ Vista de lista: tabla con columnas (estado, título, área, prioridad, assignee, fecha).
- ✅ La vista de lista respeta los filtros y la búsqueda.
- ✅ Click en fila abre el drawer de detalle.
- ✅ La preferencia se persiste en localStorage.

#### HU-07 — Atajos de teclado globales
**Como** PM, **quiero** atajos de teclado para acciones comunes **para** trabajar más rápido.
- ✅ `Ctrl/Cmd + K` — abrir búsqueda global (proyectos, tareas, áreas).
- ✅ `Ctrl/Cmd + N` — crear nueva tarea (en el proyecto actual).
- ✅ `Ctrl/Cmd + Shift + A` — archivar tarea seleccionada.
- ✅ `Ctrl/Cmd + /` — mostrar modal de atajos de teclado.
- ✅ Los atajos se muestran en un modal accesible desde el menú de ayuda.

#### HU-08 — Quick add de tareas
**Como** PM, **quiero** agregar tareas rápidamente desde cualquier vista **para** capturar ideas sin interrumpir mi flujo.
- ✅ Botón "+" flotante en la esquina inferior derecha (visible en todas las vistas).
- ✅ Click abre un modal minimalista: título, proyecto, área, prioridad.
- ✅ Enter crea la tarea y la deja abierta para editar más detalles.
- ✅ Escape cierra el modal sin crear.

#### HU-09 — Vista "Daily Standup"
**Como** PM, **quiero** una vista de daily standup **para** revisar rápidamente qué hice ayer, qué haré hoy y qué me bloquea.
- ✅ Nueva ruta `/daily` accesible desde el menú lateral.
- ✅ Tres secciones: "Hecho recientemente" (últimas 24h), "Para hoy" (tareas con dueDate = hoy), "Bloqueado" (tareas con status = blocked).
- ✅ Cada tarea muestra: título, proyecto, área, prioridad.
- ✅ Click en tarea abre el drawer de detalle.

### Wave 3 — Estimación, WIP limits y Dashboard enriquecido (Media prioridad, 3-4 días)

**Objetivo**: Mejorar la planificación y el análisis estratégico.

#### HU-10 — Estimación de esfuerzo
**Como** PM, **quiero** estimar el esfuerzo de las tareas (horas o story points) **para** planificar la capacidad del equipo.
- ✅ Campo `estimate` en el schema de Task (number, nullable).
- ✅ Input de estimación en el drawer de edición.
- ✅ La estimación se muestra en la card del Kanban (si está definida).
- ✅ El Overview del proyecto muestra la suma de estimaciones por estado.

#### HU-11 — Subtareas/checklists embebidos
**Como** PM, **quiero** agregar subtareas o checklists dentro de una tarea **para** descomponer el trabajo.
- ✅ Nuevo schema `SubtaskSchema` (id, title, done, taskId).
- ✅ Sección de subtareas en el drawer de edición.
- ✅ Las subtareas se muestran como checklist en el drawer.
- ✅ El progreso de subtareas se muestra en la card (ej. "2/5").

#### HU-12 — WIP limits por columna
**Como** PM, **quiero** definir límites de trabajo en curso por columna **para** evitar sobrecarga.
- ✅ Campo `wipLimit` en el schema de Project (number, nullable, por columna).
- ✅ Input de WIP limit en la configuración del Kanban.
- ✅ Cuando una columna supera el WIP limit, se muestra un indicador visual (fondo ámbar).
- ✅ El indicador se muestra en el header de la columna.

#### HU-13 — Operaciones bulk
**Como** PM, **quiero** seleccionar múltiples tareas y moverlas/archivarlas/eliminarlas **para** ahorrar tiempo en operaciones repetitivas.
- ✅ Checkbox en cada card del Kanban (aparece al hacer hover o con tecla Shift).
- ✅ Barra de acciones bulk en la parte superior (mover a..., archivar, eliminar).
- ✅ Las operaciones bulk respetan los permisos y piden confirmación.

#### HU-14 — Drill-down en Dashboard
**Como** CEO/PM, **quiero** hacer click en los KPIs del Dashboard **para** ver el detalle.
- ✅ Click en "Proyectos activos" → lista de proyectos activos.
- ✅ Click en "Vencidos" → lista de tareas vencidas.
- ✅ Click en "Estancados" → lista de proyectos estancados.
- ✅ Click en "Salud RAG" → lista de proyectos por color.

#### HU-15 — Tendencias históricas en Dashboard
**Como** CEO/PM, **quiero** ver cómo ha cambiado la salud del portafolio en el tiempo **para** identificar patrones.
- ✅ Gráfico de líneas con la evolución de la salud RAG (últimos 30 días).
- ✅ Gráfico de barras con la evolución del avance medio (últimos 30 días).
- ✅ Los datos se calculan a partir del historial de actividad (si está disponible).

#### HU-16 — Vista de carga de trabajo por persona
**Como** PM, **quiero** ver la carga de trabajo por persona **para** balancear la asignación.
- ✅ Nueva vista en el Dashboard: "Carga de trabajo".
- ✅ Lista de personas con: nombre, nº de tareas asignadas, suma de estimaciones.
- ✅ Gráfico de barras con la distribución de carga.

## Requisitos no funcionales

- **Performance**: la búsqueda debe ser fluida incluso con cientos de tareas. Usar debounce y memoización.
- **Accesibilidad**: los atajos de teclado deben ser accesibles y documentados.
- **Persistencia**: las preferencias (vista Kanban/Lista, filtros) se guardan en localStorage o URL.
- **Responsive**: todas las nuevas vistas deben funcionar en móvil y tablet.
- **Migración**: los cambios de schema deben ser no destructivos (defaults seguros).

## Cambios de schema acumulados (migración v3 → v4)

```typescript
// TaskSchema — nuevos campos
estimate: z.number().nullable().default(null), // horas o story points
subtasks: z.array(SubtaskSchema).default([]),

// Nuevo schema
const SubtaskSchema = z.object({
  id: Id,
  title: z.string(),
  done: z.boolean().default(false),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});

// ProjectSchema — nuevos campos
wipLimits: z.object({
  todo: z.number().nullable().default(null),
  doing: z.number().nullable().default(null),
  blocked: z.number().nullable().default(null),
  done: z.number().nullable().default(null),
}).default({ todo: null, doing: null, blocked: null, done: null }),
```

Todos los campos tienen defaults seguros → migración no destructiva.

## Archivos afectados (resumen)

### Wave 1
- `src/features/projects/components/TasksTab.tsx` — agregar search input y filtros.
- `src/features/projects/components/kanban/TaskCard.tsx` — mostrar tags.
- `src/features/projects/components/kanban/TaskDetailDrawer.tsx` — agregar input de tags.
- `src/features/my-tasks/` — nueva feature con `MyTasksPage.tsx`.
- `src/routes/` — agregar ruta `/my-tasks`.

### Wave 2
- `src/features/projects/components/TasksTab.tsx` — agregar toggle Kanban/Lista.
- `src/features/projects/components/kanban/TaskCard.tsx` — mejorar indicadores visuales.
- `src/features/projects/components/kanban/KanbanListView.tsx` — nueva vista de lista.
- `src/components/CommandPalette.tsx` — nueva búsqueda global.
- `src/components/QuickAddTask.tsx` — nuevo modal de quick add.
- `src/features/daily/DailyStandupPage.tsx` — nueva feature.
- `src/routes/` — agregar rutas `/daily`.

### Wave 3
- `src/domain/schemas/project.ts` — agregar `estimate`, `SubtaskSchema`, `wipLimit`.
- `src/domain/migrations.ts` — migración v3 → v4.
- `src/features/projects/components/kanban/TaskDetailDrawer.tsx` — agregar inputs de estimate y subtareas.
- `src/features/projects/components/kanban/TaskCard.tsx` — mostrar estimate y progreso de subtareas.
- `src/features/projects/components/kanban/KanbanColumn.tsx` — mostrar WIP limit.
- `src/features/projects/components/TasksTab.tsx` — agregar selección bulk.
- `src/features/dashboard/DashboardPage.tsx` — agregar drill-down y gráficos de tendencias.
- `src/features/dashboard/WorkloadCard.tsx` — nueva vista de carga de trabajo.

## Fuera de alcance (para specs futuros)

- Multiusuario y colaboración en tiempo real.
- Diagramas de Gantt / dependencias entre tareas.
- Time-tracking (registro de tiempo real).
- Integración con herramientas externas (Slack, GitHub, etc.).
- App móvil nativa.
- Exportación de reportes en PDF/Excel.
- Tour guiado de onboarding.

## Métricas de éxito del spec

- El PM encuentra tareas específicas en < 5 segundos (vs. 30+ segundos actualmente).
- El PM puede ver todas sus tareas asignadas sin abrir cada proyecto.
- El PM identifica tareas bloqueadas/vencidas de un vistazo (< 2 segundos).
- El PM usa atajos de teclado para al menos 30% de las acciones comunes.
- El CEO puede hacer drill-down desde los KPIs del Dashboard.
- 0 regresión en las funcionalidades existentes (drag-and-drop, filtros, sprint switcher).

## Orden de implementación sugerido

```
Wave 1 (filtros, búsqueda, "Mis tareas", tags) → 
Wave 2 (UX Kanban, atajos, quick add, daily standup) → 
Wave 3 (estimación, subtareas, WIP limits, Dashboard enriquecido)
```

**Racional**: cada wave es usable independientemente y mejora aspectos diferentes de la experiencia PM. La Wave 1 aborda las fricciones más inmediatas (búsqueda y visibilidad), la Wave 2 mejora el flujo de trabajo diario, y la Wave 3 agrega capacidades de planificación y análisis.

## Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| **La búsqueda global (Ctrl+K) puede ser compleja** | Empezar solo con búsqueda de proyectos y tareas, no áreas ni procesos. |
| **Los gráficos de tendencias requieren historial de actividad** | Si no hay historial, mostrar un mensaje "Datos insuficientes" y sugerir activar el log de actividad. |
| **Las subtareas pueden complicar el schema** | Mantener las subtareas como una lista plana dentro de la tarea, sin anidamiento profundo. |
| **Los WIP limits pueden ser ignorados** | Mostrar indicadores visuales prominentes, pero no bloquear el drag-and-drop (el PM decide). |
