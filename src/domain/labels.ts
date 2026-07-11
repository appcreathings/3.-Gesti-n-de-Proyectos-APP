import type {
  Health,
  Priority,
  ProductStatus,
  ProjectStatus,
  QuarterStatus,
  RaciRole,
  SprintStatus,
  TaskStatus,
} from "./schemas";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning";

export const projectStatusLabel: Record<ProjectStatus, string> = {
  backlog: "Backlog",
  active: "Activo",
  paused: "Pausado",
  blocked: "Bloqueado",
  done: "Terminado",
  archived: "Archivado",
};

export const projectStatusVariant: Record<ProjectStatus, BadgeVariant> = {
  backlog: "secondary",
  active: "default",
  paused: "warning",
  blocked: "destructive",
  done: "success",
  archived: "outline",
};

export const productStatusLabel: Record<ProductStatus, string> = {
  idea: "Idea",
  active: "Activo",
  maintenance: "Mantenimiento",
  sunset: "Retiro",
};

export const priorityLabel: Record<Priority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

export const priorityVariant: Record<Priority, BadgeVariant> = {
  low: "outline",
  medium: "secondary",
  high: "warning",
  critical: "destructive",
};

export const healthLabel: Record<Health, string> = {
  green: "En verde",
  amber: "En ámbar",
  red: "En rojo",
};

export const healthVariant: Record<Health, BadgeVariant> = {
  green: "success",
  amber: "warning",
  red: "destructive",
};

export const taskStatusLabel: Record<TaskStatus, string> = {
  todo: "Por hacer",
  doing: "En curso",
  blocked: "Bloqueada",
  done: "Hecha",
};

export const TASK_COLUMNS: TaskStatus[] = ["todo", "doing", "blocked", "done"];

export const sprintStatusLabel: Record<SprintStatus, string> = {
  planned: "Planeado",
  active: "Activo",
  done: "Cerrado",
};

export const sprintStatusVariant: Record<SprintStatus, BadgeVariant> = {
  planned: "secondary",
  active: "default",
  done: "success",
};

export const quarterStatusLabel: Record<QuarterStatus, string> = {
  planned: "Planeado",
  active: "Activo",
  done: "Cerrado",
};

export const quarterStatusVariant: Record<QuarterStatus, BadgeVariant> = {
  planned: "secondary",
  active: "default",
  done: "success",
};

/** Automations — event-driven triggers available in the rule builder (M3). */
export const triggerLabel: Record<string, string> = {
  "item.checked": "Al marcar un ítem",
  "checklist.completed": "Al completar un checklist",
  "area.completed": "Al completar un área",
  "area.added": "Al añadir un área",
  "project.created": "Al crear el proyecto",
  "project.statusChanged": "Al cambiar el estado del proyecto",
  "task.added": "Al crear una tarea",
  "task.statusChanged": "Al cambiar el estado de una tarea",
  "task.commented": "Al comentar una tarea",
  "task.archived": "Al archivar una tarea",
  "task.unarchived": "Al desarchivar una tarea",
  "date.due": "Al vencer una fecha (M4)",
  "date.approaching": "Fecha por vencer (M4)",
  "app.opened": "Al abrir la app (M4)",
  schedule: "Programado (M4)",
};

/** Eventos reales que el store emite (`diffProjectEvents`), usados para
 * elegir a qué eventos escuchar (webhooks salientes, flows con trigger "event"). */
export const EVENT_TRIGGERS = [
  "item.checked",
  "checklist.completed",
  "area.completed",
  "area.added",
  "project.created",
  "project.statusChanged",
  "task.added",
  "task.statusChanged",
  "task.commented",
  "task.archived",
  "task.unarchived",
] as const;

export const actionLabel: Record<string, string> = {
  setProjectStatus: "Cambiar estado del proyecto",
  markAreaComplete: "Marcar área como completa",
  createChecklistFromTemplate: "Crear checklist desde plantilla",
  createTask: "Crear tarea",
  createNotification: "Crear notificación",
  setField: "Establecer campo",
  recreateRecurringChecklist: "Recrear checklist recurrente",
};

export const conditionFieldLabel: Record<string, string> = {
  "project.status": "Estado del proyecto",
  "project.priority": "Prioridad del proyecto",
  "project.health": "Salud del proyecto",
  "project.progress": "Avance del proyecto (%)",
  "area.progress": "Avance del área (%)",
  "checklist.progress": "Avance del checklist (%)",
};

export const severityLabel: Record<string, string> = {
  info: "Información",
  warning: "Aviso",
  critical: "Crítico",
};

export const raciRoleLabel: Record<RaciRole, string> = {
  responsible: "Responsable (R)",
  accountable: "Encargado (A)",
  consulted: "Consultado (C)",
  informed: "Informado (I)",
};
