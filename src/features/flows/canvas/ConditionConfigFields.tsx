import { useMemo, useRef, useState, type RefObject } from "react";
import { AlertCircle, Braces, CornerDownLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FlowCondition, Trigger } from "@/domain/schemas/flow";
import { evaluateCondition } from "@/flows/conditions";
import { resolvePath } from "@/flows/interpolation";
import { variableRows, type VariableRow } from "./variables";
import { useVariableDrop, VARIABLE_DROP_RING } from "./useVariableDrop";

interface Props {
  condition: FlowCondition;
  /** Trigger del flujo — alimenta las variables disponibles para el selector
   * de campo y la advertencia de campo ausente. Spec 025 §B: antes este drawer
   * no tenía acceso a las variables reales, dejando al usuario escribiendo el
   * nombre del campo a ciegas. */
  trigger: Trigger;
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
  trigger,
  sample,
  previewRecordIndex = 0,
  onChange,
}: Props) {
  const rows = useMemo(() => variableRows(trigger, sample), [trigger, sample]);
  const fieldInputRef = useRef<HTMLInputElement>(null);
  // `path`: el motor resuelve `condition.field` con `resolvePath` sobre el
  // registro crudo — no lo interpola, así que acá se inserta el nombre del
  // campo sin llaves (spec 037 §B3).
  const fieldDrop = useVariableDrop({
    mode: "path",
    inputRef: fieldInputRef,
    value: condition.field,
    onChange: (field) => onChange({ field }),
  });

  // Para `value` cuando el op es string-ish: valores del sample para ese
  // campo (dedupe). Sirve para reconocer de un vistazo qué es un valor
  // plausible vs un typo.
  const valueDatalistId = "condition-value-options";
  const valueOptions = useMemo(() => {
    if (!sample || !condition.field) return [];
    return Array.from(
      new Set(
        sample
          .map((r) => resolvePath(r, condition.field))
          .filter((v): v is string => typeof v === "string" && v.length > 0),
      ),
    ).slice(0, 50);
  }, [sample, condition.field]);

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
            className={cn("flex-1", fieldDrop.dragOver && VARIABLE_DROP_RING)}
            {...fieldDrop.dropProps}
          />
          <ConditionFieldPicker
            rows={rows}
            inputRef={fieldInputRef}
            onPick={(field) => onChange({ field })}
          />
        </div>
        <span id={fieldDrop.hintId} className="sr-only">
          {fieldDrop.hintText}
        </span>
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
        <Select
          id="condition-op"
          value={condition.op}
          onChange={(e) => onChange({ op: e.target.value as FlowCondition["op"] })}
        >
          <option value="==">==</option>
          <option value="!=">!=</option>
          <option value=">">&gt;</option>
          <option value=">=">&gt;=</option>
          <option value="<">&lt;</option>
          <option value="<=">&lt;=</option>
          <option value="in">in (está en la lista)</option>
          <option value="contains">contains</option>
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
          />
        ) : (
          <>
            <Input
              id="condition-value"
              value={String(condition.value ?? "")}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder="1000"
              list={
                STRINGISH_OPS.has(condition.op) && valueOptions.length > 0
                  ? valueDatalistId
                  : undefined
              }
            />
            {STRINGISH_OPS.has(condition.op) && valueOptions.length > 0 && (
              <datalist id={valueDatalistId}>
                {valueOptions.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            )}
          </>
        )}

        {/* CA-02.3: el valor es deliberadamente el único campo del editor que
            NO acepta variables arrastradas. `evaluateCondition` compara contra
            `condition.value` literal y nunca lo interpola, así que soltar un
            token acá crearía una condición que no puede cumplirse nunca. */}
        <p className="text-xs text-muted-foreground">
          Es un valor literal: se compara tal cual. No acepta variables arrastradas ni{" "}
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
 * round-trip por `{{}}`. Este selector entrega el path crudo directamente, así
 * que la clase de bug entera desaparece.
 *
 * Las filas son las mismas del panel de Variables (campo + tipo + ejemplo). */
function ConditionFieldPicker({
  rows,
  inputRef,
  onPick,
}: {
  rows: VariableRow[];
  inputRef: RefObject<HTMLInputElement>;
  onPick: (field: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // Mismo criterio que HU-01: se puede escribir un campo que no está en la
  // lista (típico, una columna de Sheets antes de probar la conexión).
  const [custom, setCustom] = useState("");

  function pick(field: string) {
    onPick(field);
    setOpen(false);
    setCustom("");
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      const len = field.length;
      inputRef.current?.setSelectionRange(len, len);
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          title="Elegir un campo"
          aria-label="Elegir un campo de la lista"
        >
          <Braces className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-64 w-72 overflow-auto">
        {rows.map((row) => (
          <DropdownMenuItem key={row.field} onClick={() => pick(row.field)}>
            <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
              <div className="flex w-full min-w-0 items-center gap-1">
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{row.field}</span>
                {row.type && (
                  <Badge variant="outline" className="shrink-0 px-1 py-0 text-[9px] uppercase">
                    {row.type}
                  </Badge>
                )}
              </div>
              {row.example && (
                <span className="max-w-full truncate text-[10px] text-muted-foreground">
                  {row.example}
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}

        {rows.length > 0 && <DropdownMenuSeparator />}

        {/* Div plano (no `DropdownMenuItem`) para que el menú no se cierre al
            teclear; el `stopPropagation` evita el typeahead de Radix. */}
        <div className="p-1" onKeyDown={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (custom.trim()) pick(custom.trim());
                }
              }}
              placeholder="escribir campo…"
              aria-label="Escribir un campo propio"
              className="h-8 flex-1 text-xs"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 shrink-0"
              onClick={() => custom.trim() && pick(custom.trim())}
              disabled={custom.trim() === ""}
              title={custom.trim() ? `Usar "${custom.trim()}"` : "Escribe un nombre de campo"}
              aria-label="Usar el campo escrito"
            >
              <CornerDownLeft className="size-3.5" />
            </Button>
          </div>
          <p className="px-1 pt-1 text-[10px] text-muted-foreground">
            Se guarda tal cual, sin <code className="font-mono">{"{{}}"}</code>.
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
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
}: {
  value: unknown;
  suggestions: string[];
  onChange: (values: string[]) => void;
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
