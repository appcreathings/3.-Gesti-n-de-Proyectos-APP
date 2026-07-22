import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AvailableVariable } from "./variables";
import { VariablePicker } from "./VariablePicker";
import { VariableValidationHint } from "./VariableValidationHint";
import { InterpolationPreview } from "./InterpolationPreview";
import { insertTokenAt } from "./insertToken";
import { VARIABLE_DRAG_MIME } from "./VariablesPanel";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  variables: AvailableVariable[];
  type?: string;
  /** Muestra real del trigger — alimenta la vista previa en vivo (spec 026
   * §D). Sin ella, `InterpolationPreview` simplemente no renderiza nada. */
  sample?: Record<string, unknown>[];
  /** Qué registro de `sample` usar para la vista previa — controlado por el
   * selector "Registro N" del `SampleExplorer` (spec 026 §D3). */
  previewRecordIndex?: number;
}

/** Input interpolable con `{{variable}}`: picker de variables + advertencia
 * de tokens huérfanos + vista previa en vivo del valor final, integrados en
 * un solo componente (spec 026 §D1). Reemplaza el wrapper local que existía
 * en `ActionConfigFields.tsx` (solo picker) más los montajes manuales de
 * `VariableValidationHint` que lo seguían campo por campo — algunos campos
 * los tenían, otros no (ej. `createProject.fields[*].source` no tenía hint).
 *
 * Gestiona su propio `ref` internamente: antes cada campo del builder
 * declaraba un `useRef` dedicado solo para que `VariablePicker` supiera la
 * posición del cursor donde insertar el token — quince refs manuales en
 * `ActionConfigFields.tsx` que este componente ya no necesita exponer.
 *
 * Spec 036 §C3 (HU-05): además es drop target del `VariablesPanel` — soltar
 * una variable arrastrada inserta su token en la posición del cursor. El
 * fallback de siempre sigue disponible (copiar token + picker del campo). */
export function InterpolableField({
  value,
  onChange,
  placeholder,
  variables,
  type,
  sample,
  previewRecordIndex,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn("flex-1", dragOver && "ring-2 ring-primary ring-offset-1")}
          onDragOver={(e) => {
            // Solo reaccionamos al MIME propio del panel de variables — un
            // arrastre de texto cualquiera conserva el comportamiento nativo.
            if (!e.dataTransfer.types.includes(VARIABLE_DRAG_MIME)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            const field = e.dataTransfer.getData(VARIABLE_DRAG_MIME);
            setDragOver(false);
            if (!field) return;
            e.preventDefault();
            const el = inputRef.current;
            const { value: next, cursor } = insertTokenAt(value, field, el);
            onChange(next);
            requestAnimationFrame(() => {
              el?.focus();
              el?.setSelectionRange(cursor, cursor);
            });
          }}
        />
        <VariablePicker variables={variables} inputRef={inputRef} value={value} onChange={onChange} />
      </div>
      <VariableValidationHint template={value} available={variables} />
      <InterpolationPreview template={value} sample={sample} recordIndex={previewRecordIndex} />
    </div>
  );
}
