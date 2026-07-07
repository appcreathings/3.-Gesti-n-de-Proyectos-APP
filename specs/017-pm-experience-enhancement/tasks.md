# Tasks — HU-13 Operaciones Bulk (Mejorado)

## Checklist de implementación

### 1. TaskCard.tsx — Reorganizar layout
- [x] Agregar prop `selectionMode?: boolean` al interface
- [x] Reorganizar layout: checkbox en flujo antes del drag handle (cuando `selectionMode === true`)
- [x] Eliminar checkbox absolute top-2 left-2 (reemplazar por checkbox en flujo)
- [x] Agregar indicador visual de selección: `ring-2 ring-blue-400 ring-offset-2` cuando `selected === true`
- [x] Asegurar que checkbox no se renderice en placeholder ni overlay
- [x] Verificar que drag handle sigue funcionando correctamente

### 2. KanbanColumn.tsx — Agregar checkbox tri-state
- [x] Agregar props: `selectionMode`, `columnSelectionState`, `onToggleColumnSelection`
- [x] Agregar checkbox tri-state en header (izquierda del nombre de columna)
- [x] Implementar `indeterminate` state via ref
- [x] Checkbox solo visible cuando `selectionMode === true`
- [x] Asegurar que click no propaga al column droppable

### 3. TasksTab.tsx — Estado y lógica de selección
- [x] Agregar estado `selectionMode: boolean`
- [x] Agregar botón toggle "Seleccionar" en barra de herramientas (antes de "Nueva tarea")
- [x] Implementar función `getColumnSelectionState(status): "none" | "some" | "all"`
- [x] Implementar función `toggleColumnSelection(status)`
- [x] Pasar props `selectionMode`, `columnSelectionState`, `onToggleColumnSelection` a KanbanColumn
- [x] Pasar prop `selectionMode` a TaskCard
- [x] Implementar useEffect para Escape key (desactivar modo + limpiar selección)
- [x] Actualizar barra bulk para que aparezca cuando `selectedTaskIds.size > 0` (ya existe)

### 4. TasksTab.tsx — Multi-drag
- [x] Agregar estado `draggedSelectedIds: string[]`
- [x] En `onDragStart`: detectar si la card arrastrada está seleccionada y hay otras seleccionadas
- [x] Si multi-drag: guardar IDs seleccionados en `draggedSelectedIds`
- [x] En `onDragEnd`: si `draggedSelectedIds.length > 1`, mover todas las seleccionadas juntas
- [x] Actualizar DragOverlay para mostrar badge con count cuando `draggedSelectedIds.length > 1`
- [x] Resetear `draggedSelectedIds` en `onDragEnd` y `onDragCancel`

### 5. Testing manual
- [ ] Activar modo selección → checkboxes aparecen en cards y column headers
- [ ] Click en column checkbox → selecciona/deselecciona todas las tareas de esa columna
- [ ] Column checkbox muestra estado indeterminate cuando algunas tareas están seleccionadas
- [ ] Click en "Seleccionar todas" → selecciona todas las tareas visibles
- [ ] Arrastrar una card seleccionada (con otras seleccionadas) → todas se mueven juntas
- [ ] DragOverlay muestra badge con count correcto
- [ ] Presionar Escape → desactiva modo y limpia selección
- [ ] Click en botón "Cancelar" → desactiva modo y limpia selección
- [ ] Drag individual funciona cuando no hay selección o se arrastra una card no seleccionada
- [ ] Multi-drag respeta el orden relativo de las tareas
- [ ] Column checkbox respeta filtros activos (search, priority, assignee, date)
- [ ] Verificar que no hay regresión en drag-and-drop normal (sin modo selección)

### 6. Polish y edge cases
- [ ] Verificar que el layout no se rompe con cards largas o badges
- [ ] Asegurar que el checkbox tri-state se ve bien en todos los temas (light/dark)
- [ ] Verificar que el badge de count en DragOverlay no tapa información importante
- [ ] Testear con columna vacía (no debe mostrar checkbox de columna)
- [ ] Testear con todas las tareas seleccionadas en una columna (checkbox debe estar checked)
- [ ] Verificar que el modo selección no interfiere con el drawer de detalle

## Notas de implementación

- **Orden sugerido**: 1 → 2 → 3 → 4 → 5 → 6
- **Dependencias**: TaskCard y KanbanColumn deben actualizarse antes de TasksTab
- **Breaking changes**: la prop `onToggleSelect` de TaskCard ahora solo se usa cuando `selectionMode === true`
- **Performance**: `getColumnSelectionState` se llama 4 veces por render (una por columna), considerar memoización si hay problemas
