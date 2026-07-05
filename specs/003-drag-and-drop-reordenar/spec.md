# Especificación — Drag & Drop para reordenar listas

- **Feature ID:** 003-drag-and-drop-reordenar
- **Estado:** Borrador
- **Fecha:** 2026-07-04
- **Principios afectados (constitución):** IV (diseño limpio y enfocado), V (simplicidad, evitar sobre-ingeniería)

## Resumen

Permitir reordenar por arrastre (con fallback de teclado) cinco listas que hoy solo se pueden
reorganizar borrando y recreando ítems: ítems de checklist, pasos de proceso, áreas de un proyecto,
tareas dentro de una misma columna del Kanban, e ítems/pasos de las plantillas reutilizables de
Biblioteca. **No requiere cambios de schema ni migración**: en los cinco casos el orden ya es la
posición del elemento en su array (`checklist.items`, `process.steps`, `project.areas`,
`project.tasks`, `template.items`/`.steps`); reordenar es mover posiciones dentro del array ya
persistido.

## Problema / Necesidad

El Kanban (M8) ya usa `@dnd-kit/core` para arrastrar tarjetas entre columnas de estado, pero:

1. **No reordena dentro de una columna** — solo cambia `status`; dos tareas "doing" quedan en el
   orden en que se crearon, sin forma de priorizar una sobre otra.
2. **Ninguna otra lista tiene drag-and-drop ni alternativa de reordenar.** Ítems de checklist
   (`ChecklistSection`), pasos de proceso (`ProcessEditorDialog`), áreas de un proyecto
   (`AreasTab`) y los ítems/pasos de las plantillas de Biblioteca (`ChecklistTemplateDialog`,
   `ProcessTemplateDialog`) se muestran siempre en el orden de creación. Hoy la única forma de
   cambiar ese orden es borrar y volver a crear el ítem al final.
3. `ProcessEditorDialog` ya tiene un ícono `GripVertical` junto a cada paso (línea 134) que hoy es
   puramente decorativo — no dispara ningún drag. Confirma que el patrón visual ya se anticipó
   pero nunca se conectó.

## Usuarios y roles

Mismos que en `001-gestion-proyectos`: PM (operador principal) y CEO. Sin cambios de rol.

## Historias de usuario (con criterios de aceptación)

### HU-01 — Reordenar ítems de un checklist
**Como** PM, **quiero** arrastrar un ítem de checklist a otra posición **para** priorizar pendientes
sin borrar y recrear.
- ✅ Cada `<li>` en `ChecklistSection` tiene un handle de arrastre (`GripVertical`, mismo lenguaje
  visual que `TaskCard`).
- ✅ Soltar el ítem en una nueva posición persiste el nuevo orden inmediatamente.
- ✅ Funciona por teclado (mover foco al handle, flechas para reordenar) — mismo estándar de
  accesibilidad que el resto de la app.

### HU-02 — Reordenar pasos de un proceso
**Como** PM, **quiero** reordenar los pasos de un SOP **para** reflejar la secuencia real sin
recrearlos.
- ✅ El `GripVertical` ya presente en `ProcessEditorDialog` deja de ser decorativo y arrastra el paso.
- ✅ El número de orden (`1.`, `2.`...) se recalcula visualmente al soltar.

### HU-03 — Reordenar áreas de un proyecto
**Como** PM, **quiero** cambiar el orden de las áreas en `AreasTab` **para** que las más relevantes
aparezcan primero.
- ✅ Handle de arrastre en el header de `AreaCard`.
- ✅ El nuevo orden persiste y se refleja en cualquier otro lugar que liste áreas del proyecto.

### HU-04 — Reordenar tareas dentro de una columna Kanban
**Como** PM, **quiero** arrastrar una tarjeta a otra posición dentro de la misma columna **para**
priorizar sin cambiar su estado.
- ✅ Soltar una tarjeta sobre otra de la **misma** columna reordena sin tocar `status`.
- ✅ Soltar sobre una tarjeta de **otra** columna cambia `status` e inserta en esa posición (no solo
  al final, comportamiento actual).
- ✅ El filtro activo por área (`?tab=tasks&area=`) no pierde ni desordena tareas fuera del filtro.

### HU-05 — Reordenar ítems/pasos en plantillas de Biblioteca
**Como** PM, **quiero** reordenar ítems de una plantilla de checklist o pasos de una plantilla de
proceso **para** que los proyectos creados desde esa plantilla nazcan en el orden correcto.
- ✅ `ChecklistTemplateDialog` y `ProcessTemplateDialog` tienen el mismo handle de arrastre que sus
  contrapartes de proyecto (HU-01/HU-02).

## Requisitos no funcionales

- **Cero cambios de schema:** ningún `schemaVersion` ni migración nueva; el orden es la posición
  en el array ya persistido.
- **Consistencia visual:** mismo handle (`GripVertical`), mismos sensores (`PointerSensor`
  distancia 5 + `KeyboardSensor`) y misma librería (`@dnd-kit`) ya adoptada en el Kanban — no se
  introduce una segunda solución de drag-and-drop.
- **Accesibilidad no retrocede:** todo reorder debe ser alcanzable por teclado (igual que el
  Kanban actual), preservando foco y roles ARIA.
- **Tests en verde:** los tests Vitest existentes siguen pasando; se añaden tests unitarios para
  las nuevas funciones puras de reorder en `projectOps.ts`.

## Fuera de alcance (este spec)

- Reordenar columnas del Kanban (los 4 estados `todo/doing/blocked/done` son fijos).
- Arrastrar ítems **entre** listas distintas (p. ej. mover un ítem de un checklist a otro, o un
  paso de un proceso a otro) — solo reordenar dentro de la misma lista.
- Registrar el reorder como evento en el tab Actividad — queda **silencioso** por defecto (a
  diferencia de `task.statusChanged`, que sí es un evento con significado de negocio). Si se
  quiere trazabilidad, es un ítem explícito para un spec futuro.
- Reordenar Productos, Tipos de Proyecto o Personas — no se detectó necesidad de negocio para
  estas listas hoy.

## Supuestos

- El orden actual de los arrays (`items`, `steps`, `areas`, `tasks`) ya es significativo para el
  usuario (se muestran en ese orden en la UI) — reordenar no rompe ninguna otra lectura del array
  en `src/domain` o `src/automations` (a confirmar en `plan.md` antes de tocar `projectOps.ts`).
- No hay otro spec en curso que toque los mismos componentes (`ChecklistSection`,
  `ProcessEditorDialog`, `AreasTab`, `TasksTab`, `ChecklistTemplateDialog`, `ProcessTemplateDialog`).

## Métricas de éxito

- Las 5 listas (HU-01 a HU-05) se pueden reordenar por arrastre y por teclado, sin borrar/recrear
  ítems.
- El Kanban soporta reorder intra-columna además del cambio de estado que ya tenía.
- 0 cambios de schema/migración. Tests Vitest existentes + nuevos casos de `projectOps` en verde.
