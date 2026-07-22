import type { FlowCondition } from "@/domain/schemas/flow";
import type { VariableMenuOption } from "./VariableMenu";
import { buildToken } from "./insertToken";

/**
 * Lo que cada llamador de `VariableMenu` hace con el `(field, option?)` que la
 * carcasa le devuelve (spec 039 §D1). Vive en un módulo propio, sin React, por
 * dos razones: es la parte que **sí** se puede fijar con un test (el repo no
 * tiene entorno DOM), y es exactamente la parte que 037 tuvo que arreglar.
 *
 * La carcasa no construye texto. Estas dos funciones son las que sí lo hacen, y
 * son deliberadamente distintas: token con llaves donde se interpola, path
 * crudo donde se resuelve con `resolvePath`. Esa diferencia no puede
 * desaparecer (CA-05.3).
 */

/** Operadores del submenú del selector de campo de una condición (spec 039
 * §D1, CA-05.2): en una acción el segundo nivel son los formatos; acá es el
 * operador de comparación — la sub-elección que de verdad tiene sentido. El
 * `<select>` de operador del drawer se pinta con esta MISMA lista, así que los
 * dos caminos no pueden divergir (CA-05.5). */
export const CONDITION_OPERATORS: { op: FlowCondition["op"]; label: string }[] = [
  { op: "==", label: "es igual a" },
  { op: "!=", label: "es distinto de" },
  { op: ">", label: "es mayor que" },
  { op: ">=", label: "es mayor o igual que" },
  { op: "<", label: "es menor que" },
  { op: "<=", label: "es menor o igual que" },
  { op: "in", label: "está en la lista" },
  { op: "contains", label: "contiene" },
];

/** Acciones: el campo se inserta como token interpolable, con su modificador
 * de formato si se eligió uno del submenú (spec 027 §G). */
export function tokenForPick(field: string, option?: VariableMenuOption): string {
  return buildToken(field, option?.value);
}

/** Condiciones: el campo se guarda **crudo** en `condition.field` —el motor lo
 * resuelve con `resolvePath`, no lo interpola— y la sub-elección es el
 * operador.
 *
 * `op` se **omite** (no se manda como `undefined`) cuando no hubo sub-elección:
 * el canvas aplica los updates con `{ ...condition, ...updates }`, así que un
 * `op: undefined` borraría el operador que la condición ya tenía. */
export function conditionUpdatesForPick(
  field: string,
  option?: VariableMenuOption,
): { field: string; op?: FlowCondition["op"] } {
  return option ? { field, op: option.value as FlowCondition["op"] } : { field };
}
