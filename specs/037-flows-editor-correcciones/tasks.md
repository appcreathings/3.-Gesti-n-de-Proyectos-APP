# Tasks 037 — Editor de Flujos: correcciones

> Numeración T3700+. Fases verticales; cada fase deja la app usable y se verifica
> (`tsc --noEmit` + Vitest + `vite build` + lint). Sin cambio de schema/migración.
> `∥` = paralelizable. Cada tarea ancla a `design.md`.
> Baseline al empezar: **678 tests en 66 archivos** (post spec 036).

## Fase 0 — Helpers puros (sin UI visible)
Extraer y testear antes de tocar pantallas.

- **T3700** `insertTextAt(value, text, el)` generalizando `insertTokenAt`; reimplementar
  `insertTokenAt` encima (sin cambio de comportamiento — sus tests siguen verdes). (design §B2)
- **T3701** `canvas/useVariableDrop.ts` con `variableDropText(field, mode)` puro para los tres
  modos, incluida la forma `record["campo raro"]` cuando el nombre no es identificador JS
  válido. (design §B1, §B2)
- **T3702** `canvas/mappingEffect.ts`: `mappingEffect(mapping, sampleFieldNames, usedTokens)`
  → `{ kept, dropped, brokenTokens }`, espejando `applyMapping` sin ejecutarlo. (design §C1)
- **T3703** Extraer `evaluateCondition` + `toComparableNumber` de `engine.ts:602-650` a
  `src/flows/conditions.ts`; `engine.ts` los importa. **Movimiento puro, cero cambios de
  lógica.** (design §D1)
- **T3704** Tests: `variableDropText` (3 modos + nombre no identificador), `insertTextAt`,
  `mappingEffect` (0 filas / ≥1 fila / brokenTokens), y `conditions` (`in` con array cumple,
  con string no cumple).
- **Checkpoint 0:** `tsc` + Vitest verdes (incluida toda la suite del engine, que es la red
  de T3703). Sin cambio visible en la app.

## Fase A — Campo personalizado del mapeo (HU-01) · **DEFECTO** ∥ con E
La corrección de mayor valor por esfuerzo: hoy la opción es inusable.

- **T3710** Unificar `MappingSourceCell` + `MappingTargetCell` en un `MappingFieldCell`
  parametrizado (origen/destino), eliminando la duplicación donde vive el bug por partida
  doble. (design §A2)
- **T3711** Estado explícito `customMode: boolean | null` con la regla
  `isCustom = customMode ?? derivedCustom`; entrar/salir del modo y persistencia del valor.
  (design §A2, CA-01.1–CA-01.4)
- **T3712** Verificar el camino de reapertura: valor guardado fuera de la lista abre en modo
  personalizado con su texto. (CA-01.5)
- **Checkpoint A:** smoke — elegir "Personalizado (escribir)…", escribir con espacios y
  acentos, borrar todo el texto (no debe rebotar), volver a un campo de la lista, guardar y
  reabrir.

## Fase B — Drop polimórfico (HU-02)
Depende de Fase 0.

- **T3720** Migrar `InterpolableField` al hook `useVariableDrop` (`mode="token"`) sin cambio
  de comportamiento. (design §B3)
- **T3721** Campo de la condición como drop target (`mode="path"`). (design §B3)
- **T3722** Origen del mapeo (input personalizado) como drop target (`mode="path"`).
- **T3723** Textarea de `transformCode` como drop target (`mode="code"` → `record.campo`).
- **T3724** Realimentación visual unificada (anillo + cursor de copia) y confirmación de que
  el campo *Valor* de la condición **no** acepta el drop, con nota en su ayuda. (CA-02.2,
  CA-02.3)
- **Checkpoint B:** smoke — arrastrar a los cuatro destinos y comprobar el texto insertado en
  cada uno; arrastrar texto ajeno no rompe nada.

## Fase C — Claridad del mapeo (HU-03)
Depende de T3702.

- **T3730** Etiqueta "Reemplaza el registro" / "Pasa los datos tal cual" según
  `mapping.length`. (CA-03.1, CA-03.5)
- **T3731** Pasar los nodos de acción al drawer del transform desde `CanvasInner` para poder
  calcular `usedTokens` con `nodeUsedVariables`. (design §C1)
- **T3732** Bloque plegable "Qué le pasa a tus datos": listas `kept` / `dropped` + aviso de
  `brokenTokens` nombrando los tokens que dejarían de resolver. (CA-03.2, CA-03.3, R4)
- **T3733** Mini-diagrama del orden real (crudo → condiciones → mapeo → código → acciones) y
  nota de que el origen admite `a.b.c` pero no `{{}}`. (CA-03.4, CA-03.6)
- **Checkpoint C:** smoke — con 0 filas dice "tal cual"; al agregar 1 fila aparece la lista de
  descartados; si una acción usa un campo descartado, sale el aviso con su nombre.

## Fase D — Condiciones (HU-04)
Depende de T3703. Es el bloque con más superficie.

- **T3740** Reemplazar el `FieldPicker` que hace round-trip por `{{}}` (y su regex `\w`-only)
  por un selector que entregue el path crudo, reusando las filas del panel de variables
  (campo + tipo + ejemplo). (design §D2, CA-04.1, CA-04.2)
- **T3741** Editor de valores múltiples para el operador `in`, persistiendo `string[]`.
  (design §D3, CA-04.3)
- **T3742** Conversión asistida al abrir una condición `in` con `value` string: ofrecerla con
  aviso, **nunca** convertir en silencio. (design §D3, R2)
- **T3743** Vista previa: `N de M registros cumplen` + valor real del campo en el registro de
  vista previa (`previewRecordIndex`). (design §D4, CA-04.4)
- **T3744** Advertencia cuando el campo elegido no aparece en ninguna clave de la muestra.
  (CA-04.5)
- **Checkpoint D:** smoke — campo con espacios se guarda sin llaves y la vista previa lo
  resuelve; `in` con dos valores cumple; el contador coincide con los datos reales.

## Fase E — Select (HU-05) ∥ con A
- **T3750** `select.tsx` con `cva` y variantes `default` / `sm`; retirar `text-base sm:text-sm`
  de la base; icono adaptado al tamaño. (design §E, CA-05.1)
- **T3751** Adoptar `size="sm"` en `FlowBuilderPage` (onErrorPolicy), `FlowCanvas`
  (conditionMode) y `SampleExplorer` (registro N), soltando los `h-8`/`h-7`/`text-xs` manuales.
  (CA-05.2)
- **T3752** Barrido de regresión: confirmar que ningún otro uso de `Select` en la app cambió de
  aspecto (el `default` debe ser idéntico al de hoy). (CA-05.4)
- **Checkpoint E:** smoke — "Si una acción falla" y los demás compactos se leen completos, en
  claro y oscuro, incluida la lista desplegada.

## Fase F — Cierre
- **T3760** Repaso de accesibilidad de todo lo nuevo (chips de `in`, drop targets, preview de
  condición): foco, rótulos, contraste AA, información no solo por color. (design §6)
- **T3761** Verificación final: `tsc --noEmit`, Vitest completo (baseline 678 + los de T3704),
  `vite build`, lint sin errores nuevos.
- **T3762** Guion de smoke visual para el usuario (§8 de `design.md`).

## Secuencia sugerida
`Fase 0` → (`A` ∥ `E`) → `B` → `C` → `D` → `F`.

A y E son las de mejor relación valor/esfuerzo y no dependen de nada: A destraba una función
hoy imposible de usar y E es un arreglo acotado de un componente compartido. D es la más
grande; si hay que recortar, los candidatos a diferir son **T3742** (conversión asistida de
`in`, se puede dejar el aviso sin la conversión) y **T3744** (advertencia de campo ausente,
que `VariableValidationHint` ya cubre parcialmente).

## Invariantes (no violar)
- **`applyMapping` no se toca.** El mapeo se explica, no se cambia (decisión fijada). Nada de
  fusionar registros ni de alterar qué campos sobreviven.
- Sin conexiones manuales / ramificación: `nodesConnectable` sigue `false`, aristas derivadas
  por `relinkEdges` (invariante heredado de spec 036).
- Sin `schemaVersion` nuevo ni migración. `condition.value` ya es `z.unknown()`, así que el
  array de `in` entra sin tocar el schema.
- El único cambio en `engine.ts` es la **extracción sin modificación** de T3703. Si al
  terminar esa tarea algún test del engine cambia de resultado, el movimiento no fue puro:
  revertir y revisar.
- El tamaño `default` del `Select` no cambia de aspecto — es un componente de toda la app.
