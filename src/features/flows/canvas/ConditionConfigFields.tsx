import { useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { AlertCircle, ListChecks, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { FlowCondition } from "@/domain/schemas/flow";
import { evaluateCondition } from "@/flows/conditions";
import { resolvePath } from "@/flows/interpolation";
import type { VariableRow } from "./variables";
import { VariableMenu, type VariableMenuOption } from "./VariableMenu";
import { CONDITION_OPERATORS, conditionUpdatesForPick } from "./variableMenuPick";
import {
  conditionUpdatesWithPrefill,
  conditionValueOnPick,
  observedValues,
} from "./conditionValues";

interface Props {
  condition: FlowCondition;
  /** Variables **pre-mapeo** (spec 039 §C3, CA-04.3): las condiciones se
   * evalúan antes del Transformar, así que ven el registro crudo. Las calcula
   * `FlowCanvas` una vez (`stageVariables().before`) y las reparte — antes
   * este drawer las derivaba por su cuenta, y una lista global mentía en uno
   * de los dos lados del pipeline. */
  variables: VariableRow[];
  /** Muestra real de la última "Probar conexión" (vía canvas → builder →
   * `sample` state). Spec 025 §A/B. */
  sample?: Record<string, unknown>[];
  /** Qué registro de `sample` se usa para mostrar el valor real del campo
   * (spec 026 §D3, mismo selector "Registro N" que el resto del canvas). */
  previewRecordIndex?: number;
  onChange: (updates: Partial<FlowCondition>) => void;
}

/** Operadores que admiten comparación contra strings — `value` se presenta
 * como input de texto libre con un `datalist` de los valores vistos en la
 * muestra del campo elegido (spec 025 §B). `in` quedó fuera: desde spec 037
 * tiene su propio editor de lista. */
const STRINGISH_OPS = new Set(["==", "!=", "contains"]);

function formatValue(value: unknown): string {
  if (value === undefined) return "(sin valor)";
  if (value === null) return "null";
  if (typeof value === "string") return value === "" ? '"" (vacío)' : value;
  return JSON.stringify(value);
}

export function ConditionConfigFields({
  condition,
  variables: rows,
  sample,
  previewRecordIndex = 0,
  onChange,
}: Props) {
  const fieldInputRef = useRef<HTMLInputElement>(null);

  // Para `value` cuando el op es string-ish: valores del sample para ese
  // campo (dedupe). Sirve para reconocer de un vistazo qué es un valor
  // plausible vs un typo.
  const valueDatalistId = "condition-value-options";
  const valueOptions = useMemo(
    () => observedValues(sample, condition.field),
    [sample, condition.field],
  );

  // Valores ofrecidos por el selector (CA-06.1): los que el campo tiene de
  // verdad en la muestra; sin muestra, el ejemplo del trigger — que es lo
  // único que se sabe del campo antes de probar la conexión.
  const valueSuggestions = useMemo(() => {
    if (valueOptions.length > 0) return valueOptions;
    const example = rows.find((r) => r.field === condition.field)?.example;
    return example ? [example] : [];
  }, [valueOptions, rows, condition.field]);

  // CA-04.5: el campo elegido no aparece en ninguna clave conocida. No
  // bloquea — la muestra puede ser parcial — pero es el aviso que faltaba
  // cuando la condición jamás se cumplía por un typo en el nombre.
  const fieldIsUnknown =
    condition.field !== "" &&
    rows.length > 0 &&
    !rows.some((r) => r.field === condition.field || r.field === condition.field.split(".")[0]);

  // R2 / CA-04.3: `in` guardado como string por la UI vieja. El motor exige
  // `Array.isArray(target)`, así que esa condición nunca se cumplió. Se ofrece
  // convertirla, nunca se convierte sola: cambiar en silencio el
  // comportamiento de un flujo activo es peor que mostrarlo.
  const legacyInValue =
    condition.op === "in" && typeof condition.value === "string" && condition.value.trim() !== ""
      ? condition.value
      : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="condition-field">Campo</Label>
        <div className="flex items-center gap-2">
          <Input
            id="condition-field"
            ref={fieldInputRef}
            value={condition.field}
            onChange={(e) => onChange({ field: e.target.value })}
            placeholder="amount"
            className="flex-1"
          />
          <ConditionFieldPicker
            rows={rows}
            inputRef={fieldInputRef}
            // El pre-rellenado del valor viaja en el MISMO `onChange` que el
            // campo (CA-06.2) — no en un `useEffect`, que se dispararía
            // también al cargar el flujo y al deshacer.
            onPick={(updates) =>
              onChange(conditionUpdatesWithPrefill(condition, updates, rows, sample))
            }
          />
        </div>
        {fieldIsUnknown && (
          // El icono lleva el color; el texto queda en `foreground` — el ámbar
          // sobre fondo claro no llega a AA en tamaño normal (design §6).
          <p className="flex items-start gap-1.5 text-xs">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-warning" />
            <span>
              <code className="font-mono">{condition.field}</code> no aparece entre los campos
              conocidos. Si es un campo que solo llega a veces, está bien; si es un error de
              tipeo, la condición no se cumplirá nunca.
            </span>
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Se evalúa contra el registro crudo (pre-mapeo). Es un nombre de campo, no un token: se
          escribe <code className="font-mono">amount</code>, no{" "}
          <code className="font-mono">{"{{amount}}"}</code>.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="condition-op">Operador</Label>
        {/* Se pinta desde `CONDITION_OPERATORS`, la MISMA lista que el submenú
            del selector de campo: elegir el operador por un camino o por el
            otro deja el mismo estado porque llaman al mismo `onChange`, y
            ahora tampoco pueden divergir en qué operadores ofrecen (CA-05.5). */}
        <Select
          id="condition-op"
          value={condition.op}
          onChange={(e) => onChange({ op: e.target.value as FlowCondition["op"] })}
        >
          {CONDITION_OPERATORS.map((o) => (
            <option key={o.op} value={o.op}>
              {o.op} ({o.label})
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="condition-value">{condition.op === "in" ? "Valores" : "Valor"}</Label>

        {legacyInValue !== null && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
            <div className="space-y-2">
              <p>
                Esta condición tiene <code className="font-mono">{legacyInValue}</code> guardado como
                texto. El operador <code className="font-mono">in</code> compara contra una lista, así
                que <strong>hasta ahora nunca se cumplió</strong>.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onChange({
                    value: legacyInValue
                      .split(",")
                      .map((s) => s.trim())
                      .filter((s) => s !== ""),
                  })
                }
              >
                Convertir en lista separando por comas
              </Button>
              <p className="text-muted-foreground">
                Al convertirla la condición empieza a poder cumplirse — revisá que el flujo haga lo
                que esperás antes de guardar.
              </p>
            </div>
          </div>
        )}

        {condition.op === "in" ? (
          <InValuesEditor
            value={condition.value}
            suggestions={valueOptions}
            onChange={(values) => onChange({ value: values })}
            // Spec 039 CA-06.3: con `in`, elegir un valor lo AÑADE a la lista
            // en vez de reemplazarla — reemplazar tiraría el trabajo hecho.
            picker={
              <ConditionValuePicker
                values={valueSuggestions}
                onPick={(v) =>
                  onChange({ value: conditionValueOnPick("in", condition.value, v) })
                }
              />
            }
          />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Input
                id="condition-value"
                value={String(condition.value ?? "")}
                onChange={(e) => onChange({ value: e.target.value })}
                placeholder="1000"
                className="flex-1"
                list={
                  STRINGISH_OPS.has(condition.op) && valueOptions.length > 0
                    ? valueDatalistId
                    : undefined
                }
              />
              {/* El `datalist` de abajo se conserva (cubre el teclado y no
                  estorba), pero era invisible hasta empezar a escribir e
                  inexistente para los operadores no string-ish. Éste se ve
                  siempre que haya algo que ofrecer (CA-06.1). */}
              <ConditionValuePicker
                values={valueSuggestions}
                onPick={(v) =>
                  onChange({ value: conditionValueOnPick(condition.op, condition.value, v) })
                }
              />
            </div>
            {STRINGISH_OPS.has(condition.op) && valueOptions.length > 0 && (
              <datalist id={valueDatalistId}>
                {valueOptions.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            )}
          </>
        )}

        {/* Invariante de 037, intacto: `evaluateCondition` compara contra
            `condition.value` literal y nunca lo interpola, así que un token
            acá crearía una condición que no puede cumplirse nunca (CA-06.4).
            El selector de al lado propone valores reales; no cambia esto. */}
        <p className="text-xs text-muted-foreground">
          Es un valor literal: se compara tal cual. No acepta{" "}
          <code className="font-mono">{"{{tokens}}"}</code> — no se interpolan.
        </p>
      </div>

      <ConditionPreview
        condition={condition}
        sample={sample}
        previewRecordIndex={previewRecordIndex}
      />
    </div>
  );
}

/** Selector de campo de una condición (spec 037 §D2 / CA-04.1, CA-04.2).
 *
 * Reemplaza al `FieldPicker` anterior, que reusaba `VariablePicker` (inserta
 * `{{campo}}`) y después le quitaba las llaves con
 * `/\{\{(\w+(?:\.\w+)*)\}\}/` — un regex `\w`-only. Un campo con espacios o
 * acentos ("Nombre Cliente") no matcheaba, caía al `else` y escribía
 * `{{Nombre Cliente}}` **con llaves** dentro de `condition.field`, que jamás
 * resolvería. La corrección no es ensanchar el regex: es no hacer el
 * round-trip por `{{}}`.
 *
 * Desde spec 039 §D1 comparte carcasa, lista y gesto con el picker de las
 * acciones (`VariableMenu`), pero **no** semántica: acá lo que sale del menú
 * es el path crudo, nunca un string con llaves. La carcasa devuelve
 * `(field, option?)` y no construye texto, justamente para que esa clase de
 * bug no pueda volver (R4). */
function ConditionFieldPicker({
  rows,
  inputRef,
  onPick,
}: {
  rows: VariableRow[];
  inputRef: RefObject<HTMLInputElement>;
  /** Path crudo + (si se eligió del submenú) el operador. Un solo `onChange`,
   * el mismo que usa el `<select>` de abajo (CA-05.5). */
  onPick: (updates: { field: string; op?: FlowCondition["op"] }) => void;
}) {
  return (
    <VariableMenu
      rows={rows}
      title="Elegir un campo"
      ariaLabel="Elegir un campo de la lista"
      plainLabel="solo el campo"
      plainHint={(row) => row.field}
      options={(row) =>
        CONDITION_OPERATORS.map<VariableMenuOption>((o) => ({
          label: o.label,
          hint: `${row.field} ${o.op}`,
          value: o.op,
        }))
      }
      onPick={(field, option) => {
        // Path crudo, nunca un string con llaves — ver `variableMenuPick.ts`.
        onPick(conditionUpdatesForPick(field, option));
        requestAnimationFrame(() => {
          inputRef.current?.focus();
          const len = field.length;
          inputRef.current?.setSelectionRange(len, len);
        });
      }}
      emptyText="Todavía no hay campos conocidos. Prueba la conexión en el nodo Trigger, o escribe el nombre del campo a mano."
    />
  );
}

/** Selector de valor de la condición (spec 039 §E / HU-06): los valores que el
 * campo tiene realmente en la muestra —o el ejemplo del trigger si todavía no
 * hay muestra—, para no tener que adivinar cómo se escribe "done" o "En
 * curso".
 *
 * Reusa `VariableMenu` en **un solo nivel** (`options` devuelve `[]`): elegir
 * un valor no tiene sub-elección. Es la misma carcasa que los dos pickers de
 * campo, así que el gesto se siente igual en las tres superficies.
 *
 * No se renderiza si no hay nada que ofrecer: un menú vacío es peor que
 * ningún menú. Sugerir tampoco bloquea escribir cualquier otra cosa en el
 * input de al lado (CA-06.5). */
function ConditionValuePicker({
  values,
  onPick,
}: {
  values: string[];
  onPick: (value: string) => void;
}) {
  if (values.length === 0) return null;
  return (
    <VariableMenu
      rows={values.map((v) => ({ field: v }))}
      options={() => []}
      onPick={onPick}
      title="Elegir un valor visto en la muestra"
      ariaLabel="Elegir un valor visto en la muestra"
      icon={<ListChecks className="size-4" />}
    />
  );
}

/** Editor de valores múltiples para el operador `in` (spec 037 §D3 / CA-04.3).
 *
 * El motor exige `Array.isArray(condition.value)`; la UI guardaba siempre
 * `e.target.value` (un string), así que **ninguna** condición `in` podía
 * cumplirse. Acá se persiste un array de verdad. `condition.value` ya es
 * `z.unknown()` en el schema, así que no hace falta migración. */
function InValuesEditor({
  value,
  suggestions,
  onChange,
  picker,
}: {
  value: unknown;
  suggestions: string[];
  onChange: (values: string[]) => void;
  /** Selector de valor real (spec 039 §E). Va junto al input de alta porque
   * elegir del selector es otra forma de "añadir", no de reemplazar. */
  picker?: ReactNode;
}) {
  const [draft, setDraft] = useState("");
  const values = Array.isArray(value) ? value.map((v) => String(v)) : [];
  const datalistId = "condition-in-options";

  function add() {
    const next = draft.trim();
    if (next === "" || values.includes(next)) {
      setDraft("");
      return;
    }
    onChange([...values, next]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          id="condition-value"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Escribe un valor y pulsa Enter"
          // Contiene el texto del `<Label>` visible ("Valores") para no romper
          // WCAG 2.5.3 (Label in Name) al precisar qué hace el campo.
          aria-label="Valores: escribe uno y pulsa Enter para añadirlo"
          list={suggestions.length > 0 ? datalistId : undefined}
          className="flex-1"
        />
        <Button size="sm" variant="outline" onClick={add} disabled={draft.trim() === ""}>
          Añadir
        </Button>
        {picker}
      </div>
      {suggestions.length > 0 && (
        <datalist id={datalistId}>
          {suggestions.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      )}

      {values.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">
          Sin valores todavía — la condición no se cumplirá hasta que agregues al menos uno.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <li
              key={v}
              className="flex items-center gap-1 rounded-full border border-border bg-muted/40 py-0.5 pl-2.5 pr-1 text-xs"
            >
              <span className="max-w-[12rem] truncate font-mono">{v}</span>
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                aria-label={`Quitar el valor ${v}`}
                title={`Quitar "${v}"`}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10px] text-muted-foreground">
        Se cumple si el valor del campo es exactamente igual a alguno de la lista.
      </p>
    </div>
  );
}

/** Vista previa de la condición contra la muestra (spec 037 §D4 / CA-04.4):
 * cuántos registros la cumplen y qué valor tiene el campo en el registro
 * elegido. Usa `evaluateCondition` — la MISMA función del motor, extraída a
 * `flows/conditions.ts` justamente para que la previa no pueda divergir de lo
 * que va a pasar en la ejecución real. */
function ConditionPreview({
  condition,
  sample,
  previewRecordIndex,
}: {
  condition: FlowCondition;
  sample?: Record<string, unknown>[];
  previewRecordIndex: number;
}) {
  const matches = useMemo(() => {
    if (!sample || sample.length === 0 || !condition.field) return null;
    return sample.filter((r) => evaluateCondition(condition, r)).length;
  }, [sample, condition]);

  if (!sample || sample.length === 0 || !condition.field || matches === null) return null;

  const index = Math.min(previewRecordIndex, sample.length - 1);
  const record = sample[index];
  const actual = resolvePath(record, condition.field);
  const passes = evaluateCondition(condition, record);

  return (
    <div className="space-y-1.5 rounded-lg border border-border bg-muted/20 p-3 text-xs">
      <p className="font-medium">Vista previa contra tu muestra</p>
      <p className="text-muted-foreground">
        <strong className="text-foreground">
          {matches} de {sample.length}
        </strong>{" "}
        registro{sample.length === 1 ? "" : "s"} cumple{matches === 1 ? "" : "n"} esta condición.
        {matches === 0 && " Revisá el campo, el operador y el valor."}
      </p>
      <p className="text-muted-foreground">
        En el registro {index + 1},{" "}
        <code className="font-mono text-foreground">{condition.field}</code> vale{" "}
        <code className="font-mono text-foreground">{formatValue(actual)}</code> →{" "}
        {/* Texto, no solo color: la información no depende de distinguir verde
            de rojo (design §6). */}
        <span className={passes ? "font-medium text-success" : "font-medium text-destructive"}>
          {passes ? "se cumple" : "no se cumple"}
        </span>
        .
      </p>
    </div>
  );
}
