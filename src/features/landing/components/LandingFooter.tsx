import { Flag } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/routes/paths";

const COLUMNS = [
  {
    title: "Producto",
    links: [
      { label: "Cómo funciona", href: "#como-funciona" },
      { label: "Características", href: "#caracteristicas" },
      { label: "Casos de uso", href: "#uso" },
    ],
  },
  {
    title: "Proyecto",
    links: [
      { label: "Código", href: "#" },
      { label: "Licencia MIT", href: "#" },
      { label: "Roadmap", href: "#" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Link to={ROUTES.landing} className="inline-flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
                <Flag className="size-3.5" />
              </div>
              <span className="text-sm font-semibold tracking-tight">Hito</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Gestor de proyectos local-first. Tus datos viven en una carpeta
              de tu equipo. Nada más.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-8 sm:flex-row sm:items-center">
          <p className="font-mono text-xs text-muted-foreground">
            © 2024 Hito · Hecho con cuidado para equipos que valoran su privacidad.
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            v0.1 · MIT
          </p>
        </div>
      </div>
    </footer>
  );
}
