/** Construye el token `{{campo}}` (o `{{campo|mod}}`) e inserta en la posición
 * del cursor del input/textarea asociado, devolviendo el nuevo valor y la
 * posición del cursor resultante. Núcleo puro (sin efectos) para poder testear
 * sin DOM: si `el` es null o no expone selección, inserta al final del valor.
 *
 * Extraído de `VariablePicker.insert` (spec 036 §C3) para compartirlo con el
 * drop-to-field del `VariablesPanel` (arrastrar una variable a un campo). */
export function insertTokenAt(
  value: string,
  field: string,
  el: Pick<HTMLInputElement, "selectionStart" | "selectionEnd"> | null,
  mod?: string,
): { value: string; cursor: number } {
  const token = mod ? `{{${field}|${mod}}}` : `{{${field}}}`;
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  const next = value.slice(0, start) + token + value.slice(end);
  return { value: next, cursor: start + token.length };
}
