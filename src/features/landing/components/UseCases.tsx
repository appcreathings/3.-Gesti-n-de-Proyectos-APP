/**
 * UseCases — 4 casos de uso por industria/tipo de equipo.
 *
 * Casos:
 * - Consultora/agencia (5-15 personas): múltiples cuentas con SOPs versionados
 * - Startup técnico: repo Git con carpeta /projects, 100% auditable
 * - Estudio legal/contable (3-10): confidencialidad total, cero nubes
 * - Freelancer/solopreneur (1-3): todo el negocio en una carpeta
 *
 * Cada card: icono, industria, team size, story y metric destacado.
 * Layout: Grid 4 columnas en desktop, 2 en tablet, 1 en mobile.
 */
import { Building2, Code2, Scale, User } from "lucide-react";

const CASES = [
  {
    icon: Building2,
    industry: "Consultora / agencia",
    team: "Equipo de 5 a 15 personas",
    story:
      "Manejan múltiples cuentas activas, cada una con su propio árbol de proyectos. Con Hito cambian de cliente sin perder contexto ni mezclar datos. Los SOPs de cada cuenta quedan documentados para siempre.",
    metric: "8 cuentas × SOPs versionados",
  },
  {
    icon: Code2,
    industry: "Startup técnico",
    team: "Producto + ops + soporte",
    story:
      "El repo de Git tiene su carpeta /projects. Cada PR que toca un proceso deja un diff legible. El asistente IA responde sobre el estado del proyecto sin que los datos salgan de la máquina.",
    metric: "100% auditable por Git",
  },
  {
    icon: Scale,
    industry: "Estudio legal / contable",
    team: "3 a 10 profesionales",
    story:
      "La confidencialidad no es opcional: cero nubes, cero cuentas externas, cero backups que ellos no controlen. Exportan un .zip por cliente al cerrar el caso y lo archivan con total seguridad.",
    metric: "Cero datos saliendo del equipo",
  },
  {
    icon: User,
    industry: "Freelancer / solopreneur",
    team: "De 1 a 3 personas",
    story:
      "Gestionas proyectos de distintos clientes sin mezclar información. Creas plantillas de checklist para tus procesos recurrentes y tienes un dashboard que te muestra el estado de todo tu negocio.",
    metric: "Todo tu negocio en una carpeta",
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

        <div className="grid gap-px overflow-hidden rounded-2xl border border-border/60 bg-border sm:grid-cols-2 lg:grid-cols-4">
          {CASES.map((c) => {
            const Icon = c.icon;
            return (
              <article
                key={c.industry}
                className="group flex flex-col gap-4 bg-background p-7 transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/[0.03]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg border border-border transition-colors duration-300 group-hover:border-primary/30 group-hover:bg-primary/[0.06]">
                    <Icon className="size-5 transition-colors duration-300 group-hover:text-primary" />
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
