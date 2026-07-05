# Tasks — Landing pública, rebranding a "Hito" e ícono nuevo (004)

Tareas numeradas por fase. Cada fase deja la app usable de punta a punta (Principio V) y se
verificó con `npm run typecheck` + `npm run test` + `npm run build` antes de avanzar.

## Fase 1 — Rebranding textual ✅
- [x] T401 `package.json`: `name` → `"hito"`.
- [x] T402 `index.html`: title/description/og:title/og:description → "Hito".
- [x] T403 `vite.config.ts`: `manifest.name`/`short_name`/`description` → "Hito".
- [x] T404 `AppLayout.tsx`: texto del sidebar → "Hito".
- [x] T405 `SettingsPage.tsx`: prefijo de archivo de export → `hito-`.
- [x] T406 `README.md`: título actualizado.
- [x] T407 Verificado: NO se tocó `src/storage/idb.ts` ni `FileSystemAdapter.ts` (mismo substring,
  identificadores de persistencia).

  Verificado: `tsc --noEmit`, 64/64 tests.

## Fase 2 — Routing: AppGate + /app + paths.ts ✅
- [x] T410 `src/routes/paths.ts`: constantes `ROUTES.*`.
- [x] T411 `src/components/layout/AppGate.tsx`: gating extraído de `App()`.
- [x] T412 `App.tsx` reestructurado: `LandingPage` sibling de `/app`; `App()` renderiza siempre
  `<RouterProvider>`.
- [x] T413 Migrados a `ROUTES.*`: `AppLayout.tsx`, `CommandPalette.tsx`, `ProductsPage.tsx`,
  `LibraryPage.tsx`, `ProjectsPage.tsx`, `ProjectDetailPage.tsx`, `CreateFromTypeDialog.tsx`,
  `NotificationsPage.tsx`, `ActivityTab.tsx`, `AssistantPanel.tsx`, `AssistantEmptyState.tsx`,
  `DashboardPage.tsx`, `OverviewTab.tsx` (13 archivos).
- [x] T414 Grep de verificación: 0 resultados de paths sin prefijo fuera de `paths.ts`/landing.

  Verificado: `tsc --noEmit`, 64/64 tests, `vite build` OK. Servidor dev responde 200 en `/` y
  `/app`. **Pendiente smoke visual en navegador** (extensión Claude-in-Chrome no disponible en la
  sesión).

## Fase 3 — Landing ✅
- [x] T420 `src/features/landing/LandingPage.tsx` + registro lazy en `App.tsx`.
- [x] T421 `Hero.tsx` con CTA → `ROUTES.dashboard`.
- [x] T422 `ValueProps.tsx` (privacidad/local-first).
- [x] T423 `HowItWorks.tsx` reutilizando `<HierarchyLegend/>` tal cual.
- [x] T424 `FeatureHighlights.tsx` (Kanban, Automatizaciones, IA, PWA).
- [x] T425 `FinalCta.tsx`.

  Verificado: `tsc --noEmit`, 64/64 tests, `vite build` OK.

## Fase 4 — SEO ✅
- [x] T430 `index.html`: canonical, og:url, og:image, twitter:card, JSON-LD (dominio hito.autos).
- [x] T431 `public/robots.txt`.
- [x] T432 `public/sitemap.xml`.
- [ ] T433 `public/og-image.png` (1200×630) — **pendiente**, requiere herramienta de diseño externa
  (Figma/Canva/script `sharp`), fuera de alcance de edición de código.

## Fase 5 — Ícono + PWA ✅
- [x] T440 Nuevo glifo bandera/mojón en `favicon.svg` + `icon.svg`.
- [x] T441 `icon-maskable.svg` con safe-zone (sin `rx`, glifo centrado).
- [x] T442 `vite.config.ts`: `manifest.start_url = "/app"` (confirmado en `dist/manifest.webmanifest`).

  Verificado: `vite build` OK, manifest generado con `start_url: "/app"` e íconos correctos.

## Pendiente explícito (fuera de este ciclo)
- Smoke visual manual en navegador de las 5 fases (bloqueado por falta de extensión Claude-in-Chrome
  en la sesión de implementación).
- Generar `public/og-image.png`.
- Validar `og:image`/`twitter:card` con una herramienta de previsualización de redes sociales tras
  el deploy a `hito.autos`.
