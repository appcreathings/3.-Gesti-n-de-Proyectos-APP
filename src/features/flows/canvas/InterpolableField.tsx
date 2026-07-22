import { useRef } from "react";
import { Input } from "@/components/ui/input";
import type { VariableRow } from "./variables";
import { VariablePicker } from "./VariablePicker";
import { VariableValidationHint } from "./VariableValidationHint";
import { InterpolationPreview } from "./InterpolationPreview";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Filas de variables de la etapa que le toca a este campo (spec 039
   * §C3/§D2): `VariableRow` —campo + tipo + ejemplo— para que el picker se vea
   * igual acá y en el selector de campo de una condición (CA-05.1). */
  variables: VariableRow[];
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
 * Spec 039 §F (HU-07): ya no es drop target del `VariablesPanel` — el arrastre
 * se retiró. Poner una variable acá es el picker de al lado o copiar el token
 * del panel, que es lo que la mayoría hacía igual. */
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

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        <VariablePicker variables={variables} inputRef={inputRef} value={value} onChange={onChange} />
      </div>
      <VariableValidationHint template={value} available={variables} />
      <InterpolationPreview template={value} sample={sample} recordIndex={previewRecordIndex} />
    </div>
  );
}
