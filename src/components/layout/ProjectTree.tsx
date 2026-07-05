import { useEffect, useMemo, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataStore } from "@/store/useDataStore";
import { ROUTES } from "@/routes/paths";
import type { Project } from "@/domain/schemas";

interface ProjectTreeProps {
  /** Called after navigating (e.g. to close a mobile drawer). */
  onNavigate?: () => void;
  className?: string;
}

interface ProductGroup {
  id: string;
  name: string;
  projects: Project[];
}

/**
 * Collapsible Producto → Proyecto tree used in the global rail for quick
 * navigation between projects.
 */
export function ProjectTree({ onNavigate, className }: ProjectTreeProps) {
  const products = useDataStore((s) => s.products);
  const projects = useDataStore((s) => s.projects);
  const { id: activeProjectId } = useParams();

  const groups = useMemo<ProductGroup[]>(() => {
    const byProduct = new Map<string, Project[]>();
    const orphans: Project[] = [];
    for (const p of projects) {
      if (!p.productId) {
        orphans.push(p);
        continue;
      }
      const list = byProduct.get(p.productId) ?? [];
      list.push(p);
      byProduct.set(p.productId, list);
    }
    const named = products
      .map((prod) => ({ id: prod.id, name: prod.name, projects: byProduct.get(prod.id) ?? [] }))
      .filter((g) => g.projects.length > 0);
    return orphans.length > 0
      ? [...named, { id: "__unassigned", name: "Sin producto", projects: orphans }]
      : named;
  }, [products, projects]);

  const activeGroupId = useMemo(
    () => groups.find((g) => g.projects.some((p) => p.id === activeProjectId))?.id,
    [groups, activeProjectId],
  );

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  // Keep the group containing the active project expanded (persists as you navigate,
  // since this component stays mounted across route changes).
  useEffect(() => {
    if (activeGroupId) setExpanded((s) => (s.has(activeGroupId) ? s : new Set(s).add(activeGroupId)));
  }, [activeGroupId]);

  function toggle(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (groups.length === 0) return null;

  return (
    <div className={cn("space-y-0.5", className)}>
      {groups.map((g) => {
        const isOpen = expanded.has(g.id);
        return (
          <div key={g.id}>
            <button
              type="button"
              onClick={() => toggle(g.id)}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-expanded={isOpen}
            >
              {isOpen ? (
                <ChevronDown className="size-3.5 shrink-0" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0" />
              )}
              <span className="truncate">{g.name}</span>
            </button>
            {isOpen && (
              <div className="ml-2.5 space-y-0.5 border-l border-border/60 pl-2.5">
                {g.projects.map((p) => (
                  <NavLink
                    key={p.id}
                    to={ROUTES.project(p.id)}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-1.5 truncate rounded-md px-2 py-1.5 text-xs transition-colors",
                        isActive
                          ? "bg-foreground/5 text-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )
                    }
                  >
                    <span className="size-1 shrink-0 rounded-full bg-current opacity-60" />
                    <span className="truncate">{p.name}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
