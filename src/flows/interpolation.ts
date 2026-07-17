/**
 * Módulo único de interpolación `{{campo}}` — fuente de verdad compartida por
 * el motor (`engine.ts`), la validación de tokens de la UI (`variables.ts`) y
 * las vistas previas en vivo del canvas (spec 026 §A). Antes el regex vivía
 * duplicado en `engine.ts` y `variables.ts`, y ya habían divergido en efecto:
 * el motor dejaba un token no resuelto como texto literal mientras el
 * validador de la UI usaba un regex distinto y no lo detectaba como huérfano.
 *
 * Spec 027 §G: los tokens ganan modificadores de formato —
 * `{{campo|mod|mod2||default}}`. El default `||` se separa primero; después
 * los mods por `|` sobre la parte izquierda. Mods v1: `upper`, `lower`,
 * `trim`, `date` (epoch-ms/ISO → YYYY-MM-DD), `number:N` (N decimales,
 * formato es). Un mod desconocido se ignora con un aviso en `warnings` — no
 * rompe el valor. Como este módulo es la fuente única, la vista previa en
 * vivo, la validación y el dry-run los soportan sin cableado extra.
 */

/** Cualquier contenido salvo `{`/`}`, no-greedy, con espacios de borde
 * recortados por la propia expresión. Reemplaza el `\{\{(\w+(?:\.\w+)*)\}\}`
 * ASCII-only anterior, que rechazaba en silencio nombres de campo reales como
 * columnas de Google Sheets con espacios/acentos ("Nombre Cliente",
 * "Teléfono") — el usuario los insertaba con el `VariablePicker` pero el
 * motor nunca los sustituía. */
export const TOKEN_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

export interface ParsedToken {
  /** Texto completo del match, incluyendo `{{`/`}}` — útil para mensajes de diagnóstico. */
  raw: string;
  /** Path a resolver contra el registro, sin mods ni default. */
  path: string;
  /** Modificadores de formato en orden de aplicación — `{{campo|upper|trim}}`
   * → `["upper", "trim"]` (spec 027 §G). Vacío para tokens sin mods. */
  mods: string[];
  /** Valor a usar cuando `path` no resuelve — sintaxis `{{campo||default}}`. */
  defaultValue?: string;
}

/** Separa `inner` en path + mods + default. El default `||` se resuelve
 * PRIMERO (spec 027 §G — evita la ambigüedad `|` vs `||`): todo lo que sigue
 * al primer `||` es el default literal; los mods se parten por `|` solo
 * sobre la parte izquierda. Documentado: un default que contiene `|` literal
 * debe evitarse en v1 (el primer `||` gana, pero un `|` suelto dentro del
 * default sí se conserva porque ya no se re-parte). */
function splitToken(inner: string): { path: string; mods: string[]; defaultValue?: string } {
  const sepIdx = inner.indexOf("||");
  const left = sepIdx === -1 ? inner : inner.slice(0, sepIdx);
  const defaultValue = sepIdx === -1 ? undefined : inner.slice(sepIdx + 2).trim();
  const [rawPath, ...rawMods] = left.split("|");
  return {
    path: rawPath.trim(),
    mods: rawMods.map((m) => m.trim()).filter((m) => m !== ""),
    defaultValue,
  };
}

/** Extrae todos los tokens `{{...}}` de un template, sin resolverlos —
 * usado por la validación de la UI (`validateVariables`) para saber qué
 * paths referencia un campo. */
export function parseTokens(template: string): ParsedToken[] {
  const tokens: ParsedToken[] = [];
  for (const m of template.matchAll(TOKEN_RE)) {
    const { path, mods, defaultValue } = splitToken(m[1]);
    tokens.push({ raw: m[0], path, mods, defaultValue });
  }
  return tokens;
}

/** Resuelve `path` contra `data` en dos pasos, en este orden:
 *  1. Clave literal completa (`data["Nombre Cliente"]`, o `data["a.b"]` si
 *     una columna se llama literalmente así) — cubre nombres de campo con
 *     espacios, acentos, guiones o puntos que Sheets/HubSpot pueden traer
 *     tal cual.
 *  2. Path anidado por puntos (`properties.amount` → `data.properties.amount`)
 *     — comportamiento previo de `getNestedValue`, preservado para HubSpot y
 *     cualquier flujo ya guardado que dependa de él. */
export function resolvePath(data: Record<string, unknown>, path: string): unknown {
  if (Object.prototype.hasOwnProperty.call(data, path)) {
    return data[path];
  }
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
}

/** Coacciona un string de fecha a `YYYY-MM-DD` (spec 026 §B6, extraído del
 * motor en spec 027 §G para que el mod `date` reuse exactamente la misma
 * lógica que `dueDate` de createTask): ISO/datetime → recorte a la fecha;
 * epoch-milisegundos de 13 dígitos (formato que HubSpot usa para
 * `closedate`) → conversión; cualquier otra cosa no parseable → sin valor,
 * con `warning`. No se intentan adivinar formatos locales ambiguos
 * (`DD/MM/YYYY`). */
export function coerceDateString(input: string): { value: string | undefined; warning?: string } {
  if (!input) return { value: undefined };
  if (/^\d{13}$/.test(input)) {
    const d = new Date(Number(input));
    if (!Number.isNaN(d.getTime())) return { value: d.toISOString().slice(0, 10) };
  }
  const d = new Date(input);
  if (!Number.isNaN(d.getTime())) return { value: d.toISOString().slice(0, 10) };
  return { value: undefined, warning: `Fecha no reconocida: "${input}"` };
}

/** Formatea un número al estilo español — miles con "." y decimales con ","
 * — a mano en vez de `Intl.NumberFormat("es")`: el CLDR de `es` no agrupa
 * miles en números de 4 dígitos (`5000` → "5000", no "5.000"), y además el
 * resultado variaría según la versión de ICU del runtime. Este formato es
 * determinista y coincide con lo que el usuario espera leer en un email. */
function formatNumberEs(n: number, decimals: number): string {
  const [intPart, decPart] = Math.abs(n).toFixed(decimals).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = n < 0 ? "-" : "";
  return sign + grouped + (decPart !== undefined ? `,${decPart}` : "");
}

/** Aplica los mods de formato de un token, en orden, sobre el valor ya
 * resuelto (spec 027 §G). Un mod desconocido o no aplicable (ej. `number`
 * sobre un valor no numérico) deja el valor intacto y registra un aviso en
 * `warnings` — nunca destruye el dato. */
function applyMods(value: string, mods: string[], warnings: string[]): string {
  let result = value;
  for (const mod of mods) {
    if (mod === "upper") {
      result = result.toUpperCase();
    } else if (mod === "lower") {
      result = result.toLowerCase();
    } else if (mod === "trim") {
      result = result.trim();
    } else if (mod === "date") {
      const coerced = coerceDateString(result);
      if (coerced.value !== undefined) {
        result = coerced.value;
      } else if (coerced.warning) {
        warnings.push(coerced.warning);
      }
    } else if (mod === "number" || mod.startsWith("number:")) {
      const decimalsRaw = mod.includes(":") ? Number(mod.split(":")[1]) : 0;
      const decimals = Number.isInteger(decimalsRaw) && decimalsRaw >= 0 && decimalsRaw <= 20 ? decimalsRaw : 0;
      const n = Number(result);
      if (result.trim() !== "" && Number.isFinite(n)) {
        result = formatNumberEs(n, decimals);
      } else {
        warnings.push(`Valor no numérico para |${mod}: "${result}"`);
      }
    } else {
      warnings.push(`Modificador desconocido: |${mod} (ignorado)`);
    }
  }
  return result;
}

export interface InterpolationResult {
  value: string;
  /** Paths de tokens que no resolvieron a un valor definido y no tenían
   * default — alimenta el hint de validación de la UI y la traza de
   * depuración (spec 026 §E). */
  unresolved: string[];
  /** Avisos no destructivos de los mods de formato (spec 027 §G): mod
   * desconocido, fecha no parseable, valor no numérico. El valor
   * interpolado sigue siendo utilizable — la UI/vista previa los muestra
   * en estilo `unresolved`. */
  warnings: string[];
}

/** Interpola un template de string. Un token no resuelto NUNCA queda como
 * texto literal `{{x}}` en el resultado (spec 026 §A, decisión D3) — se
 * reemplaza por su default (`{{x||d}}`) o por cadena vacía, y el path queda
 * registrado en `unresolved` para que la UI/traza lo hagan visible. Dejar el
 * token literal en un objeto real creado (tarea/proyecto) es peor que un
 * campo vacío señalizado. Los mods de formato (`{{x|upper}}`) se aplican
 * solo al valor resuelto — el default es un literal del usuario y se usa tal
 * cual (spec 027 §G). */
export function interpolateString(template: string, data: Record<string, unknown>): InterpolationResult {
  const unresolved: string[] = [];
  const warnings: string[] = [];
  const value = template.replace(TOKEN_RE, (_match, inner: string) => {
    const { path, mods, defaultValue } = splitToken(inner);
    const resolved = resolvePath(data, path);
    if (resolved === undefined || resolved === null) {
      if (defaultValue !== undefined) return defaultValue;
      unresolved.push(path);
      return "";
    }
    const str = typeof resolved === "string" ? resolved : String(resolved);
    return mods.length > 0 ? applyMods(str, mods, warnings) : str;
  });
  return { value, unresolved, warnings };
}

export interface InterpolationObjectResult {
  value: Record<string, unknown>;
  unresolved: string[];
  warnings: string[];
}

/** Versión recursiva de `interpolateString` para objetos (payload de
 * webhook). A diferencia del `interpolateObject` anterior en `engine.ts`,
 * preserva arrays tal cual en vez de convertirlos en objetos con claves
 * numéricas (efecto secundario de iterar `Object.entries` sobre un array). */
export function interpolateObject(
  obj: Record<string, unknown>,
  data: Record<string, unknown>
): InterpolationObjectResult {
  const result: Record<string, unknown> = {};
  const unresolved: string[] = [];
  const warnings: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "string") {
      const r = interpolateString(val, data);
      result[key] = r.value;
      unresolved.push(...r.unresolved);
      warnings.push(...r.warnings);
    } else if (Array.isArray(val)) {
      result[key] = val;
    } else if (val && typeof val === "object") {
      const r = interpolateObject(val as Record<string, unknown>, data);
      result[key] = r.value;
      unresolved.push(...r.unresolved);
      warnings.push(...r.warnings);
    } else {
      result[key] = val;
    }
  }
  return { value: result, unresolved, warnings };
}
