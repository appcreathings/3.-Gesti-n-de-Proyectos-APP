/** Posición de cursor de un input/textarea — lo mínimo que necesitan estos
 * helpers, para poder testearlos sin DOM. */
type SelectionLike = Pick<HTMLInputElement, "selectionStart" | "selectionEnd">;

/** Inserta `text` en la posición del cursor del input/textarea asociado,
 * devolviendo el nuevo valor y la posición del cursor resultante. Núcleo puro
 * (sin efectos): si `el` es null o no expone selección, inserta al final del
 * valor; si hay un rango seleccionado, lo reemplaza.
 *
 * Spec 039 §F: al retirarse el arrastrar-y-soltar, `insertTokenAt` se quedó sin
 * consumidores y se borró; quien inserta hoy es `VariablePicker`, que arma el
 * texto con `buildToken` y lo pone acá. La mecánica de cursor sigue siendo una
 * sola. */
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

/** El token interpolable de un campo, con su modificador de formato si lo hay
 * (spec 027 §G). Único sitio donde se ponen las llaves: lo usan la inserción
 * (`insertTokenAt`), la pista del submenú del picker y el copiar-token del
 * panel de Variables, así que no pueden divergir. */
export function buildToken(field: string, mod?: string): string {
  return mod ? `{{${field}|${mod}}}` : `{{${field}}}`;
}
