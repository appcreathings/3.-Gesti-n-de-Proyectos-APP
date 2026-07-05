/**
 * Static SVG-ish dashboard mockup displayed under the Hero on the landing page.
 * Pure HTML + Tailwind so it's crisp at any size, has zero asset cost,
 * and stays under our control. It hints at Kanban + tree without faking data.
 */
export function ProductMockup() {
  return (
    <div className="relative mx-auto -mt-8 w-full max-w-5xl px-6 sm:-mt-16">
      <div className="pointer-events-none absolute inset-x-12 top-8 -z-10 h-24 rounded-full bg-foreground/5 blur-3xl" />

      <div className="rounded-2xl border border-border/70 bg-background shadow-2xl shadow-foreground/5">
        {/* Window chrome */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
            <span className="size-2.5 rounded-full bg-foreground/15" />
          </div>
          <div className="rounded-md bg-muted px-3 py-0.5 font-mono text-[10px] text-muted-foreground">
            hito / studies / sprint-7
          </div>
          <div className="w-12" />
        </div>

        <div className="grid grid-cols-12 gap-px bg-border/60 text-xs">
          {/* Sidebar */}
          <div className="col-span-3 space-y-2 bg-background p-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Árbol
            </p>
            {[
              { label: "Studies", depth: 0, active: true },
              { label: "Investigación", depth: 1 },
              { label: "Onboarding", depth: 2 },
              { label: "Sprint 7", depth: 3, current: true },
              { label: "Sprint 8", depth: 3 },
              { label: "Marketing", depth: 1 },
              { label: "Ops", depth: 1 },
              { label: "Biblioteca", depth: 1 },
            ].map((n) => (
              <div
                key={n.label}
                className={`flex items-center gap-1.5 rounded px-2 py-1 ${
                  n.current
                    ? "bg-foreground/5 text-foreground"
                    : "text-muted-foreground"
                }`}
                style={{ paddingLeft: `${8 + n.depth * 10}px` }}
              >
                <span className="size-1 rounded-full bg-current opacity-60" />
                <span className="truncate">{n.label}</span>
              </div>
            ))}
          </div>

          {/* Main area: Kanban */}
          <div className="col-span-9 space-y-3 bg-background p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Proyecto · Sprint 7
                </p>
                <p className="mt-0.5 text-sm font-medium">Onboarding redesign</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="rounded-md bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">
                  7 tareas
                </span>
                <span className="rounded-md bg-foreground px-2 py-1 font-mono text-[10px] text-background">
                  + nueva
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  title: "Pendiente",
                  count: "3",
                  cards: [
                    "Revisar feedback de 3 usuarias piloto",
                    "Actualizar SOP de bienvenida",
                  ],
                },
                {
                  title: "En curso",
                  count: "2",
                  cards: [
                    "Escribir plantillas de email v2",
                    "Diseñar pantalla de activación",
                  ],
                },
                {
                  title: "Hecho",
                  count: "5",
                  cards: [
                    "Auditar analytics de la semana 1",
                    "Cerrar hipótesis de drop-off",
                  ],
                },
              ].map((col) => (
                <div key={col.title} className="rounded-lg border border-border/60 bg-muted/30 p-2">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {col.title}
                    </p>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {col.count}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {col.cards.map((card) => (
                      <div
                        key={card}
                        className="rounded-md border border-border/60 bg-background p-2 text-[11px] leading-tight text-foreground/80 shadow-sm"
                      >
                        {card}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
