# Design — HU-13 Operaciones Bulk (Mejorado)

## Estado actual

- Checkbox en cada card siempre visible (absolute top-2 left-2)
- Drag handle (GripVertical) en el flujo con min-w-[44px]
- Overlap visual entre checkbox y drag handle
- Solo "Seleccionar todas" global, sin selección por columna
- Drag individual (no multi-drag)

## Cambios de diseño

### 1. Modo selección explícito

**Estado nuevo en `TasksTab.tsx`:**
```typescript
const [selectionMode, setSelectionMode] = useState(false);
```

**Toggle button en barra de herramientas:**
- Botón "Seleccionar" junto a "Nueva tarea"
- Icono: `CheckSquare` de lucide-react
- Variant: `outline` cuando OFF, `secondary` cuando ON
- Al activar: `setSelectionMode(true)`
- Al desactivar (click o Escape): `setSelectionMode(false)` + `clearSelection()`

**Keyboard shortcut:**
- `Escape` desactiva modo y limpia selección (solo cuando `selectionMode === true`)
- Agregar en `useKeyboardShortcuts` o useEffect con event listener

### 2. Layout checkbox + drag handle en TaskCard

**Props nuevas en `TaskCard.tsx`:**
```typescript
interface Props {
  // ... existing
  selectionMode?: boolean;
}
```

**Layout cuando `selectionMode === true`:**
```tsx
<div className="flex min-w-0 items-start gap-1.5 mb-1.5">
  {/* Checkbox a la izquierda del drag handle */}
  {selectionMode && !isPlaceholder && !isOverlay && (
    <input
      type="checkbox"
      checked={selected}
      onChange={(e) => { e.stopPropagation(); onToggleSelect(); }}
      onClick={(e) => e.stopPropagation()}
      className="size-4 cursor-pointer shrink-0 mt-2.5"
    />
  )}
  {/* Drag handle */}
  <button
    className="flex items-center justify-center -m-1.5 p-1.5 cursor-grab touch-none text-muted-foreground/50 transition-colors hover:text-foreground active:cursor-grabbing shrink-0 min-w-[44px] min-h-[44px]"
    aria-label={`Arrastrar tarea ${task.title}`}
    onClick={(e) => e.stopPropagation()}
    {...listeners}
    {...attributes}
  >
    <GripVertical className="size-3.5" />
  </button>
  {/* Resto del contenido */}
</div>
```

**Indicador visual de selección:**
```tsx
className={cn(
  // ... existing classes
  selected && !isPlaceholder && !isOverlay && "ring-2 ring-blue-400 ring-offset-2",
)}
```

### 3. Column checkbox tri-state en KanbanColumn

**Props nuevas en `KanbanColumn.tsx`:**
```typescript
interface Props {
  // ... existing
  selectionMode?: boolean;
  columnSelectionState?: "none" | "some" | "all";
  onToggleColumnSelection?: () => void;
}
```

**Checkbox tri-state en header:**
```tsx
<div className="mb-3 flex items-center justify-between px-0.5">
  {selectionMode && (
    <input
      type="checkbox"
      checked={columnSelectionState === "all"}
      ref={(el) => {
        if (el) el.indeterminate = columnSelectionState === "some";
      }}
      onChange={(e) => {
        e.stopPropagation();
        onToggleColumnSelection?.();
      }}
      onClick={(e) => e.stopPropagation()}
      className="size-4 cursor-pointer shrink-0 mr-2"
    />
  )}
  <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground truncate">
    {taskStatusLabel[status]}
  </span>
  <Badge variant={isOverLimit ? "destructive" : "outline"} className="font-mono text-[11px] px-1.5 py-0.5">
    {count}{wipLimit !== null && wipLimit !== undefined ? `/${wipLimit}` : ""}
  </Badge>
</div>
```

### 4. Lógica de selección por columna en TasksTab

**Función helper:**
```typescript
function getColumnSelectionState(status: TaskStatus): "none" | "some" | "all" {
  const columnTaskIds = board[status];
  const selectedInColumn = columnTaskIds.filter((id) => selectedTaskIds.has(id));
  if (selectedInColumn.length === 0) return "none";
  if (selectedInColumn.length === columnTaskIds.length) return "all";
  return "some";
}

function toggleColumnSelection(status: TaskStatus) {
  const columnTaskIds = board[status];
  const allSelected = columnTaskIds.every((id) => selectedTaskIds.has(id));
  
  setSelectedTaskIds((prev) => {
    const next = new Set(prev);
    if (allSelected) {
      // Deselect all in column
      columnTaskIds.forEach((id) => next.delete(id));
    } else {
      // Select all in column
      columnTaskIds.forEach((id) => next.add(id));
    }
    return next;
  });
}
```

**Pasar props a KanbanColumn:**
```tsx
<KanbanColumn
  key={col}
  status={col}
  count={tasks.length}
  wipLimit={project.wipLimits?.[col]}
  taskIds={ids}
  onAdd={() => setDialog({ open: true, status: col })}
  selectionMode={selectionMode}
  columnSelectionState={getColumnSelectionState(col)}
  onToggleColumnSelection={() => toggleColumnSelection(col)}
>
```

### 5. Multi-drag

**Estado auxiliar para multi-drag:**
```typescript
const [draggedSelectedIds, setDraggedSelectedIds] = useState<string[]>([]);
```

**En `onDragStart`:**
```typescript
function onDragStart(event: DragStartEvent) {
  if (detailTaskId) {
    event.activatorEvent.preventDefault?.();
    return;
  }
  const activeTaskId = String(event.active.id);
  setActiveId(activeTaskId);
  isTouchDragRef.current = event.activatorEvent.type.startsWith("touch");
  setDragBoard(boardFromScope);
  
  // Multi-drag: si la card arrastrada está seleccionada y hay otras seleccionadas
  if (selectionMode && selectedTaskIds.has(activeTaskId) && selectedTaskIds.size > 1) {
    setDraggedSelectedIds(Array.from(selectedTaskIds));
  } else {
    setDraggedSelectedIds([]);
  }
  
  if ("vibrate" in navigator) {
    navigator.vibrate(50);
  }
}
```

**En `onDragEnd` (persistencia multi-drag):**
```typescript
function onDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  const finalBoard = dragBoard;
  setActiveId(null);
  setDragBoard(null);
  if (!over || !finalBoard) return;

  const activeTaskId = String(active.id);
  const activeTask = project.tasks.find((t) => t.id === activeTaskId);
  if (!activeTask) return;
  const finalCol = columnOf(finalBoard, activeTaskId);
  if (!finalCol) return;

  // Multi-drag: mover todas las seleccionadas juntas
  if (draggedSelectedIds.length > 1) {
    mutate((p) => {
      let next = p;
      // Mover cada tarea seleccionada a la columna destino
      draggedSelectedIds.forEach((taskId) => {
        const task = next.tasks.find((t) => t.id === taskId);
        if (task && task.status !== finalCol) {
          next = ops.updateTask(next, { ...task, status: finalCol });
        }
      });
      // Reordenar las tareas en la columna destino
      const orderedIds = finalBoard[finalCol];
      return ops.reorderTasks(next, orderedIds);
    });
    setDraggedSelectedIds([]);
    return;
  }

  // Drag individual (comportamiento normal)
  const orderedIds = finalBoard[finalCol];
  const unchanged =
    finalCol === activeTask.status &&
    orderedIds.length === boardFromScope[finalCol].length &&
    orderedIds.every((id, i) => id === boardFromScope[finalCol][i]);
  if (unchanged) return;

  mutate((p) => {
    const next =
      finalCol === activeTask.status ? p : ops.updateTask(p, { ...activeTask, status: finalCol });
    return ops.reorderTasks(next, orderedIds);
  });
}
```

**DragOverlay con badge de count:**
```tsx
<DragOverlay
  dropAnimation={{
    duration: 200,
    easing: "cubic-bezier(0.2, 0, 0, 1)",
  }}
>
  {activeTask ? (
    <div className="relative">
      <TaskCard
        task={activeTask}
        area={project.areas.find((a) => a.id === activeTask.areaId)}
        assignee={people.find((p) => p.id === activeTask.assigneeId)}
        focused={false}
        isOverlay
        selectionMode={selectionMode}
        selected={selectedTaskIds.has(activeTask.id)}
        onMoveBack={() => {}}
        onMove={() => {}}
        onToggleBlock={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onOpenDetail={() => {}}
        onArchive={() => {}}
      />
      {draggedSelectedIds.length > 1 && (
        <Badge
          variant="secondary"
          className="absolute -top-2 -right-2 size-6 p-0 flex items-center justify-center text-xs font-bold shadow-lg"
        >
          {draggedSelectedIds.length}
        </Badge>
      )}
    </div>
  ) : null}
</DragOverlay>
```

### 6. Barra de herramientas con toggle "Seleccionar"

**Agregar botón en barra de herramientas (antes de "Nueva tarea"):**
```tsx
<Button
  variant={selectionMode ? "secondary" : "outline"}
  size="sm"
  onClick={() => {
    if (selectionMode) {
      setSelectionMode(false);
      clearSelection();
    } else {
      setSelectionMode(true);
    }
  }}
>
  <CheckSquare className="size-3.5 mr-1.5" />
  {selectionMode ? "Cancelar" : "Seleccionar"}
</Button>
```

### 7. Escape keyboard shortcut

**useEffect para Escape:**
```typescript
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && selectionMode) {
      setSelectionMode(false);
      clearSelection();
    }
  }
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [selectionMode]);
```

## Archivos afectados

| Archivo | Cambios |
|---|---|
| `TasksTab.tsx` | Agregar `selectionMode`, toggle button, lógica de column select-all, multi-drag, Escape shortcut |
| `TaskCard.tsx` | Agregar prop `selectionMode`, reorganizar layout checkbox + drag handle, indicador visual de selección |
| `KanbanColumn.tsx` | Agregar props `selectionMode`, `columnSelectionState`, `onToggleColumnSelection`, checkbox tri-state en header |

## Consideraciones de UX

- **Descubribilidad**: el botón "Seleccionar" está en la barra de herramientas, visible en todo momento
- **Feedback visual**: cards seleccionadas tienen ring azul, column checkbox muestra estado tri-state
- **Escape**: desactiva modo y limpia selección (comportamiento estándar)
- **Multi-drag**: badge con count en DragOverlay para indicar cuántas tareas se mueven
- **Filtros**: column checkbox respeta filtros activos (search, priority, assignee, date)

## Testing manual

1. Activar modo selección → checkboxes aparecen en cards y column headers
2. Click en column checkbox → selecciona/deselecciona todas las tareas de esa columna
3. Click en "Seleccionar todas" → selecciona todas las tareas visibles
4. Arrastrar una card seleccionada (con otras seleccionadas) → todas se mueven juntas
5. Presionar Escape → desactiva modo y limpia selección
6. Verificar que drag individual funciona cuando no hay selección o se arrastra una card no seleccionada
