import { z } from "zod";
import { Id, IsoDate, SCHEMA_VERSION, Severity } from "./common";
import { ConditionOp } from "./automation";

// ─── TRIGGER SCHEMAS ─────────────────────────────────────────────────────────

// Debe coincidir exactamente con `DomainEventType` (`src/automations/events.ts`
// → `diffProjectEvents`), que es lo único que realmente emite el store. No se
// importa desde aquí porque `domain/schemas` es la capa base y no depende de
// `src/automations`; si se agrega/renombra un DomainEvent, actualizar ambos.
// (Antes incluía "date.due"/"date.approaching"/"app.opened", que el store
// nunca emite — cualquier flow con esos triggers no se ejecutaba jamás.)
export const EventTriggerSchema = z.object({
  type: z.literal("event"),
  event: z.enum([
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
  ]),
});
export type EventTrigger = z.infer<typeof EventTriggerSchema>;

export const PollFilterSchema = z.object({
  field: z.string(),
  op: ConditionOp,
  value: z.unknown(),
});
export type PollFilter = z.infer<typeof PollFilterSchema>;

// Antes este trigger embebía `proxyUrl`+`encryptedToken` por flow (spec 018/019)
// — cada flow repetía sus propias credenciales, y el token nunca llegó a
// cifrarse de verdad en el camino de guardado (bug corregido en spec 020 §D).
// Ahora referencia una `IntegrationConnection` guardada una sola vez en
// Integraciones (`src/integrations/connections.ts`); el proxy/spreadsheet/token
// viven ahí, cifrados con el vault.
export const PollTriggerSchema = z.object({
  type: z.literal("poll"),
  provider: z.enum(["hubspot", "google-sheets"]),
  config: z.object({
    /** Puede quedar vacío ("sin conexión elegida aún") — típico en flujos
     * migrados de v7 (spec 020 §D) y en plantillas recién instanciadas
     * (spec 027 §C). `validateFlow` (spec 027 §A) lo reporta como error
     * accionable en vez de romper el parse del flujo entero. */
    connectionId: z.string(),
    /** Solo aplica cuando `provider === "hubspot"`. */
    objectType: z.enum(["contacts", "deals", "tickets"]).optional(),
    fields: z.array(z.string()).default([]),
    filters: z.array(PollFilterSchema).default([]),
    intervalMs: z.number().min(60_000).default(300_000),
  }),
});
export type PollTrigger = z.infer<typeof PollTriggerSchema>;

export const TriggerSchema = z.discriminatedUnion("type", [
  EventTriggerSchema,
  PollTriggerSchema,
]);
export type Trigger = z.infer<typeof TriggerSchema>;

// ─── LOGIC SCHEMAS ───────────────────────────────────────────────────────────

export const FlowConditionOp = ConditionOp;

export const FlowConditionSchema = z.object({
  field: z.string(),
  op: FlowConditionOp,
  value: z.unknown(),
});
export type FlowCondition = z.infer<typeof FlowConditionSchema>;

export const FieldMappingSchema = z.object({
  source: z.string(),
  target: z.string(),
  transform: z.string().optional(),
});
export type FieldMapping = z.infer<typeof FieldMappingSchema>;

export const LogicSchema = z.object({
  conditions: z.array(FlowConditionSchema).default([]),
  /** Cómo se combinan las condiciones (spec 027 §F): "all" = deben cumplirse
   * todas (AND, comportamiento histórico), "any" = alcanza con una (OR).
   * Opcional (ausente = "all") en vez de `.default()` para que los flujos
   * guardados antes del campo — y los literales existentes en tests — no
   * requieran tocarse: el motor normaliza `?? "all"`. Deliberadamente plano,
   * no árbol anidable (ver spec 027 Decisiones). */
  conditionMode: z.enum(["all", "any"]).optional(),
  mapping: z.array(FieldMappingSchema).default([]),
  transformCode: z.string().optional().refine(
    (code) => {
      if (!code) return true;
      try {
        new Function("record", code);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Código JavaScript inválido" }
  ),
});
export type Logic = z.infer<typeof LogicSchema>;

// ─── OUTPUT SCHEMAS ──────────────────────────────────────────────────────────

// `projectRef` decide cómo se resuelve el proyecto destino (spec 023 §D):
// "explicit" (default, compatible con flows existentes) usa `projectId` tal
// cual ya funcionaba; "trigger" usa el proyecto del evento/registro que
// disparó el flujo (`source.projectId` en el engine); "createdProject" usa
// el proyecto que un nodo `createProject` anterior acaba de crear en la
// misma corrida — antes no había forma de referenciarlo (ver
// `lastCreatedProjectId` en engine.ts).
export const CreateTaskProjectRef = z.enum(["explicit", "trigger", "createdProject"]);
export type CreateTaskProjectRefValue = z.infer<typeof CreateTaskProjectRef>;

export const CreateTaskOutputSchema = z.object({
  type: z.literal("createTask"),
  title: z.string(),
  projectId: z.string().optional(),
  projectRef: CreateTaskProjectRef.default("explicit"),
  areaId: z.string().optional(),
  priority: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
  estimate: z.number().optional(),
  summary: z.string().optional(),
  /** Plantilla interpolada (ej. `{{id}}`) que identifica el registro de
   * origen — si ya existe una tarea con este `dedupeKey` en el proyecto
   * destino, se omite la creación en vez de duplicar (spec 023 §E). Vacío/
   * ausente: sin deduplicación, comportamiento previo (crea siempre). */
  dedupeKey: z.string().optional(),
});
export type CreateTaskOutput = z.infer<typeof CreateTaskOutputSchema>;

// Instancia un proyecto nuevo desde el registro (evento interno o registro
// externo, ej. un deal de HubSpot). Si `projectTypeId` está presente, se
// instancia con `instantiateProjectFromType` (áreas/checklists/procesos de la
// plantilla); si no, un proyecto en blanco.
export const CreateProjectOutputSchema = z.object({
  type: z.literal("createProject"),
  projectTypeId: z.string().optional(),
  /** Plantilla de nombre, admite tokens `{{campo}}` interpolados desde el registro. */
  name: z.string().min(1),
  productId: z.string().optional(),
  fields: z.array(FieldMappingSchema).default([]),
  /** Igual que en `CreateTaskOutputSchema`: si ya existe un proyecto con este
   * `dedupeKey` (interpolado), se omite la creación (spec 023 §E). */
  dedupeKey: z.string().optional(),
});
export type CreateProjectOutput = z.infer<typeof CreateProjectOutputSchema>;

export const CreatePersonOutputSchema = z.object({
  type: z.literal("createPerson"),
  matchField: z.enum(["email", "name", "id"]).default("email"),
  ifNotFound: z.enum(["create", "skip", "update"]).default("create"),
  data: z.record(z.string()),
  /** Template opcional (ej. `{{properties.email}}`) para cuando la clave del
   * registro no coincide con `matchField` — por ejemplo, un registro de
   * HubSpot anida el email en `properties.email` en vez de `email` top-level
   * (spec 026 §B4). Si se omite, el match sigue resolviendo `matchField`
   * directamente contra el registro (comportamiento previo). */
  matchSource: z.string().optional(),
});
export type CreatePersonOutput = z.infer<typeof CreatePersonOutputSchema>;

export const SetProjectStatusOutputSchema = z.object({
  type: z.literal("setProjectStatus"),
  status: z.string(),
  /** Proyecto explícito a modificar. Si se omite, se usa el proyecto del evento disparador. */
  projectId: z.string().optional(),
});
export type SetProjectStatusOutput = z.infer<typeof SetProjectStatusOutputSchema>;

export const SetFieldOutputSchema = z.object({
  type: z.literal("setField"),
  field: z.string(),
  value: z.unknown(),
  /** Proyecto explícito a modificar. Si se omite, se usa el proyecto del evento disparador. */
  projectId: z.string().optional(),
});
export type SetFieldOutput = z.infer<typeof SetFieldOutputSchema>;

export const CreateNotificationOutputSchema = z.object({
  type: z.literal("createNotification"),
  severity: Severity,
  message: z.string(),
});
export type CreateNotificationOutput = z.infer<typeof CreateNotificationOutputSchema>;

export const MarkAreaCompleteOutputSchema = z.object({
  type: z.literal("markAreaComplete"),
  /** Proyecto/área explícitos. Si se omiten, se usan los del evento disparador. */
  projectId: z.string().optional(),
  areaId: z.string().optional(),
});
export type MarkAreaCompleteOutput = z.infer<typeof MarkAreaCompleteOutputSchema>;

/** Política de reintentos de un output de red (spec 027 §E). Solo aplica a
 * webhook/email y solo ante fallos transitorios (error de red / HTTP ≥ 500,
 * nunca 4xx) — los outputs internos (createTask, etc.) no fallan por
 * transitorios y reintentarlos arriesga duplicar efectos. Ausente = sin
 * reintentos (comportamiento previo). */
export const RetryPolicySchema = z.object({
  attempts: z.number().min(0).max(5),
  backoff: z.enum(["fixed", "exponential"]),
});
export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

export const WebhookOutputSchema = z.object({
  type: z.literal("webhook"),
  /** String libre (antes `.url()`): una URL vacía/no parseable ya no rompe
   * el parse — la reporta `validateFlow` (spec 027 §A) como error clicable,
   * y las plantillas (spec 027 §C) pueden instanciarse con `url: ""`. */
  url: z.string(),
  secret: z.string(),
  payload: z.record(z.unknown()).optional(),
  retry: RetryPolicySchema.optional(),
});
export type WebhookOutput = z.infer<typeof WebhookOutputSchema>;

// Antes embebía `proxyUrl` por flow (cada flow repetía el mismo proxy de
// email); ahora referencia una `IntegrationConnection` de tipo "email"
// guardada una sola vez en Integraciones.
export const EmailOutputSchema = z.object({
  type: z.literal("email"),
  /** Puede quedar vacío (flujos migrados de v7, plantillas de spec 027 §C)
   * — `validateFlow` lo reporta como error en vez de romper el parse. */
  connectionId: z.string(),
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  retry: RetryPolicySchema.optional(),
});
export type EmailOutput = z.infer<typeof EmailOutputSchema>;

export const OutputSchema = z.discriminatedUnion("type", [
  CreateTaskOutputSchema,
  CreateProjectOutputSchema,
  CreatePersonOutputSchema,
  SetProjectStatusOutputSchema,
  SetFieldOutputSchema,
  CreateNotificationOutputSchema,
  MarkAreaCompleteOutputSchema,
  WebhookOutputSchema,
  EmailOutputSchema,
]);
export type Output = z.infer<typeof OutputSchema>;

// ─── GRAPH SCHEMA (canvas React Flow) ────────────────────────────────────────

// Representación puramente visual (posiciones, tipo de nodo, conexiones) del
// canvas de construcción. El engine nunca la lee — la verdad de ejecución
// sigue siendo `trigger`/`logic`/`outputs`. `graph` es opcional: los flows
// creados antes del canvas (o migrados) no lo tienen, y `buildGraphFromRule`
// (`src/flows/graph.ts`) genera uno por defecto la primera vez que se abren
// en el builder.
export const FlowGraphNodeSchema = z.object({ id: z.string() }).passthrough();
export const FlowGraphEdgeSchema = z
  .object({ id: z.string(), source: z.string(), target: z.string() })
  .passthrough();
export const FlowGraphSchema = z.object({
  nodes: z.array(FlowGraphNodeSchema),
  edges: z.array(FlowGraphEdgeSchema),
});
export type FlowGraph = z.infer<typeof FlowGraphSchema>;

// ─── FLOW RULE SCHEMA ────────────────────────────────────────────────────────

export const FlowRuleSchema = z.object({
  id: Id,
  schemaVersion: z.number().default(SCHEMA_VERSION),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  /** Etiquetas libres para organizar la lista de flujos (spec 027 §D):
   * chips clicables que filtran. Opcional (ausente = sin etiquetas) para no
   * exigir el campo en flujos guardados antes del bump 13→14. */
  tags: z.array(z.string()).optional(),
  /** Qué pasa con las acciones restantes cuando una falla (spec 027 §E):
   * "continue" (default histórico) sigue con las demás; "stop" las marca
   * `skipped` sin ejecutarlas. Opcional: ausente = "continue". */
  onErrorPolicy: z.enum(["continue", "stop"]).optional(),
  trigger: TriggerSchema,
  logic: LogicSchema.default({ conditions: [], mapping: [] }),
  outputs: z.array(OutputSchema).default([]),
  graph: FlowGraphSchema.optional(),
  /** Si una corrida automática (poll o evento) de este flujo termina en
   * "error"/"partial" mientras está activo, se emite una notificación (spec
   * 024 §F3) — reusa el módulo de Notificaciones existente en vez de
   * inventar un canal nuevo. Default `true`: hasta ahora un flujo activo
   * podía fallar en silencio, así que avisar es el comportamiento esperado
   * salvo que el usuario lo apague explícitamente. No aplica a "Ejecutar
   * ahora" (es una prueba manual que el usuario ya está viendo en pantalla). */
  notifyOnFailure: z.boolean().default(true),
  /** Hasta 3 registros reales de la última "Probar conexión" exitosa del
   * trigger (spec 025 §A). Se limpia al cambiar la conexión o el provider.
   * Alimenta el selector de variables de condiciones/transformación/acciones
   * al reabrir el editor sin tener que re-probar la conexión — la muestra
   * efímera en `useState` del `FlowCanvas` solo vivía la sesión. No la lee
   * el motor de ejecución; es solo referencia para autocompletar y validar
   * `{{campo}}` huérfanos. Cap pequeño (3) para no inflar `flows.json` en
   * una app local-first mono-usuario. */
  lastSample: z.array(z.record(z.unknown())).max(3).optional(),
  /** Timestamp ISO de cuándo se tomó `lastSample` — alimenta el badge
   * "Muestra: N reg · HH:mm" del `TriggerStep` (spec 025 §A). Se limpia
   * junto con `lastSample` al cambiar la conexión. */
  lastSampleAt: IsoDate.optional(),
  lastRunAt: IsoDate.nullable().default(null),
  runCount: z.number().default(0),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type FlowRule = z.infer<typeof FlowRuleSchema>;
