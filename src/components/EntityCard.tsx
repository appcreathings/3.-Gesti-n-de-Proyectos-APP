import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EntityCardProps {
  title: string;
  /** Badge(s)/meta rendered directly under the title (status, category, counts…). */
  meta?: ReactNode;
  /** Body content below the header (description, progress, counts…). */
  children?: ReactNode;
  /** Wrap the whole card in a link (e.g. project list); omit when using onEdit/onDelete instead. */
  href?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

/** Grid card shared by entity lists (Productos, Proyectos, plantillas de Biblioteca). */
export function EntityCard({ title, meta, children, href, onEdit, onDelete, className }: EntityCardProps) {
  const hasActions = !href && (onEdit || onDelete);

  const card = (
    <Card
      className={cn(
        href && "h-full transition-colors hover:border-primary/40",
        hasActions && "group",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="text-base">{title}</CardTitle>
          {meta && <div className="flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {hasActions && (
          <div className="flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            {onEdit && (
              <Button variant="ghost" size="icon" aria-label={`Editar ${title}`} onClick={onEdit}>
                <Pencil className="size-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" aria-label={`Eliminar ${title}`} onClick={onDelete}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );

  return href ? <Link to={href}>{card}</Link> : card;
}
