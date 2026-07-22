import { describe, it, expect } from "vitest";
import {
  defaultOutputForType,
  triggerSummary,
  conditionSummary,
  formatConditionValue,
} from "./meta";
import { providerLabel } from "@/domain/labels";
import type { PollTrigger } from "@/domain/schemas/flow";
import type { TriggerNodeData } from "@/flows/graph";

describe("defaultOutputForType — webhook (spec 034 §A)", () => {
  it("nace en modo Simple: payload plano, sin secreto (revierte el default envelope de 032)", () => {
    const output = defaultOutputForType("webhook");
    expect(output).toEqual({ type: "webhook", url: "", secret: "", payloadShape: "bare" });
  });

  it("no fuerza una firma en webhooks nuevos (secret vacío)", () => {
    const output = defaultOutputForType("webhook");
    if (output.type !== "webhook") throw new Error("unexpected type");
    expect(output.secret).toBe("");
    expect(output.payloadShape).toBe("bare");
  });
});

// Spec 038 §B (HU-06): etiquetas honestas — una sola tabla de proveedores y un
// resumen de condición que distingue una lista de un string con comas.
describe("triggerSummary — proveedores del poll (CA-06.1)", () => {
  const pollTrigger = (provider: PollTrigger["provider"]): TriggerNodeData => ({
    kind: "trigger",
    trigger: {
      type: "poll",
      provider,
      config: { connectionId: "conn-1", fields: [], filters: [], intervalMs: 300_000 },
    },
  });

  it("nombra HubSpot", () => {
    expect(triggerSummary(pollTrigger("hubspot"))).toBe("Polling HubSpot");
  });

  it("nombra Google Sheets", () => {
    expect(triggerSummary(pollTrigger("google-sheets"))).toBe("Polling Google Sheets");
  });

  it("un trigger de inbox NO dice Google Sheets (el defecto de meta.ts:83)", () => {
    const summary = triggerSummary(pollTrigger("inbox"));
    expect(summary).toBe("Polling Make/Zapier (inbox)");
    expect(summary).not.toContain("Google Sheets");
  });

  it("usa la misma tabla que el resto de la app", () => {
    expect(triggerSummary(pollTrigger("inbox"))).toBe(`Polling ${providerLabel.inbox}`);
  });

  it("añade el objectType de HubSpot cuando está configurado", () => {
    const data = pollTrigger("hubspot");
    if (data.trigger.type !== "poll") throw new Error("unexpected trigger");
    data.trigger.config.objectType = "deals";
    expect(triggerSummary(data)).toBe("Polling HubSpot · deals");
  });

  it("un trigger de evento sigue usando su etiqueta de evento", () => {
    expect(
      triggerSummary({ kind: "trigger", trigger: { type: "event", event: "task.statusChanged" } }),
    ).toBe("Al cambiar el estado de una tarea");
  });
});

describe("formatConditionValue / conditionSummary (CA-06.2)", () => {
  it("un array se resume como lista, delatando que son varios valores", () => {
    expect(formatConditionValue(["won", "closed"])).toBe("[won, closed]");
  });

  it("un string se resume entrecomillado", () => {
    expect(formatConditionValue("won,closed")).toBe('"won,closed"');
  });

  it("la lista y el string legacy dejan de verse idénticos (el par que 037 enseñó a distinguir)", () => {
    expect(formatConditionValue(["won", "closed"])).not.toBe(formatConditionValue("won,closed"));
  });

  it("números y booleanos se muestran tal cual", () => {
    expect(formatConditionValue(100)).toBe("100");
    expect(formatConditionValue(true)).toBe("true");
  });

  it("sin valor no imprime 'undefined'", () => {
    expect(formatConditionValue(undefined)).toBe("");
    expect(formatConditionValue(null)).toBe("");
  });

  it("el resumen del nodo usa el formato nuevo", () => {
    expect(
      conditionSummary({ kind: "condition", condition: { field: "stage", op: "in", value: ["won", "closed"] } }),
    ).toBe("stage in [won, closed]");
  });

  it("una condición sin campo lo sigue diciendo (CA-06.4)", () => {
    expect(conditionSummary({ kind: "condition", condition: { field: "", op: "==", value: "" } })).toBe(
      "Condición sin configurar",
    );
  });
});
