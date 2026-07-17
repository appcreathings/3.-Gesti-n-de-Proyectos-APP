/**
 * FinalCta — Call-to-action final antes del footer.
 *
 * Elementos:
 * - Título: "¿Listo para tener el control de tus datos y proyectos?"
 * - Subtítulo: Explica la simplicidad de empezar (elegir carpeta → operar)
 * - Métricas: ~30s para elegir carpeta, 1 proyecto creado, ∞ posibilidades
 * - CTAs: "Empezar gratis — sin registro" (primario) + "Preguntas frecuentes" (ancla)
 * - Footer mono: "proyectos/*.json · MIT · Sin servidor"
 *
 * Fondo: Gradientes radiales con colores primarios sutiles.
 */
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
          ¿Listo para tener el control de tus datos y proyectos?
        </h2>

        <p className="mx-auto mt-6 max-w-xl text-pretty text-muted-foreground sm:text-lg">
            Eliges una carpeta, nombras un producto, y Hito empieza a guardar.
            Nada de formularios, verificaciones de email ni setup guiado de 17
            pasos. Tus datos, tu máquina, tus reglas.
        </p>

        <dl className="mx-auto mt-12 grid max-w-md grid-cols-3 gap-4 text-left sm:gap-6">
          <div>
            <dt className="font-mono text-2xl font-semibold tracking-tight">~30s</dt>
            <dd className="mt-1 text-xs text-muted-foreground">para elegir carpeta</dd>
          </div>
          <div>
            <dt className="font-mono text-2xl font-semibold tracking-tight">1</dt>
            <dd className="mt-1 text-xs text-muted-foreground">proyecto creado</dd>
          </div>
          <div>
            <dt className="font-mono text-2xl font-semibold tracking-tight">∞</dt>
            <dd className="mt-1 text-xs text-muted-foreground">posibilidades</dd>
          </div>
        </dl>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link to={ROUTES.dashboard}>
            <Button size="lg" className="h-11 gap-2 px-6">
              Empezar gratis — sin registro
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <a
            href="#faq"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Preguntas frecuentes →
          </a>
        </div>

        <p className="mt-12 font-mono text-xs text-muted-foreground/70">
          proyectos/*.json  ·  MIT  ·  Sin servidor
        </p>
      </div>
    </section>
  );
}
