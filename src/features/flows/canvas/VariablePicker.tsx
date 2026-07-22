import { type RefObject } from "react";
import type { VariableRow } from "./variables";
import { VariableMenu, type VariableMenuOption } from "./VariableMenu";
import { tokenForPick } from "./variableMenuPick";
import { insertTextAt } from "./insertToken";

interface Props {
  variables: VariableRow[];
  /** Input/textarea al que se le inserta el token — se usa para conocer la
   * posición del cursor y devolverle el foco después de insertar. */
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement>;
  value: string;
  onChange: (nextValue: string) => void;
}

/** Formatos ofrecidos en el submenú (spec 027 §G) — el usuario no tiene que
 * conocer la sintaxis `{{campo|mod}}` para descubrir los mods. */
const FORMAT_OPTIONS: { label: string; mod: string }[] = [
  { label: "Fecha (YYYY-MM-DD)", mod: "date" },
  { label: "Número (2 decimales)", mod: "number:2" },
  { label: "Número (sin decimales)", mod: "number:0" },
  { label: "MAYÚSCULAS", mod: "upper" },
  { label: "minúsculas", mod: "lower" },
];

/** Menú `{{ }}` que inserta un token de variable en la posición del cursor del
 * input asociado (spec 023 §C) — reemplaza tener que escribir `{{campo}}` a
 * ciegas. Cada variable se inserta tal cual con un clic, o "con formato" desde
 * su submenú (spec 027 §G: `{{campo|date}}`, etc.).
 *
 * Desde spec 039 §D1 la carcasa, la lista y el gesto son los mismos que los del
 * selector de campo de una condición (`VariableMenu`). Lo que **no** se comparte
 * es qué se inserta: acá un token con llaves, allá el path crudo. Esa
 * diferencia no puede desaparecer — es el bug que 037 corrigió (CA-05.3).
 *
 * Ya no hay campo "escribir campo…" (CA-05.4): peleaba contra el typeahead de
 * Radix y no funcionaba. No se pierde capacidad — el input de al lado acepta
 * texto libre —, se pierde un camino roto. */
export function VariablePicker({ variables, inputRef, value, onChange }: Props) {
  function insert(token: string) {
    const el = inputRef.current;
    const { value: next, cursor } = insertTextAt(value, token, el);
    onChange(next);

    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <VariableMenu
      rows={variables}
      title="Insertar variable"
      ariaLabel="Insertar una variable de la lista"
      plainHint={(row) => tokenForPick(row.field)}
      options={(row) =>
        FORMAT_OPTIONS.map<VariableMenuOption>((f) => ({
          label: f.label,
          hint: tokenForPick(row.field, { label: f.label, value: f.mod }),
          value: f.mod,
        }))
      }
      // El llamador —no la carcasa— construye el texto: `{{campo}}` o
      // `{{campo|mod}}` según haya sub-opción.
      onPick={(field, option) => insert(tokenForPick(field, option))}
      emptyText="Todavía no hay campos conocidos. Prueba la conexión en el nodo Trigger, o escribe el token a mano en el campo."
    />
  );
}
