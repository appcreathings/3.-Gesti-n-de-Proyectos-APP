# Plan Técnico — Blog público y contenido SEO

- **Feature:** 009-blog-y-contenido-seo
- **Constitución:** alineado con IV (diseño limpio) y V (simplicidad). Sin violaciones — no toca
  esquema de datos (II), ni storage (I/VI), ni lógica de negocio.

## Alcance técnico

Sin dependencias nuevas. Se reutiliza el stack ratificado y los componentes existentes de SEO
(`SeoPage`, `SeoArticle`) y landing (`LandingNav`, `LandingFooter`).

## Hallazgo crítico de la exploración

El repo ya contaba con un esqueleto de blog en `src/features/blog/` y rutas en `App.tsx`, pero
faltaba la conexión con el sitio (navegación, sitemap) y el archivo de artículos tenía la extensión
`.ts` con contenido JSX, lo que rompía la compilación de TypeScript.

## Orden de implementación (3 fases)

**Fase 1 — Estructura y datos:**
1. Verificar/crear tipos en `src/features/blog/types.ts`.
2. Verificar/crear categorías en `src/features/blog/data/categories.ts`.
3. Definir 5 artículos en `src/features/blog/data/articles.tsx` (extensión `.tsx` para JSX).
4. Crear utilidades (`slugify.ts`) y helpers de filtrado (`getArticleBySlug`, `getFeaturedArticles`,
   `getRecentArticles`).

**Fase 2 — Componentes y páginas:**
1. `BlogCard.tsx` — tarjeta de artículo con categoría, tiempo de lectura y CTA.
2. `CategoryBadge.tsx` — badge de categoría, opcionalmente linkeable.
3. `RelatedPosts.tsx` — sugiere artículos de la misma categoría al final de un post.
4. `BlogIndexPage.tsx` — hero, post destacado, filtros por categoría y grilla de artículos.
5. `BlogPostPage.tsx` — layout editorial con metadatos, fecha y artículos relacionados.

**Fase 3 — Integración y SEO:**
1. Agregar rutas `/blogs` y `/blogs/:slug` en `App.tsx` (lazy-loaded).
2. Agregar enlace a `/blogs` en `LandingNav` (desktop/mobile) y `LandingFooter`.
3. Actualizar `public/sitemap.xml` con `/blogs` y cada artículo.
4. Verificar que cada artículo tenga `title`, `description`, `canonical`, Open Graph, Twitter Card y
   JSON-LD `BlogPosting`.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El archivo de artículos se guarda como `.ts` y TypeScript rechaza el JSX | Extensión explícita `.tsx`; typecheck en CI |
| Slugs duplicados o rotos | Fuente única de verdad en `BLOG_ARTICLES`; redirección a `/blogs` si no existe |
| URLs de categorías rompen SEO por contenido duplicado | Categorías solo como filtros de UI (`?categoria=...`), no rutas propias |
| Peso del bundle por cargar todos los artículos en el índice | Datos estáticos pequeños (~15 KB gzipeados); code-splitting por ruta |

## Estrategia de verificación

Después de cada fase: `npm run typecheck`, `npm run build`.
Completado en las 3 fases. Verificar manualmente en navegador:
- `/blogs` muestra el índice y el filtro funciona.
- `/blogs/:slug` muestra el artículo, metadatos y relacionados.
- Slug inexistente redirige a `/blogs`.
- Navegación desde landing/footer llega al blog sin recarga.

## Gates de la constitución (revisión)

- ✅ **I Local-first:** no se envían datos; el blog es contenido estático.
- ✅ **II Esquema-contrato:** sin cambios de esquema ni migraciones.
- ✅ **III Plantillas/Tipos:** sin cambios funcionales.
- ✅ **IV Diseño limpio:** reutiliza `SeoPage`, `SeoArticle` y componentes UI existentes.
- ✅ **V Simplicidad/incremental:** 3 fases independientes, sin CMS ni backend.
- ✅ **VI Migrabilidad:** no toca `StorageAdapter`.
