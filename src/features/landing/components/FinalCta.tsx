import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/routes/paths";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 0%, hsl(var(--primary)/0.10), transparent 50%), radial-gradient(circle at 80% 100%, hsl(var(--primary)/0.06), transparent 50%)",
        }}
      />

      <div className="mx-auto max-w-4xl px-6 py-28 text-center sm:py-36">
        <p className="mb-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Empieza hoy
        </p>

        <h2 className="mx-auto max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Menos de 2 minutos hasta tu primer proyecto.
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-pretty text-muted-foreground sm:text-lg">
          Elegís una carpeta, nombrás un producto, y Hito empieza a guardar.
          Nada de formularios, verificaciones de email ni setup guiado de 17
          pasos.
        </p>

        <dl className="mx-auto mt-12 grid max-w-md grid-cols-3 gap-6 text-left">
          <div>
            <dt className="font-mono text-2xl font-semibold tracking-tight">~30s</dt>
            <dd className="mt-1 text-xs text-muted-foreground">para elegir carpeta</dd>
          </div>
          <div>
            <dt className="font-mono text-2xl font-semibold tracking-tight">1</dt>
            <dd className="mt-1 text-xs text-muted-foreground">proyecto creado</dd>
          </div>
          <div>
            <dt className="font-mono text-2xl font-semibold tracking-tight">0</dt>
            <dd className="mt-1 text-xs text-muted-foreground">datos enviados</dd>
          </div>
        </dl>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link to={ROUTES.dashboard}>
            <Button size="lg" className="h-11 gap-2 px-6">
              Abrir Hito
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <a
            href="#uso"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver casos de uso →
          </a>
        </div>

        <p className="mt-12 font-mono text-xs text-muted-foreground/70">
          github.com/hito/hito  ·  MIT
        </p>
      </div>
    </section>
  );
}
