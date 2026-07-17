# Especificación — Refresh estratégico de Landing + Blog para audiencia LatAm

- **Feature ID:** 028-landing-blog-refresh-latam
- **Estado:** Implementado en código (2026-07-17)
- **Fecha:** 2026-07-17
- **Principios afectados (constitución):** IV (diseño limpio y enfocado), V (simplicidad y entrega incremental)

## Progreso

- **Implementado y verificado (2026-07-17):** `tsc --noEmit` limpio, 510/510 tests Vitest, `vite build`
  OK. Sin smoke visual en navegador (pendiente confirmación del usuario).
- **HU-01 (Flujos e Integraciones):** nuevo componente `FlowsIntegrationsSection.tsx`, insertado en
  `LandingPage.tsx` entre `FeatureHighlights` y `AiAssistantSection` (ancla `#flujos`, agregada a
  `LandingNav`/`LandingFooter`). `FeatureHighlights` suma una 7ª tarjeta "Flujos e Integraciones".
- **HU-02 (tuteo LatAm):** conversión voseo→tuteo vía script determinístico
  (diccionario de pares léxicos + reglas de frase) sobre `src/features/landing/`,
  `src/features/blog/` y las páginas públicas de `src/features/seo/` (`DocsPage`, `SeoArticle`,
  `AlternativaTrelloPage`, `AlternativaNotionPage`, `ChangelogPage`, `GestorOfflinePage`) — estas
  últimas no estaban en el alcance original del spec pero se descubrieron con voseo durante la
  verificación y se corrigieron por consistencia (están linkeadas desde `Comparison.tsx` y el
  footer). **Gotcha real encontrado:** el `\b` de JS regex no reconoce vocales acentuadas como
  caracteres de palabra (`\w` es solo ASCII), así que reemplazos por `\bpalabraá\b` fallan
  silenciosamente en imperativos vos que terminan en vocal acentuada sin `s` (`gestioná`, `elegí`,
  `mirá`, `Pensalo`, `convertí`, etc.) — se corrigieron a mano tras un segundo grep con patrón
  `[letra]á\b|[letra]í\b`. Locale actualizado a **`es_CO`/`es-CO`** (Colombia, decisión explícita del
  usuario en esta sesión — no `es_419` como decía el borrador original del spec) en
  `LandingPage.tsx` (og:locale, JSON-LD `inLanguage`), `SeoPage.tsx` (og:locale compartido por
  blog/docs/alternativas) y `BlogPostPage.tsx` (`toLocaleDateString`).
- **HU-03 (CTA a blog en el body):** nuevo componente `BlogTeaser.tsx` (reutiliza `BlogCard`),
  insertado entre `Faq` y `FinalCta` en `LandingPage.tsx`.
- **HU-04 (blog LatAm + CTA a la app):** `BlogIndexPage.tsx` ya estaba en tuteo tras la conversión;
  se agregó CTA "Probar Hito — sin registro" + link secundario "Conocer el producto" en el hero.
- **HU-05 (vitrina de features al día):** `FeatureHighlights` actualizado — Kanban suma
  comentarios/archivado, Dashboard suma sprints/trimestres, Asistente IA suma fallback de modelos
  (verificado en código antes de escribir el copy, no en el campo `Estado` de los specs de origen).
- **Fix no planeado, pedido a mitad de sesión:** el link de GitHub apuntaba al placeholder
  `github.com/hito-app/hito` en 3 lugares (`LandingFooter.tsx`, `TrustBadges.tsx`, JSON-LD `sameAs`
  en `LandingPage.tsx`) — corregido a `github.com/appcreathings/Gestion-de-Proyectos-APP`.
- **Pendiente:** smoke visual manual del usuario (desktop y mobile), y decidir si vale la pena una
  spec separada para convertir el voseo del resto de `/app` (fuera de alcance acá a propósito).

## Resumen

Actualizar el copy y el contenido de la landing pública (`/`, spec 004) y del blog (`/blogs`, spec 009)
en dos frentes:

1. **Al día con el producto real.** La landing se escribió el 2026-07-05 (spec 004). Desde entonces se
   construyó el módulo más grande del roadmap — **Flujos e Integraciones** (specs 018–027: builder
   visual con React Flow, triggers por webhook/poll/evento, integraciones con HubSpot/Google
   Sheets/Email, webhooks salientes con firma HMAC, plantillas, reintentos) — y mejoras sustanciales al
   Kanban (comentarios, archivado, drawer de detalle unificado — specs 013–016) y al asistente IA
   (búsqueda semántica RAG — spec 007; fallback automático de modelos — spec 012). Nada de esto aparece
   hoy en `/`.
2. **Español neutro para LatAm.** El copy actual usa voseo rioplatense ("podés", "gestioná", "elegí",
   "compartila") en la mayoría de las secciones. Se reemplaza por tuteo neutro ("puedes", "gestiona",
   "eliges", "compartes") para no sonar regional a audiencias de México, Colombia, Perú, Chile, etc.

Además: se agrega un CTA hacia `/blogs` dentro del **cuerpo** de la landing (hoy el blog solo se
enlaza desde el nav y el footer) y se pareja el blog al mismo tono e idioma, agregando también un CTA
de regreso hacia la app en `BlogIndexPage` (hoy solo existe en `BlogPostPage`).

## Problema / Necesidad

- **Brecha de producto vs. marketing.** `FeatureHighlights.tsx` sigue mostrando las 6 tarjetas de
  spec 004 (Kanban, SOPs, Automatizaciones genéricas, Dashboard, IA, PWA). Un visitante que evalúa
  Hito como alternativa a Zapier/Make/n8n para conectar HubSpot o Sheets **no tiene forma de
  enterarse** de que esa capacidad existe sin entrar a `/app`. Es la pieza de trabajo más grande de
  las últimas dos semanas (10 specs, 018→027) y no tiene ni una mención.
- **Dialecto no neutro.** Confirmado por búsqueda en código: hay voseo en `Hero.tsx`, `HowItWorks.tsx`,
  `FeatureHighlights.tsx`, `ValueProps.tsx`, `AiAssistantSection.tsx`, `UseCases.tsx`, `FinalCta.tsx`,
  `LandingFooter.tsx`, `Faq.tsx` (vía JSON-LD en `LandingPage.tsx`) y `BlogPostPage.tsx` (locale
  `"es-AR"` para formatear fechas). También `og:locale`/`inLanguage` están fijados en `es_AR`/`es-AR`.
- **Blog aislado del embudo principal.** `/blogs` está enlazado desde `LandingNav` y `LandingFooter`,
  pero ningún bloque dentro del *body* de la landing (Hero, secciones intermedias, FinalCta) invita a
  leer contenido editorial. Es una vía de descubrimiento/SEO desaprovechada.
- **Vitrina de features desactualizada.** Verificado en código (no en el campo `Estado` de cada
  `spec.md`, que en este repo no siempre se actualiza tras implementar — ver spec 002 y 013–016, todas
  con `Estado: Borrador` pese a estar shippeadas): `TaskDetailDrawer.tsx` ya tiene comentarios
  (`task.comments`), archivado (`task.archived`) y subtareas; `SprintSwitcher.tsx`/
  `SprintFormDialog.tsx` confirman sprints/trimestres (spec 008). Ninguna de estas aparece en la
  landing.

## Decisiones explícitas (no re-preguntar)

- **Solo copy y contenido, no rediseño visual.** Se reutilizan los componentes y el sistema de diseño
  existentes (mismo Tailwind, mismos patrones de `Reveal`/grid/card ya usados en `FeatureHighlights`,
  `UseCases`, etc.). Nada de librerías nuevas, nada de capturas de pantalla reales (la landing actual
  es 100% texto + iconos `lucide-react`, sin screenshots — se mantiene ese lenguaje visual).
- **Tuteo neutro, no voseo ni "vosotros".** Reemplazar imperativos/conjugaciones voseantes por su forma
  tuteante en todas las secciones de `src/features/landing/` y `src/features/blog/`, incluyendo meta
  tags, JSON-LD (`LandingPage.tsx`) y el texto de `SeoPage`/`SeoArticle` que reciban props desde el
  blog. `og:locale` pasa de `es_AR` a **`es_CO`** (Colombia — decisión explícita del usuario;
  se evaluó `es_419` como alternativa neutral pero se optó por un país concreto); `inLanguage` de los
  JSON-LD pasa de `es-AR` a `es-CO`; `toLocaleDateString("es-AR", …)` en `BlogPostPage.tsx` pasa a
  `"es-CO"`.
- **Antes de escribir copy sobre una función, verificar que existe en código actual** (grep/lectura
  directa), no confiar en el campo `Estado` de los specs individuales — ya se comprobó que está
  desactualizado en varios casos.
- **Nueva sección "Flujos e Integraciones"** en la landing, ubicada entre `FeatureHighlights` y
  `AiAssistantSection` (incluida en el mismo patrón de `Reveal` que el resto). Contenido: builder
  visual (nodos arrastrables), triggers soportados (webhook entrante, sondeo/poll, evento interno de
  Hito), integraciones (HubSpot, Google Sheets, Email, Webhook saliente con firma HMAC verificable),
  plantillas listas para usar, reintentos automáticos ante fallas transitorias. Mismo estilo de card
  que `FeatureHighlights` o tabla-feature como `AiAssistantSection`, a criterio de implementación.
- **`FeatureHighlights` se actualiza, no se reemplaza:** la tarjeta "Automatizaciones" existente se
  separa o se referencia hacia la nueva sección de Flujos; la tarjeta "Kanban arrastrable" suma mención
  de comentarios/archivado; la tarjeta "Dashboard de portafolio" suma mención de sprints/trimestres.
- **CTA de blog dentro del body de la landing:** nuevo bloque compacto (candidato: entre `Faq` y
  `FinalCta`) con 2–3 artículos de `BLOG_ARTICLES` (destacados o más recientes) + botón "Ver todos los
  artículos" → `/blogs`. Debe verse en desktop y mobile sin abrir el menú.
- **`BlogIndexPage` suma un CTA hacia la app** (hoy solo existe en `BlogPostPage` vía prop `cta` de
  `SeoArticle`) — mismo mensaje/tono que el resto ("Probar Hito — sin registro" o equivalente en
  tuteo).
- **Comparison (tabla vs. Trello/Notion/ClickUp) no se toca en esta spec** — agregar una fila o mención
  de integraciones nativas queda fuera de alcance salvo decisión explícita posterior, para no mezclar
  el mensaje de privacidad (eje actual de esa tabla) con el de automatización.
- **Sin traducción a otros idiomas** (inglés, portugués) ni SSR/prerender — sigue siendo la misma SPA
  renderizada en cliente (decisión ya fijada en spec 004).

## Historias de usuario (con criterios de aceptación)

### HU-01 — Visitante descubre el módulo de Flujos e Integraciones sin entrar a `/app`
**Como** visitante evaluando herramientas de automatización, **quiero** ver en la landing que Hito
conecta HubSpot/Sheets/Email/Webhooks con un builder visual, **para** considerarlo como alternativa sin
tener que crear una carpeta primero.
- ✅ Nueva sección menciona: builder visual, triggers soportados, integraciones soportadas, plantillas,
  verificación HMAC de webhooks salientes.
- ✅ Sección visible en el flujo normal de scroll (no oculta detrás de un acordeón colapsado por
  defecto).

### HU-02 — Copy en español neutro LatAm
**Como** visitante de México, Colombia, Perú o Chile, **quiero** leer "puedes", "gestiona", "eliges" en
vez de "podés", "gestioná", "elegí", **para** sentir que el producto está escrito pensando en mi región
y no en un dialecto ajeno.
- ✅ 0 ocurrencias de conjugación voseo (imperativo/presente 2da persona singular con "vos") en
  `src/features/landing/` y `src/features/blog/`.
- ✅ Meta description, `og:description`, `twitter:description` y los 7 bloques de JSON-LD FAQ en
  `LandingPage.tsx` convertidos.
- ✅ `og:locale`/`inLanguage` en `es_419`/`es-419`; `toLocaleDateString` del blog ya no fuerza `"es-AR"`.

### HU-03 — CTA hacia el blog visible dentro del contenido de la landing
**Como** visitante que llegó a `/`, **quiero** ver una invitación clara a leer el blog dentro del
cuerpo de la página (no solo escondida en el nav), **para** descubrir contenido editorial sin buscarlo.
- ✅ Nuevo bloque en el body de `LandingPage` con ≥ 2 artículos reales de `BLOG_ARTICLES` + botón "Ver
  todos los artículos" → `/blogs`.
- ✅ Visible en desktop y mobile sin interacción adicional (scroll normal).

### HU-04 — Landing de `/blogs` coherente con LatAm y con cruce de vuelta a la app
**Como** visitante de `/blogs`, **quiero** que el copy esté en el mismo tono LatAm y que haya una forma
clara de volver a probar Hito, **para** no quedar atrapado solo leyendo contenido.
- ✅ `BlogIndexPage` con copy en tuteo, sin voseo.
- ✅ `BlogIndexPage` incluye un CTA hacia `/` o `/app` (hoy no existe; `BlogPostPage` ya lo tiene).
- ✅ Formato de fecha ya no fuerza el locale `es-AR`.

### HU-05 — Vitrina de features al día (Kanban avanzado, IA, sprints)
**Como** visitante evaluando el producto a fondo, **quiero** ver mencionadas las funciones recientes
(comentarios y archivado en tareas, drawer de detalle, búsqueda semántica RAG, fallback automático de
modelos IA, sprints/trimestres), **para** tener una imagen actualizada del producto real.
- ✅ `FeatureHighlights` y/o `AiAssistantSection` reflejan al menos: comentarios + archivado (kanban),
  RAG semántico, fallback de modelos, sprints/trimestres.
- ✅ Cada mención corresponde a código verificado como existente al momento de escribir el copy (no al
  campo `Estado` del spec de origen).

## Fuera de alcance

- Rediseño visual (paleta, tipografía, layout base) de landing o blog — solo copy/contenido y, como
  máximo, una sección nueva reutilizando patrones existentes.
- Traducción a otros idiomas (inglés/portugués) o SSR/prerender.
- Cambios a la tabla `Comparison` (vs. Trello/Notion/ClickUp).
- Capturas de pantalla o assets gráficos nuevos del producto (`og-image.png` sigue pendiente desde
  spec 004, no se resuelve acá).
- Cambios a `src/domain`, schemas, o cualquier lógica de `/app` — es un cambio 100% de contenido
  público.
- SEO técnico adicional más allá de ajustar el locale (sitemap, robots.txt, structured data nuevo no
  contemplado en HU-01 a HU-05).

## Métricas de éxito

- 0 ocurrencias de voseo en `src/features/landing/` y `src/features/blog/` (grep de conjugaciones
  `-ás`/`-és`/`-í́s` imperativas y "vos").
- La landing menciona explícitamente Flujos e Integraciones, comentarios/archivado de tareas, RAG
  semántico, fallback de modelos y sprints/trimestres — 0 funciones "fantasma" (mencionadas sin existir
  en código) ni funciones reales sin mencionar de esta lista.
- Existe al menos un CTA hacia `/blogs` visible en el body de `LandingPage` (fuera de nav/footer) y al
  menos un CTA hacia `/` o `/app` visible en `BlogIndexPage`.
- `tsc --noEmit`, la suite de tests Vitest y `vite build` en verde tras los cambios.
