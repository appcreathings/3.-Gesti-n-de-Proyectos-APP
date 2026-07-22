# Design 037 — Editor de Flujos: correcciones

> Decisiones técnicas para `spec.md`. Ancladas al código actual. Sin cambio de schema.

## 0. Mapa de archivos tocados (previsto)

| Área | Archivos | Naturaleza |
|------|----------|------------|
| A · Campo personalizado | `canvas/TransformConfigFields.tsx` | Estado explícito de "modo custom" en las dos celdas |
| B · Drop polimórfico | **nuevo** `canvas/useVariableDrop.ts`; `canvas/InterpolableField.tsx`, `ConditionConfigFields.tsx`, `TransformConfigFields.tsx` | Hook compartido + montaje en cada destino |
| C · Claridad del mapeo | **nuevo** `canvas/mappingEffect.ts`; `canvas/TransformConfigFields.tsx` | Helper puro + bloque explicativo |
| D · Condiciones | **nuevo** `flows/conditions.ts`; `flows/engine.ts`, `canvas/ConditionConfigFields.tsx` | Extracción del evaluador + picker corregido + editor de `in` + preview |
| E · Select | `components/ui/select.tsx`; `FlowBuilderPage.tsx`, `canvas/FlowCanvas.tsx`, `canvas/SampleExplorer.tsx` | Variantes de tamaño + adopción |

**Sin cambios de comportamiento** en: `applyMapping`, `interpolation.ts`, `validation.ts`,
`migration.ts`, `graph.ts`, schema `FlowRule`. Sin `schemaVersion` nuevo (Principio II).

---

## 1. Área A — Campo personalizado del mapeo (HU-01)

### A1. El defecto, con precisión
```ts
// TransformConfigFields.tsx:76-77 (y :118-119 en la celda destino)
const isKnown = value !== "" && available.some((v) => v.field === value);
const selectValue = value === "" ? "" : isKnown ? value : CUSTOM_VALUE;
//                  ^^^^^^^^^^^^^^^ esta rama gana al entrar en modo custom
```
`onChange(next === CUSTOM_VALUE ? "" : next)` fija `value = ""` → `selectValue` colapsa a `""`
→ `{selectValue === CUSTOM_VALUE && <Input …>}` no monta nunca.

El estado "estoy escribiendo a mano" **no es derivable del valor**: `""` significa a la vez
"sin elegir" y "custom recién abierto". Necesita estado propio.

### A2. Corrección
Un solo componente parametrizado (`MappingFieldCell`) que reemplace a las dos celdas casi
idénticas, con:

```ts
// `null` = deriva del valor (comportamiento al abrir el drawer);
// `true`/`false` = el usuario eligió explícitamente en esta sesión.
const [customMode, setCustomMode] = useState<boolean | null>(null);
const derivedCustom = value !== "" && !options.some((o) => o.field === value);
const isCustom = customMode ?? derivedCustom;
```
- Elegir `CUSTOM_VALUE` → `setCustomMode(true)` + `onChange("")` (CA-01.1, CA-01.3).
- Elegir una opción real → `setCustomMode(false)` + `onChange(next)` (CA-01.4).
- Al montar con un valor no conocido, `customMode === null` y `derivedCustom === true` → abre
  en modo personalizado (CA-01.5, preserva lo actual).
- El `<select>` usa `value={isCustom ? CUSTOM_VALUE : value}`.

Unificar ambas celdas evita que el defecto se arregle en una y sobreviva en la otra.
`SOURCE_FIELDS_DATALIST_ID` se conserva solo para el origen.

---

## 2. Área B — Drop polimórfico (HU-02)

### B1. Hook compartido
`VARIABLE_DRAG_MIME` ya existe en `VariablesPanel.tsx` (spec 036). Nuevo
`canvas/useVariableDrop.ts`:

```ts
export type VariableDropMode = "token" | "path" | "code";

export function variableDropText(field: string, mode: VariableDropMode): string {
  switch (mode) {
    case "token": return `{{${field}}}`;
    case "path":  return field;               // condición.field, mapping.source
    case "code":  return `record.${field}`;   // textarea de transformCode
  }
}

export function useVariableDrop(opts: {
  mode: VariableDropMode;
  onInsert: (text: string, el: HTMLInputElement | HTMLTextAreaElement | null) => void;
}): { dragOver: boolean; handlers: {...} }
```
Devuelve los `onDragOver`/`onDragLeave`/`onDrop` ya cableados y el flag para el anillo
(CA-02.2). `onDragOver` solo hace `preventDefault` si
`e.dataTransfer.types.includes(VARIABLE_DRAG_MIME)` (CA-02.5).

`variableDropText` es puro → testeable sin DOM.

### B2. Inserción en posición
Reusa `insertTokenAt` de spec 036, generalizándolo a texto arbitrario:
`insertTextAt(value, text, el)`, con `insertTokenAt` reimplementado encima para no romper a
`VariablePicker`. Los tests actuales de `insertToken.test.ts` siguen valiendo.

Para `record.campo` en el textarea de código: si el nombre no es un identificador JS válido
(`/^[A-Za-z_$][\w$]*$/`), emitir `record["Nombre Cliente"]` en vez de `record.Nombre Cliente`,
que sería un error de sintaxis. Detalle chico, pero es la diferencia entre insertar código
que corre y código que rompe "Probar".

### B3. Montaje por destino
| Destino | Archivo | `mode` |
|---|---|---|
| Campos de acción | `InterpolableField.tsx` (ya lo tiene, se migra al hook) | `token` |
| Campo de la condición | `ConditionConfigFields.tsx` | `path` |
| Origen del mapeo (input custom) | `TransformConfigFields.tsx` | `path` |
| Textarea de código | `TransformConfigFields.tsx` | `code` |

El **valor** de la condición queda deliberadamente fuera (CA-02.3): `evaluateCondition` compara
contra `condition.value` literal y nunca lo interpola.

---

## 3. Área C — Claridad del mapeo (HU-03)

### C1. Helper puro
Nuevo `canvas/mappingEffect.ts`:
```ts
export interface MappingEffect {
  kept: string[];      // targets que existirán tras el mapeo
  dropped: string[];    // campos de la muestra que se pierden
  brokenTokens: string[]; // campos descartados que alguna acción usa como {{token}}
}
export function mappingEffect(
  mapping: FieldMapping[],
  sampleFieldNames: string[],
  usedTokens: string[],
): MappingEffect
```
Espeja `applyMapping` **sin ejecutarlo**: `mapping.length === 0` → todo se conserva, nada se
descarta. Con ≥ 1 fila, `kept = mapping.map(m => m.target)` y
`dropped = sampleFieldNames.filter(f => !kept.includes(f))`.

`usedTokens` sale de `nodeUsedVariables` (spec 036) aplicado a los nodos de acción del grafo —
de ahí `brokenTokens` (CA-03.3). Requiere que el drawer del transform conozca los otros nodos:
se pasa por prop desde `CanvasInner`, que ya tiene `nodes`.

### C2. UI
- Etiqueta junto al título: **"Reemplaza el registro"** cuando `mapping.length > 0`;
  "Pasa los datos tal cual" cuando es 0 (CA-03.1, CA-03.5).
- Bloque plegable "Qué le pasa a tus datos" con dos listas (`kept` / `dropped`) y, si hay
  `brokenTokens`, un aviso en color de advertencia nombrando los tokens que dejarían de
  resolver (CA-03.2, CA-03.3).
- Mini-diagrama del orden real (CA-03.4), reusando el patrón del contrato `record → return`
  que 036 introdujo:
  `Registro crudo → [Condiciones] → [Mapeo] → [Código] → [Acciones]`
  con nota de que las condiciones ven el registro **antes** del mapeo.
- Nota en el origen: admite `a.b.c`, no admite `{{}}` (CA-03.6).

---

## 4. Área D — Condiciones (HU-04)

### D1. Extraer el evaluador (R1)
`evaluateCondition` y `toComparableNumber` (`engine.ts:602-650`) se **mueven tal cual** a
`src/flows/conditions.ts` y `engine.ts` los importa. Movimiento puro: cero cambios de lógica,
cero cambios de firma. Los tests actuales de `engine.test.ts` son la red que lo garantiza.

Se elige mover en vez de exportar in situ porque el módulo compartido deja explícito que ahora
tiene dos consumidores (motor + vista previa), que es justo lo que evita la divergencia que
spec 026 tuvo que corregir en la interpolación.

> **Nota de gobernanza:** spec 036 declaró `engine.ts` intocable. Aquí se toca de forma
> deliberada y acotada: solo se extraen dos funciones sin alterarlas. Si se prefiere no
> tocarlo, la alternativa es añadir `export` a ambas y dejarlas en `engine.ts` — mismo
> resultado funcional, módulo menos limpio.

### D2. Picker de campo corregido (CA-04.1)
El `FieldPicker` actual reusa `VariablePicker` (que inserta `{{campo}}`) y después le quita las
llaves con un regex `\w`-only que falla con espacios/acentos, escribiendo llaves literales en
`condition.field`.

Corrección: dejar de reusar `VariablePicker` para este caso y usar un selector propio que
entregue el **campo crudo** directamente — sin round-trip por `{{}}` que hay que deshacer.
Reusa las filas del `VariablesPanel` (campo + tipo + ejemplo) para no inventar otra lista.
Elimina la clase de bug entera en vez de ensanchar el regex.

### D3. Operador `in` (CA-04.3)
`condition.value` ya es `z.unknown()` en el schema → guardar `string[]` **no** requiere
migración. Al elegir `in`, el campo Valor se reemplaza por un editor de chips
(añadir/quitar), que persiste un array.

Retrocompat (R2): al abrir una condición `in` con un `value` string, se ofrece convertirlo
(separando por comas) con un aviso de que hasta ahora esa condición nunca se cumplía. No se
convierte solo: cambiar en silencio el comportamiento de un flujo activo es peor que
mostrarlo.

### D4. Vista previa (CA-04.4, CA-04.5)
Con muestra disponible, bajo el campo Valor:
- `N de M registros cumplen esta condición` — recorriendo `sample` con el evaluador de §D1.
- Valor real del campo en el registro de vista previa (`previewRecordIndex`, spec 026 §D3),
  ya disponible en `CanvasInner`.
- Si el campo no está en ninguna clave de la muestra, advertencia (CA-04.5).

---

## 5. Área E — Select (HU-05)

`select.tsx:14` mezcla altura, padding y tipografía en una sola cadena, y `sm:text-sm`
sobrevive a cualquier `text-*` que llegue por `className`. Corrección con `cva`, igual que
`button.tsx`/`badge.tsx` (idioma ya establecido en el repo):

```ts
const selectVariants = cva("… appearance-none rounded-md border …", {
  variants: {
    size: {
      default: "h-10 px-3 py-2 pr-8 text-sm",
      sm:      "h-8 px-2 py-1 pr-7 text-xs",
    },
  },
  defaultVariants: { size: "default" },
});
```
- Se retira `text-base sm:text-sm` de la base: la tipografía la fija la variante, así deja de
  haber una regla responsive que pisa lo que pasa el consumidor (CA-05.1).
- El icono `ChevronDown` se ajusta al tamaño (`size-4` / `size-3.5`) y a su `right-*`.
- `default` reproduce exactamente el aspecto actual → ningún uso existente cambia (CA-05.4).
- Adopción: `FlowBuilderPage` (onErrorPolicy), `FlowCanvas` (conditionMode), `SampleExplorer`
  (registro N) pasan a `size="sm"` y sueltan sus `h-8`/`h-7`/`text-xs` a mano (CA-05.2).

Los `<option>` nativos heredan el tema del SO; si el contraste en oscuro no alcanza (CA-05.3),
fijar `bg-background text-foreground` en las `option` del editor — verificar en el smoke antes
de agregar CSS que quizá no haga falta.

---

## 6. Accesibilidad

- Editor de chips de `in`: cada chip con botón de quitar rotulado; el input añade con Enter.
- Drop targets: `aria-describedby` que mencione que aceptan variables arrastradas.
- Vista previa de condición: texto, no solo color (no depender del verde/rojo).
- Foco visible en todo control nuevo; contraste AA en claro y oscuro.

## 7. Verificación (por fase)

- `tsc --noEmit` limpio · Vitest completo verde (baseline **678**) · `vite build` OK · lint sin
  errores nuevos.
- **Tests nuevos (unidad, sin DOM):**
  - `variableDropText` (los tres modos) e `insertTextAt` (posición, selección, identificador
    no válido → `record["…"]`).
  - `mappingEffect`: cero filas conserva todo; ≥ 1 fila descarta el resto; `brokenTokens`
    detecta el token de una acción que quedó sin campo.
  - `conditions.ts`: los tests que hoy cubren `evaluateCondition` vía engine siguen pasando +
    caso `in` con array (cumple) vs string (no cumple, comportamiento previo documentado).
- **Smoke visual del usuario** (no hay Playwright en el repo): ver §8.

## 8. Guion de smoke (resumen)

1. Mapeo → "Personalizado (escribir)…" deja escribir, sobrevive al borrado total, y el texto
   con espacios se guarda.
2. Arrastrar una variable a: título de acción (`{{campo}}`), campo de condición (`campo`),
   origen del mapeo (`campo`), textarea de código (`record.campo`); y comprobar que el campo
   *Valor* de la condición no la acepta.
3. Agregar una fila de mapeo → aparece "Reemplaza el registro" y la lista de descartados; si
   una acción usa un descartado, sale el aviso con el nombre.
4. Condición: elegir campo con espacios desde el selector → se guarda **sin** llaves; `in` con
   dos valores → cumple contra la muestra; el contador `N de M` coincide con los datos.
5. "Si una acción falla" y los demás selects compactos se leen completos en claro y oscuro.
