# Tasks — Refactor Visual (002)

Tareas numeradas por fase. `[P]` = paralelizable dentro de la fase. Cada fase deja la app usable
de punta a punta (Principio V) y termina con `npm run typecheck` + `npm run test` en verde.

## Fase 1 — Fundaciones de bajo riesgo ✅
- [x] T201 [P] `HealthBadge`/`HealthDot`: creado `src/components/HealthBadge.tsx`
  (`HealthDot`, `HealthBadge`, `healthColorClass`); reemplaza `HEALTH_DOT` local en
  `DashboardPage` (barra RAG, lista de salud, rollup por producto).
- [x] T202 [P] `AutomationRuleCard`: extraído a
  `src/features/automations/components/AutomationRuleCard.tsx` (prop `scopeLabel` +
  `onDelete` opcional); `AutomationsPage` y `ProjectAutomationsTab` lo consumen, elimina la
  duplicación byte a byte.
- [x] T203 [P] `AreaCard`: reemplazado `<p>Sin procesos documentados</p>` por `EmptyState`
  (icono `FileText` + acción "Agregar proceso"), igual que el resto de estados vacíos.

  Verificado: `tsc --noEmit` limpio, 56/56 tests Vitest en verde, `vite build` OK.

## Fase 2 — Headers y navegación ✅
- [x] T210 `Breadcrumb`: creado `src/components/Breadcrumb.tsx` (`items: BreadcrumbItem[]`,
  último ítem sin `href` = página actual, `aria-current="page"`).
- [x] T211 `PageHeader`: agregadas props opcionales `breadcrumb?: BreadcrumbItem[]` y
  `badge?: React.ReactNode` (backward-compatible; el resto de páginas no las usa).
- [x] T212 `ProjectDetailPage`: header inline (Link "← Proyectos" + h1 + badge + acciones a mano)
  reemplazado por `PageHeader` con `breadcrumb=[Proyectos → Producto? → Proyecto]` y `badge` de
  estado; el nombre de producto ya no se duplica como descripción (vive en el breadcrumb).

  Verificado: `tsc --noEmit` limpio, 56/56 tests Vitest en verde, `vite build` OK.

## Fase 3 — `EntityCard` y grids de listado ✅
- [x] T220 `EntityCard`: creado `src/components/EntityCard.tsx` (título, `meta` bajo el título,
  `children` para el cuerpo, dos modos: `href` = tarjeta-link completa sin acciones inline
  —usado por Proyectos, que se edita dentro del detalle— u `onEdit`/`onDelete` = acciones hover
  en la esquina —usado por Productos y las 3 pestañas de Biblioteca, que se editan in-place).
- [x] T221 [P] `ProductsPage` migrado a `EntityCard`.
- [x] T222 [P] `ProjectsPage` migrado a `EntityCard`; se unificó el badge de estado dentro del
  mismo `meta` (antes vivía en una fila separada junto al título) para que el patrón título+meta
  sea idéntico al de Productos/Biblioteca.
- [x] T223 [P] `ChecklistTemplatesTab`, `ProcessTemplatesTab` y `TypesTab` (`LibraryPage`)
  migrados a `EntityCard`.

  Verificado: `tsc --noEmit` limpio, 56/56 tests Vitest en verde, `vite build` OK. **Sin smoke
  test visual en navegador** (extensión Claude-in-Chrome no disponible en este entorno) —
  pendiente que el usuario confirme visualmente Productos/Proyectos/Biblioteca.

## Fase 4 — Jerarquía visible + limpieza de tabs ✅
- [x] T230 `AreaCard`: agregada fila de contadores bajo el título, visible sin expandir nada
  (procesos: N, checklists: N, tareas: done/total).
- [x] T231 `AreaCard`/`AreasTab`: contador de tareas es un link (`?tab=tasks&area=<id>`) cuando
  el área tiene tareas; `TasksTab` ahora lee `?area=` (`useSearchParams`), filtra el Kanban por
  área y muestra un chip "Filtrando por área: X" con botón para quitar el filtro.
- [x] T232 `HierarchyLegend`: variante `compact` (ya existía en el componente) añadida a
  `AreasTab`, junto al botón "Nueva área".
- [x] T233 `NotificationsPage`: `FilterTab` custom reemplazado por `Tabs`/`TabsList`/`TabsTrigger`
  compartidos; función `FilterTab` eliminada por no uso.

  Verificado: `tsc --noEmit` limpio, 56/56 tests Vitest en verde, `vite build` OK. Sin smoke test
  visual en navegador (extensión Claude-in-Chrome no disponible en este entorno).

## Estado del refactor
Las 4 fases de `plan.md` están implementadas. Pendiente: verificación visual manual del usuario
en las páginas tocadas (Dashboard, Automatizaciones, Productos, Proyectos, Biblioteca, Detalle de
proyecto, Notificaciones) antes de considerar 002-refactor-visual cerrado.

## Verificación por fase
Tras cada fase: `npm run typecheck`, `npm run test` (52+ tests Vitest en verde), smoke visual
manual en dev server de las páginas tocadas. No se avanza con typecheck o tests rotos.

## Explícitamente fuera de este tasks.md
Migración de `select.tsx`/`tabs.tsx` caseros a Radix real — candidato a spec futuro de
"fundaciones de accesibilidad" (ver `spec.md`, sección Fuera de alcance).
