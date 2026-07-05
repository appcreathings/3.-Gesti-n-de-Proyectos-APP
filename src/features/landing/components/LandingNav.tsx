import { Link } from "react-router-dom";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/routes/paths";

export function LandingNav() {
  return (
    <nav className="fixed inset-x-0 top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link to={ROUTES.landing} className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Flag className="size-4" />
          </div>
          <span className="text-lg font-bold">Hito</span>
        </Link>

        {/* Links */}
        <div className="hidden items-center gap-8 md:flex">
          <a href="#como-funciona" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Cómo funciona
          </a>
          <a href="#funciones" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Funciones
          </a>
          <a href="#privacidad" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            Privacidad
          </a>
        </div>

        {/* CTA */}
        <Link to={ROUTES.dashboard}>
          <Button size="sm" className="gap-2">
            Empezar
            <span className="text-lg">→</span>
          </Button>
        </Link>
      </div>
    </nav>
  );
}
