import { describe, it, expect } from "vitest";
import type { FlowCondition } from "@/domain/schemas/flow";
import { evaluateCondition, toComparableNumber } from "./conditions";

function cond(partial: Partial<FlowCondition>): FlowCondition {
  return { field: "amount", op: "==", value: "", ...partial } as FlowCondition;
}

describe("evaluateCondition — operador `in` (spec 037 §D3)", () => {
  it("cumple cuando `value` es un array que contiene el valor del registro", () => {
    const c = cond({ field: "stage", op: "in", value: ["won", "closed"] });
    expect(evaluateCondition(c, { stage: "won" })).toBe(true);
    expect(evaluateCondition(c, { stage: "lost" })).toBe(false);
  });

  it("NUNCA cumple cuando `value` es un string — el defecto que la UI producía", () => {
    // El motor exige `Array.isArray(target)`; la UI guardaba `e.target.value`
    // (string), así que la condición evaluaba `false` siempre, sin error
    // visible. Documentado acá para que el arreglo de la UI no se revierta.
    const c = cond({ field: "stage", op: "in", value: "won,closed" });
    expect(evaluateCondition(c, { stage: "won" })).toBe(false);
    expect(evaluateCondition(c, { stage: "won,closed" })).toBe(false);
  });

  it("compara por identidad estricta dentro del array (sin coerción numérica)", () => {
    const c = cond({ field: "amount", op: "in", value: [1000, 2000] });
    expect(evaluateCondition(c, { amount: 1000 })).toBe(true);
    expect(evaluateCondition(c, { amount: "1000" })).toBe(false);
  });

  it("no cumple con un array vacío", () => {
    expect(evaluateCondition(cond({ field: "stage", op: "in", value: [] }), { stage: "won" })).toBe(
      false,
    );
  });
});

describe("evaluateCondition — movimiento puro desde engine.ts (spec 037 §D1)", () => {
  it("coerciona strings numéricos en ambos lados para ==/!=", () => {
    expect(evaluateCondition(cond({ op: "==", value: 5000 }), { amount: "5000" })).toBe(true);
    expect(evaluateCondition(cond({ op: "!=", value: 5000 }), { amount: "5000" })).toBe(false);
  });

  it("cae a comparación estricta cuando algún lado no es numérico", () => {
    expect(evaluateCondition(cond({ field: "stage", op: "==", value: "won" }), { stage: "won" })).toBe(
      true,
    );
    expect(evaluateCondition(cond({ field: "stage", op: "==", value: "won" }), { stage: "lost" })).toBe(
      false,
    );
  });

  it("compara ordinalmente con strings numéricos (HubSpot devuelve números como string)", () => {
    expect(evaluateCondition(cond({ op: ">", value: 1000 }), { amount: "5000" })).toBe(true);
    expect(evaluateCondition(cond({ op: "<=", value: 1000 }), { amount: "5000" })).toBe(false);
  });

  it("devuelve false si algún operando no es coercible a número", () => {
    expect(evaluateCondition(cond({ op: ">", value: 1000 }), { amount: "cinco mil" })).toBe(false);
    expect(evaluateCondition(cond({ op: ">", value: 1000 }), {})).toBe(false);
  });

  it("resuelve paths anidados con la misma función que el motor", () => {
    const c = cond({ field: "properties.amount", op: ">", value: 100 });
    expect(evaluateCondition(c, { properties: { amount: 500 } })).toBe(true);
  });

  it("`contains` exige strings en ambos lados", () => {
    expect(
      evaluateCondition(cond({ field: "email", op: "contains", value: "@acme" }), {
        email: "a@acme.com",
      }),
    ).toBe(true);
    expect(evaluateCondition(cond({ field: "email", op: "contains", value: "1" }), { email: 123 })).toBe(
      false,
    );
  });
});

describe("toComparableNumber", () => {
  it("acepta números finitos y strings numéricos", () => {
    expect(toComparableNumber(5)).toBe(5);
    expect(toComparableNumber("5000")).toBe(5000);
    expect(toComparableNumber(" 5000 ")).toBe(5000);
  });

  it("rechaza vacío, espacios en blanco y no numéricos (Number('') es 0, no 'no numérico')", () => {
    expect(toComparableNumber("")).toBeNull();
    expect(toComparableNumber("   ")).toBeNull();
    expect(toComparableNumber("abc")).toBeNull();
    expect(toComparableNumber(NaN)).toBeNull();
    expect(toComparableNumber(Infinity)).toBeNull();
    expect(toComparableNumber(null)).toBeNull();
    expect(toComparableNumber(undefined)).toBeNull();
    expect(toComparableNumber(true)).toBeNull();
  });
});
