import type { EntityRef } from "@/domain/schemas";
import { ROUTES } from "@/routes/paths";

/** Resuelve el deep-link de una notificación a una ruta de la app (spec 033
 *  C1). Pura — extraída de `NotificationsPage` para testear el mapeo sin
 *  montar el componente. Devuelve `null` si la notificación no es
 *  clicable (sin entityRef, o sin projectId/flowId). */
export function resolveNotificationRoute(entityRef: EntityRef | null): string | null {
  if (!entityRef) return null;

  // Spec 033 C1: notificación de fallo de Flujo → historial con el run abierto.
  if (entityRef.kind === "flow") {
    const params = new URLSearchParams();
    if (entityRef.runId) params.set("run", entityRef.runId);
    const qs = params.toString();
    return qs ? `${ROUTES.flowHistory}?${qs}` : ROUTES.flowHistory;
  }

  if (!entityRef.projectId) return null;

  const params = new URLSearchParams();
  if (entityRef.kind === "task") {
    params.set("tab", "tasks");
    if (entityRef.taskId) params.set("focus", entityRef.taskId);
  } else if (entityRef.kind === "checklistItem") {
    params.set("tab", "areas");
    if (entityRef.itemId) params.set("focus", entityRef.itemId);
  } else {
    params.set("tab", "overview");
  }
  return `${ROUTES.project(entityRef.projectId)}?${params.toString()}`;
}
