# Spec 037 — Editor de Flujos: correcciones de mapeo, condiciones y variables

> Estado: **SOLO DOCUMENTADO** (planning). No se toca `src/`. Ejecutable en otra conversación.
> Feature dir: `specs/037-flows-editor-correcciones/` · Fecha: 2026-07-22
> Antecede: spec 036 (canvas UX). Esta spec corrige lo que el smoke visual de 036 dejó ver.

## 1. Contexto

Spec 036 elevó el canvas (maximizar, controles propios, panel de variables, chips,
drag-to-field). Al usarlo de verdad aparecieron cinco problemas: cuatro son **defectos
funcionales** —dos de ellos hacen que una función anunciada sea literalmente imposible de
usar— y uno es de comprensión del modelo de datos.

Dos hallazgos son anteriores a 036 y estaban ocultos porque nadie llegaba a ejercitarlos:

- **El mapeo descarta campos en silencio.** `applyMapping` (`src/flows/engine.ts:652`)
  devuelve `{...record}` con cero filas, pero con **una sola fila** construye un objeto
  nuevo que contiene **únicamente los `target` mapeados**. Mapear `email → email` hace que
  `{{firstname}}` deje de resolver en todas las acciones. La UI dice "Asignar valores del
  registro a campos de Hito" y nunca menciona el descarte.
- **El operador `in` no puede cumplirse jamás.** El motor exige `Array.isArray(target)`
  (`engine.ts:643`) pero la UI guarda siempre un string (`e.target.value`), así que la
  condición evalúa `false` siempre, sin error visible.

## 2. Objetivo

Que el editor de flujos deje de tener caminos rotos o engañosos: que el campo personalizado
se pueda escribir, que el mapeo diga la verdad sobre lo que hace, que las condiciones se
armen y se verifiquen contra datos reales, que arrastrar una variable funcione en todos los
campos, y que los selectores compactos se lean bien.

## 3. Decisiones fijadas (tomadas con el usuario, no re-preguntar)

- **Mapeo = explicarlo, no cambiarlo.** `applyMapping` **no se toca**: cambiarlo alteraría
  en runtime el comportamiento de flujos ya guardados y activos. La UI pasa a exponer el
  efecto real (qué campos sobreviven y cuáles se descartan) contra la muestra.
- **Drag & drop = integrarlo en todos los campos**, con inserción polimórfica según el
  destino (token / path crudo / expresión JS). Hoy el panel promete "arrastra una variable a
  un campo" y falla en silencio en condiciones y transformación.
- **Operador `in` = arreglarlo** con un editor de valores múltiples que guarde un array de
  verdad, en vez de retirarlo.
- **`<select>` = arreglar el componente base** (`src/components/ui/select.tsx`) con variantes
  de tamaño, no parchear caso por caso.

## 4. Historias de usuario y criterios de aceptación

### HU-01 — Escribir un campo personalizado en el mapeo (punto 1) · **DEFECTO**
Como usuario cuyo campo no está en la lista, quiero elegir "Personalizado (escribir)…" y
poder escribirlo.

**Causa raíz:** en `MappingSourceCell` / `MappingTargetCell`
(`TransformConfigFields.tsx:67` y `:109`) el "modo personalizado" se **deriva** del valor:
`selectValue = value === "" ? "" : isKnown ? value : CUSTOM_VALUE`. Al elegir la opción, el
handler hace `onChange("")`; en el re-render `value === ""` gana la primera rama, `selectValue`
vuelve a `""`, el `<Input>` condicionado a `selectValue === CUSTOM_VALUE` **nunca se monta** y
el `<select>` rebota a "Campo recibido…". Es imposible entrar al modo personalizado.

- **CA-01.1** Elegir "Personalizado (escribir)…" muestra el input de texto y **mantiene** el
  select en esa opción, con el valor vacío.
- **CA-01.2** Lo escrito se guarda en `mapping[i].source` / `.target` tal cual, incluyendo
  nombres con espacios, acentos o puntos (`properties.amount`, `Nombre Cliente`).
- **CA-01.3** El modo personalizado sobrevive al re-render mientras el input esté vacío (no
  rebota a "Campo recibido…" al borrar todo el texto).
- **CA-01.4** Volver a elegir un campo de la lista sale del modo personalizado y lo aplica.
- **CA-01.5** Al reabrir el drawer, una fila cuyo valor guardado no está en la lista se
  muestra ya en modo personalizado con su texto (comportamiento actual, preservado).

### HU-02 — Arrastrar una variable a cualquier campo (punto 2)
Como usuario, quiero que arrastrar desde el panel de Variables funcione en todo el editor,
no solo en los campos de acción.

Hoy el único drop target es `InterpolableField` (spec 036 §C3). Los campos de condición y de
transformación ignoran el arrastre sin ninguna señal.

- **CA-02.1** El drop inserta **según el destino**, porque no todos los campos interpolan:
  - campo interpolable (acciones) → `{{campo}}` *(ya funciona)*
  - campo de una condición → `campo` (path crudo: el motor lo resuelve con
    `getNestedValue`, no interpola)
  - origen del mapeo → `campo` (path crudo, mismo motivo)
  - textarea de código → `record.campo` (expresión JS válida)
- **CA-02.2** Todo destino válido muestra realimentación al pasar por encima (anillo) y
  cursor de copia.
- **CA-02.3** El **valor** de una condición **no** es drop target: el motor compara contra el
  literal y nunca lo interpola — aceptar un token ahí crearía una condición que no puede
  cumplirse. Se documenta en el propio campo.
- **CA-02.4** Arrastrar sigue siendo un atajo, no el único camino: copiar token y el picker
  del campo se conservan.
- **CA-02.5** Un arrastre de texto cualquiera (no del panel) conserva el comportamiento
  nativo del navegador.

### HU-03 — Entender qué hace el mapeo de campos (punto 3)
Como usuario, quiero saber qué le pasa a mis datos cuando agrego una fila de mapeo.

- **CA-03.1** El encabezado "Mapeo de campos" indica que **reemplaza** el registro
  (etiqueta visible, no solo texto de ayuda).
- **CA-03.2** Con ≥ 1 fila y muestra disponible, se listan en vivo los campos que
  **sobreviven** y los que se **descartan**.
- **CA-03.3** Aviso accionable cuando el descarte rompe algo: si un campo descartado está
  siendo usado como `{{token}}` en alguna acción del flujo, se advierte nombrándolo.
- **CA-03.4** Queda explícito el orden real de ejecución: **condiciones** se evalúan contra el
  registro crudo → **mapeo** → **código** recibe el registro ya mapeado → **acciones**.
- **CA-03.5** Con cero filas se sigue diciendo que los datos pasan tal cual (hoy correcto).
- **CA-03.6** El origen del mapeo admite path con puntos pero **no** tokens `{{}}` — se
  documenta, porque `createProject.fields` sí los admite (`engine.ts:1057`) y la asimetría
  confunde.

### HU-04 — Condiciones más fáciles y confiables (punto 4)
Como usuario, quiero elegir el campo sin escribirlo a ciegas y saber si la condición se
cumple antes de guardar.

- **CA-04.1** **Defecto:** el `FieldPicker` (`ConditionConfigFields.tsx:151`) extrae el campo
  con `/\{\{(\w+(?:\.\w+)*)\}\}/` — `\w`-only. Un campo con espacios o acentos no matchea y
  cae al `else`, escribiendo `{{Nombre Cliente}}` **con llaves** dentro de `condition.field`,
  que jamás resolverá. Debe guardar siempre el path crudo.
- **CA-04.2** El selector de campo ofrece las variables disponibles con tipo y ejemplo, y
  permite escribir uno propio (mismo criterio que HU-01).
- **CA-04.3** **Defecto:** el operador `in` recibe un editor de valores múltiples que guarda
  un **array**; deja de guardar un string que el motor nunca puede satisfacer.
- **CA-04.4** Vista previa de la condición contra la muestra: cuántos registros la cumplen
  (`N de M`), y el valor real del campo en el registro de vista previa.
- **CA-04.5** Cuando el campo elegido no existe en la muestra, se advierte (no bloquea).
- **CA-04.6** La ayuda del campo aclara que se evalúa contra el registro **crudo** (pre-mapeo)
  — hoy ya lo dice y se conserva.
- **CA-04.7** El modo de combinación (todas / alcanza con una) sigue viviendo en
  `flow.logic.conditionMode`, sin cambios.

### HU-05 — Selectores compactos legibles (punto 5)
Como usuario, quiero que los desplegables pequeños se vean bien.

**Causa raíz:** `select.tsx:14` fija `py-2` y `sm:text-sm` en la clase base. Al pasarle
`h-8 text-xs`, `tailwind-merge` reemplaza `text-base` por `text-xs` pero **conserva
`sm:text-sm`** (es otra variante). En ≥ 640px queda 8px + 8px de padding + 20px de línea =
36px de contenido dentro de una caja de 32px → el texto se recorta.

- **CA-05.1** El `Select` gana variantes de tamaño (`sm` / `default`) con su propio padding y
  tipografía coherentes; los tamaños compactos no recortan el texto.
- **CA-05.2** Se corrige "Si una acción falla:" en `FlowBuilderPage`, y de paso los otros
  selects compactos del editor (modo de condiciones en `FlowCanvas`, "Registro N" en
  `SampleExplorer`).
- **CA-05.3** Contraste AA en claro y oscuro, incluida la lista desplegada.
- **CA-05.4** Ningún uso existente de `Select` en el resto de la app cambia de aspecto sin
  querer (el tamaño por defecto se mantiene idéntico).

## 5. Fuera de alcance (explícito)

- **Cambiar `applyMapping`** a modo "enriquecer" o hacerlo elegible por flujo (decisión
  fijada: solo se explica). Si más adelante se quiere, exige `schemaVersion` + migración.
- **Conexiones manuales / ramificación** — sigue vigente el invariante de 036: pipeline
  lineal, aristas derivadas por `relinkEdges`, `nodesConnectable={false}`.
- **Nuevos tipos de trigger, acción u operador** más allá de arreglar `in`.
- **Rediseño del `DebuggerPanel`** y del panel de variables (036 ya los fijó).

## 6. Principios afectados (gobernanza)

- **Principio IV (Diseño limpio y enfocado):** el núcleo — estados que guían, decir la verdad
  sobre lo que hacen los datos, cero caminos muertos.
- **Principio V (Simplicidad / incremental):** se corrige sobre lo existente; el arreglo del
  mapeo es de comunicación, no de motor.
- **Principio II (El esquema es el contrato):** sin `schemaVersion` nuevo ni migración.
  `condition.value` ya es `z.unknown()`, así que guardar un array para `in` **no** cambia el
  schema.
- **Principio I:** sin servidor; nada nuevo sale del dispositivo.

## 7. Riesgos

- **R1 — Extraer el evaluador de condiciones.** La vista previa (CA-04.4) necesita la misma
  lógica que el motor. Duplicarla es exactamente el error que spec 026 corrigió con la
  interpolación (dos regex divergentes, doble fallo silencioso). Mitigación: extraer
  `evaluateCondition`/`toComparableNumber` a un módulo compartido **sin cambiar su lógica**,
  con los tests actuales del engine como red. Ver `design.md` §4.
- **R2 — `in` con flujos guardados.** Los flujos que hoy tienen `in` con un string nunca se
  cumplen; al pasar a array cambian de comportamiento (empiezan a cumplirse). Es la
  corrección buscada, pero debe anunciarse en la UI al abrir esa condición.
- **R3 — Regresión del `Select`.** Es un componente compartido por toda la app. Mitigación:
  el tamaño por defecto no cambia; la variante nueva es opt-in (CA-05.4).
- **R4 — Ruido en el nodo Transformar.** El detalle de campos que sobreviven/descartan puede
  saturar el drawer. Mitigación: bloque compacto y plegable, visible solo con ≥ 1 fila de
  mapeo y muestra disponible.
