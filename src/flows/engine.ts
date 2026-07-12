import { nowIso, uuid } from "@/lib/utils";
import { newTask, newPerson, newProject } from "@/domain/factories";
import { instantiateProjectFromType } from "@/domain/instantiate";
import * as ops from "@/domain/projectOps";
import type {
  ChecklistTemplate,
  Notification,
  Project,
  ProjectType,
  ProcessTemplate,
  Person,
  Task,
} from "@/domain/schemas";
import type {
  FlowRule,
  Trigger,
  PollTrigger,
  Output,
  FlowCondition,
  FieldMapping,
  CreateTaskOutput,
} from "@/domain/schemas/flow";
import type { DomainEvent } from "@/automations/events";
import { sendEmailViaAppsScript } from "@/integrations/outbound/email-via-apps-script";
import { signPayload } from "@/integrations/outbound/signing";

// ─── ENGINE INPUT/OUTPUT ─────────────────────────────────────────────────────

export interface FlowEngineInput {
  flows: FlowRule[];
  events: DomainEvent[];
  projects: Project[];
  people: Person[];
  checklistTemplates: ChecklistTemplate[];
  /** Requerido por el output `createProject` cuando referencia `projectTypeId`. */
  projectTypes: ProjectType[];
  processTemplates: ProcessTemplate[];
  externalData?: Map<string, Record<string, unknown>[]>;
  /** Si es true, acumula una traza paso a paso por flow que sí matcheó su
   * trigger (condiciones con veredicto, mapeo, transform, y el desenlace de
   * cada output) en `result.traces`, para historial depurable (spec 023
   * §F). Cuesta poco (recortado a `MAX_TRACE_RECORDS` registros por flow) —
   * opt-in de todos modos para no cambiar el shape de `result` en llamadas
   * que no la necesitan. */
  trace?: boolean;
}

export interface FlowExecutionError {
  flowId: string;
  flowName: string;
  stage: "transform" | "output";
  message: string;
}

/** Cuántos registros por flow se guardan en la traza — suficiente para
 * depurar sin inflar el historial persistido (spec 023 §F). */
const MAX_TRACE_RECORDS = 5;

export interface FlowRunConditionTrace {
  field: string;
  op: string;
  expected: unknown;
  actual: unknown;
  passed: boolean;
}

export interface FlowRunOutputTrace {
  type: Output["type"];
  outcome: "executed" | "skipped" | "error";
  /** Presente cuando `outcome` es "skipped"/"error", o cuando "executed"
   * tuvo un detalle relevante (ej. un webhook que se registró pero cuyo
   * envío de red falló). */
  reason?: string;
  mutatedProjectIds: string[];
}

export interface FlowRunRecordTrace {
  record: Record<string, unknown>;
  conditions: FlowRunConditionTrace[];
  conditionsPassed: boolean;
  mapped?: Record<string, unknown>;
  transform?: { input: Record<string, unknown>; output?: Record<string, unknown>; error?: string };
  outputs: FlowRunOutputTrace[];
}

export interface FlowRunTrace {
  triggerMatched: true;
  recordCount: number;
  /** Recortado a `MAX_TRACE_RECORDS` — el resto de los registros se procesó
   * igual, solo no queda traza individual de ellos. */
  records: FlowRunRecordTrace[];
}

export interface FlowEngineResult {
  changedProjects: Project[];
  /** Proyectos nuevos creados por outputs `createProject` (spec 020). A
   * diferencia de `changedProjects`, el caller debe persistirlos vía
   * `useDataStore.createProject()` (dispara `project.created` + webhooks),
   * no `saveProject()`. */
  newProjects: Project[];
  newPeople: Person[];
  updatedPeople: Person[];
  notifications: Notification[];
  outboundDeliveries: OutboundDelivery[];
  emailDeliveries: EmailDelivery[];
  /** Ids de flows que efectivamente ejecutaron al menos un output (para runCount). */
  executedFlowIds: string[];
  /** Errores de transformación/ejecución, para diagnóstico y auditoría. */
  errors: FlowExecutionError[];
  /** Traza por flow (solo los que matchearon su trigger), poblada solo si
   * `input.trace` fue true — objeto vacío en caso contrario. */
  traces: Record<string, FlowRunTrace>;
}

export interface OutboundDelivery {
  url: string;
  secret: string;
  payload: Record<string, unknown>;
}

export interface EmailDelivery {
  proxyUrl: string;
  to: string;
  subject: string;
  body: string;
}

/**
 * De dónde vino el registro que dispara el flow (evento interno o registro
 * externo de polling). Se usa para targetear proyecto/área/tarea de forma
 * confiable, independientemente de cómo el usuario reconfigure el mapeo de
 * campos para interpolar los outputs.
 */
interface RecordSource {
  projectId?: string;
  areaId?: string;
  taskId?: string;
}

/** Estado mutable compartido entre los outputs de un mismo registro — hoy
 * solo rastrea el último proyecto creado por un `createProject`, para que un
 * `createTask` posterior en la misma corrida pueda referenciarlo
 * (`projectRef: "createdProject"`, spec 023 §D). Se reinicia por registro. */
interface RunContext {
  lastCreatedProjectId: string | null;
}

// ─── MAIN ENGINE ─────────────────────────────────────────────────────────────

export async function runFlowEngine(input: FlowEngineInput): Promise<FlowEngineResult> {
  const result: FlowEngineResult = {
    changedProjects: [],
    newProjects: [],
    newPeople: [],
    updatedPeople: [],
    notifications: [],
    outboundDeliveries: [],
    emailDeliveries: [],
    executedFlowIds: [],
    errors: [],
    traces: {},
  };

  const enabled = input.flows.filter((f) => f.enabled);
  const projectMap = new Map(input.projects.map((p) => [p.id, p]));
  const changedProjectIds = new Set<string>();
  const executedFlowIds = new Set<string>();

  for (const flow of enabled) {
    // 1. ¿Este flow debe ejecutarse ahora?
    if (!matchesTrigger(flow.trigger, input.events, input.externalData)) continue;

    // 2. Obtener datos de entrada (junto con su procedencia, para targeting)
    const { records, sources } = resolveTriggerData(flow.trigger, input.events, input.externalData);
    if (records.length === 0) continue;

    const flowTrace: FlowRunTrace | undefined = input.trace
      ? { triggerMatched: true, recordCount: records.length, records: [] }
      : undefined;

    // 3. Para cada registro, aplicar lógica y outputs
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const source = sources[i];

      // 3a. Filtrar por condiciones (sobre el registro original, sin mapear)
      const { passed: conditionsPassed, details: conditionDetails } = evaluateConditionsDetailed(
        flow.logic.conditions,
        record
      );

      const recordTrace: FlowRunRecordTrace | undefined =
        flowTrace && flowTrace.records.length < MAX_TRACE_RECORDS
          ? { record, conditions: conditionDetails, conditionsPassed, outputs: [] }
          : undefined;
      if (recordTrace) flowTrace!.records.push(recordTrace);

      if (!conditionsPassed) continue;

      // 3b. Mapear campos
      const mapped = applyMapping(flow.logic.mapping, record);
      // Clonado antes de pasar `mapped` al transform: `transformCode` recibe
      // este mismo objeto como `record` y suele mutarlo in-place (patrón
      // común, ej. `record.name = record.name.toUpperCase(); return record;`
      // — el propio placeholder de la UI lo sugiere), así que sin clonar la
      // traza de "input" quedaría idéntica a "output" (mismo objeto mutado).
      const mappedSnapshot = recordTrace ? structuredClone(mapped) : undefined;
      if (recordTrace) recordTrace.mapped = mappedSnapshot;

      // 3c. Transformar con código (si existe)
      let transformed: Record<string, unknown> = mapped;
      if (flow.logic.transformCode) {
        const transformResult = executeTransform(flow.logic.transformCode, mapped);
        if (!transformResult.ok) {
          result.errors.push({
            flowId: flow.id,
            flowName: flow.name,
            stage: "transform",
            message: transformResult.error,
          });
          if (recordTrace) recordTrace.transform = { input: mappedSnapshot!, error: transformResult.error };
          continue;
        }
        transformed = transformResult.data;
        if (recordTrace) {
          recordTrace.transform = { input: mappedSnapshot!, output: structuredClone(transformResult.data) };
        }
      }

      // 3d. Ejecutar cada output. `runContext` se reinicia por registro: el
      // proyecto "recién creado" que un `createTask` puede referenciar
      // (`projectRef: "createdProject"`) es el de este mismo registro, no el
      // de un registro anterior en el mismo poll (spec 023 §D).
      const runContext: RunContext = { lastCreatedProjectId: null };
      for (const output of flow.outputs) {
        try {
          const outputResult = await executeOutput(
            output,
            transformed,
            source,
            flow,
            projectMap,
            input.people,
            input.projectTypes,
            input.processTemplates,
            input.checklistTemplates,
            result,
            runContext
          );
          for (const id of outputResult.mutatedProjectIds) changedProjectIds.add(id);
          executedFlowIds.add(flow.id);
          recordTrace?.outputs.push({
            type: output.type,
            outcome: outputResult.outcome,
            reason: outputResult.reason,
            mutatedProjectIds: outputResult.mutatedProjectIds,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          result.errors.push({
            flowId: flow.id,
            flowName: flow.name,
            stage: "output",
            message,
          });
          recordTrace?.outputs.push({ type: output.type, outcome: "error", reason: message, mutatedProjectIds: [] });
        }
      }
    }

    if (flowTrace) result.traces[flow.id] = flowTrace;
  }

  // Un proyecto creado en esta misma corrida (`createProject`) puede haber
  // sido mutado después por un `createTask` con `projectRef: "createdProject"`
  // (spec 023 §D) — su id termina también en `changedProjectIds` porque
  // `createTask` no distingue "nuevo" de "existente" al reportar qué mutó.
  // Sin este filtro, `applyFlowResult` (`useDataStore.ts`) persistiría el
  // proyecto dos veces: primero la versión con la tarea vía
  // `changedProjects`/`persistProject`, y después `newProjects`/
  // `createProject` la pisaría con la versión sin tarea capturada al crearlo
  // — la tarea se perdería en silencio. Se excluye de `changedProjects` y en
  // cambio se refresca la entrada de `newProjects` con la versión final.
  const newProjectIds = new Set(result.newProjects.map((p) => p.id));
  result.newProjects = result.newProjects.map((p) => projectMap.get(p.id) ?? p);

  // Collect only the projects actually mutated by some output (excluding
  // brand-new ones, already covered by `newProjects` above)
  result.changedProjects = Array.from(changedProjectIds)
    .filter((id) => !newProjectIds.has(id))
    .map((id) => projectMap.get(id))
    .filter((p): p is Project => p !== undefined);
  result.executedFlowIds = Array.from(executedFlowIds);

  return result;
}

// ─── TRIGGER EVALUATION ──────────────────────────────────────────────────────

/** Key bajo la que `externalData` indexa los registros de un poll trigger.
 * Debe coincidir exactamente con la key que registra el poller
 * (`hubspot-polling-manager.ts`/`sheets-polling-manager.ts`). Exportada para
 * que `manual-run.ts` (spec 022 §B, "Ejecutar ahora") construya el mismo
 * `externalData` sin duplicar esta lógica.
 *
 * Incluye `connectionId` (spec 024 §F10) — antes la key era solo
 * `provider`/`provider-objectType` (ej. "hubspot", "hubspot-deals"), así que
 * dos flujos con el mismo provider+objectType pero **conexiones distintas**
 * colisionaban: `pollingManager.register` desregistraba el timer del primero
 * al registrar el segundo (bug de correctitud, no solo de límites de tasa —
 * el primer flujo dejaba de correr en silencio), y aunque ambos hubieran
 * sobrevivido, `runPolledFlow` los habría alimentado con los registros de la
 * conexión equivocada, porque el despacho también usa esta misma key. */
export function pollTriggerKey(trigger: PollTrigger): string {
  if (trigger.provider === "google-sheets") return `google-sheets:${trigger.config.connectionId}`;
  const objectType = trigger.config.objectType ?? "contacts";
  return `hubspot:${trigger.config.connectionId}:${objectType}`;
}

function matchesTrigger(
  trigger: Trigger,
  events: DomainEvent[],
  externalData?: Map<string, Record<string, unknown>[]>
): boolean {
  switch (trigger.type) {
    case "event":
      return events.some((e) => e.type === trigger.event);
    case "poll":
      return externalData?.has(pollTriggerKey(trigger)) ?? false;
  }
}

function resolveTriggerData(
  trigger: Trigger,
  events: DomainEvent[],
  externalData?: Map<string, Record<string, unknown>[]>
): { records: Record<string, unknown>[]; sources: RecordSource[] } {
  switch (trigger.type) {
    case "event": {
      const matching = events.filter((e) => e.type === trigger.event);
      return {
        records: matching.map((e) => e as unknown as Record<string, unknown>),
        sources: matching.map((e) => eventToSource(e)),
      };
    }
    case "poll": {
      const records = externalData?.get(pollTriggerKey(trigger)) ?? [];
      // Los registros externos (HubSpot, etc.) no tienen proyecto/área propios:
      // cualquier output que mute un proyecto debe targetearlo explícitamente.
      return { records, sources: records.map(() => ({})) };
    }
  }
}

/** Extrae projectId/areaId/taskId de un DomainEvent, si los tiene. */
function eventToSource(event: DomainEvent): RecordSource {
  const e = event as unknown as Record<string, unknown>;
  return {
    projectId: typeof e.projectId === "string" ? e.projectId : undefined,
    areaId: typeof e.areaId === "string" ? e.areaId : undefined,
    taskId: typeof e.taskId === "string" ? e.taskId : undefined,
  };
}

// ─── LOGIC EVALUATION ────────────────────────────────────────────────────────

/** Evalúa condiciones y devuelve, además del veredicto global, el detalle
 * por condición (operandos evaluados + si pasó) — usado para armar la traza
 * de depuración (spec 023 §F). Sin condiciones configuradas, siempre pasa
 * (comportamiento previo, sin condiciones que reportar). */
function evaluateConditionsDetailed(
  conditions: FlowCondition[],
  record: Record<string, unknown>
): { passed: boolean; details: FlowRunConditionTrace[] } {
  const details = conditions.map((c) => ({
    field: c.field,
    op: c.op,
    expected: c.value,
    actual: getNestedValue(record, c.field),
    passed: evaluateCondition(c, record),
  }));
  return { passed: details.every((d) => d.passed), details };
}

/** Coerciona a número comparable cuando el valor ya es un número, o es un
 * string que representa uno sin ambigüedad (spec 024 §F6 — fix). HubSpot (y
 * fuentes externas en general) suele devolver campos numéricos como string
 * (ej. `amount: "5000"`), así que antes `>`/`>=`/`<`/`<=` exigían
 * `typeof === "number"` en ambos lados y una condición como "monto > 1000"
 * nunca pasaba contra un registro real de HubSpot — fallaba en silencio, sin
 * error visible para el usuario. `""`/espacios en blanco se rechazan
 * explícitamente porque `Number("")` es `0`, no "no numérico". */
function toComparableNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function evaluateCondition(
  condition: FlowCondition,
  record: Record<string, unknown>
): boolean {
  const value = getNestedValue(record, condition.field);
  const target = condition.value;

  switch (condition.op) {
    case "==":
      return value === target;
    case "!=":
      return value !== target;
    case ">":
    case ">=":
    case "<":
    case "<=": {
      const a = toComparableNumber(value);
      const b = toComparableNumber(target);
      if (a === null || b === null) return false;
      if (condition.op === ">") return a > b;
      if (condition.op === ">=") return a >= b;
      if (condition.op === "<") return a < b;
      return a <= b;
    }
    case "in":
      return Array.isArray(target) && target.includes(value);
    case "contains":
      return typeof value === "string" && typeof target === "string" && value.includes(target);
    default:
      return false;
  }
}

function applyMapping(
  mapping: FieldMapping[],
  record: Record<string, unknown>
): Record<string, unknown> {
  // Sin mapeo configurado: los datos pasan sin transformar (así lo anuncia la
  // UI en TransformConfigFields). Antes esto producía `{}` y descartaba todo el registro.
  if (mapping.length === 0) {
    return { ...record };
  }
  const result: Record<string, unknown> = {};
  for (const m of mapping) {
    const value = getNestedValue(record, m.source);
    result[m.target] = value;
  }
  return result;
}

type TransformResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; error: string };

function executeTransform(code: string, record: Record<string, unknown>): TransformResult {
  try {
    // Ejecución tipo "macro" local (sin sandbox); ya validado sintácticamente
    // por el schema (`LogicSchema.transformCode`).
    const fn = new Function("record", code);
    const output = fn(record);
    if (output && typeof output === "object") {
      return { ok: true, data: output as Record<string, unknown> };
    }
    return { ok: false, error: "El código de transformación no devolvió un objeto." };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ─── TARGETING HELPERS ───────────────────────────────────────────────────────

/** Resuelve el proyecto a modificar: preferencia explícita del output, si no
 * el proyecto de origen del evento/registro. Nunca cae en "el primero". */
function resolveTargetProjectId(
  outputProjectId: string | undefined,
  source: RecordSource,
  projectMap: Map<string, Project>
): string | undefined {
  const candidate = outputProjectId || source.projectId;
  return candidate && projectMap.has(candidate) ? candidate : undefined;
}

/** Igual que `resolveTargetProjectId`, pero para `createTask` según su
 * `projectRef` (spec 023 §D): "explicit" preserva el comportamiento previo
 * (`projectId`, con fallback al proyecto del evento disparador); "trigger"
 * fuerza el proyecto del evento/registro disparador aunque `projectId` esté
 * seteado; "createdProject" usa el proyecto creado por un `createProject`
 * anterior en la misma corrida de este registro. */
function resolveCreateTaskProjectId(
  output: CreateTaskOutput,
  source: RecordSource,
  projectMap: Map<string, Project>,
  runContext: RunContext
): string | undefined {
  switch (output.projectRef) {
    case "createdProject": {
      const id = runContext.lastCreatedProjectId;
      return id && projectMap.has(id) ? id : undefined;
    }
    case "trigger":
      return source.projectId && projectMap.has(source.projectId) ? source.projectId : undefined;
    case "explicit":
    default:
      return resolveTargetProjectId(output.projectId, source, projectMap);
  }
}

/** Busca, entre todos los proyectos ya conocidos por el engine (existentes +
 * creados en esta misma corrida), uno con el `dedupeKey` dado — usado para
 * omitir un `createProject` repetido del mismo registro externo (spec 023
 * §E). Búsqueda O(n): aceptable para una app mono-usuario. */
function findProjectByDedupeKey(projectMap: Map<string, Project>, key: string): Project | undefined {
  for (const project of projectMap.values()) {
    if (project.dedupeKey === key) return project;
  }
  return undefined;
}

/** Igual que `findProjectByDedupeKey`, pero busca una tarea con ese
 * `dedupeKey` dentro de cualquier proyecto — un dedupeKey de tarea (ej. el id
 * de un deal de HubSpot) identifica al registro de origen sin importar en
 * qué proyecto terminó cayendo. */
function findTaskByDedupeKey(projectMap: Map<string, Project>, key: string): Task | undefined {
  for (const project of projectMap.values()) {
    const task = project.tasks.find((t) => t.dedupeKey === key);
    if (task) return task;
  }
  return undefined;
}

function buildNotificationEntityRef(
  projectId: string | undefined,
  source: RecordSource
): Notification["entityRef"] {
  if (!projectId) return null;
  if (source.taskId) return { kind: "task", projectId, taskId: source.taskId };
  if (source.areaId) return { kind: "area", projectId, areaId: source.areaId };
  return { kind: "project", projectId };
}

// ─── OUTPUT EXECUTION ────────────────────────────────────────────────────────

/** Resultado de ejecutar un output. `mutatedProjectIds` alimenta
 * `changedProjectIds` en `runFlowEngine` (comportamiento previo); `outcome`/
 * `reason` alimentan la traza de depuración del historial (spec 023 §F) sin
 * cambiar el comportamiento observable — los `console.warn` existentes se
 * conservan intactos. */
interface OutputExecutionOutcome {
  mutatedProjectIds: string[];
  outcome: "executed" | "skipped";
  reason?: string;
}

/** Ejecuta un output. */
async function executeOutput(
  output: Output,
  data: Record<string, unknown>,
  source: RecordSource,
  flow: FlowRule,
  projectMap: Map<string, Project>,
  people: Person[],
  projectTypes: ProjectType[],
  processTemplates: ProcessTemplate[],
  checklistTemplates: ChecklistTemplate[],
  result: FlowEngineResult,
  runContext: RunContext
): Promise<OutputExecutionOutcome> {
  switch (output.type) {
    case "createProject": {
      const dedupeKey = output.dedupeKey ? interpolateString(output.dedupeKey, data) : undefined;
      if (dedupeKey) {
        const existing = findProjectByDedupeKey(projectMap, dedupeKey);
        if (existing) {
          const reason = `Ya existe un proyecto con dedupeKey "${dedupeKey}".`;
          console.warn(`[FlowEngine] "${flow.name}": createProject omitido — ${reason}`);
          // Se registra igual como "el proyecto de este registro" para que un
          // createTask con projectRef:"createdProject" siga funcionando
          // aunque la creación se haya omitido por dedup (spec 023 §E).
          runContext.lastCreatedProjectId = existing.id;
          return { mutatedProjectIds: [], outcome: "skipped", reason };
        }
      }

      const name = interpolateString(output.name, data);
      const productId = output.productId ?? null;
      const type = output.projectTypeId
        ? projectTypes.find((t) => t.id === output.projectTypeId)
        : undefined;
      if (output.projectTypeId && !type) {
        console.warn(
          `[FlowEngine] "${flow.name}": tipo de proyecto "${output.projectTypeId}" no encontrado; se crea un proyecto en blanco.`
        );
      }
      const project = type
        ? instantiateProjectFromType(type, name, productId, checklistTemplates, processTemplates)
        : newProject(name, productId);

      for (const mapping of output.fields) {
        const value = getNestedValue(data, mapping.source);
        if (value !== undefined) {
          (project as unknown as Record<string, unknown>)[mapping.target] = value;
        }
      }
      if (dedupeKey) project.dedupeKey = dedupeKey;
      project.updatedAt = nowIso();

      result.newProjects.push(project);
      // Se registra también en el mapa por si un output posterior del mismo
      // flow lo referencia explícitamente por id, y en `runContext` para que
      // un `createTask` con `projectRef: "createdProject"` lo encuentre sin
      // conocer su id de antemano (spec 023 §D).
      projectMap.set(project.id, project);
      runContext.lastCreatedProjectId = project.id;
      return { mutatedProjectIds: [], outcome: "executed" };
    }

    case "createTask": {
      const dedupeKey = output.dedupeKey ? interpolateString(output.dedupeKey, data) : undefined;
      if (dedupeKey && findTaskByDedupeKey(projectMap, dedupeKey)) {
        const reason = `Ya existe una tarea con dedupeKey "${dedupeKey}".`;
        console.warn(`[FlowEngine] "${flow.name}": createTask omitido — ${reason}`);
        return { mutatedProjectIds: [], outcome: "skipped", reason };
      }

      const projectId = resolveCreateTaskProjectId(output, source, projectMap, runContext);
      if (!projectId) {
        const reason = "No se pudo resolver el proyecto destino.";
        console.warn(`[FlowEngine] "${flow.name}": ${reason} (createTask)`);
        return { mutatedProjectIds: [], outcome: "skipped", reason };
      }
      const project = projectMap.get(projectId)!;
      const areaId = output.areaId ?? source.areaId ?? null;
      const task = newTask(interpolateString(output.title, data), areaId);
      if (output.priority) task.priority = output.priority as Task["priority"];
      if (output.description) task.description = interpolateString(output.description, data);
      if (output.status) task.status = output.status as Task["status"];
      if (output.assigneeId) task.assigneeId = interpolateString(output.assigneeId, data);
      if (output.dueDate) task.dueDate = interpolateString(output.dueDate, data);
      if (output.tags) task.tags = output.tags.map((tag) => interpolateString(tag, data));
      if (output.estimate !== undefined) task.estimate = output.estimate;
      if (output.summary) task.summary = interpolateString(output.summary, data);
      if (dedupeKey) task.dedupeKey = dedupeKey;

      const updated = ops.addTask(project, task);
      projectMap.set(projectId, updated);
      return { mutatedProjectIds: [projectId], outcome: "executed" };
    }

    case "createPerson": {
      const matchField = output.matchField;
      const matchValue = data[matchField] as string;
      const existing = people.find((p) => p[matchField] === matchValue);

      if (existing) {
        if (output.ifNotFound === "update" || output.ifNotFound === "create") {
          const updated = { ...existing };
          for (const [key, value] of Object.entries(output.data)) {
            (updated as Record<string, unknown>)[key] = interpolateString(value, data);
          }
          updated.updatedAt = nowIso();
          result.updatedPeople.push(updated);
          return { mutatedProjectIds: [], outcome: "executed" };
        }
        return {
          mutatedProjectIds: [],
          outcome: "skipped",
          reason: "Ya existe una persona con ese campo de match (ifNotFound: skip).",
        };
      }
      if (output.ifNotFound === "create") {
        const personData: Record<string, string> = {};
        for (const [key, value] of Object.entries(output.data)) {
          personData[key] = interpolateString(value, data);
        }
        // Si el output no define mapeo explícito para un campo, usar el valor
        // ya presente en el registro transformado (útil para polling directo).
        const fallbackName =
          typeof data.name === "string"
            ? data.name
            : typeof data.email === "string"
              ? data.email
              : "Sin nombre";
        const person = newPerson(personData.name || fallbackName);
        person.email = personData.email || (typeof data.email === "string" ? data.email : "");
        person.roleTitle =
          personData.roleTitle || (typeof data.roleTitle === "string" ? data.roleTitle : "");
        result.newPeople.push(person);
        return { mutatedProjectIds: [], outcome: "executed" };
      }
      return {
        mutatedProjectIds: [],
        outcome: "skipped",
        reason: "No existe una persona con ese campo de match (ifNotFound no es 'create').",
      };
    }

    case "setProjectStatus": {
      const projectId = resolveTargetProjectId(output.projectId, source, projectMap);
      if (!projectId) {
        const reason = "No se pudo resolver el proyecto destino.";
        console.warn(`[FlowEngine] "${flow.name}": ${reason} (setProjectStatus)`);
        return { mutatedProjectIds: [], outcome: "skipped", reason };
      }
      const project = projectMap.get(projectId)!;
      const updated = { ...project, status: output.status as Project["status"], updatedAt: nowIso() };
      projectMap.set(projectId, updated);
      return { mutatedProjectIds: [projectId], outcome: "executed" };
    }

    case "setField": {
      const projectId = resolveTargetProjectId(output.projectId, source, projectMap);
      if (!projectId) {
        const reason = "No se pudo resolver el proyecto destino.";
        console.warn(`[FlowEngine] "${flow.name}": ${reason} (setField)`);
        return { mutatedProjectIds: [], outcome: "skipped", reason };
      }
      const project = projectMap.get(projectId)!;
      const updated = { ...project, [output.field]: output.value, updatedAt: nowIso() };
      projectMap.set(projectId, updated);
      return { mutatedProjectIds: [projectId], outcome: "executed" };
    }

    case "createNotification": {
      const projectId = resolveTargetProjectId(undefined, source, projectMap);
      const notification: Notification = {
        id: uuid(),
        type: flow.name,
        severity: output.severity,
        message: interpolateString(output.message, data),
        entityRef: buildNotificationEntityRef(projectId, source),
        read: false,
        createdAt: nowIso(),
      };
      result.notifications.push(notification);
      return { mutatedProjectIds: [], outcome: "executed" };
    }

    case "markAreaComplete": {
      const projectId = resolveTargetProjectId(output.projectId, source, projectMap);
      if (!projectId) {
        const reason = "No se pudo resolver el proyecto destino.";
        console.warn(`[FlowEngine] "${flow.name}": ${reason} (markAreaComplete)`);
        return { mutatedProjectIds: [], outcome: "skipped", reason };
      }
      const project = projectMap.get(projectId)!;
      const areaId = output.areaId ?? source.areaId;
      const area = areaId ? project.areas.find((a) => a.id === areaId) : undefined;
      if (!area) {
        const reason = "No se pudo resolver el área destino.";
        console.warn(`[FlowEngine] "${flow.name}": ${reason} (markAreaComplete)`);
        return { mutatedProjectIds: [], outcome: "skipped", reason };
      }
      const updatedArea = { ...area, completed: true, updatedAt: nowIso() };
      const updatedProject = ops.updateArea(project, updatedArea);
      projectMap.set(projectId, updatedProject);
      return { mutatedProjectIds: [projectId], outcome: "executed" };
    }

    case "webhook": {
      const payload = output.payload
        ? interpolateObject(output.payload, data)
        : data;

      // Registrar el intento de entrega antes de llamar a la red: se
      // conserva aunque la entrega falle (spec 024 §F2), para no perder el
      // rastro de qué se intentó enviar.
      result.outboundDeliveries.push({
        url: output.url,
        secret: output.secret,
        payload,
      });

      const signature = await signPayload(
        {
          eventId: uuid(),
          eventType: "flow.execution",
          timestamp: nowIso(),
          workspace: { org: "Hito" },
          data: payload,
        },
        output.secret
      );

      let response: Response;
      try {
        response = await fetch(output.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Hito-Signature": signature,
            "X-Hito-Event": "flow.execution",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000),
        });
      } catch (error) {
        // Un fallo de red ya no se traga: se relanza para que el catch del
        // loop principal lo cuente como error real del output (spec 024
        // §F2 — antes esto se registraba como "Ejecutado correctamente").
        // `cause` se asigna a mano (en vez de vía el 2º argumento del
        // constructor) porque el `lib` de tsconfig es ES2020 y no tipa esa
        // sobrecarga, aunque el runtime sí la soporta.
        const message = error instanceof Error ? error.message : String(error);
        const wrapped = new Error(`Entrega fallida: ${message}`);
        (wrapped as Error & { cause?: unknown }).cause = error;
        throw wrapped;
      }
      if (!response.ok) {
        throw new Error(`El webhook respondió HTTP ${response.status}.`);
      }

      return { mutatedProjectIds: [], outcome: "executed" };
    }

    case "email": {
      // Dynamic import: `connections.ts` pulls in `vault.ts`, which touches
      // `localStorage` at module scope — a static import here would make the
      // engine (otherwise environment-agnostic and easy to unit test) fail to
      // load outside a browser-like environment, same reasoning already
      // applied to the other integrations crossings in this codebase
      // (`useFlowStore`'s dynamic import of `hubspot-polling-manager`).
      const { getConnection } = await import("@/integrations/connections");
      const connection = await getConnection(output.connectionId);
      if (!connection) {
        const reason = `La conexión de email "${output.connectionId}" no existe o fue eliminada.`;
        console.warn(`[FlowEngine] "${flow.name}": ${reason}`);
        return { mutatedProjectIds: [], outcome: "skipped", reason };
      }
      const proxyUrl = String(connection.config.proxyUrl ?? "");
      const fromEmail = String(connection.config.fromEmail ?? "");

      const emailData = {
        to: interpolateString(output.to, data),
        subject: interpolateString(output.subject, data),
        htmlBody: interpolateString(output.body, data),
      };

      result.emailDeliveries.push({
        proxyUrl,
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.htmlBody,
      });

      // `sendEmailViaAppsScript` nunca lanza — siempre resuelve
      // `{success, error?}` (ya registra el intento en syncLogs por su
      // cuenta). El código previo ignoraba ese resultado por completo, así
      // que un envío fallido (proxy caído, HTTP≥400) quedaba invisible para
      // el motor y se contaba como "Ejecutado correctamente" (spec 024
      // §F2). Ahora si falla se relanza para que el catch del loop principal
      // lo cuente como error real del output.
      const sendResult = await sendEmailViaAppsScript({ proxyUrl, fromEmail }, emailData);
      if (!sendResult.success) {
        throw new Error(`Envío fallido: ${sendResult.error ?? "error desconocido"}`);
      }

      return { mutatedProjectIds: [], outcome: "executed" };
    }
  }
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function interpolateString(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const value = getNestedValue(data, path);
    return value !== undefined ? String(value) : match;
  });
}

function interpolateObject(
  obj: Record<string, unknown>,
  data: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = interpolateString(value, data);
    } else if (typeof value === "object" && value !== null) {
      result[key] = interpolateObject(value as Record<string, unknown>, data);
    } else {
      result[key] = value;
    }
  }
  return result;
}
