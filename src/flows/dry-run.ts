import type {
  ChecklistTemplate,
  Person,
  ProcessTemplate,
  Project,
  ProjectType,
} from "@/domain/schemas";
import type { FlowRule } from "@/domain/schemas/flow";
import type { DomainEvent, DomainEventType } from "@/automations/events";
import { runFlowEngine, pollTriggerKey, type FlowRunTrace } from "./engine";
import { fetchPollSampleForFlow } from "./manual-run";
import { rawEventFields } from "@/features/flows/canvas/variables";
import { EVENT_SEED_REQUIREMENTS, buildSyntheticEvent } from "./synthetic-event";

export interface DryRunDeps {
  projects: Project[];
  people: Person[];
  projectTypes: ProjectType[];
  checklistTemplates: ChecklistTemplate[];
  processTemplates: ProcessTemplate[];
}

export interface DryRunResult {
  ok: boolean;
  /** Mensaje de error cuando no se pudo ni siquiera traer la muestra
   * (conexión borrada, vault bloqueado, fallo de red). Ausente si
   * `ok === true`. */
  error?: string;
  /** Traza paso a paso de la simulación — presente si el trigger matcheó
   * (aunque las condiciones hayan filtrado todos los registros: la traza
   * sigue conteniendo la evaluación de condiciones para depurar). */
  trace?: FlowRunTrace;
}

/**
 * Corre un flujo en modo **dry-run** (spec 025 §C): evalúa condiciones,
 * mapeo, transformación y construye un `plan` descriptivo por output
 * ("Se crearía la tarea 'X' en el proyecto 'Y'", "Se enviaría POST a
 * host") — **sin mutar estado ni llamar a la red**.
 *
 * Reusa `fetchPollSampleForFlow` (poll) o construye un evento sintético
 * representativo desde `EVENT_FIELD_EXAMPLES` (event). Para flujos de
 * evento NO elige una entidad real — es previsualización de la *forma*
 * del flujo; para una corrida exacta sobre una entidad específica, el
 * usuario debe usar "Ejecutar" (Fase D), que reusa `runFlowNow` y el
 * `RunEventFlowDialog` que sí exige elegir la entidad.
 *
 * Invariantes:
 *  - No incrementa `runCount`, no escribe en `flow-runs`, no muta `Project`s.
 *  - `result.errors` queda poblado para detectar fallos reales de
 *    validación/transformación (igual que un run real).
 *  - `executedFlowIds` queda vacío (no fue una corrida real).
 */
export async function dryRunFlow(flow: FlowRule, deps: DryRunDeps): Promise<DryRunResult> {
  // Bypass `enabled` — el usuario puede dry-runear un flujo recién duplicado
  // que aún está inactivo (mismo criterio que `manual-run.ts`).
  const flowEnabled: FlowRule = { ...flow, enabled: true };

  let externalData: Map<string, Record<string, unknown>[]> | undefined;
  let events: DomainEvent[] = [];

  if (flow.trigger.type === "poll") {
    const fetchResult = await fetchPollSampleForFlow(flow.trigger);
    if (!fetchResult.ok || !fetchResult.records || fetchResult.records.length === 0) {
      return {
        ok: false,
        error: fetchResult.error ?? "La conexión no trajo registros — nada que simular.",
      };
    }
    externalData = new Map();
    externalData.set(pollTriggerKey(flow.trigger), fetchResult.records);
  } else {
    // event: sembrar desde una entidad REAL cuando la haya (spec 039 §B5,
    // CA-03.6). Desde que el motor enriquece el registro, un evento sintético
    // que apunta a `proj-123` —que no existe— no resolvería ninguna entidad y
    // la simulación mostraría los campos nuevos vacíos: exactamente la clase
    // de mentira que 038 combatió. Sin ninguna entidad válida se cae al
    // sintético de ejemplos de siempre, que sigue previsualizando la *forma*
    // del flujo (spec 025 §C).
    events = [
      pickRealSeedEvent(flow.trigger.event, deps.projects) ??
        buildSyntheticEventFromExamples(flow.trigger.event),
    ];
  }

  const result = await runFlowEngine({
    flows: [flowEnabled],
    events,
    externalData,
    projects: deps.projects,
    people: deps.people,
    projectTypes: deps.projectTypes,
    checklistTemplates: deps.checklistTemplates,
    processTemplates: deps.processTemplates,
    trace: true,
    describeOutputs: true,
  });

  const trace = result.traces[flow.id];
  if (!trace) {
    // El trigger no matcheó — el motor no generó traza. Puede pasar con
    // evento sintético si el `EVENT_FIELD_EXAMPLES` no cubre todos los
    // subtipos. Caso raro pero válido: lo reportamos como error de
    // configuración del dry-run.
    return {
      ok: false,
      error:
        "El trigger no matcheó ningún registro de la muestra. Revisa que el tipo de evento y la conexión estén bien configurados.",
    };
  }

  return { ok: true, trace };
}

/** Busca la primera entidad real que satisface lo que el tipo de evento
 * necesita (`EVENT_SEED_REQUIREMENTS`) y arma el evento con
 * `buildSyntheticEvent` — los mismos dos módulos que "Ejecutar ahora" ya usa
 * para resolver "qué entidad necesita cada tipo de evento" (spec 022 §C), sin
 * duplicar esa tabla. Devuelve `undefined` si no hay ninguna entidad que
 * sirva; el llamador cae entonces al sintético de ejemplos. */
function pickRealSeedEvent(
  eventType: DomainEventType,
  projects: Project[],
): DomainEvent | undefined {
  const need = EVENT_SEED_REQUIREMENTS[eventType];
  for (const project of projects) {
    if (need === "none") return buildSyntheticEvent(eventType, { project });
    if (need === "task") {
      const task = project.tasks.find((t) => !t.archived) ?? project.tasks[0];
      if (task) return buildSyntheticEvent(eventType, { project, task });
      continue;
    }
    for (const area of project.areas) {
      if (need === "area") return buildSyntheticEvent(eventType, { project, area });
      for (const checklist of area.checklists) {
        if (need === "checklist") {
          return buildSyntheticEvent(eventType, { project, area, checklist });
        }
        const item = checklist.items[0];
        if (item) return buildSyntheticEvent(eventType, { project, area, checklist, item });
      }
    }
  }
  return undefined;
}

/** Construye un `DomainEvent` sintético representativo para dry-run de un
 * flujo de evento, sin exigir una entidad real — último recurso cuando el
 * usuario no tiene ninguna entidad que sirva de semilla. Usa los campos
 * **crudos** de `EVENT_FIELD_EXAMPLES` (`variables.ts`): el enriquecimiento de
 * esa tabla es lo que el motor añade, no lo que un `DomainEvent` lleva. */
function buildSyntheticEventFromExamples(eventType: DomainEventType): DomainEvent {
  const fields = rawEventFields(eventType);
  // `DomainEvent` es un discriminated union por `type`; los examples
  // incluyen `type: <DomainEventType>` que coincide con el discriminador.
  // El cast es seguro porque el shape del registro es exactamente el que
  // el motor espera (`eventToSource` extrae projectId/areaId/taskId
  // Leyendo el registro crudo — ver engine.ts:355-363).
  return { ...fields } as unknown as DomainEvent;
}