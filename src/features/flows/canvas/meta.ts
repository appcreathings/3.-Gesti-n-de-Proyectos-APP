import {
  Zap,
  Webhook as WebhookIcon,
  Mail,
  User,
  CheckSquare,
  Bell,
  FolderPlus,
  Flag,
  CheckCircle2,
  Pencil,
  type LucideIcon,
} from "lucide-react";
import type { Output } from "@/domain/schemas/flow";
import { triggerLabel, providerLabel } from "@/domain/labels";
import type {
  TriggerNodeData,
  ConditionNodeData,
  TransformNodeData,
  ActionNodeData,
} from "@/flows/graph";

export interface OutputTypeMeta {
  type: Output["type"];
  label: string;
  icon: LucideIcon;
  color: string;
}

/** Un output por tipo, en el orden en que aparecen en la paleta. Reemplaza al
 * `OUTPUT_TYPES` que vivía en el viejo `OutputStep.tsx` (retirado — el canvas
 * es ahora la única superficie de creación). */
export const OUTPUT_TYPES: OutputTypeMeta[] = [
  { type: "createTask", label: "Crear Tarea", icon: CheckSquare, color: "text-blue-500" },
  { type: "createProject", label: "Crear Proyecto", icon: FolderPlus, color: "text-indigo-500" },
  { type: "createPerson", label: "Crear Persona", icon: User, color: "text-green-500" },
  { type: "setProjectStatus", label: "Cambiar Estado Proyecto", icon: Flag, color: "text-purple-500" },
  { type: "markAreaComplete", label: "Completar Área", icon: CheckCircle2, color: "text-teal-500" },
  { type: "setField", label: "Cambiar Campo", icon: Pencil, color: "text-slate-500" },
  { type: "createNotification", label: "Crear Notificación", icon: Bell, color: "text-yellow-500" },
  { type: "webhook", label: "Webhook", icon: WebhookIcon, color: "text-orange-500" },
  { type: "email", label: "Email", icon: Mail, color: "text-red-500" },
];

export function outputMeta(type: Output["type"]): OutputTypeMeta {
  return OUTPUT_TYPES.find((o) => o.type === type) ?? OUTPUT_TYPES[0];
}

export function defaultOutputForType(type: Output["type"]): Output {
  switch (type) {
    case "createTask":
      return { type: "createTask", title: "", priority: "medium", projectRef: "explicit" };
    case "createProject":
      return { type: "createProject", name: "", fields: [] };
    case "createPerson":
      return { type: "createPerson", matchField: "email", ifNotFound: "create", data: {} };
    case "setProjectStatus":
      return { type: "setProjectStatus", status: "active" };
    case "markAreaComplete":
      return { type: "markAreaComplete" };
    case "createNotification":
      return { type: "createNotification", severity: "info", message: "" };
    case "webhook":
      // Los webhooks nuevos nacen en modo "Simple" (payload plano, sin firma,
      // spec 034 §A) — la config que "just works" con un Catch Hook de
      // Make/Zapier. Revierte el default "envelope" de spec 032: la fricción
      // del envelope + firma en el primer contacto supera su beneficio (que la
      // mayoría no configura). Firmar/envelope quedan como upgrade explícito en
      // el drawer. Retrocompat: los webhooks YA guardados conservan su
      // `payloadShape`/`secret` persistidos — el motor lee el valor del output,
      // no este default.
      return { type: "webhook", url: "", secret: "", payloadShape: "bare" };
    case "email":
      return { type: "email", connectionId: "", to: "", subject: "", body: "" };
    case "setField":
      return { type: "setField", field: "", value: "" };
  }
}

export function triggerSummary(data: TriggerNodeData): string {
  const t = data.trigger;
  if (t.type === "event") return triggerLabel[t.event] ?? t.event;
  const objectType = t.config.objectType ? ` · ${t.config.objectType}` : "";
  return `Polling ${providerLabel[t.provider]}${objectType}`;
}

/** Valor de una condición tal como se muestra en el resumen del nodo (spec
 * 038 §B2). Desde spec 037 el operador `in` guarda un **array**, así que un
 * `String(value)` plano dejaba `["won","closed"]` y el string legacy
 * `"won,closed"` con exactamente el mismo resumen (`won,closed`) — y son el
 * par que 037 enseñó a distinguir: el array se cumple, el string legacy no se
 * cumple nunca. El formato tiene que delatar cuál es cuál:
 *
 *  - array  → `[won, closed]`
 *  - string → `"won,closed"` (entrecomillado)
 *  - resto  → `String(value)` (números, booleanos, vacío) */
export function formatConditionValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => String(v)).join(", ")}]`;
  if (typeof value === "string") return `"${value}"`;
  return String(value ?? "");
}

export function conditionSummary(data: ConditionNodeData): string {
  const { field, op, value } = data.condition;
  if (!field) return "Condición sin configurar";
  return `${field} ${op} ${formatConditionValue(value)}`;
}

export function transformSummary(data: TransformNodeData): string {
  const parts: string[] = [];
  if (data.mapping.length > 0) parts.push(`${data.mapping.length} mapeo(s)`);
  if (data.transformCode) parts.push("código JS");
  return parts.length > 0 ? parts.join(" + ") : "Sin transformación — los datos pasan tal cual";
}

export function actionSummary(data: ActionNodeData): string {
  const meta = outputMeta(data.output.type);
  switch (data.output.type) {
    case "createTask":
      return data.output.title || "Sin título";
    case "createProject":
      return data.output.name || "Sin nombre";
    case "createNotification":
      return data.output.message || "Sin mensaje";
    case "setProjectStatus":
      return `Estado → ${data.output.status}`;
    case "webhook":
      return data.output.url || "Sin URL";
    case "email":
      return data.output.to || "Sin destinatario";
    default:
      return meta.label;
  }
}

export { Zap as TriggerIcon };
