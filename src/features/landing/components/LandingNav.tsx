import { Link } from "react-router-dom";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/routes/paths";

export function LandingNav() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 bg-background/60 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to={ROUTES.landing} className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
            <Flag className="size-3.5" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Hito</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#como-funciona"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Cómo funciona
          </a>
          <a
            href="#caracteristicas"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Características
          </a>
          <a
            href="#uso"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Casos de uso
          </a>
        </div>

        <Link to={ROUTES.dashboard}>
          <Button size="sm" variant="ghost" className="h-8 gap-2 px-3 text-sm">
            Abrir Hito
            <span aria-hidden>→</span>
          </Button>
        </Link>
      </div>
    </nav>
  );
}
