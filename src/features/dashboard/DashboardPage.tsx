import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FolderKanban,
  AlertTriangle,
  CalendarClock,
  Hourglass,
  CheckCircle2,
  Gauge,
  ArrowRight,
  Library,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { HierarchyLegend } from "@/components/HierarchyLegend";
import { HealthBadge, HealthDot, healthColorClass } from "@/components/HealthBadge";
import { useDataStore } from "@/store/useDataStore";
import { useAppStore } from "@/store/useAppStore";
import { projectStatusLabel } from "@/domain/labels";
import { computePortfolio, type DueRow, type ProductRollup } from "./portfolio";
import type { Health, Project, ProjectStatus } from "@/domain/schemas";
import { ROUTES } from "@/routes/paths";

const HEALTH_ORDER: Health[] = ["red", "amber", "green"];

export function DashboardPage() {
  const projects = useDataStore((s) => s.projects);
  const products = useDataStore((s) => s.products);
  const settings = useAppStore((s) => s.workspace?.settings);

  const stats = useMemo(
    () => (settings ? computePortfolio(projects, products, settings, new Date()) : null),
    [projects, products, settings],
  );

  if (!settings || !stats) return null;

  if (projects.length === 0) {
    return (
      <div>
        <PageHeader
          title="Dashboard de portafolio"
          description="Vista global de productos, proyectos y salud."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <EmptyState
            icon={FolderKanban}
            title="Aún no hay proyectos"
            description="El dashboard se llenará con salud, vencidos y estancados en cuanto crees tu primer proyecto."
            action={
              <div className="flex flex-wrap gap-2">
                <Link to={ROUTES.library("checklists")}>
                  <Button variant="outline" size="sm">
                    <Library className="size-4" />
                    1. Ir a Biblioteca
                  </Button>
                </Link>
                <Link to={ROUTES.projects}>
                  <Button size="sm">
                    <FolderKanban className="size-4" />
                    2. Crear proyecto
                  </Button>
                </Link>
              </div>
            }
          />
          <HierarchyLegend />
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Proyectos activos", value: stats.active, icon: FolderKanban, tone: "" },
    { label: "Avance medio", value: `${stats.avgProgress}%`, icon: Gauge, tone: "" },
    { label: "Vencidos", value: stats.overdue.length, icon: AlertTriangle, tone: "text-destructive" },
    { label: "Estancados", value: stats.stalled.length, icon: Hourglass, tone: "text-warning" },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard de portafolio"
        description={
          settings.deriveHealth
            ? "Salud RAG automática (derivada de fechas y actividad)."
            : "Vista global de productos, proyectos y salud."
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`size-4 ${tone || "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-semibold ${typeof value === "number" && value > 0 ? tone : ""}`}>
                {value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <HealthCard byHealth={stats.byHealth} />
        <StatusCard byStatus={stats.byStatus} total={stats.total} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ProductCard rollups={stats.byProduct} />
        <StalledCard projects={stats.stalled} stalledAfterDays={settings.stalledAfterDays} />
      </div>

      <DueCard overdue={stats.overdue} dueSoon={stats.dueSoon} />
    </div>
  );
}

/* ---- Salud RAG (T061) ---- */
function HealthCard({ byHealth }: { byHealth: Record<Health, number> }) {
  const total = HEALTH_ORDER.reduce((s, h) => s + byHealth[h], 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Salud del portafolio</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">No hay proyectos activos.</p>
        ) : (
          <>
            <div className="mb-4 flex h-2.5 overflow-hidden rounded-full bg-muted">
              {HEALTH_ORDER.map((h) =>
                byHealth[h] > 0 ? (
                  <div
                    key={h}
                    className={healthColorClass[h]}
                    style={{ width: `${(byHealth[h] / total) * 100}%` }}
                  />
                ) : null,
              )}
            </div>
            <ul className="space-y-2">
              {HEALTH_ORDER.map((h) => (
                <li key={h} className="flex items-center gap-2 text-sm">
                  <HealthBadge health={h} className="flex-1 text-muted-foreground" />
                  <span className="font-semibold">{byHealth[h]}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ---- Distribución por estado (T060) ---- */
function StatusCard({
  byStatus,
  total,
}: {
  byStatus: Record<ProjectStatus, number>;
  total: number;
}) {
  const rows = (Object.keys(byStatus) as ProjectStatus[]).filter((s) => byStatus[s] > 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Distribución por estado</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {rows.map((s) => (
            <li key={s}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{projectStatusLabel[s]}</span>
                <span className="font-medium">{byStatus[s]}</span>
              </div>
              <Progress value={total === 0 ? 0 : (byStatus[s] / total) * 100} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ---- Salud por producto (T061) ---- */
function ProductCard({ rollups }: { rollups: ProductRollup[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Por producto</CardTitle>
      </CardHeader>
      <CardContent>
        {rollups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay proyectos activos.</p>
        ) : (
          <ul className="space-y-3">
            {rollups.map((r) => (
              <li key={r.id ?? "none"} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.total} proyecto{r.total === 1 ? "" : "s"} · {r.avgProgress}% avance
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {HEALTH_ORDER.map((h) =>
                    r.byHealth[h] > 0 ? (
                      <span key={h} className="flex items-center gap-1 text-xs">
                        <HealthDot health={h} className="size-2" />
                        {r.byHealth[h]}
                      </span>
                    ) : null,
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ---- Proyectos estancados (T062) ---- */
function StalledCard({
  projects,
  stalledAfterDays,
}: {
  projects: Project[];
  stalledAfterDays: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Proyectos estancados</CardTitle>
      </CardHeader>
      <CardContent>
        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin proyectos inactivos por más de {stalledAfterDays} días. 👌
          </p>
        ) : (
          <ul className="space-y-1.5">
            {projects
              .slice()
              .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
              .map((p) => (
                <li key={p.id}>
                  <Link
                    to={ROUTES.project(p.id)}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <span className="min-w-0 truncate">{p.name}</span>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-warning">
                      {daysSince(p.updatedAt)} días sin actividad
                      <ArrowRight className="size-3.5" />
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ---- Resumen del día: fechas (M4) ---- */
function DueCard({ overdue, dueSoon }: { overdue: DueRow[]; dueSoon: DueRow[] }) {
  if (overdue.length === 0 && dueSoon.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          icon={CheckCircle2}
          title="Sin fechas urgentes"
          description="No hay fechas vencidas ni próximos vencimientos."
        />
      </div>
    );
  }
  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <DueSection
        title="Vencidos"
        icon={AlertTriangle}
        tone="text-destructive"
        rows={overdue}
        format={(r) => `hace ${-r.d} día${r.d === -1 ? "" : "s"}`}
      />
      <DueSection
        title="Por vencer"
        icon={CalendarClock}
        tone="text-warning"
        rows={dueSoon}
        format={(r) => (r.d === 0 ? "vence hoy" : `en ${r.d} día${r.d === 1 ? "" : "s"}`)}
      />
    </div>
  );
}

function DueSection({
  title,
  icon: Icon,
  tone,
  rows,
  format,
}: {
  title: string;
  icon: typeof AlertTriangle;
  tone: string;
  rows: DueRow[];
  format: (r: DueRow) => string;
}) {
  if (rows.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`size-4 ${tone}`} />
          {title}
          <Badge variant="secondary">{rows.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {rows.map((r) => {
            // Build deep-link URL: tab + focus depend on entity kind
            const params = new URLSearchParams();
            if (r.ref.kind === "task") {
              params.set("tab", "tasks");
              if (r.ref.taskId) params.set("focus", r.ref.taskId);
            } else if (r.ref.kind === "checklistItem") {
              params.set("tab", "areas");
              if (r.ref.itemId) params.set("focus", r.ref.itemId);
            } else {
              params.set("tab", "overview");
            }
            return (
            <li key={`${r.ref.kind}-${r.ref.itemId ?? r.ref.taskId ?? r.ref.projectId}`}>
              <Link
                to={`${ROUTES.project(r.projectId)}?${params.toString()}`}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <span className="min-w-0 truncate">{r.label}</span>
                <span className={`shrink-0 text-xs font-medium ${tone}`}>{format(r)}</span>
              </Link>
            </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}
