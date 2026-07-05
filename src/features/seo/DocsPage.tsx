import { SeoPage } from "./SeoPage";

export function DocsPage() {
  return (
    <SeoPage
      title="Hito — Documentación"
      description="Cómo empezar con Hito: instalación, primer producto, primer proyecto, automatizaciones, asistente IA y migración desde otras herramientas."
      path="/docs"
    >
      <article className="border-b border-border/60">
        <div className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Docs
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Documentación
          </h1>
          <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground">
            Hito es una app local-first: la mayoría de las preguntas se responden abriendo la
            carpeta donde guardás los datos. Esta página resume lo esencial; el detalle vive en
            el README y la wiki del repositorio.
          </p>

          <div className="mt-12 space-y-10">
            <section>
              <h2 className="text-2xl font-semibold tracking-tight">Empezar en 60 segundos</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-6 text-muted-foreground">
                <li>Instalá la PWA desde el navegador (Chrome/Edge).</li>
                <li>Elegí una carpeta vacía de tu equipo.</li>
                <li>Creá un producto y un proyecto.</li>
                <li>Empezá a mover tarjetas en el Kanban.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-2xl font-semibold tracking-tight">Conectar el asistente IA</h2>
              <p className="mt-3 text-muted-foreground">
                En <strong>Ajustes → Asistente IA</strong> pegá tu API key de Google AI Studio y
                elegí un modelo (gemini-2.5-flash por defecto). La clave queda guardada solo en
                este navegador. El chat se abre con <kbd>Ctrl/Cmd+J</kbd>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold tracking-tight">Compartir con tu equipo</h2>
              <p className="mt-3 text-muted-foreground">
                Los datos son archivos <code>.json</code>. Compartilos por red local, Dropbox,
                Git o el medio que prefieras. Cada persona abre la misma carpeta desde su Hito.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold tracking-tight">Privacidad</h2>
              <p className="mt-3 text-muted-foreground">
                Hito no envía tus datos a ningún servidor. La única comunicación externa
                opcional es hacia Gemini, y solo cuando usás el asistente IA con tu key
                explícita. No hay analytics de terceros.
              </p>
            </section>
          </div>
        </div>
      </article>
    </SeoPage>
  );
}
