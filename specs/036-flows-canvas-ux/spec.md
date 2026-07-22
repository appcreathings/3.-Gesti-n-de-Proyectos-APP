# Spec 036 — Canvas de Flujos: pulido de interacción + variables de primera clase

> Estado: **SOLO DOCUMENTADO** (planning). No se toca `src/`. Ejecutable en otra conversación.
> Feature dir: `specs/036-flows-canvas-ux/` · Fecha: 2026-07-22

## 1. Contexto

El editor de flujos (`/app/flows/:id`) es un canvas de React Flow (`@xyflow/react`)
montado en `FlowBuilderPage` como grid de 2 columnas (`lg:grid-cols-[2fr_1fr]`):
`FlowCanvas` a la izquierda + `DebuggerPanel` a la derecha. El grafo es un pipeline
**lineal fijo**: `trigger (1) → condición (0..n) → transform (1) → acción (0..n)`. Las
aristas son **puramente cosméticas y derivadas** por `relinkEdges()` — el usuario
reposiciona nodos pero **no conecta aristas a mano** (`nodesConnectable={false}`), y el
motor (`src/flows/engine.ts`) agrupa por tipo de nodo, no por conectividad
(`src/flows/graph.ts:11-18`). **Esta arquitectura se conserva** — ver Fuera de alcance.

El módulo funciona (specs 018–034) pero la experiencia del canvas quedó por detrás de su
potencia:

- El canvas tiene altura fija (`h-[calc(100vh-260px)]`) y **no se puede maximizar**.
- Los controles de zoom son el `<Controls>` por defecto de React Flow, **sin estilar** —
  desentonan con el sistema de diseño (Principio IV).
- La interacción con nodos es mínima: clic para abrir drawer y arrastrar para reposicionar.
  Sin selección múltiple, sin borrar con teclado, sin insertar/reordenar entre pasos, con
  poco feedback visual.
- Los nodos (`NodeShell`) muestran solo un resumen de texto truncado — **no comunican qué
  variables consumen**.
- Las variables (`{{campo}}`) están dispersas: `SampleExplorer` (rico: tipo, ejemplo,
  presencia, copiar token) vive **solo dentro del drawer del Trigger**; el `VariablePicker`
  solo inserta tokens predefinidos y **no deja escribir un campo propio**; entender de dónde
  sale cada dato exige abrir el drawer del trigger.
- El nodo Transformar mezcla mapeo + código JS pero **no enlaza a documentación de
  JavaScript** ni guía al usuario que no programa.

## 2. Objetivo

Elevar la experiencia del canvas sin cambiar el modelo de ejecución: canvas maximizable,
controles propios, interacción de nodos más rica, y **variables como ciudadanas de primera
clase** mediante un panel lateral persistente, chips de variables en los nodos, inserción
libre y mejor UX del nodo Transformar.

## 3. Decisiones fijadas (tomadas con el usuario, no re-preguntar)

- **Punto 3 = solo pulir interacción.** Se mantiene el auto-linking lineal (`relinkEdges`) y
  `nodesConnectable={false}`. NO hay conexiones manuales ni ramificación. Se mejora
  selección, arrastre, teclado, insertar/reordenar y feedback visual.
- **Variables = panel lateral persistente.** Se saca el explorador de muestra del drawer del
  Trigger a un panel fijo del canvas, siempre visible, con copiar/arrastrar token, tipo y
  ejemplo; los nodos muestran chips de las variables que usan.
- **Entregable = spec + design + tasks** para ejecutar en otra conversación.

## 4. Historias de usuario y criterios de aceptación

### HU-01 — Maximizar el canvas (punto 1)
Como usuario que arma un flujo con muchos nodos, quiero expandir el canvas a pantalla
completa para trabajar cómodo.
- **CA-01.1** Botón "Maximizar" visible en el canvas (esquina, junto a los controles).
- **CA-01.2** Al activarlo, el canvas ocupa toda la ventana (overlay `fixed inset-0`), por
  encima del resto de la app; el resto del builder queda oculto detrás.
- **CA-01.3** Botón "Restaurar" (mismo lugar) y tecla `Esc` salen del modo maximizado.
- **CA-01.4** Al entrar/salir, React Flow recalcula el encuadre (`fitView`) para que el grafo
  quede visible sin recorte.
- **CA-01.5** El estado del grafo, la selección y el drawer abierto se conservan al alternar.

### HU-02 — Controles de zoom con el sistema de diseño (punto 2)
Como usuario, quiero que los botones de acercar/alejar se vean como el resto de la app.
- **CA-02.1** Los controles de zoom (acercar, alejar, ajustar a pantalla) usan los tokens de
  color de la app (`Button`/tokens Tailwind), no el CSS por defecto de React Flow.
- **CA-02.2** Contraste AA en claro y oscuro; tamaños táctiles ≥ 32px (Principio IV).
- **CA-02.3** Cada control tiene `title`/`aria-label`. Zoom in/out y fit funcionan igual que
  antes.

### HU-03 — Interacción más rica con los nodos (punto 3, acotado)
Como usuario, quiero manipular los nodos con más comodidad, sin romper el pipeline fijo.
- **CA-03.1** Selección múltiple (arrastre de recuadro y `Shift`+clic) resaltada visualmente.
- **CA-03.2** `Supr`/`Backspace` borra los nodos seleccionados **borrables** (condición y
  acción); el trigger y el transform **no** se borran (nodos fijos).
- **CA-03.3** Reordenar acciones/condiciones desde el canvas actualiza su orden lógico (el
  orden de ejecución sigue el orden de los nodos de ese tipo, como hoy en
  `compileGraphToRule`).
- **CA-03.4** Botón "＋" sobre una arista para **insertar** un nodo entre dos pasos del mismo
  tramo (p. ej. una condición más, una acción más), con el auto-linking recalculando.
- **CA-03.5** Feedback al pasar el mouse: nodos con estado hover claro, aristas resaltadas en
  la selección, cursor adecuado.
- **CA-03.6** Ningún cambio afecta el motor de ejecución ni el schema — el grafo se sigue
  compilando con `compileGraphToRule` sin ramas.

### HU-04 — Panel lateral de variables persistente (puntos 6, 7)
Como usuario, quiero ver siempre qué datos trae mi flujo y de dónde salen, sin abrir el
drawer del trigger.
- **CA-04.1** Panel de variables acoplado al canvas (colapsable), visible en cualquier
  momento del editor, no solo dentro del drawer del Trigger.
- **CA-04.2** Lista cada variable disponible con: nombre `{{campo}}`, tipo inferido, valor de
  ejemplo y presencia (`N/M` registros) cuando hay muestra real — reusando la lógica de
  `SampleExplorer`.
- **CA-04.3** Origen visible: indica si la variable viene de la muestra real ("Probar
  conexión"), del tipo de evento del trigger, o de los `config.fields` del poll (mismos
  niveles que `deriveAvailableVariables`).
- **CA-04.4** Botón por variable para **copiar** el token `{{campo}}`.
- **CA-04.5** Estado vacío guía: si no hay muestra, explica "Prueba la conexión en el nodo
  Trigger para ver campos reales" con acción para abrir ese drawer.
- **CA-04.6** El panel se puede colapsar para recuperar espacio del canvas; su estado
  (abierto/cerrado) persiste durante la sesión de edición.

### HU-05 — Tomar variables de forma cómoda: insertar por clic/arrastre (puntos 5, 6)
Como usuario, quiero poner una variable en un campo sin escribir la sintaxis a mano.
- **CA-05.1** Desde el panel de variables puedo **arrastrar** una variable y soltarla en
  cualquier campo interpolable (`InterpolableField`); el token se inserta en la posición del
  cursor / al final.
- **CA-05.2** El `VariablePicker` gana un **input de texto libre** para escribir un campo
  propio que no está en la lista e insertarlo como `{{loQueEscribí}}` (punto 5) — hoy solo
  ofrece los predefinidos.
- **CA-05.3** Insertar por arrastre respeta los mods de formato ya existentes (el token base
  se puede seguir editando a `{{campo|date}}`).
- **CA-05.4** El hint de tokens huérfanos (`VariableValidationHint`) y la vista previa en
  vivo (`InterpolationPreview`) siguen funcionando tras insertar.

### HU-06 — Los nodos muestran las variables que usan (punto 4)
Como usuario, quiero ver de un vistazo qué datos consume cada nodo.
- **CA-06.1** Cada nodo de condición/transform/acción muestra **chips** de las variables que
  referencia (tokens `{{campo}}` en sus campos interpolables; el `field` en condiciones).
- **CA-06.2** Un chip cuyo token **no** existe en las variables disponibles se marca como
  huérfano (color de advertencia), coherente con `validateVariables`.
- **CA-06.3** Los chips no rompen el layout del nodo (`min-w-56 max-w-64`): se truncan/limitan
  con "+N" si hay muchos.
- **CA-06.4** Nodo sin variables usadas no muestra la fila de chips (cero ruido, Principio IV).

### HU-07 — Nodo Transformar más usable + docs de JavaScript (punto 8)
Como usuario, quiero entender y escribir el código de transformación con ayuda.
- **CA-07.1** Junto al editor de código hay un **enlace a documentación de JavaScript**
  (MDN) que abre en pestaña nueva.
- **CA-07.2** Ayuda inline: contrato claro de `record` (entrada) y `return` (salida) con
  ejemplos copiables (p. ej. mayúsculas, concatenar, fecha) — reduce el "código a ciegas".
- **CA-07.3** Se conserva "Generar con IA", "Probar con datos de ejemplo" y el resultado
  input/output actuales.
- **CA-07.4** El separador entre "Mapeo de campos" (para quien no programa) y "Código"
  (avanzado) queda visualmente más claro, guiando al usuario correcto a cada uno.

## 5. Fuera de alcance (explícito)

- **Conexiones manuales / ramificación por nodo.** El pipeline sigue lineal y auto-conectado
  (decisión fijada). Nada de `nodesConnectable`, ramas condicionales por salida ni aristas
  persistidas por conectividad. Reservado para una spec futura si se pide.
- **Cambios en el motor de ejecución** (`engine.ts`) o en el **schema** (`FlowRule`/`graph`).
  No hay `schemaVersion` nuevo (Principio II): el grafo se sigue compilando igual y las
  posiciones de nodos ya se persisten en `flow.graph`.
- **Nuevas integraciones / tipos de trigger o acción.** Solo UX del canvas existente.
- **Rediseño del `DebuggerPanel`** más allá de convivir con el nuevo panel de variables.

## 6. Principios afectados (gobernanza)

- **Principio IV (Diseño limpio y enfocado):** el corazón de esta spec — controles propios,
  jerarquía visual, estados vacíos que guían, cero ruido.
- **Principio V (Simplicidad / incremental):** se pule sobre lo existente sin sobre-ingeniería
  ni tocar el motor; entregable en fases verticales.
- **Principio I / II:** se respetan sin cambios — sin servidor, sin cambio de schema ni
  migración. El enlace a MDN es el único recurso externo, abierto por acción del usuario.

## 7. Riesgos

- **R1 — `fitView` tras maximizar:** React Flow necesita recalcular tras el cambio de tamaño
  del contenedor; sin ello el grafo queda descuadrado. Mitigación: llamar `fitView()` vía
  `useReactFlow` en un efecto que dependa del flag de maximizado (+ `requestAnimationFrame`).
- **R2 — Teclado y `Esc`:** el `Backspace`/`Supr` de borrado de nodos no debe dispararse
  mientras se escribe en un input/drawer. React Flow ya ignora teclas dentro de campos
  editables, pero hay que verificarlo con el drawer abierto.
- **R3 — Drag-to-field entre componentes:** arrastrar del panel a un `InterpolableField`
  cruza límites de componentes; usar `dataTransfer` con un tipo MIME propio y un drop target
  explícito en el input. Fallback siempre disponible: copiar token + picker en el campo.
- **R4 — Espacio en pantalla:** el panel de variables compite con el `DebuggerPanel` (columna
  derecha) en `lg`. Mitigación: el panel se acopla **dentro** del canvas (overlay colapsable),
  no como tercera columna. Ver `design.md` §2.
