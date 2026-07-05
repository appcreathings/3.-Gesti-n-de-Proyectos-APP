# Gestor de Proyectos, Procesos y Checklists

Aplicación web **local-first** para gestionar múltiples **productos y proyectos**, con foco en
**documentar procesos (SOPs) y checklists por área**, definir **Tipos de Proyecto** y **Plantillas
de Checklist** reutilizables, ejecutar **automatizaciones de PM** y conversar con un
**asistente IA (Gemini)** conectado a todos tus datos. Datos en archivos `.json` dentro de una
carpeta local (File System Access API). Sin backend.

> Planeado con **Spec-Driven Development** (estilo GitHub Spec Kit).

## Stack
React 18 · TypeScript · Vite · Tailwind · shadcn/ui · Zustand · Zod · File System Access API ·
@dnd-kit (Kanban) · @google/genai (asistente IA).

## Privacidad (local-first)
**Tus datos nunca salen de tu equipo.** No hay backend: todo se guarda en una carpeta local que
tú eliges (File System Access API, Chrome/Edge) o en IndexedDB con export/import manual
(Firefox/Safari). La API key de Gemini vive solo en IndexedDB de tu navegador. Desplegar la app
en la web solo publica el _código_; cada visitante trabaja con sus propios datos locales.

## Cómo correr
```bash
npm install
npm run dev        # desarrollo
npm run typecheck  # tsc --noEmit
npm test           # vitest (dominio puro + capa de tools IA)
npm run lint       # eslint
npm run build      # producción (PWA incluida)
npm run preview    # sirve dist/ para probar el build
```

## Deploy (Vercel)
La app es un SPA estático con `createBrowserRouter`; el rewrite necesario ya está en
[`vercel.json`](vercel.json). Pasos:

1. Crea un repo en GitHub y sube el código (`git push`). Verifica antes que `local-data-app/`
   **no** esté trackeado (`git status` no debe mostrarlo; está en `.gitignore`).
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo. Vercel detecta
   Vite automáticamente (build `npm run build`, output `dist/`). No se necesita ninguna variable
   de entorno.
3. Deploy. Comprueba en producción: refrescar en una ruta profunda (p. ej. `/projects/<id>`)
   debe funcionar, y la app debe ser instalable como PWA (icono en la barra de direcciones).

Cada push a `main` redespliega automáticamente.

## Asistente IA (Gemini)
- Configúralo en **Ajustes → Asistente IA**: pega una API key de
  [Google AI Studio](https://aistudio.google.com/apikey), valida y elige modelo
  (`gemini-2.5-flash` por defecto).
- Ábrelo con **Ctrl/Cmd+J** o el botón «Asistente» de la barra lateral.
- Habla con tus datos mediante una **capa de herramientas estilo MCP** (`src/ai/tools/`):
  definiciones Zod → JSON Schema consumidas por Gemini vía function calling. Lecturas libres;
  **las escrituras piden confirmación** en el chat (configurable).
- **Seguridad de la clave**: se guarda solo en este dispositivo (IndexedDB), nunca en
  `workspace.json` ni en las exportaciones. Se borra con un clic desde Ajustes.
- La conversación se guarda solo en el dispositivo (última conversación, IndexedDB).

## Documentación (Spec Kit)

| Artefacto | Ruta | Qué contiene |
|-----------|------|--------------|
| Constitución | [`.specify/memory/constitution.md`](.specify/memory/constitution.md) | Principios no negociables |
| Especificación | [`specs/001-gestion-proyectos/spec.md`](specs/001-gestion-proyectos/spec.md) | Qué y por qué; historias de usuario |
| Plan técnico | [`specs/001-gestion-proyectos/plan.md`](specs/001-gestion-proyectos/plan.md) | Stack, capas, riesgos |
| Research | [`specs/001-gestion-proyectos/research.md`](specs/001-gestion-proyectos/research.md) | Decisiones técnicas resueltas |
| Modelo de datos | [`specs/001-gestion-proyectos/data-model.md`](specs/001-gestion-proyectos/data-model.md) | Entidades + JSON + relaciones |
| Contratos | [`specs/001-gestion-proyectos/contracts/storage-contract.md`](specs/001-gestion-proyectos/contracts/storage-contract.md) | StorageAdapter + automatizaciones |
| Quickstart | [`specs/001-gestion-proyectos/quickstart.md`](specs/001-gestion-proyectos/quickstart.md) | Cómo correr y primer uso |
| Tasks | [`specs/001-gestion-proyectos/tasks.md`](specs/001-gestion-proyectos/tasks.md) | Plan de implementación por milestones |

## Estado
- ✅ M0–M7: núcleo completo (CRUD, tipos/plantillas, automatizaciones, fechas y
  notificaciones, dashboard CEO, pulido, experiencia de creación).
- ✅ M8: pulido de uso diario — Kanban con drag-and-drop, tab **Actividad** (historial por
  proyecto), tab **Automatizaciones por proyecto**, nombre de organización editable.
- ✅ M9–M11: **asistente IA** — capa de tools estilo MCP, cliente Gemini con function calling
  en streaming, panel de chat global con confirmación de escrituras.
- ✅ Spec 002: refactor visual (PageHeader/Breadcrumb/EntityCard/HealthBadge compartidos).
- ✅ Spec 003: drag & drop para reordenar checklists, pasos, áreas y Kanban intra-columna.
- ✅ v1.0: listo para deploy — ErrorBoundary, code-splitting por ruta, PWA instalable,
  ESLint/Prettier, config de Vercel.

## Arquitectura (resumen)
```
src/domain/       Schemas Zod (contrato) + lógica pura (progreso, salud, migraciones)
src/storage/      StorageAdapter → FileSystemAdapter | DownloadAdapter (IndexedDB)
src/automations/  Motor trigger→condición→acción + evaluador temporal + log de actividad
src/ai/tools/     Capa MCP-style: tools Zod→JSON Schema sobre el estado (read/write)
src/ai/gemini/    Cliente @google/genai, system prompt, loop agéntico con confirmaciones
src/store/        Zustand: app (conexión/workspace), data (entidades), aiConfig, chat
src/features/     Páginas: dashboard, productos, proyectos, biblioteca, automatizaciones,
                  notificaciones, ajustes, asistente (panel)
```

## Modelo de dominio (resumen)
```
Producto → Proyecto → Área → { Proceso(SOP), Checklist → Ítem }
                    → Tarea (Kanban con drag-and-drop)
Definiciones: Tipo de Proyecto, Plantilla de Checklist/Proceso
Gobierno: Automatizaciones, Notificaciones, Actividad, Personas (RACI), Dashboard
IA: Asistente Gemini con herramientas estilo MCP sobre todos los datos
```
