import { useId, useState, type DragEvent, type RefObject } from "react";
import { insertTextAt } from "./insertToken";

/** Tipo MIME propio para el arrastre de una variable del panel a un campo del
 * editor (spec 036 §C3, R3). Un tipo propio evita que un arrastre de texto
 * cualquiera se interprete como inserción de variable (CA-02.5).
 *
 * Vive acá y no en `VariablesPanel` (spec 037 §B1) porque ahora tiene varios
 * consumidores: el panel que origina el arrastre y los cuatro destinos que lo
 * aceptan. */
export const VARIABLE_DRAG_MIME = "application/x-hito-variable";

/** Qué texto inserta el drop, según qué espera el destino:
 *  - `token`: campos de acción, que sí se interpolan (`{{campo}}`).
 *  - `path`: `condition.field` y `mapping[*].source` — el motor los resuelve
 *    con `resolvePath` sobre el registro, NO los interpola: un `{{}}` ahí
 *    nunca resolvería.
 *  - `code`: el textarea de `transformCode`, que es JavaScript — ahí la forma
 *    útil es la expresión que lee el campo del `record`. */
export type VariableDropMode = "token" | "path" | "code";

/** Identificador JS válido — decide entre `record.campo` y `record["campo"]`. */
const JS_IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** Expresión JS que lee `field` de `record`, segmento a segmento. Un nombre de
 * columna con espacios o acentos (`Nombre Cliente`, típico de Sheets) no es un
 * identificador válido, así que `record.Nombre Cliente` sería un error de
 * sintaxis que rompería "Probar" — para esos se emite la forma con corchetes.
 * Es la diferencia entre insertar código que corre y código que no compila. */
function recordAccessor(field: string): string {
  return field.split(".").reduce((expr, segment) => {
    if (JS_IDENTIFIER.test(segment)) return `${expr}.${segment}`;
    const escaped = segment.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `${expr}["${escaped}"]`;
  }, "record");
}

/** Texto a insertar al soltar la variable `field` en un destino de tipo `mode`.
 * Puro — testeable sin DOM (spec 037 §B1). */
export function variableDropText(field: string, mode: VariableDropMode): string {
  switch (mode) {
    case "token":
      return `{{${field}}}`;
    case "path":
      return field;
    case "code":
      return recordAccessor(field);
  }
}

/** Qué se inserta en cada destino, en palabras — se anuncia por
 * `aria-describedby` para que el drop no sea una función solo visible con el
 * mouse (design §6). */
const HINT_BY_MODE: Record<VariableDropMode, string> = {
  token: "Acepta variables arrastradas desde el panel de Variables; se insertan como {{campo}}.",
  path: "Acepta variables arrastradas desde el panel de Variables; se insertan como nombre de campo, sin llaves.",
  code: "Acepta variables arrastradas desde el panel de Variables; se insertan como expresión record.campo.",
};

/** Anillo de realimentación mientras el arrastre está encima (CA-02.2) —
 * el mismo en los cuatro destinos, para que la señal se lea igual en todos. */
export const VARIABLE_DROP_RING = "ring-2 ring-primary ring-offset-1";

interface Options<T extends HTMLInputElement | HTMLTextAreaElement> {
  mode: VariableDropMode;
  /** Campo destino — para insertar en la posición del cursor y devolverle el
   * foco después de soltar. */
  inputRef: RefObject<T>;
  value: string;
  onChange: (next: string) => void;
}

interface VariableDropTarget<T extends HTMLInputElement | HTMLTextAreaElement> {
  /** `true` mientras un arrastre válido está encima — para el anillo. */
  dragOver: boolean;
  /** Props a esparcir sobre el input/textarea destino. */
  dropProps: {
    onDragOver: (e: DragEvent<T>) => void;
    onDragLeave: () => void;
    onDrop: (e: DragEvent<T>) => void;
    "aria-describedby": string;
  };
  /** Id + texto del `<span className="sr-only">` que el consumidor debe
   * renderizar junto al campo para que `aria-describedby` resuelva. */
  hintId: string;
  hintText: string;
}

/** Convierte un input/textarea controlado en destino de arrastre del panel de
 * variables (spec 037 §B). Devuelve las props ya cableadas y el flag para
 * pintar el anillo de realimentación (CA-02.2).
 *
 * `onDragOver` solo hace `preventDefault` cuando el arrastre trae el MIME
 * propio del panel: un arrastre de texto cualquiera conserva el comportamiento
 * nativo del navegador (CA-02.5). */
export function useVariableDrop<T extends HTMLInputElement | HTMLTextAreaElement>({
  mode,
  inputRef,
  value,
  onChange,
}: Options<T>): VariableDropTarget<T> {
  const [dragOver, setDragOver] = useState(false);
  const hintId = useId();

  return {
    dragOver,
    hintId,
    hintText: HINT_BY_MODE[mode],
    dropProps: {
      "aria-describedby": hintId,
      onDragOver: (e) => {
        if (!e.dataTransfer.types.includes(VARIABLE_DRAG_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDragOver(true);
      },
      onDragLeave: () => setDragOver(false),
      onDrop: (e) => {
        const field = e.dataTransfer.getData(VARIABLE_DRAG_MIME);
        setDragOver(false);
        if (!field) return;
        e.preventDefault();
        const el = inputRef.current;
        const { value: next, cursor } = insertTextAt(value, variableDropText(field, mode), el);
        onChange(next);
        requestAnimationFrame(() => {
          el?.focus();
          el?.setSelectionRange(cursor, cursor);
        });
      },
    },
  };
}
