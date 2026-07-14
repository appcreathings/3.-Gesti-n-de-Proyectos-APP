import { AlertCircle } from "lucide-react";
import { validateVariables, type AvailableVariable } from "./variables";

interface Props {
  /** Texto interpolable a validar (ej. `Hola {{name}}`). Solo se analizan
   * los `{{token}}` presentes — el resto del texto es irrelevante. */
  template: string;
  /** Variables disponibles (de la muestra real o del fallback de
   * `config.fields` — spec 025 §B). */
  available: AvailableVariable[];
}

/** Advertencia visual (no bloqueante) de `{{campo}}` huérfano en un campo
 * interpolable del editor de flujos. Renderiza un `<p>` ámbar con
 * `AlertCircle` y los tokens faltantes al lado del input — reusar tras cada
 * `InterpolableField` de `ActionConfigFields` y `ConditionConfigFields`.
 *
 * Comportamiento:
 *  - `available.length === 0` → no renderiza nada (no hay información
 *    para validar; evitar falsos positivos).
 *  - Todos los tokens matchean → no renderiza nada (caso feliz).
 *  - Hay tokens faltantes → muestra la lista en mono-espaciosa y un hint
 *    accionable. No bloquea guardar (spec 025 §B, decisión D3). */
export function VariableValidationHint({ template, available }: Props) {
  if (available.length === 0) return null;
  const { valid, missing } = validateVariables(template, available);
  if (valid || missing.length === 0) return null;
  const tokens = missing.map((m) => `{{${m}}}`).join(", ");
  return (
    <p className="flex items-start gap-1.5 text-xs text-warning">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
      <span className="font-mono">{tokens}</span>
      <span className="text-muted-foreground">
        {missing.length === 1 ? "no está en la muestra" : "no están en la muestra"} — verificar.
      </span>
    </p>
  );
}