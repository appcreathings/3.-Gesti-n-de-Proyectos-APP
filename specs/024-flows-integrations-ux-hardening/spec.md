# Spec 024 — Flujos e Integraciones: confiabilidad, reutilización y escala

## Progreso

- **Estado general: 🟢 Fase 1 completa (F2, F10-fix, F14-parcial, F7, F3, F6-fix); Fases 2-3 en
  backlog (2026-07-11).**
  Este documento nace de una revisión de UX/producto sobre el módulo de Flujos e Integraciones,
  reconciliada contra el código real (`src/flows/`, `src/integrations/`, `src/features/flows/`,
  `src/features/integrations/`) y contra las specs 018–023 ya construidas. A diferencia de esas specs,
  024 arranca en estado de backlog: cada feature abajo tiene su propio estado (✅ ya construido / 🟡
  parcial o con bug / ❌ gap real) y su fase de roadmap. Se actualizará esta sección con "✅ implementada
  y verificada" a medida que cada fase se ejecute, siguiendo la convención de 018–023.

- **F2 — "Fallido" real: webhook/email fallidos ya no cuentan como éxito: ✅ implementada y verificada
  (2026-07-11).**
  - `src/flows/engine.ts`: los outputs `webhook`/`email` ya no tragan errores. `webhook` ahora
    relanza si `fetch` lanza (antes solo se anotaba `deliveryError` sin cambiar el desenlace) o si la
    respuesta no es 2xx (**bug adicional encontrado**: el código previo nunca revisaba
    `response.ok`, así que un webhook respondiendo 4xx/5xx ya se contaba como éxito). El intento
    sigue quedando en `result.outboundDeliveries` aunque falle. `email`: **bug más grave encontrado
    de paso** — el código previo llamaba a `sendEmailViaAppsScript` pero ignoraba por completo su
    valor de retorno `{success, error}` (esa función nunca lanza, siempre resuelve), así que un envío
    fallido era estructuralmente invisible para el motor. Ahora se revisa `sendResult.success` y se
    relanza si falló.
  - `src/store/useFlowStore.ts`: `FlowRunLog.status` gana un tercer valor `"partial"`.
  - `src/store/useDataStore.ts`: `applyFlowResult` ya no emite una entrada `"success"` y otra
    `"error"` por separado para la misma corrida cuando un flow tuvo outputs exitosos y fallidos a la
    vez — las agrupa en una sola entrada `"partial"` con un resumen deduplicado de los errores
    (`summarizeFlowErrors`, cap de 3 mensajes distintos + contador).
  - UI: badge/ícono ámbar ("Parcial") en `FlowsPage.tsx`, `FlowHistoryPage.tsx` (incluye nuevo filtro
    por estado "Parcial") y `FlowRunDetailDrawer.tsx`, usando el token de diseño ya existente
    `warning`/`text-warning` (no se introdujo un color nuevo).
  - 7 tests nuevos en `src/flows/engine.test.ts` (webhook: red/HTTP no-2xx/éxito; email: fallo/éxito,
    con `getConnection`/`sendEmailViaAppsScript` mockeados) + 1 test nuevo en
    `src/store/useDataStore.runFlowNow.test.ts` (verifica la consolidación a una sola entrada
    `"partial"`). `typecheck`/`lint`/`test` (366/366) en verde.
  - Fuera de esta fase (quedan para F1/F3): el motor todavía no reintenta estos fallos, y todavía no
    hay notificación automática cuando un flow activo falla — ambos dependían de que "fallido" fuera
    detectable primero, que es justo lo que esta fase resuelve.

- **F10 (fix de colisión) — Polling indexado por conexión, no por tipo de objeto: ✅ implementada y
  verificada (2026-07-11).**
  - `src/flows/engine.ts`: `pollTriggerKey(trigger)` ahora incluye `connectionId` —
    `hubspot:${connectionId}:${objectType}` / `google-sheets:${connectionId}` — en vez de solo
    `"hubspot"`/`"hubspot-${objectType}"`/`"google-sheets"`. Esta es la única fuente de verdad de la
    key: la usan tanto el registro de polling como el matching de trigger (`matchesTrigger`) y la
    resolución de datos (`resolveTriggerData`), así que el fix cierra los dos síntomas del bug a la
    vez: (a) `pollingManager.register` ya no desregistra el timer de un flujo al registrar otro que
    comparte provider+objectType pero apunta a una conexión distinta; (b) `runPolledFlow` ya no
    despacha los registros de una conexión a un flujo que usa otra conexión — antes de este fix, dos
    flujos de HubSpot "contacts" con conexiones distintas literalmente intercambiaban datos entre sí,
    no solo competían por el timer.
  - `src/integrations/inbound/hubspot-polling-manager.ts` y `sheets-polling-manager.ts`: la key local
    (antes recalculada a mano en cada archivo, duplicando la lógica) se reemplazó por el
    `pollTriggerKey` importado de `engine.ts` — se usa consistentemente para `pollingManager.register`,
    el cursor incremental (`loadLastSyncAt`/`saveLastSyncAt`) y `runPolledFlow`. `unregisterHubSpotPolling`
    y `unregisterSheetsPolling` cambiaron de firma (antes tomaban `objectType`/nada; ahora toman el
    `PollTrigger` completo, necesario para computar la misma key) — `useFlowStore.ts` actualizado.
  - **Efecto secundario esperado, documentado en vez de resuelto con migración**: el cursor
    `lastSyncAt` de conexiones que ya estaban registradas bajo la key vieja (ej. `"hubspot"`) queda
    huérfano en `localStorage`; el primer poll tras este cambio vuelve a traer todo por falta de
    watermark. `poll-sync-state.ts` ya documentaba este modo degradado como seguro ("la idempotencia
    dedupea") — aplica igual aquí, y no se justifica una migración de storage para un cambio de
    formato de key en una app local-first de un solo usuario.
  - `ScheduledServicesPage.tsx` no requirió cambios: ya renderizaba la key cruda con fuente
    monoespaciada (pensado como panel de diagnóstico técnico), así que sigue funcionando con el nuevo
    formato de key, solo que ahora es más larga/específica. Una etiqueta amigable (nombre de la
    conexión en vez de su id) queda para el semáforo de carga de Fase 2, no para este fix.
  - 8 tests nuevos/actualizados en `src/flows/engine.test.ts`: unit test directo de `pollTriggerKey`
    (keys distintas por conexión, misma key para la misma conexión) + test de extremo a extremo con
    dos flujos sobre el mismo provider/objectType y conexiones distintas confirmando que cada uno
    procesa solo sus propios registros. 6 tests preexistentes que usaban keys crudas
    (`"hubspot"`/`"hubspot-deals"`) migrados al nuevo formato. `useDataStore.runFlowNow.test.ts`: mock
    de `pollTriggerKey` actualizado para reflejar el formato real. `typecheck`/`lint`/`test`
    (368/368) en verde.
  - Fuera de esta fase (quedan para Fase 2, F10 coalescing+semáforo): si dos flujos comparten la
    *misma* conexión+objectType+intervalo, cada uno sigue haciendo su propia consulta por separado en
    vez de compartir una — no hay pérdida de datos ni colisión (cada uno tiene su timer independiente
    ahora), solo redundancia de llamadas a la API externa.

- **F14 (parcial) — Flujos incluidos en el export/import del workspace: ✅ implementada y verificada
  (2026-07-11); export de Conexiones sin secretos queda pendiente.**
  - `src/storage/FileSystemAdapter.ts` y `src/storage/DownloadAdapter.ts` (ambas implementaciones de
    `StorageAdapter`, antes duplicaban la misma omisión): `exportAll()`/`importAll()` ahora incluyen
    los docs `flows` y `flow-runs`, simétrico al tratamiento ya existente de
    `people`/`notifications`/`activity`. Antes "Exportar todo" en Ajustes solo incluía la colección
    legacy `automations` — los Flujos modernos (`FlowRule`) no viajaban en absoluto, así que un backup
    o una migración a otra carpeta/instancia los perdía en silencio.
  - `src/features/settings/CollectionTransferCard.tsx`: "Flujos" agregado como colección
    exportable/importable individualmente (ya soportaba genéricamente cualquier `DocName`, solo
    faltaba declararlo en `ITEMS`/`DOCS`). De paso, la entrada legacy se renombró a "Automatizaciones
    (legacy)" para reducir la confusión con "Flujos" que motivó parte de este feedback.
  - **Deliberadamente fuera de esta pasada**: exportar las Conexiones (`hito-integrations`, Dexie) sin
    sus secretos. Viven en un almacén completamente distinto al que usa `StorageAdapter`
    (`people`/`flows`/etc. son archivos/IndexedDB simple; las Conexiones son una tabla Dexie con
    `encryptedSecret` protegido por el vault) — mezclarlas en el mismo bundle de "Exportar todo"
    habría requerido un formato de archivo nuevo, lógica de despojo de secretos, y un flujo de
    reconexión al importar. El gap de mayor impacto (los Flujos en sí, que es lo que corrige la
    premisa falsa del feedback original) ya está resuelto; el export de Conexiones queda como
    incremento futuro dentro de F14, no como parte de Fase 1.
  - Sin tests nuevos: ninguno de los dos adapters tenía cobertura previa (dependen de la File System
    Access API real / IndexedDB del navegador; `vitest.config.ts` corre en `environment: "node"`, sin
    `window`/`indexedDB`), así que el cambio se verificó por simetría exacta con el patrón ya usado
    para `people`/`notifications`/`activity` (mismas líneas, mismo `if (bundle.x) writeDoc(...)`) y
    `typecheck`/`lint`/`test` completo (368/368) en verde — no se introdujo infraestructura de test
    nueva (ej. `fake-indexeddb`) solo para este fix puntual.

- **F7 — Duplicar flujo: ✅ implementada y verificada (2026-07-11).**
  - `src/flows/migration.ts`: nueva `duplicateFlow(flow)`, hermana de `createEmptyFlow` — clona
    `trigger`/`logic`/`outputs`/`graph` tal cual, con `id` nuevo, nombre `"${flow.name} (copia)"`,
    `enabled: false` (para no registrar polling hasta que el usuario la active a propósito),
    `runCount: 0`/`lastRunAt: null` y timestamps frescos.
  - `src/features/flows/FlowsPage.tsx`: botón "Duplicar" en cada tarjeta (entre "Editar" y
    "Eliminar"), llama a `duplicateFlow` + `useFlowStore.addFlow` (reutilizado tal cual — ya persiste
    y solo registra polling si `enabled`) y navega directo al editor de la copia.
  - 2 tests nuevos en `src/flows/migration.test.ts` (copia campos + resetea identidad/historial; no
    muta el original). `typecheck`/`lint`/`test` (370/370) en verde.
  - Verificado en navegador real (Playwright headless contra `npm run dev`, con
    `showDirectoryPicker` enmascarado para forzar el fallback sin diálogo nativo): crear un flujo,
    pulsar "Duplicar" → navega al editor de una copia nueva con el nombre "Nuevo flujo (copia)" en el
    campo; al volver a `/app/flows`, la copia aparece como tarjeta separada marcada "Inactivo", con el
    mismo trigger/transformación que el original (que queda intacto y sigue "Activo"). Cero errores de
    consola.

- **F3 — Notificación cuando un flujo activo falla: ✅ implementada y verificada (2026-07-11).**
  - `src/domain/schemas/flow.ts`: `FlowRuleSchema` gana `notifyOnFailure: boolean` (default `true`).
    `SCHEMA_VERSION` 10→11 + paso de migración identidad para `flows` en `src/domain/migrations.ts`
    (campo opcional/defaulteado, sin transformación de datos).
  - `src/store/useDataStore.ts`: `applyFlowResult` gana un parámetro obligatorio
    `options: { isAutomatic: boolean }` — los tres call sites ahora lo pasan explícitamente:
    `runAutomations` (evento) y `runPolledFlowImpl` (poll) con `true`; `runFlowNowImpl` ("Ejecutar
    ahora") con `false`. Al construir los `runLogs`, cualquier entrada `error`/`partial` de un run
    automático dispara una notificación vía el módulo de Notificaciones existente
    (`s.addNotifications`, la misma API que ya consume el output `createNotification` del motor) si el
    flow está `enabled` y `notifyOnFailure !== false`. Severidad `critical` para `error`, `warning`
    para `partial`.
  - **Anti-spam:** cooldown en memoria (`FLOW_FAILURE_NOTIFY_COOLDOWN_MS = 15 min`) por `flowId`
    (`Map` a nivel de módulo, mismo patrón que el estado de backoff de polling) — un flow que falla en
    cada poll de 5 min no genera una notificación nueva cada 5 min.
  - `src/features/flows/FlowBuilderPage.tsx`: checkbox "Notificarme si este flujo falla" bajo el
    nombre del flujo (marcado por defecto), usando el `Checkbox` ya existente en el design system.
  - 8 tests nuevos: `src/store/useDataStore.flowFailureNotify.test.ts` (7 — notifica en error/partial
    con la severidad correcta, no notifica si el flow está inactivo/opt-out, respeta el cooldown, no
    notifica en éxito, y "Ejecutar ahora" nunca notifica aunque el flow falle) + verificación manual
    del checkbox. `typecheck`/`lint`/`test` (377/377) en verde.
  - Verificado en navegador real (Playwright headless): el checkbox aparece en `/app/flows/new`,
    marcado por defecto, y alterna correctamente al hacer clic. Cero errores de consola. La emisión
    real de la notificación (que requiere una corrida automática fallando de verdad) queda cubierta
    por los tests unitarios en vez de un smoke test en vivo, ya que forzar un fallo de polling real
    contra HubSpot/Sheets no es practicable desde un script de verificación de UI.
  - Fuera de esta fase: `entityRef` de `Notification` no soporta un `kind: "flow"` — el mensaje de la
    notificación es autodescriptivo (nombre del flow + instrucción de revisar Flujos → Historial) en
    vez de un deep-link clicable, para no ampliar el modelo de entidades de Notificaciones dentro de
    este incremento.

- **F6 (fix) — Operandos numéricos-como-string en condiciones: ✅ implementado y verificado
  (2026-07-11). Cierra la Fase 1 completa.**
  - `src/flows/engine.ts`: nueva `toComparableNumber(v)` — acepta un número finito tal cual, o un
    string no vacío que representa uno (`Number(v.trim())` finito); `""`/espacios se rechazan
    explícitamente porque `Number("")` es `0`, no "no numérico". Los operadores `>`/`>=`/`<`/`<=` en
    `evaluateCondition` ahora coercionan ambos lados (valor del registro y valor configurado en la
    condición) con este helper en vez de exigir `typeof === "number"` en los dos. Antes, un registro
    de HubSpot con `amount: "5000"` (string, como los devuelve la API real) contra una condición
    "monto > 1000" **nunca pasaba** — sin ningún error visible, la condición simplemente evaluaba a
    `false` en silencio.
  - 4 tests nuevos en `src/flows/engine.test.ts`: valor del registro como string numérico, valor de
    la condición configurado como string numérico, un string genuinamente no-numérico (`"n/a"`) no se
    coerciona y falla seguro, y una comparación numérica-como-string que legítimamente no se cumple
    sigue rechazándose. `typecheck`/`lint`/`test` (381/381) en verde.
  - Fuera de esta fase (v1/v2 de F6, Fase 2/3): grupos de condiciones AND/OR y branding por-rama —
    este fix solo corrige la coerción de tipos dentro del modelo AND-only ya existente, no cambia su
    estructura.

## Context

En una revisión de producto del módulo de Flujos e Integraciones (equivalente interno a
Zapier/Make/n8n dentro de "Hito") se recibió una lista de 10 áreas de mejora: confiabilidad y manejo de
errores, observabilidad por ejecución, modo de prueba (dry-run), lógica condicional más rica,
plantillas y reutilización, versionado, límites/rate limiting, organización a escala, permisos
multiusuario, y onboarding del proxy de Google Apps Script.

Antes de convertir ese feedback en specs nuevas, se auditó el código real (`src/flows/engine.ts`,
`src/store/useFlowStore.ts`, `src/integrations/polling/*`, `src/features/settings/*`) y las specs
018–023 ya implementadas. La auditoría cambió el diagnóstico en varios puntos:

- **4 de los 10 temas ya están construidos o mayormente construidos** (observabilidad por ejecución,
  onboarding del proxy, rate-limiting-por-backoff, y parte del manejo de errores) — re-especificarlos
  desde cero habría sido desperdiciar esfuerzo de desarrollo ya invertido.
- **2 de los temas escondían bugs de correctitud**, no solo ausencia de feature: los outputs
  `webhook`/`email` que fallan por red se registran igualmente como `"Ejecutado correctamente"`
  (§F2), y el registro de polling colisiona entre flujos que comparten tipo de objeto — el segundo
  flujo registrado **desactiva silenciosamente** el primero (§F10).
- **Una premisa de partida era inexacta**: se asumía que el export/import general del workspace
  incluye la colección "Automatizaciones" como respaldo de los Flujos modernos. En realidad esa
  colección es el sistema **legacy** (`AutomationRule`); los Flujos modernos (`flows`/`flow-runs`) y
  las Conexiones **no viajan hoy en el export** (§F14).

Por eso esta spec **reconcilia** cada punto del feedback con el estado real del código antes de
proponer trabajo nuevo, y prioriza primero los dos bugs de correctitud y la corrección de expectativas
sobre el backup, por ser lo que más rápido erosiona la confianza del usuario no-code en el módulo.

## Convención de estado usada en esta spec

- ✅ **Ya construido** — existe en producción; solo se listan gaps de pulido.
- 🟡 **Parcial / con bug** — hay un subsistema adyacente construido pero no cableado al caso, o el
  comportamiento actual es incorrecto.
- ❌ **Gap real** — no existe; feature nuevo.

---

## F1 · Reintentos configurables por acción + política de fallo del flujo

**Estado:** 🟡 Parcial — hay backoff en polling (`src/integrations/polling/polling-manager.ts`) y una
cola de reintentos para webhooks salientes (`src/integrations/outbound/retry-engine.ts`), pero el motor
que ejecuta las acciones de un flujo (`src/flows/engine.ts`) no reintenta nada.

**Problema actual:** Si una acción falla (HubSpot devuelve error, el proxy de Apps Script cae), no hay
ningún reintento. Y si una acción intermedia falla, las siguientes se ejecutan siempre —
`src/flows/engine.ts:235-268` itera los outputs en un `for` con try/catch por acción, sin `break` — sin
que el usuario pueda elegir otro comportamiento ni se entere de que ocurrió.

**Objetivo / valor:** Que un fallo transitorio (timeout, 5xx) se resuelva solo, y que el usuario decida
explícitamente si un fallo debe detener el resto de acciones del flujo.

**Propuesta de solución:**
- Por acción: `reintentos` (0–5) y tipo de `backoff` (fijo/exponencial), reutilizando la lógica ya
  existente en `calculateRetryDelay` (`retry-engine.ts`).
- Por flujo: política `onErrorPolicy = continuar | detener` (default `continuar`, para no cambiar el
  comportamiento actual sin que el usuario lo pida). Con `detener`, las acciones posteriores a la que
  falló quedan marcadas `skipped-by-abort` en la traza de ejecución.
- Distinguir acciones idempotentes (`webhook`, `email`) de las que mutan estado interno (`createTask`,
  `createProject`) para no duplicar efectos al reintentar — apoyarse en los `dedupeKey` que ya existen
  en esos outputs.

**Criterios de aceptación:**
- **Dado** una acción con `reintentos=3`, **cuando** el proxy responde un error transitorio (HTTP≥500 o
  de red), **entonces** se reintenta hasta 3 veces con backoff antes de marcarse fallida.
- **Dado** un error 4xx (permanente), **cuando** la acción falla, **entonces** no se reintenta
  (coherente con la regla ya existente en `retry-engine.ts:79-100`).
- **Dado** `onErrorPolicy=detener`, **cuando** una acción intermedia agota sus reintentos, **entonces**
  las acciones siguientes no se ejecutan y quedan `skipped-by-abort` en la traza.
- **Dado** `onErrorPolicy=continuar`, **cuando** una acción falla, **entonces** las demás se ejecutan
  igual que hoy.

**Prioridad sugerida:** Media — alto valor de confianza, pero toca el motor y el schema; mientras tanto
la fiabilidad depende de que el usuario reejecute a mano.

**Dependencias / riesgos:** Depende de F2 (definir "fallo" correctamente primero). Riesgo de duplicar
efectos si se reintenta una acción mutadora no idempotente; mitigar apoyándose en `dedupeKey`.

---

## F2 · "Fallido" real: webhook/email fallidos no deben contar como éxito

**Estado:** 🟡 Bug de correctitud, no solo falta de feature.

**Problema actual:** Los outputs `webhook` y `email` tragan errores de red y se registran igual como
`"executed"` (`src/flows/engine.ts:740-778` y `:805-823`), por lo que el historial puede mostrar
**"Ejecutado correctamente."** aunque el email o el webhook nunca haya salido. El estado de una
ejecución solo puede ser `success | error` (`FlowRunLog` en `src/store/useFlowStore.ts:20-36`); no
existe un estado "parcial".

**Objetivo / valor:** Que "Ejecutado correctamente" signifique realmente eso. Es la base de la que
dependen F1 y F3 — no tiene sentido reintentar o notificar un fallo que el sistema ni siquiera detecta.

**Propuesta de solución:**
- Un fallo real de red/HTTP en `webhook`/`email` pasa a `outcome: "error"` en la traza y contribuye a
  `result.errors`, igual que cualquier otra acción.
- Nuevo estado de ejecución `partial` ("Ejecutado con errores") para cuando algunas acciones del mismo
  run tuvieron éxito y otras fallaron, reemplazando el comportamiento actual de `applyFlowResult`
  (`src/store/useDataStore.ts:476-501`) de emitir una línea `success` y otra `error` por separado para
  el mismo run.
- UI: badge diferenciado (verde "Ejecutado" / ámbar "Parcial" / rojo "Fallido") en la tarjeta de flujo y
  en `FlowHistoryPage`.

**Criterios de aceptación:**
- **Dado** un output `email` cuyo proxy responde error, **cuando** el flujo corre, **entonces** el run
  no se marca `success`; la acción figura como fallida en la traza.
- **Dado** un flujo con 3 acciones donde 2 tienen éxito y 1 falla, **cuando** corre, **entonces** el
  historial muestra un único run `partial`, no un `success` y un `error` como entradas separadas.
- **Dado** un run `partial`, **cuando** el usuario lo abre, **entonces** ve exactamente qué acción(es)
  fallaron y por qué.

**Prioridad sugerida:** Alta — es un bug que erosiona la confianza en todo el módulo y bloquea F1 y F3.

**Dependencias / riesgos:** Introduce un valor nuevo en el enum de estado → requiere subir
`SCHEMA_VERSION` y actualizar el filtro de estado en `FlowHistoryPage`. Riesgo de implementación bajo.

---

## F3 · Notificación cuando un flujo activo falla

**Estado:** ❌ Gap.

**Problema actual:** Un flujo activo puede fallar en silencio; hoy el usuario solo se entera si entra a
revisar el historial manualmente.

**Objetivo / valor:** Enterarse de un fallo sin tener que vigilar la pantalla de Flujos.

**Propuesta de solución:** Al registrar un run `error`/`partial` de un flujo `enabled`, emitir una
notificación reutilizando el módulo de Notificaciones ya existente:
`useDataStore.getState().addNotifications([...])` (`src/store/useDataStore.ts:363`), que el motor de
flujos ya consume hoy vía `applyFlowResult` (`useDataStore.ts:461-462`) para el output
`createNotification`. Opción por flujo "Notificarme si falla" (activada por defecto para flujos
activos). Anti-spam: agrupar o silenciar repeticiones del mismo flujo dentro de una ventana de tiempo
corta.

**Criterios de aceptación:**
- **Dado** un flujo activo con "Notificarme si falla" activado, **cuando** un run resulta
  `error`/`partial`, **entonces** aparece una notificación con el nombre del flujo, la hora y un
  acceso directo al detalle del run.
- **Dado** el mismo flujo fallando 5 veces en 10 minutos, **cuando** se generan las notificaciones,
  **entonces** se agrupan o limitan para no inundar el buzón.
- **Dado** un flujo inactivo ejecutado manualmente ("Ejecutar ahora") que falla, **cuando** termina,
  **entonces** no genera notificación — fue una prueba manual, no una ejecución real.

**Prioridad sugerida:** Media — alto valor, esfuerzo bajo porque la plomería de notificaciones ya
existe y ya es consumida por el motor de flujos.

**Dependencias / riesgos:** Depende de F2 para tener una definición de "fallo" fiable.

---

## F4 · Observabilidad por ejecución (detalle paso a paso)

**Estado:** ✅ Ya construido (spec 023, Fase F) — solo quedan gaps de pulido.

**Problema actual (residual):** El módulo ya tiene `FlowHistoryPage` (`/app/flows/history`) con un
`FlowRunDetailDrawer` que muestra `FlowRunTrace`: condiciones evaluadas con veredicto y operandos,
mapeo de campos, transformación con input/output, y resultado por cada acción — el equivalente al run
log de n8n/Zapier que pedía el feedback ya existe. Dos gaps reales quedan: (a) la traza se limita a los
primeros **5 registros** de un run (`MAX_TRACE_RECORDS = 5`, `src/flows/engine.ts:57`); (b) no se
guarda el payload/response real enviado a cada webhook/email, solo un texto de `reason`.

**Objetivo / valor:** Poder depurar sin soporte también en runs que procesan muchos registros, y ver
exactamente qué se envió a cada sistema externo.

**Propuesta de solución:** (a) Traza resumida o paginada cuando un run supera 5 registros: contador
total + muestreo garantizado de todos los registros que terminaron en error. (b) Capturar el request
body enviado y el status/mensaje real de la respuesta de webhook/email en la traza, enmascarando
tokens/HMAC antes de persistir.

**Criterios de aceptación:**
- **Dado** un run que procesó 50 registros, **cuando** el usuario abre el detalle, **entonces** ve el
  conteo total y puede inspeccionar como mínimo todos los registros que fallaron, no solo los primeros 5.
- **Dado** una acción `webhook`, **cuando** se abre su detalle en la traza, **entonces** se ve el host
  de destino, el payload enviado y el código/mensaje de respuesta, con cualquier secreto enmascarado.

**Prioridad sugerida:** Baja — la necesidad principal (poder depurar sin soporte) ya está cubierta; esto
es refinamiento sobre una base sólida.

**Dependencias / riesgos:** Vigilar el tamaño de `flow-runs` (ya limitado por `RUN_LOG_CAP = 200`); no
persistir secretos en claro dentro de la traza.

---

## F5 · Modo de prueba (dry-run) de flujo completo, sin persistir

**Estado:** ❌ Gap — la spec 022 dejó "Ejecutar ahora" corriendo en real deliberadamente y excluyó el
dry-run de su alcance.

**Problema actual:** Ya existe un preview client-side solo del nodo de transformación ("Probar con
datos de ejemplo", `src/features/flows/canvas/TransformConfigFields.tsx:355-358`) y existe "Ejecutar
ahora", pero este último **persiste efectos reales**: crea tareas/proyectos, dispara webhooks, envía
emails. No hay forma de simular el flujo completo (`trigger → condición → transformación → acciones`)
sin impacto real.

**Objetivo / valor:** Que un usuario no-code pueda validar un flujo completo y ver qué haría cada
acción, sin arriesgarse a escribir datos reales en HubSpot, Sheets o el sistema de notificaciones.

**Propuesta de solución:** Botón "Probar flujo (dry-run)" que corre el motor en modo simulación:
evalúa condiciones y transformación de forma real, pero cada acción devuelve un plan descriptivo ("se
crearía la tarea X en el proyecto Y", "se enviaría un POST a este host con este payload") en vez de
ejecutarse contra el sistema externo o el estado interno. No incrementa `runCount` ni escribe en
`flow-runs` como una ejecución real (o los marca explícitamente `dry-run`). Reutiliza
`getSampleDataForTrigger` y `fetchPollSampleForFlow` (`src/flows/manual-run.ts`) para obtener los datos
de entrada, igual que ya hace "Ejecutar ahora".

**Criterios de aceptación:**
- **Dado** un flujo con una acción `createTask`, **cuando** se corre en dry-run, **entonces** se
  muestra la tarea que se crearía pero no aparece ninguna tarea nueva en el proyecto real.
- **Dado** una acción `webhook`/`email` en dry-run, **cuando** corre, **entonces** se muestra el
  destino y el payload pero no se realiza ninguna llamada de red real.
- **Dado** un dry-run, **cuando** termina, **entonces** no cambia `runCount`/`lastRunAt` del flujo ni
  ensucia el historial de ejecuciones reales.

**Prioridad sugerida:** Media — muy valioso para la adopción no-code; esfuerzo medio porque requiere un
modo "no-op" explícito por cada tipo de acción.

**Dependencias / riesgos:** Riesgo de que el modo simulado diverja del real — los resolvedores de
destino (proyecto/persona) deben ejecutarse igual que en un run real, solo suprimiendo la escritura
final.

---

## F6 · Lógica condicional más rica: grupos AND/OR + branching por salida

**Estado:** 🟡 Diseñado, no construido — el diseño de condiciones por-rama ya existe en el Anexo de
`specs/021-hubspot-sheets-robustness/spec.md`.

**Problema actual:** El texto del modal dice explícitamente "todas las condiciones deben cumplirse
(AND)", y así es: `evaluateConditionsDetailed` en `src/flows/engine.ts:363-375` devuelve
`passed: details.every((d) => d.passed)`. No hay OR, ni agrupación, ni branching — todas las acciones
configuradas se disparan siempre que las condiciones globales pasen.

**Objetivo / valor:** Expresar reglas de negocio reales ("A o B") y ramificar acciones ("si está
atrasado, notificar; si no, no hacer nada") sin tener que duplicar el flujo entero para cada caso.

**Propuesta de solución:**
- **v1 — grupos AND/OR combinables:** modelar las condiciones como un árbol con nodos `all`/`any`
  anidables en vez de una lista plana. Aprovechar el trabajo para corregir de paso el bug ya
  documentado de operandos numéricos que llegan como string desde HubSpot y hacen fallar comparaciones
  numéricas en `evaluateCondition`.
- **v2 — branching por salida:** cada `output` (o grupo de outputs) gana su propia condición de guarda;
  solo se ejecutan las salidas cuya guarda pasa. Implementar el diseño ya elaborado en el Anexo de la
  spec 021 en vez de rediseñarlo.

**Criterios de aceptación:**
- **Dado** un grupo `any(A, B)`, **cuando** solo B se cumple, **entonces** el flujo pasa la condición.
- **Dado** un flujo con la salida X guardada por "estado = atrasado" y la salida Y sin guarda,
  **cuando** el registro no está atrasado, **entonces** se ejecuta Y pero no X.
- **Dado** un valor numérico que llega como string ("42"), **cuando** se evalúa contra `> 10`,
  **entonces** la comparación es numérica y pasa correctamente.

**Prioridad sugerida:** Media para v1 (grupos AND/OR); Alta específicamente para el fix de operandos
numéricos-como-string, por ser un bug de bajo esfuerzo con impacto directo en HubSpot. Media-baja para
v2 (branching), por el mayor esfuerzo de UI en el canvas visual.

**Dependencias / riesgos:** Migración del schema de condiciones de lista plana a árbol, con
retrocompatibilidad para flujos existentes. Riesgo de complejizar la UI para el perfil no-code —
introducir OR y branching de forma progresiva, no de una vez.

---

## F7 · Duplicar flujo

**Estado:** ❌ Gap, esfuerzo bajo.

**Problema actual:** Las acciones disponibles por flujo son Editar, Eliminar y Ejecutar ahora, más el
toggle de activo/inactivo (`src/features/flows/FlowsPage.tsx:244-268`). No existe "Duplicar", así que
variar un solo campo de un flujo obliga a reconstruirlo desde cero.

**Objetivo / valor:** Reutilización rápida de flujos existentes; sienta la base para la galería de
plantillas (F8).

**Propuesta de solución:** Acción "Duplicar" en cada tarjeta de flujo que clona el `FlowRule` completo
con un `id` nuevo, nombre "… (copia)", `enabled=false`, `runCount=0` y `lastRunAt=null`, y abre
directamente el editor sobre la copia. Reutilizar el patrón de construcción de `createEmptyFlow`
(`src/flows/migration.ts`) como base para el clonado.

**Criterios de aceptación:**
- **Dado** un flujo existente, **cuando** el usuario pulsa "Duplicar", **entonces** aparece una copia
  inactiva con nombre "… (copia)" e id nuevo, sin historial de ejecuciones propio.
- **Dado** la copia recién creada, **cuando** se abre en el editor, **entonces** conserva el trigger,
  las condiciones, la transformación y las acciones del original tal cual.

**Prioridad sugerida:** Alta — el ratio valor/esfuerzo más alto de toda la lista.

**Dependencias / riesgos:** Si el trigger es `poll`, la copia inactiva no debe registrar polling hasta
que se active explícitamente — ya cubierto por partir con `enabled=false`.

---

## F8 · Galería de plantillas de flujos

**Estado:** ❌ Gap.

**Problema actual:** No existen plantillas de flujos. El templating que sí existe en el producto es de
*tipos de proyecto* (`createProject` a partir de un Project Type), un concepto distinto.

**Objetivo / valor:** Reducir el time-to-value: crear un flujo útil ("Notificar por email cuando un
proyecto se atrasa", "Crear tarea desde fila de Sheets") en segundos en vez de construirlo desde cero.

**Propuesta de solución:** Galería dentro de la propia pantalla de Flujos con plantillas curadas (JSON
de `FlowRule` con placeholders de conexión/campos que el usuario completa al instanciar). "Usar
plantilla" crea un flujo inactivo preconfigurado y guía el mapeo de campos restante. Como extensión
natural, en una segunda vuelta permitir "Guardar como plantilla" desde un flujo propio, apoyándose en
la mecánica de F7.

**Criterios de aceptación:**
- **Dado** la galería, **cuando** el usuario elige "Notificar cuando un proyecto se atrasa", **entonces**
  se crea un flujo inactivo preconfigurado listo para revisar y activar.
- **Dado** una plantilla que requiere una conexión (p. ej. Sheets), **cuando** se instancia sin tener
  esa conexión configurada, **entonces** se le pide seleccionar o crear la conexión antes de poder
  activarla.

**Prioridad sugerida:** Baja — alto valor pero con esfuerzo de curación de contenido y UI; F7 ya
entrega buena parte del beneficio de reutilización con mucho menos esfuerzo.

**Dependencias / riesgos:** Depende de F7. Las plantillas deben mantenerse sincronizadas con
`SCHEMA_VERSION` a medida que el schema de `FlowRule` evolucione.

---

## F9 · Versionado del flujo + revertir

**Estado:** ❌ Gap — hoy solo existe `schemaVersion` para migraciones internas, no revisiones de
usuario.

**Problema actual:** Editar un flujo sobrescribe su definición en el sitio (`updateFlow`,
`src/store/useFlowStore.ts:133-145`); no hay historial de versiones ni forma de revertir. El riesgo es
real y no hipotético: estos flujos crean tareas y proyectos reales, y un error al editar es difícil de
deshacer.

**Objetivo / valor:** Poder editar sin miedo, con la posibilidad de volver a una versión anterior que
funcionaba.

**Propuesta de solución:** Guardar un snapshot de la definición cada vez que se guarda el flujo
(últimas N versiones, p. ej. 10), con timestamp y un resumen del cambio. Acción "Restaurar" que crea
una nueva versión idéntica a la elegida (sin borrar las intermedias). Persistir en un documento
separado (`flow-versions`) para no inflar el documento `flows` en cada edición.

**Criterios de aceptación:**
- **Dado** un flujo editado 3 veces, **cuando** el usuario abre "Historial de versiones", **entonces**
  ve las 3 versiones con fecha y puede previsualizar cada una.
- **Dado** una versión anterior, **cuando** el usuario pulsa "Restaurar", **entonces** el flujo vuelve
  a esa definición registrándose como una nueva versión, sin perder las versiones intermedias.

**Prioridad sugerida:** Baja — alto valor de seguridad pero esfuerzo medio; mitigable a corto plazo con
F14 (el flujo al menos queda respaldado en el export) más confirmaciones al guardar.

**Dependencias / riesgos:** Crecimiento de almacenamiento local — limitar el número de versiones
retenidas. Mantener clara la distinción entre versión-de-definición (esta feature) y `flow-runs`
(historial de ejecuciones, ya existente).

---

## F10 · Coordinación de polling entre flujos (fix de colisión) + semáforo de carga

**Estado:** 🟡 Bug de correctitud + gap de UI — más grave de lo que sugería el feedback original.

**Problema actual:** El registro de polling se indexa por **tipo de objeto**, no por conexión ni por
flujo: la clave HubSpot es `"hubspot"` (o `hubspot-${objectType}`) y la clave Sheets es la constante
`"google-sheets"` (`src/integrations/inbound/hubspot-polling-manager.ts:49`,
`sheets-polling-manager.ts:7`). Y `pollingManager.register()` llama a `unregister()` primero
(`src/integrations/polling/polling-manager.ts:30-49`). El resultado: **dos flujos que consultan
HubSpot contacts, o dos que consultan Google Sheets — incluso contra conexiones distintas —
colisionan**: gana el último registrado, y ambos comparten el cursor incremental `lastSyncAt` y el
canal de despacho de registros. Esto no es solo ausencia de límites de tasa; es pérdida silenciosa de
ejecuciones de un flujo activo. Además, no hay cola ni límite de tasa hacia una misma cuenta — solo hay
backoff cuando una consulta falla.

**Objetivo / valor:** Que N flujos sobre la misma integración funcionen todos de forma independiente, y
hacer visible la carga real ("esta integración ya tiene 3 flujos consultándola cada 5 minutos").

**Propuesta de solución:**
- **Fix (prioritario):** indexar los registros de polling por `connectionId` (+ objectType/rango), no
  por un tipo global; el cursor `lastSyncAt` y el canal de despacho de registros deben ser por clave
  real, dirigidos al flujo dueño.
- **Coordinación:** cuando varios flujos apuntan a la misma conexión con el mismo intervalo, compartir
  una sola consulta por tick (coalescing) y repartir los resultados, en vez de una llamada por flujo.
- **Semáforo:** en `ScheduledServicesPage` y en el panel de Integraciones, mostrar por conexión cuántos
  flujos la consultan y con qué frecuencia, con aviso si la carga se acerca a los límites de tasa
  conocidos de HubSpot.

**Criterios de aceptación:**
- **Dado** dos flujos activos que consultan HubSpot contacts en conexiones distintas, **cuando** ambos
  se guardan, **entonces** ambos siguen ejecutándose — ninguno desregistra al otro.
- **Dado** dos flujos sobre la misma conexión y el mismo objeto con igual intervalo, **cuando** llega
  el tick de polling, **entonces** se realiza una única consulta y sus resultados alimentan a ambos
  flujos.
- **Dado** una conexión consultada por 3 flujos cada 5 minutos, **cuando** el usuario abre
  Servicios/Integraciones, **entonces** ve "3 flujos · cada 5 min" y una advertencia si se excede el
  umbral definido.

**Prioridad sugerida:** Alta para el fix de colisión (es pérdida silenciosa de ejecuciones activas hoy
mismo). Media para el coalescing y el semáforo de carga.

**Dependencias / riesgos:** Cambia el modelo de claves de `polling-manager` y el despacho en
`runPolledFlow`; cubrir con tests siguiendo el patrón ya usado en
`src/store/useDataStore.runFlowNow.test.ts`. Riesgo de romper el sync incremental si la migración del
cursor `lastSyncAt` no se hace con cuidado (mapear la clave antigua compartida a las nuevas claves por
conexión en la migración de datos).

---

## F11 · Organización a escala: carpetas/etiquetas, buscador y filtros por estado en Flujos

**Estado:** ❌ Gap.

**Problema actual:** Los flujos son una lista plana de tarjetas apiladas verticalmente
(`src/features/flows/FlowsPage.tsx`). Con 15-20 flujos activos la navegación se vuelve difícil. Solo
existe el buscador global (Cmd+K); no hay buscador propio de Flujos, ni carpetas, ni etiquetas, ni
filtro por estado en esta pantalla — el filtro por estado (éxito/error) sí existe pero solo en
`FlowHistoryPage`, no en la lista de flujos.

**Objetivo / valor:** Poder encontrar y agrupar flujos a medida que su número crece.

**Propuesta de solución:** Añadir a la pantalla de Flujos: un buscador local por nombre, filtros por
estado (activo / inactivo / con errores recientes) y agrupación por carpeta y/o etiquetas (campos
nuevos opcionales en `FlowRule`). El estado "con errores" se deriva del último run en `flow-runs` de
cada flujo.

**Criterios de aceptación:**
- **Dado** 20 flujos, **cuando** el usuario escribe en el buscador local, **entonces** la lista filtra
  por nombre en vivo.
- **Dado** el filtro "con errores", **cuando** se aplica, **entonces** solo se muestran los flujos cuyo
  último run fue `error` o `partial`.
- **Dado** flujos etiquetados "Ventas", **cuando** se filtra por esa etiqueta, **entonces** solo
  aparecen esos flujos.

**Prioridad sugerida:** Media — el dolor crece con la adopción del módulo; esfuerzo moderado (nuevos
campos de schema + UI de lista).

**Dependencias / riesgos:** Requiere subir `SCHEMA_VERSION` para carpeta/etiquetas. El filtro "con
errores" depende de que F2 haga los estados de ejecución fiables.

---

## F12 · Permisos y roles (multiusuario)

**Estado:** ❌ Gap, en tensión con la filosofía actual local-first / single-user del producto
(documentada en `specs/018-integrations-mvp/spec.md` §11.4).

**Problema actual:** No existe ningún concepto de roles ni de quién puede activar, editar o eliminar un
flujo, ni de quién puede tocar conexiones/integraciones críticas que escriben en sistemas externos
reales.

**Objetivo / valor:** Si el producto crece hacia equipos, proteger integraciones críticas de cambios no
autorizados.

**Propuesta de solución:** Definir ahora el modelo conceptual — roles Admin / Editor / Lector; permisos
de activar, editar, eliminar flujos y de gestionar conexiones/secretos — aunque la implementación
quede pendiente de que exista backend/identidad multiusuario. Documentar explícitamente que hoy el
único control existente es el vault local (cifrado en reposo de secretos), que no es control de acceso
entre personas.

**Criterios de aceptación (para cuando se implemente):**
- **Dado** un usuario con rol Lector, **cuando** intenta activar o editar un flujo, **entonces** la
  acción aparece deshabilitada.
- **Dado** una conexión con secreto (HubSpot), **cuando** un usuario sin rol Admin intenta editarla,
  **entonces** la edición se bloquea.

**Prioridad sugerida:** Baja — depende de una decisión estratégica (¿el producto se vuelve
multiusuario?) que está fuera del alcance de esta spec. Se documenta el diseño, no se construye.

**Dependencias / riesgos:** Requiere backend/identidad, hoy inexistente en la app (local-first, sin
servidor). Riesgo de sobre-diseñar para un escenario todavía no confirmado.

---

## F13 · Reducir fricción del onboarding del proxy (Google Apps Script)

**Estado:** ✅ Mayormente hecho (spec 023, Fase B) — gap menor.

**Problema actual (residual):** `src/features/integrations/guides/AppsScriptGuide.tsx` ya ofrece el
código `.gs` embebido por proveedor, un botón de copiar, y los pasos de despliegue (crear proyecto en
script.google.com → pegar código → desplegar como Web App → copiar URL →, para HubSpot, crear el token
de App Privada). Un "deploy con un clic" literal no es viable porque Google no expone una API pública
para desplegar Apps Script de terceros. La fricción que queda es: los pasos de despliegue siguen siendo
manuales, y la URL pegada no se valida al momento.

**Objetivo / valor:** Reducir aún más la fricción y los errores del paso técnico para el perfil
no-code, dentro de lo que Google permite.

**Propuesta de solución:** (a) Validación en vivo de la Proxy URL al pegarla: formato `…/exec` + un
ping de prueba con mensaje accionable, reutilizando `src/integrations/proxy-fetch.ts`. (b) Deep-link
que abra script.google.com en un proyecto nuevo directamente. (c) Checklist de verificación ("acceso =
Cualquier persona", "Ejecutar como = Yo") con auto-diagnóstico del error CORS típico cuando la
configuración de acceso está mal. Comunicar explícitamente que el "1-clic" total no es posible por
límites de Google, para no generar una expectativa que no se puede cumplir.

**Criterios de aceptación:**
- **Dado** una Proxy URL con formato inválido, **cuando** el usuario la pega, **entonces** se avisa
  antes de guardar la conexión.
- **Dado** una URL válida pero mal desplegada (CORS), **cuando** se prueba la conexión, **entonces** el
  mensaje de error señala exactamente qué ajuste de acceso corregir.

**Prioridad sugerida:** Baja — lo esencial de este punto ya está resuelto; esto es pulido de conversión
sobre una guía que ya funciona.

**Dependencias / riesgos:** Límite duro de Google impide el "1-clic" real; hay que gestionar la
expectativa del usuario en vez de prometerlo.

---

## F14 · Incluir Flujos y Conexiones en el export/import del workspace

**Estado:** ❌ Gap — corrige una premisa inexacta del feedback original.

**Problema actual:** El export general del workspace
(`src/storage/FileSystemAdapter.ts:244-258` `exportAll()`, invocado desde
`src/features/settings/SettingsPage.tsx`) incluye la colección **legacy** `automations`
(`AutomationRule`, etiquetada "Automatizaciones" en `CollectionTransferCard.tsx`), **no** los Flujos
modernos. Los Flujos (`flows`) y su historial (`flow-runs`) persisten como documentos aparte
(`src/store/useFlowStore.ts:97-118`) que `exportAll()`/`importAll()` nunca leen ni escriben. Las
Conexiones tampoco viajan: viven en la base Dexie separada `hito-integrations`
(`src/storage/integration-db.ts`). En resumen: **hoy los Flujos no tienen respaldo ni portabilidad**,
aunque el export general del workspace sugiera lo contrario.

**Objetivo / valor:** Portabilidad y respaldo reales de las automatizaciones modernas del producto;
mitiga en parte la ausencia de versionado (F9) mientras esa feature no exista.

**Propuesta de solución:** Extender `exportAll()`/`importAll()` para incluir el documento `flows` (y
opcionalmente `flow-runs`). Para Conexiones, exportar su configuración sin los secretos —
`encryptedSecret` no debe salir en claro del vault—; al importar, pedir reconectar/reintroducir el
secreto de cada conexión. Ofrecer también export/import por-colección de "Flujos" en
`CollectionTransferCard`, análogo a como ya funciona para "Automatizaciones".

**Criterios de aceptación:**
- **Dado** un workspace con 5 flujos, **cuando** el usuario exporta, **entonces** el JSON resultante
  contiene los 5 flujos.
- **Dado** un JSON con flujos, **cuando** se importa en otra instancia, **entonces** los flujos
  aparecen (inactivos) listos para reconectar sus conexiones.
- **Dado** conexiones con secretos, **cuando** se exporta el workspace, **entonces** los secretos no se
  incluyen en claro; el import solicita reconectarlos.

**Prioridad sugerida:** Alta — esfuerzo bajo, corrige una expectativa falsa del usuario y da una red de
seguridad inmediata mientras no exista F9.

**Dependencias / riesgos:** No filtrar secretos del vault al exportar. El import debe respetar la
migración de `SCHEMA_VERSION` de los flujos importados.

---

## Roadmap (impacto vs. esfuerzo)

### Fase 1 — Corto plazo · "Confianza y correctitud"
Arreglar lo que hoy engaña al usuario o pierde datos silenciosamente, y ganar reutilización barata.

| Feature | Prioridad |
|---|---|
| F2 · "Fallido" real (fix del falso éxito en webhook/email) | Alta |
| F10 (fix) · Colisión de polling entre flujos | Alta |
| F14 · Flujos/Conexiones en export/import | Alta |
| F7 · Duplicar flujo | Alta, esfuerzo bajo |
| F3 · Notificación al fallar (reusa Notificaciones) | Media, esfuerzo bajo |
| F6 (fix) · Operandos numéricos-como-string en condiciones | Alta, esfuerzo bajo |

### Fase 2 — Mediano plazo · "Control y capacidad"
Features de valor alto con esfuerzo medio sobre el motor de flujos y la UI.

| Feature | Prioridad |
|---|---|
| F1 · Reintentos configurables + política continuar/detener | Media |
| F5 · Dry-run de flujo completo | Media |
| F6 (v1) · Grupos de condiciones AND/OR | Media |
| F11 · Organización (buscador/filtros/carpetas/etiquetas) | Media |
| F10 (coalescing + semáforo) · Coordinación y visibilidad de carga | Media |
| F4 · Pulido de observabilidad (traza >5 registros, payload real) | Baja |

### Fase 3 — Largo plazo · "Escala y madurez"
Mayor esfuerzo, o dependientes de decisiones estratégicas del producto.

| Feature | Prioridad |
|---|---|
| F6 (v2) · Branching por salida | Media-baja |
| F8 · Galería de plantillas | Baja |
| F9 · Versionado + rollback de flujos | Baja |
| F13 · Pulido adicional del onboarding del proxy | Baja |
| F12 · Roles y permisos (decisión estratégica: ¿multiusuario?) | Baja |

---

## Archivos clave referenciados

- **Modelo/estado:** `src/domain/schemas/flow.ts`, `src/store/useFlowStore.ts` (`FlowRunLog`,
  `RUN_LOG_CAP`), `src/store/useDataStore.ts` (`applyFlowResult`, `runFlowNowImpl`)
- **Motor:** `src/flows/engine.ts` (condiciones `363-375`, ejecución de outputs `235-268`, webhook/email
  `740-778`/`805-823`), `src/flows/manual-run.ts`
- **Polling:** `src/integrations/polling/polling-manager.ts`,
  `src/integrations/inbound/hubspot-polling-manager.ts`,
  `src/integrations/inbound/sheets-polling-manager.ts`; reintentos:
  `src/integrations/outbound/retry-engine.ts`; proxy: `src/integrations/proxy-fetch.ts`
- **UI:** `src/features/flows/FlowsPage.tsx`, `FlowHistoryPage.tsx`,
  `src/features/flows/canvas/TransformConfigFields.tsx`, `src/features/flows/canvas/meta.ts`,
  `src/features/flows/ScheduledServicesPage.tsx`; onboarding:
  `src/features/integrations/guides/AppsScriptGuide.tsx`
- **Export/import:** `src/features/settings/SettingsPage.tsx`, `src/storage/FileSystemAdapter.ts`
  (`exportAll`), `src/features/settings/CollectionTransferCard.tsx`
- **Diseño previo a reutilizar:** `specs/021-hubspot-sheets-robustness/spec.md` (Anexo — condiciones
  por-rama / branching)

## Fuera de alcance (documentado)

- Rediseñar la observabilidad por ejecución — ya construida en la spec 023; F4 solo la pule.
- "Deploy con un clic" real del script de Apps Script — inviable por límites de la plataforma de
  Google; F13 se acota a deep-link + validación en vivo.
- Implementar multiusuario/roles ahora — F12 solo documenta el modelo conceptual hasta que exista una
  decisión de producto sobre backend/identidad.

## Verificación

Al ser un documento de planificación, la validación es de exactitud, no de runtime:
1. Cada afirmación sobre el "estado actual" está anclada a archivo y línea reales, verificados en la
   exploración del código (`engine.ts`, `polling-manager.ts`, `FileSystemAdapter.exportAll`,
   `AppsScriptGuide.tsx`, `useFlowStore.ts`).
2. Antes de mover cualquier feature a implementación, confirmar con el PM que prioridad y fase siguen
   reflejando su lectura de impacto/esfuerzo — el roadmap es una propuesta inicial, no una decisión
   cerrada.
3. Al implementar cada feature, esta spec debe actualizarse con una sección `Progreso` por fase,
   siguiendo la convención de las specs 018–023 (estado, archivos tocados, tests, verificación
   end-to-end).
