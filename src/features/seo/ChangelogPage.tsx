import { SeoPage } from "./SeoPage";

type Entry = {
  version: string;
  date: string;
  highlights: string[];
};

const ENTRIES: Entry[] = [
  {
    version: "v1.0",
    date: "2026-07-05",
    highlights: [
      "ErrorBoundary global con recuperación elegante.",
      "Code-splitting por ruta para reducir el bundle inicial.",
      "PWA instalable (ícono en barra de direcciones).",
      "ESLint + Prettier configurados.",
      "Deploy en Vercel listo (vercel.json con rewrites para SPA).",
    ],
  },
  {
    version: "M9–M11",
    date: "2026-07",
    highlights: [
      "Asistente IA: capa de tools estilo MCP, cliente Gemini con function calling en streaming.",
      "Panel de chat global con confirmación de escrituras.",
      "Capa de tools de lectura y escritura con esquemas Zod.",
    ],
  },
  {
    version: "M8",
    date: "2026-06",
    highlights: [
      "Kanban con drag-and-drop reordenable.",
      "Tab Actividad: historial por proyecto.",
      "Tab Automatizaciones por proyecto.",
      "Nombre de organización editable.",
    ],
  },
  {
    version: "M0–M7",
    date: "2026-05",
    highlights: [
      "CRUD completo de productos, proyectos, áreas, procesos, checklists y tareas.",
      "Tipos de proyecto y plantillas de checklist reutilizables.",
      "Automatizaciones trigger → condición → acción con evaluador temporal.",
      "Fechas y notificaciones.",
      "Dashboard CEO con salud RAG.",
    ],
  },
];

export function ChangelogPage() {
  return (
    <SeoPage
      title="Hito — Changelog"
      description="Novedades y releases de Hito, gestor de proyectos local-first. Historial público de cambios, sin filtros."
      path="/changelog"
    >
      <article className="border-b border-border/60">
        <div className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Changelog
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Construido en público
          </h1>
          <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground">
            Cada cambio visible en Hito queda registrado acá. Sin marketing, sin pildoras
            retroactivas. Si quieres saber qué cambió entre versiones, mira el Git log
            directamente.
          </p>

          <ol className="mt-12 space-y-12">
            {ENTRIES.map((e) => (
              <li key={e.version} className="border-l border-border/60 pl-6">
                <p className="font-mono text-xs uppercase tracking-widest text-brand-accent">
                  {e.date}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">{e.version}</h2>
                <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
                  {e.highlights.map((h) => (
                    <li key={h} className="flex gap-2">
                      <span aria-hidden className="text-brand-accent">
                        →
                      </span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </article>
    </SeoPage>
  );
}
