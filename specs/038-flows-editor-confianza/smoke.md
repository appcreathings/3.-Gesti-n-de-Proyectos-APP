# Smoke visual 038 — guion para verificar en el navegador

> El repo no tiene Playwright: el render, el drag-and-drop, el teclado y el contraste en tema
> oscuro se confirman a mano. Ruta: `/app/flows/:id` (editar un flujo existente).
> Estado automatizado al entregar: `tsc` limpio · **771 tests / 73 archivos** (baseline 713) ·
> `vite build` OK · lint sin errores nuevos.

## 0. Preparar

Crea (o abre) un flujo con: trigger de **polling**, 2 condiciones, transform vacío y 3 acciones
(un `webhook`, un `email`, un `createTask`). Deja alguna cosa mal a propósito — el punto 1 lo usa.

---

## 1. Issues en el canvas (Fase A · HU-01)

1. Deja el **webhook sin URL**, el **email sin conexión** y un `createTask` apuntando a un
   **proyecto borrado**. → Los tres nodos de acción muestran insignia **roja** con el número de
   problemas en la esquina superior derecha, y una línea roja con el mensaje bajo el resumen.
   *(Antes: los tres se veían idénticos a uno correcto — `ActionNode` nunca marcaba nada.)*
2. Quita la conexión del trigger → el nodo Trigger marca error igual.
3. Deja una condición **sin campo** → insignia **ámbar** (es warning, no error) y borde ámbar.
4. Usa `{{campo_inexistente}}` en el título de una acción, con muestra cargada → esa acción suma
   un warning ámbar. Con errores y warnings juntos, la insignia es roja y cuenta **los dos**.
5. Pasa el cursor por la insignia → `title` con la lista completa de mensajes.
6. Borra todas las acciones → "El flujo no tiene acciones" aparece **solo en el banner**
   superior, sin colgar de ningún nodo (CA-01.4).
7. Arregla uno de los problemas en el drawer → la insignia se apaga **en vivo** al cerrar.
8. Un flujo sin ningún problema se ve exactamente como antes: sin insignias, sin líneas extra.
9. En **modo oscuro**, comprobar que rojo/ámbar sobre el fondo del nodo se leen bien.

## 2. Etiquetas honestas (Fase B · HU-06)

1. Trigger de **inbox** (Make/Zapier) → el nodo dice **"Polling Make/Zapier (inbox)"**.
   *(Antes decía "Polling Google Sheets".)*
2. El panel **Variables** (derecha) muestra el proveedor en la línea de origen:
   `Muestra real · 3 registros · Make/Zapier (inbox)` o `Campos elegidos en el poll · …`.
3. Trigger de HubSpot con `objectType` → "Polling HubSpot · deals". Google Sheets → sin cambios.
4. Condición con operador `in` y dos valores → el nodo resume `stage in [won, closed]`.
5. Una condición legacy cuyo valor es el string `"won,closed"` → se resume **entrecomillada**:
   `stage in "won,closed"`. Los dos casos ya no se ven iguales (es el par que nunca se cumple).

## 3. Deshacer (Fase C · HU-02)

1. Selecciona una acción configurada y pulsa **`Supr`** → desaparece. **`Ctrl+Z`** → vuelve
   **con toda su configuración**.
2. Abre el drawer de una acción y escribe un título largo. Cierra. **Un** `Ctrl+Z` lo borra
   entero, no letra a letra.
3. Reabre el drawer del **mismo** nodo y escribe otra cosa → es un paso de deshacer **nuevo**
   (no se funde con la edición anterior).
4. Con el cursor **dentro** de un input del drawer, `Ctrl+Z` deshace el **texto** (deshacer nativo
   del navegador), **no** el nodo. Esto es lo más importante de toda la fase.
5. **Arrastra** un nodo de arriba a abajo y suelta → un solo `Ctrl+Z` lo devuelve a su sitio (no
   uno por píxel). Un **clic** sin arrastrar no añade ningún paso (el botón deshacer no cambia).
6. Botones **deshacer/rehacer** abajo a la izquierda, encima del zoom: deshabilitados cuando no
   hay nada; el `title` dice la operación concreta ("Deshacer: Borrar nodo").
7. `Ctrl+Shift+Z` y `Ctrl+Y` rehacen. Tras deshacer y **editar algo nuevo**, rehacer se apaga.
8. Guarda. Haz un cambio → aparece "Guardar Cambios". `Ctrl+Z` hasta el estado guardado → el
   botón vuelve a **"Sin cambios"** solo (CA-02.6).
9. Con el drawer de un nodo abierto, deshacer una operación que borra ese nodo → el drawer se
   cierra sin error; **rehacer** no lo reabre solo (CA-02.7).
10. Bajo los campos del flujo se lee la nota de que el deshacer cubre el canvas, no el nombre,
    las etiquetas ni la política de fallo (CA-02.9).

## 4. Simulación sobre los nodos (Fase D · HU-04)

1. Pulsa **"Simular flujo"** en el Depurador → aparece la **barra de simulación** arriba al
   centro del canvas, y cada nodo gana una **franja al pie**.
2. Cada **condición** dice `Se cumple` / `No se cumple` con el **valor real** del campo y el
   esperado.
3. Cada **acción** dice `Se ejecutaría` con su **plan** ("Se crearía la tarea 'X' en el proyecto
   'Y'"), o `Omitida` / `Error` con el motivo.
4. Pon una condición que **no se cumpla** y vuelve a simular → todas las acciones dicen
   **`No alcanzada`** (no "omitida": son cosas distintas — CA-04.3).
5. Con un `transformCode` que falle → el nodo **Transformar** dice `Falló el código` con el
   mensaje, y las acciones quedan `No alcanzada`.
6. Con **varios registros** en la traza, el selector **Registro N de M** cambia la proyección de
   todos los nodos a la vez.
7. **Edita cualquier nodo** después de simular → la barra marca **"Desactualizada"** en ámbar y la
   proyección **sigue visible** (no se borra sola — el usuario puede estar leyéndola).
8. **"Limpiar"** quita las franjas y la barra, **y el Depurador conserva su traza textual**
   exactamente igual que antes (CA-04.8).
9. **Separación de canales (R3):** un nodo con error de configuración **y** proyección muestra
   insignia roja arriba (permanente) y franja abajo (solo con simulación). No se confunden.

## 5. Legibilidad y duplicar (Fase E · HU-03/HU-05)

1. Condiciones y acciones aparecen **numeradas** 1..n junto a su etiqueta de tipo.
2. **Arrastra** una acción por encima de otra y suelta → la numeración se recalcula y coincide
   con el nuevo orden de ejecución.
3. El nodo **Transformar vacío** (sin mapeo ni código) se ve en segundo plano: borde punteado,
   opacidad reducida y chip **"opcional"**. Al añadirle un mapeo, recupera el peso visual normal.
4. Botón **duplicar** (icono de copia) en condiciones y acciones, junto a la X → el duplicado
   aparece **justo debajo** del original, con todo copiado y numeración corrida. `Ctrl+Z` lo quita.
5. Editar el duplicado **no** cambia el original.
6. **Trigger** y **Transformar** no ofrecen duplicar (no tienen el botón), y `Ctrl+D` sobre ellos
   no hace nada.
7. `Ctrl+D` con **varios nodos seleccionados** (Shift+clic) los duplica todos en **un** paso de
   deshacer.
8. Botón **teclado** (abajo a la izquierda, bajo maximizar) → diálogo de atajos con `Ctrl+Z`,
   `Ctrl+Shift+Z`, `Ctrl+D`, `Supr`, `Ctrl+S`, `Shift+clic`, `Shift+arrastre`, `Esc`. Navegable
   con `Tab` y cerrable con `Esc`.

## 6. Que nada se rompió (regresión de 036/037)

1. Maximizar/restaurar el canvas, `Esc` para salir.
2. Botón "＋" de una arista para insertar condición/acción en medio → sigue funcionando y ahora
   es deshacible.
3. Arrastrar una variable del panel a un campo del drawer.
4. Guardar con errores → el diálogo "Guardar como inactivo" sigue igual.
5. **Vista previa** de flujos en `/app/flows` (`FlowPreviewCanvas`): los nodos se ven sin
   insignias, sin franjas y sin numeración — no monta los proveedores de contexto y degrada solo.
