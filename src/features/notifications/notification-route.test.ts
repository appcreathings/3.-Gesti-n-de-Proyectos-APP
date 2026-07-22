import { describe, it, expect } from "vitest";
import { resolveNotificationRoute } from "./notification-route";
import { ROUTES } from "@/routes/paths";
import type { EntityRef } from "@/domain/schemas";

describe("resolveNotificationRoute (spec 033 C1 deep-link)", () => {
  it("maps kind:flow + runId to FlowHistoryPage with ?run=", () => {
    const ref: EntityRef = { kind: "flow", id: "flow-1", runId: "run-abc" };
    expect(resolveNotificationRoute(ref)).toBe(`${ROUTES.flowHistory}?run=run-abc`);
  });

  it("maps kind:flow without runId to FlowHistoryPage (no query)", () => {
    const ref: EntityRef = { kind: "flow", id: "flow-1" };
    expect(resolveNotificationRoute(ref)).toBe(ROUTES.flowHistory);
  });

  it("maps a task notification to the project tasks tab with focus", () => {
    const ref: EntityRef = { kind: "task", projectId: "p1", taskId: "t1" };
    expect(resolveNotificationRoute(ref)).toBe(`${ROUTES.project("p1")}?tab=tasks&focus=t1`);
  });

  it("maps a checklistItem notification to the areas tab", () => {
    const ref: EntityRef = { kind: "checklistItem", projectId: "p1", itemId: "i1" };
    expect(resolveNotificationRoute(ref)).toBe(`${ROUTES.project("p1")}?tab=areas&focus=i1`);
  });

  it("maps a project notification to the overview tab", () => {
    const ref: EntityRef = { kind: "project", projectId: "p1" };
    expect(resolveNotificationRoute(ref)).toBe(`${ROUTES.project("p1")}?tab=overview`);
  });

  it("returns null for a flow ref without projectId (and not kind:flow)", () => {
    // Una notificación vieja sin entityRef no es clicable.
    expect(resolveNotificationRoute(null)).toBeNull();
  });

  it("returns null for a non-flow ref lacking projectId", () => {
    const ref: EntityRef = { kind: "project" };
    expect(resolveNotificationRoute(ref)).toBeNull();
  });

  it("old notifications (without kind:flow) still resolve exactly as before", () => {
    // Retrocompat: una notificación de tarea pre-033 sigue produciendo el
    // mismo deep-link que antes de este cambio.
    const ref: EntityRef = { kind: "task", projectId: "p", taskId: "t" };
    expect(resolveNotificationRoute(ref)).toBe(`${ROUTES.project("p")}?tab=tasks&focus=t`);
  });
});
