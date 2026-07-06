# Plan Técnico — Refactor UX del Drag & Drop del Kanban

- **Feature:** 010-kanban-drag-drop-ux
- **Constitución:** alineado con IV (diseño limpio) y V (simplicidad). Sin violaciones — no toca
  esquema de datos (II) ni storage (I/VI): es un refactor de interacción/UI sobre datos ya
  persistidos vía `ops.updateTask`/`ops.reorderTasks` (spec 003).

## Alcance técnico

Ninguna dependencia nueva: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` y
`@dnd-kit/modifiers` ya están instalados (el último llegó en los cambios sin commitear de esta
sesión; se conserva). El refactor es exclusivamente de UI/interacción en 3 archivos ya existentes:
`TasksTab.tsx`, `kanban/KanbanColumn.tsx`, `kanban/TaskCard.tsx`. No se toca `projectOps.ts`.

Los cambios sin commitear actuales en esos 3 archivos (DragOverlay básico, TouchSensor duplicado,
empty-state condicional, línea `animate-pulse`) se **reemplazan** por el diseño de abajo — no se
parte de ellos incrementalmente porque atacan los síntomas (falta de overlay, falta de estado
vacío) sin resolver la causa raíz (ausencia de preview en vivo y colisión mal resuelta).

## Componentes a extender

| Componente | Acción | Reemplaza |
|---|---|---|
| `TasksTab` | Extender | `onDragEnd`-only → estado efímero `dragBoard` con preview en `onDragOver`; sensores `Pointer+Touch` → `Mouse+Touch`; `closestCorners` → colisión multi-contenedor; `DragOverlay` con `!` no-null → lookup seguro |
| `KanbanColumn` | Extender | zona vacía condicional (`min-h` variable) → zona de drop de altura estable siempre presente |
| `TaskCard` | Extender | línea `isOver` por tarjeta + overlay con `rotate`/`scale-105` → hueco de origen al arrastrar + overlay calmado; se quita prop `isOver` |

## Diseño de la interacción

### Estado efímero de tablero (núcleo del fix de sobresaltos)

`TasksTab` deriva hoy las columnas visibles inline (`tasksInScope.filter(t => t.status === col)`
dentro del `.map` de render). Se extrae esa derivación a un `boardFromScope: Record<TaskStatus,
string[]>` (memoizado). Se agrega estado `dragBoard: Record<TaskStatus, string[]> | null`:

- Sin arrastre en curso → `dragBoard === null` → el render usa `boardFromScope` directamente (sin
  cambio de comportamiento fuera del drag).
- Con arrastre en curso → el render usa `dragBoard`, que se muta en cada `onDragOver` para reflejar
  el reflujo en vivo (tarjetas alrededor del hueco se corren; al cruzar de columna, el id salta de
  la lista origen a la lista destino en la posición prevista).
- `onDragEnd` lee el `dragBoard` final, lo compara contra `boardFromScope` para saber si cambió el
  `status` de la tarjeta activa, y aplica en **una sola `mutate`**: `ops.updateTask` (si cambió
  status) seguido de `ops.reorderTasks(ordered)` con el orden final de la columna afectada — igual
  patrón que ya usa el `onDragEnd` actual, pero ahora la posición ya fue decidida visualmente
  durante el arrastre en vez de recalcularse recién al soltar.
- `onDragCancel` y el caso `!over` limpian `dragBoard`/`activeId` sin mutar nada.

Esto es la misma técnica que dnd-kit documenta para tableros multi-columna (el ejemplo oficial
"Multiple Containers"): estado local espejo del store, sincronizado en `onDragOver`, persistido una
vez en `onDragEnd`.

### Restricción táctil vs. desktop

`onDragStart` detecta el tipo de puntero desde `event.activatorEvent` (`TouchEvent` o
`PointerEvent` con `pointerType === "touch"`) y guarda `isTouchDragRef`. En `onDragOver`, si
`isTouchDragRef.current` es true y la columna destino calculada difiere de la columna origen, se
**ignora** el cambio de columna (el `dragBoard` no se actualiza para ese caso) — el usuario solo ve
reflujo dentro de su propia columna. En desktop (`isTouchDragRef.current === false`) no hay
restricción: reorder y cambio de columna funcionan igual, ambos con preview.

### Colisión y columna vacía

Se reemplaza `closestCorners` (única estrategia) por una función de colisión compuesta:
`pointerWithin(args)`; si no devuelve nada, fallback a `rectIntersection(args)`; si tampoco,
fallback a `closestCorners(args)`. `pointerWithin` resuelve directamente el droppable de columna
cuando el puntero está sobre su área vacía (el bug reportado), y sigue resolviendo tarjetas
individuales cuando el puntero está sobre una de ellas.

### Sensores

`useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))`. Se elimina
`PointerSensor` (que en el WIP coexistía con `TouchSensor` y podía doble-activar en táctil);
`MouseSensor` + `TouchSensor` es el par estándar de dnd-kit para separar ambos inputs.

### Layout estable

- `KanbanColumn`: el contenedor de tarjetas reserva una altura mínima constante
  (`min-h-[120px]` o similar, a calibrar visualmente) independientemente de si hay 0 o N tarjetas;
  el mensaje "Arrastra tareas aquí" vive dentro de esa zona siempre montada, visible solo cuando
  `taskIds.length === 0`, para no des-montar/montar el nodo (evita el reflow que causaba el WIP).
- Se quita `restrictToWindowEdges` de los `modifiers` de `DndContext` (era una fuente de saltos
  cerca de los bordes de ventana sin necesidad real, dado que el `DragOverlay` ya sigue al
  puntero). Se mantiene `autoScroll` con parámetros por defecto de dnd-kit (los del WIP —
  `acceleration: 25, interval: 5`— eran agresivos y se revisan).
- `TaskCard`: se quita la línea `absolute ... animate-pulse` condicionada a `isOver` (ya no hace
  falta: el hueco lo provee el reflujo del `SortableContext` sobre `dragBoard`). Mientras
  `isDragging` es true, la tarjeta de origen se renderiza como un placeholder atenuado (borde
  punteado, sin badges ni acciones) en vez de una copia semi-transparente con contenido completo —
  reduce el "doble" visual (placeholder + overlay).
- `DragOverlay`: estilo calmado (`shadow-2xl`, `cursor-grabbing`, `scale-[1.02]`), sin `rotate-2`;
  se corrige la búsqueda de la tarea activa para no usar `!` (aserción no-nula) — si no se
  encuentra, no se renderiza el overlay.

## Orden de implementación (4 fases)

**Fase 1 — Sensores y colisión (bajo riesgo, aislado):**
1. Reemplazar sensores (`PointerSensor`+`TouchSensor` → `MouseSensor`+`TouchSensor`).
2. Implementar la colisión compuesta (`pointerWithin` → `rectIntersection` → `closestCorners`).
3. Quitar `restrictToWindowEdges`; ajustar `autoScroll`.
4. Verificar: el bug de columna vacía ya no debería reproducirse incluso antes de las fases
   siguientes (se confirma con smoke visual).

**Fase 2 — Estado efímero `dragBoard` (núcleo):**
5. Extraer `boardFromScope` (memoizado) desde `tasksInScope`.
6. Agregar estado `dragBoard`/`activeId`/`isTouchDragRef`.
7. Implementar `onDragStart` (detecta touch, snapshot de `dragBoard`), `onDragOver` (reflujo intra
   e inter columna, con el guard táctil), `onDragEnd` (una mutación: `updateTask` + `reorderTasks`),
   `onDragCancel` (limpieza).
8. El render de columnas/tarjetas pasa a leer `dragBoard ?? boardFromScope`.
9. Corregir `DragOverlay` (lookup seguro de la tarea activa, sin `!`).

**Fase 3 — `KanbanColumn` sin layout shift:**
10. Zona de tarjetas con altura mínima estable; empty-state siempre montado, visible condicional.
11. Resaltado `isOver` de columna sin `shadow-lg`, con `transition-colors` (no `transition-all`).

**Fase 4 — `TaskCard` calmado:**
12. Quitar prop `isOver` y su línea `animate-pulse`.
13. Placeholder de origen (`isDragging`) simplificado.
14. Overlay calmado (`isOverlay`): sin `rotate`, `scale-[1.02]`.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El estado efímero `dragBoard` se desincroniza de `tasksInScope` si `mutate` dispara un re-render externo a mitad de un arrastre (p. ej. otro cambio de filtro) | `onDragOver` siempre recalcula a partir del `dragBoard` previo, no de `boardFromScope`, una vez iniciado el arrastre; `onDragCancel`/`onDragEnd` siempre resetean a `null` para resincronizar con las props en el próximo render |
| Ignorar cambio de columna en táctil podría sorprender si el usuario arrastra intencionalmente esperando cambiar de estado | Mismo criterio que un Kanban táctil estándar (Trello/Linear mobile): reorder por gesto, cambio de estado por acción explícita; los botones de flecha ya existen y son descubribles (icono + tooltip) |
| Cambiar `closestCorners` por colisión compuesta podría alterar sutilmente qué tarjeta se resuelve como "over" cuando hay poco espacio entre columnas | Smoke visual explícito de HU-01/HU-02/HU-03 antes de dar la fase 1 por cerrada |
| Quitar `restrictToWindowEdges` podría permitir arrastrar el overlay fuera del viewport en pantallas muy angostas | El `DragOverlay` sigue el puntero, que ya está acotado por el propio viewport/scroll del navegador; se verifica en el smoke de tablet/móvil |

## Estrategia de verificación por fase

Después de cada fase: `npx tsc --noEmit`, `npx vitest run` (sin nuevos casos esperados — el
dominio no cambia), smoke visual manual en dev server cubriendo las HU relevantes a esa fase. No se
avanza a la fase siguiente sin confirmar visualmente que la fase actual no rompió nada (mismo
criterio que spec 003).

## Gates de la constitución (revisión)

- ✅ **I Local-first:** sin cambios de persistencia ni red.
- ✅ **II Esquema-contrato:** sin cambios de esquema ni migraciones.
- ✅ **III Plantillas/Tipos:** no aplica (el Kanban de tareas no tiene plantillas).
- ✅ **IV Diseño limpio:** consolida el lenguaje visual existente (`GripVertical`, badges, overlay)
  en vez de sumar efectos nuevos (pulse, rotate) que no aportan claridad.
- ✅ **V Simplicidad/incremental:** 4 fases independientes verificables; reutiliza
  `ops.updateTask`/`ops.reorderTasks`/`reorderByIds` ya existentes, sin funciones de dominio nuevas.
- ✅ **VI Migrabilidad:** no toca `StorageAdapter`.
