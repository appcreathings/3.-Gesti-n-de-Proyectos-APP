import type { FlowCondition } from "@/domain/schemas/flow";
import { resolvePath } from "./interpolation";

/** Mismo alias que usa `engine.ts` — `resolvePath` es la fuente de verdad
 * compartida para leer un campo de un registro (spec 026 §A). */
const getNestedValue = resolvePath;

/** Coerciona a número comparable cuando el valor ya es un número, o es un
 * string que representa uno sin ambigüedad (spec 024 §F6 — fix). HubSpot (y
 * fuentes externas en general) suele devolver campos numéricos como string
 * (ej. `amount: "5000"`), así que antes `>`/`>=`/`<`/`<=` exigían
 * `typeof === "number"` en ambos lados y una condición como "monto > 1000"
 * nunca pasaba contra un registro real de HubSpot — fallaba en silencio, sin
 * error visible para el usuario. `""`/espacios en blanco se rechazan
 * explícitamente porque `Number("")` es `0`, no "no numérico". */
export function toComparableNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Evalúa una condición de flujo contra un registro **crudo** (pre-mapeo).
 *
 * Movida tal cual desde `engine.ts` (spec 037 §D1): ahora tiene dos
 * consumidores —el motor y la vista previa del editor de condiciones— y
 * duplicarla es exactamente el error que spec 026 tuvo que corregir en la
 * interpolación (dos regex divergentes, doble fallo silencioso). Cero cambios
 * de lógica respecto de la versión del motor; los tests de `engine.test.ts` son
 * la red que lo garantiza. */
export function evaluateCondition(
  condition: FlowCondition,
  record: Record<string, unknown>
): boolean {
  const value = getNestedValue(record, condition.field);
  const target = condition.value;

  switch (condition.op) {
    case "==":
    case "!=": {
      // Igual criterio que `>`/`>=`/`<`/`<=` (spec 024 §F6): coercionar
      // numéricamente solo cuando AMBOS lados son coercibles — evita que
      // `amount: "5000"` (HubSpot) contra `condition.value: 5000` falle en
      // silencio por ser tipos distintos. Cuando no aplica, comparación
      // estricta previa (ej. strings no numéricos, booleans).
      const a = toComparableNumber(value);
      const b = toComparableNumber(target);
      const equal = a !== null && b !== null ? a === b : value === target;
      return condition.op === "==" ? equal : !equal;
    }
    case ">":
    case ">=":
    case "<":
    case "<=": {
      const a = toComparableNumber(value);
      const b = toComparableNumber(target);
      if (a === null || b === null) return false;
      if (condition.op === ">") return a > b;
      if (condition.op === ">=") return a >= b;
      if (condition.op === "<") return a < b;
      return a <= b;
    }
    case "in":
      return Array.isArray(target) && target.includes(value);
    case "contains":
      return typeof value === "string" && typeof target === "string" && value.includes(target);
    default:
      return false;
  }
}
