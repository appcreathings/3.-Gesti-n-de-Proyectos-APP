# Tasks — Mejora integral de la experiencia PM (017)

Tareas numeradas por fase. `[P]` = paralelizable dentro de la fase. Cada fase deja la app usable de
punta a punta y termina con `tsc --noEmit` + `vitest run` + smoke visual manual confirmado antes de
avanzar.

**Prerequisito:** specs 010-016 deben estar implementados y mergeados.

---

## Wave 1 — Filtros, búsqueda y vista "Mis tareas"

### Fase 1 — Búsqueda por texto (HU-01)

- [x] T1701 Crear hook `src/hooks/useDebounce.ts` con implementación genérica de debounce.
- [x] T1702 `TasksTab.tsx`: agregar estado `searchQuery` y `debouncedQuery` usando `useDebounce(searchQuery, 300)`.
- [x] T1703 `TasksTab.tsx`: agregar input de búsqueda con icono Search (lucide-react) en la barra superior del Kanban.
  - Placeholder: "Buscar tareas...".
  - Clase: `w-full max-w-md` (responsive).
  - Binding: `value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}`.
- [x] T1704 `TasksTab.tsx`: implementar filtrado por texto en `filteredTasks` usando `debouncedQuery`.
  - Búsqueda case-insensitive en `task.title` y `task.description`.
  - El filtrado se combina con los filtros existentes (área, sprint, archivadas).
- [x] T1705 Crear función helper `highlightText(text, query)` en `src/lib/utils.tsx` para resaltar coincidencias.
  - Retorna React.ReactNode con `<mark>` envolviendo las coincidencias.
  - Clase: `bg-yellow-200 dark:bg-yellow-800 rounded px-0.5`.
- [x] T1706 `TaskCard.tsx`: usar `highlightText` para resaltar coincidencias en `task.title` y `task.summary`.
  - Solo aplicar resaltado cuando `searchQuery` no está vacío.
- [x] T1707 Verificar: búsqueda funciona, debounce es fluido (300ms), resaltado es visible.
  - Smoke visual: buscar una tarea por título, verificar que se filtra y resalta.
  - Verificar que la búsqueda respeta el filtro de área y sprint activos.
  - `npx tsc --noEmit`, `npx vitest run`.

### Fase 2 — Filtros enriquecidos (HU-02)

- [x] T1710 `TasksTab.tsx`: agregar dropdown de filtros junto al input de búsqueda.
  - Usar componente `DropdownMenu` de shadcn/ui.
  - Botón: "Filtros" con icono Filter (lucide-react).
  - Badge contador de filtros activos (si hay alguno).
- [x] T1711 `TasksTab.tsx`: implementar filtro por prioridad dentro del dropdown.
  - Select con opciones: Todas, Alta, Media, Baja.
  - Persistir en URL: `?priority=high`.
- [x] T1712 `TasksTab.tsx`: implementar filtro por assignee dentro del dropdown.
  - Select con opciones: Todos, + lista de personas del proyecto.
  - Persistir en URL: `?assignee=<personId>`.
- [x] T1713 `TasksTab.tsx`: implementar filtro por fecha dentro del dropdown.
  - Select con opciones: Todas, Vencidas, Por vencer (3 días), Esta semana.
  - Persistir en URL: `?date=overdue|due-soon|this-week`.
- [x] T1714 `TasksTab.tsx`: implementar filtro por tags dentro del dropdown.
  - Multi-select con opciones: lista de tags existentes en el proyecto.
  - Persistir en URL: `?tags=tag1,tag2`.
- [x] T1715 `TasksTab.tsx`: agregar botón "Limpiar filtros" dentro del dropdown.
  - Resetear todos los filtros (prioridad, assignee, fecha, tags).
  - Solo visible si hay al menos un filtro activo.
- [x] T1716 `TasksTab.tsx`: combinar todos los filtros con AND en `filteredTasks`.
  - Orden de aplicación: búsqueda → prioridad → assignee → fecha → tags → área → sprint → archivadas.
  - Usar `useMemo` para memoizar el resultado.
- [x] T1717 Verificar: filtros se combinan correctamente, se persisten en URL, se pueden compartir links.
  - Smoke visual: aplicar múltiples filtros, verificar que se combinan.
  - Verificar que el badge contador muestra el número correcto de filtros activos.
  - `npx tsc --noEmit`, `npx vitest run`.

### Fase 3 — Vista "Mis tareas" (HU-03)

- [x] T1720 Crear directorio `src/features/my-tasks/`.
- [x] T1721 `src/features/my-tasks/MyTasksPage.tsx`: crear componente principal.
  - Obtener todas las tareas asignadas al usuario actual (filtrado por `assigneeId`).
  - Agrupar por proyecto (colapsable).
  - Mostrar: título, proyecto, área, prioridad, fecha límite, estado.
- [x] T1722 `src/features/my-tasks/MyTasksPage.tsx`: agregar filtros (estado, prioridad, fecha).
  - Select de estado: Todos, Todo, Doing, Blocked, Done.
  - Select de prioridad: Todas, Alta, Media, Baja.
  - Select de fecha: Todas, Vencidas, Por vencer, Esta semana.
- [x] T1723 `src/features/my-tasks/MyTasksPage.tsx`: implementar click en tarea para abrir drawer.
  - Reutilizar `TaskDetailDrawer` de Kanban.
  - Pasar `project` y `task` al drawer.
- [x] T1724 `src/features/my-tasks/components/ProjectTaskGroup.tsx`: crear componente para grupo de tareas por proyecto.
  - Header colapsable con nombre del proyecto y contador de tareas.
  - Lista de tareas con estado, título, área, prioridad, fecha.
- [x] T1725 `src/features/my-tasks/components/MyTaskRow.tsx`: crear componente para fila de tarea.
  - Mostrar: checkbox (estado), título, área, prioridad, fecha, estado.
  - Click en fila abre drawer.
- [x] T1726 `src/routes/`: agregar ruta `/my-tasks` en el router.
  - Ruta: `<Route path="/my-tasks" element={<MyTasksPage />} />`.
  - Agregar en `src/routes/paths.ts` como `ROUTES.myTasks = "/my-tasks"`.
- [x] T1727 `src/components/layout/Sidebar.tsx` (o equivalente): agregar link "Mis tareas" en el menú lateral.
  - Icono: UserCheck o CheckSquare (lucide-react).
  - Posición: después de "Proyectos".
- [x] T1728 Verificar: vista muestra tareas asignadas, agrupación funciona, click abre drawer.
  - Smoke visual: crear tareas en múltiples proyectos con assignee, verificar que aparecen en "Mis tareas".
  - Verificar que los filtros funcionan correctamente.
  - `npx tsc --noEmit`, `npx vitest run`.

### Fase 4 — Tags en UI (HU-04)

- [x] T1730 `TaskDetailDrawer.tsx`: agregar sección "Tags" con input de tags.
  - Input con autocomplete desde tags existentes en el proyecto.
  - Mostrar tags actuales como badges con botón de eliminar (✕).
- [x] T1731 `TaskDetailDrawer.tsx`: implementar lógica de agregar/eliminar tags.
  - Agregar: escribir tag + Enter o click en sugerencia.
  - Eliminar: click en ✕ del badge.
  - Actualizar `task.tags` y llamar a `handleUpdateTask`.
- [x] T1732 `TaskDetailDrawer.tsx`: implementar autocomplete de tags.
  - Obtener todos los tags existentes en el proyecto (de todas las tareas).
  - Filtrar sugerencias por input del usuario.
  - Mostrar sugerencias en dropdown debajo del input.
- [x] T1733 `TaskCard.tsx`: mostrar tags como badges en la card.
  - Mostrar hasta 3 tags (si hay más, mostrar "+2" o similar).
  - Usar componente `Badge` de shadcn/ui con variante "outline".
  - Truncar texto largo con `truncate max-w-[100px]`.
- [x] T1734 Verificar: tags se guardan, se muestran en card y drawer, se pueden filtrar.
  - Smoke visual: agregar tags a una tarea, verificar que aparecen en la card.
  - Verificar que el filtro de tags (Fase 2) funciona con los tags agregados.
  - `npx tsc --noEmit`, `npx vitest run`.

**Checkpoint Wave 1:** `npm run build`, smoke visual de HU-01 a HU-04, actualizar memoria del proyecto.

---

## Wave 2 — Mejoras de UX en Kanban y productividad

### Fase 5 — Indicadores visuales prominentes (HU-05)

- [x] T1740 `TaskCard.tsx`: agregar indicador visual para tareas bloqueadas.
  - Borde izquierdo rojo (4px): `border-l-4 border-l-red-500`.
  - Icono de candado (Lock) visible en la card.
- [x] T1741 `TaskCard.tsx`: agregar indicador visual para tareas vencidas.
  - Fondo rojo suave: `bg-red-50 dark:bg-red-950/20`.
  - Icono de alerta (AlertCircle) visible junto a la fecha.
- [x] T1742 `TaskCard.tsx`: agregar indicador visual para tareas por vencer (3 días).
  - Fondo ámbar suave: `bg-amber-50 dark:bg-amber-950/20`.
  - Solo aplicar si la tarea no está vencida (d >= 0 && d <= 3).
- [x] T1743 `TaskDetailDrawer.tsx`: aplicar mismos indicadores visuales en el drawer.
  - Consistencia visual entre card y drawer.
- [x] T1744 Verificar: indicadores son visibles y consistentes.
  - Smoke visual: crear tareas bloqueadas, vencidas y por vencer, verificar indicadores.
  - `npx tsc --noEmit`, `npx vitest run`.

### Fase 6 — Vista de lista en Kanban (HU-06)

- [x] T1750 `TasksTab.tsx`: agregar toggle "Kanban / Lista" en la barra superior.
  - Botones: "Kanban" y "Lista" (uno activo, otro inactivo).
  - Icono: LayoutGrid (Kanban) y List (Lista) de lucide-react.
- [x] T1751 `TasksTab.tsx`: agregar estado `viewMode` con persistencia en localStorage.
  - Key: `kanban-view-mode`.
  - Valores: `"kanban" | "list"`.
  - Default: `"kanban"`.
- [x] T1752 Crear componente `src/features/projects/components/kanban/KanbanListView.tsx`.
  - Tabla con columnas: Estado, Título, Área, Prioridad, Assignee, Fecha.
  - Cada fila es clickable y abre el drawer de detalle.
  - Respetar filtros y búsqueda.
- [x] T1753 `KanbanListView.tsx`: implementar ordenamiento por columnas.
  - Click en header de columna ordena ascendente/descendente.
  - Icono de flecha (ArrowUp/ArrowDown) en header.
- [x] T1754 `TasksTab.tsx`: renderizar condicionalmente Kanban o Lista según `viewMode`.
  - Si `viewMode === "kanban"`: renderizar `KanbanBoard` (actual).
  - Si `viewMode === "list"`: renderizar `KanbanListView`.
- [x] T1755 Verificar: toggle funciona, vista de lista muestra todas las columnas, click abre drawer.
  - Smoke visual: alternar entre Kanban y Lista, verificar que los datos son consistentes.
  - Verificar que los filtros y la búsqueda funcionan en ambas vistas.
  - `npx tsc --noEmit`, `npx vitest run`.

### Fase 7 — Atajos de teclado globales (HU-07)

- [x] T1760 Crear hook `src/hooks/useKeyboardShortcuts.ts`.
  - Registrar atajos globales con `document.addEventListener("keydown", ...)`.
  - Soporte para Ctrl/Cmd + tecla.
  - Soporte para combinaciones (Ctrl+Shift+tecla).
- [x] T1761 Crear contexto `src/contexts/KeyboardShortcutsContext.tsx` para gestionar atajos.
  - Proveer funciones: `openCommandPalette()`, `openQuickAdd()`, `archiveSelectedTask()`, `openShortcutsModal()`.
  - Consumir en `App.tsx` o layout principal.
- [x] T1762 `src/App.tsx` (o layout): registrar atajos globales.
  - `Ctrl/Cmd + K`: abrir búsqueda global (command palette).
  - `Ctrl/Cmd + N`: crear nueva tarea (en el proyecto actual).
  - `Ctrl/Cmd + Shift + A`: archivar tarea seleccionada.
  - `Ctrl/Cmd + /`: mostrar modal de atajos.
- [x] T1763 Crear componente `src/components/KeyboardShortcutsModal.tsx`.
  - Modal con lista de atajos disponibles.
  - Accesible desde el menú de ayuda (icono "?" o "Atajos").
- [x] T1764 Verificar: atajos funcionan, modal muestra lista de atajos.
  - Smoke visual: probar cada atajo, verificar que funciona.
  - Verificar que el modal de atajos es accesible desde el menú de ayuda.
  - `npx tsc --noEmit`, `npx vitest run`.

### Fase 8 — Quick add de tareas (HU-08)

- [x] T1770 Crear componente `src/components/QuickAddButton.tsx`.
  - Botón "+" flotante en la esquina inferior derecha.
  - Posición: `fixed bottom-6 right-6`.
  - Icono: Plus (lucide-react).
  - Visible en todas las vistas (excepto modal/drawer abiertos).
- [x] T1771 Crear componente `src/components/QuickAddTask.tsx`.
  - Modal minimalista con campos: título, proyecto, área, prioridad.
  - Botones: "Cancelar" y "Crear y editar".
  - Enter crea la tarea y la deja abierta para editar más detalles.
  - Escape cierra el modal sin crear.
- [x] T1772 `QuickAddTask.tsx`: implementar lógica de creación de tarea.
  - Validar que el título no esté vacío.
  - Crear tarea con `ops.createTask()`.
  - Abrir drawer de detalle después de crear.
- [x] T1773 `src/App.tsx` (o layout): renderizar `QuickAddButton` y `QuickAddTask`.
  - Estado: `isQuickAddOpen` para controlar visibilidad del modal.
  - Conectar con atajo de teclado `Ctrl/Cmd + N`.
- [x] T1774 Verificar: botón es visible, modal abre/cierra, tarea se crea correctamente.
  - Smoke visual: hacer click en "+", llenar campos, crear tarea, verificar que aparece en el Kanban.
  - Verificar que Enter crea la tarea y abre el drawer.
  - `npx tsc --noEmit`, `npx vitest run`.

### Fase 9 — Daily Standup (HU-09)

- [x] T1780 Crear directorio `src/features/daily/`.
- [x] T1781 `src/features/daily/DailyStandupPage.tsx`: crear componente principal.
  - Tres secciones: "Hecho recientemente", "Para hoy", "Bloqueado".
  - Fecha actual en el header.
- [x] T1782 `DailyStandupPage.tsx`: implementar sección "Hecho recientemente".
  - Tareas completadas en las últimas 24h (status = "done", updatedAt >= now - 24h).
  - Mostrar: título, proyecto, área, prioridad.
- [x] T1783 `DailyStandupPage.tsx`: implementar sección "Para hoy".
  - Tareas con dueDate = hoy.
  - Mostrar: título, proyecto, área, prioridad, estado.
- [x] T1784 `DailyStandupPage.tsx`: implementar sección "Bloqueado".
  - Tareas con status = "blocked".
  - Mostrar: título, proyecto, área, prioridad, fecha de bloqueo.
- [x] T1785 `DailyStandupPage.tsx`: implementar click en tarea para abrir drawer.
  - Reutilizar `TaskDetailDrawer` de Kanban.
  - Pasar `project` y `task` al drawer.
- [x] T1786 `src/routes/`: agregar ruta `/daily` en el router.
  - Ruta: `<Route path="/daily" element={<DailyStandupPage />} />`.
  - Agregar en `src/routes/paths.ts` como `ROUTES.daily = "/daily"`.
- [x] T1787 `src/components/layout/Sidebar.tsx` (o equivalente): agregar link "Daily Standup" en el menú lateral.
  - Icono: Calendar o Sun (lucide-react).
  - Posición: después de "Mis tareas".
- [x] T1788 Verificar: vista muestra tareas recientes, de hoy y bloqueadas.
  - Smoke visual: crear tareas con diferentes estados y fechas, verificar que aparecen en las secciones correctas.
  - Verificar que click en tarea abre el drawer.
  - `npx tsc --noEmit`, `npx vitest run`.

**Checkpoint Wave 2:** `npm run build`, smoke visual de HU-05 a HU-09, actualizar memoria del proyecto.

---

## Wave 3 — Estimación, WIP limits y Dashboard enriquecido

### Fase 10 — Estimación y subtareas (HU-10, HU-11)

- [x] T1790 `src/domain/schemas/project.ts`: agregar campo `estimate` a TaskSchema.
  - Tipo: `z.number().nullable().default(null)`.
  - Significa horas o story points.
- [x] T1791 `src/domain/schemas/project.ts`: crear SubtaskSchema.
  - Campos: id, title, done, createdAt, updatedAt.
  - Agregar campo `subtasks` a TaskSchema: `z.array(SubtaskSchema).default([])`.
- [x] T1792 `src/domain/migrations.ts`: implementar migración v5 → v6.
  - Agregar `estimate: null` a todas las tareas existentes.
  - Agregar `subtasks: []` a todas las tareas existentes.
  - Incrementar `schemaVersion` a 6.
- [x] T1793 `TaskDetailDrawer.tsx`: agregar input de estimación.
  - Input numérico con label "Estimación (horas)".
  - Placeholder: "Ej: 8".
  - Actualizar `task.estimate` y llamar a `handleUpdateTask`.
- [x] T1794 `TaskDetailDrawer.tsx`: agregar sección de subtareas.
  - Lista de subtareas con checkbox (done).
  - Input para agregar nueva subtarea.
  - Botón para eliminar subtarea.
- [x] T1795 `TaskCard.tsx`: mostrar estimación en la card (si está definida).
  - Icono: Clock (lucide-react).
  - Formato: "8h" o "8sp" (story points).
- [x] T1796 `TaskCard.tsx`: mostrar progreso de subtareas en la card.
  - Formato: "2/5" (done/total).
  - Solo mostrar si hay subtareas.
- [x] T1797 `OverviewTab.tsx`: mostrar suma de estimaciones por estado.
  - Nueva fila: "Estimación total" con suma de `task.estimate` agrupada por status.
- [x] T1798 Verificar: campos se guardan, se muestran, migración funciona.
  - Smoke visual: agregar estimación y subtareas a una tarea, verificar que se muestran en la card.
  - Verificar que la migración v5 → v6 funciona sin pérdida de datos.
  - `npx tsc --noEmit`, `npx vitest run`.

### Fase 11 — WIP limits (HU-12)

- [x] T1800 `src/domain/schemas/project.ts`: agregar campo `wipLimits` a ProjectSchema.
  - Tipo: objeto con keys `todo`, `doing`, `blocked`, `done`.
  - Cada key: `z.number().nullable().default(null)`.
- [x] T1801 `src/domain/migrations.ts`: agregar `wipLimits` a proyectos existentes (migración v6 → v7).
  - Default: `{ todo: null, doing: null, blocked: null, done: null }`.
- [x] T1802 Crear componente `src/features/projects/components/kanban/WipLimitConfig.tsx`.
  - Modal o drawer para configurar WIP limits por columna.
  - Inputs numéricos para cada columna (todo, doing, blocked, done).
  - Botón "Guardar" para actualizar `project.wipLimits`.
- [x] T1803 `TasksTab.tsx`: agregar botón "Configurar WIP limits" en la barra superior.
  - Icono: Settings (lucide-react).
  - Abre `WipLimitConfig`.
- [x] T1804 `KanbanColumn.tsx`: mostrar indicador visual cuando se supera el WIP limit.
  - Si `taskCount > wipLimit`: fondo ámbar (`bg-amber-50 dark:bg-amber-950/20`).
  - Mostrar contador: "12/10" (taskCount/wipLimit).
- [x] T1805 Verificar: WIP limits se guardan, indicador es visible.
  - Smoke visual: configurar WIP limit de 5 en "Doing", agregar 6 tareas, verificar indicador.
  - `npx tsc --noEmit`, `npx vitest run`.

### Fase 12 — Operaciones bulk (HU-13)

- [ ] T1810 `TaskCard.tsx`: agregar checkbox de selección (aparece al hacer hover o con tecla Shift).
  - Checkbox en la esquina superior izquierda de la card.
  - Visible al hacer hover o cuando se mantiene presionada la tecla Shift.
- [ ] T1811 `TasksTab.tsx`: agregar estado `selectedTaskIds` (Set<string>).
  - Funciones: `toggleTaskSelection(id)`, `selectAll()`, `clearSelection()`.
- [ ] T1812 `TasksTab.tsx`: agregar barra de acciones bulk en la parte superior.
  - Visible cuando hay al menos una tarea seleccionada.
  - Acciones: "Mover a..." (dropdown), "Archivar", "Eliminar".
  - Mostrar contador: "3 tareas seleccionadas".
- [ ] T1813 `TasksTab.tsx`: implementar acción "Mover a...".
  - Dropdown con opciones: Todo, Doing, Blocked, Done.
  - Al seleccionar, actualizar `task.status` de todas las tareas seleccionadas.
- [ ] T1814 `TasksTab.tsx`: implementar acción "Archivar".
  - Confirmación: "¿Archivar 3 tareas?".
  - Actualizar `task.archived = true` de todas las tareas seleccionadas.
- [ ] T1815 `TasksTab.tsx`: implementar acción "Eliminar".
  - Confirmación: "¿Eliminar 3 tareas? Esta acción no se puede deshacer".
  - Eliminar todas las tareas seleccionadas.
- [ ] T1816 Verificar: selección funciona, operaciones bulk se ejecutan correctamente.
  - Smoke visual: seleccionar 3 tareas, moverlas a "Done", verificar que se movieron.
  - Verificar que las confirmaciones funcionan correctamente.
  - `npx tsc --noEmit`, `npx vitest run`.

### Fase 13 — Dashboard enriquecido (HU-14, HU-15, HU-16)

- [ ] T1820 `DashboardPage.tsx`: agregar drill-down en KPIs.
  - Click en "Proyectos activos" → navegar a `/projects?status=active`.
  - Click en "Vencidos" → navegar a `/projects?health=red` (o vista de tareas vencidas).
  - Click en "Estancados" → navegar a `/projects?health=amber` (o vista de proyectos estancados).
- [ ] T1821 `DashboardPage.tsx`: agregar drill-down en HealthCard.
  - Click en cada fila (verde, ámbar, rojo) → navegar a `/projects?health=<color>`.
- [ ] T1822 Instalar librería de gráficos (si no está instalada).
  - Opción recomendada: Recharts (React-friendly, buen bundle size).
  - Alternativa: Chart.js con react-chartjs-2.
- [ ] T1823 Crear componente `src/features/dashboard/TrendChart.tsx`.
  - Gráfico de líneas con la evolución de la salud RAG (últimos 30 días).
  - Eje X: fechas (últimos 30 días).
  - Eje Y: número de proyectos.
  - 3 líneas: verde, ámbar, rojo.
- [ ] T1824 `TrendChart.tsx`: implementar cálculo de datos históricos.
  - Obtener datos del historial de actividad (si está disponible).
  - Si no hay historial, mostrar mensaje "Datos insuficientes".
- [ ] T1825 `DashboardPage.tsx`: agregar `TrendChart` debajo de los KPIs.
  - Título: "Tendencia de salud (últimos 30 días)".
- [ ] T1826 Crear componente `src/features/dashboard/WorkloadCard.tsx`.
  - Lista de personas con: nombre, nº de tareas asignadas, suma de estimaciones.
  - Gráfico de barras con la distribución de carga.
- [ ] T1827 `WorkloadCard.tsx`: implementar cálculo de carga de trabajo.
  - Obtener todas las tareas asignadas a cada persona.
  - Calcular: nº de tareas, suma de `task.estimate`.
- [ ] T1828 `DashboardPage.tsx`: agregar `WorkloadCard` en la grid de cards.
  - Título: "Carga de trabajo".
- [ ] T1829 Verificar: drill-down funciona, gráficos muestran datos, carga de trabajo es precisa.
  - Smoke visual: hacer click en KPIs, verificar que navega a la vista correcta.
  - Verificar que los gráficos muestran datos (si hay historial).
  - Verificar que la carga de trabajo muestra las personas correctas.
  - `npx tsc --noEmit`, `npx vitest run`.

**Checkpoint Wave 3:** `npm run build`, smoke visual de HU-10 a HU-16, actualizar memoria del proyecto.

---

## Explícitamente fuera de este tasks.md

- Multiusuario y colaboración en tiempo real.
- Diagramas de Gantt / dependencias entre tareas.
- Time-tracking (registro de tiempo real).
- Integración con herramientas externas (Slack, GitHub, etc.).
- App móvil nativa.
- Exportación de reportes en PDF/Excel.
- Tour guiado de onboarding.

---

## Verificación por fase

Tras cada fase: `npx tsc --noEmit`, `npx vitest run`, smoke visual manual en dev server de los
casos listados. No se avanza con typecheck o tests rotos, ni sin confirmación visual.

Al cerrar cada wave: `npm run build` y actualización de la memoria del proyecto con el resumen de la wave.

Al cerrar el spec completo: actualizar README.md con el estado de 017.
