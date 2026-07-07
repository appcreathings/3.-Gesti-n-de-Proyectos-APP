# Plan Técnico — Mejora integral de la experiencia PM (017)

- **Feature:** 017-pm-experience-enhancement
- **Constitución:** alineado con IV (diseño limpio), V (simplicidad), VI (accesibilidad).
- **Depende de:** specs 010-016 (Kanban completo)

## Alcance técnico

Este spec se organiza en 3 waves incrementales. Cada wave es usable independientemente y mejora aspectos diferentes de la experiencia PM.

## Wave 1 — Filtros, búsqueda y vista "Mis tareas"

### HU-01: Búsqueda por texto en Kanban

**Diseño del input de búsqueda:**

```
┌─────────────────────────────────────────────────────────────┐
│ [🔍 Buscar tareas...]  [Filtros ▼]  [Área ▼]  [Sprint ▼]   │
└─────────────────────────────────────────────────────────────┘
```

- Input con icono de lupa (Search de lucide-react).
- Placeholder: "Buscar tareas...".
- Debounce de 300ms para evitar búsquedas en cada keystroke.
- Búsqueda case-insensitive en `task.title` y `task.description`.
- Resaltado de coincidencias con `<mark>` o clase `bg-yellow-200 dark:bg-yellow-800`.

**Implementación:**

```tsx
const [searchQuery, setSearchQuery] = useState("");
const debouncedQuery = useDebounce(searchQuery, 300);

const filteredTasks = useMemo(() => {
  if (!debouncedQuery) return tasksInScope;
  const query = debouncedQuery.toLowerCase();
  return tasksInScope.filter((t) =>
    t.title.toLowerCase().includes(query) ||
    t.description.toLowerCase().includes(query)
  );
}, [tasksInScope, debouncedQuery]);
```

**Hook de debounce (reutilizable):**

```tsx
// src/hooks/useDebounce.ts
import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

**Resaltado de coincidencias:**

```tsx
function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}
```

### HU-02: Filtros enriquecidos en Kanban

**Diseño del dropdown de filtros:**

```
┌─────────────────────────────────────────────────────────────┐
│ [🔍 Buscar...]  [Filtros ▼]  [Área ▼]  [Sprint ▼]          │
│                       ┌───────────────────────────────────┐ │
│                       │ Prioridad: [Todas ▼]              │ │
│                       │ Assignee: [Todos ▼]               │ │
│                       │ Fecha: [Todas ▼]                  │ │
│                       │ Tags: [Seleccionar...]            │ │
│                       │ [Limpiar filtros]                 │ │
│                       └───────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

- Dropdown con múltiples selects (Prioridad, Assignee, Fecha, Tags).
- Los filtros se combinan con AND (todas las condiciones deben cumplirse).
- Los filtros se persisten en la URL (searchParams) para compartir links.
- Botón "Limpiar filtros" para resetear todos los filtros.

**Implementación de filtros en URL:**

```tsx
const searchParams = new URLSearchParams(location.search);
const priorityFilter = searchParams.get("priority");
const assigneeFilter = searchParams.get("assignee");
const dateFilter = searchParams.get("date");
const tagsFilter = searchParams.get("tags")?.split(",") || [];

function setFilter(key: string, value: string | null) {
  const next = new URLSearchParams(searchParams);
  if (value) next.set(key, value);
  else next.delete(key);
  setSearchParams(next, { replace: true });
}
```

**Lógica de filtrado:**

```tsx
const filteredTasks = useMemo(() => {
  let result = tasksInScope;

  // Búsqueda por texto
  if (debouncedQuery) {
    const query = debouncedQuery.toLowerCase();
    result = result.filter((t) =>
      t.title.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
    );
  }

  // Filtro por prioridad
  if (priorityFilter) {
    result = result.filter((t) => t.priority === priorityFilter);
  }

  // Filtro por assignee
  if (assigneeFilter) {
    result = result.filter((t) => t.assigneeId === assigneeFilter);
  }

  // Filtro por fecha
  if (dateFilter) {
    const today = new Date();
    const threeDaysFromNow = addDays(today, 3);

    switch (dateFilter) {
      case "overdue":
        result = result.filter((t) => t.dueDate && new Date(t.dueDate) < today);
        break;
      case "due-soon":
        result = result.filter((t) => {
          if (!t.dueDate) return false;
          const due = new Date(t.dueDate);
          return due >= today && due <= threeDaysFromNow;
        });
        break;
      case "this-week":
        const weekFromNow = addDays(today, 7);
        result = result.filter((t) => {
          if (!t.dueDate) return false;
          const due = new Date(t.dueDate);
          return due >= today && due <= weekFromNow;
        });
        break;
    }
  }

  // Filtro por tags
  if (tagsFilter.length > 0) {
    result = result.filter((t) =>
      tagsFilter.some((tag) => t.tags.includes(tag))
    );
  }

  return result;
}, [tasksInScope, debouncedQuery, priorityFilter, assigneeFilter, dateFilter, tagsFilter]);
```

### HU-03: Vista "Mis tareas" cross-proyecto

**Diseño de la vista:**

```
┌─────────────────────────────────────────────────────────────┐
│ Mis tareas                                        [Filtros] │
├─────────────────────────────────────────────────────────────┤
│ ▼ Proyecto Alpha (5 tareas)                                 │
│   ┌───────────────────────────────────────────────────────┐ │
│   │ [ ] Diseñar landing page        Alta    15 jul  Doing │ │
│   │ [ ] Revisar copy                Media   18 jul  Todo  │ │
│   └───────────────────────────────────────────────────────┘ │
│ ▼ Proyecto Beta (3 tareas)                                  │
│   ┌───────────────────────────────────────────────────────┐ │
│   │ [ ] Configurar API              Alta    12 jul  Done  │ │
│   └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

- Nueva ruta `/my-tasks` accesible desde el menú lateral.
- Lista de tareas agrupadas por proyecto (colapsable).
- Cada tarea muestra: título, proyecto, área, prioridad, fecha límite, estado.
- Click en tarea abre el drawer de detalle.
- Filtros: estado, prioridad, fecha.

**Implementación:**

```tsx
// src/features/my-tasks/MyTasksPage.tsx
import { useMemo, useState } from "react";
import { useDataStore } from "@/store/useDataStore";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/ui/Panel";
import type { Task, Project } from "@/domain/schemas";

export function MyTasksPage() {
  const projects = useDataStore((s) => s.projects);
  const currentUserId = useAppStore((s) => s.currentUserId); // Asumiendo que existe

  // Obtener todas las tareas asignadas al usuario actual
  const myTasksByProject = useMemo(() => {
    const result = new Map<string, { project: Project; tasks: Task[] }>();

    for (const project of projects) {
      const myTasks = project.tasks.filter((t) => t.assigneeId === currentUserId);
      if (myTasks.length > 0) {
        result.set(project.id, { project, tasks: myTasks });
      }
    }

    return result;
  }, [projects, currentUserId]);

  return (
    <div>
      <PageHeader label="Mis tareas" title="Tareas asignadas" />
      <div className="space-y-4">
        {Array.from(myTasksByProject.entries()).map(([projectId, { project, tasks }]) => (
          <ProjectTaskGroup key={projectId} project={project} tasks={tasks} />
        ))}
      </div>
    </div>
  );
}
```

### HU-04: Tags en UI

**Diseño del input de tags:**

```
┌─────────────────────────────────────────────────────────────┐
│ Tags: [frontend ✕] [urgent ✕] [agregar tag...]              │
│         ┌─────────────────────────────────────────────────┐ │
│         │ frontend                                        │ │
│         │ backend                                         │ │
│         │ urgent                                          │ │
│         │ design                                          │ │
│         └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

- Input con autocomplete desde tags existentes en el proyecto.
- Los tags se muestran como badges con botón de eliminar (✕).
- Los tags se guardan en `task.tags` (array de strings).

**Implementación:**

```tsx
// En TaskDetailDrawer.tsx
const allTags = useMemo(() => {
  const tags = new Set<string>();
  for (const task of project.tasks) {
    for (const tag of task.tags) {
      tags.add(tag);
    }
  }
  return Array.from(tags);
}, [project.tasks]);

const [tagInput, setTagInput] = useState("");
const [showTagSuggestions, setShowTagSuggestions] = useState(false);

const filteredTags = allTags.filter(
  (tag) => tag.toLowerCase().includes(tagInput.toLowerCase()) && !task.tags.includes(tag)
);

function addTag(tag: string) {
  if (!task.tags.includes(tag)) {
    handleUpdateTask({ ...task, tags: [...task.tags, tag] });
  }
  setTagInput("");
  setShowTagSuggestions(false);
}

function removeTag(tag: string) {
  handleUpdateTask({ ...task, tags: task.tags.filter((t) => t !== tag) });
}
```

---

## Wave 2 — Mejoras de UX en Kanban y productividad

### HU-05: Indicadores visuales prominentes

**Diseño de indicadores:**

```
┌─────────────────────────────────────────────────────────────┐
│ 🔴 Bloqueada                                                │
│ ┃ ┌───────────────────────────────────────────────────────┐ │
│ ┃ │ 🔴 Alta    [Área] [Sprint]                            │ │
│ ┃ │ Título de la tarea                                    │ │
│ ┃ │ Resumen corto                                         │ │
│ ┃ │ 👤 Juan  📅 15 jul (vencida)  💬 3                    │ │
│ ┃ │ [←] [→] [🔒] [⋮] [🗑️]                                │ │
│ ┃ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ 🟡 Por vencer (3 días)                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🟡 Media   [Área] [Sprint]                              │ │
│ │ Título de la tarea                                      │ │
│ │ 👤 Juan  📅 18 jul  💬 1                                │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

- Tareas bloqueadas: borde izquierdo rojo (4px) + icono de candado (Lock) visible.
- Tareas vencidas: fondo rojo suave (`bg-red-50 dark:bg-red-950/20`) + icono de alerta (AlertCircle).
- Tareas por vencer (3 días): fondo ámbar suave (`bg-amber-50 dark:bg-amber-950/20`).

**Implementación:**

```tsx
// En TaskCard.tsx
const d = daysUntil(task.dueDate);
const overdue = task.status !== "done" && d !== null && d < 0;
const dueSoon = task.status !== "done" && d !== null && d >= 0 && d <= 3;
const isBlocked = task.status === "blocked";

const cardClassName = cn(
  "relative group flex flex-col rounded-lg border p-3 transition-colors",
  isBlocked && "border-l-4 border-l-red-500",
  overdue && "bg-red-50 dark:bg-red-950/20",
  dueSoon && !overdue && "bg-amber-50 dark:bg-amber-950/20",
  // ... otros estilos
);
```

### HU-06: Vista de lista en Kanban

**Diseño de la vista de lista:**

```
┌─────────────────────────────────────────────────────────────┐
│ [Kanban] [Lista]  [🔍 Buscar...]  [Filtros ▼]               │
├─────────────────────────────────────────────────────────────┤
│ Estado    │ Título              │ Área    │ Prioridad │ ... │
├───────────┼─────────────────────┼─────────┼───────────┼─────┤
│ Todo      │ Diseñar landing     │ Diseño  │ Alta      │ ... │
│ Doing     │ Revisar copy        │ Mkt     │ Media     │ ... │
│ Blocked   │ Configurar API      │ Dev     │ Alta      │ ... │
│ Done      │ Deploy inicial      │ Dev     │ Baja      │ ... │
└─────────────────────────────────────────────────────────────┘
```

- Toggle "Kanban / Lista" en la barra superior.
- Vista de lista: tabla con columnas (estado, título, área, prioridad, assignee, fecha).
- Click en fila abre el drawer de detalle.
- La preferencia se persiste en localStorage.

**Implementación:**

```tsx
// En TasksTab.tsx
const [viewMode, setViewMode] = useState<"kanban" | "list">(() => {
  const saved = localStorage.getItem("kanban-view-mode");
  return (saved as "kanban" | "list") || "kanban";
});

function toggleViewMode() {
  const next = viewMode === "kanban" ? "list" : "kanban";
  setViewMode(next);
  localStorage.setItem("kanban-view-mode", next);
}

// En el render:
{viewMode === "kanban" ? (
  <KanbanBoard tasks={filteredTasks} />
) : (
  <KanbanListView tasks={filteredTasks} />
)}
```

### HU-07: Atajos de teclado globales

**Diseño del modal de atajos:**

```
┌─────────────────────────────────────────────────────────────┐
│ Atajos de teclado                                     [✕]   │
├─────────────────────────────────────────────────────────────┤
│ Ctrl/Cmd + K        Buscar global                           │
│ Ctrl/Cmd + N        Nueva tarea                             │
│ Ctrl/Cmd + Shift+A  Archivar tarea seleccionada             │
│ Ctrl/Cmd + /        Mostrar atajos                          │
└─────────────────────────────────────────────────────────────┘
```

- Hook `useKeyboardShortcuts` para registrar atajos globales.
- Modal de atajos accesible desde el menú de ayuda.

**Implementación:**

```tsx
// src/hooks/useKeyboardShortcuts.ts
import { useEffect } from "react";

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const key = [
        e.ctrlKey || e.metaKey ? "mod" : "",
        e.shiftKey ? "shift" : "",
        e.key.toLowerCase(),
      ]
        .filter(Boolean)
        .join("+");

      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

// Uso en App.tsx o layout principal:
useKeyboardShortcuts({
  "mod+k": () => openCommandPalette(),
  "mod+n": () => openQuickAdd(),
  "mod+shift+a": () => archiveSelectedTask(),
  "mod+/": () => openShortcutsModal(),
});
```

### HU-08: Quick add de tareas

**Diseño del botón flotante:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                                                             │
│                                                             │
│                                                    [＋]     │
└─────────────────────────────────────────────────────────────┘

Al hacer click:
┌─────────────────────────────────────────────────────────────┐
│ Nueva tarea                                           [✕]   │
├─────────────────────────────────────────────────────────────┤
│ Título: [________________________________]                  │
│ Proyecto: [Seleccionar ▼]                                   │
│ Área: [Seleccionar ▼]                                       │
│ Prioridad: [Media ▼]                                        │
│                                                             │
│ [Cancelar]  [Crear y editar]                                │
└─────────────────────────────────────────────────────────────┘
```

- Botón "+" flotante en la esquina inferior derecha.
- Modal minimalista con campos esenciales.
- Enter crea la tarea y la deja abierta para editar más detalles.
- Escape cierra el modal sin crear.

### HU-09: Vista "Daily Standup"

**Diseño de la vista:**

```
┌─────────────────────────────────────────────────────────────┐
│ Daily Standup                                    6 jul 2026 │
├─────────────────────────────────────────────────────────────┤
│ ✅ Hecho recientemente (últimas 24h)                        │
│   • Completé el diseño de la landing (Alpha)                │
│   • Revisé el copy del email (Beta)                         │
│                                                             │
│ 📋 Para hoy                                                 │
│   • Configurar API (Beta) - Alta                            │
│   • Deploy inicial (Beta) - Media                           │
│                                                             │
│ 🚧 Bloqueado                                                │
│   • Esperando aprobación del cliente (Alpha)                │
└─────────────────────────────────────────────────────────────┘
```

- Nueva ruta `/daily` accesible desde el menú lateral.
- Tres secciones: "Hecho recientemente", "Para hoy", "Bloqueado".
- Cada tarea muestra: título, proyecto, área, prioridad.

---

## Wave 3 — Estimación, WIP limits y Dashboard enriquecido

### HU-10: Estimación de esfuerzo

**Cambio de schema:**

```typescript
// En src/domain/schemas/project.ts
export const TaskSchema = z.object({
  // ... campos existentes
  estimate: z.number().nullable().default(null), // horas o story points
});
```

**Migración v3 → v4:**

```typescript
// En src/domain/migrations.ts
if (data.schemaVersion === 3) {
  // Agregar campo estimate a todas las tareas
  for (const project of data.projects) {
    for (const task of project.tasks) {
      if (task.estimate === undefined) {
        task.estimate = null;
      }
    }
  }
  data.schemaVersion = 4;
}
```

### HU-11: Subtareas/checklists embebidos

**Cambio de schema:**

```typescript
// En src/domain/schemas/project.ts
export const SubtaskSchema = z.object({
  id: Id,
  title: z.string(),
  done: z.boolean().default(false),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});

export const TaskSchema = z.object({
  // ... campos existentes
  subtasks: z.array(SubtaskSchema).default([]),
});
```

### HU-12: WIP limits por columna

**Cambio de schema:**

```typescript
// En src/domain/schemas/project.ts
export const ProjectSchema = z.object({
  // ... campos existentes
  wipLimits: z.object({
    todo: z.number().nullable().default(null),
    doing: z.number().nullable().default(null),
    blocked: z.number().nullable().default(null),
    done: z.number().nullable().default(null),
  }).default({ todo: null, doing: null, blocked: null, done: null }),
});
```

**Indicador visual en KanbanColumn:**

```tsx
// En KanbanColumn.tsx
const taskCount = tasks.length;
const wipLimit = project.wipLimits[columnId];
const isOverLimit = wipLimit !== null && taskCount > wipLimit;

<div className={cn(
  "rounded-lg p-4",
  isOverLimit && "bg-amber-50 dark:bg-amber-950/20"
)}>
  <h3 className="font-semibold">
    {columnLabel} ({taskCount}{wipLimit ? `/${wipLimit}` : ""})
  </h3>
  {/* ... */}
</div>
```

### HU-13: Operaciones bulk

**Diseño de selección bulk:**

```
┌─────────────────────────────────────────────────────────────┐
│ [✓] Seleccionar todas                                       │
├─────────────────────────────────────────────────────────────┤
│ [✓] Diseñar landing     [Mover a ▼] [Archivar] [Eliminar]  │
│ [ ] Revisar copy                                            │
│ [✓] Configurar API                                          │
└─────────────────────────────────────────────────────────────┘
```

- Checkbox en cada card (aparece al hacer hover o con tecla Shift).
- Barra de acciones bulk en la parte superior.
- Las operaciones bulk piden confirmación.

### HU-14: Drill-down en Dashboard

**Implementación:**

```tsx
// En DashboardPage.tsx
<Link to={`/projects?status=active`}>
  <StatTile label="Proyectos activos" value={stats.active} />
</Link>

<Link to={`/projects?health=red`}>
  <HealthCard byHealth={stats.byHealth} />
</Link>
```

### HU-15: Tendencias históricas en Dashboard

**Diseño del gráfico:**

```
┌─────────────────────────────────────────────────────────────┐
│ Tendencia de salud (últimos 30 días)                        │
├─────────────────────────────────────────────────────────────┤
│ 10 │                                                       │
│    │    ╱╲                                                 │
│  5 │   ╱  ╲    ╱╲                                          │
│    │  ╱    ╲  ╱  ╲                                         │
│  0 │_╱______╲╱____╲________________________________________│
│    └───────────────────────────────────────────────────────│
│     1    10    20    30                                    │
│                                                             │
│ ■ Verde  ■ Ámbar  ■ Rojo                                    │
└─────────────────────────────────────────────────────────────┘
```

- Gráfico de líneas con la evolución de la salud RAG.
- Los datos se calculan a partir del historial de actividad.

**Librería recomendada:** Recharts o Chart.js (verificar cuál ya está en el proyecto).

### HU-16: Vista de carga de trabajo por persona

**Diseño:**

```
┌─────────────────────────────────────────────────────────────┐
│ Carga de trabajo                                            │
├─────────────────────────────────────────────────────────────┤
│ Juan Pérez      │ ████████████░░░░░░░░ │ 12 tareas │ 40h   │
│ María García    │ ████████░░░░░░░░░░░░ │ 8 tareas  │ 24h   │
│ Carlos López    │ ██████████████████░░ │ 18 tareas │ 60h   │
└─────────────────────────────────────────────────────────────┘
```

- Lista de personas con: nombre, nº de tareas asignadas, suma de estimaciones.
- Gráfico de barras con la distribución de carga.

---

## Orden de implementación (3 waves, 13 fases)

### Wave 1 (4 fases)

**Fase 1 — Búsqueda por texto (HU-01):**
1. Crear hook `useDebounce`.
2. Agregar input de búsqueda en TasksTab.
3. Implementar filtrado por texto en título y descripción.
4. Agregar resaltado de coincidencias.
5. Verificar: búsqueda funciona, debounce es fluido, resaltado es visible.

**Fase 2 — Filtros enriquecidos (HU-02):**
6. Agregar dropdown de filtros en TasksTab.
7. Implementar filtros por prioridad, assignee, fecha, tags.
8. Persistir filtros en URL (searchParams).
9. Verificar: filtros se combinan correctamente, se persisten en URL.

**Fase 3 — Vista "Mis tareas" (HU-03):**
10. Crear feature `src/features/my-tasks/`.
11. Crear `MyTasksPage.tsx` con lista de tareas agrupadas por proyecto.
12. Agregar ruta `/my-tasks` en el router.
13. Agregar link en el menú lateral.
14. Verificar: vista muestra tareas asignadas, agrupación funciona, click abre drawer.

**Fase 4 — Tags en UI (HU-04):**
15. Agregar input de tags en TaskDetailDrawer.
16. Mostrar tags como badges en TaskCard.
17. Implementar autocomplete desde tags existentes.
18. Verificar: tags se guardan, se muestran, se pueden filtrar.

### Wave 2 (5 fases)

**Fase 5 — Indicadores visuales (HU-05):**
19. Agregar indicadores visuales en TaskCard (borde rojo para bloqueadas, fondos para vencidas/por vencer).
20. Agregar iconos de candado y alerta.
21. Verificar: indicadores son visibles y consistentes.

**Fase 6 — Vista de lista (HU-06):**
22. Agregar toggle "Kanban / Lista" en TasksTab.
23. Crear componente `KanbanListView.tsx`.
24. Persistir preferencia en localStorage.
25. Verificar: toggle funciona, vista de lista muestra todas las columnas, click abre drawer.

**Fase 7 — Atajos de teclado (HU-07):**
26. Crear hook `useKeyboardShortcuts`.
27. Registrar atajos globales (Ctrl+K, Ctrl+N, etc.).
28. Crear modal de atajos.
29. Verificar: atajos funcionan, modal muestra lista de atajos.

**Fase 8 — Quick add (HU-08):**
30. Crear botón "+" flotante.
31. Crear modal `QuickAddTask.tsx`.
32. Implementar creación rápida de tareas.
33. Verificar: botón es visible, modal abre/cierra, tarea se crea correctamente.

**Fase 9 — Daily Standup (HU-09):**
34. Crear feature `src/features/daily/`.
35. Crear `DailyStandupPage.tsx` con tres secciones.
36. Agregar ruta `/daily` en el router.
37. Agregar link en el menú lateral.
38. Verificar: vista muestra tareas recientes, de hoy y bloqueadas.

### Wave 3 (4 fases)

**Fase 10 — Estimación y subtareas (HU-10, HU-11):**
39. Agregar campos `estimate` y `subtasks` al schema.
40. Implementar migración v3 → v4.
41. Agregar inputs en TaskDetailDrawer.
42. Mostrar estimate y progreso de subtareas en TaskCard.
43. Verificar: campos se guardan, se muestran, migración funciona.

**Fase 11 — WIP limits (HU-12):**
44. Agregar campo `wipLimits` al schema.
45. Agregar input de WIP limit en la configuración del Kanban.
46. Mostrar indicador visual en KanbanColumn cuando se supera el límite.
47. Verificar: WIP limits se guardan, indicador es visible.

**Fase 12 — Operaciones bulk (HU-13):**
48. Agregar checkbox en TaskCard.
49. Agregar barra de acciones bulk en TasksTab.
50. Implementar operaciones bulk (mover, archivar, eliminar).
51. Verificar: selección funciona, operaciones bulk se ejecutan correctamente.

**Fase 13 — Dashboard enriquecido (HU-14, HU-15, HU-16):**
52. Agregar drill-down en DashboardPage (links en KPIs).
53. Implementar gráficos de tendencias (requiere librería de gráficos).
54. Crear vista de carga de trabajo por persona.
55. Verificar: drill-down funciona, gráficos muestran datos, carga de trabajo es precisa.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| La búsqueda puede ser lenta con cientos de tareas | Usar debounce (300ms) y memoización (useMemo). Si es necesario, implementar búsqueda web worker. |
| Los gráficos de tendencias requieren historial de actividad | Si no hay historial, mostrar mensaje "Datos insuficientes". Considerar snapshot diario de salud. |
| Las subtareas pueden complicar el schema | Mantener subtareas como lista plana, sin anidamiento profundo. Limitar a 2 niveles (tarea → subtarea). |
| Los WIP limits pueden ser ignorados | Mostrar indicadores visuales prominentes, pero no bloquear drag-and-drop. |
| Los atajos de teclado pueden conflictuar con el navegador | Usar `e.preventDefault()` y verificar que no haya conflictros con atajos del navegador. |
| La vista "Mis tareas" puede ser confusa si hay muchos proyectos | Agrupar por proyecto y permitir colapsar. Agregar búsqueda y filtros. |

## Estrategia de verificación por fase

Después de cada fase: `npx tsc --noEmit`, `npx vitest run`, smoke visual manual en dev server.
No se avanza a la fase siguiente sin confirmar que la fase actual no rompió nada.

Al cerrar cada wave: `npm run build` y actualización de la memoria del proyecto.

## Gates de la constitución

- ✅ **I Local-first:** sin cambios de persistencia ni red (excepto nuevos campos en schema).
- ✅ **II Esquema-contrato:** cambios de schema son no destructivos (defaults seguros, migración v3 → v4).
- ✅ **III Plantillas/Tipos:** no aplica directamente.
- ✅ **IV Diseño limpio:** mejora la UX sin agregar complejidad visual innecesaria.
- ✅ **V Simplicidad/incremental:** 3 waves independientes, cada una usable por sí sola.
- ✅ **VI Migrabilidad:** migración v3 → v4 es automática y no destructiva.
