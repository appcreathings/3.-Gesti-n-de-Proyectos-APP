/**
 * Hero — Sección principal de la landing.
 *
 * Elementos:
 * - Badge superior: "Local-first · Sin nube · Sin cuenta · MIT" con indicador verde
 * - H1: Propuesta de valor centrada en privacidad y control de datos
 * - Subtítulo: Explica el modelo local-first con archivos .json
 * - CTAs: "Empezar ahora" (primario) + "Ver características" (ancla)
 * - Trust signals: 3 bullets con check verde (Gratis, Sin límite, Offline)
 * - Code snippet: Muestra visualmente el formato de datos (proyectos/*.json)
 *
 * Fondo: Gradiente radial + grid pattern con mask para fade en bordes.
 */
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/routes/paths";

const TRUST_SIGNALS = [
  "Gratuito · Open Source (MIT)",
  "Sin límite de usuarios",
  "Offline-first",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
      <div
        className="absolute inset-0 -z-10 opacity-[0.4] dark:opacity-[0.2]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border)/0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)/0.5) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 60% 50% at 50% 30%, #000, transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 50% at 50% 30%, #000, transparent)",
        }}
      />

      <div className="mx-auto max-w-6xl px-6 pb-28 pt-32 sm:pb-32 sm:pt-40">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1 text-xs font-medium text-primary backdrop-blur">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-success" />
            </span>
            Local-first · Sin nube · Sin cuenta · MIT
          </div>

          <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            Gestioná proyectos, procesos y equipos{" "}
            <span className="text-primary/70">sin rendir cuentas a la nube.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Hito es un gestor local-first. Tus datos viven en archivos .json en
            tu máquina: versionables con Git, exportables, 100% tuyos. Sin
            backend, sin suscripción, sin límite de usuarios.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to={ROUTES.dashboard}>
              <Button size="lg" className="h-11 gap-2 px-6">
                Empezar ahora
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <a href="#caracteristicas">
              <Button variant="outline" size="lg" className="h-11 gap-2 px-6">
                Ver características
              </Button>
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {TRUST_SIGNALS.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/80"
              >
                <Check className="size-3 text-success" />
                {s}
              </span>
            ))}
          </div>

          <div className="mx-auto mt-10 inline-flex max-w-full items-center gap-2 overflow-x-auto rounded-lg border border-border/60 bg-muted/40 px-4 py-2 font-mono text-xs text-muted-foreground">
            <span className="text-primary/70">proyectos/</span>
            <span>q3-lanzamiento.json</span>
            <span className="text-muted-foreground/50">— editable, versionable, tuyo</span>
          </div>
        </div>
      </div>
    </section>
  );
}
