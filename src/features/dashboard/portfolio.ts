import { daysUntil, isStalled, projectChecklistProgress } from "@/domain/compute";
import { effectiveHealth } from "@/domain/health";
import { collectDatedEntities, type DatedEntity } from "@/lib/dates";
import type { Health, Product, Project, ProjectStatus, Settings } from "@/domain/schemas";

const STATUSES: ProjectStatus[] = [
  "backlog",
  "active",
  "paused",
  "blocked",
  "done",
  "archived",
];
const HEALTHS: Health[] = ["green", "amber", "red"];

export interface DueRow extends DatedEntity {
  projectId: string;
  d: number;
}

export interface ProductRollup {
  id: string | null; // null = sin producto
  name: string;
  total: number;
  byHealth: Record<Health, number>;
  avgProgress: number;
}

export interface PortfolioStats {
  total: number;
  active: number;
  avgProgress: number;
  overdue: DueRow[];
  dueSoon: DueRow[];
  stalled: Project[];
  byStatus: Record<ProjectStatus, number>;
  byHealth: Record<Health, number>;
  byProduct: ProductRollup[];
}

function zero<T extends string>(keys: T[]): Record<T, number> {
  return keys.reduce((acc, k) => ((acc[k] = 0), acc), {} as Record<T, number>);
}

/** Pure portfolio aggregation for the CEO dashboard (M5). */
export function computePortfolio(
  projects: Project[],
  products: Product[],
  settings: Settings,
  now: Date,
): PortfolioStats {
  const byStatus = zero(STATUSES);
  const byHealth = zero(HEALTHS);
  const open = projects.filter((p) => p.status !== "done" && p.status !== "archived");

  for (const p of projects) byStatus[p.status]++;
  for (const p of open) byHealth[effectiveHealth(p, settings, now)]++;

  const rows: DueRow[] = open.flatMap((p) =>
    collectDatedEntities(p)
      .map((de) => ({ ...de, projectId: p.id, d: daysUntil(de.dueDate) }))
      .filter((r): r is DueRow => r.d !== null),
  );

  const avgProgress =
    open.length === 0
      ? 0
      : Math.round(
          open.reduce((sum, p) => sum + projectChecklistProgress(p).pct, 0) / open.length,
        );

  return {
    total: projects.length,
    active: open.length,
    avgProgress,
    overdue: rows.filter((r) => r.d < 0).sort((a, b) => a.d - b.d),
    dueSoon: rows.filter((r) => r.d >= 0 && r.d <= settings.dueSoonDays).sort((a, b) => a.d - b.d),
    stalled: projects.filter((p) => isStalled(p, settings.stalledAfterDays)),
    byStatus,
    byHealth,
    byProduct: rollupByProduct(open, products, settings, now),
  };
}

function rollupByProduct(
  open: Project[],
  products: Product[],
  settings: Settings,
  now: Date,
): ProductRollup[] {
  const groups = new Map<string | null, Project[]>();
  for (const p of open) {
    const key = p.productId ?? null;
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }

  const nameOf = (id: string | null) =>
    id === null ? "Sin producto" : (products.find((x) => x.id === id)?.name ?? "Producto eliminado");

  const rollups: ProductRollup[] = [];
  for (const [id, list] of groups) {
    const byHealth = zero(HEALTHS);
    let progressSum = 0;
    for (const p of list) {
      byHealth[effectiveHealth(p, settings, now)]++;
      progressSum += projectChecklistProgress(p).pct;
    }
    rollups.push({
      id,
      name: nameOf(id),
      total: list.length,
      byHealth,
      avgProgress: Math.round(progressSum / list.length),
    });
  }

  // Real products first (by risk: more red/amber up top), "Sin producto" last.
  return rollups.sort((a, b) => {
    if (a.id === null) return 1;
    if (b.id === null) return -1;
    const risk = (r: ProductRollup) => r.byHealth.red * 2 + r.byHealth.amber;
    return risk(b) - risk(a);
  });
}
