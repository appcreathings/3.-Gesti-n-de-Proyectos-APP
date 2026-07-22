# Smoke 039 — Datos legibles y una sola forma de elegir variables

> Guion de verificación visual para el usuario. El repo no tiene Playwright: el render, el
> teclado, el plegado de paneles y el contraste en tema oscuro se confirman en el navegador.
> Todo ocurre en `/app/flows/:id`. Los puntos 3 y 4 necesitan un flujo con trigger
> **"Al cambiar el estado de una tarea"** y al menos un proyecto con una tarea real.

## 1. Controles del canvas (HU-01)

- [ ] Deshacer/rehacer están **en columna**, del mismo ancho que zoom/ajustar/maximizar/atajos —
      sin escalón a la derecha de la columna inferior.
- [ ] Siguen siendo **dos grupos** separados por un hueco, no una tira de siete iconos.
- [ ] Con el flujo recién abierto, deshacer está gris. Mové un nodo: el `title` dice la operación
      concreta ("Deshacer: Mover nodo").

## 2. Depurador plegable (HU-02)

- [ ] Simulá el flujo. Plegá con el `>` del encabezado: el canvas se ensancha y queda una pestaña
      vertical con badge de conteo, **igual a la de Variables**.
- [ ] Desplegá: la traza **sigue ahí** (plegar no es limpiar).
- [ ] Simulá, plegá, desplegá: las franjas de estado sobre los nodos no cambian.
- [ ] Los nodos **no se mueven** al plegar (decisión explícita, R5); "Ajustar a pantalla"
      reencuadra a un clic.
- [ ] Tema oscuro: la pestaña y su badge se leen bien.

## 3. Datos del evento (HU-03)

- [ ] El panel de Variables lista `task.title`, `task.status`, `task.assigneeName`,
      `project.name`… con valores de ejemplo, **sin ejecutar nada**.
- [ ] Poné `{{task.title}}` en el payload de un webhook y usá "Probar webhook": llega el título,
      no el uuid.
- [ ] Una condición `task.status` `==` `doing` se cumple en la vista previa.
- [ ] Con payload "Registro completo" y trigger de evento, aparece la nota nueva bajo el selector
      de Payload (CA-03.7).
- [ ] Borrá la tarea y simulá: no rompe, la traza sigue trayendo los ids (CA-03.5).

## 4. Transformar — las dos etapas (HU-04)

- [ ] Mapeá `dealname → title` (o `task.title → title`). En una **acción**, el picker `{}` ofrece
      `title` y **ya no** el campo de origen.
- [ ] La **condición** sigue ofreciendo el campo de origen (pre-mapeo).
- [ ] El panel de Variables muestra **dos secciones** con encabezado: "Del trigger" y "Después de
      Transformar".
- [ ] Un token viejo que apunte al nombre pre-mapeo enciende un warning ámbar en el banner
      **diciendo que el Transformar renombró los campos**.
- [ ] Escribí algo en el código del Transformar: el panel añade "esta lista puede quedarse corta o
      de más".

## 5. Picker homologado (HU-05)

- [ ] En una acción y en una condición, el menú se ve **igual**: mismo icono `{}`, misma fila
      (campo · tipo · ejemplo), mismo orden.
- [ ] Acción: variable → submenú de formatos → se inserta `{{campo|date}}` en la posición del
      cursor.
- [ ] Condición: variable → submenú de **operadores** → se setean campo y operador, y el
      `<select>` de abajo muestra ese mismo operador (CA-05.5).
- [ ] En ninguno aparece ya "escribir campo…"; escribir a mano en el input de al lado sigue
      funcionando.
- [ ] Teclado: `Tab` al botón, `Enter` abre, flechas navegan, `→` entra al submenú, `Esc` cierra.

## 6. Valor de la condición (HU-06)

- [ ] Elegí un campo con el valor **vacío** → se pre-rellena con un valor real.
- [ ] Escribí algo, elegí otro campo → **no lo pisa**.
- [ ] El botón de lista junto al input ofrece los valores que ese campo tiene de verdad en la
      muestra.
- [ ] Con operador `in`, elegir un valor lo **añade** a la lista (no la reemplaza), y elegir el
      mismo dos veces no duplica.
- [ ] El texto sigue diciendo que es literal y no acepta `{{tokens}}` (CA-06.4).

## 7. Sin arrastre (HU-07)

- [ ] Las filas del panel **no se arrastran** (el cursor no es `grab`).
- [ ] Copiar token sigue funcionando (el icono cambia a ✓ un segundo).
- [ ] Ningún campo del editor muestra anillo azul al pasar algo por encima.
- [ ] El texto de ayuda del panel explica **qué forma espera cada destino** (token / nombre /
      `record.campo`).

---

## R1 — claves nuevas en el payload de un webhook sin payload configurado

Las de siempre (`type`, `projectId`, `taskId`, `areaId`, `checklistId`, `itemId`, `typeId`,
`from`, `to`) **siguen ahí, con el mismo nombre y el mismo valor**. Se suman:

| Evento | Claves nuevas |
|---|---|
| `task.added`, `task.statusChanged`, `task.commented`, `task.archived`, `task.unarchived` | `project.name`, `project.status`, `project.health`, `project.priority`, `task.title`, `task.status`, `task.priority`, `task.dueDate`, `task.assigneeId`, `task.assigneeName`, `task.tags` |
| `project.created`, `project.statusChanged` | `project.name`, `project.status`, `project.health`, `project.priority` |
| `area.added`, `area.completed` | las 4 de `project.` + `area.name` |
| `checklist.completed` | las 4 de `project.` + `area.name`, `checklist.name` |
| `item.checked` | las 4 de `project.` + `area.name`, `checklist.name`, `item.text` |

Para revisar escenarios de Make/Zapier:

- Las claves llevan **punto literal** (`{"task.title": "…"}`), no objetos anidados: se mapean como
  `task.title` entre comillas, no como `task` → `title`.
- `task.tags` es un **array**; el resto son strings.
- Una clave **se omite** si no se pudo resolver (tarea borrada, sin responsable, sin fecha
  límite). No llega `""` — se leería como "no tiene" en vez de "no lo pude resolver". Un escenario
  que asuma presencia fija de `task.dueDate` debe tolerar la ausencia.
- Los flujos de **polling** (HubSpot/Sheets/inbox) no cambian nada.
