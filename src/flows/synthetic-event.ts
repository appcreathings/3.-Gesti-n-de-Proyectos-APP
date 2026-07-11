import type { DomainEvent, DomainEventType } from "@/automations/events";
import type { Area, Checklist, ChecklistItem, Project, Task } from "@/domain/schemas";

/** Qué entidad adicional (más allá del Proyecto) necesita elegir el usuario
 * para poder simular cada tipo de evento en "Ejecutar ahora" (spec 022 §C).
 * "checklist" implica elegir Área→Checklist; "item" implica Área→Checklist→Ítem. */
export type EventSeedKind = "none" | "task" | "area" | "checklist" | "item";

export const EVENT_SEED_REQUIREMENTS: Record<DomainEventType, EventSeedKind> = {
  "project.created": "none",
  "project.statusChanged": "none",
  "task.added": "task",
  "task.statusChanged": "task",
  "task.commented": "task",
  "task.archived": "task",
  "task.unarchived": "task",
  "area.added": "area",
  "area.completed": "area",
  "checklist.completed": "checklist",
  "item.checked": "item",
};

export interface EventSeed {
  project: Project;
  task?: Task;
  area?: Area;
  checklist?: Checklist;
  item?: ChecklistItem;
}

/**
 * Construye un `DomainEvent` sintético a partir de una entidad real elegida
 * por el usuario, para "Ejecutar ahora" un flujo disparado por evento. Los
 * campos que el evento real llevaría (`from`/`to`, etc.) se completan con el
 * valor **actual** de la entidad — decisión de v1 (spec 022): no se piden a
 * mano, así se evita un formulario distinto por cada uno de los 11 tipos.
 *
 * Lanza si falta la entidad requerida para el tipo de evento — el llamador
 * (el diálogo de selección) debe garantizar que `seed` está completo según
 * `EVENT_SEED_REQUIREMENTS[eventType]` antes de invocar esto.
 */
export function buildSyntheticEvent(eventType: DomainEventType, seed: EventSeed): DomainEvent {
  const projectId = seed.project.id;

  switch (eventType) {
    case "project.created":
      return { type: "project.created", projectId, typeId: seed.project.typeId };
    case "project.statusChanged":
      return { type: "project.statusChanged", projectId, from: seed.project.status, to: seed.project.status };
    case "task.added":
      return { type: "task.added", projectId, taskId: requireTask(seed).id };
    case "task.statusChanged": {
      const task = requireTask(seed);
      return { type: "task.statusChanged", projectId, taskId: task.id, from: task.status, to: task.status };
    }
    case "task.commented": {
      const task = requireTask(seed);
      const lastComment = task.comments[task.comments.length - 1];
      return {
        type: "task.commented",
        projectId,
        taskId: task.id,
        // Sin un comentario real que referenciar, se genera un id inerte —
        // el motor solo usa projectId/taskId para targeting (`eventToSource`
        // en engine.ts), commentId no participa en eso.
        commentId: lastComment?.id ?? crypto.randomUUID(),
      };
    }
    case "task.archived":
      return { type: "task.archived", projectId, taskId: requireTask(seed).id };
    case "task.unarchived":
      return { type: "task.unarchived", projectId, taskId: requireTask(seed).id };
    case "area.added":
      return { type: "area.added", projectId, areaId: requireArea(seed).id };
    case "area.completed":
      return { type: "area.completed", projectId, areaId: requireArea(seed).id };
    case "checklist.completed": {
      const area = requireArea(seed);
      const checklist = requireChecklist(seed);
      return { type: "checklist.completed", projectId, areaId: area.id, checklistId: checklist.id };
    }
    case "item.checked": {
      const area = requireArea(seed);
      const checklist = requireChecklist(seed);
      const item = requireItem(seed);
      return { type: "item.checked", projectId, areaId: area.id, checklistId: checklist.id, itemId: item.id };
    }
  }
}

function requireTask(seed: EventSeed): Task {
  if (!seed.task) throw new Error("Este evento necesita elegir una tarea.");
  return seed.task;
}
function requireArea(seed: EventSeed): Area {
  if (!seed.area) throw new Error("Este evento necesita elegir un área.");
  return seed.area;
}
function requireChecklist(seed: EventSeed): Checklist {
  if (!seed.checklist) throw new Error("Este evento necesita elegir un checklist.");
  return seed.checklist;
}
function requireItem(seed: EventSeed): ChecklistItem {
  if (!seed.item) throw new Error("Este evento necesita elegir un ítem.");
  return seed.item;
}
