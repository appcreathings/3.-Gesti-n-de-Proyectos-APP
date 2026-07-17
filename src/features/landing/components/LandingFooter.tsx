import { Link } from "react-router-dom";
import { HitoMark } from "@/components/brand/HitoMark";
import { ROUTES } from "@/routes/paths";

type FooterLink = {
  label: string;
  href?: string;
  to?: string;
  external?: boolean;
};

const GITHUB_URL = "https://github.com/appcreathings/Gestion-de-Proyectos-APP";
const DOCS_URL = "https://hito.autos/docs";

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Producto",
    links: [
      { label: "Cómo funciona", to: "/#como-funciona" },
      { label: "Características", to: "/#caracteristicas" },
      { label: "Flujos e integraciones", to: "/#flujos" },
      { label: "Casos de uso", to: "/#uso" },
      { label: "FAQ", to: "/#faq" },
    ],
  },
  {
    title: "Recursos",
    links: [
      { label: "Blog", to: "/blogs" },
      { label: "Documentación", href: DOCS_URL, external: true },
      { label: "Código fuente", href: GITHUB_URL, external: true },
      { label: "Reportar issue", href: `${GITHUB_URL}/issues/new`, external: true },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Licencia MIT", href: `${GITHUB_URL}/blob/main/LICENSE`, external: true },
      { label: "Privacidad", href: `${DOCS_URL}/ajustes-y-datos`, external: true },
    ],
  },
];

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Link to={ROUTES.landing} className="inline-flex items-center gap-2" aria-label="Hito — inicio">
              <HitoMark variant="inverted" className="size-7" />
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
                    {link.to ? (
                      <Link
                        to={link.to}
                        className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <a
                        href={link.href}
                        className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                        {...(link.external
                          ? {
                              target: "_blank",
                              rel: "noopener noreferrer",
                            }
                          : {})}
                      >
                        {link.label}
                        {link.external ? (
                          <span
                            aria-hidden="true"
                            className="ml-1 text-muted-foreground/60"
                          >
                            ↗
                          </span>
                        ) : null}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-8 sm:flex-row sm:items-center">
          <p className="font-mono text-xs text-muted-foreground">
            © {year} Hito · Hecho con cuidado para equipos que valoran su privacidad.
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            v0.1 · MIT
          </p>
        </div>
      </div>
    </footer>
  );
}
