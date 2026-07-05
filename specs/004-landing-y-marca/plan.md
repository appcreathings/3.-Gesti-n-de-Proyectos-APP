# Plan Técnico — Landing pública, rebranding a "Hito" e ícono nuevo

- **Feature:** 004-landing-y-marca
- **Constitución:** alineado con IV (diseño limpio) y V (simplicidad). Sin violaciones — no toca
  esquema de datos (II) ni storage (I/VI), con la salvedad explícita de no tocar `DB_NAME`/id del
  directory picker (ver spec.md).

## Alcance técnico

Sin dependencias nuevas. Reutiliza el stack ya ratificado y componentes existentes
(`HierarchyLegend`, `Card`, `Button`, `PageHeader`).

## Hallazgo crítico de la exploración

En `src/App.tsx`, el `<RouterProvider>` no se montaba hasta que `connection === "ready"` y
`hydrated` era `true`; si no, `App()` reemplazaba todo el árbol por `<ConnectScreen/>`, fuera del
router. No existía ninguna URL pública. Se extrajo esa lógica a `AppGate` (nuevo), que envuelve
solo las rutas bajo `/app`.

## Orden de implementación (5 fases)

**Fase 1 — Rebranding textual:** `package.json`, `index.html` (title/description/og),
`vite.config.ts` (manifest), `AppLayout.tsx` (sidebar), `SettingsPage.tsx` (nombre de export),
`README.md`. Se dejó explícitamente intacto `src/storage/idb.ts`/`FileSystemAdapter.ts` (mismo
substring "gestor-proyectos" pero es identificador de persistencia, no branding).

**Fase 2 — Routing:**
1. `src/routes/paths.ts` — constantes `ROUTES.*`, todas prefijadas con `/app`.
2. `src/components/layout/AppGate.tsx` — traslado 1:1 del gating que vivía en `App()`.
3. `src/App.tsx` reestructurado: `LandingPage` como sibling de `/app`; `/app` usa `AppGate` como
   elemento, con `AppLayout` anidado (pathless) para las 8 rutas hijas existentes. Los `useEffect`
   de `bootstrap`/`hydrate`/`runTemporal` se quedan a nivel global sin cambios.
4. Migración de **13 archivos** con paths hardcodeados a `ROUTES.*` (no 10 como se estimó
   inicialmente — se sumaron `ProjectsPage.tsx` y `OverviewTab.tsx`, y `DashboardPage.tsx` tenía 4
   sitios, no 2): `AppLayout.tsx`, `CommandPalette.tsx`, `ProductsPage.tsx`, `LibraryPage.tsx`,
   `ProjectsPage.tsx`, `ProjectDetailPage.tsx`, `CreateFromTypeDialog.tsx`,
   `NotificationsPage.tsx`, `ActivityTab.tsx`, `AssistantPanel.tsx`, `AssistantEmptyState.tsx`,
   `DashboardPage.tsx`, `OverviewTab.tsx`.

**Fase 3 — Landing (`src/features/landing/`):** `LandingPage.tsx` ensambla 5 secciones en
`components/`: `Hero` (nombre, tagline, CTA → `ROUTES.dashboard`), `ValueProps` (privacidad/local-
first), `HowItWorks` (reutiliza `HierarchyLegend` sin modificarlo), `FeatureHighlights` (Kanban,
Automatizaciones, IA, PWA), `FinalCta`. Sin dependencia de `useDataStore`/`useAppStore` — renderiza
siempre, independiente del estado de conexión.

**Fase 4 — SEO:** `index.html` (canonical, og:url/image, twitter:card, JSON-LD
`SoftwareApplication`, dominio `hito.autos`); `public/robots.txt` (Disallow `/app`);
`public/sitemap.xml` (una sola URL). Pendiente: `public/og-image.png` (asset raster, fuera de
alcance de edición de código).

**Fase 5 — Ícono + PWA:** nuevo glifo (bandera sobre mojón) en `favicon.svg`/`icon.svg`, mismo azul
`#2A4074`; `icon-maskable.svg` sin `rx` y glifo centrado/escalado para safe-zone; `vite.config.ts`
→ `manifest.start_url: "/app"`.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Olvidar un sitio de paths hardcodeados y dejar un link roto sin prefijo `/app` | `ROUTES.*` centraliza todos los casos; grep de verificación post-migración (`to="/[a-z]`, `navigate("/[a-z]`) dio 0 resultados fuera de `paths.ts`/landing |
| Confundir el string "gestor-proyectos" de branding con el de `DB_NAME`/directory picker | Ambos archivos de storage quedaron explícitamente fuera del rebranding; verificado con grep tras la Fase 1 |
| `CommandPalette` navegaba con `go("/")` para "Dashboard" — "/" ahora es la landing | Cambiado a `go(ROUTES.dashboard)` (`/app`) |
| `AppGate` cambia el nivel de montaje de `AppLayout` respecto al original | Mismo `if/else`, solo relocalizado un nivel más abajo; verificado con build + typecheck |

## Estrategia de verificación

Después de cada fase: `npm run typecheck`, `npm run test` (64 tests Vitest), `npm run build`.
Completado en las 5 fases. **Pendiente**: smoke visual manual en navegador (la extensión
Claude-in-Chrome no estaba conectada en la sesión de implementación) — confirmar que "/" muestra la
landing sin pedir carpeta, que "/app" dispara `ConnectScreen`/Dashboard según corresponda, y que el
sidebar, Command Palette y deep-links de notificaciones/actividad resuelven bien bajo `/app/...`.

## Gates de la constitución (revisión)

- ✅ **I Local-first:** sin cambios de persistencia ni red; se blindó explícitamente `DB_NAME`/id.
- ✅ **II Esquema-contrato:** sin cambios de esquema ni migraciones.
- ✅ **III Plantillas/Tipos:** sin cambios funcionales.
- ✅ **IV Diseño limpio:** landing e ícono nuevo reutilizan componentes existentes (`HierarchyLegend`,
  `Card`, `Button`) en vez de crear lenguaje visual paralelo.
- ✅ **V Simplicidad/incremental:** 5 fases independientes, cada una verificada con
  typecheck+test+build antes de avanzar.
- ✅ **VI Migrabilidad:** no toca `StorageAdapter`.
