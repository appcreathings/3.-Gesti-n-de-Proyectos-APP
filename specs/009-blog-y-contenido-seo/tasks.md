# Tasks — Blog público y contenido SEO

## Fase 1 — Estructura y datos

- [x] Crear `src/features/blog/types.ts` con tipos `BlogCategory` y `BlogArticle`.
- [x] Crear `src/features/blog/data/categories.ts` con labels y descripciones.
- [x] Crear `src/features/blog/utils/slugify.ts`.
- [x] Crear `src/features/blog/data/articles.tsx` con 5 artículos iniciales.
- [x] Implementar helpers `getArticleBySlug`, `getFeaturedArticles`, `getRecentArticles`.
- [x] Verificar extensión `.tsx` del archivo de artículos.

## Fase 2 — Componentes y páginas

- [x] Crear `src/features/blog/components/CategoryBadge.tsx`.
- [x] Crear `src/features/blog/components/BlogCard.tsx`.
- [x] Crear `src/features/blog/components/RelatedPosts.tsx`.
- [x] Crear `src/features/blog/pages/BlogIndexPage.tsx` (índice + filtros + destacado).
- [x] Crear `src/features/blog/pages/BlogPostPage.tsx` (artículo + metadatos + relacionados).
- [x] Manejar slug inexistente con redirección a `/blogs`.

## Fase 3 — Integración y SEO

- [x] Agregar lazy imports y rutas `/blogs`, `/blogs/:slug` en `App.tsx`.
- [x] Agregar enlace a `/blogs` en `LandingNav` (desktop y mobile).
- [x] Agregar enlace a `/blogs` en `LandingFooter`.
- [x] Actualizar `public/sitemap.xml` con `/blogs` y cada artículo.
- [x] Verificar metadatos SEO en cada artículo (`title`, `description`, `canonical`, OG, Twitter, JSON-LD).
- [x] Ejecutar `npm run typecheck` y `npm run build`.

## Mejoras SEO aplicadas en esta iteración

- [x] Audit de keywords: títulos y headings ahora apuntan a búsquedas concretas.
- [x] Añadir FAQs estructuradas en cada artículo.
- [x] Añadir enlaces internos a funcionalidades de la app y a conceptos relacionados.
- [x] Actualizar `sitemap.xml` con slugs SEO-friendly.

## Mejoras SEO futuras (v1.1)

- [ ] Generar og-image específico por artículo o por categoría.
- [ ] Crear artículos comparativos (Hito vs Notion, Hito vs Trello) bajo `/blogs`.
- [ ] Añadir breadcrumb schema y navegación secundaria en posts.
- [ ] Implementar búsqueda interna en `/blogs` cuando haya más de 12 artículos.
