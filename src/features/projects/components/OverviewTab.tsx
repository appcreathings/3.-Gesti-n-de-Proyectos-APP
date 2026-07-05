import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Resumen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.description ? (
            <p className="text-sm leading-relaxed">{project.description}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground">Sin descripción.</p>
          )}

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Avance de checklists</span>
              <span>
                {cl.done}/{cl.total} · {cl.pct}%
              </span>
            </div>
            <Progress value={cl.pct} />
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tareas completadas</span>
              <span>
                {tk.done}/{tk.total} · {tk.pct}%
              </span>
            </div>
            <Progress value={tk.pct} indicatorClassName="bg-success" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
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
          <Row label="Inicio" value={project.startDate ?? "—"} />
          <Row label="Fecha límite" value={project.dueDate ?? "—"} />
          <Row label="Áreas" value={String(project.areas.length)} />
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
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
