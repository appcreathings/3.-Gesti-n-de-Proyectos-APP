# Especificación — Blog público y contenido SEO

- **Feature ID:** 009-blog-y-contenido-seo
- **Estado:** Implementado
- **Fecha:** 2026-07-05
- **Principios afectados (constitución):** IV (diseño limpio), V (simplicidad, evitar sobre-ingeniería)

## Resumen

Sección pública `/blogs` que publica contenido editorial alineado con las funcionalidades de Hito y
su posicionamiento de marca: **gestión de proyectos local-first, privacidad, procesos, automatización
e IA sin sacrificar datos**. Cada artículo es una página estática de la SPA con metadatos SEO
(`title`, `description`, `canonical`, `og:*`, `twitter:*`, JSON-LD `BlogPosting`) y CTAs hacia la app.

El blog se implementa como páginas TSX estáticas (mismo patrón que las landing/SEO existentes), sin
backend ni CMS. Los datos de los artículos viven en `src/features/blog/data/articles.tsx`.

## Problema / Necesidad

Hito tenía landing pública y páginas SEO puntuales (`/alternativa-trello`, `/docs`, etc.), pero no
había un espacio editorial propio para:

1. **Captar búsquedas orgánicas** de usuarios que buscan alternativas locales, gestión de proyectos
   offline, documentación de procesos o IA privada.
2. **Educar** a visitantes sobre cómo sacarle provecho a cada funcionalidad antes de abrir la app.
3. **Construir autoridad de marca** en torno a local-first, soberanía de datos y productividad sin
   dependencia de SaaS.

## Decisiones explícitas (no re-preguntar)

- **Páginas TSX estáticas, no CMS ni MDX.** Mantiene el mismo patrón de las landing/SEO actuales,
  tipado fuerte, versionado en git y cero dependencias nuevas.
- **Sin SSR/prerender.** Al igual que el resto de la SPA, el blog se renderiza en cliente; los
  metadatos se inyectan con `react-helmet-async`.
- **Rutas:** `/blogs` (índice) y `/blogs/:slug` (artículo). Slugs definidos manualmente en inglés
  técnico para URLs limpias.
- **Español primero.** Todo el contenido público de Hito está en español (ARG); no se contempla
  i18n en esta iteración.
- **No hay comentarios, autorías ni fechas dinámicas.** Cada artículo tiene metadatos estáticos
  (`publishedAt`, `readingTime`, `category`).
- **Categorías como filtros de UI, no como rutas.** Se accede por query string (`?categoria=...`)
  para no multiplicar URLs sin contenido propio.

## Historias de usuario (con criterios de aceptación)

### HU-01 — Índice de artículos
**Como** visitante, **quiero** ver todos los artículos del blog, **para** descubrir contenido
relevante.
- ✅ `/blogs` lista todos los artículos con título, extracto, categoría y tiempo de lectura.
- ✅ Destaca el artículo marcado como `featured`.
- ✅ Filtro por categoría actualiza la lista sin recargar.

### HU-02 — Leer un artículo
**Como** visitante, **quiero** abrir un artículo con URL limpia, **para** leerlo y compartirlo.
- ✅ `/blogs/:slug` muestra el artículo completo con layout editorial.
- ✅ Si el slug no existe, redirige a `/blogs`.
- ✅ Cada artículo tiene metadatos SEO completos y schema.org `BlogPosting`.

### HU-03 — Navegación desde la landing
**Como** visitante en la landing, **quiero** encontrar el blog fácilmente.
- ✅ El `LandingNav` incluye enlace a `/blogs` (desktop y mobile).
- ✅ El `LandingFooter` incluye enlace a `/blogs`.

### HU-04 — SEO técnico
**Como** motor de búsqueda, **quiero** descubrir e indexar correctamente el blog.
- ✅ `sitemap.xml` incluye `/blogs` y cada artículo.
- ✅ Cada artículo tiene `<title>`, `<meta name="description">`, `canonical`, Open Graph y
  Twitter Card.
- ✅ JSON-LD `BlogPosting` en cada artículo.

### HU-05 — Contenido alineado a funcionalidades
**Como** visitante, **quiero** entender cómo Hito resuelve problemas concretos.
- ✅ Cada artículo conecta su tema con una funcionalidad real de la app.
- ✅ Cada artículo termina con CTA hacia `/app`.
- ✅ Hay artículos de posicionamiento, educativos y de intención de búsqueda.

## Artículos iniciales (v1)

| Slug | Título | Pilar | Enfoque SEO |
|---|---|---|---|
| `soberania-datos-ventaja-competitiva` | La soberanía de los datos como ventaja competitiva | Privacidad / Pensamiento | "gestión de proyectos sin nube", "datos locales" |
| `documentar-procesos-equipo` | Cómo documentar procesos que tu equipo realmente use | Procesos | "documentar procesos", "SOPs equipo", "checklist equipo" |
| `asistente-ia-sin-entrenar-modelos` | ¿Tu asistente de IA está entrenándose con tus proyectos? | IA | "asistente IA privado", "IA sin enviar datos" |
| `menos-herramientas-mas-claridad` | Menos herramientas, más claridad: una jerarquía para organizar el trabajo | Productividad | "organizar proyectos y tareas", "jerarquía proyecto" |
| `automatizaciones-sin-nube` | Automatizaciones que no dependen de la nube | Automatización | "automatizar tareas sin nube", "automatización offline" |

## Fuera de alcance

- CMS/MDX, autorías múltiples, comentarios, newsletter, tags libres.
- Paginación (con 5 artículos no es necesaria).
- Páginas de categoría dedicadas (`/blogs/categoria/...`).
- i18n / contenido en inglés.
- Analytics o tracking de lectura.

## Métricas de éxito

- `/blogs` y cada `/blogs/:slug` cargan sin errores y pasan `tsc --noEmit`.
- `vite build` genera un chunk separado para `BlogIndexPage` y `BlogPostPage`.
- `sitemap.xml` válido con 6 nuevas URLs.
- 0 links rotos entre landing, footer y blog.
