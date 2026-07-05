import { Package, FolderKanban, LayoutGrid, FileText, CheckSquare, ListChecks } from "lucide-react";

/**
 * Mini-diagram showing the entity hierarchy and their creation order.
 * Shown in empty states, Library, and any context where the user needs
 * to understand "what goes first."
 */
export function HierarchyLegend({ compact = false }: { compact?: boolean }) {
  const levels = [
    {
      icon: Package,
      label: "Producto",
      sub: "Agrupa proyectos",
      step: null,
    },
    {
      icon: FolderKanban,
      label: "Proyecto",
      sub: "Contiene áreas",
      step: null,
    },
    {
      icon: LayoutGrid,
      label: "Área",
      sub: "Contiene procesos, checklists y tareas",
      step: null,
    },
    {
      icon: FileText,
      label: "Proceso (SOP)",
      sub: "Documenta cómo se hace algo",
      step: null,
    },
    {
      icon: CheckSquare,
      label: "Checklist → Ítem",
      sub: "Seguimiento de avance",
      step: null,
    },
    {
      icon: ListChecks,
      label: "Tarea",
      sub: "Acción accionable (Kanban)",
      step: null,
    },
  ];

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        {levels.map((l, i) => {
          const Icon = l.icon;
          return (
            <span key={l.label} className="flex items-center gap-1">
              <Icon className="size-3" />
              {l.label}
              {i < levels.length - 1 && <span className="text-border">→</span>}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Jerarquía de datos
      </p>
      <div className="space-y-1.5">
        {levels.map((l, i) => {
          const Icon = l.icon;
          return (
            <div key={l.label} className="flex items-start gap-2.5" style={{ paddingLeft: `${i * 12}px` }}>
              <div className="flex size-6 shrink-0 items-center justify-center rounded bg-background border">
                <Icon className="size-3.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium leading-tight">{l.label}</p>
                <p className="text-xs text-muted-foreground">{l.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Specific legend for the Library creation order:
 * Checklist/Process Templates → Project Types → Projects
 */
export function LibraryOrderLegend() {
  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Orden de creación en Biblioteca
      </p>
      <ol className="space-y-1.5">
        {[
          {
            n: "1",
            icon: CheckSquare,
            label: "Plantillas de Checklist y Proceso",
            sub: "Define los bloques reutilizables primero.",
          },
          {
            n: "2",
            icon: FolderKanban,
            label: "Tipos de Proyecto",
            sub: "Combina plantillas para crear blueprints de proyectos.",
          },
          {
            n: "3",
            icon: Package,
            label: "Usar en Proyectos",
            sub: 'En Proyectos → "Desde tipo" para generar estructura automáticamente.',
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <li key={s.n} className="flex items-start gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {s.n}
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <Icon className="size-3.5 text-muted-foreground" />
                  <p className="text-sm font-medium">{s.label}</p>
                </div>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
