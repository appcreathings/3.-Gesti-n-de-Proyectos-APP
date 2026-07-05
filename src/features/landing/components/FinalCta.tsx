import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/routes/paths";

export function FinalCta() {
  return (
    <section className="border-t bg-muted/30 py-16 text-center">
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Empieza gratis, hoy mismo</h2>
        <p className="mt-2 text-muted-foreground">
          Elige una carpeta en tu equipo y ten tu primer proyecto organizado en minutos.
        </p>
        <div className="mt-6 flex justify-center">
          <Link to={ROUTES.dashboard}>
            <Button size="lg">
              Empezar ahora
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
