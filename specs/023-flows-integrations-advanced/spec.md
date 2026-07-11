# Spec 023 — Integración avanzada con Google Sheets/HubSpot + Flujos con lógica real

## Progreso

- **Fase A — Vault: persistencia elegible + auto-lock configurable: ✅ implementada y verificada
  (2026-07-11).**
  - `crypto.ts`: `deriveKey(passphrase, salt, {extractable})` (default sigue no-extraíble, sin tocar
    las operaciones normales) + `exportKeyRaw`/`importKeyRaw`.
  - `vault.ts`: `persistenceMode: "off"|"session"|"always"`; en `unlock()`/`setupMasterPassword()`, si
    el modo ≠ "off" deriva la clave extraíble y la exporta a `sessionStorage`/`localStorage`;
    `restoreFromPersistence()` la reimporta al arrancar; `setPersistenceMode()` siempre limpia ambos
    storages primero (evita una clave vieja en el storage equivocado tras cambiar de modo).
  - `vault-auto-lock.ts`: `autoLockMinutes` configurable (`0` = desactivado, default 10 min sin
    cambios); el lock de `beforeunload` se omite cuando `persistenceMode !== "off"`.
  - `App.tsx`: `restoreFromPersistence()` antes de `initVaultAutoLock()` en el bootstrap.
  - Nueva UI `VaultSecuritySettings.tsx` (tab "Seguridad" en `IntegrationsPage.tsx`): selector de modo
    + minutos de auto-lock, con aviso del trade-off de seguridad.
  - **Bug preexistente arreglado de paso**: el botón de header decía "Desbloquear" incluso cuando el
    vault ya estaba desbloqueado (debía decir "Bloquear").
  - Verificado end-to-end en navegador real (Playwright): elegir persistencia "en la sesión", crear
    contraseña maestra, recargar la página → sigue desbloqueado sin pedir contraseña. Cero errores de
    consola.
  - 8 tests nuevos. `typecheck`/`lint`/`test` (314/314) en verde.

- **Fase B — Explorador de conexión (operación + respuesta cruda) + guías faltantes: ✅ implementada y
  verificada (2026-07-11).**
  - `connections.ts`: `runConnectionProbe(provider, config, secret, options)` — HubSpot ofrece
    `contacts`/`deals`/`tickets`/`search` (mismo endpoint que usan los pollers reales)/`custom` (path
    GET libre); Sheets solo `read`; Email gana `ping` (alcanzable) y `send-test` (envía un correo real
    vía `email-via-apps-script.ts`). Devuelve `raw` (respuesta cruda) + `records` aplanados.
    `testConnection` se reescribió como envoltura fina sobre `runConnectionProbe` con la operación por
    defecto de cada proveedor — los 6 tests existentes siguen pasando sin cambios.
  - `ConnectionDialog.tsx`: panel plegable "Explorador de conexión" — selector de operación, inputs
    condicionales (ruta personalizada / destinatario de prueba), botón "Ejecutar", visor de respuesta
    cruda en `<pre>`.
  - `AppsScriptGuide.tsx`: nuevo paso "Crea una App Privada de HubSpot" (scopes de lectura, dónde
    copiar el token `pat-na1-...`, nota sobre el flujo legacy sin pestaña "Scopes"); nueva variante
    `provider: "email"` completa (código `Code.gs` con `MailApp.sendEmail`, honesto sobre que el
    remitente real es la cuenta de Google, no el "Email remitente" decorativo). Botón de guía del tab
    Email ahora conectado en `IntegrationsPage.tsx`.
  - Verificado en navegador real: Explorador de conexión de Email mostrando "Enviar correo de prueba"
    con su campo de destinatario; guía completa navegable. Cero errores de consola.
  - 6 tests nuevos. `typecheck`/`lint`/`test` (320/320) en verde.

- **Fase C — Variables asistidas + asociación origen→destino intuitiva: ✅ implementada y verificada
  (2026-07-11).**
  - Nuevo `src/features/flows/canvas/variables.ts`: `deriveAvailableVariables(trigger, sample)` (unión
    de campos de la muestra real, o campos conocidos del tipo de evento si no hay muestra — antes esto
    último no existía, un trigger de evento sin "Probar conexión" no ofrecía nada);
    `INTERNAL_TARGET_FIELDS`/`allInternalTargetFields()` (catálogo de campos de Hito por entidad);
    `suggestFieldMappingPairs()` (empareja por nombre normalizado + alias conocidos de HubSpot como
    `firstname`→`name`, `dealname`→`name`).
  - Nuevo `VariablePicker.tsx`: menú `{{ }}` que inserta el token en la posición real del cursor
    (usando `selectionStart`/`selectionEnd` del input) y devuelve el foco.
  - `TransformConfigFields.tsx`: el mapeo de campos pasó de dos `<Input>` de texto libre a **dos
    `<Select>` emparejados** (campo recibido con su valor de ejemplo ↔ campo interno de Hito), cada
    uno con una opción "Personalizado…" que revela un input de texto para casos no cubiertos por el
    catálogo; botón "Auto-emparejar".
  - `FlowCanvas.tsx`/`ActionConfigFields.tsx`: la muestra del trigger ahora también llega al nodo de
    acción; cada input interpolable (título, nombre, valor, mensaje, to/subject/body, valores de
    persona) gana su `VariablePicker`.
  - Verificado en navegador real: mapeo con selectores + Auto-emparejar, y selector de variables en un
    input de acción insertando `{{campo}}` correctamente. Cero errores de consola.
  - 10 tests nuevos. `typecheck`/`lint`/`test` (330/330) en verde.

- **Fase D — Nodo "Crear tarea" completo + referencia al proyecto recién creado: ✅ implementada y
  verificada (2026-07-11).**
  - `flow.ts`: `CreateTaskOutputSchema` gana `status`/`assigneeId`/`dueDate`/`tags`/`estimate`/
    `summary` y `projectRef: "explicit"|"trigger"|"createdProject"` (default `"explicit"`, preserva el
    comportamiento previo). `SCHEMA_VERSION` 8→9 + migración identidad en `flows`.
  - `engine.ts`: nuevo `RunContext` por registro (`lastCreatedProjectId`), seteado por `createProject`
    y leído por `createTask` cuando `projectRef: "createdProject"` — antes era imposible encadenar
    "crear proyecto → crear tarea en ese proyecto" (comentario explícito en el código lo documentaba).
    Nuevo helper `resolveCreateTaskProjectId`.
  - **Bug real encontrado y arreglado por el propio smoke test**: al encadenar `createProject` →
    `createTask(projectRef:"createdProject")`, el proyecto recién creado terminaba en
    `changedProjects` **además de** `newProjects` — `applyFlowResult` lo persistía dos veces (primero
    con la tarea vía `persistProject`, después `createProject()` lo pisaba con la versión sin tarea
    capturada al crearlo), perdiendo la tarea en silencio. Arreglado filtrando `changedProjects` y
    refrescando `newProjects` con la versión final de `projectMap` al cierre de `runFlowEngine`.
  - `ActionConfigFields.tsx`: UI completa de `createTask` (selector de proyecto destino en 3 modos +
    área scoped + estado/prioridad/responsable/fecha límite/etiquetas/estimación/resumen/descripción,
    todos con `VariablePicker`); `createProject` gana selector de producto y editor de "campos
    adicionales" (antes en el schema, sin UI).
  - Verificado en navegador real: drawer de "Crear Tarea" con los 3 modos de proyecto destino y todos
    los campos nuevos visibles. Cero errores de consola.
  - 4 tests nuevos (incl. el bug del doble-persist). `typecheck`/`lint`/`test` (334/334) en verde.

- **Fase E — Deduplicación por clave en crear-tarea / crear-proyecto: ✅ implementada y verificada
  (2026-07-11).**
  - `flow.ts`/`project.ts`: `dedupeKey?: string` en ambos outputs; `Task.dedupeKey`/`Project.dedupeKey`
    (`string | null`, default `null`) para dejar la marca en el dato mismo. `SCHEMA_VERSION` 9→10 +
    migración identidad en `flows` y `projects`.
  - `engine.ts`: `findProjectByDedupeKey`/`findTaskByDedupeKey` (búsqueda O(n) entre todos los
    proyectos conocidos por el engine, existentes + creados en la misma corrida). Antes de crear, si
    `dedupeKey` está configurado y ya existe una entidad con esa clave, se omite; si el `createProject`
    omitido tenía un `createTask` encadenado, `runContext.lastCreatedProjectId` igual apunta al
    proyecto existente para que la cadena siga funcionando.
  - **Auditoría del modelo de deduplicación (documentada aquí, sin código nuevo)**: el sistema ahora
    tiene tres capas independientes que no se pisan: (1) el **watermark** (`poll-sync-state.ts`)
    decide qué registros se vuelven a *traer* de la API externa; (2) `idempotencyCheck`
    (`idempotency.ts`) decide qué registros ya traídos se vuelven a *procesar* dentro de un poller
    (cache en memoria + `syncLogs`); (3) el nuevo **`dedupeKey`** decide qué *entidades de Hito* ya
    fueron creadas, independientemente de si el registro se re-procesó — la única capa que protege
    contra duplicados reales cuando "Ejecutar ahora" ignora el watermark a propósito
    (`fetchPollSampleForFlow` usa `lastSyncAt: null`), o cuando el mismo registro externo dispara dos
    flujos distintos apuntando al mismo proyecto.
  - UI: campo "Clave de deduplicación" en `createTask`/`createProject` (con `VariablePicker`) — no
    estaba en el plan original de la ola pero era necesario para que el schema fuera usable desde la
    UI (sin esto, el campo existía pero nada lo exponía).
  - Verificado con tests: correr el mismo flujo de poll dos veces con `dedupeKey` fijo crea una sola
    tarea; sin `dedupeKey` seguía creando siempre (compatibilidad).
  - 4 tests nuevos. `typecheck`/`lint`/`test` (338/338) en verde.

- **Fase F — Historial profundo y depurable + panel de servicios programados: ✅ implementada y
  verificada (2026-07-11).**
  - `engine.ts`: `runFlowEngine` gana `input.trace?: boolean` (opt-in) y acumula `FlowRunTrace` por
    flow que matcheó su trigger — por registro (recortado a 5): condiciones con veredicto + operandos
    evaluados, datos mapeados, input/output del transform, y el desenlace de cada output
    (`executed`/`skipped`/`error` + motivo). Requirió reescribir `executeOutput` para devolver un
    `OutputExecutionOutcome` en vez de solo `string[]` — antes era imposible distinguir "se ejecutó
    pero no mutó ningún proyecto" (ej. `createNotification`) de "se omitió" (ej. dedup, proyecto no
    resuelto), ambos devolvían `[]`.
  - **Bug real encontrado y arreglado por el propio test de la traza**: el snapshot de "datos después
    del mapeo" se guardaba por referencia al mismo objeto que `transformCode` recibe y frecuentemente
    muta in-place (`record.x = ...; return record;`, el patrón que sugiere el propio placeholder de la
    UI) — la traza mostraba el mapeo *ya mutado* como si fuera el estado previo al transform. Arreglado
    clonando con `structuredClone` antes de pasar el objeto al transform.
  - `useFlowStore.ts`: `FlowRunLog` gana `trace?`/`preview?`; `useDataStore.ts` (`applyFlowResult`)
    los puebla desde `flowResult.traces` en las 3 corridas (evento, poll, "Ejecutar ahora" — las tres
    ahora piden `trace: true`).
  - Nuevo `FlowHistoryPage.tsx` (ruta `/app/flows/history`, botón "Historial" en `FlowsPage.tsx`):
    historial global con filtros por flujo/estado; `FlowRunDetailDrawer.tsx` +
    `FlowRunTraceView.tsx` renderizan la traza paso a paso (timeline con `<pre>` colapsables).
  - Nuevo `ScheduledServicesPage.tsx` (ruta `/app/flows/services`, botón "Servicios"): polling activo
    (`pollingManager.getAllStatuses()`, nuevo — `getStatus()` exigía conocer la key de antemano, no
    alcanzaba para listar), procesador de webhooks salientes (`isOutboundProcessorRunning()`, nuevo),
    estado del vault. Solo lectura.
  - **Bug real de fuga encontrado y arreglado (auditoría)**: `visibility-aware.ts`
    `stopVisibilityAwarePolling()` reseteaba el flag `initialized` pero nunca quitaba el
    `addEventListener("visibilitychange", ...)` real — un ciclo init→stop→init dejaba dos listeners
    activos, cada evento futuro llamando `pauseAll`/`resumeAll` dos veces. Dormido en producción (nada
    llama a `stop` hoy fuera de tests), pero real. Arreglado guardando la referencia del handler para
    poder desuscribirla.
  - Verificado en navegador real: `/app/flows/history`, `/app/flows/services`, botones del header,
    drawer de "Crear Tarea" con traza — cero errores de consola en todo el recorrido.
  - 12 tests nuevos (traza, historial, `getAllStatuses`, fuga de `visibility-aware`).
    `typecheck`/`lint`/`test` (350/350) en verde.

- **Fase G — Generador IA de la lógica de transformación: ✅ implementada y verificada (2026-07-11).**
  - Nuevo `src/ai/generate-transform.ts`: `runGenerateTransform`/`runGenerateTransformWithFallback`,
    mismo plumbing que `src/ai/improve.ts` (cliente Gemini, rate limiter, fallback por grupo de
    modelos) pero prompt/parseo propios — genera el cuerpo de `transformCode`, no un JSON de
    sugerencias. `parseGenerateTransformResponse` limpia fences de markdown (```js/```javascript/```
    genérico) y valida sintaxis con `new Function("record", code)` — el mismo guard que
    `LogicSchema.transformCode` usa al guardar, así un código roto nunca llega al campo.
  - Nuevo hook `useGenerateTransform.ts` (análogo a `useAiImprove.ts`): carga/cancelación/error con
    los mismos mensajes que el resto del asistente IA.
  - `TransformConfigFields.tsx`: panel "Generar con IA" (input de instrucción + botón) sobre el
    editor de código; el código generado se aplica vía un `useEffect` (no directo en el render, que
    actualizaría el estado del padre en medio de un render del hijo).
  - Verificado en navegador real: panel visible con su input y botón "Generar", junto al mapeo con
    Auto-emparejar de la Fase C en el mismo nodo. Cero errores de consola.
  - 10 tests nuevos. `typecheck`/`lint`/`test` (360/360) en verde.

**Estado: spec 023 completo — las 7 fases implementadas y verificadas.** `npm run build` en verde en
cada fase; verificación final end-to-end en navegador real (Playwright) cubriendo las 7 fases
(incluida una prueba de persistencia de vault real: crear contraseña con modo "sesión" → recargar →
sigue desbloqueado). 360/360 tests, cero errores de consola en todo el recorrido.

## Context

Specs 020-022 dejaron Conexiones + Flujos + canvas + "Ejecutar ahora" + muestra real
funcionando (`specs/020-flows-integrations-v2/spec.md`, `specs/021-hubspot-sheets-robustness/spec.md`,
`specs/022-manual-flow-run-and-sample-mapping/spec.md`). Pero al usarlo de verdad con HubSpot/Sheets
aparecen 7 huecos que impiden construir un flujo con lógica útil. Cada uno está confirmado en el
código (exploración archivo por archivo, 3 agentes + lectura directa):

1. **Probar conexión es una caja negra.** `testConnection` (`src/integrations/connections.ts:111`)
   hace **una sola** operación hardcodeada por proveedor y solo devuelve `{ok, detail, sample}`; la UI
   (`ConnectionDialog.tsx`, `IntegrationsPage.tsx`) muestra únicamente el `detail` (para Sheets, un
   **conteo de filas** — `connections.ts:151`). No se puede elegir la operación ni ver la respuesta
   cruda, así que el usuario no sabe qué datos existen para construir lógica. Faltan guías:
   `AppsScriptGuide.tsx` solo cubre `hubspot`/`google-sheets` (no email) y no documenta cómo crear una
   **App Privada (legacy) de HubSpot**. El vault se auto-bloquea a los 10 min (`vault-auto-lock.ts`,
   `LOCK_TIMEOUT_MS`) y siempre al recargar → se reingresa demasiado seguido.
2. **No hay forma cómoda de insertar variables.** La interpolación `{{campo}}` (`engine.ts:591`) es
   potente pero se escribe a ciegas; solo `TransformConfigFields` sugiere campos (datalist de la
   muestra). El resto de inputs (`ActionConfigFields.tsx`) no ofrece nada, y el mapeo origen→destino
   sigue siendo dos `<Input>` de texto libre sin ayuda de asociación.
3. **El nodo "Crear tarea" es incompleto.** `CreateTaskOutputSchema` (`flow.ts:102`) solo expone
   `title`/`priority` en la UI (`ActionConfigFields.tsx:31-53`) — sin selector de proyecto, área, ni el
   resto de campos de `Task` (`project.ts:90`: status, assigneeId, dueDate, tags, estimate, summary,
   description). Para triggers de poll el `source` está vacío (`engine.ts:227`) → `createTask` hace
   **no-op silencioso** (`engine.ts:389`). Y no se puede apuntar al **proyecto recién creado** por un
   nodo `createProject` previo (comentario explícito `engine.ts:380-383`: "no hay forma de 'el proyecto
   recién creado' implícita todavía").
4. **El historial está escondido y es superficial.** Solo se ve expandiendo cada tarjeta en
   `FlowsPage.tsx` (últimos 5, `runs.filter(...).slice(0,5)`), sin vista global ni detalle de por qué
   un flujo hizo o no hizo algo.
5. **Servicios programados sin visibilidad.** `pollingManager` (`setInterval` + backoff),
   `retry-engine` (procesa cada 30s), `vault-auto-lock`, visibility-aware — ninguno es inspeccionable
   ni auditado end-to-end.
6. **Sin deduplicación real.** Solo `createPerson` deduplica (`engine.ts:404`). `createTask`/
   `createProject` crean uno nuevo cada corrida; "Ejecutar ahora" ignora el watermark
   (`fetchPollSampleForFlow` con `lastSyncAt:null`) → duplica. El único mecanismo hoy es el watermark de
   `poll-sync-state.ts` + `idempotencyCheck` (que dedupe el **procesamiento** del registro externo, no
   la **entidad creada**).
7. **La lógica de transformación exige saber JS.** `transformCode` es JS crudo (`new Function`,
   `engine.ts:302`) sin ayuda para generarlo.

**Outcome buscado:** poder inspeccionar de verdad una conexión (elegir operación + ver respuesta
cruda), construir un flujo con variables asistidas y una asociación origen→destino intuitiva, crear
tareas completas apuntadas al proyecto correcto (incluido el recién creado), sin duplicar, con un
historial profundo y depurable, servicios programados a la vista, y un asistente de IA que escriba la
transformación.

## Decisiones confirmadas con el usuario

- **Vault:** ofrecer al usuario elegir el modo de persistencia del desbloqueo entre **"en la sesión"**
  (sessionStorage, se borra al cerrar la pestaña) y **"siempre"** (localStorage, persiste entre
  sesiones), además del actual "no persistir" como opción por defecto. Auto-bloqueo por inactividad
  configurable (incl. desactivado). Se documenta el trade-off de seguridad (la clave derivada se guarda
  en el store elegido).
- **Variables:** un **selector de campos** (desplegable) que inserta el token `{{campo}}` en cualquier
  input interpolable, alimentado por la muestra real / campos del evento. No se crea un almacén de
  variables con nombre.
- **Asociación origen→destino:** debe ser muy intuitiva — selectores emparejados en vez de texto libre
  a ciegas, con auto-emparejado por nombre parecido.
- **Dedup:** cada nodo crear-tarea/crear-proyecto define una **clave de dedup** interpolada (p.ej.
  `{{id}}`); si ya existe una entidad con esa clave, **se omite** (no se actualiza).
- **Historial:** además de accesible desde `/flows`, debe ser **profundo y depurable** — no solo
  éxito/error, sino la traza paso a paso de qué pasó con cada registro.

## Fase A — Vault: persistencia elegible + auto-lock configurable

- **`src/integrations/crypto.ts`**: añadir un camino de clave **exportable**. Hoy `deriveKey` produce
  una `CryptoKey` no extraíble; para persistir hay que poder `exportKey("raw")`. Añadir
  `deriveKey(passphrase, salt, { extractable })` (o `deriveExtractableKey`) sin cambiar el default
  no-extraíble que usan las operaciones normales. Helpers `exportKeyRaw(key)` / `importKeyRaw(bytes)`.
- **`src/integrations/vault.ts`** (`useVaultStore`): nuevo estado/preferencia
  `persistenceMode: "off" | "session" | "always"` (persistida en
  `localStorage["hito:vault-persist-mode"]`, es pública). En `unlock()`/`setupMasterPassword()`, si el
  modo ≠ `off`, deriva la clave **extraíble**, exporta raw y la guarda en `sessionStorage` (session) o
  `localStorage` (always) bajo `hito:vault-key`. `lock()` borra ambos. Nuevo `restoreFromPersistence()`
  que al arrancar reimporta la clave si existe → `isUnlocked = true` sin passphrase.
- **`src/integrations/vault-auto-lock.ts`**: `LOCK_TIMEOUT_MS` pasa a leer una preferencia
  `autoLockMinutes` (`localStorage["hito:vault-autolock-min"]`, `0` = desactivado); el `beforeunload`
  lock se **omite** cuando `persistenceMode ≠ off`.
- **`src/App.tsx`**: en el bootstrap (junto a `initVaultAutoLock`, ~`App.tsx:210`) llamar
  `restoreFromPersistence()` antes de `initVaultAutoLock()`.
- **UI**: sección "Seguridad del Vault" en `IntegrationsPage.tsx` (o `SettingsPage.tsx`): selector de
  modo de persistencia + minutos de auto-lock, con aviso claro del trade-off. Reusar
  `VaultSetupDialog` para el flujo de contraseña.
- Tests: roundtrip export/import raw (`crypto.test.ts`); `unlock` con `persistenceMode:"session"`
  escribe/lee la clave y `lock` la borra; `restoreFromPersistence` reconstruye `isUnlocked`.

## Fase B — Probar conexión: operación + respuesta cruda + guías

- **`src/integrations/connections.ts`**: generalizar la prueba. Nueva
  `runConnectionProbe(provider, config, secret, operation)` que reusa `postToProxy` y devuelve
  `{ ok, detail, raw?: unknown, records?: Record<string,unknown>[] }`. Operaciones por proveedor:
  - HubSpot: `contacts` / `deals` / `tickets` / `search` / `custom` (path GET libre).
  - Sheets: `read` (rango).
  - Email: `ping` (alcanzable) / `send-test` (envía un correo de prueba vía
    `email-via-apps-script.ts`).
  `testConnection` se conserva como envoltura fina (operación por defecto) para no romper llamadas
  existentes.
- **UI "Explorador de conexión"** en `ConnectionDialog.tsx` (panel plegable): `<Select>` de operación +
  botón "Ejecutar" + visor de **respuesta cruda** (JSON con `<pre>`, mismo patrón que la "Vista previa
  de datos" de `TransformConfigFields.tsx:115-123`). Muestra registros reales, no solo el conteo.
- **`src/features/integrations/guides/AppsScriptGuide.tsx`**: añadir un bloque/paso "Crear una App
  Privada de HubSpot" (scopes `crm.objects.{contacts,deals,tickets}.read`, dónde copiar el token
  `pat-na1-…`); añadir la variante `provider: "email"` a `PROVIDER_CONTENT`/`getSteps()` (cómo
  desplegar el Apps Script de envío de correo, permisos `MailApp`, "ejecutar como Yo / acceso
  Cualquiera"). Wire el botón de guía del tab Email en `IntegrationsPage.tsx`.
- **Ejecuciones muestran datos, no conteo**: enriquecer el `detail`/preview del historial para incluir
  el primer registro (ver Fase F) — cierra el "se devuelve la cantidad, no puedo crear lógica".
- Tests: `runConnectionProbe` por operación (mock `postToProxy`) devuelve `raw`/`records`; email
  `send-test` llama al proxy correcto.

## Fase C — Variables asistidas: selector + asociación origen→destino intuitiva

- **Helper compartido** `deriveAvailableVariables(trigger, sample)` (extraído de la lógica
  `availableFields` ya en `TransformConfigFields.tsx:45-47`): une claves de la muestra real + campos
  conocidos por tipo de evento (de `synthetic-event.ts`/`events.ts`) + (Fase D) tokens del proyecto
  creado. Cada variable lleva un ejemplo de valor (de la muestra) para mostrarlo en el picker.
- **Catálogo de campos internos** `INTERNAL_TARGET_FIELDS`: lista de los campos destino de Hito por
  entidad (Task: `title`, `description`, `status`, `priority`, `assigneeId`, `dueDate`, `tags`,
  `estimate`, `summary`; Project: `name`, `status`, `productId`, `description`; Person: `name`,
  `email`, `roleTitle`), derivada de los schemas de `project.ts` — para que el "campo destino" deje de
  ser texto libre.
- **Nuevo `src/features/flows/canvas/VariablePicker.tsx`**: botón/menú `{{ }}` que lista las variables
  disponibles (con su valor de ejemplo) e inserta `{{campo}}` en el input asociado (en la posición del
  cursor).
- **Asociación origen→destino muy intuitiva** (mapeo, reescritura de las dos `<Input>` de texto plano
  de `TransformConfigFields.tsx:137-158`): cada fila de mapeo pasa a **dos selectores emparejados** —
  a la izquierda el **campo recibido** (desplegable de `deriveAvailableVariables`, con su valor de
  ejemplo visible), una flecha, a la derecha el **campo interno de Hito** (desplegable de
  `INTERNAL_TARGET_FIELDS`). Botón "Auto-emparejar" que sugiere asociaciones por nombre parecido
  (p.ej. `email`→`email`, `firstname`→`name`). Se conserva la opción de escribir un valor libre para
  casos avanzados. El objetivo: asociar "la variable que llega en la petición" con "la variable
  interna" seleccionando en ambos lados, sin adivinar nombres.
- **Threading de la muestra al nodo de acción**: hoy solo `TransformConfigFields` recibe `sample`
  (`FlowCanvas.tsx` estado `triggerSample`). Pasar ese `sample` también al `case "action"` →
  `ActionConfigFields`.
- **`ActionConfigFields.tsx`**: colgar el `VariablePicker` de cada input interpolable (createTask
  `title`/`description`, createProject `name`, setField `value`, createNotification `message`, email
  `to`/`subject`/`body`, createPerson valores).
- Tests: `deriveAvailableVariables` (unión muestra+evento, sin duplicados); `INTERNAL_TARGET_FIELDS`
  por entidad; el "Auto-emparejar" sugiere pares por nombre; inserción del token en el índice correcto.

## Fase D — Nodo "Crear tarea" completo + referencia al proyecto creado

- **`src/domain/schemas/flow.ts` — `CreateTaskOutputSchema`**: añadir campos que ya existen en `Task`
  (`project.ts:90`) y faltan: `status?`, `assigneeId?`, `dueDate?`, `tags?` (array), `estimate?`,
  `summary?` (además de `title/projectId/areaId/priority/description` actuales). Nuevo campo de
  **targeting de proyecto**: `projectRef?: "explicit" | "trigger" | "createdProject"` (default
  `"explicit"`, que usa `projectId`).
- **`src/flows/engine.ts`**: en el loop de registros, rastrear `lastCreatedProjectId` (lo setea el
  `case "createProject"`). En `case "createTask"`, resolver el proyecto según `projectRef`:
  `"createdProject"` → `lastCreatedProjectId`; `"trigger"` → `source.projectId`; `"explicit"`/ausente
  → `output.projectId` (comportamiento actual, vía `resolveTargetProjectId`). Aplicar el resto de
  campos nuevos al `newTask(...)`.
- **`ActionConfigFields.tsx` (case `createTask`)**: reescribir con: selector "Proyecto destino"
  (`projectRef`: Específico → `EntitySelect` de proyectos / "Proyecto del evento disparador" /
  "Proyecto creado en este flujo"), selector de área (`EntitySelect` scoped al proyecto), y los campos
  completos (status, assignee, dueDate, tags, estimate, summary, description, priority). Reusar
  `EntitySelect` (`src/components/forms/EntitySelect.tsx`).
- **createProject (opcional, mismo archivo)**: exponer `productId` y `fields` (ya en
  `CreateProjectOutputSchema`, hoy sin UI) — bajo esfuerzo, cierra el "no tienen todos los campos".
- Bump `SCHEMA_VERSION` (`common.ts`) + migración identidad para `flows` (`migrations.ts`), ya que
  `CreateTaskOutputSchema` gana campos opcionales (aditivo).
- Tests: engine resuelve `projectRef:"createdProject"` al proyecto recién creado en la misma corrida;
  `createTask` con `projectRef:"explicit"` sigue como antes; los campos nuevos llegan al task.

## Fase E — Deduplicación por clave en crear-tarea / crear-proyecto

- **Schema**: `CreateTaskOutputSchema` y `CreateProjectOutputSchema` ganan `dedupeKey?: string`
  (plantilla interpolada, p.ej. `{{id}}`/`{{email}}`). `Task`/`Project` (`project.ts`) ganan
  `dedupeKey?: string | null` (default `null`) para dejar la marca **en el dato** (local-first,
  inspeccionable). Bump `SCHEMA_VERSION` + migración identidad.
- **`src/flows/engine.ts`**: antes de crear, si `output.dedupeKey` está configurado, interpolarlo
  sobre el registro; buscar en los proyectos existentes (o sus tareas) una entidad con ese `dedupeKey`
  guardado; si existe → **omitir** (con `console.warn` + entrada de historial "omitido por dedup"); si
  no, crear y **persistir la clave** en la entidad nueva. Búsqueda O(n) sobre proyectos/tareas —
  aceptable para app mono-usuario.
- **Auditoría del modelo actual**: documentar en este spec cómo interactúan watermark
  (`poll-sync-state.ts`), `idempotencyCheck` (procesamiento del registro externo) y el nuevo dedup por
  entidad — confirmar que están bien definidos y no se pisan. "Ejecutar ahora" (que ignora watermark)
  queda cubierto por el dedup por clave.
- Tests: correr el mismo flujo dos veces con `dedupeKey` fijo crea **una** entidad; sin `dedupeKey`
  mantiene el comportamiento actual (crea siempre); la clave se interpola y se guarda en la entidad.

## Fase F — Historial profundo y depurable + panel de servicios programados

- **Traza de ejecución en el motor (depuración)**: `runFlowEngine` (`src/flows/engine.ts`) emite una
  **traza estructurada** opt-in por corrida. Nuevo tipo `FlowRunTrace` con pasos por flujo y por
  registro: `triggerMatched` (qué disparó, cuántos registros trajo) → por cada registro: `record`
  (input crudo), `conditions[]` (cada condición con su resultado `pass/fail` y los operandos
  evaluados — clave para depurar el bug de números-como-string), `mapped` (tras `applyMapping`),
  `transform` (input/output/error de `transformCode`), y `outputs[]` (por output: `type`,
  `skipped`/`executed`/`error`, motivo — p.ej. "omitido por dedup", "proyecto destino no resuelto",
  ids creados/mutados). El motor ya calcula casi todo esto internamente; se instrumenta para
  **acumularlo** en vez de descartarlo (`console.warn` actuales pasan a pasos de la traza).
- **`FlowRunLog` gana `trace?: FlowRunTrace` y `preview?`** (primer registro/resumen). Se escribe en
  `applyFlowResult`/`recordOutcome` (`useDataStore.ts`). Como la traza puede pesar, se recorta (máx N
  registros por corrida) y el `RUN_LOG_CAP` puede bajarse o guardarse la traza aparte del resumen.
- **Historial global depurable**: nueva ruta `/app/flows/history` (`ROUTES` en `src/routes/paths.ts`)
  + botón "Historial" en el header de `FlowsPage.tsx`. Lista `useFlowStore.runs` completos con filtros
  por flujo y estado (success/error/omitido). Cada corrida abre un **drawer de depuración** que
  renderiza la traza paso a paso (timeline: trigger → condiciones con su veredicto → datos mapeados →
  transform in/out → resultado de cada output), con los registros crudos en `<pre>` colapsables. Esto
  convierte el historial en un depurador real: se ve **por qué** un flujo hizo o no hizo algo.
- **Panel de servicios programados**: nueva ruta/sección `/app/flows/services` mostrando
  `pollingManager.getStatus()` (registros activos, intervalo, último/próximo tick, estado de backoff),
  estado del procesador outbound (`retry-engine`), y estado del vault auto-lock. Solo lectura
  (diagnóstico).
- **Auditoría**: revisar arranque/parada de `pollingManager` (fugas de `setInterval` al editar/borrar
  flujos vía `useFlowStore`), el intervalo de 30s de `retry-engine`, y `visibility-aware`; documentar
  hallazgos y arreglar cualquier fuga.
- Tests: `runFlowEngine` con traza activada produce los pasos esperados (condición fallida marca
  `fail` con operandos; output omitido por dedup marca `skipped` con motivo); la vista de historial
  filtra por flujo/estado; `getStatus()` refleja registros tras `addFlow`/`deleteFlow`.

## Fase G — Generador IA de la lógica de transformación

- **Nuevo `src/ai/generate-transform.ts`**:
  `runGenerateTransform({ apiKey, model, instruction, sampleRecord, availableFields })` →
  `{ ok: true, code } | { ok: false, error }`. Reusa `createClient` (`@/ai/gemini/client`),
  `rateLimiter`, `classifyAiError`, y el patrón de fallback de `runImproveWithFallback`
  (`getModelsByGroup`). System prompt: "recibes `record` y devuelves el objeto transformado; responde
  SOLO con el cuerpo JS, sin markdown". Validar el código generado con `new Function("record", code)`
  antes de devolverlo (mismo guard que `LogicSchema`).
- **UI en `TransformConfigFields.tsx`**: botón "✨ Generar con IA" + input de instrucción en lenguaje
  natural; al generar, rellena `transformCode` (y el usuario puede "Probar con datos de ejemplo" que
  ya existe). Usa `useAiConfigStore` para `apiKey`/`model` (mismo plumbing que `useAiImprove.ts`);
  reusa los mensajes de error de IA y el enlace a Ajustes → IA. Hook opcional `useGenerateTransform`.
- Tests: `parseGenerateResponse` limpia ```` ```js ```` y valida sintaxis; error de key/rate-limit se
  propaga como en `improve.ts`.

## Archivos clave

- **Fase A**: `src/integrations/crypto.ts`, `src/integrations/vault.ts`,
  `src/integrations/vault-auto-lock.ts`, `src/App.tsx`,
  `src/features/integrations/IntegrationsPage.tsx` (o `SettingsPage.tsx`).
- **Fase B**: `src/integrations/connections.ts`,
  `src/features/integrations/components/ConnectionDialog.tsx`,
  `src/features/integrations/guides/AppsScriptGuide.tsx`,
  `src/features/integrations/IntegrationsPage.tsx`, reusa `src/integrations/proxy-fetch.ts` y
  `src/integrations/outbound/email-via-apps-script.ts`.
- **Fase C**: nuevo `src/features/flows/canvas/VariablePicker.tsx`,
  `src/features/flows/canvas/FlowCanvas.tsx` (threading del sample),
  `src/features/flows/canvas/ActionConfigFields.tsx`, helper compartido `deriveAvailableVariables`
  (extraído de `TransformConfigFields.tsx`).
- **Fase D**: `src/domain/schemas/flow.ts`, `src/flows/engine.ts`,
  `src/features/flows/canvas/ActionConfigFields.tsx`, `src/domain/schemas/common.ts`
  (`SCHEMA_VERSION`), `src/domain/migrations.ts`; reusa `src/components/forms/EntitySelect.tsx`.
- **Fase E**: `src/domain/schemas/flow.ts`, `src/domain/schemas/project.ts`, `src/flows/engine.ts`,
  `src/domain/migrations.ts`.
- **Fase F**: `src/features/flows/FlowsPage.tsx` + nuevas vistas `FlowHistoryPage.tsx`/
  `ScheduledServicesPage.tsx`, `src/routes/paths.ts`, `src/store/useFlowStore.ts`,
  `src/store/useDataStore.ts`, `src/integrations/polling/polling-manager.ts` (getStatus).
- **Fase G**: nuevo `src/ai/generate-transform.ts`,
  `src/features/flows/canvas/TransformConfigFields.tsx`; reusa `src/ai/gemini/client.ts`,
  `src/ai/rateLimiter.ts`, `src/ai/models.ts`, `src/store/useAiConfigStore.ts`.

Reutilizar sin reinventar: `postToProxy` (`proxy-fetch.ts`), `EntitySelect`
(`components/forms/EntitySelect.tsx`), `createClient`/`rateLimiter`/`getModelsByGroup` (subsistema
IA), `useAiConfigStore`, `FlowRunLog`/`recordRuns` (`useFlowStore`), `pollingManager.getStatus()`, el
patrón de `<pre>` JSON de `TransformConfigFields`.

## Verificación

- `npm run typecheck && npm run lint && npm test` en verde (tests nuevos por fase).
- `npm run build` en verde.
- Smoke manual en navegador (dev server, Playwright), por fase:
  - A: elegir persistencia "en la sesión", recargar → sigue desbloqueado; "bloquear" → pide
    contraseña.
  - B: en una conexión, elegir operación (p.ej. deals) y ver la respuesta cruda con registros reales;
    abrir la guía de email y la de App Privada de HubSpot.
  - C: en el nodo Transformar, asociar un campo recibido (muestra real) con un campo interno usando
    los dos selectores + "Auto-emparejar"; en un input de acción, abrir el selector de variables y ver
    que inserta `{{campo}}`.
  - D: crear flujo con nodo Crear Proyecto → Crear Tarea con "Proyecto creado en este flujo"; ejecutar
    y confirmar que la tarea cae en el proyecto nuevo con los campos completos.
  - E: "Ejecutar ahora" dos veces con dedupeKey fijo → una sola entidad.
  - F: abrir `/app/flows/history`, abrir una corrida y recorrer la traza paso a paso (condiciones con
    veredicto, transform in/out, outputs con motivo); abrir `/app/flows/services` y ver los registros
    de polling activos.
  - G: describir en lenguaje natural una transformación y confirmar que genera `transformCode` válido
    que pasa "Probar con datos de ejemplo".

## Fuera de alcance (documentado)

- Sandbox real para `transformCode` (sigue `new Function`, aceptado para app mono-usuario).
- Almacén de variables con nombre reutilizables entre flujos (solo selector de campos, por decisión
  del usuario).
- Dedup con "actualizar si existe" (solo omitir, por decisión del usuario) — se puede añadir después
  reusando el patrón `matchField`/`ifNotFound` de `createPerson`.
- Condiciones por-rama en el canvas (sigue pendiente de spec 021 Anexo; no entra aquí).
- Cron real / triggers por hora del día (sigue siendo polling por intervalo).
- Webhooks entrantes de HubSpot (sigue polling).
