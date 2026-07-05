import { Breadcrumb, type BreadcrumbItem } from "./Breadcrumb";
import { SectionLabel } from "./ui/SectionLabel";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Small status indicator rendered next to the title (e.g. project status badge). */
  badge?: React.ReactNode;
  /** Optional mono uppercase line shown above the title. */
  label?: string;
  /** Hierarchy trail rendered above the title (e.g. Proyectos → Producto → Proyecto). */
  breadcrumb?: BreadcrumbItem[];
}

export function PageHeader({
  title,
  description,
  actions,
  badge,
  label,
  breadcrumb,
}: PageHeaderProps) {
  return (
    <div className="mb-10">
      {breadcrumb && breadcrumb.length > 0 && <Breadcrumb items={breadcrumb} className="mb-3" />}
      {label && <SectionLabel className="mb-3 block">{label}</SectionLabel>}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
