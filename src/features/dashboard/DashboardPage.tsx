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
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Panel } from "@/components/ui/Panel";
import { StatTile } from "@/components/ui/StatTile";
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
  const people = useDataStore((s) => s.people);
  const settings = useAppStore((s) => s.workspace?.settings);

  const stats = useMemo(
    () => (settings ? computePortfolio(projects, products, settings, new Date(), people) : null),
    [projects, products, settings, people],
  );

  if (!settings || !stats) return null;

  if (projects.length === 0) {
    return (
      <div>
        <PageHeader
          label="Dashboard"
          title="Aún no hay proyectos"
          description="El dashboard se llena con salud, vencidos y estancados en cuanto crees tu primer proyecto."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <EmptyState
            icon={FolderKanban}
            title="Empezá por crear un proyecto"
            description="Si querés, definí primero plantillas en la Biblioteca para acelerar el setup."
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
          <Panel label="Jerarquía" title="Datos de la organización">
            <HierarchyLegend />
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        label="Dashboard"
        title="Portafolio"
        description={
          settings.deriveHealth
            ? "Salud RAG automática, derivada de fechas y actividad."
            : "Vista global de productos, proyectos y salud."
        }
      />

      <div className="grid gap-px overflow-hidden rounded-2xl border border-border/70 bg-border sm:grid-cols-2 lg:grid-cols-4">
        <Link to={ROUTES.projects} className="block">
          <StatTile
            value={stats.active}
            label="Proyectos activos"
            icon={FolderKanban}
            tone="default"
          />
        </Link>
        <StatTile
          value={`${stats.avgProgress}%`}
          label="Avance medio"
          icon={Gauge}
          tone="default"
        />
        <Link to={ROUTES.projects} className="block">
          <StatTile
            value={stats.overdue.length}
            label="Vencidos"
            icon={AlertTriangle}
            tone="destructive"
          />
        </Link>
        <Link to={ROUTES.projects} className="block">
          <StatTile
            value={stats.stalled.length}
            label="Estancados"
            icon={Hourglass}
            tone="warning"
          />
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <HealthCard byHealth={stats.byHealth} />
        <StatusCard byStatus={stats.byStatus} total={stats.total} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ProductCard rollups={stats.byProduct} />
        <StalledCard projects={stats.stalled} stalledAfterDays={settings.stalledAfterDays} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DueCard overdue={stats.overdue} dueSoon={stats.dueSoon} />
        <WorkloadCard workload={stats.workload} />
      </div>
    </div>
  );
}

/* ---- Salud RAG ---- */
function HealthCard({ byHealth }: { byHealth: Record<Health, number> }) {
  const total = HEALTH_ORDER.reduce((s, h) => s + byHealth[h], 0);
  return (
    <Panel label="Salud" title="Salud del portafolio">
      {total === 0 ? (
        <p className="text-sm text-muted-foreground">No hay proyectos activos.</p>
      ) : (
        <>
          <div className="mb-6 flex h-2 overflow-hidden rounded-full bg-muted">
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
          <ul className="space-y-3">
            {HEALTH_ORDER.map((h) => (
              <li key={h} className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2">
                <HealthBadge health={h} className="flex-1 text-muted-foreground" />
                <span className="font-mono text-sm font-semibold">{byHealth[h]}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

/* ---- Distribución por estado ---- */
function StatusCard({
  byStatus,
  total,
}: {
  byStatus: Record<ProjectStatus, number>;
  total: number;
}) {
  const rows = (Object.keys(byStatus) as ProjectStatus[]).filter((s) => byStatus[s] > 0);
  return (
    <Panel label="Estado" title="Distribución por estado">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin proyectos activos.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((s) => (
            <li key={s}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{projectStatusLabel[s]}</span>
                <span className="font-mono text-sm font-semibold">{byStatus[s]}</span>
              </div>
              <Progress value={total === 0 ? 0 : (byStatus[s] / total) * 100} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---- Salud por producto ---- */
function ProductCard({ rollups }: { rollups: ProductRollup[] }) {
  return (
    <Panel label="Producto" title="Por producto">
      {rollups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay proyectos activos.</p>
      ) : (
        <ul className="space-y-2">
          {rollups.map((r) => (
            <li key={r.id ?? "none"} className="flex items-center gap-3 rounded-md border border-border/60 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.total} proyecto{r.total === 1 ? "" : "s"} · {r.avgProgress}% avance
                </p>
              </div>
              <div className="flex items-center gap-2">
                {HEALTH_ORDER.map((h) =>
                  r.byHealth[h] > 0 ? (
                    <span key={h} className="flex items-center gap-1 font-mono text-xs">
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
    </Panel>
  );
}

/* ---- Proyectos estancados ---- */
function StalledCard({
  projects,
  stalledAfterDays,
}: {
  projects: Project[];
  stalledAfterDays: number;
}) {
  return (
    <Panel label="Estancados" title={`Proyectos sin actividad hace más de ${stalledAfterDays} días`}>
      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">👌 Todo se mueve.</p>
      ) : (
        <ul className="space-y-1.5">
          {projects
            .slice()
            .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
            .map((p) => (
              <li key={p.id}>
                <Link
                  to={ROUTES.project(p.id)}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <span className="min-w-0 truncate">{p.name}</span>
                  <span className="flex shrink-0 items-center gap-1 font-mono text-xs font-medium text-warning">
                    {daysSince(p.updatedAt)} días
                    <ArrowRight className="size-3.5" />
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      )}
    </Panel>
  );
}

/* ---- Resumen del día: fechas ---- */
function DueCard({ overdue, dueSoon }: { overdue: DueRow[]; dueSoon: DueRow[] }) {
  if (overdue.length === 0 && dueSoon.length === 0) {
    return (
      <Panel label="Vencimientos" title="Sin fechas urgentes">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <CheckCircle2 className="size-5 text-success" />
          No hay fechas vencidas ni próximos vencimientos.
        </div>
      </Panel>
    );
  }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <DueSection
        title="Vencidos"
        icon={AlertTriangle}
        tone="destructive"
        rows={overdue}
        format={(r) => `hace ${-r.d} día${r.d === -1 ? "" : "s"}`}
      />
      <DueSection
        title="Por vencer"
        icon={CalendarClock}
        tone="warning"
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
  tone: "destructive" | "warning";
  rows: DueRow[];
  format: (r: DueRow) => string;
}) {
  if (rows.length === 0) return null;
  const toneText = tone === "destructive" ? "text-destructive" : "text-warning";
  return (
    <Panel
      label={
        <span className="flex items-center gap-2">
          <Icon className={`size-3.5 ${toneText}`} />
          {title}
        </span>
      }
      title={
        <span className="flex items-center gap-2">
          {title}
          <Badge variant="secondary">{rows.length}</Badge>
        </span>
      }
    >
      <ul className="space-y-1.5">
        {rows.map((r) => {
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
                className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2 text-sm transition-colors hover:bg-accent"
              >
                <span className="min-w-0 truncate">{r.label}</span>
                <span className={`shrink-0 font-mono text-xs font-medium ${toneText}`}>
                  {format(r)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

/* ---- Carga de trabajo por persona ---- */
function WorkloadCard({ workload }: { workload: import("./portfolio").WorkloadEntry[] }) {
  if (workload.length === 0) {
    return (
      <Panel label="Carga" title="Carga de trabajo">
        <p className="text-sm text-muted-foreground">No hay tareas asignadas.</p>
      </Panel>
    );
  }

  const maxTasks = Math.max(...workload.map((w) => w.taskCount));

  return (
    <Panel label="Carga" title="Carga de trabajo por persona">
      <ul className="space-y-3">
        {workload.map((entry) => (
          <li key={entry.personId}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium">{entry.personName}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {entry.taskCount} tareas · {entry.totalEstimate}h
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(entry.taskCount / maxTasks) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
