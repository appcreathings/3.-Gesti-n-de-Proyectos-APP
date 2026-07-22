import type { DomainEvent } from "@/automations/events";
import type { Person, Project } from "@/domain/schemas";

/** Índices por id construidos **una vez por corrida** (spec 039 §B2, R6): el
 * enriquecimiento resuelve una entidad por evento y una búsqueda lineal por
 * evento sobre `projects`/`people` sería cuadrática en el peor caso. */
export interface EventRecordDeps {
  projects: Map<string, Project>;
  people: Map<string, Person>;
}

/** Construye los índices que `eventRecord` necesita a partir de los arrays que
 * el motor ya tiene en `FlowEngineInput`. Se llama una vez por `runFlowEngine`,
 * no una vez por evento. */
export function buildEventRecordDeps(projects: Project[], people: Person[]): EventRecordDeps {
  return {
    projects: new Map(projects.map((p) => [p.id, p])),
    people: new Map(people.map((p) => [p.id, p])),
  };
}

/** Sólo escribe la clave si el valor existe. Un campo ausente (tarea sin
 * responsable, sin fecha límite) **no se emite**: emitir `""` se leería como
 * "no tiene responsable" en vez de "no lo pude resolver" (spec 039 §B4). */
function put(target: Record<string, unknown>, key: string, value: unknown): void {
  if (value === null || value === undefined) return;
  target[key] = value;
}

/**
 * Registro que ve el pipeline para un evento interno: el evento tal cual, más
 * los datos **legibles** de las entidades que referencia (spec 039 §B, HU-03).
 *
 * Tres decisiones, todas fijadas por tests:
 *
 * 1. **Se enriquece aquí, una sola vez.** El único punto donde un evento se
 *    vuelve registro es `resolveTriggerData`; enriquecer en cada output dejaría
 *    el problema en los otros cuatro sitios (condiciones, mapeo, email,
 *    crear-tarea).
 * 2. **Claves planas punteadas** (`record["task.title"]`), no objetos anidados.
 *    `resolvePath` (`interpolation.ts:77`) prueba la clave literal **antes** de
 *    partir por puntos, y `sampleFields` (`useSampleFields.ts:42`) sólo recorre
 *    el nivel superior: con claves planas, el panel de variables, el picker, la
 *    interpolación y la validación funcionan sin tocar ninguno. Con objetos
 *    anidados habría que reescribir los cuatro.
 * 3. **Aditivo: el evento gana siempre.** La composición es
 *    `{ ...enrichment, ...event }`, nunca al revés — ningún campo calculado
 *    puede pisar `type`/`projectId`/`taskId`/`from`/`to`, así que ningún flujo
 *    guardado cambia de comportamiento (CA-03.2).
 *
 * Si la entidad ya no existe (una tarea borrada entre el evento y la corrida),
 * el registro simplemente no trae esos campos: ni excepción, ni valores
 * inventados (CA-03.5).
 */
export function eventRecord(
  event: DomainEvent,
  deps: EventRecordDeps,
): Record<string, unknown> {
  const enrichment: Record<string, unknown> = {};
  const e = event as unknown as Record<string, unknown>;

  const project = typeof e.projectId === "string" ? deps.projects.get(e.projectId) : undefined;
  if (project) {
    put(enrichment, "project.name", project.name);
    put(enrichment, "project.status", project.status);
    put(enrichment, "project.health", project.health);
    put(enrichment, "project.priority", project.priority);
  }

  if (project && typeof e.taskId === "string") {
    const task = project.tasks.find((t) => t.id === e.taskId);
    if (task) {
      put(enrichment, "task.title", task.title);
      put(enrichment, "task.status", task.status);
      put(enrichment, "task.priority", task.priority);
      put(enrichment, "task.dueDate", task.dueDate);
      put(enrichment, "task.assigneeId", task.assigneeId);
      // `assigneeName` sale de `deps.people`; sin coincidencia se omite.
      if (task.assigneeId) {
        put(enrichment, "task.assigneeName", deps.people.get(task.assigneeId)?.name);
      }
      put(enrichment, "task.tags", task.tags);
    }
  }

  const area =
    project && typeof e.areaId === "string"
      ? project.areas.find((a) => a.id === e.areaId)
      : undefined;
  if (area) {
    put(enrichment, "area.name", area.name);
  }

  const checklist =
    area && typeof e.checklistId === "string"
      ? area.checklists.find((c) => c.id === e.checklistId)
      : undefined;
  if (checklist) {
    put(enrichment, "checklist.name", checklist.name);
  }

  if (checklist && typeof e.itemId === "string") {
    const item = checklist.items.find((i) => i.id === e.itemId);
    if (item) put(enrichment, "item.text", item.text);
  }

  // El evento gana siempre — ver punto 3 del doc de arriba.
  return { ...enrichment, ...e };
}
