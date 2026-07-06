# Especificación — Refactor UX del Drag & Drop del Kanban

- **Feature ID:** 010-kanban-drag-drop-ux
- **Estado:** Borrador
- **Fecha:** 2026-07-06
- **Principios afectados (constitución):** IV (diseño limpio y enfocado), V (simplicidad, evitar sobre-ingeniería)

## Resumen

Refactor de la experiencia de arrastrar y soltar tarjetas en el Kanban de `TasksTab`
(introducido en M8, extendido para reorder en spec 003). El drag-and-drop funciona a nivel de
datos, pero la experiencia visual tiene sobresaltos, no previsualiza el destino mientras se
arrastra, y **arrastrar una tarjeta a una columna vacía genera un error**. Este spec rediseña la
interacción (no el modelo de datos) para desktop, tablet y móvil.

## Problema / Necesidad

Revisando `TasksTab.tsx`, `kanban/KanbanColumn.tsx` y `kanban/TaskCard.tsx` (incluyendo cambios
sin commitear que ya intentaban mejorar esto parcialmente) se confirmaron 5 causas concretas:

1. **Sobresaltos ("salto" al soltar)**: toda la colocación (reorder o cambio de columna) se
   calcula solo en `onDragEnd`. Durante el arrastre ninguna tarjeta refluye — no hay preview del
   hueco destino, así que la tarjeta parece "teletransportarse" recién al soltar.
2. **Error en columna vacía**: la detección de colisión (`closestCorners`) resuelve hacia la
   tarjeta más cercana de otra columna cuando la columna destino no tiene tarjetas, en vez del
   droppable de la columna vacía. El WIP además usa `project.tasks.find(...)!` (aserción no-nula)
   en el `DragOverlay`, que puede fallar si la tarea activa ya no está en un re-render.
3. **Conflicto de sensores táctiles**: el WIP registra `PointerSensor` y `TouchSensor` a la vez,
   lo que puede disparar doble activación en dispositivos táctiles.
4. **Layout shift**: alturas mínimas fijas, una caja de "vacío" que aparece/desaparece, y
   modificadores/efectos visuales (`restrictToWindowEdges`, `shadow-lg`, línea `animate-pulse`
   por tarjeta) generan repintados que se sienten como saltos.
5. **Táctil deficiente**: el carrusel horizontal `snap-mandatory` de columnas en móvil compite con
   el gesto de arrastre vertical/horizontal, haciendo el drag entre columnas poco confiable.

## Decisiones explícitas (no re-preguntar)

- **Sin cambios de schema ni migración.** El orden sigue siendo la posición en `project.tasks`
  (igual que spec 003); este refactor es puramente de interacción/UI.
- **Preview en vivo con estado efímero**: mientras se arrastra, un estado local en `TasksTab`
  refleja el reflujo de columnas (igual que un tablero Kanban de referencia); la persistencia real
  (`mutate`) ocurre **una sola vez**, en `onDragEnd`.
- **Desktop es el camino principal y debe quedar impecable**: en pantallas ≥`md`, el arrastre con
  mouse reordena dentro de una columna **y** mueve entre columnas libremente, con preview en vivo,
  sin restricciones.
- **Táctil (tablet/móvil) restringido a reorder**: en pantallas táctiles el arrastre solo reordena
  dentro de la columna actual. El cambio de columna se hace con los botones de flecha
  (`onMoveBack`/`onMove`) ya existentes en `TaskCard` — no se introduce un menú nuevo.
- **Reorder sigue silencioso**: no se registra evento en el tab Actividad (mismo criterio que
  spec 003).
- Las 4 columnas de estado (`todo/doing/blocked/done`) siguen fijas; no se permite reordenarlas.

## Historias de usuario (con criterios de aceptación)

### HU-01 — Preview en vivo al reordenar dentro de una columna (desktop/tablet)
**Como** PM, **quiero** ver el hueco donde caerá la tarjeta mientras la arrastro **para** no
depender de adivinar la posición final.
- ✅ Al arrastrar sobre otra tarjeta de la misma columna, las tarjetas de alrededor refluyen en
  vivo (sin esperar a soltar).
- ✅ Al soltar, el orden visual coincide exactamente con el que ya se veía justo antes de soltar
  (sin salto adicional).
- ✅ Se persiste con una sola actualización de datos por gesto de arrastre.

### HU-02 — Preview en vivo al mover entre columnas (desktop/tablet con mouse)
**Como** PM, **quiero** ver la tarjeta insertarse en la columna destino mientras arrastro **para**
elegir con precisión su posición al cambiar de estado.
- ✅ Al arrastrar sobre una tarjeta de otra columna, la tarjeta activa aparece en esa columna en la
  posición prevista, y desaparece de la columna de origen, mientras se sigue arrastrando.
- ✅ Al soltar, se aplica en una sola operación: cambio de `status` + posición final.
- ✅ El filtro activo (`?area=`/`?sprint=`) no pierde ni desordena tareas fuera del alcance visible.

### HU-03 — Soltar sobre una columna vacía no genera error
**Como** PM, **quiero** poder arrastrar una tarjeta a una columna sin tareas **para** moverla ahí
sin que la app falle.
- ✅ Arrastrar sobre el área vacía de cualquier columna (con o sin tarjetas debajo del puntero) la
  acepta como destino válido.
- ✅ No se producen errores de consola ni crashes de React al soltar en una columna vacía.
- ✅ La tarjeta queda como única tarjeta de esa columna, con el `status` actualizado.

### HU-04 — Interacción táctil confiable (tablet/móvil)
**Como** PM usando el celular o una tablet, **quiero** reordenar tareas por arrastre sin pelear
con el scroll del tablero **para** priorizar tareas desde cualquier dispositivo.
- ✅ En pantallas táctiles, arrastrar una tarjeta dentro de su columna la reordena (igual criterio
  que HU-01).
- ✅ En pantallas táctiles, arrastrar no cambia la tarjeta de columna (queda restringido a los
  botones de flecha existentes) — se elimina la ambigüedad con el scroll horizontal del carrusel.
- ✅ Un único sensor táctil está activo (sin doble activación con el sensor de puntero de mouse).

### HU-05 — Sin sobresaltos de layout
**Como** cualquier usuario del Kanban, **quiero** que iniciar/soltar un arrastre no haga temblar o
saltar el tablero **para** que la interfaz se sienta sólida.
- ✅ El alto de las columnas no cambia abruptamente al empezar o terminar un arrastre.
- ✅ La columna vacía siempre reserva el mismo espacio visual, con o sin arrastre en curso.
- ✅ Ninguna animación de resaltado (`isOver`, overlay) desplaza otros elementos del layout.

### HU-06 — Accesibilidad por teclado no retrocede
**Como** PM que no usa mouse, **quiero** seguir reordenando/moviendo tareas por teclado **para**
que el refactor visual no rompa el acceso ya existente (spec 003).
- ✅ `KeyboardSensor` sigue disponible y con el mismo comportamiento (mover con flechas, confirmar
  con Enter/Espacio, cancelar con Escape).
- ✅ Los botones de flecha (`onMoveBack`/`onMove`) del `TaskCard` siguen funcionando igual, en
  cualquier dispositivo.

## Requisitos no funcionales

- **Cero cambios de schema/migración.**
- **Una sola escritura por gesto**: el estado efímero de arrastre no debe disparar `mutate()` en
  cada `onDragOver`; solo al soltar (`onDragEnd`).
- **Consistencia con spec 003**: se reutilizan `ops.updateTask`, `ops.reorderTasks` y
  `reorderByIds` de `src/domain/projectOps.ts` — no se agregan funciones de dominio nuevas.
- **Sin nuevas dependencias**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` y
  `@dnd-kit/modifiers` ya están instalados.
- **Tests en verde**: los tests Vitest existentes (`projectOps.test.ts` y el resto de la suite)
  siguen pasando sin cambios, dado que el dominio no se modifica.

## Fuera de alcance (este spec)

- Reordenar las columnas de estado del Kanban.
- Arrastrar entre columnas en dispositivos táctiles (queda para un spec futuro si se detecta
  necesidad real).
- Registrar el reorder/cambio de columna como evento de Actividad (sigue silencioso).
- Cambios al modelo de datos, a `projectOps.ts` o a las políticas de filtro `?area=`/`?sprint=`.

## Supuestos

- Los cambios sin commitear actuales (`DragOverlay`, `TouchSensor`, empty-state, línea de
  inserción) son un intento parcial que este spec reemplaza por completo; no hay que preservarlos
  tal cual.
- No hay otro trabajo en curso sobre `TasksTab.tsx`, `KanbanColumn.tsx` o `TaskCard.tsx`.

## Métricas de éxito

- Las 6 historias de usuario (HU-01 a HU-06) cumplen sus criterios de aceptación, verificado con
  smoke visual manual en desktop y en un dispositivo/emulación táctil.
- Cero errores de consola al soltar sobre una columna vacía.
- `tsc --noEmit`, `vitest run` y `vite build` en verde sin tocar `src/domain`.
