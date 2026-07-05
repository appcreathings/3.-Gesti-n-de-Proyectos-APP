import { daysUntil, isStalled } from "./compute";
import { collectDatedEntities } from "@/lib/dates";
import type { Health, Project, Settings } from "./schemas";

/**
 * RAG health derived from the project's dates and activity (research R7,
 * data-model "reglas derivadas"):
 *   red   → estancado o con alguna fecha vencida
 *   amber → alguna fecha por vencer dentro de `dueSoonDays`
 *   green → en otro caso
 * Done/archived projects are always green (out of scope for risk).
 */
export function deriveHealth(project: Project, settings: Settings, _now: Date): Health {
  if (project.status === "done" || project.status === "archived") return "green";

  if (isStalled(project, settings.stalledAfterDays)) return "red";

  let amber = false;
  for (const de of collectDatedEntities(project)) {
    const d = daysUntil(de.dueDate);
    if (d === null) continue;
    if (d < 0) return "red";
    if (d <= settings.dueSoonDays) amber = true;
  }
  return amber ? "amber" : "green";
}

/**
 * Health shown across the app: the manual `project.health` unless the workspace
 * opted into automatic derivation (`settings.deriveHealth`).
 */
export function effectiveHealth(project: Project, settings: Settings, now: Date): Health {
  return settings.deriveHealth ? deriveHealth(project, settings, now) : project.health;
}
