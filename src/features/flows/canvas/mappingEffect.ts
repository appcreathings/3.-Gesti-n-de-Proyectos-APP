import type { FieldMapping } from "@/domain/schemas/flow";

export interface MappingEffect {
  /** Campos que existirán en el registro DESPUÉS del mapeo. */
  kept: string[];
  /** Campos de la muestra que el mapeo descarta (dejan de existir). */
  dropped: string[];
  /** Campos descartados que alguna acción del flujo usa como `{{token}}` —
   * esos tokens dejarían de resolver. */
  brokenTokens: string[];
}

/** Segmento raíz de un path (`properties.amount` → `properties`): es el que
 * decide si el token sigue resolviendo contra el registro mapeado. */
function rootOf(path: string): string {
  return path.split(".")[0];
}

/** Espeja `applyMapping` (`src/flows/engine.ts`) **sin ejecutarlo**, para poder
 * contarle al usuario qué le pasa a sus datos (spec 037 §C1 / HU-03).
 *
 * El motor NO enriquece el registro: con ≥ 1 fila de mapeo construye un objeto
 * nuevo que contiene únicamente los `target` mapeados, así que todo lo demás se
 * pierde. Con cero filas devuelve el registro tal cual. Esta función replica esa
 * regla exacta — si algún día `applyMapping` cambiara, este helper tiene que
 * cambiar con él (por eso vive espejado y testeado, no inferido de la UI).
 *
 * Puro y sin DOM.
 *
 * @param mapping filas de mapeo configuradas en el nodo Transformar.
 * @param sampleFieldNames claves presentes en la muestra real del trigger.
 * @param usedTokens paths que las acciones del flujo consumen como `{{token}}`
 *   (de `nodeUsedVariables`).
 */
export function mappingEffect(
  mapping: FieldMapping[],
  sampleFieldNames: string[],
  usedTokens: string[] = [],
): MappingEffect {
  // Sin filas: los datos pasan tal cual, nada se descarta (CA-03.5).
  if (mapping.length === 0) {
    return { kept: [...sampleFieldNames], dropped: [], brokenTokens: [] };
  }

  const kept: string[] = [];
  for (const m of mapping) {
    if (m.target && !kept.includes(m.target)) kept.push(m.target);
  }

  const dropped = sampleFieldNames.filter((f) => !kept.includes(f));
  const droppedSet = new Set(dropped);

  // Un token se rompe si su raíz venía de la muestra y el mapeo la descarta;
  // los que ya no resolvían antes del mapeo no son culpa del mapeo.
  const brokenTokens: string[] = [];
  for (const token of usedTokens) {
    if (droppedSet.has(rootOf(token)) && !brokenTokens.includes(token)) {
      brokenTokens.push(token);
    }
  }

  return { kept, dropped, brokenTokens };
}
