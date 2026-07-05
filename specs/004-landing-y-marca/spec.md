# Especificación — Landing pública, rebranding a "Hito" e ícono nuevo

- **Feature ID:** 004-landing-y-marca
- **Estado:** Implementado
- **Fecha:** 2026-07-05
- **Principios afectados (constitución):** IV (diseño limpio y enfocado), V (simplicidad, evitar sobre-ingeniería)

## Resumen

Rebranding de "Gestor de Proyectos" a **"Hito"** (dominio `hito.autos`), nueva landing pública en
"/" que explica el producto y guía hacia él, la app existente se mueve bajo `/app/*`, metadatos SEO
básicos (sin SSR), e ícono nuevo (bandera/mojón) reemplazando el genérico de "3 barras".

## Problema / Necesidad

La app solo existía como herramienta interna: al entrar, el usuario caía directo en la pantalla de
conectar carpeta o en el Dashboard — no había ninguna página pública que explicara qué es la app,
para quién es, o por qué es diferente (local-first/privacidad) antes de pedir acceso a una carpeta.
Tampoco tenía nombre de marca real ni ícono distintivo.

## Decisiones explícitas (no re-preguntar)

- **Sin SSR/prerender.** La landing es una ruta más de la SPA existente, renderizada en cliente.
- **La app se mueve a `/app`.** La raíz `/` es la landing pública (no requiere conectar carpeta);
  el Dashboard y el resto de la app viven bajo `/app/*`.
- **Sin wizard de onboarding dentro del producto.** La landing guía con contenido y CTAs hacia
  `/app`, no con un tour interactivo.
- Sin cuentas/pricing, sin tocar `src/domain` ni ningún schema.
- **`src/storage/idb.ts` (`DB_NAME`) y `FileSystemAdapter.ts` (id del directory picker) no se
  tocan** — comparten el substring "gestor-proyectos" con el branding viejo pero son identificadores
  de persistencia reales; renombrarlos rompería la reconexión de carpeta y el modo descarga.

## Historias de usuario (con criterios de aceptación)

### HU-01 — Landing pública sin conexión
**Como** visitante sin conectar carpeta, **quiero** ver una landing en "/" que explique el producto,
**para** decidir si probarlo, sin que se me pida conectar una carpeta.
- ✅ "/" renderiza sin depender de `connection`/`hydrated`.
- ✅ CTA lleva a `/app`.

### HU-02 — La app sigue funcionando bajo /app
**Como** usuario existente, **quiero** seguir usando las mismas funciones bajo `/app/...`, **para**
que el refactor de rutas no rompa flujos internos.
- ✅ Las 8 rutas hijas responden en `/app/*` con el mismo comportamiento.
- ✅ Ningún link interno apunta a la ruta vieja sin prefijo.

### HU-03 — PWA abre en la app, no en la landing
**Como** usuario que instala la PWA, **quiero** que abra directo en la app.
- ✅ `start_url: "/app"` en el manifest.

### HU-04 — Metadatos para indexación/previews
**Como** buscador/red social, **quiero** metadatos correctos para indexar/previsualizar hito.autos.
- ✅ canonical, og:url, og:image, twitter:card, JSON-LD presentes; `robots.txt`/`sitemap.xml`.

### HU-05 — Ícono nuevo
**Como** usuario, **quiero** ver el ícono "Hito" (bandera/mojón) conservando el azul de marca.

## Fuera de alcance

- SSR/SSG/prerender.
- Wizard de onboarding o tour guiado dentro del producto.
- Cuentas/pricing.
- Cambios a `src/domain`, automatizaciones, o cualquier schema/migración.
- Renombrar `DB_NAME`/id del directory picker en la capa de storage.
- Generación del asset raster `og-image.png` (1200×630) — requiere herramienta de diseño externa,
  queda como pendiente explícito.

## Métricas de éxito

- `/` carga sin pedir carpeta; `/app` seguido de las 8 sub-rutas funciona igual que antes.
- 0 referencias a rutas sin prefijo `/app` fuera de `paths.ts`/landing.
- `tsc --noEmit`, 64 tests Vitest y `vite build` en verde.
- PWA instalada abre en `/app`.
