import { Building2, Code2, Scale } from "lucide-react";

const CASES = [
  {
    icon: Building2,
    industry: "Consultora / agencia",
    team: "Equipo de 5 a 15 personas",
    story:
      "Manejan 8 cuentas activas, cada una con su árbol de proyectos. Cambian de cliente sin perder contexto ni arrastrar datos de uno a otro.",
    metric: "8 cuentas × SOPs versionados",
  },
  {
    icon: Code2,
    industry: "Startup técnico",
    team: "Producto + ops + soporte",
    story:
      "El repo de git tiene su carpeta /projects. Cada PR que toca un proceso deja un diff legible. La IA responde sobre el estado sin ver los datos.",
    metric: "100% auditable por git",
  },
  {
    icon: Scale,
    industry: "Estudio legal / contable",
    team: "3 a 10 profesionales",
    story:
      "La confidencialidad es la norma: nada de nubes, nada de cuentas, nada de backups que ellos no controlen. Exportan un .zip por cliente al cerrar.",
    metric: "Cero datos saliendo del equipo",
  },
];

export function UseCases() {
  return (
    <section id="uso" className="border-b border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="mx-auto mb-16 max-w-2xl text-center sm:mb-20">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Casos de uso
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Funciona donde la privacidad es la norma, no el extra.
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Equipos pequeños que prefieren tener el control de sus datos.
            Cada uno lo usa un poco distinto.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-border/60 bg-border lg:grid-cols-3">
          {CASES.map((c) => {
            const Icon = c.icon;
            return (
              <article key={c.industry} className="flex flex-col gap-4 bg-background p-7">
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg border border-border">
                    <Icon className="size-5" />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Caso
                  </span>
                </div>
                <div>
                  <p className="text-base font-semibold tracking-tight">
                    {c.industry}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.team}</p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {c.story}
                </p>
                <p className="mt-auto border-t border-border/60 pt-4 font-mono text-xs text-foreground/80">
                  {c.metric}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
