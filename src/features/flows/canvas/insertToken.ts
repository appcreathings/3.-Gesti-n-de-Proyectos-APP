/** Posición de cursor de un input/textarea — lo mínimo que necesitan estos
 * helpers, para poder testearlos sin DOM. */
type SelectionLike = Pick<HTMLInputElement, "selectionStart" | "selectionEnd">;

/** Inserta `text` en la posición del cursor del input/textarea asociado,
 * devolviendo el nuevo valor y la posición del cursor resultante. Núcleo puro
 * (sin efectos): si `el` es null o no expone selección, inserta al final del
 * valor; si hay un rango seleccionado, lo reemplaza.
 *
 * Generalización de `insertTokenAt` (spec 037 §B2): el drop de una variable ya
 * no inserta siempre un token `{{campo}}` — según el destino inserta el path
 * crudo (`campo`) o una expresión JS (`record.campo`). La mecánica de cursor es
 * la misma en los tres casos, así que vive acá una sola vez. */
export function insertTextAt(
  value: string,
  text: string,
  el: SelectionLike | null,
): { value: string; cursor: number } {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  const next = value.slice(0, start) + text + value.slice(end);
  return { value: next, cursor: start + text.length };
}

/** Construye el token `{{campo}}` (o `{{campo|mod}}`) e inserta en la posición
 * del cursor. Caso particular de `insertTextAt` — se conserva como función
 * propia porque `VariablePicker` (y el modo "token" del drop) razonan en
 * términos de campo + modificador, no de texto arbitrario.
 *
 * Extraído de `VariablePicker.insert` (spec 036 §C3) para compartirlo con el
 * drop-to-field del `VariablesPanel` (arrastrar una variable a un campo). */
export function insertTokenAt(
  value: string,
  field: string,
  el: SelectionLike | null,
  mod?: string,
): { value: string; cursor: number } {
  const token = mod ? `{{${field}|${mod}}}` : `{{${field}}}`;
  return insertTextAt(value, token, el);
}
