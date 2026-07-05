# Plan Técnico — Sprints, Trimestres y navegación en árbol

- **Feature:** 008-sprints-trimestres-arbol
- **Constitución:** alineado con I (local-first, nueva colección `quarters` vía `StorageAdapter`),
  II (esquema-contrato: `SCHEMA_VERSION` 1 → 2 con migración registrada), IV (diseño limpio,
  reutiliza tokens/primitivas existentes), V (5 fases incrementales, cada una deja la app usable),
  VI (migrabilidad, sin acoplar UI al mecanismo de persistencia). Sin violaciones.

## Alcance técnico

Sin dependencias nuevas. Reutiliza el stack ratificado: Zod en los límites, Zustand para estado,
`StorageAdapter` para persistencia, Radix/shadcn (`Dialog`, `Select`, `Tabs`) para UI, `Intl`
nativo para el preview de fechas (sin librería de fechas nueva).

## Hallazgo crítico de la exploración

1. En el preview de la landing (`ProductMockup.tsx`), "Sprint 7", "Q3 Lanzamiento" y el `ÁRBOL`
   son **texto de marketing hardcodeado** — no hay ningún Sprint/Quarter en el dominio ni árbol
   real en el sidebar (lista plana de 7 destinos, `AppLayout.tsx`). Confirmado por exploración
   antes de diseñar el modelo.
2. El sidebar real mide `w-56` (224px) y ya está lleno (7 destinos + buscador + asistente + estado
   de sync). El árbol del preview es visualmente una **2ª columna**, no el rail — replicarlo ahí
   habría comprimido 3 niveles de jerarquía en un espacio insuficiente. Se optó por un enfoque
   híbrido (ver `spec.md`, decisión de navegación).
3. Los factories (`src/domain/factories.ts`) hardcodeaban `schemaVersion: 1` en vez de importar la
   constante `SCHEMA_VERSION`. Al subir la constante a `2` para todo el workspace, las entidades
   nuevas (producto, plantillas, automatizaciones, tipo de proyecto) habrían quedado marcadas con
   la versión vieja. Se corrigió importando `SCHEMA_VERSION` en todos los factories como parte de
   esta feature (fix colateral, no solo para `Project`/`Quarter`).
4. **Colisión de numeración de specs**: al momento de documentar, `specs/007-rag-semantico/`
   (feature de mejora de texto con IA/RAG) ya existía en el repo, creado por una sesión concurrente
   distinta. Este feature se documenta como **008** en vez de 007.

## Orden de implementación (5 fases)

**Fase 1 — Modelo de datos + almacenamiento + base de fechas:**
1. `src/domain/schemas/common.ts`: `SCHEMA_VERSION` 1→2, enums `SprintStatus`/`QuarterStatus`.
2. `src/domain/schemas/project.ts`: `SprintSchema`, `Project.sprints`, `Project.quarterId`,
   `Task.sprintId`.
3. `src/domain/schemas/quarter.ts` (nuevo): `QuarterSchema`.
4. `src/domain/schemas/workspace.ts`: `QuarterIndexEntry` + `WorkspaceIndexSchema.quarters`.
5. `src/domain/migrations.ts`: `"quarters"` en `MigrationKind`; paso identidad
   `projects: [{ to: 2, up: (d) => d }]` (documenta el bump y dispara el snapshot automático; los
   campos nuevos ya tienen `.default()` en Zod, no requieren transformación de datos).
6. `src/storage/StorageAdapter.ts` / `FileSystemAdapter.ts` / `DownloadAdapter.ts`: colección
   `"quarters"` registrada en `Collection`, `collectionSchema`, `COLLECTION_DIRS` y los arrays de
   `exportAll`/`importAll`.
7. `src/store/useDataStore.ts`: estado `quarters`, `createQuarter`/`updateQuarter`/`deleteQuarter`,
   carga en `hydrate()`, inclusión en `reindex()`.
8. `src/domain/projectOps.ts`: `addSprint`/`updateSprint`/`removeSprint`/`assignTaskToSprint`
   (mismo estilo inmutable que `addTask`/`reorderTasks`).
9. `src/domain/factories.ts`: `newSprint`, `newQuarter`; fix de `schemaVersion` hardcodeado (ver
   hallazgo #3).
10. `src/domain/labels.ts`: `sprintStatusLabel/Variant`, `quarterStatusLabel/Variant`.
11. `src/lib/dates.ts`: `daysBetween`, `formatDay`, `relativeDay`, `formatRange`.
12. `src/components/forms/DateFieldPreview.tsx` (nuevo): `DateFieldPreview` (input + preview de
    fecha única) y `DateRangeSummary` (resumen de rango). Integrado en `TaskFormDialog`,
    `ItemEditorDialog`, `ProjectFormDialog`.

**Fase 2 — Sprints en el proyecto:**
- `src/features/projects/components/SprintFormDialog.tsx` (nuevo): crear/editar sprint.
- `src/features/projects/components/SprintSwitcher.tsx` (nuevo): barra de scope (Todas/Backlog/
  sprint) con prev/next, eyebrow `Proyecto · <scope>`, badge de estado, editar/eliminar.
- `src/features/projects/components/TasksTab.tsx`: filtra `tasksInScope` por área **y** por
  `?sprint=`; el drag & drop opera sobre ese subconjunto doblemente filtrado (mismo patrón que ya
  existía para `?area=`).
- `src/features/projects/components/TaskFormDialog.tsx`: campo Sprint + `defaultSprintId` (nueva
  tarea creada desde un scope concreto hereda ese sprint).

**Fase 3 — Trimestres:**
- `src/domain/compute.ts`: `aggregateChecklistProgress` (building block) y `quarterRollup`.
- `src/features/quarters/{QuartersPage,QuarterFormDialog}.tsx` (nuevo), `ROUTES.quarters` en
  `paths.ts`, registrado en `App.tsx`, entrada "Trimestres" en el `NAV` de `AppLayout.tsx`
  (colocada tras "Biblioteca" para no desplazar la barra inferior móvil, que toma los 4 primeros
  destinos de `NAV`).
- `ProjectFormDialog.tsx`: selector de Trimestre.
- `ProjectsPage.tsx`: toggle `Tabs` (Lista/Por trimestre/Por producto) + componente
  `GroupedProjects` que agrupa y muestra progreso agregado por grupo; deep-link `?quarter=` desde
  Trimestres resalta el grupo correspondiente.

**Fase 4 — Navegación híbrida:**
- `src/components/layout/ProjectTree.tsx` (nuevo): árbol Producto→Proyecto(→Área) reutilizable,
  con expansión automática del grupo que contiene el proyecto activo (persiste entre navegaciones
  porque el componente permanece montado en el layout).
- `AppLayout.tsx`: `<ProjectTree onNavigate={onNavClick}/>` insertado bajo la fila "Proyectos" del
  rail (2 niveles, sin áreas).
- `src/features/projects/ProjectsLayout.tsx` (nuevo): layout de 2 columnas
  (`lg:grid-cols-[240px_1fr]`) con `<ProjectTree showAreas/>` + `<Outlet/>`; envuelve `projects` y
  `projects/:id` en `App.tsx` (antes rutas planas, ahora anidadas bajo este layout).
- `AppLayout.tsx`: contenedor principal `max-w-6xl` → `max-w-7xl` para dar aire al workspace de
  2 columnas (cambio de bajo riesgo: el resto de páginas usa grids responsivos, no anchos fijos).

**Fase 5 — Pulido visual:**
- Badge de Sprint en `TaskCard` cuando el scope es "Todas las tareas" (identifica de un vistazo a
  qué sprint pertenece cada tarjeta sin necesidad de filtrar).
- Verificación de que el breadcrumb existente (`Breadcrumb.tsx`) ya cubre la jerarquía
  Proyectos→Producto→Proyecto sin necesidad de imitar el chip decorativo `.json` del mockup (ese
  detalle es marketing puro; añadirlo al breadcrumb real habría sido ruido sin función —
  principio IV).

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Colisión de `specs/007-*` con una sesión concurrente (feature de IA/RAG) | Documentado como `008-sprints-trimestres-arbol`; no se tocó ningún archivo de esa otra feature |
| Bump de `SCHEMA_VERSION` global rompe factories con literal `1` hardcodeado | Auditado y corregido: todos los factories importan `SCHEMA_VERSION` |
| Filtrar el Kanban por sprint además de por área podía descolocar el drag & drop | Se reutilizó el mismo patrón de "reordenar solo el subconjunto visible" ya probado para `?area=`, ahora aplicado al doble filtro |
| Colección `quarters` nueva olvidada en algún adapter (bootstrap/export/import) | Añadida explícitamente en los 3 puntos de `FileSystemAdapter`/`DownloadAdapter` y verificada por tipo (`Collection` es un union literal, TS marca cualquier `switch`/mapa incompleto) |
| Reordenar `NAV` para "Trimestres" desplaza accidentalmente la barra inferior móvil (`NAV.slice(0,4)`) | Insertado después de "Biblioteca" (5ª posición), fuera del slice de destinos primarios móviles |

## Estrategia de verificación

Después de cada fase: `npx tsc --noEmit` + `npx vitest run`. Las 5 fases quedaron en verde
(147/147 tests en su momento; los 2 errores de tsc restantes en `AiImproveButton.tsx`/`ProjectTypeDialog.tsx`
pertenecen a la sesión concurrente `007-rag-semantico`, no a este feature). Tests nuevos:
`src/lib/dates.test.ts` (10), `assignTaskToSprint`/`removeSprint` en `projectOps.test.ts` (+3), y
actualización de `migrations.test.ts` para reflejar la migración real `projects v1→v2` registrada.

**Verificación final end-to-end:** smoke visual real con Playwright — crear producto, proyecto,
sprint con fechas, tarea con campo Sprint, filtrar el tablero por Backlog/Sprint, crear trimestre,
alternar vistas de Proyectos, expandir el árbol en rail y columna dedicada. **0 errores de consola.**
`npx tsc --noEmit` limpio para el código de este feature; `npx vitest run` en verde (154/154 tests
tras integrar los tests del spec 007).

## Gates de la constitución (revisión)

- ✅ **I Local-first:** `quarters` es una colección más de `StorageAdapter`, JSON legible, sin red.
- ✅ **II Esquema-contrato:** `SCHEMA_VERSION` incrementado con migración registrada; datos v1
  abren sin romperse (defaults de Zod + snapshot automático).
- ✅ **III Plantillas/Tipos:** sin cambios funcionales.
- ✅ **IV Diseño limpio:** reutiliza `PageHeader`, `EntityCard`, `Tabs`, `Badge`, `SectionLabel`,
  `Progress`, `ConfirmDialog`; el preview de fechas usa el `<input type="date">` nativo en vez de
  introducir un date-picker custom.
- ✅ **V Simplicidad/incremental:** 5 fases, cada una compilando y con tests en verde antes de
  avanzar; proyectos sin sprints/trimestres se comportan igual que antes (regresión cero).
- ✅ **VI Migrabilidad:** toda la persistencia nueva pasa por `StorageAdapter`; cero acoplamiento
  de la UI al mecanismo de storage.
