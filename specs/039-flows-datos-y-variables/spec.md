# Spec 039 — Flujos: datos legibles y una sola forma de elegir variables

> Estado: **SOLO DOCUMENTADO** (planning). No se toca `src/`. Ejecutable en otra conversación.
> Feature dir: `specs/039-flows-datos-y-variables/` · Fecha: 2026-07-22
> Antecede: 036 (canvas UX), 037 (mapeo/condiciones/variables), 038 (verdad, deshacer, simulación).
> Baseline al empezar: **771 tests en 73 archivos**, `tsc` limpio, build OK.

## 1. Contexto

038 dejó el editor diciendo la verdad sobre su **configuración**: qué nodo está mal, qué haría al
simular, y cómo deshacer. Lo que queda es el otro eje, el de los **datos**: qué trae el flujo,
cómo se llaman esas cosas, y cómo se eligen. Ahí el editor todavía obliga a adivinar.

Tres problemas de fondo, todos con la misma forma:

1. **El evento no trae datos, trae ids.** `DomainEvent` (`events.ts:5-16`) es
   `{ type, projectId, taskId, from, to }` y nada más. `resolveTriggerData` (`engine.ts:521-526`)
   castea el evento directo a registro, así que un webhook sin payload explícito
   (`engine.ts:796`, `:1255`) envía **uuids**. El usuario no puede poner el nombre de la tarea en
   un webhook, en un email ni en una condición, porque el nombre **no existe** en ningún punto del
   pipeline.
2. **La lista de variables ignora el nodo Transformar.** `deriveAvailableVariables`
   (`variables.ts:67`) mira solo el trigger y la muestra. Pero `applyMapping` (`engine.ts:598-613`)
   con mapeo configurado **reemplaza el registro entero** por los `target`. Así que después de un
   mapeo, las acciones ven exactamente los campos mapeados — y el editor les sigue ofreciendo los
   del trigger, que ya no existen.
3. **Elegir una variable tiene tres formas distintas y ninguna completa.** Un picker en acciones
   (`VariablePicker`), otro en condiciones (`ConditionFieldPicker`), y un arrastrar-y-soltar
   (`useVariableDrop`) que 037 cableó en cuatro destinos. Tres gestos para una sola idea.

Más dos problemas de espacio en pantalla que 038 introdujo o dejó pendientes.

## 2. Objetivo

Que el flujo trabaje con **datos legibles** en vez de identificadores, que la lista de variables
diga la verdad **en cada etapa del pipeline**, y que elegir una variable sea **un solo gesto**
igual en todo el editor.

## 3. Decisiones fijadas (tomadas al planificar, no re-preguntar)

- **El registro del evento se enriquece en el motor**, no en cada output. Se hace **una vez**, en
  `resolveTriggerData`, así el nombre de la tarea sirve igual en condiciones, mapeo, webhook,
  email y crear-tarea. Enriquecer solo el webhook dejaría el problema en los otros cuatro sitios.
- **El enriquecimiento es aditivo y con claves planas punteadas** (`task.title`, no
  `task: { title }`). Aditivo: nunca pisa una clave del evento, así `{{taskId}}`, `from`/`to` y
  todas las condiciones existentes siguen valiendo. Plano: `resolvePath` (`interpolation.ts:77`)
  prueba la **clave literal antes** de partir por puntos, y `sampleFields`
  (`useSampleFields.ts:42`) solo recorre el nivel superior — con claves planas, la lista de
  variables, el picker y la interpolación funcionan sin tocar ninguno de los tres.
- **Las variables son por etapa, no globales.** Las condiciones evalúan **pre-mapeo** y las
  acciones consumen **post-mapeo**: una sola lista miente en uno de los dos lados. Cada drawer
  recibe la de su etapa; el panel de Variables muestra las dos, separadas.
- **`applyMapping` no se toca** (invariante de 037, reafirmado en 038): el mapeo se explica, no se
  cambia. Lo que cambia es que el editor deje de ocultar lo que el mapeo hace.
- **El arrastrar-y-soltar se retira.** Es una **reversión deliberada** de 037 §B, no un olvido: el
  panel de Variables pasa a ser informativo + copiar token. Se documenta como retirada para que no
  se re-implemente por inercia.
- **Los dos pickers no se fusionan en uno solo.** Comparten carcasa y gesto, pero cada uno inserta
  lo suyo: token `{{campo}}` en acciones, path crudo en condiciones. Fusionarlos de verdad
  reintroduciría el round-trip por `{{}}` que 037 mató (ver `ConditionConfigFields.tsx:246-254`).
- **Sin cambio de schema.** Nada de esto se persiste: el enriquecimiento es de ejecución, las
  listas son derivadas, el colapso del depurador es de sesión.

## 4. Historias de usuario y criterios de aceptación

### HU-01 — Ver los controles del canvas sin huecos · **DEFECTO (038)**
Como usuario, quiero que el cluster de deshacer/rehacer no rompa la columna de controles.

**Causa raíz:** 038 puso el historial en un cluster **horizontal** (`CanvasControls.tsx:44`,
`flex` en fila) encima de la columna vertical de zoom, dentro de un `Panel` que es `flex-col`. El
bloque de arriba mide dos botones de ancho y el de abajo uno: queda un escalón que se lee como una
mancha y que además tapa el lienzo a la derecha de los botones inferiores.

- **CA-01.1** Deshacer y rehacer se apilan en **vertical**, del mismo ancho que el resto de los
  controles del canvas.
- **CA-01.2** Se conserva la separación entre las dos familias (historial / encuadre): siguen
  siendo dos grupos distinguibles, no una lista de siete botones iguales.
- **CA-01.3** Se conserva todo lo de 038: `disabled` cuando no hay nada, y la operación concreta
  en el `title` ("Deshacer: Borrar nodo").

### HU-02 — Plegar el depurador
Como usuario, quiero recuperar el ancho del canvas cuando no estoy simulando.

- **CA-02.1** El `DebuggerPanel` se pliega hacia la derecha y deja una pestaña vertical para
  volver a abrirlo — **el mismo gesto y la misma forma** que el panel de Variables ya usa
  (`VariablesPanel.tsx:61-79`), para no inventar un segundo idioma de plegado.
- **CA-02.2** Plegado, el canvas ocupa el ancho liberado.
- **CA-02.3** El estado del depurador (traza, error, "Run real") **sobrevive** al plegado: plegar
  no es limpiar.
- **CA-02.4** El estado plegado/desplegado es de sesión: no se persiste ni cambia el schema.
- **CA-02.5** La proyección de la simulación sobre los nodos (038 HU-04) no se ve afectada por
  plegar el panel.

### HU-03 — Usar el nombre de la tarea, no su id · **DEFECTO**
Como usuario con un flujo disparado por un evento de tarea, quiero mandar al webhook el **título**
de la tarea, no `task-9f3e…`.

**Causa raíz:** ver §1.1. El dato nunca entra al pipeline.

- **CA-03.1** Un flujo con trigger de evento recibe, además de los ids que ya recibía, los datos
  legibles de las entidades que el evento referencia: al menos **título, estado, prioridad, fecha
  límite y responsable** de la tarea, y **nombre y estado** del proyecto.
- **CA-03.2** Los campos nuevos **se suman**: `type`, `projectId`, `taskId`, `from` y `to` siguen
  existiendo con el mismo valor. Ningún flujo guardado cambia de comportamiento por esto.
- **CA-03.3** Los campos nuevos aparecen en la lista de variables **con su valor de ejemplo**, sin
  necesidad de ejecutar nada.
- **CA-03.4** Sirven igual en los cuatro sitios: condición, mapeo, campo interpolable de una
  acción y payload del webhook.
- **CA-03.5** Si la entidad ya no existe (tarea borrada entre el evento y la ejecución), el
  registro simplemente **no trae** esos campos — no rompe la corrida ni inventa valores.
- **CA-03.6** La **simulación** de un flujo de evento usa una entidad real cuando el usuario tiene
  alguna: si no, mostraría los campos nuevos vacíos y volvería a mentir (038 CA-04.7).
- **CA-03.7** Queda visible en la UI que un webhook sin payload explícito envía el registro
  completo, ahora más ancho.

### HU-04 — Ver las variables que el Transformar produce · **DEFECTO**
Como usuario que mapeó `dealname → title`, quiero que las acciones me ofrezcan `title`.

**Causa raíz:** `deriveAvailableVariables` no conoce el nodo Transformar, y `applyMapping`
reemplaza el registro cuando hay mapeo. El editor ofrece hoy, en los campos de acción, **los
campos que ya no existen** y **oculta los que sí**. `validateFlow` (`validation.ts:259`) comete el
mismo error en las dos direcciones: no avisa del token que va a quedar vacío, y avisa como
huérfano del que sí resuelve.

- **CA-04.1** Con mapeo configurado, los campos de una acción ofrecen los **destinos** del mapeo.
- **CA-04.2** Sin mapeo, ofrecen los del trigger (hoy `applyMapping` deja pasar el registro tal
  cual — el comportamiento actual es el correcto y no cambia).
- **CA-04.3** Las **condiciones** siguen ofreciendo los campos **pre-mapeo**: se evalúan antes.
  Que las dos listas sean distintas es la información, no un problema a esconder.
- **CA-04.4** El panel de Variables muestra las dos etapas, etiquetadas, para que se vea qué
  renombra el Transformar.
- **CA-04.5** El aviso de token huérfano de una acción se calcula contra la lista **post-mapeo**.
- **CA-04.6** Con `transformCode` presente, la lista se declara **incompleta** en vez de fingir
  exactitud: el código puede añadir o quitar claves y eso no se puede saber sin ejecutarlo.

### HU-05 — Una sola forma de elegir una variable
Como usuario, quiero que elegir una variable se sienta igual en una condición y en una acción.

- **CA-05.1** Las dos superficies muestran la **misma lista**: nombre, tipo y valor de ejemplo,
  con el mismo orden y el mismo aspecto.
- **CA-05.2** El gesto es de dos niveles en las dos: elegir la variable → opcionalmente
  sub-elegir qué aplicarle. En **acciones** el submenú son los formatos
  (`|date`, `|number:2`, `|upper`…, spec 027 §G). En **condiciones** es el **operador de
  comparación**, que al elegirlo setea campo y operador de una vez.
- **CA-05.3** Elegir "tal cual" en cualquiera de las dos inserta exactamente lo que el motor
  espera en ese sitio: `{{campo}}` donde se interpola, el path crudo donde se resuelve con
  `resolvePath`. Esa diferencia **no puede desaparecer** — es el bug que 037 corrigió.
- **CA-05.4** **Se retira el campo "escribir campo…"** de los dos pickers
  (`VariablePicker.tsx:119-158` y `ConditionConfigFields.tsx:318-351`): no funciona. El input de
  al lado sigue aceptando texto libre, así que no se pierde la capacidad, solo el camino roto.
- **CA-05.5** Elegir el operador desde el submenú y elegirlo desde el `<select>` de abajo dejan el
  mismo estado — no hay dos verdades.

### HU-06 — Partir de un valor real en la condición
Como usuario, quiero que el valor de la condición me lo sugiera el propio flujo.

- **CA-06.1** Elegido el campo, el valor se puede **elegir de una lista** de los valores que ese
  campo tiene realmente (los de la muestra; el valor de ejemplo del trigger si no hay muestra).
- **CA-06.2** Al elegir un campo con el valor **vacío**, se pre-rellena con el valor de ejemplo.
  Nunca se pisa un valor ya escrito.
- **CA-06.3** Con el operador `in`, elegir un valor lo **añade a la lista** (037 §D3) en vez de
  reemplazarla.
- **CA-06.4** El valor sigue siendo **literal**: no acepta tokens ni se interpola (invariante de
  037, `ConditionConfigFields.tsx:225-232`).
- **CA-06.5** La sugerencia no bloquea escribir cualquier otra cosa.

### HU-07 — Quitar el arrastrar y soltar de las variables
Como usuario, quiero un panel de variables que informe, no que me pida puntería.

- **CA-07.1** Las filas del panel dejan de ser arrastrables (`VariablesPanel.tsx:146`) y los
  cuatro destinos dejan de ser drop targets.
- **CA-07.2** Se conserva **copiar el token** y toda la información de la fila (tipo, ejemplo,
  presencia).
- **CA-07.3** Nada queda a medias: se borra `useVariableDrop`, su test y el texto de ayuda que
  explica el arrastre.
- **CA-07.4** El panel explica qué forma tiene cada destino (token en acciones, nombre en
  condiciones y mapeo, `record.campo` en código) — la información que hoy solo se descubría
  arrastrando.

## 5. Fuera de alcance (explícito)

- **Conexiones manuales, ramificación y guardas por salida** (033 §B2) — el pipeline sigue lineal
  y auto-conectado. Invariante heredado de 036/037/038.
- **Cambiar `applyMapping`** — invariante de 037. HU-04 lo **explica**, no lo altera.
- **Inferir la forma de salida de `transformCode`** — parsear asignaciones sería frágil y
  silenciosamente incorrecto (CA-04.6 lo declara incompleto en vez de adivinar).
- **Enriquecer los registros de *polling*** — HubSpot/Sheets/inbox ya traen datos legibles; el
  problema es solo de los eventos internos.
- **Trigger programado** (033 §B1), **método/headers del webhook** (033 §B3), **versionado con
  rollback** (033 §C2), **coalescing de polling** (033 §C3).
- **Rediseño del `DebuggerPanel`** — HU-02 lo pliega; no toca su contenido (invariante de 036,
  reafirmado en 038).
- **Persistir el estado plegado** de los paneles — sesión, como el de Variables.

## 6. Principios afectados (gobernanza)

- **Principio IV (Diseño limpio y enfocado):** HU-05 y HU-07 quitan dos formas de hacer lo mismo;
  HU-01 y HU-02 devuelven espacio de pantalla.
- **Principio V (Simplicidad / incremental):** HU-05 y HU-07 **borran** superficie. HU-03 añade,
  pero en **un solo punto** del motor en vez de en cada output.
- **Principio II (El esquema es el contrato):** sin `schemaVersion` nuevo ni migración.
- **Principio I:** sin servidor; el enriquecimiento sale de datos que ya están en el dispositivo.

## 7. Riesgos

- **R1 — El enriquecimiento ensancha lo que sale por webhook.** Un webhook sin `payload` explícito
  manda el registro entero: al enriquecerlo, el receptor (Make/Zapier) empieza a recibir claves
  nuevas. Es aditivo y ese es el objetivo, pero es un cambio observable **fuera** de la app.
  Mitigación: solo se **añaden** claves, nunca se renombran ni se quitan (CA-03.2); se avisa en la
  UI del webhook (CA-03.7); el smoke lo verifica con "Probar webhook".
- **R2 — El aviso de tokens huérfanos puede encenderse en flujos que hoy están callados.**
  Calcular la lista post-mapeo (CA-04.5) delata tokens que nunca resolvieron. Son warnings, no
  errores, así que no bloquean nada (criterio de 027 §A) — pero un usuario con flujos viejos verá
  avisos nuevos. Mitigación: son ciertos; el mensaje debe decir **por qué** (el mapeo renombró el
  campo), no solo que falta.
- **R3 — Retirar el arrastrar y soltar es una reversión de una función publicada.** Si el camino
  de copiar/elegir no queda impecable, el usuario pierde capacidad. Mitigación: HU-05 y HU-06
  entran **antes** que HU-07, así el reemplazo ya está en pie cuando se retira el arrastre.
- **R4 — Homologar los pickers puede reintroducir el bug de 037.** La carcasa compartida no debe
  saber nada de `{{}}`: quien decide qué se inserta es cada llamador. Mitigación: la carcasa
  recibe `onPick(field, modifier?)` y no construye texto; test dedicado de que la condición nunca
  recibe llaves.
- **R5 — Plegar el depurador cambia el ancho del canvas sin avisarle a React Flow.** El viewport
  no se re-encuadra solo. Mitigación: no se re-encuadra a propósito (los nodos no se mueven;
  aparece espacio) y "Ajustar a pantalla" sigue a un clic. Se verifica en el smoke.
- **R6 — Coste del enriquecimiento por corrida.** Se resuelve una entidad por evento. Mitigación:
  índices `Map` construidos una vez por corrida, no una búsqueda lineal por evento.
