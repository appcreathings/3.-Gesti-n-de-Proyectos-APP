import type { Trigger, PollTrigger } from "@/domain/schemas/flow";
import type { FlowNodeData } from "@/flows/graph";
import type { DomainEventType } from "@/automations/events";
import { parseTokens } from "@/flows/interpolation";

export interface AvailableVariable {
  /** Nombre del campo, tal como aparece en el registro (`record.<field>`). */
  field: string;
  /** Valor de ejemplo (de la muestra real, o del evento sintético) — ayuda a
   * reconocer qué variable es cuál sin adivinar por el nombre solo. */
  example?: string;
}

/** Campos que trae cada tipo de `DomainEvent` (ver `src/automations/events.ts`),
 * con un valor de ejemplo — se usan cuando todavía no hay una muestra real de
 * "Probar conexión" (trigger de evento, o trigger de poll sin probar aún).
 *
 * Exportado para que `src/flows/dry-run.ts` (spec 025 §C) pueda construir un
 * evento sintético representativo sin duplicar esta tabla. */
export const EVENT_FIELD_EXAMPLES: Record<DomainEventType, Record<string, string>> = {
  "item.checked": { type: "item.checked", projectId: "proj-123", areaId: "area-1", checklistId: "chk-1", itemId: "item-1" },
  "checklist.completed": { type: "checklist.completed", projectId: "proj-123", areaId: "area-1", checklistId: "chk-1" },
  "area.completed": { type: "area.completed", projectId: "proj-123", areaId: "area-1" },
  "area.added": { type: "area.added", projectId: "proj-123", areaId: "area-1" },
  "project.created": { type: "project.created", projectId: "proj-123", typeId: "type-1" },
  "project.statusChanged": { type: "project.statusChanged", projectId: "proj-123", from: "active", to: "done" },
  "task.added": { type: "task.added", projectId: "proj-123", taskId: "task-1" },
  "task.statusChanged": { type: "task.statusChanged", projectId: "proj-123", taskId: "task-1", from: "todo", to: "done" },
  "task.commented": { type: "task.commented", projectId: "proj-123", taskId: "task-1", commentId: "comment-1" },
  "task.archived": { type: "task.archived", projectId: "proj-123", taskId: "task-1" },
  "task.unarchived": { type: "task.unarchived", projectId: "proj-123", taskId: "task-1" },
};

/** Campos por defecto que trae HubSpot según el `objectType` — espeja
 * `HUBSPOT_FIELDS_BY_TYPE` de `TriggerStep.tsx` para que cuando el usuario
 * aún no eligió `config.fields` manualmente ni probó la conexión, los
 * selectores del mapeo no aparezcan vacíos (spec 025 §B). Se exporta para
 * que `TriggerStep` y otros consumers usen la misma fuente de verdad. */
export const HUBSPOT_DEFAULT_FIELDS_FOR_OBJECT_TYPE: Record<NonNullable<PollTrigger["config"]["objectType"]>, string[]> = {
  contacts: ["email", "firstname", "lastname", "company", "phone"],
  deals: ["dealname", "amount", "dealstage", "closedate", "pipeline"],
  tickets: ["subject", "content", "hs_ticket_priority", "hs_pipeline_stage", "hs_ticket_category"],
};

function formatExample(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return str.length > 40 ? `${str.slice(0, 37)}...` : str;
}

/** Une las variables disponibles para interpolar `{{campo}}` en un nodo, en
 * orden de prioridad:
 *  1. Muestra real de "Probar conexión" si existe (unión de claves de todos
 *     los registros — spec 022 §A, o hidratada desde `flow.lastSample` — spec
 *     025 §A).
 *  2. Si no, los campos conocidos del tipo de evento del trigger (event).
 *  3. Si no, para un poll de HubSpot, los `config.fields` elegidos por el
 *     usuario al configurar el trigger (spec 025 §B) — antes se devolvía
 *     `[]`, dejando al usuario escribiendo a ciegas los nombres de campos
 *     que el propio flujo ya sabe que va a traer.
 *  4. Para HubSpot sin `config.fields`, los defaults por `objectType` (ídem).
 *  5. Para Google Sheets sin muestra ni `config.fields`, `[]` — Sheets no
 *     expone campos conocidos hasta que se prueba la conexión (el rango es
 *     arbitrario, definido en la conexión, no en el trigger).
 * Cada variable lleva un ejemplo de valor cuando se conoce (spec 023 §C). */
export function deriveAvailableVariables(
  trigger: Trigger,
  sample?: Record<string, unknown>[]
): AvailableVariable[] {
  const seen = new Map<string, string | undefined>();

  if (sample && sample.length > 0) {
    for (const record of sample) {
      for (const [key, value] of Object.entries(record)) {
        if (!seen.has(key)) seen.set(key, formatExample(value));
      }
    }
    return Array.from(seen.entries()).map(([field, example]) => ({ field, example }));
  }

  if (trigger.type === "event") {
    for (const [key, value] of Object.entries(EVENT_FIELD_EXAMPLES[trigger.event])) {
      seen.set(key, value);
    }
    return Array.from(seen.entries()).map(([field, example]) => ({ field, example }));
  }

  // Poll sin muestra — fallback a config.fields o defaults de HubSpot.
  if (trigger.type === "poll") {
    const explicitFields = trigger.config.fields;
    const fields =
      explicitFields.length > 0
        ? explicitFields
        : trigger.provider === "hubspot"
          ? HUBSPOT_DEFAULT_FIELDS_FOR_OBJECT_TYPE[trigger.config.objectType ?? "contacts"]
          : [];
    for (const field of fields) seen.set(field, undefined);
    return Array.from(seen.entries()).map(([field, example]) => ({ field, example }));
  }

  return [];
}

/** Valida que todos los `{{tokens}}` interpolables en `template` estén
 * presentes en `available` (path completo o top-level). Devuelve los
 * faltantes. Cuando `available` está vacío (sin muestra ni campos
 * conocidos), devuelve `valid: true` — sin información para advertir,
 * no hay valor en mostrar una advertencia (spec 025 §B). */
export function validateVariables(
  template: string,
  available: AvailableVariable[]
): { valid: boolean; missing: string[] } {
  if (available.length === 0) return { valid: true, missing: [] };
  const availableFields = new Set(available.map((v) => v.field));
  const missing = new Set<string>();
  // Tokeniza con el mismo `parseTokens` que usa el motor para interpolar
  // (spec 026 §A) — antes este archivo tenía su propio regex `\w`-only que
  // nunca detectaba `{{Nombre Cliente}}`/`{{Teléfono}}` como huérfanos,
  // aunque el motor tampoco los interpolara: doble fallo silencioso.
  for (const { path } of parseTokens(template)) {
    const top = path.split(".")[0];
    if (!availableFields.has(path) && !availableFields.has(top)) {
      missing.add(path);
    }
  }
  return { valid: missing.size === 0, missing: Array.from(missing) };
}

/** Recorre recursivamente todos los valores string de un objeto (payload de
 * output, arrays anidados, sub-objetos) invocando `visit` con cada uno. Se usa
 * para descubrir qué tokens `{{campo}}` referencia un output sin conocer su
 * forma exacta (spec 036 §C5). */
function walkStrings(value: unknown, visit: (s: string) => void): void {
  if (typeof value === "string") {
    visit(value);
  } else if (Array.isArray(value)) {
    for (const v of value) walkStrings(v, visit);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value)) walkStrings(v, visit);
  }
}

/** Variables que un nodo consume, para pintarlas como chips en el canvas
 * (spec 036 §C5 / HU-06). Devuelve los paths crudos (sin `{{}}`), deduplicados,
 * en orden de aparición:
 *  - `condition` → el `field` comparado (path directo, no un token).
 *  - `transform` → tokens `{{...}}` del código JS + los `source` del mapeo.
 *  - `action` → tokens `{{...}}` de cualquier string interpolable del output
 *    (título, mensaje, asunto, cuerpo, url, datos de persona, etc.).
 *  - `trigger` → ninguna (es el origen de las variables, no las consume).
 * Puro y sin DOM — testeable en unidad. */
export function nodeUsedVariables(data: FlowNodeData): string[] {
  const seen = new Set<string>();
  switch (data.kind) {
    case "condition":
      if (data.condition.field) seen.add(data.condition.field);
      break;
    case "transform":
      if (data.transformCode) {
        for (const t of parseTokens(data.transformCode)) seen.add(t.path);
      }
      for (const m of data.mapping) {
        if (m.source) seen.add(m.source);
      }
      break;
    case "action":
      walkStrings(data.output, (s) => {
        for (const t of parseTokens(s)) seen.add(t.path);
      });
      break;
    case "trigger":
      break;
  }
  return Array.from(seen);
}

export type InternalEntity = "task" | "project" | "person";

export interface InternalTargetField {
  field: string;
  label: string;
}

/** Campos destino conocidos de Hito por entidad, derivados de sus schemas
 * (`domain/schemas/project.ts`, `domain/schemas/person.ts`) — para que el
 * "campo destino" del mapeo deje de ser texto libre a ciegas (spec 023 §C). */
export const INTERNAL_TARGET_FIELDS: Record<InternalEntity, InternalTargetField[]> = {
  task: [
    { field: "title", label: "Título" },
    { field: "description", label: "Descripción" },
    { field: "status", label: "Estado" },
    { field: "priority", label: "Prioridad" },
    { field: "assigneeId", label: "Responsable" },
    { field: "dueDate", label: "Fecha límite" },
    { field: "tags", label: "Etiquetas" },
    { field: "estimate", label: "Estimación" },
    { field: "summary", label: "Resumen" },
  ],
  project: [
    { field: "name", label: "Nombre" },
    { field: "status", label: "Estado" },
    { field: "productId", label: "Producto" },
    { field: "description", label: "Descripción" },
  ],
  person: [
    { field: "name", label: "Nombre" },
    { field: "email", label: "Email" },
    { field: "roleTitle", label: "Cargo" },
  ],
};

/** Todos los campos internos, sin distinguir entidad — el mapeo de
 * Transformación no sabe a qué entidad apunta cada fila hasta que un output
 * consuma el resultado, así que se ofrece la unión completa. */
export function allInternalTargetFields(): InternalTargetField[] {
  const seen = new Map<string, InternalTargetField>();
  for (const fields of Object.values(INTERNAL_TARGET_FIELDS)) {
    for (const f of fields) if (!seen.has(f.field)) seen.set(f.field, f);
  }
  return Array.from(seen.values());
}

/** Sugiere pares (origen → destino) por similitud de nombre — ignora mayúsculas
 * y separadores, y reconoce algunos alias comunes de HubSpot/Sheets ("email"
 * vs "email", "firstname"/"first_name" vs "name"). Nunca sobreescribe un
 * mapeo con `target` ya definido. */
export function suggestFieldMappingPairs(
  available: AvailableVariable[],
  internalFields: InternalTargetField[] = allInternalTargetFields()
): { source: string; target: string }[] {
  const ALIASES: Record<string, string> = {
    firstname: "name",
    first_name: "name",
    lastname: "name",
    last_name: "name",
    fullname: "name",
    dealname: "name",
    subject: "title",
  };

  function normalize(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  const internalByNormalized = new Map(internalFields.map((f) => [normalize(f.field), f.field]));

  const pairs: { source: string; target: string }[] = [];
  for (const variable of available) {
    const normalized = normalize(variable.field);
    const aliasTarget = ALIASES[normalized];
    const target = aliasTarget ?? internalByNormalized.get(normalized);
    if (target) pairs.push({ source: variable.field, target });
  }
  return pairs;
}
