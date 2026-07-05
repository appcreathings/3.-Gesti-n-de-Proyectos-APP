import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/routes/paths";

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
            "radial-gradient(ellipse_60%_50%_at_50%_30%,#000,transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse_60%_50%_at_50%_30%,#000,transparent)",
        }}
      />

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-32 sm:pt-40">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            Local-first · Sin nube · Sin cuenta
          </div>

          <h1 className="text-balance text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            Tus proyectos como archivos{" "}
            <span className="text-muted-foreground">en tu equipo.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Hito es un gestor de proyectos local-first. Tus datos viven en una
            carpeta que tú controlas: sin backend, sin candado, sin que nadie
            más los vea.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to={ROUTES.dashboard}>
              <Button size="lg" className="h-11 gap-2 px-6">
                Abrir Hito
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <a href="#caracteristicas">
              <Button variant="ghost" size="lg" className="h-11 gap-2 px-6 text-muted-foreground">
                Ver características
              </Button>
            </a>
          </div>

          <p className="mt-8 font-mono text-xs text-muted-foreground/70">
            proyectos/*.json  ·  sin servidor  ·  MIT
          </p>
        </div>
      </div>
    </section>
  );
}
