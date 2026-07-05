# Plan Técnico — Refactor Visual: Sistema de Diseño y Jerarquía

- **Feature:** 002-refactor-visual
- **Constitución:** alineado con IV (diseño limpio) y V (simplicidad). Sin violaciones — no toca
  esquema de datos (II), storage (I/VI) ni automatizaciones/lógica de negocio.

## Alcance técnico

Sin dependencias nuevas. Se trabaja íntegramente con el stack ya ratificado (Tailwind + `cva` +
lucide-react + componentes shadcn-style existentes). **No se adopta Radix** en este plan — la
migración de `select.tsx`/`tabs.tsx` caseros queda fuera (ver `spec.md`, Fuera de alcance).

## Componentes a crear / extender

| Componente | Acción | Ubicación propuesta | Reemplaza |
|---|---|---|---|
| `HealthBadge` / `HealthDot` | Crear | `src/components/HealthBadge.tsx` | `HEALTH_DOT` (Dashboard), mapeos en `labels.ts`, badges sueltos |
| `AutomationRuleCard` | Extraer | `src/features/automations/components/AutomationRuleCard.tsx` | card duplicada en `AutomationsPage` y `ProjectAutomationsTab` |
| `EmptyState` en `AreaCard` | Reusar (ya existe) | — | `<p>Sin procesos documentados</p>` suelto |
| `Breadcrumb` | Crear | `src/components/Breadcrumb.tsx` | breadcrumb inline de `ProjectDetailPage` |
| `PageHeader` | Extender | `src/components/PageHeader.tsx` (existe) | + prop `breadcrumb?: BreadcrumbItem[]` opcional |
| `EntityCard` | Crear | `src/components/EntityCard.tsx` | cards propias de Products/Projects/Library ×3 |
| `HierarchyLegend` | Extender (variante compacta) | ya existe | ausencia total dentro de `ProjectDetailPage` |
| `Tabs` compartido | Reusar (ya existe) | — | `FilterTab` custom de `NotificationsPage` |

## Orden de implementación (4 fases independientes)

**Fase 1 — Fundaciones de bajo riesgo** (no tocan layout de página, fáciles de verificar aisladas):
1. `HealthBadge` — componente único, usado en varios lugares sin romper estructura.
2. `AutomationRuleCard` — extracción 1:1 de un componente ya duplicado en dos archivos.
3. `EmptyState` en `AreaCard` — cambio de una sección.

**Fase 2 — Headers y navegación** (afecta solo `ProjectDetailPage` + los componentes base):
4. `Breadcrumb`.
5. `PageHeader` extendido con `breadcrumb`.
6. `ProjectDetailPage` adopta `PageHeader` + `Breadcrumb` (Producto → Proyecto).

**Fase 3 — Cards de listado** (mayor superficie: 5 pantallas, se hace al final para minimizar riesgo):
7. `EntityCard`.
8. Migrar `ProductsPage`.
9. Migrar `ProjectsPage`.
10. Migrar las 3 tabs de `LibraryPage` (Checklists/Procesos/Tipos).

**Fase 4 — Jerarquía visible + limpieza de tabs:**
11. `HierarchyLegend` compacto reusado en `AreasTab`/`ProjectDetailPage`.
12. `AreaCard`: contadores de procesos/checklists (%)/tareas visibles sin expandir.
13. `AreaCard`/`AreasTab`: indicador o link hacia las tareas del área (hoy solo conectadas por
    `areaId` invisible en pantalla).
14. `NotificationsPage`: reemplazar `FilterTab` por `Tabs` compartido.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| `EntityCard` genérico rompe interacciones específicas de cada página (destino de click distinto) | Props explícitas `onClick`/`href`/`meta` por instancia; no asumir un único comportamiento |
| Contadores nuevos en `AreaCard` sobrecargan visualmente la tarjeta | Medir contra Principio IV (espacio en blanco); badges pequeños, no texto largo |
| Cambios de header/breadcrumb rompen tests que buscan texto o rol específico | Correr `typecheck`+`test` después de cada fase, no solo al final |
| `AutomationRuleCard` difiere sutilmente entre vista global y scoped a proyecto | Prop `scope`/`showScopeBadge` en el mismo componente, no dos componentes paralelos |

## Estrategia de verificación por fase

Después de cada fase: `npm run typecheck`, `npm run test` (52+ tests Vitest en verde), smoke visual
manual en dev server de las páginas tocadas. No se avanza a la siguiente fase con typecheck o tests
rotos (Principio V: cada rebanada deja la app usable de punta a punta).

## Gates de la constitución (revisión)

- ✅ **I Local-first:** sin cambios de persistencia ni red.
- ✅ **II Esquema-contrato:** sin cambios de esquema ni migraciones.
- ✅ **III Plantillas/Tipos:** sin cambios funcionales.
- ✅ **IV Diseño limpio:** objetivo central de este plan.
- ✅ **V Simplicidad/incremental:** 4 fases independientes y desplegables, sin big-bang.
- ✅ **VI Migrabilidad:** no toca `StorageAdapter`.
