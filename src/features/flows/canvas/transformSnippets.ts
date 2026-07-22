/** Documentación de JavaScript en español (spec 036 §D, CA-07.1) — el único
 * recurso externo de la spec, y se abre solo por acción explícita del usuario. */
export const MDN_JS_GUIDE_URL = "https://developer.mozilla.org/es/docs/Web/JavaScript/Guide";

export interface TransformSnippet {
  label: string;
  /** Cuerpo sin `return record;` — lo agrega `applySnippet`, para poder
   * encadenar varios ejemplos sin dejar código muerto tras un return. */
  body: string;
}

/** Ejemplos listos para usar en el editor de código del nodo Transformar
 * (CA-07.2): reducen el "código a ciegas" de quien no programa a diario. */
export const TRANSFORM_SNIPPETS: TransformSnippet[] = [
  {
    label: "Pasar un campo a MAYÚSCULAS",
    body: 'record.name = String(record.name ?? "").toUpperCase();',
  },
  {
    label: "Armar el nombre completo",
    body: 'record.fullName = `${record.firstname ?? ""} ${record.lastname ?? ""}`.trim();',
  },
  {
    label: "Formatear una fecha a YYYY-MM-DD",
    body: "record.dueDate = new Date(record.closedate).toISOString().slice(0, 10);",
  },
  {
    label: "Elegir un valor según una condición",
    body: 'record.priority = Number(record.amount ?? 0) > 1000 ? "high" : "medium";',
  },
];

export const RETURN_LINE = "return record;";

/** Inserta el cuerpo de un ejemplo en el código actual manteniendo un único
 * `return record;` al final: si el código ya termina en el return, el ejemplo
 * se inserta ANTES (si no, quedaría inalcanzable). Si no hay código, devuelve
 * el ejemplo ya cerrado con su return. Puro — testeable sin DOM. */
export function applySnippet(current: string | undefined, body: string): string {
  const code = (current ?? "").trim();
  if (!code) return `${body}\n${RETURN_LINE}`;
  if (code.endsWith(RETURN_LINE)) {
    const head = code.slice(0, code.length - RETURN_LINE.length).trimEnd();
    return head ? `${head}\n${body}\n${RETURN_LINE}` : `${body}\n${RETURN_LINE}`;
  }
  return `${code}\n${body}`;
}
