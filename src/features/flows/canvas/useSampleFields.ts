/** Info de un campo de la muestra real ("Probar conexión") — path, ejemplo
 * truncado, tipo inferido y presencia (`N/M` registros). Extraído de
 * `SampleExplorer` (spec 036 §C1) para que el `VariablesPanel` lo reuse sin
 * duplicar la lógica. */
export interface SampleFieldInfo {
  /** Path completo del campo (ej. "email", "record.email"). */
  path: string;
  /** Valor de ejemplo (del primer registro que lo tenga), truncado. */
  example: string;
  /** Tipo inferido del valor: "string" | "number" | "boolean" | "object" |
   * "array" | "null". */
  type: string;
  /** En cuántos de los N registros aparece el campo (ej. "2/3") — para
   * detectar campos que solo a veces vienen. */
  presence: string;
}

/** Detecta el tipo JS de un valor — usado para mostrar un badge/tipo junto al
 * nombre del campo. */
function detectType(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/** Formatea el ejemplo truncado para que quepa en la UI sin romper layout. */
function formatExample(value: unknown): string {
  if (value === null || value === undefined) return "(vacío)";
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return str.length > 60 ? `${str.slice(0, 57)}...` : str;
}

/** Deriva la lista de campos de una muestra de registros: une las claves de
 * todos los registros, cuenta presencia y toma el primer valor como ejemplo.
 * Ordenada alfabéticamente por path. Función pura (sin DOM) — reusada por
 * `SampleExplorer` y `VariablesPanel`. Devuelve `[]` si no hay muestra. */
export function sampleFields(sample: Record<string, unknown>[] | undefined): SampleFieldInfo[] {
  if (!sample || sample.length === 0) return [];
  const total = sample.length;
  const fieldMap = new Map<string, { example: unknown; count: number; type: string }>();
  for (const record of sample) {
    for (const [key, value] of Object.entries(record)) {
      const existing = fieldMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        fieldMap.set(key, { example: value, count: 1, type: detectType(value) });
      }
    }
  }
  return Array.from(fieldMap.entries())
    .map(([path, info]) => ({
      path,
      example: formatExample(info.example),
      type: info.type,
      presence: `${info.count}/${total}`,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}
