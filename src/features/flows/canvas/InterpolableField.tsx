import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AvailableVariable } from "./variables";
import { VariablePicker } from "./VariablePicker";
import { VariableValidationHint } from "./VariableValidationHint";
import { InterpolationPreview } from "./InterpolationPreview";
import { useVariableDrop, VARIABLE_DROP_RING } from "./useVariableDrop";

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
  // Drop de una variable del panel: acá se inserta como token, porque este
  // campo SÍ se interpola (spec 037 §B3).
  const drop = useVariableDrop({ mode: "token", inputRef, value, onChange });

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn("flex-1", drop.dragOver && VARIABLE_DROP_RING)}
          {...drop.dropProps}
        />
        <VariablePicker variables={variables} inputRef={inputRef} value={value} onChange={onChange} />
      </div>
      <span id={drop.hintId} className="sr-only">
        {drop.hintText}
      </span>
      <VariableValidationHint template={value} available={variables} />
      <InterpolationPreview template={value} sample={sample} recordIndex={previewRecordIndex} />
    </div>
  );
}
