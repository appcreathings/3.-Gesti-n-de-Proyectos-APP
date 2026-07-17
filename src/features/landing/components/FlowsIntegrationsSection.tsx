/**
 * FlowsIntegrationsSection — Detalle del módulo de Flujos e Integraciones.
 *
 * Alternativa local-first a Zapier/Make/n8n: builder visual (React Flow),
 * triggers por webhook/sondeo/evento interno, acciones hacia HubSpot,
 * Google Sheets, Email y webhooks salientes con firma HMAC verificable,
 * plantillas curadas y reintentos automáticos ante fallas transitorias.
 *
 * Mismo patrón visual que AiAssistantSection: 3 pilares + flujo de pasos.
 */
import { Waypoints, Plug, ShieldCheck, Webhook, GitBranch, Send, RefreshCw, ArrowRight } from "lucide-react";

const PILLARS = [
  {
    icon: Waypoints,
    tag: "Builder visual",
    title: "Arma flujos arrastrando nodos",
    body: "Diseña triggers → condiciones → acciones en un lienzo visual (React Flow), con vista previa del pipeline y traza de cada ejecución para depurar sin adivinar qué pasó.",
    detail: "Trigger → Condición → Acción → Traza",
  },
  {
    icon: Plug,
    tag: "Integraciones",
    title: "Conecta HubSpot, Sheets, Email y webhooks",
    body: "Trae datos con un webhook entrante o sondeo periódico, y dispara acciones hacia HubSpot, Google Sheets, Email o un webhook saliente propio. Sin cuenta intermedia: tus credenciales quedan cifradas en tu equipo.",
    detail: "HubSpot · Google Sheets · Email · Webhooks",
  },
  {
    icon: ShieldCheck,
    tag: "Confiabilidad",
    title: "Plantillas listas y reintentos automáticos",
    body: "Empieza desde plantillas curadas en vez de una tela en blanco. Ante fallas transitorias (red, HTTP 5xx) los reintentos son automáticos, y cada webhook saliente incluye firma HMAC verificable del lado receptor.",
    detail: "Plantillas → Reintentos → Firma HMAC",
  },
];

const FLOW_STEPS = [
  {
    icon: Webhook,
    label: "Trigger",
    desc: "Un webhook entrante, un sondeo periódico o un evento interno de Hito.",
  },
  {
    icon: GitBranch,
    label: "Condición",
    desc: "Filtra con reglas simples antes de disparar cualquier acción.",
  },
  {
    icon: Send,
    label: "Acción",
    desc: "Crea un registro en HubSpot, escribe en Sheets, envía un email o un webhook.",
  },
  {
    icon: RefreshCw,
    label: "Reintentos",
    desc: "Si falla por una razón transitoria, se reintenta solo, con traza visible.",
  },
];

export function FlowsIntegrationsSection() {
  return (
    <section id="flujos" className="border-b border-border/60 bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="mx-auto mb-16 max-w-2xl text-center sm:mb-20">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Flujos e integraciones
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            La alternativa local-first a Zapier o Make.
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Conecta Hito con las herramientas que ya usas, sin mandar tus datos a un
            intermediario en la nube que no controlas.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.tag}
                className="group relative flex flex-col gap-4 rounded-2xl border border-border/60 bg-background p-7 transition-all duration-300 hover:border-primary/30 hover:bg-primary/[0.02]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-background transition-colors duration-300 group-hover:border-primary/30 group-hover:bg-primary/[0.06]">
                    <Icon className="size-5 transition-colors duration-300 group-hover:text-primary" />
                  </div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">
                    {p.tag}
                  </span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight">{p.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {p.body}
                </p>
                <p className="mt-auto border-t border-border/60 pt-4 font-mono text-xs text-foreground/70">
                  {p.detail}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-20">
          <div className="mx-auto mb-10 max-w-xl text-center">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Anatomía de un flujo
            </p>
            <h3 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              De un evento externo a una acción, sin código.
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FLOW_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.label}
                  className="group relative flex flex-col gap-3 rounded-xl border border-border/60 bg-background p-5 transition-all duration-300 hover:border-primary/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full border border-primary/30 bg-primary/[0.06] font-mono text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <Icon className="size-4 text-muted-foreground transition-colors duration-300 group-hover:text-primary" />
                  </div>
                  <h4 className="text-sm font-semibold tracking-tight">{step.label}</h4>
                  <p className="text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
                  {i < FLOW_STEPS.length - 1 && (
                    <ArrowRight className="hidden lg:absolute lg:-right-3 lg:top-1/2 lg:block lg:size-3 lg:-translate-y-1/2 lg:text-border" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
