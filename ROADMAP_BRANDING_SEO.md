# Roadmap de Branding & SEO — Hito

> Plan maestro que se deriva del análisis inicial (ver respuesta en chat).
> Fases ya completadas en este pase: **1, 2, 3, 4**. Las siguientes quedan como backlog priorizado.

---

## Estado actual (post-Fase 4)

| Tema | Estado | Evidencia |
|---|---|---|
| `BRAND_GUIDE.md` | ✅ | `BRAND_GUIDE.md` |
| Footer con hrefs reales | ✅ | `src/features/landing/components/LandingFooter.tsx:5-37` |
| Schema `Organization` + `WebSite` | ✅ | `src/features/landing/LandingPage.tsx:39-60` |
| Canonical duplicado | ✅ | `index.html` ya no lo emite; Helmet lo gestiona. |
| Logo "mojón + banderín" | ✅ | `public/icon.svg`, `icon-maskable.svg`, `favicon.svg`; `<HitoMark>` en `src/components/brand/HitoMark.tsx`. |
| Color accent verde esmeralda | ✅ | `--brand-accent` en `src/index.css` + `tailwind.config.js`. |
| CTA sticky post-Hero | ✅ | `src/features/landing/components/StickyCta.tsx`. |
| TrustBadges "construido en público" | ✅ | `src/features/landing/components/TrustBadges.tsx`. |
| Páginas satélite SEO | ✅ | `/alternativa-trello`, `/alternativa-notion-local`, `/gestor-proyectos-offline`, `/changelog`, `/docs`. |
| Sitemap ampliado | ✅ | `public/sitemap.xml`. |
| `Reveal` respeta `prefers-reduced-motion` | ✅ | ya estaba bien implementado. |
| Typecheck | ✅ | `tsc --noEmit` limpio. |
| Build | ✅ | `npm run build` ok; chunks SEO ~1.5-2 KB gzip. |

---

## Backlog priorizado

### 🔴 P0 — hacer esta semana

| # | Acción | Esfuerzo | Por qué |
|---|---|---|---|
| P0.1 | **Re-exportar `og-image.png` a WebP ≤ 120 KB** | 1 h | El actual es 547 KB; Google Lighthouse penaliza. Convertir a `og-image.webp` + fallback `og-image.png`. |
| P0.2 | **Reemplazar URL del repo** en `LandingFooter.tsx:8` (`hito-app/hito`) por la real | 5 min | Si la URL no existe, todos los links a GitHub revientan. |
| P0.3 | **Verificar `manifest.webmanifest`** en `index.html` y que `icon-maskable.svg` respete zona segura (80% inner) | 1 h | PWA instalable pero el maskable puede recortarse mal. |
| P0.4 | **Crear `llms.txt` / `.well-known/security.txt`** | 30 min | `security.txt` suma puntos de confianza. `llms.txt` indexa el contenido para crawlers IA. |
| P0.5 | **Capturar screenshots reales** del dashboard y reemplazar el `ProductMockup` actual | 4 h | El mockup HTML está bien, pero screenshots reales convierten mejor y refuerzan "esto existe, lo podés usar". |

### 🟠 P1 — próximas 2 semanas

| # | Acción | Esfuerzo | Dependencia |
|---|---|---|---|
| P1.1 | **Modo demo `?demo=1`**: precargar producto + proyecto + 5 tareas en IndexedDB temporal | 6 h | — |
| P1.2 | **Video screencast 60s** (Loom/Opus) embebido en Hero | 4 h | Demo corriendo (P1.1). |
| P1.3 | **Sección "Manifiesto"** ("Por qué construimos Hito") entre Hero y TrustBar | 3 h | — |
| P1.4 | **Badges GitHub live** (stars, forks, last commit) vía `shields.io` | 1 h | URL real del repo. |
| P1.5 | **i18n (en/es)** con toggle en nav | 8 h | Decidir framework (react-i18next vs custom). |
| P1.6 | **Lighthouse CI** en GitHub Actions — score > 95 en todas las categorías | 4 h | — |
| P1.7 | **Schema `BreadcrumbList`** en todas las páginas | 1 h | — |
| P1.8 | **FAQ schema ampliado** (hoy 5, debería tener 8) | 1 h | Las 3 que ya están en el componente FAQ (`Faq.tsx`) deberían estar en schema. |

### 🟡 P2 — próximo mes

| # | Acción | Esfuerzo | Dependencia |
|---|---|---|---|
| P2.1 | **Newsletter opt-in** (sin tracking: Buttondown, Listmonk self-hosted o Savemyemail) | 8 h | Decidir proveedor. |
| P2.2 | **Embed widget** ("Hito en tu sitio") | 8 h | API pública o iframe. |
| P2.3 | **Programa de Embajadores**: 3-5 early adopters cuentan su caso | — | Base instalada. |
| P2.4 | **Comparativa con Linear, Asana, Jira** (páginas satélite adicionales) | 4 h por página | — |
| P2.5 | **Documentación pública con VitePress** en subdominio `docs.hito.autos` | 1-2 días | Hosting + CI. |
| P2.6 | **Open Graph dinámico por sección** (al hacer scroll, OG cambia) | 1 día | SSR o pre-render. |
| P2.7 | **Página "Por qué local-first"** (artículo largo, long-form content) | 1 día | — |

### 🟢 P3 — siguiente quarter

| # | Acción | Esfuerzo |
|---|---|---|
| P3.1 | Traducción completa a inglés y portugués. |
| P3.2 | PWA install prompt personalizado ("Instalá Hito en tu equipo"). |
| P3.3 | Search en docs (`pagefind` o `algolia docsearch`). |
| P3.4 | Video curso gratuito "Gestión de proyectos local-first" (YouTube). |
| P3.5 | Webinars mensuales con early adopters. |
| P3.6 | Plantillas públicas (SOPs, checklists) que la comunidad pueda descargar. |

---

## Métricas a trackear

| Métrica | Herramienta | Baseline | Target 90 días |
|---|---|---|---|
| Lighthouse Performance | PageSpeed / Lighthouse CI | medir | > 95 |
| Lighthouse SEO | igual | medir | 100 |
| Lighthouse Accessibility | igual | medir | > 95 |
| LCP landing | CrUX / Vercel Analytics | medir | < 1.8s |
| Conversión landing → `/app` | PostHog self-hosted / umami | medir | +25% |
| Tráfico orgánico a páginas satélite | Vercel Analytics + Search Console | 0 | 200 visitas/mes |
| Backlinks desde GitHub | manual | medir | +20 dominios |
| GitHub stars | GitHub | medir | ×3 |

> **Importante**: no instalar GA, Meta Pixel, Hotjar, etc. Usar **umami** (open source, self-hostable) o **Plausible** (privacy-first). Coherente con el posicionamiento.

---

## Riesgos identificados

| Riesgo | Mitigación |
|---|---|
| **No hay URL real del repo** y se filtran links rotos al deploy | Definir URL canónica y reemplazar antes de producción. |
| **Páginas satélite thin content** pueden penalizar SEO | Cada una tiene > 500 palabras originales y valor único (no son paráfrasis). |
| **OG image dinámico** requiere SSR (Vite es SPA) | Considerar migración a Next.js o usar `vercel.json` con `prerender`. |
| **i18n** agrega complejidad al router | Empezar solo con en/es, no con 5 idiomas. |
| **Newsletter** mal implementada rompería la promesa de privacidad | Usar proveedor sin tracking, con opción de exportar/eliminar lista. |

---

## Cómo seguir

1. **Validar la URL real del repo** y ajustar `LandingFooter.tsx:8`.
2. **Decidir proveedor de newsletter** (recomiendo: Listmonk self-hosted si ya tenés infra, o Buttondown si no).
3. **Capturar screenshots reales** del producto en uso.
4. **Lighthouse CI** antes y después de cada fase para medir impacto.
5. **Iterar el BRAND_GUIDE** cuando cambien posicionamiento o paleta.
