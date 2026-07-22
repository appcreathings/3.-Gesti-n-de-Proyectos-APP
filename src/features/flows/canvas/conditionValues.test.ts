import { describe, it, expect } from "vitest";
import {
  conditionUpdatesWithPrefill,
  conditionValueOnPick,
  observedValues,
  suggestedValue,
  valueIsEmpty,
} from "./conditionValues";
import type { FlowCondition } from "@/domain/schemas/flow";
import type { VariableRow } from "./variables";

const sample = [
  { status: "todo", title: "Uno" },
  { status: "done", title: "Dos" },
  { status: "todo", title: "Tres" },
];

const rows: VariableRow[] = [
  { field: "status", type: "string", example: "todo" },
  { field: "title", type: "string", example: "Uno" },
  { field: "amount", type: "number", example: "5000" },
  { field: "sinEjemplo" },
];

const base: FlowCondition = { field: "", op: "==", value: "" };

describe("observedValues", () => {
  it("devuelve los valores distintos del campo, en orden de aparición", () => {
    expect(observedValues(sample, "status")).toEqual(["todo", "done"]);
  });

  it("sin muestra o sin campo devuelve []", () => {
    expect(observedValues(undefined, "status")).toEqual([]);
    expect(observedValues(sample, "")).toEqual([]);
  });

  it("tope de 50 valores distintos", () => {
    const big = Array.from({ length: 80 }, (_, i) => ({ v: `v${i}` }));
    expect(observedValues(big, "v")).toHaveLength(50);
  });

  it("resuelve claves planas punteadas del registro enriquecido", () => {
    expect(observedValues([{ "task.status": "doing" }], "task.status")).toEqual(["doing"]);
  });
});

describe("suggestedValue", () => {
  it("prefiere el valor real de la muestra", () => {
    expect(suggestedValue(sample, rows, "status")).toBe("todo");
  });

  it("sin muestra cae al ejemplo del trigger", () => {
    expect(suggestedValue(undefined, rows, "amount")).toBe("5000");
  });

  it("sin nada que saber no sugiere nada (mejor que inventar)", () => {
    expect(suggestedValue(undefined, rows, "sinEjemplo")).toBeUndefined();
    expect(suggestedValue(undefined, rows, "desconocido")).toBeUndefined();
  });
});

describe("valueIsEmpty", () => {
  it('trata "" / null / undefined como vacío para los operadores sueltos', () => {
    expect(valueIsEmpty("==", "")).toBe(true);
    expect(valueIsEmpty("==", null)).toBe(true);
    expect(valueIsEmpty("==", undefined)).toBe(true);
    expect(valueIsEmpty("==", "algo")).toBe(false);
    expect(valueIsEmpty("==", 0)).toBe(false);
  });

  it("para `in` mira la lista, no el string", () => {
    expect(valueIsEmpty("in", [])).toBe(true);
    expect(valueIsEmpty("in", "todo")).toBe(true); // string legacy: no es lista
    expect(valueIsEmpty("in", ["todo"])).toBe(false);
  });
});

describe("conditionUpdatesWithPrefill (CA-06.2)", () => {
  it("pre-rellena cuando el valor está vacío", () => {
    expect(conditionUpdatesWithPrefill(base, { field: "status" }, rows, sample)).toEqual({
      field: "status",
      value: "todo",
    });
  });

  it("NO pisa un valor ya escrito", () => {
    const written: FlowCondition = { ...base, value: "mío" };
    expect(conditionUpdatesWithPrefill(written, { field: "status" }, rows, sample)).toEqual({
      field: "status",
    });
  });

  it("conserva el operador que venga del submenú y lo usa para decidir", () => {
    expect(
      conditionUpdatesWithPrefill(base, { field: "status", op: "contains" }, rows, sample),
    ).toEqual({ field: "status", op: "contains", value: "todo" });
  });

  it("con `in` pre-rellena una LISTA, no un string", () => {
    const inCondition: FlowCondition = { ...base, op: "in", value: [] };
    expect(conditionUpdatesWithPrefill(inCondition, { field: "status" }, rows, sample)).toEqual({
      field: "status",
      value: ["todo"],
    });
  });

  it("con `in` y lista ya poblada no toca nada", () => {
    const inCondition: FlowCondition = { ...base, op: "in", value: ["done"] };
    expect(conditionUpdatesWithPrefill(inCondition, { field: "status" }, rows, sample)).toEqual({
      field: "status",
    });
  });

  it("sin valor sugerido devuelve los updates tal cual (no escribe vacío)", () => {
    expect(conditionUpdatesWithPrefill(base, { field: "desconocido" }, rows, undefined)).toEqual({
      field: "desconocido",
    });
  });

  it("el valor pre-rellenado es literal: nunca un token", () => {
    const updates = conditionUpdatesWithPrefill(base, { field: "status" }, rows, sample);
    expect(String(updates.value)).not.toContain("{{");
  });
});

describe("conditionValueOnPick (CA-06.3)", () => {
  it("con `in` AÑADE a la lista en vez de reemplazarla", () => {
    expect(conditionValueOnPick("in", ["todo"], "done")).toEqual(["todo", "done"]);
  });

  it("con `in` no duplica un valor que ya está", () => {
    expect(conditionValueOnPick("in", ["todo"], "todo")).toEqual(["todo"]);
  });

  it("con `in` sobre un valor legacy (string) empieza una lista nueva", () => {
    expect(conditionValueOnPick("in", "todo,done", "done")).toEqual(["done"]);
  });

  it("con cualquier otro operador reemplaza", () => {
    expect(conditionValueOnPick("==", "viejo", "nuevo")).toBe("nuevo");
    expect(conditionValueOnPick("contains", "", "done")).toBe("done");
  });
});
