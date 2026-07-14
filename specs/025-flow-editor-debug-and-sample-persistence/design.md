# Design — Spec 025 · Editor de flujos: muestra persistente, variables sincronizadas, dry-run

> Documento técnico de la spec 025. Captura las decisiones de diseño no triviales
> antes de empezar a codear, para que `tasks.md` pueda ejecutarse sin ambigüedad.

## 1. Decisiones ratificadas (de las preguntas al usuario)

| # | Decisión | Rativa |
|---|---|---|
| D1 | `FlowRule.lastSample` embebido, cap 3 registros, `lastSampleAt` ISO date. | Schema simple, migración identidad. |
| D2 | Dry-run + ejecución real, ambas desde el editor. | Cumple la petición explícita del usuario. |
| D3 | Advertencia (no bloqueante) para `{{campo}}` huérfano. | Evita fricción no-code; un flujo válido puede guardar con tokens que aparecen en otra muestra. |
| D4 | Spec nueva `025`, 024 se queda como está. | Conserva el roadmap de 024 para issues de motor. |
| D5 | `EventTrigger` dry-run con evento sintético de `EVENT_FIELD_EXAMPLES`, sin pedir entidad real. | El dry-run es previsualización de *forma*; la ejecución real permite elegir. |

## 2. Schema changes

### `FlowRuleSchema` — `src/domain/schemas/flow.ts`

```ts
// Antes (v11):
export const FlowRuleSchema = z.object({
  // ...
  notifyOnFailure: z.boolean().default(true),
  lastRunAt: IsoDate.nullable().default(null),
  runCount: z.number().default(0),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});

// Después (v12):
export const FlowRuleSchema = z.object({
  // ... campos previos sin cambios ...
  notifyOnFailure: z.boolean().default(true),
  /** Hasta 3 registros reales de la última "Probar conexión" exitosa
   *  (spec 025 §A). Se limpia al cambiar de conexión o provider. Se usa
   *  para poblar el selector de variables de condiciones/transform/
   *  acciones al reabrir el editor sin tener que re-probar la conexión.
   *  NO alimenta al motor — solo para autocompletar y validar.
   *  La muestra es solo referencia, cap pequeño para no inflar `flows.json`. */
  lastSample: z.array(z.record(z.unknown())).max(3).optional(),
  lastSampleAt: IsoDate.optional(),
  lastRunAt: IsoDate.nullable().default(null),
  runCount: z.number().default(0),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
```

**`SCHEMA_VERSION` 11 → 12** en `src/domain/schemas/common.ts`.

### Migración — `src/domain/migrations.ts`

```ts
flows: [
  // ... existentes ...
  // v11 -> v12 (spec 025 §A): `FlowRule` gana `lastSample` y
  // `lastSampleAt`. Ambos opcionales/defaulted, sin transformación de
  // datos — campos nuevos no presentes en archivos v11 simplemente
  // quedan `undefined` y la UI los trata como "sin muestra persistida".
  { to: 12, up: (data) => data },
],
```

### `createEmptyFlow` y `duplicateFlow` — `src/flows/migration.ts`

```ts
// `createEmptyFlow`: ya no copia nada porque arranca un flow nuevo. OK.
// `duplicateFlow`: añadir explícito — la copia NO hereda lastSample/lastSampleAt
//   del original (otra conexión puede tener otra muestra, sembrar ids rotos).
export function duplicateFlow(flow: FlowRule): FlowRule {
  return {
    ...flow,                  // copia estructura
    id: uuid(),
    name: `${flow.name} (copia)`,
    enabled: false,
    runCount: 0,
    lastRunAt: null,
    lastSample: undefined,    // NUEVO
    lastSampleAt: undefined,  // NUEVO
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}
```

## 3. Flujo de datos — `triggerSample` → `lastSample`

```
                      (1) Probar conexión con éxito
                                  │
                                  ▼
   TriggerStep ───── onSampleChange?.(result.sample) ──────► FlowCanvas
                                    │                          │
                                    │                          │ setTriggerSample(sample)
                                    │                          │
                                    │                          │ onSampleChange?.(sample)
                                    ▼                          ▼
                                 FlowBuilderPage: setFlow(prev => ({
                                   ...prev,
                                   lastSample: sample.slice(0, 3),    // CAP 3
                                   lastSampleAt: new Date().toISOString(),
                                 }))
                                    │
                                    ▼
                       handleSave() persiste flow.lastSample → flows.json

Reabrir editor:
   useFlowStore.hydrate() → flows.json → flow.lastSample
   FlowBuilderPage useEffect (loadedFlowId):
     setGraph(...);
     setInitialSample(flow.lastSample);    // nuevo estado local
   <FlowCanvas initialGraph={...} initialSample={flow.lastSample}
       onSampleChange={...} />
   FlowCanvas init: const [triggerSample, setTriggerSample] = useState(initialSample);
```

**Invariante:** `lastSample.length` siempre ≤ 3 (Zod enforce `.max(3)`).
**Limpieza:** al cambiar `connectionId` o `provider`, `TriggerStep` emite
`updateFlow({ lastSample: undefined, lastSampleAt: undefined })` — el guardado posterior
los omite del JSON (Zodstripa `undefined`).

## 4. `deriveAvailableVariables` — fallback para poll sin muestra

```ts
// Estado actual (variables.ts:40-58):
// - sample presente → usa union de keys de los registros
// - trigger.type === "event" sin sample → usa EVENT_FIELD_EXAMPLES
// - trigger.type === "poll" sin sample → []  (gap que cerramos)

// Estado nuevo:
export function deriveAvailableVariables(
  trigger: Trigger,
  sample?: Record<string, unknown>[]
): AvailableVariable[] {
  // 1. sample real gana
  if (sample && sample.length > 0) {
    // ... same ...
  }
  // 2. fallback event
  if (trigger.type === "event") {
    // ... same ...
  }
  // 3. fallback poll: usar config.fields (HubSpot elegidos) o
  //    HUBSPOT_FIELDS_BY_TYPE (defaults si el usuario no eligió ninguno)
  if (trigger.type === "poll") {
    const fields =
      trigger.config.fields.length > 0
        ? trigger.config.fields
        : trigger.provider === "hubspot"
          ? HUBSPOT_DEFAULT_FIELDS_FOR_OBJECT_TYPE[
              trigger.config.objectType ?? "contacts"
            ]
          : [];
    return fields.map((field) => ({ field, example: undefined }));
  }
  return [];
}

const HUBSPOT_DEFAULT_FIELDS_FOR_OBJECT_TYPE: Record<string, string[]> = {
  contacts: ["email", "firstname", "lastname", "company", "phone"],
  deals: ["dealname", "amount", "dealstage", "closedate", "pipeline"],
  tickets: ["subject", "content", "hs_ticket_priority"],
};
```

**Test afectado:** `variables.test.ts:39-42` ("returns an empty list for a poll
trigger with no sample") debe cambiarse para usar un `pollTrigger` con
`config.fields: []` Y `provider: "google-sheets"` (no hay defaults conocidos). El
test existente con `config.fields: ['email',...]` (línea 13-15) ahora espera que
se devuelvan esos campos — test debe actualizarse a la nueva expectativa.

## 5. `validateVariables` — util nuevo

```ts
export interface VariableValidation {
  valid: boolean;
  missing: string[];        // tokens no presentes en `available`
  unknown: string[];        // alias de `missing` (compatibilidad)
}

export function validateVariables(
  template: string,
  available: AvailableVariable[]
): VariableValidation {
  const availableFields = new Set(available.map((v) => v.field));
  // Soporta nested paths: {{record.email}} → "record.email"
  const TOKEN_RE = /\{\{(\w+(?:\.\w+)*)\}\}/g;
  const missing: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(template)) !== null) {
    const path = m[1];
    // Comparar por path completo O por la última parte (para {{record.email}}
    // cuando el sample tiene solo "email").
    const top = path.split(".")[0];
    if (!availableFields.has(path) && !availableFields.has(top)) {
      missing.push(path);
    }
  }
  // dedupe
  return {
    valid: missing.length === 0,
    missing: Array.from(new Set(missing)),
    unknown: Array.from(new Set(missing)),
  };
}
```

**Decisión:** comparar por path completo Y por `top` (primera parte) para no romper
cuando el usuario escribe `{{email}}` pero el sample trae `record.email` o
viceversa — el motor (`getNestedValue` en engine.ts:865-872) ya soporta ambos.
Mitigación de falsos positivos: si `available` está vacío (no hay muestra para
poll sin `config.fields`), `validateVariables` devuelve `valid: true` (no
advertir).

## 6. `VariableValidationHint` — componente nuevo

```tsx
// src/features/flows/canvas/VariableValidationHint.tsx
import { AlertCircle } from "lucide-react";
import { validateVariables, type AvailableVariable } from "./variables";

interface Props {
  template: string;
  available: AvailableVariable[];
}

/** Advertencia visual (no bloqueante) de `{{campo}}` huérfano en un
 * campo interpolable. Renderiza un span ámbar con `AlertCircle` y el
 * detalle al lado del input — reusar en `ConditionConfigFields`,
 * `TransformConfigFields` (solo `transformCode` skip — código JS, no
 * template de interpolación), `ActionConfigFields`. Spec 025 §B. */
export function VariableValidationHint({ template, available }: Props) {
  if (available.length === 0) return null;
  const { valid, missing } = validateVariables(template, available);
  if (valid) return null;
  return (
    <p className="flex items-start gap-1.5 text-xs text-warning">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
      <span className="font-mono">{`{{${missing.join("}}, {{")}}}`}</span>
      <span className="text-muted-foreground">
        {missing.length === 1 ? "no está en la muestra" : "no están en la muestra"} —
        verificar.
      </span>
    </p>
  );
}
```

**Cobertura de aplicación (en `ActionConfigFields.tsx`):**
- `createTask`: `title`, `description`, `assigneeId`, `dueDate`, `summary`, `dedupeKey`.
- `createProject`: `name`, `dedupeKey`, cada `fields[*].source`.
- `createPerson`: cada `data[*]` value interpolado.
- `setProjectStatus`: sin interpolación (value literal) — skip.
- `setField`: `value`.
- `createNotification`: `message`.
- `webhook`: no se interpolan valores en su config actual pero el `payload` (=cov-
  record) sí los referencia — no analizar `payload` (es objeto, no string), cubre el
  feedback a nivel del output general con una sola advertencia por output si
  faltan tokens en cualquiera de sus campos.
- `email`: `to`, `subject`, `body`.

**Cobertura en `TransformConfigFields`:**
- No aplicar a `transformCode` (código JS, no template).
- Aplicar a `mapping[*].source` — pero `source` es un path crudo, no un token, así 
  que no aplica. Útil: avisar si el `source` elegido no existe en `available` — pero
  esto ya lo validará la simulación. Documentado: `TransformConfigFields` no usa
  `VariableValidationHint` en v1; el `transformCode` ya tiene "Probar con datos de
  ejemplo".

## 7. `dry-run.ts` — flujo

```ts
// src/flows/dry-run.ts
import type { FlowRule } from "@/domain/schemas/flow";
import { runFlowEngine, type FlowRunTrace } from "./engine";
import { fetchPollSampleForFlow } from "./manual-run";
import { pollTriggerKey } from "./engine";
import { buildSyntheticEvent, EVENT_SEED_REQUIREMENTS }
  from "./synthetic-event";
import { EVENT_FIELD_EXAMPLES } from "@/features/flows/canvas/variables";

export interface DryRunResult {
  ok: boolean;
  error?: string;            // ej. falla de red trayendo sample
  trace?: FlowRunTrace;     // presente si el trigger matcheó
}

export async function dryRunFlow(
  flow: FlowRule,
  deps: {
    projects: Project[];
    people: Person[];
    projectTypes: ProjectType[];
    checklistTemplates: ChecklistTemplate[];
    processTemplates: ProcessTemplate[];
  }
): Promise<DryRunResult> {
  const flowEnabled = { ...flow, enabled: true };   // bypass enabled

  let externalData: Map<string, Record<string, unknown>[]> | undefined;
  let events: DomainEvent[] = [];

  if (flow.trigger.type === "poll") {
    const fetchResult = await fetchPollSampleForFlow(flow.trigger);
    if (!fetchResult.ok) return { ok: false, error: fetchResult.error };
    externalData = new Map();
    externalData.set(pollTriggerKey(flow.trigger), fetchResult.records ?? []);
  } else {
    // event: construir sintético representativo
    const seedKind = EVENT_SEED_REQUIREMENTS[flow.trigger.event];
    const synthetic = buildSyntheticEvent(flow.trigger.event, {
      // buildSyntheticEvent exige entidad real — para dry-run
      // usamos un mock mínimo (sin id real, solo para que
      // resolveTriggerData extraiga los campos del sample).
      // ATENCIÓN: este camino debe implementarse extendiendo
      // synthetic-event.ts con un overload "useSampleFieldsOnly"
      // o construyendo un DomainEvent a mano desde EVENT_FIELD_EXAMPLES.
      // Ver §8 abajo — se prefiere la opción B (más simple).
      ...
    });
    events = [synthetic];
  }

  const result = await runFlowEngine({
    flows: [flowEnabled],
    events,
    externalData,
    trace: true,
    describeOutputs: true,                       // NUEVO flag (ver §9)
    ...deps,
  });

  // Encontrar la traza del primer (único) flow en el resultado
  const trace = result.traces[flow.id];
  return { ok: true, trace };
}
```

## 8. `dryRunFlow` para `event` — decisión de simplify

`buildSyntheticEvent` (espec 022 §C) exige entidad real (project + task/area). Para
el dry-run no queremos obligar al usuario a elegir. **Decisión:** no usar
`buildSyntheticEvent` para el dry-run. En su lugar, construir el evento a mano
desde `EVENT_FIELD_EXAMPLES` (que ya vive en `variables.ts:15-27`):

```ts
// En dry-run.ts, rama event:
const eventFields = EVENT_FIELD_EXAMPLES[flow.trigger.event];
const synthetic = {
  ...eventFields,
} as unknown as DomainEvent;

events = [synthetic];
```

Ventajas: (a) cero dependencia con `buildSyntheticEvent` (que espera tipos
strictos), (b) el dry-run tiene datos representativos, (c) si el flujo
eventualmente matchea una entidad real distinta, la diferencia es visible en el
"Ver en Historial" post-ejecución. Desventaja: el `RecordSource` que extrae el
engine (`eventToSource`, engine.ts:355-363) no tendrá `projectId` real —
afecta al targeting de `createTask` con `projectRef: "trigger"`, que reportará
"Se crearía la tarea, pero el proyecto destino no existe — en runtime se
omitiría" (mensaje honesto, mejor que simular falsamente un proyecto).

**Conclusión:** el dry-run de eventos NO pretende simular una corrida perfecta
contra una entidad real — es previsualización de la *forma* del flujo. La
ejecución real (Fase D) sigue exigiendo elegir entidad real como en spec 022 §C.

## 9. `engine.ts` — flag `describeOutputs`

```ts
// FlowEngineInput gana:
export interface FlowEngineInput {
  // ... existentes ...
  /** Si es true, los outputs se "describen" en vez de ejecutarse (no
   *  mutan projects, no crean personas, no disparan webhooks, no
   *  mandan emails). Cada output devuelve un string `plan` en la
   *  traza (ej. "Se crearía la tarea 'X' en el proyecto 'Y'"). Útil
   *  para el dry-run del editor de flujos (spec 025 §C). */
  describeOutputs?: boolean;
}

// FlowRunOutputTrace gana:
export interface FlowRunOutputTrace {
  type: Output["type"];
  outcome: "executed" | "skipped" | "error";
  reason?: string;
  mutatedProjectIds: string[];
  /** Solo presente cuando `describeOutputs: true` — texto descriptivo
   *  de lo que pasaría (en vez de lo que pasó). Spec 025 §C. */
  plan?: string;
}

// executeOutput gana un parámetro al inicio:
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
  describeOnly: boolean,            // NUEVO
): Promise<OutputExecutionOutcome> {
  if (describeOnly) return describeOutput(output, data, source, flow, projectMap);
  // ... resto sin cambios ...
}

// Nueva función describeOutput — switch por type, retorna { plan, outcome }:
function describeOutput(
  output: Output,
  data: Record<string, unknown>,
  source: RecordSource,
  flow: FlowRule,
  projectMap: Map<string, Project>
): OutputExecutionOutcome {
  switch (output.type) {
    case "createTask": {
      const title = interpolateString(output.title, data);
      const projectId = output.projectId ?? source.projectId ?? "(sin proyecto)";
      const projectName = projectMap.get(projectId)?.name ?? projectId;
      return { mutatedProjectIds: [], outcome: "executed",
        plan: `Se crearía la tarea '${title}' en el proyecto '${projectName}'.` };
    }
    case "createProject": {
      const name = interpolateString(output.name, data);
      return { mutatedProjectIds: [], outcome: "executed",
        plan: `Se crearía el proyecto '${name}'.` };
    }
    // ... y así por cada tipo ...
  }
}
```

**Invariante:** cuando `describeOutputs: true`, `runFlowEngine` rellena solo
`result.traces` y `result.errors`. `newProjects`/`changedProjects`/`notifications`/
`outboundDeliveries`/`emailDeliveries`/`executedFlowIds` quedan vacíos — el caller
del dry-run no debe tocar el store.

## 10. `DebuggerPanel` — UI

```
┌─────────────────────────────────────────────────────────────┐
│ Canvas ReactFlow (left, ~70% ancho en md+)       │ DebuggerPanel (right, ~30%)
│                                                  │
│   [Trigger]                                      │ ┌─ Debugger ─────────────┐
│       ↓                                          │ │                        │
│   [Condition]                                    │ │ Estado actual:         │
│       ↓                                          │ │ • Sin simulación aún.   │
│   [Transform]                                    │ │                        │
│       ↓                                          │ │ [▶ Simular flujo]      │
│   [Action 1] [Action 2]                          │ │ [⚡ Ejecutar]          │
│                                                  │ │                        │
│                                                  │ │ Last sample: 3 reg.    │
│                                                  │ │ · hace 5 min           │
│                                                  │ │                        │
│                                                  │ │ ─ Traza (cuando corre) │
│                                                  │ │  Registro 1            │
│                                                  │ │   ✓ Condición OK       │
│                                                  │ │   Mapeo: { ... }       │
│                                                  │ │   Output 1:            │
│                                                  │ │     Se crearía tarea…  │
│                                                  │ │   Output 2:            │
│                                                  │ │     Se enviaría email… │
│                                                  │ └────────────────────────┘
└─────────────────────────────────────────────────────┘
```

- **Estados del panel:** `idle` | `loading` | `result` | `error`.
- **Loading:** muestra spinner con texto "Simulando…" o "Ejecutando…" según caso.
- **result:** transparenta si es `dry` (gris) vs `real` (verde) por borde
  superior del bloque de traza — el usuario distingue visualmente "esto es una
  simulación que no tocó nada" vs "esto corrió de verdad y persistió".
- **error:** `AlertCircle` rojo con el `message` de error — tanto para dry-run
  (fallo trayendo sample de HubSpot) como para ejecución real (fallo de red del
  webhook). En el modo real, REMITE al "Ver en Historial global" para tracear más
  detalles del run (que va a `flow-runs`).

## 11. `FlowRunTraceView` — extensión para mostrar `plan`

```ts
// En FlowRunTraceView.tsx, función OutputRow:
function OutputRow({ output }: { output: FlowRunOutputTrace }) {
  // ... actual ...
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon className={`... ${color}`} />
      <div className="flex-1">
        <span className="font-medium">{meta.label}</span>{" "}
        {output.plan ? (
          <span className="text-muted-foreground italic">{output.plan}</span>
        ) : (
          <>
            <span className={color}>
              {output.outcome === "executed" ? "ejecutado" : ...}
            </span>
            {output.reason && <p>...{output.reason}</p>}
          </>
        )}
      </div>
    </div>
  );
}
```

Cuando `plan` está presente (dry-run), NO mostrar el badge "ejecutado"/"error" —
solo el plan descriptivo. El `outcome` en dry-run siempre es `"executed"` (el
describe no falla nunca) o `"skipped"` si la resolución de target falló (en ese
caso `plan` describe el skip: `"Se omitiría: …"`).

## 12. Botones en `FlowBuilderPage`

```tsx
// PageHeader actions:
<div className="flex items-center gap-2">
  <Button variant="outline" onClick={() => navigate(ROUTES.flows)}>Cancelar</Button>
  {/* NUEVO — Fase C */}
  <Button variant="outline" onClick={handleDryRun} disabled={isSimulating}
      title={!isEditing ? "Guarda el flujo primero" : undefined}
      disabledtooltip={!isEditing}>
    <Play className="size-4" />
    {isSimulating ? "Simulando..." : "Simular"}
  </Button>
  {/* NUEVO — Fase D */}
  <Button variant="outline" onClick={openRunDialog} disabled={!isEditing}
      title={isEditing ? undefined : "Guarda el flujo primero para poder ejecutarlo"}>
    <Zap className="size-4" />
    Ejecutar
  </Button>
  <Button onClick={handleSave}>
    <Zap className="size-4" />
    {isEditing ? "Guardar Cambios" : "Guardar Flujo"}
  </Button>
</div>
```

Orden lógico: Guardar (primario, derecha) → Ejecutar (outline, realista) →
Simular (outline, no-persistente) → Cancelar (ghost). La separación visual
"primario vs. outline" refuerza que el `dry-run` es exploratorio.

## 13. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| `lastSample` stale (la conexión cambió de config pero no se probó de nuevo). | `TriggerStep` limpia `lastSample` al cambiar `connectionId`/`provider`/`objectType` (no es una prueba explícita, pero rompe la asociación). Validación visual: el badge "Muestra: 3 reg · 13:45" desaparece y se ve "Muestra: 0 reg — probar conexión". |
| Dry-run divergente del real en `createTask` sin `projectId`. | El `plan` describe "Se crearía la tarea 'X' — sin proyecto destino, en runtime se omitiría" — la diferencia es visible y accionable. |
| Token `{{record.email}}` advertido como huérfano si el sample trae `email` sin anidar. | La comparación `top-level vs path` (§5) lo resuelve: `record.email` matchea si `email` está disponible. Test cubre este caso. |
| `flow.lastSample` con registros grandes (objetos nested de HubSpot). | Cap `.max(3)` + registro es `z.record(z.unknown())` (objeto, no array). 3 registros de contacto Anchura ~10 keys. ~200 B/registro. 600 B/flujo. Tolerable. Documentado en el schema. |
| Performance rebuild reactiva al cambiar el sample. | Solo los drawer abiertos recalculan `availableVariables` (`useMemo` barato). El canvas no se re-renderiza — el sample no es dependencia del ReactFlow. |

## 14. Métricas de aceptación (ver también spec.md §Verificación)

- Tiempo para validar visual y sin protrips: `npx playwright test e2e/flow-editor-debug.spec.ts`.
- Criterio subjetivo: al cierre de la Fase E, una persona no técnica puede
  crear/ajustar/probar un flujo HubSpot → Sheets sin salir del editor ni
  escribir a ciegas un nombre de campo. Es la frase "lo más claro y fácil
  posible" traducida en criterio medible.