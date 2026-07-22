import type { FlowCondition } from "@/domain/schemas/flow";
import { resolvePath } from "@/flows/interpolation";
import type { VariableRow } from "./variables";

/** Tope de valores distintos ofrecidos — una muestra grande no puede convertir
 * el selector en una lista infinita. */
const MAX_VALUE_OPTIONS = 50;

/**
 * El valor de una condición, partiendo de datos reales (spec 039 §E, HU-06).
 * Puro y sin DOM.
 *
 * Invariante que no se toca: el valor sigue siendo **literal** — no se
 * interpola ni acepta tokens (invariante de 037). Lo que cambia es de dónde
 * sale la primera propuesta, no cómo se compara.
 */

/** Valores distintos que `field` tiene realmente en la muestra, en orden de
 * aparición. Los strings salen **crudos**, no el ejemplo truncado del panel:
 * pre-rellenar con `"Un título muy largo que se cor..."` daría una condición
 * que no se cumple nunca. */
export function observedValues(
  sample: Record<string, unknown>[] | undefined,
  field: string,
): string[] {
  if (!sample || !field) return [];
  return Array.from(
    new Set(
      sample
        .map((r) => resolvePath(r, field))
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    ),
  ).slice(0, MAX_VALUE_OPTIONS);
}

/** Qué proponer como valor de `field`: lo que el campo vale de verdad en la
 * muestra y, si no hay muestra, el ejemplo del trigger (CA-06.1). `undefined`
 * si no se sabe nada — mejor no sugerir que sugerir algo inventado. */
export function suggestedValue(
  sample: Record<string, unknown>[] | undefined,
  rows: VariableRow[],
  field: string,
): string | undefined {
  const observed = observedValues(sample, field);
  if (observed.length > 0) return observed[0];
  return rows.find((r) => r.field === field)?.example;
}

/** ¿El valor actual de la condición está vacío? Distingue la lista del
 * operador `in` (037 §D3) del valor suelto de los demás. */
export function valueIsEmpty(op: FlowCondition["op"], value: unknown): boolean {
  if (op === "in") return !Array.isArray(value) || value.length === 0;
  return value === undefined || value === null || value === "";
}

/**
 * Updates a aplicar al elegir un campo desde el picker (CA-06.2): el campo (y
 * el operador, si vino del submenú) más —**sólo si el valor está vacío**— el
 * valor sugerido.
 *
 * Pisar lo que el usuario ya escribió sería peor que no sugerir nada. Y vive
 * acá, en el camino del `onChange` del picker, y no en un `useEffect`: un
 * efecto que escribe estado derivado del estado se dispararía también al
 * cargar el flujo y al deshacer, rellenando valores que el usuario había
 * dejado vacíos a propósito.
 */
export function conditionUpdatesWithPrefill(
  condition: FlowCondition,
  updates: { field: string; op?: FlowCondition["op"] },
  rows: VariableRow[],
  sample: Record<string, unknown>[] | undefined,
): Partial<FlowCondition> {
  const op = updates.op ?? condition.op;
  if (!valueIsEmpty(op, condition.value)) return updates;
  const suggestion = suggestedValue(sample, rows, updates.field);
  if (suggestion === undefined) return updates;
  return { ...updates, value: op === "in" ? [suggestion] : suggestion };
}

/** Elegir un valor del selector. Con `in` **añade** a la lista en vez de
 * reemplazarla (CA-06.3) — y no duplica. Con cualquier otro operador,
 * reemplaza, que es lo que un valor único significa. */
export function conditionValueOnPick(
  op: FlowCondition["op"],
  current: unknown,
  picked: string,
): unknown {
  if (op !== "in") return picked;
  const values = Array.isArray(current) ? current.map((v) => String(v)) : [];
  return values.includes(picked) ? values : [...values, picked];
}
