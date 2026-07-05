import { describe, expect, it } from "vitest";
import { emptyWorkspace, type Workspace } from "@/domain/schemas";
import { buildSystemPrompt } from "./systemPrompt";

describe("buildSystemPrompt", () => {
  it("incluye organización, fecha, umbrales e índice de proyectos", () => {
    const ws: Workspace = {
      ...emptyWorkspace(),
      org: { name: "Acme Corp" },
      settings: {
        theme: "system",
        stalledAfterDays: 10,
        dueSoonDays: 3,
        deriveHealth: false,
      },
      index: {
        ...emptyWorkspace().index,
        projects: [
          {
            id: "p1",
            name: "Lanzamiento web",
            productId: null,
            status: "active",
            health: "amber",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
        templates: [{ id: "ct1", name: "Checklist QA" }],
        processTemplates: [{ id: "pt1", name: "SOP Publicación" }],
      },
    };
    const prompt = buildSystemPrompt(ws, new Date("2026-07-02T10:00:00Z"));
    expect(prompt).toContain("Acme Corp");
    expect(prompt).toContain("2026-07-02");
    expect(prompt).toContain("10 días sin cambios");
    expect(prompt).toContain("3 días o menos");
    expect(prompt).toContain("Lanzamiento web (id: p1, estado: active, salud: amber)");
    expect(prompt).toContain("Checklist QA (id: ct1)");
    expect(prompt).toContain("Plantillas de proceso");
    expect(prompt).toContain("SOP Publicación (id: pt1)");
    expect(prompt).toContain("español");
  });

  it("incluye la guía de plantillas y tipos de proyecto", () => {
    const prompt = buildSystemPrompt(null, new Date("2026-07-02T10:00:00Z"));
    expect(prompt).toContain("Plantillas y tipos de proyecto");
    expect(prompt).toContain("create_project_type");
    expect(prompt).toContain("Buenos ítems de checklist");
  });

  it("funciona sin workspace (defaults)", () => {
    const prompt = buildSystemPrompt(null, new Date("2026-07-02T10:00:00Z"));
    expect(prompt).toContain("Mi Empresa");
    expect(prompt).toContain("14 días");
    expect(prompt).toContain("(ninguno)");
    expect(prompt).toContain("Plantillas de proceso");
  });
});
