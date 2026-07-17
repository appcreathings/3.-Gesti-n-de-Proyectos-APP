import { interpolateString } from "@/flows/interpolation";

interface Props {
  /** Texto interpolable a previsualizar (ej. `{{dealname}} - seguimiento`). */
  template: string;
  /** Muestra real del trigger — el primer registro (o el elegido por el
   * selector del `SampleExplorer`, `recordIndex`) alimenta la vista previa. */
  sample?: Record<string, unknown>[];
  recordIndex?: number;
}

/** Vista previa en vivo del valor final que tendría un campo interpolable,
 * calculada con un registro real de la muestra (spec 026 §D). Presentación
 * pura sobre `interpolateString` — convierte "configurar a ciegas" en
 * feedback inmediato: antes solo existía el hint ámbar de tokens huérfanos
 * (`VariableValidationHint`), pero nadie mostraba qué valor final tendría el
 * campo hasta ejecutar o simular el flujo completo.
 *
 * Sin muestra disponible o sin ningún token `{{}}` en el template, no
 * renderiza nada (cero ruido cuando no hay nada útil que mostrar). */
export function InterpolationPreview({ template, sample, recordIndex = 0 }: Props) {
  if (!sample || sample.length === 0 || !template.includes("{{")) return null;
  const index = Math.min(Math.max(recordIndex, 0), sample.length - 1);
  const record = sample[index] ?? {};
  const { value, unresolved, warnings } = interpolateString(template, record);
  return (
    <p className="text-xs text-muted-foreground">
      Vista previa: <span className="font-medium text-foreground">"{value}"</span>
      {unresolved.length > 0 && (
        <span className="ml-1 text-warning">
          ({unresolved.length} {unresolved.length === 1 ? "token sin resolver" : "tokens sin resolver"})
        </span>
      )}
      {/* Avisos de mods de formato (spec 027 §G): mod desconocido, fecha no
          parseable, valor no numérico — no destructivos, el valor sale igual. */}
      {warnings.length > 0 && (
        <span className="ml-1 text-warning">({warnings.join("; ")})</span>
      )}
    </p>
  );
}
