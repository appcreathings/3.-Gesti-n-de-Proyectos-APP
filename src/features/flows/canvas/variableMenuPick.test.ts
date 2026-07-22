import { describe, it, expect } from "vitest";
import { tokenForPick, conditionUpdatesForPick, CONDITION_OPERATORS } from "./variableMenuPick";
import type { VariableMenuOption } from "./VariableMenu";

const dateOption: VariableMenuOption = { label: "Fecha (YYYY-MM-DD)", value: "date" };
const eqOption: VariableMenuOption = { label: "es igual a", value: "==" };

describe("tokenForPick — el picker de una ACCIÓN (spec 039 §D1)", () => {
  it("sin sub-opción devuelve el token tal cual", () => {
    expect(tokenForPick("amount")).toBe("{{amount}}");
  });

  it("con formato devuelve `{{campo|mod}}` bien formado", () => {
    expect(tokenForPick("closedate", dateOption)).toBe("{{closedate|date}}");
    expect(tokenForPick("amount", { label: "Número", value: "number:2" })).toBe(
      "{{amount|number:2}}",
    );
  });

  it("respeta nombres con espacios, acentos y puntos", () => {
    // El regex `\w`-only de 037 se rompía justamente acá.
    expect(tokenForPick("Nombre Cliente")).toBe("{{Nombre Cliente}}");
    expect(tokenForPick("Teléfono")).toBe("{{Teléfono}}");
    expect(tokenForPick("task.title")).toBe("{{task.title}}");
  });
});

describe("conditionUpdatesForPick — el picker de una CONDICIÓN (spec 039 R4)", () => {
  it("devuelve el path CRUDO, nunca un string con llaves", () => {
    // Éste es el test que impide que vuelva el bug de 037: la condición se
    // resuelve con `resolvePath` sobre el registro, no se interpola. Un
    // `{{campo}}` dentro de `condition.field` no se cumple jamás.
    for (const field of ["amount", "Nombre Cliente", "Teléfono", "task.title", "a.b.c"]) {
      const plain = conditionUpdatesForPick(field);
      const withOp = conditionUpdatesForPick(field, eqOption);
      expect(plain.field).toBe(field);
      expect(withOp.field).toBe(field);
      expect(plain.field).not.toContain("{{");
      expect(plain.field).not.toContain("}}");
      expect(withOp.field).not.toContain("{{");
      expect(withOp.field).not.toContain("}}");
    }
  });

  it("ningún operador del submenú produce llaves", () => {
    for (const o of CONDITION_OPERATORS) {
      const updates = conditionUpdatesForPick("Nombre Cliente", { label: o.label, value: o.op });
      expect(updates).toEqual({ field: "Nombre Cliente", op: o.op });
      expect(JSON.stringify(updates)).not.toContain("{{");
    }
  });

  it("elegir del submenú setea campo y operador en una sola llamada (CA-05.2)", () => {
    expect(conditionUpdatesForPick("status", { label: "está en la lista", value: "in" })).toEqual({
      field: "status",
      op: "in",
    });
  });

  it("sin sub-elección OMITE `op` — no lo manda como undefined", () => {
    // El canvas aplica `{ ...condition, ...updates }`: un `op: undefined`
    // borraría el operador que la condición ya tenía.
    const updates = conditionUpdatesForPick("status");
    expect(updates).toEqual({ field: "status" });
    expect("op" in updates).toBe(false);
  });
});
