# Design 036 — Canvas de Flujos: interacción + variables

> Decisiones técnicas para `spec.md`. Ancladas al código actual. Sin cambio de schema.

## 0. Mapa de archivos tocados (previsto)

| Área | Archivos | Naturaleza |
|------|----------|------------|
| A · Maximizar | `FlowCanvas.tsx` | Estado `maximized` + overlay `fixed inset-0` + `fitView` |
| A · Controles zoom | **nuevo** `canvas/CanvasControls.tsx`; `FlowCanvas.tsx` | Reemplaza `<Controls>` por controles propios (`useReactFlow`) |
| B · Interacción nodos | `FlowCanvas.tsx`, `nodeTypes.tsx`, `graph.ts` | Selección/teclado/insertar; helpers de inserción |
| C · Panel variables | **nuevo** `canvas/VariablesPanel.tsx`; `FlowCanvas.tsx`, `SampleExplorer.tsx` | Extraer lógica de campos a hook compartido |
| C · Drag-to-field | `VariablesPanel.tsx`, `InterpolableField.tsx` | `dataTransfer` + drop target |
| C · Input libre | `VariablePicker.tsx` | Footer con input de texto |
| C · Chips en nodos | `nodeTypes.tsx`; **nuevo** helper en `variables.ts` o `meta.ts` | `nodeUsedVariables(data)` + render de chips |
| D · Transform | `TransformConfigFields.tsx` | Link MDN + ayuda inline + separación mapeo/código |

**Sin cambios** en: `engine.ts`, `validation.ts` (se reusa `validateVariables`), `flow.ts`
(schema), `migration.ts`, `compileGraphToRule`. Sin `schemaVersion` nuevo (Principio II).

## 1. Área A — Maximizar + controles

### A1. Maximizar (HU-01)
- Estado `const [maximized, setMaximized] = useState(false)` en `CanvasInner`.
- El wrapper del canvas hoy es
  `<div className="relative h-[calc(100vh-260px)] min-h-[480px] rounded-lg border ...">`.
  En modo maximizado se le aplican, condicionalmente,
  `fixed inset-0 z-50 h-screen rounded-none border-0 bg-background` (portal no necesario: un
  `fixed inset-0` con `z-50` ya cubre el layout; validar que ningún ancestro tenga `transform`
  que rompa `fixed` — el builder no lo tiene).
- Botón "Maximizar/Restaurar" (icono `Maximize2`/`Minimize2` de lucide) dentro del cluster de
  controles (`CanvasControls`).
- **`Esc`**: listener `keydown` que solo cierra si `maximized` (no interferir con el drawer,
  que ya cierra con su propio `onOpenChange`; el drawer es un `Dialog` con foco atrapado, así
  que su `Esc` no llega al canvas mientras esté abierto — orden natural).
- **`fitView`**: en `CanvasControls`/`CanvasInner`, `const { fitView } = useReactFlow();`
  `useEffect(() => { const r = requestAnimationFrame(() => fitView({ duration: 200 })); return () => cancelAnimationFrame(r); }, [maximized]);`.
  (`useReactFlow` es válido porque todo cuelga de `ReactFlowProvider`.)

### A2. Controles propios (HU-02)
- Nuevo `CanvasControls.tsx`: cluster posicionado (React Flow `<Panel position="bottom-left">`
  o un `absolute`), con botones de la app:
  `const { zoomIn, zoomOut, fitView } = useReactFlow();`
  - Acercar (`Plus`), Alejar (`Minus`), Ajustar (`Maximize`/`Scan`), + Maximizar/Restaurar.
- Se retira `<Controls showInteractive={false} />` de `FlowCanvas`. Se conserva `<Background>`.
- Estilo: `Button` variant `outline`/`ghost` sobre `bg-background`, agrupados en un
  contenedor `rounded-md border shadow-sm`, tokens de color de la app → contraste AA
  claro/oscuro automático. Cada botón con `title` + `aria-label`.

## 2. Área B — Interacción de nodos (acotada)

Se mantiene `nodesConnectable={false}` y `edges = useMemo(relinkEdges, [nodes])`.

- **Selección múltiple (CA-03.1):** props de React Flow ya soportadas —
  `selectionOnDrag`, `panOnDrag={[1,2]}` (o `selectionKeyCode="Shift"`), `multiSelectionKeyCode="Shift"`.
  Estilo de selección vía clase `.react-flow__node.selected` o `selected` prop en `NodeShell`
  (anillo `ring-2 ring-primary`).
- **Borrado por teclado (CA-03.2):** `deleteKeyCode={["Delete","Backspace"]}` +
  `onNodesDelete`. En el handler, **filtrar**: nunca borrar `kind==="trigger"` ni
  `kind==="transform"` (fijos). Reusa `deleteNode` existente sobre los ids permitidos.
  Alternativa robusta: setear `deletable: false` en los nodos trigger/transform al construir
  el grafo (React Flow respeta `node.deletable`) — **preferida** por declarativa.
- **Reordenar (CA-03.3):** ya funciona a nivel de datos: el orden lógico se deriva del orden
  de aparición por tipo en `compileGraphToRule`. Hoy el orden del array de `nodes` en el
  canvas puede no reflejar la intención vertical del usuario. Decisión: al soltar un nodo
  (`onNodeDragStop`), **reordenar el array** de nodos de ese tipo por su `position.y`, para
  que "más arriba = antes" sea la fuente de verdad del orden lógico. Helper nuevo en
  `graph.ts`: `sortNodesByColumnAndY(nodes)`.
- **Insertar en arista (CA-03.4):** custom edge con un botón "＋" en el punto medio
  (`EdgeLabelRenderer`). Al hacer clic, abre un pequeño menú contextual: para el tramo
  trigger→…→transform ofrece "Condición"; para transform→acciones ofrece la paleta de
  acciones (`OUTPUT_TYPES`). Inserta usando `newConditionNode`/`newActionNode` y deja que
  `relinkEdges` recomponga. Nuevo `canvas/InsertEdge.tsx` registrado en `edgeTypes`.
  *Fase opcional* si el tiempo aprieta: mínimo viable = los botones "Condición/Acción" que ya
  existen arriba a la izquierda (no se pierde capacidad).
- **Hover/feedback (CA-03.5):** `NodeShell` ya tiene `hover:shadow-md`; sumar `hover:border`
  más marcado y resaltar aristas conectadas a la selección (clase en edges derivados según
  `selectedId`).
- **Invariante (CA-03.6):** ningún cambio toca `compileGraphToRule` ni el engine.

## 3. Área C — Variables de primera clase

### C1. Hook compartido de campos de muestra
Hoy `SampleExplorer` calcula `FieldInfo[]` (path, type, example, presence) con un `useMemo`
interno. Extraer a `canvas/useSampleFields.ts` (o función pura `sampleFields(sample)`) para
reusar en `SampleExplorer` **y** `VariablesPanel` sin duplicar. Para el caso sin muestra
real, el panel cae a `deriveAvailableVariables(trigger, sample)` (que ya cubre event /
poll config.fields / HubSpot defaults) — así el panel nunca aparece vacío cuando el trigger
sí conoce sus campos.

### C2. `VariablesPanel.tsx` (HU-04)
- **Ubicación (R4):** acoplado **dentro** del canvas como overlay colapsable a la derecha
  (`absolute right-0 top-0 h-full w-64` con toggle), **no** como tercera columna del grid —
  evita competir con `DebuggerPanel`. Un botón/lengüeta "Variables" lo colapsa/expande;
  estado en `useState` de `CanvasInner` (persiste durante la sesión de edición; opcional:
  `localStorage` para recordar la preferencia).
- **Datos:** recibe `trigger`, `sample` (ya viven en `CanvasInner` como `triggerData` /
  `triggerSample`). Renderiza filas tipo `SampleExplorer`: `{{campo}}`, badge de tipo,
  ejemplo truncado, presencia, botón copiar.
- **Origen (CA-04.3):** encabezado que indica la fuente: "muestra real (HH:mm)" vs "campos
  del evento" vs "campos del poll" — derivable del mismo criterio de `deriveAvailableVariables`.
- **Estado vacío (CA-04.5):** CTA "Prueba la conexión en el nodo Trigger" que hace
  `setSelectedId(triggerNodeId)` para abrir su drawer.

### C3. Drag-to-field (HU-05, CA-05.1)
- En `VariablesPanel`, cada fila es `draggable`; `onDragStart` setea
  `e.dataTransfer.setData("application/x-hito-variable", field)`.
- En `InterpolableField`, el `Input` recibe `onDragOver` (preventDefault) y `onDrop`: lee el
  campo, construye `{{campo}}` y lo inserta en `selectionStart` (misma lógica de inserción
  que `VariablePicker.insert`). Extraer esa lógica a un helper compartido
  `insertTokenAt(value, field, el, mod?)` para no duplicar.
- Fallback siempre disponible: copiar token (C2) + el `VariablePicker` del propio campo.

### C4. Input libre en `VariablePicker` (HU-05, CA-05.2 / punto 5)
- Añadir al final del `DropdownMenuContent` un `DropdownMenuSeparator` + una fila con un
  `<Input>` pequeño "escribir campo…" y botón/Enter que llama `insert(typedValue)` con el
  texto tal cual (`{{loEscrito}}`). No cierra el menú al teclear (`onKeyDown` stopPropagation
  para que las flechas no naveguen el menú).

### C5. Chips de variables en nodos (HU-06 / punto 4)
- Helper puro `nodeUsedVariables(data: FlowNodeData): string[]` (en `variables.ts`):
  - `condition` → `[data.condition.field]` si no vacío.
  - `transform` → tokens de `transformCode` (via `parseTokens`) + `mapping[*].source`.
  - `action` → `parseTokens` sobre los strings interpolables del output (title, message,
    subject, body, url, etc.). Recorrer el output con un walker simple de strings.
- En `NodeShell`, nueva fila opcional de chips debajo del summary: `variables.map` a
  `<span>` mono `text-[10px]` en `bg-muted`; si el token no está en las variables
  disponibles (comparar con `validateVariables`/set de campos), color `warning`. Limitar a
  ~4 chips + "＋N". Necesita que el nodo conozca las variables disponibles: pasar
  `availableFields: Set<string>` vía el `FlowCanvasActions` context (o un context nuevo
  `VariablesContext`) para no engordar `data` (que se persiste).
- Nodo sin variables usadas → sin fila (CA-06.4).

## 4. Área D — Nodo Transformar (HU-07 / punto 8)

- **Link MDN (CA-07.1):** junto al `<h3>Transformación (código, opcional)</h3>`, un enlace
  `variant="link"` con icono `ExternalLink` a
  `https://developer.mozilla.org/es/docs/Web/JavaScript/Guide` (o "Working with objects"),
  `target="_blank" rel="noreferrer"`. En español (locale del producto es `es-CO`).
- **Ayuda inline (CA-07.2):** bloque plegable "Ejemplos" con 3–4 snippets copiables
  (mayúsculas, concatenar nombre completo, formatear fecha, condicional) que insertan al
  `transformCode`. Reusa el patrón de `SampleExplorer` (copiar) o un botón "usar" por snippet.
- **Contrato claro:** reforzar el texto existente de `record`/`return` con un mini-esquema
  visual "entra `record` → sale `return record`".
- **Separación mapeo/código (CA-07.4):** encabezados más marcados y una línea/nota que
  oriente: "Mapeo = sin código, empareja campos" vs "Código = avanzado, JavaScript". No se
  toca la lógica de `handleTestTransform`/`useGenerateTransform`.

## 5. Accesibilidad y temas (Principio IV)

- Todos los controles nuevos con `aria-label`/`title` y foco visible.
- Contraste AA en claro/oscuro: usar tokens (`bg-background`, `text-foreground`,
  `text-muted-foreground`, `border-border`, `text-warning`, `text-primary`) — nunca colores
  crudos de React Flow.
- Objetivos táctiles ≥ 32px en los controles de zoom.

## 6. Verificación (por fase)

- `tsc --noEmit` limpio.
- Suite Vitest completa en verde (baseline actual del repo). **Tests nuevos sugeridos**
  (unidad, sin DOM): `nodeUsedVariables` (condición/transform/action con y sin tokens),
  `sortNodesByColumnAndY`, `insertTokenAt`, `sampleFields`.
- `vite build` OK.
- **Smoke visual del usuario** (no hay Playwright en el repo): maximizar/restaurar + `Esc`;
  zoom con controles nuevos en claro y oscuro; borrar una acción con `Supr` y confirmar que
  el trigger/transform no se borran; panel de variables con y sin muestra; arrastrar una
  variable a un campo; chips en nodos incl. huérfano; link MDN abre; ejemplos del transform.
