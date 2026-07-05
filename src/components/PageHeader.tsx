import { Breadcrumb, type BreadcrumbItem } from "./Breadcrumb";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Small status indicator rendered next to the title (e.g. project status badge). */
  badge?: React.ReactNode;
  /** Hierarchy trail rendered above the title (e.g. Proyectos → Producto → Proyecto). */
  breadcrumb?: BreadcrumbItem[];
}

export function PageHeader({ title, description, actions, badge, breadcrumb }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {breadcrumb && breadcrumb.length > 0 && <Breadcrumb items={breadcrumb} className="mb-2" />}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
