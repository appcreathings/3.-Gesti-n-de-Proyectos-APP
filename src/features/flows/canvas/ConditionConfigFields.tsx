import { useRef, type RefObject } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { FlowCondition, Trigger } from "@/domain/schemas/flow";
import { deriveAvailableVariables, type AvailableVariable } from "./variables";
import { VariablePicker } from "./VariablePicker";
import { VariableValidationHint } from "./VariableValidationHint";

interface Props {
  condition: FlowCondition;
  /** Trigger del flujo — alimenta `deriveAvailableVariables` para el
   * selector de campo y la validación. Spec 025 §B: antes este drawer no
   * tenía acceso a las variables reales, dejando al usuario escribiendo
   * el nombre del campo a ciegas. */
  trigger: Trigger;
  /** Muestra real de la última "Probar conexión" (vía canvas → builder →
   * `sample` state). Spec 025 §A/B. */
  sample?: Record<string, unknown>[];
  onChange: (updates: Partial<FlowCondition>) => void;
}

/** Operadores que admiten comparación contra strings — `value` se presenta
 * como input de texto libre con un `datalist` de los valores vistos en la
 * muestra del campo elegido (spec 025 §B). */
const STRINGISH_OPS = new Set(["==", "!=", "contains", "in"]);

export function ConditionConfigFields({ condition, trigger, sample, onChange }: Props) {
  const availableVariables = deriveAvailableVariables(trigger, sample);
  const fieldInputRef = useRef<HTMLInputElement>(null);

  // Para `value` cuando el op es string-ish: valores del sample para ese
  // campo (dedupe). Sirve para reconocer de un vistazo qué es un valor
  // plausible vs un typo.
  const valueDatalistId = "condition-value-options";
  const valueOptions = sample
    ? Array.from(
        new Set(
          sample
            .map((r) => (condition.field ? (r as Record<string, unknown>)[condition.field] : undefined))
            .filter((v): v is string => typeof v === "string" && v.length > 0)
        ),
      ).slice(0, 50)
    : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>Campo</Label>
        {/* `VariablePicker` inserta `{{campo}}` en la posición del cursor;
            aquí lo usamos para insertar el nombre crudo del campo sin las
            llaves (condición.field es un path, no un token). El picker es
            una manera rápida de elegir sin escribir a ciegas — al
            seleccionar, escribimos el crudo (quitamos las `{{}}`). */}
        <div className="flex items-center gap-2">
          <Input
            ref={fieldInputRef}
            value={condition.field}
            onChange={(e) => onChange({ field: e.target.value })}
            placeholder="amount"
            list={condition.field ? undefined : undefined}
            className="flex-1"
          />
          <FieldPicker
            field={condition.field}
            available={availableVariables}
            inputRef={fieldInputRef}
            onChange={(next) => onChange({ field: next })}
          />
        </div>
        <VariableValidationHint template={`{{${condition.field}}}`} available={availableVariables} />
        <p className="text-xs text-muted-foreground">
          Se evalúa contra el registro crudo (pre-mapeo). Usa el selector para
          elegir un campo real de tu última prueba de conexión.
        </p>
      </div>
      <div className="grid gap-2">
        <Label>Operador</Label>
        <Select
          value={condition.op}
          onChange={(e) => onChange({ op: e.target.value as FlowCondition["op"] })}
        >
          <option value="==">==</option>
          <option value="!=">!=</option>
          <option value=">">&gt;</option>
          <option value=">=">&gt;=</option>
          <option value="<">&lt;</option>
          <option value="<=">&lt;=</option>
          <option value="in">in</option>
          <option value="contains">contains</option>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Valor</Label>
        <Input
          value={String(condition.value ?? "")}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="1000"
          list={STRINGISH_OPS.has(condition.op) && valueOptions.length > 0 ? valueDatalistId : undefined}
        />
        {STRINGISH_OPS.has(condition.op) && valueOptions.length > 0 && (
          <datalist id={valueDatalistId}>
            {valueOptions.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        )}
        <p className="text-xs text-muted-foreground">
          Todas las condiciones del flujo deben cumplirse (AND) para que se ejecuten las acciones.
        </p>
      </div>
    </div>
  );
}

/** Variante local de `InterpolableField` que inserta el nombre crudo del
 * campo sin envolverlo en `{{}}` — el `field` de una condición no se
 * interpola, es un path directo al valor del registro. Reusa el menú de
 * `VariablePicker` (que sí usa `{{}}`) y al elegir le quita los wraps. */
function FieldPicker({
  field,
  available,
  inputRef,
  onChange,
}: {
  field: string;
  available: AvailableVariable[];
  inputRef: RefObject<HTMLInputElement>;
  onChange: (next: string) => void;
}) {
  if (available.length === 0) return null;

  function pick(nextField: string) {
    onChange(nextField);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      const len = nextField.length;
      inputRef.current?.setSelectionRange(len, len);
    });
  }

  // Usamos un menu ligero en vez de DropdownMenu para evitar dependencias
  // — los items son pares campo/ejemplo.
  return (
    <VariablePicker
      variables={available}
      inputRef={inputRef}
      value={field}
      onChange={(template) => {
        // VariablePicker inserta `{{campo}}`; aquí queremos el campo crudo.
        const match = template.match(/\{\{(\w+(?:\.\w+)*)\}\}/);
        if (match) {
          // Si hay un token nuevo, lo usamos; si el template empieza con
          // `{{` lo extraemos, sino se respeta el valor literal.
          pick(match[1]);
        } else {
          // El usuario no eligió una variable (cerró el menú sin
          // selección); el `onChange` del VariablePicker no debería
          // llamarse en ese caso, pero por seguridad respetamos el
          // template.
          onChange(template);
        }
      }}
    />
  );
}