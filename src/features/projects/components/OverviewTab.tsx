import { Link } from "react-router-dom";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  healthLabel,
  priorityLabel,
  priorityVariant,
  projectStatusLabel,
  projectStatusVariant,
} from "@/domain/labels";
import {
  projectChecklistProgress,
  projectTaskProgress,
} from "@/domain/compute";
import type { Health, Project } from "@/domain/schemas";
import { ROUTES } from "@/routes/paths";

interface Props {
  project: Project;
  productName?: string;
  productId?: string | null;
  onChangeHealth: (h: Health) => void;
}

export function OverviewTab({ project, productName, productId, onChangeHealth }: Props) {
  const cl = projectChecklistProgress(project);
  const tk = projectTaskProgress(project);
  const archivedCount = project.tasks.filter((t) => t.archived).length;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel
        label="Resumen"
        title={project.name}
        description={
          project.description ? (
            <span className="text-pretty text-sm leading-relaxed text-foreground">
              {project.description}
            </span>
          ) : (
            <span className="italic text-muted-foreground">Sin descripción.</span>
          )
        }
        className="lg:col-span-2"
      >
        <div className="space-y-5">
          <ProgressRow
            label="Avance de checklists"
            done={cl.done}
            total={cl.total}
            pct={cl.pct}
          />
          <ProgressRow
            label="Tareas completadas"
            done={tk.done}
            total={tk.total}
            pct={tk.pct}
            indicatorClassName="bg-success"
            tooltip={archivedCount > 0 ? `${archivedCount} tarea${archivedCount !== 1 ? "s" : ""} archivada${archivedCount !== 1 ? "s" : ""}` : undefined}
          />
        </div>
      </Panel>

      <Panel label="Detalles" title="Metadatos">
        <dl className="space-y-3 text-sm">
          <Row
            label="Producto"
            value={
              productName && productId ? (
                <Link
                  to={ROUTES.projectsByProduct(productId)}
                  className="font-medium text-primary hover:underline"
                >
                  {productName}
                </Link>
              ) : (
                productName ?? "—"
              )
            }
          />
          <Row
            label="Estado"
            value={
              <Badge variant={projectStatusVariant[project.status]}>
                {projectStatusLabel[project.status]}
              </Badge>
            }
          />
          <Row
            label="Prioridad"
            value={
              <Badge variant={priorityVariant[project.priority]}>
                {priorityLabel[project.priority]}
              </Badge>
            }
          />
          <Row label="Inicio" value={project.startDate ?? "—"} mono />
          <Row label="Fecha límite" value={project.dueDate ?? "—"} mono />
          <Row label="Áreas" value={String(project.areas.length)} mono />
          <div className="grid gap-1.5 pt-1">
            <Label htmlFor="ov-health">Salud (RAG)</Label>
            <Select
              id="ov-health"
              value={project.health}
              onChange={(e) => onChangeHealth(e.target.value as Health)}
            >
              {(Object.keys(healthLabel) as Health[]).map((h) => (
                <option key={h} value={h}>
                  {healthLabel[h]}
                </option>
              ))}
            </Select>
          </div>
        </dl>
      </Panel>
    </div>
  );
}

function ProgressRow({
  label,
  done,
  total,
  pct,
  indicatorClassName,
  tooltip,
}: {
  label: string;
  done: number;
  total: number;
  pct: number;
  indicatorClassName?: string;
  tooltip?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground" title={tooltip}>
          {done}/{total} · {pct}%
        </span>
      </div>
      <Progress value={pct} indicatorClassName={indicatorClassName} />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs font-medium" : "font-medium"}>{value}</span>
    </div>
  );
}
