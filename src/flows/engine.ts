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
import { calculateRetryDelay } from "@/integrations/outbound/retry-delay";
import {
  resolvePath,
  coerceDateString,
  interpolateString as interpolate,
  interpolateObject as interpolateObj,
} from "./interpolation";
import { buildWebhookRequest } from "./webhook-request";

/** Fallo transitorio de un output de red (error de red o HTTP ≥ 500) —
 * candidato a reintento cuando el output tiene `retry` configurado (spec
 * 027 §E). Estructurado como clase para no parsear strings de error al
 * decidir si se reintenta; un 4xx u otro fallo permanente se lanza como
 * `Error` normal y nunca se reintenta. */
export class TransientOutputError extends Error {}

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
  /** Si es true, los outputs se "describen" en vez de ejecutarse (no mutan
   * `Project`s, no crean `Person`s, no disparan `webhook`s, no mandan
   * `email`s, no emiten notificaciones). Cada output devuelve un string
   * `plan` en la traza (ej. "Se crearía la tarea 'X' en el proyecto 'Y'")
   * en `outcome` "executed"/"skipped" pero sin efecto real. `result`
   * queda limpio de mutaciones de estado. Útil para el dry-run del editor
   * de flujos (spec 025 §C). Las resoluciones de target (projectId/
   * matchField) siguen corriendo — si fallan, el `plan` lo describe
   * honestamente: "…pero el proyecto 'X' no existe — en runtime se omitiría". */
  describeOutputs?: boolean;
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
  /** Total de intentos que consumió el output cuando su `retry` (spec 027
   * §E) entró en juego — presente solo si hubo más de un intento. */
  attempts?: number;
  /** Presente cuando `outcome` es "skipped"/"error", o cuando "executed"
   * tuvo un detalle relevante (ej. un webhook que se registró pero cuyo
   * envío de red falló). */
  reason?: string;
  mutatedProjectIds: string[];
  /** Solo presente cuando `FlowEngineInput.describeOutputs === true`
   * (spec 025 §C — dry-run). Texto descriptivo en español natural de lo
   * que *pasaría* si el output corriese de verdad — reemplaza al badge
   * "ejecutado"/"omitido" en `FlowRunTraceView` para distinguir una
   * simulación de un run real. */
  plan?: string;
  /** Campos finales interpolados de este output, en una corrida REAL (spec
   * 026 §E) — ej. `{ title: "ACME - seguimiento" }` para un `createTask`.
   * Trunca cada valor a 120 caracteres y nunca incluye secretos ni bodies
   * completos (el `secret` del webhook, el `body` del email) — mismo
   * criterio que 024 §F4. Permite depurar "¿por qué salió vacío?" sin
   * adivinar, mirando el resultado ya resuelto en vez del template crudo. */
  resolved?: Record<string, string>;
  /** Tokens `{{x}}` que no resolvieron a un valor definido en ningún campo
   * de este output (spec 026 §A/§E) — alimenta un chip ámbar en la traza. */
  unresolvedTokens?: string[];
}

export interface FlowRunRecordTrace {
  record: Record<string, unknown>;
  conditions: FlowRunConditionTrace[];
  /** Cómo se combinaron las condiciones (spec 027 §F) — presente solo si el
   * flow tenía condiciones; la traza lo muestra en el encabezado del bloque
   * ("todas deben cumplirse" / "alcanza con una"). */
  conditionMode?: "all" | "any";
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

      // 3a. Filtrar por condiciones (sobre el registro original, sin mapear).
      // El modo (spec 027 §F) decide si deben cumplirse todas ("all",
      // comportamiento histórico y default para flujos sin el campo) o si
      // alcanza con una ("any").
      const conditionMode = flow.logic.conditionMode ?? "all";
      const { passed: conditionsPassed, details: conditionDetails } = evaluateConditionsDetailed(
        flow.logic.conditions,
        record,
        conditionMode
      );

      const recordTrace: FlowRunRecordTrace | undefined =
        flowTrace && flowTrace.records.length < MAX_TRACE_RECORDS
          ? {
              record,
              conditions: conditionDetails,
              conditionMode: flow.logic.conditions.length > 0 ? conditionMode : undefined,
              conditionsPassed,
              outputs: [],
            }
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
      for (let outputIndex = 0; outputIndex < flow.outputs.length; outputIndex++) {
        const output = flow.outputs[outputIndex];
        // Reintentos (spec 027 §E): SOLO webhook/email con `retry`
        // configurado, SOLO ante fallos transitorios (`TransientOutputError`
        // — red o HTTP ≥ 500), nunca en dry-run. Los outputs internos no se
        // reintentan: no fallan por transitorios y repetirlos duplicaría
        // efectos.
        const retryPolicy =
          !(input.describeOutputs ?? false) && (output.type === "webhook" || output.type === "email")
            ? output.retry
            : undefined;
        const maxAttempts = 1 + (retryPolicy?.attempts ?? 0);
        let attempts = 0;
        try {
          let outputResult: OutputExecutionOutcome;
          for (;;) {
            attempts++;
            try {
              outputResult = await executeOutput(
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
                runContext,
                input.describeOutputs ?? false,
              );
              break;
            } catch (error) {
              if (!(error instanceof TransientOutputError) || attempts >= maxAttempts) throw error;
              await sleep(retryDelayMs(attempts - 1, retryPolicy!.backoff));
            }
          }
          for (const id of outputResult.mutatedProjectIds) changedProjectIds.add(id);
          if (!(input.describeOutputs ?? false)) executedFlowIds.add(flow.id);
          recordTrace?.outputs.push({
            type: output.type,
            outcome: outputResult.outcome,
            attempts: attempts > 1 ? attempts : undefined,
            reason: outputResult.reason,
            mutatedProjectIds: outputResult.mutatedProjectIds,
            plan: outputResult.plan,
            resolved: outputResult.resolved,
            unresolvedTokens: outputResult.unresolvedTokens,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          result.errors.push({
            flowId: flow.id,
            flowName: flow.name,
            stage: "output",
            message,
          });
          recordTrace?.outputs.push({
            type: output.type,
            outcome: "error",
            attempts: attempts > 1 ? attempts : undefined,
            reason: message,
            mutatedProjectIds: [],
          });

          // Política de fallo (spec 027 §E): con "stop", los outputs
          // restantes de ESTE registro se marcan skipped con motivo
          // explícito y no se ejecutan. "continue" (default y comportamiento
          // histórico) sigue con los demás.
          if ((flow.onErrorPolicy ?? "continue") === "stop") {
            for (let rest = outputIndex + 1; rest < flow.outputs.length; rest++) {
              recordTrace?.outputs.push({
                type: flow.outputs[rest].type,
                outcome: "skipped",
                reason: "Omitido — una acción anterior falló (política: detener).",
                mutatedProjectIds: [],
              });
            }
            break;
          }
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
  // Inbox (spec 032 §B): datos empujados desde Make/Zapier a un proxy que Hito
  // drena. Como HubSpot/Sheets, la key incluye `connectionId` para que dos
  // Flujos inbox con conexiones distintas no colisionen (hereda 024 §F10).
  if (trigger.provider === "inbox") return `inbox:${trigger.config.connectionId}`;
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
 * (comportamiento previo, sin condiciones que reportar). El `mode` (spec
 * 027 §F) decide la combinación: "all" = `every` (AND, histórico), "any" =
 * `some` (OR). */
function evaluateConditionsDetailed(
  conditions: FlowCondition[],
  record: Record<string, unknown>,
  mode: "all" | "any" = "all"
): { passed: boolean; details: FlowRunConditionTrace[] } {
  const details = conditions.map((c) => ({
    field: c.field,
    op: c.op,
    expected: c.value,
    actual: getNestedValue(record, c.field),
    passed: evaluateCondition(c, record),
  }));
  const passed =
    details.length === 0
      ? true
      : mode === "any"
        ? details.some((d) => d.passed)
        : details.every((d) => d.passed);
  return { passed, details };
}

// ─── RETRY HELPERS (spec 027 §E) ─────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Delay antes del reintento `attempt` (0-based). "fixed" espera siempre el
 * delay base; "exponential" reusa `calculateRetryDelay` (mismo criterio ya
 * probado del procesador outbound: base 1s, x2 por intento, jitter ±20%),
 * con techo de 30s — un flujo corre inline en la app, no puede colgarse los
 * 5 minutos que tolera la cola outbound. */
function retryDelayMs(attempt: number, backoff: "fixed" | "exponential"): number {
  const base = 1_000;
  if (backoff === "fixed") return base;
  return calculateRetryDelay(attempt, {
    maxRetries: 5,
    baseDelayMs: base,
    maxDelayMs: 30_000,
    jitterFactor: 0.2,
  });
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
    case "!=": {
      // Igual criterio que `>`/`>=`/`<`/`<=` (spec 024 §F6): coercionar
      // numéricamente solo cuando AMBOS lados son coercibles — evita que
      // `amount: "5000"` (HubSpot) contra `condition.value: 5000` falle en
      // silencio por ser tipos distintos. Cuando no aplica, comparación
      // estricta previa (ej. strings no numéricos, booleans).
      const a = toComparableNumber(value);
      const b = toComparableNumber(target);
      const equal = a !== null && b !== null ? a === b : value === target;
      return condition.op === "==" ? equal : !equal;
    }
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

/** Modo describe-only (spec 025 §C, dry-run): construye un texto en
 * español natural que describe lo que *pasaría* si el output corriese de
 * verdad, sin mutar estado ni llamar a la red. Reusa las mismas resoluciones
 * de target que el run real — si fallan, el `plan` lo dice honestamente
 * ("se omitiría: el proyecto 'X' no existe"). El `outcome` "executed"
 * significa "el plan fue computable" (no que se ejecutó algo). No lanza. */
function describeOutput(
  output: Output,
  data: Record<string, unknown>,
  source: RecordSource,
  projectMap: Map<string, Project>,
  people: Person[],
  runContext: RunContext,
): OutputExecutionOutcome {
  switch (output.type) {
    case "createProject": {
      const name = interpolateString(output.name, data);
      const dedupeKey = output.dedupeKey ? interpolateString(output.dedupeKey, data) : undefined;
      if (dedupeKey && findProjectByDedupeKey(projectMap, dedupeKey)) {
        return {
          mutatedProjectIds: [],
          outcome: "skipped",
          plan: `Se omitiría crear el proyecto "${name}" — ya existe con dedupeKey "${dedupeKey}".`,
        };
      }
      const typeLabel = output.projectTypeId
        ? (projectMap.size > 0 ? "" : "") + (output.projectTypeId ? ` (tipo ${output.projectTypeId})` : "")
        : "";
      return {
        mutatedProjectIds: [],
        outcome: "executed",
        plan: `Se crearía el proyecto "${name}"${typeLabel}.`,
      };
    }

    case "createTask": {
      const title = interpolateString(output.title, data);
      const projectId = resolveCreateTaskProjectId(output, source, projectMap, runContext);
      if (!projectId) {
        const refLabel =
          output.projectRef === "createdProject"
            ? "el nodo createProject anterior en este flujo"
            : output.projectRef === "trigger"
              ? "el evento/registro disparador"
              : `"${output.projectId ?? ""}"`;
        return {
          mutatedProjectIds: [],
          outcome: "skipped",
          plan: `Se omitiría crear la tarea "${title}" — no se resolvió el proyecto destino (${refLabel}).`,
        };
      }
      const project = projectMap.get(projectId);
      const projectName = project?.name ?? projectId;
      return {
        mutatedProjectIds: [],
        outcome: "executed",
        plan: `Se crearía la tarea "${title}" en el proyecto "${projectName}".`,
      };
    }

    case "createPerson": {
      const matchField = output.matchField;
      const matchValue = data[matchField] as string;
      const existing = people.find((p) => p[matchField] === matchValue);
      if (existing) {
        if (output.ifNotFound === "update") {
          return {
            mutatedProjectIds: [],
            outcome: "executed",
            plan: `Se actualizaría la persona existente (match por ${matchField}="${matchValue}").`,
          };
        }
        return {
          mutatedProjectIds: [],
          outcome: "skipped",
          plan: `Se omitiría la persona (match: ${matchField}="${matchValue}" ya existe, ifNotFound=${output.ifNotFound}).`,
        };
      }
      if (output.ifNotFound === "create") {
        return {
          mutatedProjectIds: [],
          outcome: "executed",
          plan: `Se crearía una nueva persona (match por ${matchField}="${matchValue}").`,
        };
      }
      return {
        mutatedProjectIds: [],
        outcome: "skipped",
        plan: `Se omitiría la persona (sin match por ${matchField}="${matchValue}", ifNotFound=${output.ifNotFound}).`,
      };
    }

    case "setProjectStatus": {
      const projectId = resolveTargetProjectId(output.projectId, source, projectMap);
      if (!projectId) {
        return {
          mutatedProjectIds: [],
          outcome: "skipped",
          plan: `Se omitiría — no se resolvió el proyecto destino (projectId="${output.projectId ?? ""}").`,
        };
      }
      const project = projectMap.get(projectId);
      return {
        mutatedProjectIds: [],
        outcome: "executed",
        plan: `El proyecto "${project?.name ?? projectId}" pasaría a estado "${output.status}".`,
      };
    }

    case "setField": {
      const projectId = resolveTargetProjectId(output.projectId, source, projectMap);
      if (!projectId) {
        return {
          mutatedProjectIds: [],
          outcome: "skipped",
          plan: `Se omitiría — no se resolvió el proyecto destino.`,
        };
      }
      const project = projectMap.get(projectId);
      const plannedValue = typeof output.value === "string" ? interpolateString(output.value, data) : output.value;
      return {
        mutatedProjectIds: [],
        outcome: "executed",
        plan: `Se setearía ${output.field}=${JSON.stringify(plannedValue)} en el proyecto "${project?.name ?? projectId}".`,
      };
    }

    case "createNotification": {
      const message = interpolateString(output.message, data);
      return {
        mutatedProjectIds: [],
        outcome: "executed",
        plan: `Se generaría una notificación (${output.severity}): "${message}".`,
      };
    }

    case "markAreaComplete": {
      const projectId = resolveTargetProjectId(output.projectId, source, projectMap);
      const areaId = output.areaId ?? source.areaId;
      if (!projectId || !areaId) {
        return {
          mutatedProjectIds: [],
          outcome: "skipped",
          plan: `Se omitiría — falta projectId/areaId.`,
        };
      }
      const project = projectMap.get(projectId);
      const area = project?.areas.find((a) => a.id === areaId);
      return {
        mutatedProjectIds: [],
        outcome: "executed",
        plan: `Se marcaría completa el área "${area?.name ?? areaId}" del proyecto "${project?.name ?? projectId}".`,
      };
    }

    case "webhook": {
      // Spec 026 §C4: el plan ahora muestra el payload interpolado completo
      // (truncado) en vez de solo las keys — coherente con la vista previa
      // del drawer (§D). Solo el host es visible en el plan, nunca el
      // secret usado para firmar.
      const payload = output.payload ? interpolateObject(output.payload, data) : data;
      const payloadPreview = JSON.stringify(payload);
      const truncatedPayload =
        payloadPreview.length > 200 ? `${payloadPreview.slice(0, 197)}...` : payloadPreview;
      let host: string;
      try {
        host = new URL(output.url).host;
      } catch {
        host = output.url;
      }
      return {
        mutatedProjectIds: [],
        outcome: "executed",
        plan: `Se enviaría POST a ${host} con payload ${truncatedPayload} (firmado con el secret configurado).`,
      };
    }

    case "email": {
      const to = interpolateString(output.to, data);
      const subject = interpolateString(output.subject, data);
      return {
        mutatedProjectIds: [],
        outcome: "executed",
        plan: `Se enviaría email a "${to}" con asunto "${subject}".`,
      };
    }
  }
}

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

/** Resuelve un `assigneeId` interpolado contra las Personas conocidas por el
 * engine (spec 026 §B5): id exacto → email (case-insensitive) → nombre
 * exacto. Antes `{{email}}` en Responsable producía un `assigneeId` igual al
 * string del email — nunca coincidía con un `Person.id` real, así que la UI
 * mostraba "sin responsable" o un id huérfano. Sin match, devuelve
 * `undefined` en vez de guardar un id que no identifica a nadie. */
function resolvePersonId(interpolated: string, people: Person[]): string | undefined {
  if (!interpolated) return undefined;
  const byId = people.find((p) => p.id === interpolated);
  if (byId) return byId.id;
  const lower = interpolated.toLowerCase();
  const byEmail = people.find((p) => p.email && p.email.toLowerCase() === lower);
  if (byEmail) return byEmail.id;
  const byName = people.find((p) => p.name === interpolated);
  return byName?.id;
}

/** Coacciona un `dueDate` interpolado a `YYYY-MM-DD` (spec 026 §B6). La
 * lógica vive ahora en `interpolation.ts` (`coerceDateString`, spec 027 §G)
 * para que el mod de formato `{{campo|date}}` use exactamente el mismo
 * criterio — este alias conserva el nombre local de los call sites. */
const coerceDueDate = coerceDateString;

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
 * conservan intactos. `plan` solo se usa cuando `describeOutputs: true`
 * (dry-run, spec 025 §C) — sustituye a `reason`/`outcome` en la UI para
 * distinguir simulación de run real. */
interface OutputExecutionOutcome {
  mutatedProjectIds: string[];
  outcome: "executed" | "skipped";
  reason?: string;
  plan?: string;
  /** Ver `FlowRunOutputTrace.resolved`/`unresolvedTokens` (spec 026 §E) —
   * solo poblados en la ejecución real (nunca en `describeOutput`, que ya
   * comunica lo mismo a través de `plan`). */
  resolved?: Record<string, string>;
  unresolvedTokens?: string[];
}

/** Trunca un valor a `n` caracteres para la traza (spec 026 §E) — evita que
 * un campo largo (descripción, body) infle `flow-runs`. */
function truncateForTrace(value: string, n = 120): string {
  return value.length > n ? `${value.slice(0, n - 3)}...` : value;
}

/** Ejecuta un output. Cuando `describeOnly` es true, no muta/llama a red —
 * solo describe qué pasaría (spec 025 §C, dry-run). */
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
  runContext: RunContext,
  describeOnly: boolean,
): Promise<OutputExecutionOutcome> {
  if (describeOnly) return describeOutput(output, data, source, projectMap, people, runContext);
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

      const nameResult = interpolate(output.name, data);
      const name = nameResult.value;
      const unresolvedTokens = [...nameResult.unresolved];
      const resolved: Record<string, string> = { name: truncateForTrace(name) };
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
        // Spec 026 §B3: la UI envuelve este campo en un `InterpolableField`
        // cuyo `VariablePicker` inserta `{{campo}}` — si el usuario lo usó
        // (camino natural), `source` es un template a interpolar. Si no
        // contiene `{{`, se trata como path crudo (retrocompat con flujos
        // guardados antes de esta spec, que esperaban `getNestedValue`
        // directo). El guard `value !== ""` evita pisar el campo del
        // proyecto con una cadena vacía cuando un token no resolvió.
        let value: unknown;
        if (mapping.source.includes("{{")) {
          const r = interpolate(mapping.source, data);
          value = r.value;
          unresolvedTokens.push(...r.unresolved);
        } else {
          value = getNestedValue(data, mapping.source);
        }
        if (value !== undefined && value !== "") {
          (project as unknown as Record<string, unknown>)[mapping.target] = value;
          resolved[mapping.target] = truncateForTrace(String(value));
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
      return {
        mutatedProjectIds: [],
        outcome: "executed",
        resolved,
        unresolvedTokens: unresolvedTokens.length > 0 ? unresolvedTokens : undefined,
      };
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
      const unresolvedTokens: string[] = [];
      const titleResult = interpolate(output.title, data);
      unresolvedTokens.push(...titleResult.unresolved);
      const task = newTask(titleResult.value, areaId);
      const resolved: Record<string, string> = { title: truncateForTrace(titleResult.value) };
      if (output.priority) task.priority = output.priority as Task["priority"];
      if (output.description) task.description = interpolateString(output.description, data);
      if (output.status) task.status = output.status as Task["status"];
      // Spec 026 §B5: el valor interpolado (ej. `{{email}}`) se resuelve
      // contra las Personas conocidas — nunca se guarda el string crudo como
      // si fuera un `Person.id`.
      if (output.assigneeId) {
        const assigneeResult = interpolate(output.assigneeId, data);
        unresolvedTokens.push(...assigneeResult.unresolved);
        const resolvedPersonId = resolvePersonId(assigneeResult.value, people);
        task.assigneeId = resolvedPersonId ?? null;
        resolved.assigneeId = resolvedPersonId
          ? truncateForTrace(resolvedPersonId)
          : `sin match para "${assigneeResult.value}"`;
      }
      // Spec 026 §B6: coacciona ISO/epoch-ms a `YYYY-MM-DD` — HubSpot
      // (`closedate`) entrega epoch-ms, que antes se guardaba crudo.
      if (output.dueDate) {
        const dueDateResult = interpolate(output.dueDate, data);
        unresolvedTokens.push(...dueDateResult.unresolved);
        const coerced = coerceDueDate(dueDateResult.value);
        task.dueDate = coerced.value ?? null;
        resolved.dueDate = coerced.value ?? coerced.warning ?? "";
      }
      if (output.tags) task.tags = output.tags.map((tag) => interpolateString(tag, data));
      if (output.estimate !== undefined) task.estimate = output.estimate;
      if (output.summary) task.summary = interpolateString(output.summary, data);
      if (dedupeKey) task.dedupeKey = dedupeKey;

      const updated = ops.addTask(project, task);
      projectMap.set(projectId, updated);
      return {
        mutatedProjectIds: [projectId],
        outcome: "executed",
        resolved,
        unresolvedTokens: unresolvedTokens.length > 0 ? unresolvedTokens : undefined,
      };
    }

    case "createPerson": {
      const matchField = output.matchField;
      // Spec 026 §B4: `matchSource` (opcional) permite matchear contra un
      // path anidado del registro (ej. `{{properties.email}}` de HubSpot)
      // cuando la clave no coincide 1:1 con `matchField`. Sin `matchSource`,
      // `resolvePath` cubre igual el caso previo (`data[matchField]`) y de
      // paso el de un path anidado con el mismo nombre que `matchField`.
      const matchValue = output.matchSource
        ? interpolateString(output.matchSource, data)
        : String(resolvePath(data, matchField) ?? "");
      const existing = matchValue ? people.find((p) => p[matchField] === matchValue) : undefined;

      const matchResolved = { match: truncateForTrace(`${matchField}=${matchValue}`) };

      if (existing) {
        if (output.ifNotFound === "update" || output.ifNotFound === "create") {
          const updated = { ...existing };
          const unresolvedTokens: string[] = [];
          for (const [key, value] of Object.entries(output.data)) {
            const r = interpolate(value, data);
            unresolvedTokens.push(...r.unresolved);
            (updated as Record<string, unknown>)[key] = r.value;
          }
          updated.updatedAt = nowIso();
          result.updatedPeople.push(updated);
          return {
            mutatedProjectIds: [],
            outcome: "executed",
            resolved: matchResolved,
            unresolvedTokens: unresolvedTokens.length > 0 ? unresolvedTokens : undefined,
          };
        }
        return {
          mutatedProjectIds: [],
          outcome: "skipped",
          reason: "Ya existe una persona con ese campo de match (ifNotFound: skip).",
        };
      }
      if (output.ifNotFound === "create") {
        const personData: Record<string, string> = {};
        const unresolvedTokens: string[] = [];
        for (const [key, value] of Object.entries(output.data)) {
          const r = interpolate(value, data);
          unresolvedTokens.push(...r.unresolved);
          personData[key] = r.value;
        }
        // Si el output no define mapeo explícito para un campo, usar el valor
        // ya presente en el registro transformado (útil para polling
        // directo) — resuelto vía `resolvePath` para soportar registros
        // anidados (spec 026 §B4).
        const nameFromRecord = resolvePath(data, "name");
        const emailFromRecord = resolvePath(data, "email");
        const roleTitleFromRecord = resolvePath(data, "roleTitle");
        const fallbackName =
          typeof nameFromRecord === "string"
            ? nameFromRecord
            : typeof emailFromRecord === "string"
              ? emailFromRecord
              : "Sin nombre";
        const person = newPerson(personData.name || fallbackName);
        person.email = personData.email || (typeof emailFromRecord === "string" ? emailFromRecord : "");
        person.roleTitle =
          personData.roleTitle || (typeof roleTitleFromRecord === "string" ? roleTitleFromRecord : "");
        result.newPeople.push(person);
        return {
          mutatedProjectIds: [],
          outcome: "executed",
          resolved: matchResolved,
          unresolvedTokens: unresolvedTokens.length > 0 ? unresolvedTokens : undefined,
        };
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
      // Spec 026 §B2: la UI ya ofrece `VariablePicker`/hint de validación
      // para este campo (anuncia "{{campo}}" como sintaxis válida), pero el
      // motor guardaba `output.value` crudo — un `{{amount}}` terminaba
      // literal en el proyecto en vez del valor real.
      let value: unknown = output.value;
      let unresolvedTokens: string[] | undefined;
      if (typeof output.value === "string") {
        const r = interpolate(output.value, data);
        value = r.value;
        unresolvedTokens = r.unresolved.length > 0 ? r.unresolved : undefined;
      }
      const updated = { ...project, [output.field]: value, updatedAt: nowIso() };
      projectMap.set(projectId, updated);
      return {
        mutatedProjectIds: [projectId],
        outcome: "executed",
        resolved: { [output.field]: truncateForTrace(String(value)) },
        unresolvedTokens,
      };
    }

    case "createNotification": {
      const projectId = resolveTargetProjectId(undefined, source, projectMap);
      const messageResult = interpolate(output.message, data);
      const notification: Notification = {
        id: uuid(),
        type: flow.name,
        severity: output.severity,
        message: messageResult.value,
        entityRef: buildNotificationEntityRef(projectId, source),
        read: false,
        createdAt: nowIso(),
      };
      result.notifications.push(notification);
      return {
        mutatedProjectIds: [],
        outcome: "executed",
        resolved: { message: truncateForTrace(messageResult.value) },
        unresolvedTokens: messageResult.unresolved.length > 0 ? messageResult.unresolved : undefined,
      };
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
      // Spec 026 §C1: la construcción de la request (payload interpolado +
      // firma HMAC + headers) vive en `webhook-request.ts`, compartida con
      // "Probar webhook" (`webhook-test.ts`) — una sola fuente de verdad
      // para la firma.
      const { url, init, payload, unresolved: unresolvedPayloadTokens } = await buildWebhookRequest(output, data);

      // Registrar el intento de entrega antes de llamar a la red: se
      // conserva aunque la entrega falle (spec 024 §F2), para no perder el
      // rastro de qué se intentó enviar.
      result.outboundDeliveries.push({
        url,
        secret: output.secret,
        payload,
      });

      let response: Response;
      try {
        response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
      } catch (error) {
        // Un fallo de red ya no se traga: se relanza para que el catch del
        // loop principal lo cuente como error real del output (spec 024
        // §F2 — antes esto se registraba como "Ejecutado correctamente").
        // Transitorio por definición (spec 027 §E) — candidato a reintento
        // si el output tiene `retry`. `cause` se asigna a mano (en vez de
        // vía el 2º argumento del constructor) porque el `lib` de tsconfig
        // es ES2020 y no tipa esa sobrecarga, aunque el runtime sí la
        // soporta.
        const message = error instanceof Error ? error.message : String(error);
        const wrapped = new TransientOutputError(`Entrega fallida: ${message}`);
        (wrapped as Error & { cause?: unknown }).cause = error;
        throw wrapped;
      }
      if (!response.ok) {
        // HTTP ≥ 500 es transitorio (reintentable); 4xx es permanente y
        // nunca se reintenta (spec 027 §E).
        const message = `El webhook respondió HTTP ${response.status}.`;
        if (response.status >= 500) throw new TransientOutputError(message);
        throw new Error(message);
      }

      let host: string;
      try {
        host = new URL(url).host;
      } catch {
        host = url;
      }
      // Spec 032 §C: capturar el status y un fragmento de la respuesta real de
      // Make/Zapier en la traza — así "¿mi escenario recibió el webhook?" deja
      // de ser un misterio. Nunca el secret ni el body completo (criterio 026
      // §E / 024 §F4).
      let responseSnippet: string;
      try {
        const text = await response.text();
        responseSnippet = text.length > 200 ? `${text.slice(0, 197)}...` : text;
      } catch {
        responseSnippet = "";
      }
      return {
        mutatedProjectIds: [],
        outcome: "executed",
        resolved: {
          host,
          payloadKeys: Object.keys(payload).join(", "),
          status: String(response.status),
          ...(responseSnippet ? { response: responseSnippet } : {}),
        },
        unresolvedTokens: unresolvedPayloadTokens.length > 0 ? unresolvedPayloadTokens : undefined,
      };
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

      const toResult = interpolate(output.to, data);
      const subjectResult = interpolate(output.subject, data);
      const bodyResult = interpolate(output.body, data);
      const emailData = {
        to: toResult.value,
        subject: subjectResult.value,
        htmlBody: bodyResult.value,
      };
      const unresolvedTokens = [
        ...toResult.unresolved,
        ...subjectResult.unresolved,
        ...bodyResult.unresolved,
      ];

      result.emailDeliveries.push({
        proxyUrl,
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.htmlBody,
      });

      // `sendEmailViaAppsScript` nunca lanza — siempre resuelve
      // `{success, error?, transient?}` (ya registra el intento en syncLogs
      // por su cuenta). El código previo ignoraba ese resultado por
      // completo, así que un envío fallido (proxy caído, HTTP≥400) quedaba
      // invisible para el motor y se contaba como "Ejecutado correctamente"
      // (spec 024 §F2). Ahora si falla se relanza para que el catch del
      // loop principal lo cuente como error real del output; `transient`
      // decide si el fallo es reintentable (spec 027 §E).
      const sendResult = await sendEmailViaAppsScript({ proxyUrl, fromEmail }, emailData);
      if (!sendResult.success) {
        const message = `Envío fallido: ${sendResult.error ?? "error desconocido"}`;
        if (sendResult.transient) throw new TransientOutputError(message);
        throw new Error(message);
      }

      // Nunca el body completo en la traza — solo destinatario y asunto
      // (spec 026 §E, mismo criterio que 024 §F4).
      return {
        mutatedProjectIds: [],
        outcome: "executed",
        resolved: { to: truncateForTrace(emailData.to), subject: truncateForTrace(emailData.subject) },
        unresolvedTokens: unresolvedTokens.length > 0 ? unresolvedTokens : undefined,
      };
    }
  }
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────

/** `resolvePath`/`interpolateString`/`interpolateObject` ahora viven en
 * `interpolation.ts` (spec 026 §A), fuente de verdad compartida con la
 * validación de tokens de la UI y las vistas previas del canvas. Este archivo
 * conserva los nombres previos como wrappers locales para no reescribir cada
 * call site: la mayoría solo necesita el string/objeto interpolado, no la
 * lista de tokens no resueltos (que sí se usa explícitamente donde hace
 * falta para la traza — spec 026 §E, ver `executeOutput`). */
const getNestedValue = resolvePath;

function interpolateString(template: string, data: Record<string, unknown>): string {
  return interpolate(template, data).value;
}

function interpolateObject(
  obj: Record<string, unknown>,
  data: Record<string, unknown>
): Record<string, unknown> {
  return interpolateObj(obj, data).value;
}
