# Plan Técnico — Unificación de edición en drawer + resize horizontal

- **Feature:** 016-kanban-drawer-unified-edit
- **Constitución:** alineado con IV (diseño limpio) y V (simplicidad). No requiere migración de schema.
- **Depende de:** 013, 014, 015 (ya implementados)

## Alcance técnico

Este spec unifica la experiencia de edición en el drawer, agrega resize horizontal, y corrige gaps identificados en el audit. No requiere cambios de schema ni migraciones.

**Archivos a modificar:**
- `TaskDetailDrawer.tsx` — agregar resize handle
- `TaskCard.tsx` — agregar menú contextual, deshabilitar drag con drawer abierto
- `TasksTab.tsx` — unificar edición en drawer, corregir filtro de archivadas
- `ActivityTab.tsx` — cambiar click en comentario para abrir `?detail=`
- `OverviewTab.tsx` — agregar tooltip para archivadas

**Sin dependencias nuevas.** Se reutilizan componentes existentes (DropdownMenu de shadcn/ui).

## Diseño del resize horizontal

### Handle de resize

```
┌─────────────────────────────────────┐
│ ┃  Detalle de tarea                 │  ← Handle de 4px en borde izquierdo
│ ┃                                   │
│ ┃  Título                           │
│ ┃  Resumen                          │
│ ┃  ...                              │
└─────────────────────────────────────┘
```

- Handle: `div` de 4px de ancho, `cursor-col-resize`, visible al hacer hover.
- Lógica: `onMouseDown` en handle, `onMouseMove`/`onMouseUp` en document.
- Cálculo: `newWidth = window.innerWidth - e.clientX`.
- Límites: min 320px, max 800px, default 400px.
- Persistencia: localStorage con key `kanban-drawer-width`.

### Implementación

```tsx
const [drawerWidth, setDrawerWidth] = useState(() => {
  const saved = localStorage.getItem("kanban-drawer-width");
  return saved ? parseInt(saved, 10) : 400;
});
const isResizingRef = useRef(false);

useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizingRef.current) return;
    const newWidth = window.innerWidth - e.clientX;
    const clamped = Math.min(800, Math.max(320, newWidth));
    setDrawerWidth(clamped);
  };
  
  const handleMouseUp = () => {
    if (isResizingRef.current) {
      isResizingRef.current = false;
      localStorage.setItem("kanban-drawer-width", String(drawerWidth));
    }
  };
  
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
  return () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };
}, [drawerWidth]);

// En el render:
<div
  style={{ width: drawerWidth }}
  className="fixed inset-y-0 right-0 z-50 flex flex-col ..."
>
  <div
    className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary"
    onMouseDown={(e) => {
      isResizingRef.current = true;
      e.preventDefault();
    }}
  />
  {/* Contenido del drawer */}
</div>
```

### Responsive

- En móvil (< md), el drawer ocupa 100% del viewport y no tiene resize.
- El handle solo se renderiza en desktop.

## Diseño del menú contextual en card

### Botón "..." en card

```
┌─────────────────────────────┐
│ 🔴 Alta    [Área] [Sprint]  │
│ Título de la tarea          │
│ Resumen corto               │
│ 👤 Juan  📅 15 jul  💬 3    │
│ [←] [→] [🔒] [⋮] [🗑️]      │  ← Botón "..." reemplaza [✏️]
└─────────────────────────────┘

Al hacer click en [⋮]:
┌──────────────────┐
│ ✏️ Editar        │  → Abre drawer
│ 📦 Archivar      │  → Archiva tarea
│ 🗑️ Eliminar      │  → Elimina con confirmación
└──────────────────┘
```

- Botón "..." (MoreVertical) reemplaza el botón de editar (lápiz).
- Dropdown con 3 opciones: Editar, Archivar/Desarchivar, Eliminar.
- Click en "Editar" llama a `onOpenDetail(taskId)`.
- Click en "Archivar" llama a `mutate()` con `archived: true`.
- Click en "Eliminar" abre `ConfirmDialog` y luego elimina.

### Implementación

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" className="size-8">
      <MoreVertical className="size-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={onOpenDetail}>
      <Pencil className="size-4 mr-2" /> Editar
    </DropdownMenuItem>
    <DropdownMenuItem onClick={onArchive}>
      <Archive className="size-4 mr-2" /> {task.archived ? "Desarchivar" : "Archivar"}
    </DropdownMenuItem>
    <DropdownMenuItem onClick={onDelete} className="text-destructive">
      <Trash2 className="size-4 mr-2" /> Eliminar
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## Drag blocking efectivo

### Problema actual

El `onDragStart` en `TasksTab` intenta bloquear el drag con `preventDefault()`, pero no funciona porque dnd-kit ya inició el gesture.

### Solución

Pasar `disabled={!!detailTaskId}` a cada `TaskCard` y dentro de `TaskCard` pasar `disabled` a `useSortable`.

```tsx
// En TasksTab:
<TaskCard
  key={t.id}
  task={t}
  disabled={!!detailTaskId}  // ← Nuevo prop
  // ...
/>

// En TaskCard:
export function TaskCard({ task, disabled, ... }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { status: task.status }, disabled });
  // ...
}
```

## Archivo de archivadas sin sprint scope

### Problema actual

`ArchivedTasksList` recibe `tasksInScope` que ya está filtrado por sprint.

### Solución

Crear un array separado `archivedTasks` que no aplique sprint scope:

```tsx
const archivedTasks = useMemo(() => {
  const archived = project.tasks.filter((t) => t.archived);
  return areaFilterId ? archived.filter((t) => t.areaId === areaFilterId) : archived;
}, [project.tasks, areaFilterId]);

// En el render:
<ArchivedTasksList
  tasks={archivedTasks}  // ← Sin sprint scope
  // ...
/>
```

## Orden de implementación (4 fases)

**Fase 1 — Resize horizontal (bajo riesgo, aislado):**
1. Agregar estado `drawerWidth` con localStorage.
2. Agregar handle de resize con listeners.
3. Aplicar ancho dinámico al drawer.
4. Verificar: resize funciona, persiste, responsive.

**Fase 2 — Unificar edición en drawer:**
5. Cambiar `onEdit` en TaskCard para llamar a `onOpenDetail`.
6. Eliminar el botón de editar (lápiz) y reemplazar con menú "...".
7. Agregar dropdown con Editar, Archivar, Eliminar.
8. En TasksTab, eliminar `TaskFormDialog` para edición (mantener solo para crear).
9. Verificar: editar abre drawer, menú funciona, crear sigue usando dialog.

**Fase 3 — Drag blocking y fixes:**
10. Agregar prop `disabled` a TaskCard y pasar a `useSortable`.
11. Pasar `disabled={!!detailTaskId}` desde TasksTab.
12. Corregir filtro de archivadas para ignorar sprint scope.
13. Verificar: drag se desactiva con drawer abierto, archivadas muestran todas.

**Fase 4 — ActivityTab y OverviewTab:**
14. Cambiar click en `task.commented` para abrir `?detail=`.
15. Agregar tooltip en OverviewTab para tareas archivadas.
16. Verificar: actividad abre drawer, tooltip muestra archivadas.
17. Smoke visual final, `tsc --noEmit`, `vitest run`, `npm run build`.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| El resize puede causar lag si se redimensiona muy rápido | Usar `requestAnimationFrame` si es necesario. En pruebas iniciales, el estado de React es suficientemente rápido. |
| El menú contextual puede confundir a usuarios acostumbrados al lápiz | El ícono "..." es un patrón común. El tooltip "Más opciones" ayuda. |
| El drag blocking puede no funcionar si `useSortable` no respeta `disabled` | Verificar en la documentación de dnd-kit. Si no funciona, alternativa: condicionalmente no renderizar el handle de drag. |
| El localStorage puede no estar disponible en algunos navegadores | Envolver en try/catch. Si falla, usar el default 400px. |

## Estrategia de verificación por fase

Después de cada fase: `npx tsc --noEmit`, `npx vitest run`, smoke visual manual en dev server.
No se avanza a la fase siguiente sin confirmar que la fase actual no rompió nada.

## Gates de la constitución

- ✅ **I Local-first:** sin cambios de persistencia ni red.
- ✅ **II Esquema-contrato:** sin cambios de schema ni migraciones.
- ✅ **III Plantillas/Tipos:** no aplica.
- ✅ **IV Diseño limpio:** unifica la experiencia de edición, elimina duplicación.
- ✅ **V Simplicidad/incremental:** 4 fases independientes, reutiliza componentes existentes.
- ✅ **VI Migrabilidad:** no toca StorageAdapter.
