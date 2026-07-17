# Design — Spec 026 · Interpolación confiable, llenado real de objetos y webhooks configurables

> Documento técnico de la spec 026. Captura las decisiones de diseño no triviales
> antes de codear, para que `tasks.md` se ejecute sin ambigüedad. Cada afirmación
> sobre el "estado actual" está anclada a archivo:línea verificados en la auditoría
> del 2026-07-16.

## 1. Decisiones ratificadas

| # | Decisión | Rationale |
|---|---|---|
| D1 | Un único módulo `src/flows/interpolation.ts` como fuente de verdad de interpolación + tokenizado (motor, validación UI, vistas previas). | Hoy el regex vive duplicado en `engine.ts:1083` y `variables.ts:113` y ya divergieron en efecto: el motor deja el token literal, el validador lo ignora. |
| D2 | Token `{{...}}` acepta cualquier contenido salvo `}}`, con trim de bordes. Resolución: clave literal completa → path anidado por puntos. | Sheets genera claves con espacios/acentos (`sheets-poller.ts:31`); HubSpot anida en `properties.*`. El `\w`-only actual rechaza ambos en silencio. |
| D3 | Token no resuelto → `defaultValue ?? ""` (nunca `{{x}}` literal) + se acumula en `unresolved[]`. | Un `{{x}}` literal en el título de una tarea real es peor que vacío, siempre que el hueco sea visible (hint + preview + traza). No se bloquea el guardado ni la ejecución (misma filosofía no-code que 025 §B). |
| D4 | Sintaxis de default `{{campo||valor}}`. | Barato en el módulo nuevo; resuelve el caso legítimo "el campo a veces no viene" sin bloquear. |
| D5 | `createProject.fields.source` bimodal: contiene `{{` → template interpolable; si no → path crudo. | Retrocompat con flujos guardados (paths crudos) + coincide con lo que la UI ya sugiere (picker inserta `{{}}`). |
| D6 | Payload de webhook con dos modos: "Registro completo" (default, `payload` ausente) / "Personalizado" (filas clave→valor con `InterpolableField`). Sin editor JSON libre en v1. | El schema (`payload: z.record(z.unknown()).optional()`) ya soporta ambos. El modo clave/valor no puede producir JSON inválido — apto para no-code. |
| D7 | "Probar webhook" hace un POST **real** con `ConfirmDialog` explícito, usando `lastSample[previewRecordIndex]`. La vista previa del payload es pasiva (sin red). | Mismo criterio que el botón "Ejecutar" de 025 §D: una prueba de envío no puede fingirse. |
| D8 | `assigneeId` interpolado se resuelve contra Personas: `id` → email (case-insensitive) → nombre exacto; sin match → `undefined` + traza advierte. | Hoy `{{email}}` produce un `assigneeId` = string del email (id huérfano, la UI muestra "sin responsable"). |
| D9 | `dueDate` interpolado se coacciona a `YYYY-MM-DD`: ISO → recorte; epoch-ms (13 dígitos, HubSpot) → conversión; no parseable → sin fecha + traza advierte. No se adivinan formatos locales ambiguos (`DD/MM/YYYY`). | `{{closedate}}` de HubSpot llega como epoch-ms y rompe el formato que la app espera. |
| D10 | `==`/`!=` coaccionan numéricamente cuando **ambos** lados son coercibles (mismo `toComparableNumber` de 024 §F6); si no, comparación estricta actual. | `"5000" == 5000` falla hoy en silencio — mismo patrón que 024 §F6 ya corrigió para `>`/`<`. |

## 2. Módulo de interpolación — `src/flows/interpolation.ts` (NUEVO)

Absorbe `interpolateString`/`interpolateObject`/`getNestedValue` de `engine.ts:1073-1104` y el
tokenizado de `variables.ts:113`. El engine y la UI importan de aquí — cero regex duplicado.

```ts
/** Cualquier contenido salvo `}}`, no-greedy, con espacios de borde recortados
 * por el capture group `[^}]+?` + trim explícito en parseTokens. Reemplaza el
 * `\{\{(\w+(?:\.\w+)*)\}\}` ASCII-only que rechazaba "Nombre Cliente"/"Teléfono". */
export const TOKEN_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

export interface ParsedToken {
  raw: string;          // "{{ campo || def }}"
  path: string;         // "campo"
  defaultValue?: string; // "def"
}

export function parseTokens(template: string): ParsedToken[] { /* ... */ }

/** Resuelve `path` contra `data`: primero como CLAVE LITERAL COMPLETA
 * (`data["Nombre Cliente"]`, `data["properties.amount"]` si existiera tal cual),
 * después como PATH ANIDADO por puntos (`properties` → `amount`). El orden
 * importa: una columna de Sheets literalmente llamada "a.b" gana sobre el path
 * `a`→`b`. */
export function resolvePath(data: Record<string, unknown>, path: string): unknown { /* ... */ }

export interface InterpolationResult {
  value: string;
  /** Paths de tokens que no resolvieron a un valor definido (y no tenían
   * default). Alimenta el hint ámbar y la traza. */
  unresolved: string[];
}

export function interpolateString(template: string, data: Record<string, unknown>): InterpolationResult {
  const unresolved: string[] = [];
  const value = template.replace(TOKEN_RE, (raw) => {
    const { path, defaultValue } = parseToken(raw);
    const resolved = resolvePath(data, path);
    if (resolved === undefined || resolved === null) {
      if (defaultValue !== undefined) return defaultValue;
      unresolved.push(path);
      return "";                       // ← nunca deja `{{x}}` literal (D3)
    }
    return typeof resolved === "string" ? resolved : String(resolved);
  });
  return { value, unresolved };
}

/** Versión recursiva para objetos (payload de webhook). Devuelve el objeto
 * interpolado + la unión de todos los `unresolved` de sus valores string. */
export function interpolateObject(
  obj: Record<string, unknown>,
  data: Record<string, unknown>
): { value: Record<string, unknown>; unresolved: string[] } { /* ... */ }
```

**Compatibilidad hacia atrás:** todo token `\w`-only actual (`{{dealname}}`, `{{properties.amount}}`)
resuelve idéntico — `resolvePath` prueba clave literal (falla) y luego path anidado (acierta), igual
que el `getNestedValue` actual. No hay migración de datos.

**Nota sobre el shape de retorno:** hoy `engine.interpolateString` devuelve `string`. El nuevo
devuelve `{ value, unresolved }`. Los call sites del engine se actualizan para leer `.value` y
empujar `.unresolved` a la traza (§5). Es el único cambio invasivo — mecánico y cubierto por tipos.

## 3. `evaluateCondition` — coerción de `==`/`!=` (D10)

```ts
// engine.ts:428-431 hoy:
case "==": return value === target;
case "!=": return value !== target;

// Después:
case "==":
case "!=": {
  const a = toComparableNumber(value);   // reusa el helper de 024 §F6
  const b = toComparableNumber(target);
  const equal = a !== null && b !== null ? a === b : value === target;
  return condition.op === "==" ? equal : !equal;
}
```

Solo coacciona cuando **ambos** lados son numéricos-como-string/número. `"active" == "active"` sigue
por la rama estricta. Sin cambio de schema.

## 4. Llenado real de campos (Fase B)

### 4.1 `setField` — `engine.ts:919-930`
```ts
// Hoy: const updated = { ...project, [output.field]: output.value, ... };
// Después: si output.value es string, interpolarlo antes de asignar.
const rawValue = output.value;
const value = typeof rawValue === "string"
  ? interpolateString(rawValue, data).value
  : rawValue;
const updated = { ...project, [output.field]: value, updatedAt: nowIso() };
```
`describeOutput` (`engine.ts:600-615`) idem para el plan. Los `unresolved` se acumulan en el output
trace.

### 4.2 `createProject.fields` — `engine.ts:807-812` (D5)
```ts
for (const mapping of output.fields) {
  const value = mapping.source.includes("{{")
    ? interpolateString(mapping.source, data).value   // template
    : getNestedValue(data, mapping.source);            // path crudo (retrocompat)
  if (value !== undefined && value !== "") {
    (project as Record<string, unknown>)[mapping.target] = value;
  }
}
```
> El guard `value !== ""` evita escribir un string vacío cuando un token no resolvió — mejor dejar
> el campo del proyecto en su default que pisarlo con "".

### 4.3 `createPerson` — `engine.ts:858-904` (matchSource + resolvePath)
- `CreatePersonOutputSchema` gana `matchSource?: string` (template opcional, ej. `{{properties.email}}`).
- Valor de match: `output.matchSource ? interpolateString(output.matchSource, data).value :
  String(resolvePath(data, output.matchField) ?? "")` — soporta `properties.email` anidado.
- Los fallbacks `data.name`/`data.email` (`engine.ts:886-895`) pasan por `resolvePath`.

### 4.4 `createTask.assigneeId` — `engine.ts:846` (D8)
```ts
function resolvePersonId(interpolated: string, people: Person[]): string | undefined {
  if (!interpolated) return undefined;
  const byId = people.find((p) => p.id === interpolated);
  if (byId) return byId.id;
  const lower = interpolated.toLowerCase();
  const byEmail = people.find((p) => p.email?.toLowerCase() === lower);
  if (byEmail) return byEmail.id;
  const byName = people.find((p) => p.name === interpolated);
  return byName?.id;   // undefined si nada matchea → tarea sin responsable + traza advierte
}
```

### 4.5 `createTask.dueDate` — `engine.ts:847` (D9)
```ts
function coerceDueDate(interpolated: string): { value: string | undefined; warning?: string } {
  if (!interpolated) return { value: undefined };
  // epoch-ms (HubSpot closedate): 13 dígitos
  if (/^\d{13}$/.test(interpolated)) {
    return { value: new Date(Number(interpolated)).toISOString().slice(0, 10) };
  }
  const d = new Date(interpolated);
  if (!Number.isNaN(d.getTime())) return { value: d.toISOString().slice(0, 10) };
  return { value: undefined, warning: `Fecha no reconocida: "${interpolated}"` };
}
```

### 4.6 Schema bump
`matchSource` opcional → **`SCHEMA_VERSION` 12 → 13** en `common.ts`, paso identidad
`{ to: 13, up: (data) => data }` en `migrations.ts` array `flows` (mismo patrón que v11→v12).

## 5. Traza: valores finales interpolados (Fase E)

```ts
export interface FlowRunOutputTrace {
  type: Output["type"];
  outcome: "executed" | "skipped" | "error";
  reason?: string;
  mutatedProjectIds: string[];
  plan?: string;
  /** NUEVO (spec 026 §E): campos finales interpolados por output, para depurar
   * "por qué salió vacío" sin adivinar. Valores truncados (120 chars), SIN
   * secretos (secret de webhook / body de email no se persisten — 024 §F4). */
  resolved?: Record<string, string>;
  /** NUEVO: tokens `{{x}}` que no resolvieron en ningún campo de este output. */
  unresolvedTokens?: string[];
}
```

`executeOutput` puebla `resolved` por tipo:
- `createTask` → `{ title, assigneeId?, dueDate? }` (post-resolución de persona/fecha).
- `createProject` → `{ name }` (+ cada `fields[*].target`).
- `createPerson` → `{ match: "email=..." }`.
- `setField` → `{ [field]: value }`.
- `createNotification` → `{ message }`.
- `webhook` → `{ host, payloadKeys }` (**nunca** el secret ni el body completo).
- `email` → `{ to, subject }` (**no** el body).

`FlowRunTraceView.OutputRow` (`FlowRunTraceView.tsx:27-66`) renderiza `resolved` como pares
clave→valor compactos y `unresolvedTokens` como chips ámbar "«token» quedó vacío". El `DebuggerPanel`
(025 §C) lo hereda gratis porque reusa `FlowRunTraceView`.

## 6. Webhook configurable (Fase C)

### 6.1 UI — `ActionConfigFields.tsx` caso `webhook` (hoy `:579-601`)
```
┌─ Webhook ──────────────────────────────────────┐
│ URL:    [https://…]           (validación live) │
│ Secret: [•••••]                                 │
│ Payload: (○) Registro completo  (●) Personalizado│
│   ┌─ modo Personalizado ─────────────────────┐  │
│   │ cliente  = [{{Nombre Cliente}}]  {{}} 🔧  │  │  ← InterpolableField
│   │ monto    = [{{amount}}]          {{}} 🔧  │  │
│   │ [+ Añadir campo]                          │  │
│   └───────────────────────────────────────────┘  │
│ ▸ Vista previa del envío  (pasiva, sin red)     │
│   { "cliente": "ACME", "monto": "5000" }        │  ← interpolado con lastSample
│ [Probar webhook]  → ConfirmDialog → POST real   │
└──────────────────────────────────────────────────┘
```
- Modo "Registro completo": `output.payload` ausente (comportamiento actual — el motor envía el
  registro transformado, `engine.ts:969-971`).
- Modo "Personalizado": filas clave→valor persistidas en `output.payload` (schema ya lo soporta,
  **sin migración**). El valor es un `InterpolableField` (§7).
- Vista previa: `interpolateObject(output.payload ?? data, sampleRecord)` — tokens no resueltos
  resaltados en ámbar. Pasiva.

### 6.2 Builder de request compartido — `src/flows/webhook-request.ts` (NUEVO)
Extrae de `engine.ts:968-1022` la construcción de la request (payload interpolado + `signPayload` +
headers `X-Hito-*`) a una función pura, para que el motor y "Probar webhook" no dupliquen la firma:
```ts
export async function buildWebhookRequest(
  output: WebhookOutput, data: Record<string, unknown>
): Promise<{ url: string; init: RequestInit; payload: Record<string, unknown>; unresolved: string[] }>
```
`engine.ts` webhook y `webhook-test.ts` (§6.3) lo consumen.

### 6.3 Prueba de envío — `src/flows/webhook-test.ts` (NUEVO)
```ts
export async function testWebhook(
  output: WebhookOutput, sampleRecord: Record<string, unknown>
): Promise<{ ok: boolean; status?: number; responseText?: string; error?: string }>
```
Un POST real con `buildWebhookRequest`, `AbortSignal.timeout(10_000)`, devuelve status + primeros
~500 bytes de la respuesta. La UI lo invoca tras un `ConfirmDialog` (D7). Verde/rojo inline.

### 6.4 `describeOutput` webhook — `engine.ts:645-661`
El plan del dry-run pasa de mostrar solo las keys a mostrar el payload interpolado completo
(truncado), coherente con la vista previa del drawer.

## 7. Componentes UI compartidos (Fase D)

### 7.1 Promover `InterpolableField` a componente propio
Hoy es local a `ActionConfigFields.tsx:36-64` (Input + VariablePicker). Se mueve a
`src/features/flows/canvas/InterpolableField.tsx` y absorbe:
- `VariablePicker` (ya lo tiene),
- `VariableValidationHint` (hoy montado a mano tras cada campo — algunos lo tienen, otros no, ej.
  `createProject.fields.source` en `:361-372` no),
- `InterpolationPreview` (§7.2).

Un solo componente coherente reemplaza los tres montados por separado en 15 sitios.

```tsx
interface InterpolableFieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  variables: AvailableVariable[];
  sample?: Record<string, unknown>[];   // para la vista previa
  previewRecordIndex?: number;
  type?: string;
}
```

### 7.2 `InterpolationPreview` — `src/features/flows/canvas/InterpolationPreview.tsx` (NUEVO)
Presentación pura sobre el módulo §2. Sin muestra → no renderiza (cero ruido).
```tsx
export function InterpolationPreview({ template, sample, recordIndex = 0 }: Props) {
  if (!sample?.length || !template.includes("{{")) return null;
  const { value, unresolved } = interpolateString(template, sample[recordIndex] ?? {});
  return (
    <p className="text-xs text-muted-foreground">
      Vista previa: <span className="font-medium">"{value}"</span>
      {unresolved.length > 0 && (
        <span className="ml-1 text-warning">({unresolved.length} sin resolver)</span>
      )}
    </p>
  );
}
```

### 7.3 Selector de registro en `SampleExplorer`
`SampleExplorer.tsx` gana un selector "Registro 1/2/3" cuando `sample.length > 1`, que setea
`previewRecordIndex` (estado nuevo en `FlowCanvas`, prop bajada a todos los drawer). Cambia qué
registro alimenta TODAS las vistas previas del canvas.

### 7.4 `validateVariables` sobre el tokenizador compartido
`variables.ts:107-124` reescribe su `TOKEN_RE` local para usar `parseTokens` del módulo §2 — el hint
ámbar por fin dispara para `{{Nombre Cliente}}` (hoy su regex `\w`-only lo ignora, igual que el
motor). Comportamiento de "available vacío → valid: true" se mantiene.

## 8. Selects de campo destino (Fase B)
- `setField.field` (hoy `Input` libre, `ActionConfigFields.tsx:527`) → `Select` con
  `INTERNAL_TARGET_FIELDS.project` (`variables.ts:136-159`) + opción "otro…" (input libre) para no
  bloquear campos avanzados.
- `createProject.fields[*].target` (hoy `Input` libre, `:375-384`) → mismo patrón.

Reduce el error "escribí un nombre de campo que el proyecto no tiene y no se llenó nada".

## 9. Contrato del motor: invariante de interpolación
Tras esta spec, **todo** valor que la UI presenta como interpolable (`{{}}`) pasa por el módulo §2 en
runtime. Regla de oro para revisión: si un `case` de `executeOutput` asigna un campo desde
`output.<x>` donde la UI mostró un `InterpolableField`/`VariablePicker`, ese `<x>` DEBE ir por
`interpolateString`. Los tres incumplimientos actuales (setField value, createProject.fields.source,
createPerson.matchField) son exactamente los que esta spec cierra.

## 10. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Cambiar el shape de retorno de `interpolateString` (string → objeto) rompe call sites. | Cambio mecánico cubierto por el compilador; cada call site lee `.value`. Tests de `engine.test.ts` existentes protegen el comportamiento. |
| Un template legacy con `{{algo}}` que hoy queda literal *a propósito*. | No hay caso legítimo de querer `{{}}` literal en estos campos; la traza (§5) lo hace visible si ocurre. |
| Retrocompat de `createProject.fields`: flujos con paths crudos. | La rama template solo activa con `{{`; sin `{{` → `getNestedValue` como hoy. Test de ambos caminos. |
| "Probar webhook" es un POST real a producción. | `ConfirmDialog` explícito (D7), mismo criterio que "Ejecutar" 025 §D. Solo un registro. |
| `resolved` en la traza infla `flow-runs`. | Valores truncados a 120 chars; `MAX_TRACE_RECORDS=5` y `RUN_LOG_CAP=200` ya acotan. Secretos/bodies excluidos. |
| `dueDate` epoch-ms vs segundos ambiguo. | Solo se trata como epoch-ms si son 13 dígitos exactos; 10 dígitos (epoch-s) caería a `new Date(string)` que los interpreta mal — documentado como fuera de v1 (HubSpot usa ms). |

## 11. Métrica de aceptación
Al cierre: una persona no técnica arma un flujo Sheets→crear tarea usando el `VariablePicker` para una
columna con espacios/acentos, ve la vista previa con el valor real antes de ejecutar, corre el flujo y
la tarea real lleva ese valor (no `{{Columna}}` literal). Es el síntoma reportado, resuelto y visible.
