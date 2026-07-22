# Design 038 — Editor de Flujos: verdad, confianza y simulación visible

> Decisiones técnicas para `spec.md`. Ancladas al código actual (líneas verificadas sobre el
> árbol post-037). Sin cambio de schema.

## 0. Mapa de archivos tocados (previsto)

| Área | Archivos | Naturaleza |
|------|----------|------------|
| A · Estado del nodo | **nuevo** `flows/node-issues.ts`; `canvas/nodeTypes.tsx`, `canvas/FlowCanvas.tsx`, `FlowBuilderPage.tsx` | Proyección pura issues→nodo + consumo por contexto; **borra** los 3 criterios locales |
| B · Etiquetas | **nuevo** `domain/labels` (entrada `providerLabel`); `canvas/meta.ts`, `flows/validation.ts`, `canvas/VariablesPanel.tsx` | Una tabla de proveedores + resumen de `in` |
| C · Deshacer | **nuevo** `canvas/useGraphHistory.ts`; `canvas/FlowCanvas.tsx`, `canvas/CanvasControls.tsx` | Historial por puntos de commit |
| D · Simulación en canvas | **nuevo** `flows/trace-projection.ts`; `FlowBuilderPage.tsx`, `canvas/DebuggerPanel.tsx`, `canvas/FlowCanvas.tsx`, `canvas/nodeTypes.tsx` | Elevar `dryTrace` + proyección pura traza→nodo |
| E · Legibilidad | `canvas/nodeTypes.tsx`, `canvas/CanvasControls.tsx`, **nuevo** `canvas/ShortcutsDialog.tsx` | Numeración, transform vacío, duplicar, atajos |

**Sin cambios de comportamiento** en: `engine.ts` (salvo el test de R2, que no lo modifica),
`applyMapping`, `conditions.ts`, `interpolation.ts`, `graph.ts` (salvo `duplicateNode`),
`migration.ts`, schema `FlowRule`. Sin `schemaVersion` nuevo (Principio II).

---

## 1. Área A — Un solo criterio de "nodo con problema" (HU-01)

### A1. El defecto, con precisión

Tres criterios, tres lugares, ninguno compartido con el validador real:

```ts
// nodeTypes.tsx:159 — trigger
const invalid = data.trigger.type === "poll" && !data.trigger.config.connectionId;
// nodeTypes.tsx:186 — condición
invalid={!data.condition.field}
// nodeTypes.tsx:209-227 — acción: NO PASA `invalid`. Nunca.
```

Mientras tanto `validateFlow` (`validation.ts:100`) ya produce
`{ severity, nodeKind, outputIndex?, message }` para trigger, condiciones, cada output y el
flujo entero — con reglas que el canvas ni siquiera intenta replicar (proyecto destino borrado,
URL malformada, `createdProject` sin `createProject` previo en `validation.ts:210`).

Es el mismo patrón de defecto que spec 026 corrigió en la interpolación (dos regex divergentes)
y 037 en las condiciones (dos evaluadores): **dos fuentes para un solo hecho**.

### A2. Corrección — proyección pura

Nuevo `src/flows/node-issues.ts`:

```ts
export interface NodeIssues {
  errors: FlowIssue[];
  warnings: FlowIssue[];
}

/** Reparte los issues de `validateFlow` entre los nodos del grafo.
 *  - `nodeKind: "trigger"`   → el nodo trigger.
 *  - `"condition"`/`"action"` → el i-ésimo nodo de esa clase, por `outputIndex`.
 *  - `"flow"`                 → ninguno (queda solo en el banner — CA-01.4).
 */
export function nodeIssueMap(
  nodes: Pick<FlowGraphNode, "id" | "data">[],
  issues: FlowIssue[],
): Map<string, NodeIssues>
```

**Por qué el índice funciona:** `compileGraphToRule` (`graph.ts:157`) deriva
`conditions`/`outputs` filtrando el array de nodos por `kind` **en orden de array**, y
`validateFlow` numera sus issues con el índice de esos mismos arrays. Así que el i-ésimo nodo
de clase X ↔ `outputIndex === i`. La misma propiedad que ya explota `FlowIssuesBanner` para
abrir el drawer correcto (`FlowBuilderPage` → `openNodeRequest`).

`nodeIssueMap` es puro y sin DOM → testeable en unidad, y es también la fuente de la numeración
de E1 (mismo recorrido ordenado por clase).

### A3. Cableado

`FlowBuilderPage` ya calcula `issues` (`FlowBuilderPage.tsx:147`) — el canvas no tiene acceso a
`projects` y no debería tenerlo. Se le pasa por prop:

```tsx
<FlowCanvas … issues={issues} />
```

Dentro de `CanvasInner`, `useMemo(() => nodeIssueMap(nodes, issues), [nodes, issues])` y se
publica por **contexto**, igual que `CanvasVariables` (`nodeTypes.tsx:36`) — mismo idioma ya
establecido, y no engorda `node.data` (que sí se persiste en `flow.graph`).

`NodeShell` gana un `issues?: NodeIssues` y renderiza la insignia en la **esquina superior
derecha**, junto al botón de borrar. `TriggerNode`/`ConditionNode` **pierden** su cálculo local
(CA-01.3); `ActionNode` lo gana sin escribir ninguna regla.

El detalle (CA-01.2) va en un `title` con los mensajes + `aria-label` contando los problemas —
no un popover: el drawer está a un clic y el banner ya lista todo, la insignia solo tiene que
decir *cuál* y *cuántos*.

---

## 2. Área B — Una tabla de proveedores (HU-06)

### B1. `providerLabel`

Hoy hay dos ternarios que responden la misma pregunta y **ya divergieron**:

```ts
// meta.ts:83 — dos ramas para tres proveedores → un inbox dice "Google Sheets"
const provider = t.provider === "hubspot" ? "HubSpot" : "Google Sheets";
// validation.ts:104-110 — tres ramas, correcto
… === "hubspot" ? "HubSpot" : … === "inbox" ? "Make/Zapier (inbox)" : "Google Sheets"
```

Una sola tabla, junto a `triggerLabel` (que `meta.ts` y `VariablesPanel` ya importan de
`@/domain/labels`):

```ts
export const providerLabel: Record<PollTrigger["provider"], string> = {
  hubspot: "HubSpot",
  "google-sheets": "Google Sheets",
  inbox: "Make/Zapier (inbox)",
};
```

Un `Record` completo y no una función con `default`: si mañana el enum del schema gana un
proveedor, TypeScript falla en la tabla en vez de etiquetarlo mal en silencio — que es
exactamente cómo nació este defecto.

Consumidores: `triggerSummary`, `validateFlow`, el origen del `VariablesPanel`
(`VariablesPanel.tsx:50`, que hoy dice "Campos elegidos en el poll" sin nombrar de qué).

### B2. Resumen de un `in`

`conditionSummary` (`meta.ts:91`) hace `String(value ?? "")`. Con el array que introdujo 037:

| valor | hoy | debe |
|---|---|---|
| `["won","closed"]` | `stage in won,closed` | `stage in [won, closed]` |
| `"won,closed"` (legacy) | `stage in won,closed` | `stage in "won,closed"` ⚠ |

Los dos casos se ven **idénticos** hoy, y son exactamente el par que 037 enseñó a distinguir:
uno se cumple, el otro no se cumple nunca. El resumen tiene que delatarlo. Extraer un
`formatConditionValue(value)` puro y testearlo con los dos casos.

---

## 3. Área C — Deshacer (HU-02)

### C1. Por qué no suscribirse a `onNodesChange` (R1)

React Flow emite `{ type: "position", dragging: true }` en **cada frame** de un arrastre, y
`{ type: "select" }` en cada clic. Un historial alimentado por ese stream guardaría cientos de
entradas por gesto y `Ctrl+Z` movería el nodo un píxel.

El historial se alimenta de **puntos de commit explícitos** — los mismos lugares donde hoy ya
se llama `setNodes` con una intención semántica:

| Punto de commit | Dónde (post-037) | Etiqueta |
|---|---|---|
| Añadir condición / acción | `FlowCanvas.tsx:258`, `:266` | "Añadir X" |
| Insertar desde una arista | `insertCondition` / `insertAction` | "Insertar X" |
| Borrar nodo (botón o `Supr`) | `deleteNode` (`:230`), `onNodesDelete` | "Borrar X" |
| Duplicar nodo (E3) | nuevo | "Duplicar X" |
| Editar en el drawer | `updateNodeData` (`:223`) | "Editar X" *(coalesce)* |
| Soltar tras arrastrar | `onNodeDragStop` (`:254`) | "Mover" |

`onNodesChange` sigue intacto: mueve y selecciona en vivo, sin tocar el historial. La posición
entra al historial **al soltar** (CA-02.4), que es donde ya se ejecuta
`sortNodesByColumnAndY`.

### C2. Coalescing de las ediciones del drawer (CA-02.3)

`updateNodeData` se dispara **por pulsación** (cada `onChange` de cada `Input`). Sin
tratamiento, escribir un título daría un paso de deshacer por letra.

Regla: `commit(label, coalesceKey?)`. Si `coalesceKey` es igual al de la entrada en el tope de
la pila, **se reemplaza** el tope en vez de apilar. Para las ediciones del drawer la clave es
el `nodeId`, así que una ráfaga de tecleo sobre el mismo nodo colapsa en una entrada; tocar
otro nodo, o cualquier operación estructural (que va sin clave), abre entrada nueva.

Se elige la clave por identidad en vez de un debounce temporal porque no depende de la
velocidad de tecleo — un debounce parte la ráfaga en trozos arbitrarios según cuánto tarde el
usuario en pensar.

### C3. El hook

Nuevo `canvas/useGraphHistory.ts`:

```ts
export function useGraphHistory(opts: {
  nodes: CanvasNode[];
  setNodes: (nodes: CanvasNode[]) => void;
  limit?: number;              // default 50 (CA-02.8)
}): {
  commit: (label: string, coalesceKey?: string) => void;  // guarda el estado PREVIO
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel?: string;          // para el tooltip del botón
}
```

Detalles que deciden si esto se siente bien o mal:

- **`commit` guarda el estado *anterior*.** Se llama justo antes de mutar; deshacer restaura lo
  guardado y empuja el estado actual a la pila de rehacer. Es el modelo que evita el clásico
  "el primer Ctrl+Z no hace nada".
- **Rehacer se limpia** en cuanto se hace una edición nueva.
- **Deshacer/rehacer aplican con `setNodes(snapshot)`**, no con un `onNodesChange`. Las aristas
  son derivadas (`FlowCanvas.tsx` las recalcula con `relinkEdges` en un `useMemo` sobre
  `nodes`), así que se rehacen solas — sin trabajo extra y sin poder desincronizarse.
- **El drawer se cierra solo** si el nodo abierto desapareció: `Dialog open={selectedNode !==
  undefined}` (`FlowCanvas.tsx`) ya lo cubre — se verifica, no se añade nada (CA-02.7).
- **`isDirty` no se toca**: `comparableFlow` (`FlowBuilderPage.tsx:46`) compara **contenido**,
  así que deshacer hasta el estado guardado lo apaga solo (CA-02.6). Propiedad gratis del
  diseño existente; se verifica en el smoke.
- **Snapshot**: copia superficial del array + `data` por nodo. `data` se trata como inmutable
  (`updateNodeData` ya reemplaza el objeto entero), así que no hace falta clonar hondo.

### C4. Teclado (CA-02.5)

El listener vive en el mismo `useEffect` de ventana que ya usa `Esc`
(`FlowCanvas.tsx:129-136`), y **descarta el evento** si el objetivo es editable:

```ts
const el = e.target as HTMLElement | null;
if (el?.closest("input, textarea, select, [contenteditable=true]")) return;
```

Sin esa guarda, `Ctrl+Z` mientras se escribe en el drawer descartaría un nodo entero en vez de
borrar una palabra — el peor resultado posible de un atajo.

Botones (CA-02.2) en `CanvasControls`, junto a zoom/ajustar/maximizar, con `disabled` y el
`undoLabel` en el `title` ("Deshacer: Borrar acción").

---

## 4. Área D — La simulación sobre los nodos (HU-04)

### D1. Fijar primero el contrato del motor (R2)

La proyección depende de que la traza sea posicionalmente 1:1 con la configuración:

- `recordTrace.conditions` se construye de un solo `map` sobre `flow.logic.conditions`
  (`engine.ts:559` → `evaluateConditionsDetailed`), así que la correspondencia es exacta.
- `recordTrace.outputs` se empuja dentro del bucle de outputs en orden, tanto en el camino de
  éxito como en el de error, y la política "detener" empuja los restantes como `skipped` — así
  que también es 1:1 **siempre que el bucle se ejecute**.
- Si las condiciones no pasan, el motor hace `continue` (`engine.ts:306`) y `outputs` queda
  **vacío**. Ese caso es CA-04.3, y hay que tratarlo explícitamente: vacío ≠ "todas omitidas
  por error", significa "no se llegó".

Nada de esto está garantizado por un test hoy: es una propiedad emergente del motor. **T3830
la fija con un test antes de construir UI encima.** Si mañana alguien reordena los `push`, falla
el test del motor y no una pantalla en silencio.

### D2. Proyección pura

Nuevo `src/flows/trace-projection.ts`:

```ts
export type NodeRunStatus =
  | { kind: "condition"; passed: boolean; actual: unknown; expected: unknown; op: string }
  | { kind: "transform"; error?: string }
  | { kind: "action"; outcome: "executed" | "skipped" | "error" | "not-reached";
      reason?: string; plan?: string; unresolvedTokens?: string[] };

export function projectTrace(
  nodes: Pick<FlowGraphNode, "id" | "data">[],
  record: FlowRunRecordTrace,
): Map<string, NodeRunStatus>
```

Mismo recorrido ordenado-por-clase que `nodeIssueMap` (§A2), aplicado a
`record.conditions[i]` / `record.outputs[i]`. `"not-reached"` es un estado **de la proyección,
no del motor** — se sintetiza cuando `record.outputs` está vacío y `conditionsPassed === false`.
Puro y sin DOM.

### D3. De quién es el estado de la traza

Hoy `dryTrace` es estado local de `DebuggerPanel` (`DebuggerPanel.tsx:50`). El canvas y el panel
son hermanos bajo `FlowBuilderPage`, así que la traza sube al padre:

- `FlowBuilderPage` pasa a `DebuggerPanel` un `onDryRunResult(trace)` y guarda
  `{ trace, atSignature }`.
- `FlowCanvas` recibe `runProjection` (el `Map` de D2 ya calculado) + el índice de registro.
- **La vista textual del panel no cambia** (CA-04.8): sigue renderizando `FlowRunTraceView`
  igual, solo que leyendo la traza de props.

`atSignature` es `comparableFlow(currentFlow)` (`FlowBuilderPage.tsx:46`) capturado al simular.
Si deja de coincidir con el actual → la proyección se marca **desactualizada** (CA-04.7) con una
etiqueta en la barra de simulación, sin borrarse. Reusa una función que ya existe y que ya se
usa para detectar cambios reales: no hay que inventar un hash.

### D4. UI, sin chocar con Área A (R3)

Dos canales visuales, deliberadamente distintos:

| | Configuración (A) | Simulación (D) |
|---|---|---|
| Dónde | esquina superior del nodo | franja al pie del nodo |
| Cuándo | siempre que haya issues | solo con proyección activa |
| Forma | insignia con contador | etiqueta con verbo ("se cumple", "se ejecutaría") |

Barra de simulación en el canvas (`Panel` de React Flow, como `CanvasControls`) con: selector de
registro (CA-04.5), aviso de desactualizada, y botón **Limpiar** (CA-04.6). El estado va en
texto además de color (design §6): "no se cumple", "no alcanzada", "error".

---

## 5. Área E — Legibilidad (HU-03, HU-05)

- **E1 · Numeración (CA-05.1).** El índice sale del mismo recorrido ordenado por clase de §A2
  (`nodes.filter(kind).indexOf(id)`), así que numeración, issues y proyección **no pueden
  desincronizarse entre sí**: los tres derivan del mismo orden que compila el motor. Se pinta
  junto a la etiqueta de tipo del `NodeShell`.
- **E2 · Transform vacío (CA-05.2).** Cuando `mapping.length === 0 && !transformCode`, borde
  punteado + opacidad reducida + etiqueta "opcional". Sigue siendo un nodo fijo y no borrable
  (invariante de 036); solo deja de competir visualmente con los pasos que sí hacen algo.
- **E3 · Duplicar (HU-03).** `duplicateNode(nodes, id)` en `graph.ts`, junto a
  `newConditionNode`/`newActionNode`: id nuevo, `data` clonado, `y` a media fila por debajo del
  original + `sortNodesByColumnAndY` → queda **justo después** en el orden de ejecución
  (CA-03.2). Rechaza trigger/transform (CA-03.3). Botón en el nodo (junto a la X) y `Ctrl+D`
  sobre la selección. Es un punto de commit del historial (CA-03.4).
- **E4 · Atajos (CA-05.3).** `ShortcutsDialog.tsx` — botón `?` en `CanvasControls` que abre una
  tabla de atajos. Reusa `Dialog`. Incluye `Ctrl+S`, que hoy solo vive en un `title` del botón
  Guardar (`FlowBuilderPage.tsx:365`).

---

## 6. Accesibilidad

- Insignia de issues: `aria-label` con la cuenta y la severidad ("2 errores de configuración"),
  no solo color.
- Estado de simulación: verbo en texto; el color acompaña, no informa solo.
- Botones deshacer/rehacer: `aria-disabled` coherente con `canUndo`/`canRedo`, `title` con la
  operación concreta.
- `ShortcutsDialog` navegable por teclado y anunciable; los atajos también en `aria-keyshortcuts`
  donde aplique.
- Numeración: no puede ser el único diferenciador entre dos nodos — acompaña al resumen, no lo
  reemplaza.
- Contraste AA en claro y oscuro para insignias y franjas nuevas; se verifica en el smoke.

## 7. Verificación (por fase)

- `tsc --noEmit` limpio · Vitest completo verde (baseline **713**) · `vite build` OK · lint sin
  errores nuevos (3 preexistentes conocidos en `ai/gemini/agent.ts`,
  `ai/modelSelector.test.ts`, `hooks/useBreakpoint.ts` — no se tocan).
- **Tests nuevos (unidad, sin DOM):**
  - `nodeIssueMap`: reparto por clase e índice; `"flow"` no cuelga de ningún nodo; nodo sin
    issues ausente del mapa; el i-ésimo nodo recibe el `outputIndex` i.
  - `providerLabel` / `triggerSummary`: los **tres** proveedores, con el inbox como caso que
    hoy falla; `formatConditionValue` con array vs. string legacy.
  - **`engine`: el contrato posicional de R2** — un flujo con 3 outputs y política "detener"
    produce `outputs.length === 3` con el fallo en su índice; condiciones que no pasan producen
    `outputs: []` y `conditionsPassed: false`.
  - `projectTrace`: mapeo condición/acción por índice; `"not-reached"` cuando la traza no llegó
    a los outputs; transform con error.
  - `useGraphHistory` (lógica pura extraída del hook): coalescing por clave, tope del historial,
    rehacer se limpia al editar.
  - `duplicateNode`: id nuevo, data equivalente, posición posterior, rechazo de trigger/transform.
- **Smoke visual del usuario** (no hay Playwright en el repo): ver §8.

## 8. Guion de smoke (resumen)

1. **Issues en el canvas:** webhook sin URL, email sin conexión y `createTask` con proyecto
   borrado → los tres nodos marcan error; el trigger sin conexión también; un token huérfano
   marca ámbar. Arreglar uno lo apaga en vivo.
2. **Deshacer:** borrar un nodo con `Supr` → `Ctrl+Z` lo devuelve con su configuración. Escribir
   un título largo → **un** `Ctrl+Z` lo borra entero, no letra a letra. `Ctrl+Z` con el cursor
   dentro del input deshace el texto, no el nodo. Deshacer hasta el estado guardado apaga el
   aviso de cambios sin guardar.
3. **Duplicar:** duplicar una acción configurada → aparece debajo, con todo copiado; `Ctrl+Z` la
   quita. Trigger y Transformar no ofrecen duplicar.
4. **Simulación:** "Simular flujo" → cada condición muestra si se cumplió y con qué valor real;
   las acciones muestran su plan. Con una condición que no se cumple, las acciones dicen **no
   alcanzada**. Cambiar de registro cambia la proyección. Editar un nodo la marca
   desactualizada. "Limpiar" la quita y el `DebuggerPanel` sigue mostrando su traza textual
   igual que hoy.
5. **Etiquetas:** un flujo con trigger de **inbox** dice "Make/Zapier (inbox)" en el nodo y en
   el panel de Variables — no "Google Sheets". Una condición `in` con dos valores se resume
   `campo in [a, b]`; una legacy con string se resume entrecomillada.
6. **Legibilidad:** condiciones y acciones numeradas 1..n; arrastrar una acción por encima de
   otra y soltar renumera. El Transformar vacío se ve secundario. El botón `?` lista los atajos.
