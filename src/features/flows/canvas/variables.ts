import type { Trigger } from "@/domain/schemas/flow";
import type { DomainEventType } from "@/automations/events";

export interface AvailableVariable {
  /** Nombre del campo, tal como aparece en el registro (`record.<field>`). */
  field: string;
  /** Valor de ejemplo (de la muestra real, o del evento sintético) — ayuda a
   * reconocer qué variable es cuál sin adivinar por el nombre solo. */
  example?: string;
}

/** Campos que trae cada tipo de `DomainEvent` (ver `src/automations/events.ts`),
 * con un valor de ejemplo — se usan cuando todavía no hay una muestra real de
 * "Probar conexión" (trigger de evento, o trigger de poll sin probar aún). */
const EVENT_FIELD_EXAMPLES: Record<DomainEventType, Record<string, string>> = {
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

function formatExample(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return str.length > 40 ? `${str.slice(0, 37)}...` : str;
}

/** Une las variables disponibles para interpolar `{{campo}}` en un nodo: la
 * muestra real de "Probar conexión" si existe (unión de claves de todos los
 * registros — spec 022 §A), o si no, los campos conocidos del tipo de evento
 * del trigger. Cada variable lleva un ejemplo de valor para reconocerla sin
 * adivinar por el nombre (spec 023 §C). */
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
  } else if (trigger.type === "event") {
    for (const [key, value] of Object.entries(EVENT_FIELD_EXAMPLES[trigger.event])) {
      seen.set(key, value);
    }
  }

  return Array.from(seen.entries()).map(([field, example]) => ({ field, example }));
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
