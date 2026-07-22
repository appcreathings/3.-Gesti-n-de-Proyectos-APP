# Spec 038 — Editor de Flujos: verdad en el canvas, confianza al editar y simulación visible

> Estado: **SOLO DOCUMENTADO** (planning). No se toca `src/`. Ejecutable en otra conversación.
> Feature dir: `specs/038-flows-editor-confianza/` · Fecha: 2026-07-22
> Antecede: spec 036 (canvas UX) y 037 (correcciones de mapeo/condiciones/variables).
> Baseline al empezar: **713 tests en 69 archivos**, `tsc` limpio, build OK.

## 1. Contexto

Specs 019–034 construyeron el motor; 036 elevó el canvas; 037 arregló los caminos rotos del
editor. El módulo hoy **funciona y no miente** en los puntos que 037 tocó. Lo que queda no son
caminos rotos: son tres huecos de producto que aparecen justo cuando el usuario empieza a
confiar en la herramienta y a construir flujos de verdad.

1. **El canvas no dice la verdad completa sobre el estado de configuración.** `validateFlow`
   (`src/flows/validation.ts:100`) ya calcula un diagnóstico por nodo, pero el canvas no lo
   consume: cada nodo re-implementa su propio criterio de "inválido", y las **acciones no
   implementan ninguno**. Un webhook sin URL se ve idéntico a uno correcto.
2. **Editar es irreversible.** Spec 036 habilitó borrar nodos con `Supr`
   (`FlowCanvas.tsx:372`) sin añadir deshacer. El único "undo" disponible es salir sin guardar
   y perder toda la sesión de edición.
3. **La simulación no se ve donde se edita.** `dryRunFlow` produce una traza rica —veredicto
   por condición con valor real, plan por acción— que el `DebuggerPanel` muestra como texto en
   un dock lateral. El usuario tiene que leer la traza y mapearla mentalmente a los nodos que
   tiene delante.

Además quedaron **cuatro defectos** de etiquetado y consistencia, dos de ellos consecuencia
directa de cambios anteriores.

## 2. Objetivo

Que el editor de flujos deje de exigir memoria y fe: que el canvas muestre por sí solo qué está
mal y dónde, que cualquier edición se pueda deshacer, y que simular un flujo pinte el resultado
sobre los mismos nodos que el usuario acaba de configurar.

## 3. Decisiones fijadas (tomadas al planificar, no re-preguntar)

- **Una sola fuente de verdad de validación.** El canvas **no** calcula si un nodo está mal:
  consume `validateFlow`, que ya lo sabe. Se corrige la clase de bug, no cada nodo.
- **Deshacer es de sesión, no persistente.** Historial en memoria del grafo mientras el editor
  está abierto. El versionado con rollback persistente es 033 §C2 y sigue en backlog: son dos
  funciones distintas y mezclarlas encarece ambas.
- **El deshacer cubre el grafo, no los metadatos del flujo.** Nombre, etiquetas, `enabled`,
  `onErrorPolicy` y `conditionMode` viven en `FlowBuilderPage`, no en el canvas. Meterlos en el
  mismo historial obliga a unificar dos dueños de estado — coste alto, valor bajo (son campos
  de un solo control, fáciles de revertir a mano). Se documenta en la UI.
- **La simulación se proyecta, el `DebuggerPanel` no se rediseña.** Su vista textual se conserva
  tal cual (invariante heredado de 036); lo único que cambia es de quién es el estado de la
  traza, para que el canvas también la reciba.
- **Sin cambio de schema.** Nada de lo anterior se persiste. Sin `schemaVersion` nuevo, sin
  migración (Principio II).

## 4. Historias de usuario y criterios de aceptación

### HU-01 — Ver en el canvas qué nodo está mal configurado · **DEFECTO**
Como usuario, quiero que el nodo que tiene un problema me lo diga, sin tener que leer el banner
y adivinar a cuál se refiere.

**Causa raíz:** la validez de un nodo se decide hoy en **tres lugares con tres criterios
distintos**:
- `nodeTypes.tsx:159` — trigger: `type === "poll" && !config.connectionId`.
- `nodeTypes.tsx:186` — condición: `!data.condition.field`.
- `nodeTypes.tsx:209-227` — acción: **nada**. `NodeShell` acepta `invalid`, pero `ActionNode`
  no se lo pasa nunca.

`validateFlow` ya cubre los tres casos y bastante más (proyecto destino borrado, email sin
conexión, URL inválida, `createdProject` sin un `createProject` previo — `validation.ts:210`),
y ya identifica el nodo con `nodeKind` + `outputIndex`. El canvas simplemente no lo mira.

- **CA-01.1** Cada nodo con al menos un issue muestra un indicador visible: rojo para `error`,
  ámbar para `warning`, con el número de problemas.
- **CA-01.2** El detalle (los mensajes de `validateFlow`, en español) es accesible desde el
  nodo sin abrir el drawer.
- **CA-01.3** Los tres criterios locales de `nodeTypes.tsx` se **eliminan**: el estado de un
  nodo se deriva exclusivamente de `validateFlow`. Una regla nueva de validación aparece en el
  canvas sin tocar el canvas.
- **CA-01.4** Los issues de `nodeKind: "flow"` (ej. flujo sin acciones) siguen viviendo solo en
  el banner — no cuelgan de ningún nodo.
- **CA-01.5** El indicador de configuración es **distinguible** del resultado de simulación
  (HU-04): son dos informaciones distintas y no pueden compartir canal visual.
- **CA-01.6** Sin issues, el nodo se ve exactamente como hoy (cero ruido añadido).

### HU-02 — Deshacer cualquier cambio del canvas
Como usuario, quiero equivocarme sin miedo: borrar un nodo, cambiar un campo, mover algo, y
poder volver atrás.

- **CA-02.1** `Ctrl+Z` deshace y `Ctrl+Shift+Z` (y `Ctrl+Y`) rehace, sobre el grafo.
- **CA-02.2** Hay botones visibles de deshacer/rehacer con estado deshabilitado cuando no hay
  nada que deshacer — la función no puede existir solo como atajo oculto.
- **CA-02.3** El historial registra **operaciones**, no pulsaciones: escribir "Seguimiento
  ACME" en el título de una acción es **un** paso de deshacer, no diecisiete.
- **CA-02.4** Mover un nodo es un paso de deshacer al soltarlo, no uno por píxel arrastrado.
- **CA-02.5** `Ctrl+Z` con el foco dentro de un input o textarea **no** lo captura el canvas:
  ahí manda el deshacer nativo del navegador sobre el texto.
- **CA-02.6** Deshacer hasta el estado guardado deja el flujo **limpio** (el aviso de cambios
  sin guardar desaparece) — se deriva del contenido, no del historial.
- **CA-02.7** Si al deshacer desaparece el nodo cuyo drawer está abierto, el drawer se cierra
  sin error.
- **CA-02.8** El historial tiene un tope y descarta lo más viejo; no crece sin límite.
- **CA-02.9** Queda explícito que el deshacer cubre el canvas y no los metadatos del flujo
  (nombre, etiquetas, política de fallo).

### HU-03 — Duplicar un nodo
Como usuario con dos acciones casi iguales, quiero copiar una y cambiarle un campo.

- **CA-03.1** Los nodos de condición y acción se pueden duplicar desde el propio nodo.
- **CA-03.2** El duplicado aparece inmediatamente **después** del original en el orden de
  ejecución, con id nuevo y toda su configuración copiada.
- **CA-03.3** Trigger y Transformar **no** se duplican (son nodos fijos y únicos del pipeline).
- **CA-03.4** Duplicar es una operación deshacible (HU-02).

### HU-04 — Ver el resultado de la simulación sobre los nodos
Como usuario, quiero pulsar "Simular" y ver en el canvas qué condición cortó el flujo y qué
acciones se habrían ejecutado.

- **CA-04.1** Tras simular, cada nodo de condición muestra si **se cumplió o no** para el
  registro proyectado, con el valor real que tenía el campo.
- **CA-04.2** Cada nodo de acción muestra `ejecutada` / `omitida` / `error`, y su `plan`
  ("Se crearía la tarea 'X' en el proyecto 'Y'") es accesible desde el nodo.
- **CA-04.3** Cuando las condiciones filtran el registro, las acciones se marcan como **no
  alcanzadas** — no como "omitidas por error", que es otra cosa.
- **CA-04.4** El nodo Transformar señala si el código de transformación falló.
- **CA-04.5** Con varios registros en la traza, se puede elegir **cuál** se proyecta.
- **CA-04.6** La proyección se puede limpiar, y se distingue de un vistazo de la validación de
  configuración (CA-01.5).
- **CA-04.7** Si el usuario edita el grafo después de simular, la proyección se marca como
  **desactualizada** en vez de mentir. No se borra sola: el usuario puede estar leyéndola.
- **CA-04.8** El `DebuggerPanel` conserva su vista textual y su comportamiento actuales.

### HU-05 — Leer el pipeline sin adivinar
Como usuario, quiero entender el orden y qué nodos son opcionales.

- **CA-05.1** Las condiciones y las acciones se muestran **numeradas** según su orden real de
  ejecución (el que `compileGraphToRule` deriva del orden del array, sincronizado con la
  posición vertical por `sortNodesByColumnAndY` — `graph.ts:212`).
- **CA-05.2** El nodo Transformar vacío (sin mapeo ni código) se ve **secundario**, no como un
  paso pendiente de configurar: en el caso más común no hace nada y hoy ocupa una columna
  entera con el mismo peso visual que el resto.
- **CA-05.3** Los atajos de teclado del canvas (`Supr`, `Shift+clic`, `Shift+arrastre`, `Esc`,
  `Ctrl+Z`, `Ctrl+Shift+Z`, `Ctrl+D`, `Ctrl+S`) son descubribles desde la propia UI.

### HU-06 — Etiquetas honestas · **DEFECTOS**
Como usuario con un trigger de Make/Zapier, quiero que la app no me diga que es Google Sheets.

- **CA-06.1** **Defecto:** `triggerSummary` (`meta.ts:83`) hace
  `t.provider === "hubspot" ? "HubSpot" : "Google Sheets"`, pero el schema tiene **tres**
  proveedores (`flow.ts:50`: `hubspot | google-sheets | inbox`). Un trigger de inbox —el camino
  recomendado para Make/Zapier desde spec 032— se anuncia en el canvas como
  **"Polling Google Sheets"**. `validation.ts:104-110` sí distingue los tres: hay dos tablas de
  etiquetas y ya divergieron. Debe haber **una**.
- **CA-06.2** **Defecto:** `conditionSummary` (`meta.ts:91`) hace `String(value ?? "")`. Desde
  spec 037 el operador `in` guarda un **array**, así que `["won","closed"]` se resume como
  `won,closed` — indistinguible del string con comas que 037 enseñó a convertir, que es
  justamente el valor que nunca se cumplía. El resumen debe delatar que es una lista.
- **CA-06.3** El origen que muestra el `VariablesPanel` (`VariablesPanel.tsx:50`) nombra el
  proveedor, con la misma tabla de CA-06.1.
- **CA-06.4** Un nodo de condición sin campo configurado sigue diciéndolo (comportamiento
  actual, ahora servido por `validateFlow` — ver CA-01.3).

## 5. Fuera de alcance (explícito)

Se nombran porque son backlog vivo, no olvidos:

- **Conexiones manuales, ramificación y guardas por salida** (033 §B2) — el pipeline sigue
  lineal y auto-conectado: `nodesConnectable={false}`, aristas derivadas por `relinkEdges`.
  Invariante heredado de 036 y reafirmado en 037.
- **Trigger programado / schedule** (033 §B1) y **método HTTP + headers custom del webhook**
  (033 §B3) — expresividad del motor, no del editor.
- **Versionado + rollback persistente de flujos** (033 §C2) — HU-02 es historial de sesión.
- **Coalescing de polling** (033 §C3), **verificación de firma entrante** (033 §B4),
  **export de conexiones** (033 §C4).
- **Cambiar `applyMapping`** — invariante fijado en 037: el mapeo se explica, no se cambia.
- **Rediseño del `DebuggerPanel` y del `VariablesPanel`** — 036 los fijó; 038 solo mueve de
  dueño el estado de la traza (CA-04.8).
- **Buscar/saltar a un nodo** en flujos grandes — real pero de menor valor que lo de arriba;
  candidato a 039.

## 6. Principios afectados (gobernanza)

- **Principio IV (Diseño limpio y enfocado):** el núcleo — el canvas deja de exigir memoria
  (qué issue era de qué nodo) y de castigar el error (deshacer).
- **Principio V (Simplicidad / incremental):** HU-01 y HU-06 **borran** lógica duplicada en vez
  de añadirla; el canvas pasa a consumir lo que ya existe.
- **Principio II (El esquema es el contrato):** sin `schemaVersion` nuevo ni migración — nada
  de esta spec se persiste.
- **Principio I:** sin servidor; nada nuevo sale del dispositivo.

## 7. Riesgos

- **R1 — El historial de deshacer contra el estado interno de React Flow.** `useNodesState`
  emite cambios continuos durante el arrastre y la selección. Un historial ingenuo suscrito a
  `onNodesChange` guardaría cientos de entradas por arrastre y volvería inútil el deshacer.
  Mitigación: el historial se alimenta de **puntos de commit explícitos**, no del stream de
  cambios. Ver `design.md` §C.
- **R2 — El mapeo traza↔nodo es un contrato implícito del motor.** La proyección de HU-04
  depende de que `recordTrace.conditions[i]` y `recordTrace.outputs[i]` sean posicionalmente
  1:1 con `flow.logic.conditions` y `flow.outputs`. Hoy lo son (`engine.ts:294-304` y el bucle
  de outputs, que empuja también los `skipped` de la política "detener"), pero **nada lo
  garantiza**: es una propiedad emergente. Mitigación: fijarla con un test dedicado sobre el
  motor antes de construir la UI encima. Si algún día deja de cumplirse, el test falla y no la
  pantalla.
- **R3 — Dos sistemas de insignias en el mismo nodo.** Configuración (HU-01) y simulación
  (HU-04) compiten por el mismo espacio. Mitigación: canales visuales distintos y separados
  (esquina vs. franja inferior), y la simulación solo existe mientras hay una proyección
  activa (CA-01.5, CA-04.6).
- **R4 — Elevar el estado de la traza.** `DebuggerPanel` hoy es dueño de su `dryTrace`. Moverlo
  a `FlowBuilderPage` toca el contrato builder↔panel. Mitigación: es un cambio de propiedad,
  no de comportamiento; la vista textual del panel queda intacta y se verifica en el smoke.
- **R5 — Numerar los nodos con el orden equivocado.** El número debe reflejar el orden que
  compila el motor (orden del array), no el visual, y ambos solo se sincronizan al soltar un
  nodo. Mitigación: derivar la numeración de la misma proyección que alimenta HU-01 (que ya
  ordena por tipo), y verificarla tras arrastrar.
