import { Link } from "react-router-dom";
import { Flag, Github, Twitter } from "lucide-react";
import { ROUTES } from "@/routes/paths";

const LINKS = {
  producto: [
    { label: "Cómo funciona", href: "#como-funciona" },
    { label: "Funciones", href: "#funciones" },
    { label: "Privacidad", href: "#privacidad" },
  ],
  recursos: [
    { label: "Documentación", href: "#" },
    { label: "GitHub", href: "#" },
    { label: "Comunidad", href: "#" },
  ],
  legal: [
    { label: "Licencia MIT", href: "#" },
    { label: "Código abierto", href: "#" },
  ],
};

export function LandingFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link to={ROUTES.landing} className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Flag className="size-4" />
              </div>
              <span className="text-lg font-bold">Hito</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              El gestor de proyectos que respeta tu privacidad. 100% local, sin nube, sin cuenta.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
                <Github className="size-5" />
              </a>
              <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
                <Twitter className="size-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">Producto</h4>
            <ul className="space-y-2">
              {LINKS.producto.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Recursos</h4>
            <ul className="space-y-2">
              {LINKS.recursos.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Legal</h4>
            <ul className="space-y-2">
              {LINKS.legal.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © 2024 Hito. Proyecto de código abierto.
          </p>
          <p className="text-sm text-muted-foreground">
            Hecho con ❤️ para equipos que valoran su privacidad
          </p>
        </div>
      </div>
    </footer>
  );
}
