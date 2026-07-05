import { Link } from "react-router-dom";
import { Flag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/routes/paths";

export function Hero() {
  return (
    <section className="mx-auto max-w-4xl px-6 pb-16 pt-20 text-center sm:pt-28">
      <div className="mb-6 flex justify-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Flag className="size-7" />
        </div>
      </div>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Hito</h1>
      <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
        El gestor de proyectos, procesos y checklists que vive 100% en tu equipo. Sin cuenta, sin
        nube, sin que tus datos salgan de tu carpeta.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link to={ROUTES.dashboard}>
          <Button size="lg">
            Empezar ahora
            <ArrowRight className="size-4" />
          </Button>
        </Link>
        <a href="#como-funciona">
          <Button variant="outline" size="lg">
            Ver cómo funciona
          </Button>
        </a>
      </div>
    </section>
  );
}
