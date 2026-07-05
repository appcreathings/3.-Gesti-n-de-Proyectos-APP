# Hito — Guía de marca

> Single source of truth. Si tenés que elegir entre esta guía y la intuición, gana la guía.
> Última actualización: 2026-07-05.

---

## 1. Propósito (por qué existimos)

**Creemos que tus proyectos no deberían ser el producto de otra empresa.**

La mayoría de las herramientas de gestión de proyectos te piden tus datos para funcionar y los
venden —en el mejor caso— como "insights". Hito cree que la nube no debería ser obligatoria,
que un `.json` debería ser suficiente, y que un equipo pequeño no debería pagar licencia para
operar.

## 2. Valores (lo que defendemos)

| Valor | Qué significa | Qué NO es |
|---|---|---|
| **Privacidad por defecto** | Los datos del usuario nunca salen de su equipo sin opt-in explícito. | No es "cumplimos GDPR". No es "tenemos encriptación". |
| **Formatos abiertos** | Todo lo que el usuario crea es legible, exportable y versionable con Git. | No es "tenemos export a PDF". Es que el formato *es* el documento. |
| **Cero fricción** | Sin cuentas, sin verificación de email, sin onboarding de 17 pasos. | No es "minimalismo estético". Es eliminar decisiones que el usuario no pidió tomar. |
| **Código abierto como contrato** | MIT no es marketing; es que cualquiera puede auditar, bifurcar y hostear. | No es "open core con features pagas". No hay features pagas. |
| **Cuidado artesanal** | Cada detalle importa: copy, microinteracciones, rendimiento. | No es "polished" como estilo. Es respeto por el tiempo del usuario. |

## 3. Posicionamiento (en una línea)

> Para equipos de 1 a 15 personas que gestionan múltiples proyectos y procesos, **Hito** es el
> gestor **local-first** que vive en una carpeta de tu equipo. A diferencia de Trello, Notion o
> ClickUp, **Hito** no guarda tus datos en sus servidores — son archivos `.json` que vos
> controlás, versionás y compartís como prefieras.

## 4. Arquetipo

**Outlaw + Sage** (híbrido).

- **Outlaw**: desafiamos la idea de que la nube es obligatoria. "Sin nube. Sin cuenta. Sin
  suscripción." es nuestra declaración de principios.
- **Sage**: cuando afirmamos que un `.json` es suficiente, mostramos el código. Privacidad por
  defecto se demuestra con arquitectura, no con marketing.

## 5. Audiencia objetivo

| Segmento | Dolor | Por qué Hito |
|---|---|---|
| **Freelancer / solopreneur** | Mezcla proyectos de clientes, no quiere pagar licencia, valora control. | "Una carpeta, un proyecto por cliente, todo versionado." |
| **Consultora / agencia pequeña (5-15)** | Cambia de cliente, no quiere perder contexto, necesita SOPs versionados. | "Cada producto es un árbol. Cada SOP es un diff." |
| **Startup técnico (3-10)** | Ya usa Git para todo, no quiere que el PM sea otra silo de datos. | "`/projects/*.json` commiteado junto al código." |
| **Estudio legal / contable** | Confidencialidad no es opcional. Cero nubes, cero terceros. | "Cero datos saliendo del equipo. Exporta por cliente." |

**No es para**: equipos > 50 personas que necesitan SSO, audit logs distribuidos o compliance
SOC2. Hito no compite ahí.

## 6. Voz y tono

### Voz (constante)

- **Directa**. Decimos lo que el producto hace. Sin rodeos.
- **Técnica cuando suma**. Usamos términos de dominio (SOP, trigger, RACI) sin explicarlos
  condescendientemente.
- **Cercana**. Voseo argentino neutro (*"elegís"*, *"creás"*, *"gestionás"*). Coherente en todo
  el copy público.

### Tono (varía por contexto)

| Contexto | Tono |
|---|---|
| Hero, value props | **Confiado y desafiante.** "Sin rendir cuentas a la nube." |
| Docs, FAQ | **Claro y didáctico.** Pasos numerados, ejemplos concretos. |
| Errores | **Humilde y útil.** "Algo falló. Probá recargar; si persiste, reportalo." |
| Changelog | **Entusiasta y específico.** Qué cambió, por qué, cómo probarlo. |

### Términos preferidos

| Evitar | Preferir | Por qué |
|---|---|---|
| workspace | carpeta | Es lo que el usuario ve en su disco. |
| team (en UI) | equipo | Coherencia con el idioma. |
| cloud / nube | nube (con comillas) o "la nube" | Cuestionar el término, no adoptarlo. |
| user | equipo / vos | Hito no tiene "usuarios" individuales. |
| sync | compartir / versionar | "Sync" implica servidor central. |
| login | abrir / conectar | No hay cuentas. |
| streamline / revolutionize | (ninguno) | Vacío de significado. |
| AI-powered | Asistente IA / asistente | Más específico, menos buzzword. |

## 7. Identidad visual

### Logo

- **Nombre**: Hito.
- **Símbolo**: un mojón (poste de piedra) con banderín — meta de camino, marca durable.
- **Variantes**:
  - **Full**: símbolo + wordmark (default).
  - **Mark**: solo símbolo (favicon, PWA icon).
  - **Inverted**: wordmark en claro sobre fondo primario.
- **Zona segura**: 1× la altura del banderín en todos los lados.
- **Tamaño mínimo**: 24 px de alto para mark, 96 px de ancho para full.
- **Color del símbolo**: `--foreground` sobre fondo claro, `--background` sobre fondo oscuro.

### Paleta

| Token | HSL | HEX sugerido | Uso |
|---|---|---|---|
| `--primary` | 220 50% 31% | `#2A4074` | CTAs, headings acento, focus. |
| `--primary-foreground` | 0 0% 100% | `#FFFFFF` | Texto sobre primary. |
| `--accent` (nuevo) | 158 64% 40% | `#2BB673` | Éxito, badges "open source", CTA hover. |
| `--success` | 142 71% 38% | `#1FAA59` | Confirmaciones, checks. |
| `--warning` | 38 92% 50% | `#F5A623` | Atención, pendientes. |
| `--destructive` | 0 72% 50% | `#D6322F` | Errores, destructivo. |
| `--background` | 0 0% 100% | `#FFFFFF` | Fondo light mode. |
| `--foreground` | 222 47% 11% | `#0F172A` | Texto principal. |
| `--muted` | 210 20% 96% | `#F5F7FA` | Fondos secundarios. |
| `--muted-foreground` | 215 16% 47% | `#64748B` | Texto secundario. |

> **Regla de oro**: el `--primary` no aparece más del 25% de la composición. El color dominante
> es siempre el fondo.

### Tipografía

| Rol | Familia | Pesos | Tamaño |
|---|---|---|---|
| Display (h1, h2) | Inter Variable | 600 | 36 / 48 / 60 / 72 px |
| Body | Inter Variable | 400 / 500 | 14 / 16 / 18 px |
| Mono (paths, datos) | JetBrains Mono Variable | 400 / 500 | 12 / 14 px |

**Regla**: `Inter` cuenta la historia. `JetBrains Mono` muestra la evidencia (archivos,
JSON, comandos). Nunca al revés.

### Iconografía

- Set: **Lucide** (línea fina, 1.5 px).
- Tamaño estándar: 20 px en cards, 16 px en inline, 14 px en labels.
- Color: `currentColor` por defecto; `--primary` en hover o activo.

### Voz visual en UI

- **Bordes sutiles** (`border-border/60`) en lugar de sombras pesadas.
- **Espaciado generoso** (secciones `py-24` desktop, `py-16` mobile).
- **Grid de puntos** decorativo en Hero, no en otras secciones.
- **Mockup en producto** = HTML+Tailwind, no imágenes raster (cero asset cost, accesibilidad).

## 8. Tagline canónico

> **Hito — El gestor de proyectos que trabaja offline y no te pide tus datos.**

Variantes permitidas (mismo significado):
- "Gestión de proyectos, procesos y checklists 100% local-first."
- "Tus proyectos no deberían ser el producto de otra empresa."

Variantes **prohibidas** (rompen la promesa):
- "El Trello killer." (competimos por valores, no por features).
- "AI-powered project management." (buzzword vacío).
- "Secure cloud-based…" (Hito no es cloud).

## 9. Pilares de prueba social

1. **El producto es la prueba**. Cualquiera puede clonar el repo y leer 200 líneas de código y
   ver que no hay tracking, no hay llamadas a servidores externos (excepto Gemini opt-in).
2. **El formato es la prueba**. Mostrar un `.json` real en el Hero es más convincente que
   cualquier testimonial.
3. **GitHub stars/forks** como señal, no como meta.
4. **Changelog público** como prueba de mantenimiento.

> Hito no compra testimonios, no muestra logos de empresas "que lo usan" sin permiso, y no
> muestra métricas infladas. Si no hay datos, no se inventan.

## 10. Lo que nunca hacemos

- ❌ Popups de "suscribite al newsletter" antes de scrollear.
- ❌ Dark patterns de " aceptá las cookies para continuar" (no usamos cookies).
- ❌ Countdowns, urgencia artificial, "solo hoy".
- ❌ Comparativas agresivas con competidores nombrándolos en tono despectivo.
- ❌ Tracking de analytics de terceros (sin GA, sin Meta Pixel, sin Hotjar).
- ❌ Planes "freemium" con features bloqueadas. Es MIT, es todo, siempre.

---

**Mantenimiento**: este documento se actualiza cuando cambia el posicionamiento, la voz o la
paleta. Cambios cosméticos en copy o UI no requieren tocarlo.
