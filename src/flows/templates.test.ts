import { describe, it, expect } from "vitest";
import { FLOW_TEMPLATES, featuredTemplates } from "./templates";
import { validateFlow, flowErrors } from "./validation";
import { FlowRuleSchema } from "@/domain/schemas/flow";

/**
 * Guardia anti-pudrición (spec 027 §C): cada plantilla debe parsear contra el
 * schema REAL — si un bump futuro de `SCHEMA_VERSION` cambia un shape que
 * alguna plantilla usa, estos tests fallan el build, no el runtime del
 * usuario. Además fija el contrato de onboarding: los únicos problemas de
 * una plantilla recién instanciada son los placeholders que el usuario debe
 * completar (conexión/proyecto/destinatario), señalados por `validateFlow`.
 */
describe("FLOW_TEMPLATES (spec 027 §C)", () => {
  it("defines the curated templates with unique ids (6 de spec 027 + 2 round-trip de spec 032)", () => {
    expect(FLOW_TEMPLATES).toHaveLength(8);
    const ids = FLOW_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(FLOW_TEMPLATES.map((t) => [t.id, t] as const))(
    "%s parses against FlowRuleSchema and starts disabled",
    (_id, template) => {
      const flow = template.build();
      const parsed = FlowRuleSchema.parse(flow);
      expect(parsed.enabled).toBe(false);
      expect(flow.name.length).toBeGreaterThan(0);
    }
  );

  it.each(FLOW_TEMPLATES.map((t) => [t.id, t] as const))(
    "%s produces a fresh id on every build (instances are independent)",
    (_id, template) => {
      expect(template.build().id).not.toBe(template.build().id);
    }
  );

  const expectedErrors: Record<string, string[]> = {
    // Cada entrada: fragmentos que deben aparecer en los ERRORES de la
    // plantilla recién instanciada — exactamente los placeholders a completar.
    "hubspot-deal-to-project": ["conexión"],
    "sheets-row-to-task": ["conexión", "proyecto destino"],
    "hubspot-contact-to-person": ["conexión"],
    "task-done-email": ["conexión de email", "destinatario"],
    "project-created-webhook": ["URL"],
    "big-deal-notification": ["conexión"],
    // Spec 032: inbox sin conexión + createTask explícito sin proyecto destino.
    "make-inbox-to-task": ["conexión", "proyecto destino"],
    // Webhook sin URL (mismo caso que project-created-webhook).
    "task-done-to-make": ["URL"],
  };

  it.each(FLOW_TEMPLATES.map((t) => [t.id, t] as const))(
    "%s reports exactly its expected placeholder errors via validateFlow",
    (id, template) => {
      const errors = flowErrors(validateFlow(template.build(), { projects: [] }));
      const expected = expectedErrors[id];
      expect(expected).toBeDefined();
      expect(errors).toHaveLength(expected.length);
      for (const fragment of expected) {
        expect(errors.some((e) => e.message.includes(fragment))).toBe(true);
      }
    }
  );

  it("the webhook template no marca warning por secreto vacío (modo Simple, spec 034 §A)", () => {
    const template = FLOW_TEMPLATES.find((t) => t.id === "project-created-webhook")!;
    const issues = validateFlow(template.build(), { projects: [] });
    // El modo Simple (sin secreto) es válido — ya no hay warning de "sin secret".
    const warnings = issues.filter((i) => i.severity === "warning");
    expect(warnings.some((w) => w.message.includes("secret"))).toBe(false);
  });

  it("featuredTemplates returns 3 existing templates for the empty state", () => {
    const featured = featuredTemplates();
    expect(featured).toHaveLength(3);
    for (const t of featured) {
      expect(FLOW_TEMPLATES).toContain(t);
    }
  });
});
