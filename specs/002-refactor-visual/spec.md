# Especificación — Refactor Visual: Sistema de Diseño y Jerarquía

- **Feature ID:** 002-refactor-visual
- **Estado:** Borrador
- **Fecha:** 2026-07-03
- **Principios afectados (constitución):** IV (diseño limpio y enfocado), V (simplicidad, evitar sobre-ingeniería)

## Resumen

Refactor **puramente visual/estructural** de la UI existente (M0–M11). No agrega funcionalidad
ni cambia el modelo de datos: consolida los patrones de presentación (headers, empty states,
cards de entidad, badges de estado, tabs, tarjetas de regla de automatización) en un pequeño set
de componentes compartidos, y hace que la jerarquía de dominio
**Producto → Proyecto → Área → {Proceso, Checklist→Ítem} + Tareas** sea legible en el lugar
donde hoy es menos visible: `ProjectDetailPage`.

## Problema / Necesidad

La app creció en rebanadas verticales (M1–M11) y cada feature resolvió su propia UI de forma
independiente. Una auditoría del código actual confirma tres síntomas concretos:

1. **Inconsistencia acumulada.** `PageHeader` se usa en Dashboard/Productos/Proyectos/Biblioteca/
   Automatizaciones/Notificaciones/Ajustes, pero `ProjectDetailPage` —la pantalla donde más tiempo
   pasa el usuario— construye su propio header inline (sin `description`, con un breadcrumb que no
   existe en ningún otro lugar de la app). `NotificationsPage` reimplementa tabs con un `FilterTab`
   propio en vez del componente `Tabs` compartido. `AutomationsPage` y `ProjectAutomationsTab`
   duplican casi byte a byte la misma tarjeta de regla. Productos, Proyectos y las 3 pestañas de
   Biblioteca reimplementan cada una su propio "grid de card con hover-reveal de editar/eliminar".
2. **La jerarquía de dominio no se lee.** `HierarchyLegend` (la única ayuda visual que explica
   Producto→Proyecto→Área→Proceso/Checklist) solo aparece en el estado vacío del Dashboard y en
   Biblioteca. Dentro de un proyecto real, `AreaCard` muestra Procesos y Checklists como dos
   secciones internas sin relación visual con las Tareas, que viven en un tab Kanban aparte
   conectado solo por un `areaId` invisible en pantalla. Un usuario no puede, de un vistazo, saber
   cuántos procesos/checklists/tareas tiene un área.
3. **Preparación para más uso.** Antes de seguir agregando features (o mostrar la app a más
   personas/proyectos reales), conviene que cada pantalla nueva herede consistencia gratis en vez
   de reinventar el patrón.

## Usuarios y roles

Mismos que en `001-gestion-proyectos`: PM (operador principal) y CEO (misma persona, otra lente).
Sin cambios de rol ni de permisos.

## Historias de usuario (con criterios de aceptación)

### HU-01 — Header de página unificado en toda la app
**Como** usuario, **quiero** que toda página use el mismo patrón de encabezado **para** orientarme
sin reaprender cada pantalla.
- ✅ `ProjectDetailPage` usa el mismo componente de header que el resto de páginas de nivel superior
  (título, badge de estado, descripción opcional, acciones), en vez de markup inline propio.
- ✅ Ninguna página construye un header con estructura visual distinta al componente compartido.

### HU-02 — Breadcrumb de jerarquía reutilizable
**Como** usuario, **quiero** ver siempre dónde estoy dentro de Producto→Proyecto→Área **para** no
perderme al navegar.
- ✅ Existe un componente `Breadcrumb` único (reemplaza el breadcrumb ad-hoc de `ProjectDetailPage`).
- ✅ En `ProjectDetailPage` el breadcrumb muestra Producto (si existe) → Proyecto, con links navegables.
- ✅ El breadcrumb es opcional/injectable en el header unificado (HU-01), no un componente paralelo.

### HU-03 — `EntityCard` compartido para grids de listado
**Como** usuario, **quiero** que Productos, Proyectos y las 3 pestañas de Biblioteca luzcan y se
comporten igual **para** reconocer el patrón "tarjeta de entidad" en cualquier pantalla.
- ✅ Un solo componente `EntityCard` (título, badge de estado, meta secundaria, acciones hover
  editar/eliminar, click para navegar) reemplaza las implementaciones independientes de
  `ProductsPage`, `ProjectsPage`, `ChecklistTemplatesTab`, `ProcessTemplatesTab`, `TypesTab`.
- ✅ Cada página solo decide qué datos pasarle (contenido), no cómo se ve la tarjeta.

### HU-04 — Jerarquía Área→Proceso/Checklist→Tarea visible en `AreaCard`
**Como** PM, **quiero** ver de un vistazo cuántos procesos, checklists y tareas tiene un área
**para** entender su estado sin cambiar de tab.
- ✅ `AreaCard` muestra contadores (procesos, checklists con % avance, tareas por estado) visibles
  sin expandir nada.
- ✅ Existe un indicador/link visual entre un área y sus tareas asociadas (hoy solo conectadas por
  `areaId` invisible en pantalla), sin necesidad de cambiar de tab para saber que existen.
- ✅ El mensaje "Sin procesos documentados" (hoy un `<p>` suelto) usa el componente `EmptyState`
  compartido, igual que el resto de la app.

### HU-05 — `HealthBadge`/`HealthDot` único
**Como** usuario, **quiero** que el color/ícono de salud (verde/ámbar/rojo) se vea igual en
Dashboard, listas de proyectos y detalle **para** no reinterpretar colores distintos por pantalla.
- ✅ Un solo componente reemplaza el mapeo manual repetido en Dashboard (`HEALTH_DOT`), `labels.ts`
  y badges de otras páginas.

### HU-06 — `AutomationRuleCard` compartido
**Como** PM, **quiero** que una regla de automatización se vea igual en "Automatizaciones" global
y dentro de un proyecto **para** no aprender dos layouts para el mismo concepto.
- ✅ `AutomationsPage` y `ProjectAutomationsTab` consumen el mismo componente de tarjeta de regla.

### HU-07 — Tabs consistentes
**Como** usuario, **quiero** que las pestañas se vean y naveguen igual en toda la app.
- ✅ `NotificationsPage` usa el componente `Tabs` compartido en vez de su `FilterTab` custom.

### HU-08 — `HierarchyLegend` visible donde más se necesita
**Como** usuario nuevo, **quiero** una referencia visual de la jerarquía de dominio dentro del
proyecto, no solo en pantallas vacías de Dashboard/Biblioteca.
- ✅ `ProjectDetailPage` (o su tab de Áreas) ofrece una referencia visual breve de
  Área→Proceso/Checklist→Tarea, reutilizando/adaptando `HierarchyLegend` en vez de duplicar texto.

## Inventario de componentes compartidos (objetivo)

| Componente | Reemplaza / consolida | Usado hoy en |
|---|---|---|
| `PageHeader` (extendido con breadcrumb opcional) | Header inline de `ProjectDetailPage` | Todas las páginas de nivel superior + detalle |
| `Breadcrumb` | Breadcrumb ad-hoc de `ProjectDetailPage` | `ProjectDetailPage` |
| `EntityCard` | Cards propias de Products/Projects/Library (×3) | 5 lugares distintos |
| `HealthBadge`/`HealthDot` | `HEALTH_DOT`, mapeos manuales en `labels.ts` y badges sueltos | Dashboard, Proyectos, Detalle |
| `AutomationRuleCard` | Card duplicada en `AutomationsPage` y `ProjectAutomationsTab` | 2 lugares |
| `Tabs` (ya existe) | `FilterTab` custom de `NotificationsPage` | Notificaciones |
| `HierarchyLegend` (extendido/reusado) | Nada — hoy ausente en `ProjectDetailPage` | Dashboard vacío, Biblioteca |
| `EmptyState` (ya existe, reusar) | `<p>` suelto en `AreaCard` | Área sin procesos |

No se crean páginas ni rutas nuevas. No se toca `src/domain`, `src/storage`, `src/automations`
ni ningún store — es una capa de presentación sobre datos existentes.

## Requisitos no funcionales

- **Cero cambios funcionales o de datos:** ningún `schemaVersion`, migración, store o acción se
  modifica; el refactor es solo de presentación.
- **Migración incremental por página**, no big-bang (Principio V): cada HU es una rebanada
  independiente y desplegable por separado.
- **Tests existentes en verde:** los 52 tests Vitest actuales no dependen de estructura visual, pero
  cualquier test que sí lo haga (snapshots, queries por texto/rol) se actualiza en el mismo cambio.
- **Accesibilidad no retrocede:** foco, roles ARIA y contraste AA se preservan o mejoran al
  consolidar componentes (no se exige migrar `select`/`tabs` caseros a Radix en este spec — ver
  Fuera de alcance).

## Fuera de alcance (este spec)

- Rediseño de navegación/rutas (sin vista de árbol lateral, sin nuevas páginas ni URLs).
- Migración de primitivas nativas (`select.tsx` HTML nativo, `tabs.tsx` propio) a Radix real —
  queda anotado como candidato a un spec futuro de "fundaciones de accesibilidad".
- Rediseño responsive/mobile (la app es desktop-first hoy; no cambia en este spec).
- Cualquier cambio a automatizaciones, esquema de datos, IA/asistente o lógica de negocio.

## Supuestos

- El inventario de componentes (sección anterior) es completo respecto al código auditado en
  2026-07-03; si `src/features` cambió desde entonces, se revalida antes de `plan.md`.
- Se puede refactorizar visualmente sin coordinar con otros specs en curso (ninguno detectado).

## Métricas de éxito

- 0 páginas con header, empty state o card de entidad implementados ad-hoc fuera de los
  componentes compartidos listados arriba.
- `AutomationsPage`/`ProjectAutomationsTab` comparten un único componente de tarjeta de regla
  (elimina la duplicación casi byte a byte detectada hoy).
- Un usuario que abre un proyecto identifica, sin cambiar de tab, cuántas áreas/procesos/
  checklists/tareas tiene (hoy requiere navegar 2+ tabs para reconstruir ese conteo).
- Los 52 tests Vitest (u su versión actualizada) siguen en verde tras aplicar cada HU.
