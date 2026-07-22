# Spec 033 — Automatizaciones: cerrar el round-trip, expresividad y confianza

## Progreso

- **Estado general: 🟨 Fase 1 implementada (A1, C1, A2, A3) — 2026-07-22.** Pendiente de verificación
  manual E2E (proxy real de Apps Script + Make/curl para el round-trip del inbox, T3332). Fases 2 y 3
  siguen en backlog.
- **Baseline de tests:** 588 → **629** (+41), todas en verde. `SCHEMA_VERSION` 15 → **16** (paso identidad
  en `migrations.ts`, introducido por C1). `tsc --noEmit` limpio; `eslint` con los 3 errores preexistentes
  (`ai/gemini/agent.ts`, `ai/modelSelector.test.ts`, `hooks/useBreakpoint.ts`) sin nuevos; `vite build` OK.

### Fase 1 — "Cerrar 032 y accionar los fallos" ✅

- **A1 · Delivery log durable + Reenviar — ✅ T3300-T3305.**
  - `OutboundDelivery` (`src/flows/engine.ts`) extendido con `status`/`responseSnippet`/`error`/`attempts`/
    `flowId`/`outputIndex`/`data`; el caso webhook y el loop de reintentos los pueblan.
  - `SyncLog` (`src/storage/integration-db.ts`) gana `flowId?`/`outputIndex?`/`runId?`/`replayData?`.
  - `src/flows/delivery-log.ts` (NUEVO): `maskSecretInPayload`, `buildOutboundSyncLog`, `persistOutboundDeliveries`
    (máscara de `secret`/`password`/`token`/…, truncado a 10 KB; nunca body de email).
  - `applyFlowResult` (`src/store/useDataStore.ts`) persiste los `outboundDeliveries` a `syncLogs` (best-effort,
    try/catch) con `runId` vinculado al run registrado; el drenado del inbox se loguea en
    `inbox-polling-manager.ts` (`logInboxDrain`). El email **no** se duplica (ya lo loguea
    `sendEmailViaAppsScript`).
  - `DeliveryDetailDrawer.tsx` (REESCRITO): botón **"Reenviar"** → `ConfirmDialog` →
    `buildWebhookRequest(output, replayData)` (misma firma verificable de 032 §A) → `fetch` → nuevo `SyncLog`
    (retryCount+1). Deshabilitado si el Flujo fue borrado o el output ya no es webhook.
  - `SyncLogsPage.tsx`: filtro `inbox` + enlace "Ver run" (`?run=runId`).
  - Tests: `src/flows/delivery-log.test.ts`, `src/store/useDataStore.deliveryLog.test.ts` (persistencia +
    máscara + no-duplica email + entityRef del fallo).

- **C1 · Notificación de fallo clicable (deep-link al run) — ✅ T3310-T3313.**
  - `EntityRefSchema.kind` gana `"flow"` + `id?`/`runId?` (`notification.ts`); `SCHEMA_VERSION` 16 con paso
    identidad en `migrations.ts` (+ tests v15→v16).
  - `applyFlowResult` setea `entityRef: { kind: "flow", id: flowId, runId }` en la notificación de fallo
    (024 §F3); el `runLog` recibe `id` antes de `recordRuns` para que el deep-link sea estable.
  - `NotificationsPage` → `FlowHistoryPage` con `?run=` abre el `FlowRunDetailDrawer`. Mapeo extraído a
    `src/features/notifications/notification-route.ts` (puro).
  - Tests: `notification-route.test.ts` (mapeo flow/task/checklist/project + retrocompat) +
    `useDataStore.deliveryLog.test.ts` (entityRef kind:flow + runId).

- **A2 · Salud por conexión + semáforo — ✅ T3320-T3323.**
  - `PollResult.backlog?` (`polling-manager.ts`) poblado por `drainInbox` desde el proxy; persistido por
    poll-key en `poll-sync-state.ts` (`loadLastBacklog`/`saveLastBacklog`).
  - `src/integrations/connection-health.ts` (NUEVO): `deriveConnectionHealth` pura — última entrada/salida
    (OK/error), nº de Flujos + cadencia, backlog, y warnings `stale`/`last-failed`/`backlog-high`/`rate-high`
    (umbrales: `STALE_FACTOR=3`, `RATE_HIGH_CADENCE_MS=60_000`, `BACKLOG_RETENTION_RISK=100` / 7 días).
  - `ScheduledServicesPage.tsx`: sección **"Salud por conexión"** con badges entrada/salida, "N flujos ·
    cada X", backlog y warnings.
  - Tests: `src/integrations/connection-health.test.ts` (12 casos: OK reciente / hace rato / último falló /
    umbral de carga / backlog cerca de retención / sin datos / más reciente gana).

- **A3 · Probar el round-trip del inbox — ✅ T3330-T3331; T3332 (manual) pendiente.**
  - `src/integrations/inbound/inbox-round-trip.ts` (NUEVO): `runInboxRoundTrip` — POST de ingreso (sample
    fijo, secreto como query param como Make/Zapier) → drain de confirmación → match por `deliveryId`.
  - `ConnectionDialog.tsx`: botón **"Enviar entrega de prueba"** (solo `webhook-inbox`) → `ConfirmDialog` →
    resultado inline (deliveryId + registros drenados).
  - `AppsScriptGuide.tsx`: paso de checklist **"Pega la URL en Make/Zapier"** exclusivo del inbox.
  - Tests: `src/integrations/inbound/inbox-round-trip.test.ts` (5 casos: round-trip OK, secreto en query,
    push falla, drain falla, no-match).
  - **Pendiente (T3332):** verificación manual E2E contra un proxy real de Apps Script + Make/curl.

## Context

El módulo de Flujos e Integraciones es maduro tras las specs 018–032: motor confiable, validación/
plantillas/organización (027), interpolación real (026), polling por conexión sin colisión (024 §F10),
reintentos + política de fallo (027 §E), dry-run con `DebuggerPanel` (025 §D), y —con 032— el
**round-trip bidireccional con Make/Zapier**: firma saliente verificable e inbox-polling entrante.

Esta spec **no rehace** nada de eso. Recoge lo que quedó a medias y lo que un usuario no-code todavía
echa en falta, cada punto anclado a código real. Se organiza en tres arcos:

- **Arco A — Cerrar el round-trip de 032:** observabilidad y salud de las integraciones que 032 dejó
  como follow-up para no desestabilizar el motor.
- **Arco B — Expresividad:** los tipos de trigger y de lógica que faltan para expresar reglas reales
  (tiempo, ramificación, endpoints exigentes).
- **Arco C — Confianza y pulido:** que editar y depurar automatizaciones que crean datos reales no dé
  miedo, y que un fallo se vea sin vigilar la pantalla.

### Convención de estado

- ✅ **Ya construido** — existe en producción; solo gaps de pulido.
- 🟡 **Parcial / con bug** — subsistema adyacente construido pero no cableado al caso, o incompleto.
- ❌ **Gap real** — no existe; feature nuevo.

---

## Arco A — Cerrar el round-trip de 032 (observabilidad y salud)

### A1 · Delivery log durable de Flujos + Reenviar (replay)

**Estado:** 🟡 Parcial — el motor construye la entrega pero **no se persiste en ningún lado
inspeccionable**.

**Problema actual:** el output `webhook` empuja a `result.outboundDeliveries`
([engine.ts:1252](src/flows/engine.ts#L1252)) y la spec 032 §C ya captura el status/respuesta reales
en la traza (`resolved`), **pero esas entregas nunca llegan a `syncLogs`**: una búsqueda del código
confirma que `outboundDeliveries` no se consume en `useDataStore` — solo la cola legacy
(`retry-engine.ts`), el email (`email-via-apps-script.ts`) y los pollers escriben `syncLogs`. Por eso
`SyncLogsPage` ([SyncLogsPage.tsx](src/features/integrations/SyncLogsPage.tsx)) —que ya está cableado a
`integrationDb.syncLogs`— **no muestra las entregas de webhook de un Flujo**. Y no existe "Reenviar":
si Make estaba apagado, la única opción es re-disparar el evento de dominio.

**Propuesta:**
- Persistir cada entrega saliente (`webhook`/`email`) y cada entrada de inbox (spec 032 §B) en
  `syncLogs` con: host/destino, body enviado (truncado, **secreto enmascarado**), status HTTP y
  primeros bytes de respuesta, nº de intento (reusa el conteo de retry de 027 §E). Hacerlo desde
  `applyFlowResult` (`useDataStore`) —no desde el motor puro— para no romper la suite del engine (que
  no mockea `integrationDb`); `applyFlowResult` ya recibe `result.outboundDeliveries`/`emailDeliveries`
  y ya escribe otros efectos.
- **Reenviar** en `DeliveryDetailDrawer` ([DeliveryDetailDrawer.tsx](src/features/integrations/DeliveryDetailDrawer.tsx)):
  reconstruye la request con `buildWebhookRequest` (misma firma verificable de 032 §A) y la re-envía
  tras `ConfirmDialog` (llamada real, criterio 025 §D), registrando un intento nuevo. Requiere
  persistir el `output` + `data` (o su forma resuelta) junto a la entrega.

**Criterios de aceptación:**
- **Dado** un webhook a Make, **cuando** se abre su entrega en `SyncLogsPage`, **entonces** se ve el
  body enviado y el status/respuesta real de Make, con el secreto enmascarado.
- **Dado** una entrega fallida, **cuando** el usuario pulsa "Reenviar", **entonces** se re-envía con la
  misma firma verificable y queda un intento nuevo registrado.
- **Dado** una entrada de inbox drenada, **cuando** se abre en el panel, **entonces** se ve el body
  recibido y el desenlace del Flujo que disparó.

**Prioridad:** Alta — cierra el ciclo de depuración de 032; sin esto, "no llegó nada a Make" sigue
siendo un misterio fuera de la traza del run. **Deps:** el replay usa la firma de 032 §A.

**Riesgo:** no persistir secretos en claro (criterio 024 §F4 / 026 §E); vigilar tamaño de `syncLogs`
(ya acotado por `maintenance.ts`, 018 §9.3).

---

### A2 · Salud por conexión + semáforo de carga

**Estado:** 🟡 Parcial — `ScheduledServicesPage` lista timers de polling crudos + el caveat de
disponibilidad (spec 032 §E), pero no hay salud por conexión ni aviso de carga.

**Problema actual:** no se ve, por conexión, cuándo fue la última entrada/salida OK, cuántos Flujos la
consultan y con qué frecuencia, ni el backlog pendiente del inbox. El semáforo de carga que 024 §F10
esbozó nunca se construyó.

**Propuesta:** panel de salud por conexión (extiende `ScheduledServicesPage`/`IntegrationsPage`
reusando `syncLogs`): última entrada OK (inbox drain / poll), última salida OK (webhook/email), nº de
Flujos que la consultan y frecuencia, backlog del último drain, y una advertencia si la carga se acerca
a los límites de tasa conocidos (HubSpot: 10/10s Starter … 024 §F10) o si el backlog del inbox se
acerca a la retención del proxy.

**Criterios de aceptación:**
- **Dado** una conexión inbox con 40 entregas buffered, **cuando** se abre el panel, **entonces** se ve
  el backlog y una advertencia si excede el umbral.
- **Dado** una conexión consultada por 3 Flujos cada 5 min, **cuando** se abre el panel, **entonces**
  ve "3 flujos · cada 5 min".
- **Dado** cualquier conexión, **cuando** se abre, **entonces** se ve su última entrada/salida OK.

**Prioridad:** Media — visibilidad operativa; esfuerzo bajo-medio (deriva de datos que A1 produce).
**Deps:** A1 (lee sus registros).

---

### A3 · Probar el round-trip del inbox desde la UI

**Estado:** ❌ Gap.

**Problema actual:** "Probar conexión" del inbox (spec 032 §B) hace un `drain` y muestra lo que ya
llegó, pero no hay forma de **cerrar el bucle de setup** sin salir a Make/`curl`: no existe un
"enviar una entrega de prueba al inbox y confirmar que Hito la drena".

**Propuesta:** botón "Enviar entrega de prueba" en la conexión inbox que hace un POST de ingreso al
proxy (un JSON de ejemplo) y luego un `drain` para confirmar que aparece — con `ConfirmDialog` (es una
escritura real en el buffer). Verde/rojo inline. Además, en la guía de Apps Script del inbox (032 §D),
un check "he pegado la URL en Make/Zapier" para completar la lista.

**Criterios de aceptación:**
- **Dado** una conexión inbox configurada, **cuando** el usuario pulsa "Enviar entrega de prueba",
  **entonces** ve confirmado que el proxy la aceptó y que un `drain` la recupera.

**Prioridad:** Media — cierra el onboarding del inbox; esfuerzo bajo. **Deps:** 032 §B.

---

## Arco B — Expresividad de las automatizaciones

### B1 · Trigger programado (schedule / cron ligero)

**Estado:** ❌ Gap — el schema de triggers solo conoce `event` y `poll`
([flow.ts:62-66](src/domain/schemas/flow.ts#L62-L66)); la superficie muerta de `schedule` se **retiró**
en spec 019 §0.3 en vez de construirse.

**Problema actual:** no se puede automatizar por tiempo ("cada día a las 9:00 revisar tareas vencidas y
avisar", "cada lunes crear la tarea semanal de reporte", "cada hora drenar el inbox aunque no haya
evento"). Es uno de los tres tipos de disparador canónicos de cualquier iPaaS y hoy falta por completo.

**Propuesta:**
- Nuevo `ScheduleTrigger` en el schema: `{ type: "schedule", cadence: "daily"|"weekly"|"hourly",
  atHour?, atMinute?, weekday? }` (ligero, no un cron string libre — perfil no-code). El "record" del
  disparo es un objeto sintético `{ firedAt, cadence }` interpolable en `{{}}`.
- Registro en un scheduler propio (reusa el patrón de `pollingManager` con un timer por Flujo
  programado; el disparo evalúa la cadencia contra la hora local y corre el motor). Como el resto, solo
  corre con la pestaña abierta — el caveat de 032 §E aplica igual (catch-up: al abrir, si tocaba un
  disparo diario y no se ejecutó, se corre una vez).
- `matchesTrigger`/`resolveTriggerData` reconocen `schedule`; `TriggerStep` gana la opción "En un
  horario".
- Migración: bump de schema con paso identidad (los flujos existentes no usan `schedule`).

**Criterios de aceptación:**
- **Dado** un Flujo con trigger "cada día a las 9:00" y una acción `createNotification`, **cuando** llega
  esa hora con Hito abierto, **entonces** corre una vez ese día (no en cada tick).
- **Dado** que Hito estaba cerrado a las 9:00 y se abre a las 11:00, **cuando** hidrata, **entonces**
  hace catch-up del disparo diario pendiente (una sola vez), coherente con 032 §E.

**Prioridad:** Media-alta — completa los tipos de trigger; esfuerzo medio (scheduler + catch-up
correcto es lo delicado). **Riesgo:** doble disparo si el catch-up no marca bien el "último disparo"
—persistir un watermark por Flujo, como `poll-sync-state`.

---

### B2 · Branching por salida (guardas por output)

**Estado:** ❌ Gap — `evaluateConditionsDetailed` decide un único veredicto global y **todas** las
acciones corren si pasa (024 §F6 v2 lo dejó documentado, no construido; 027 §F solo agregó all/any
plano a las condiciones globales).

**Problema actual:** "si el deal es grande, crear proyecto **y** avisar por email; si es chico, solo
crear tarea" hoy exige **duplicar el flujo entero**. No se puede ramificar por salida.

**Propuesta:** cada `Output` gana una guarda opcional `when?: { conditions, conditionMode }` (reusa
`FlowCondition`/`conditionMode` de 027 §F); un output solo se ejecuta si su guarda pasa (sin guarda =
siempre, retrocompat). La traza muestra por output "omitido — guarda no cumplida". En el canvas, un
disclosure "Solo ejecutar si…" por nodo de acción. Sin árbol de ramas visual (más costoso) — la guarda
por output cubre el caso más pedido con una fracción del esfuerzo.

**Criterios de aceptación:**
- **Dado** dos outputs, uno con guarda "monto > 10000" y otro sin guarda, **cuando** el registro tiene
  monto 500, **entonces** solo corre el sin guarda; la traza marca el otro "omitido por guarda".
- **Dado** un flujo guardado antes de esta spec, **cuando** corre, **entonces** todas sus acciones
  corren como hoy (sin guarda = siempre).

**Prioridad:** Media — expresividad real; esfuerzo medio (schema + engine + traza + UI por nodo).

---

### B3 · Webhook saliente: método HTTP y headers personalizados

**Estado:** ❌ Gap — `buildWebhookRequest` ([webhook-request.ts](src/flows/webhook-request.ts)) fija
`method: "POST"` y un set fijo de headers (`Content-Type` + firma `X-Hito-*`); 026/027 lo dejaron
explícitamente fuera de alcance.

**Problema actual:** conectar con "los diferentes proveedores" a veces requiere `PUT`/`PATCH` o un
header de autenticación propio (`Authorization: Bearer …`, `X-Api-Key: …`) — no todos los endpoints
son un catch-hook de Make/Zapier. Hoy no hay forma de darle esa forma a la request.

**Propuesta:** en el output `webhook`, campos opcionales `method: "POST"|"PUT"|"PATCH"` (default POST) y
`headers: {clave: valor}` (valores interpolables con `{{}}`, mismo `InterpolableField`). La firma
`X-Hito-*` sigue siempre presente y no se puede sobrescribir. Documentar que el secreto de auth de un
tercero va en `headers`, no en el `secret` de firma.

**Criterios de aceptación:**
- **Dado** un webhook con `method: "PUT"` y `headers: { Authorization: "Bearer {{token}}" }`, **cuando**
  corre, **entonces** la request usa ese método y ese header (además de la firma).
- **Dado** un webhook guardado sin estos campos, **cuando** corre, **entonces** es un POST idéntico al
  actual (retrocompat).

**Prioridad:** Media — amplía "integraciones con diferentes proveedores"; esfuerzo bajo-medio.
**Riesgo:** un header mal puesto rompe la request — validación en vivo y vista previa de headers.

---

### B4 · Verificación de firma entrante en el inbox

**Estado:** ❌ Gap — 032 §B ofrece un `X-Hito-Inbox-Secret` a nivel de proxy (el proxy rechaza lo que
no lo traiga), pero **Hito no verifica ninguna firma** sobre el contenido de cada entrega.

**Problema actual:** si el proxy es abierto (secreto opcional), no hay garantía de integridad/origen de
cada entrega drenada. Un iPaaS que firme su payload con un secreto compartido permitiría a Hito
rechazar entregas manipuladas.

**Propuesta:** el inbox-poller puede verificar un `signature` por entrega (HMAC del body con el secreto
de la conexión, reusa `verifyRaw` de 032 §A); entregas con firma inválida se descartan y se registran.
Opcional (default off, simétrico con 032). El `Code.gs` del inbox (032 §D) documenta cómo Make/Zapier
deben firmar.

**Criterios de aceptación:**
- **Dado** una conexión inbox con verificación activada, **cuando** llega una entrega con firma
  inválida, **entonces** se descarta y queda registrada como rechazada.

**Prioridad:** Baja — endurecimiento de seguridad; esfuerzo bajo-medio. **Deps:** 032 §A/§B.

---

## Arco C — Confianza y pulido UX

### C1 · Notificación de fallo clicable (deep-link al run)

**Estado:** 🟡 Parcial — 024 §F3 ya emite una notificación cuando un Flujo activo falla, pero es
**texto plano, no clicable**.

**Problema actual:** `EntityRefSchema.kind` ([notification.ts:5](src/domain/schemas/notification.ts#L5))
es `["project","area","checklist","checklistItem","task"]` — **no existe `"flow"`**, así que la
notificación de fallo no puede deep-linkear al detalle del run (024 §F3 lo documentó como límite). El
usuario recibe "el flujo X falló, revisa Flujos → Historial" y tiene que navegar a mano.

**Propuesta:** `EntityRefSchema.kind` gana `"flow"` (+ opcional `runId`); la notificación de fallo
(024 §F3) setea ese `entityRef`; al clicarla, navega a `FlowHistoryPage` con el run abierto
(`FlowRunDetailDrawer`). Bump de schema con paso identidad. El centro de notificaciones resuelve el
nuevo `kind` a su deep-link como ya hace con los demás.

**Criterios de aceptación:**
- **Dado** un Flujo activo que falla, **cuando** el usuario clica su notificación, **entonces** se abre
  el detalle de ese run en el historial.
- **Dado** notificaciones existentes (sin `kind:"flow"`), **cuando** se cargan, **entonces** siguen
  funcionando igual.

**Prioridad:** Alta, esfuerzo bajo — el ratio valor/esfuerzo más alto de la spec; convierte un aviso
inerte en algo accionable.

---

### C2 · Versionado + rollback de flujos

**Estado:** ❌ Gap — 024 §F9 backlog; editar sobrescribe la definición en el sitio
(`useFlowStore.updateFlow`).

**Problema actual:** estos flujos crean tareas y proyectos reales; un error al editar es difícil de
deshacer y no hay historial de versiones. El dirty-guard (027 §B) y el export (024 §F14) mitigan pero
no dan rollback.

**Propuesta:** snapshot de la definición al guardar (últimas N, p. ej. 10) en un documento aparte
(`flow-versions`, para no inflar `flows`), con timestamp y resumen del cambio. Acción "Restaurar" que
crea una nueva versión idéntica a la elegida (sin borrar intermedias). Distinguir de `flow-runs`
(historial de ejecuciones, ya existente).

**Criterios de aceptación:**
- **Dado** un flujo editado 3 veces, **cuando** se abre "Historial de versiones", **entonces** se ven
  las 3 con fecha y se puede restaurar cualquiera como versión nueva.

**Prioridad:** Baja — alto valor de seguridad, esfuerzo medio; crecimiento de storage acotado por N.

---

### C3 · Coalescing de polling entre Flujos

**Estado:** 🟡 Parcial — 024 §F10 corrigió la colisión (key por conexión), pero **no** el coalescing:
dos Flujos sobre la misma conexión+objectType+intervalo hacen **dos consultas** por tick.

**Problema actual:** redundancia de llamadas a la API externa (sin pérdida de datos — cada key es
independiente desde 024 §F10). Con varios Flujos sobre la misma conexión, se gasta cupo de tasa de más.

**Propuesta:** cuando varios Flujos comparten conexión+objectType+intervalo, una sola consulta por tick
alimenta a todos (coalescing), en vez de una por Flujo. Reusa `runPolledFlow` despachando el mismo
batch a los N Flujos que comparten la key base.

**Criterios de aceptación:**
- **Dado** dos Flujos sobre la misma conexión/objeto/intervalo, **cuando** llega el tick, **entonces**
  se hace una única consulta y su resultado alimenta a ambos.

**Prioridad:** Baja — optimización de cupo; esfuerzo medio. **Riesgo:** despacho correcto por dueño sin
reintroducir la colisión que 024 §F10 cerró.

---

### C4 · Aplicar/exportar Conexiones sin secretos + reconexión guiada

**Estado:** 🟡 Parcial — 024 §F14 incluyó Flujos en el export/import, pero **dejó las Conexiones fuera**
(viven en Dexie `hito-integrations` con `encryptedSecret`).

**Problema actual:** al portar un workspace a otra instancia, los Flujos viajan pero sus Conexiones no —
el usuario queda con flujos que referencian `connectionId`s inexistentes, sin una guía clara de
reconectar.

**Propuesta:** exportar la config de Conexiones **sin** los secretos (`encryptedSecret` nunca sale en
claro); al importar, listar las conexiones a reconectar y pedir re-introducir cada secreto. Un banner en
Flujos "N conexiones sin resolver" con acceso directo a completarlas.

**Criterios de aceptación:**
- **Dado** un export con conexiones, **cuando** se importa en otra instancia, **entonces** las
  conexiones aparecen sin secreto, listas para reconectar, y los flujos que las usan lo señalan.

**Prioridad:** Baja — portabilidad; esfuerzo medio. **Riesgo:** no filtrar secretos del vault.

---

## Roadmap (impacto vs. esfuerzo)

### Fase 1 — "Cerrar 032 y accionar los fallos"
| Feature | Prioridad | Esfuerzo |
|---|---|---|
| A1 · Delivery log durable + Reenviar | Alta | Medio |
| C1 · Notificación de fallo clicable | Alta | Bajo |
| A2 · Salud por conexión + semáforo | Media | Bajo-medio |
| A3 · Probar round-trip del inbox | Media | Bajo |

### Fase 2 — "Expresividad"
| Feature | Prioridad | Esfuerzo |
|---|---|---|
| B1 · Trigger programado (schedule) | Media-alta | Medio |
| B2 · Branching por salida (guardas) | Media | Medio |
| B3 · Webhook método/headers custom | Media | Bajo-medio |

### Fase 3 — "Madurez y portabilidad"
| Feature | Prioridad | Esfuerzo |
|---|---|---|
| C2 · Versionado + rollback | Baja | Medio |
| C3 · Coalescing de polling | Baja | Medio |
| B4 · Verificación de firma entrante | Baja | Bajo-medio |
| C4 · Export de Conexiones + reconexión | Baja | Medio |

Secuencia sugerida: **A1 → C1 → A2/A3** (cierra el arco de 032 y hace accionables los fallos), luego
**B1/B2/B3** (expresividad, paralelizables), y **Fase 3** según demanda. A1 y C1 comparten poco pero
juntos completan el ciclo "un flujo falló → me entero → veo qué pasó → lo reenvío".

## Fuera de alcance (documentado)

- **Árbol de ramas visual** en el canvas (más allá de la guarda por output de B2) — mayor costo de UI;
  la guarda plana cubre el caso más pedido.
- **Cron string libre** (`* * * * *`) — B1 usa cadencias nombradas para el perfil no-code.
- **Editor JSON libre del payload del webhook** (026/027) — se mantiene fuera; el modo clave/valor +
  headers de B3 cubre lo necesario.
- **Multiusuario/roles** (024 §F12) — sigue dependiendo de una decisión estratégica sobre backend.
- **Webhooks entrantes pasivos reales** (sin polling) — contra el Principio I; el inbox de 032 es la
  contraparte local-first.

## Archivos clave referenciados

- **A1:** `src/store/useDataStore.ts` (`applyFlowResult` — persistir `outboundDeliveries`/
  `emailDeliveries`), `src/storage/integration-db.ts` (`syncLogs`),
  `src/features/integrations/{DeliveryDetailDrawer,SyncLogsPage}.tsx`, `src/flows/webhook-request.ts`
  (replay).
- **A2:** `src/features/flows/ScheduledServicesPage.tsx`, `src/features/integrations/IntegrationsPage.tsx`.
- **A3:** `src/integrations/connections.ts`, `src/features/integrations/components/ConnectionDialog.tsx`,
  `src/features/integrations/guides/AppsScriptGuide.tsx`.
- **B1:** `src/domain/schemas/flow.ts` (`ScheduleTrigger`), `src/flows/engine.ts`
  (`matchesTrigger`/`resolveTriggerData`), nuevo `src/integrations/scheduling/*`,
  `src/features/flows/steps/TriggerStep.tsx`, `src/store/useFlowStore.ts`.
- **B2:** `src/domain/schemas/flow.ts` (`Output.when`), `src/flows/engine.ts` (guarda por output),
  `src/features/flows/canvas/ActionConfigFields.tsx`, `src/features/flows/FlowRunTraceView.tsx`.
- **B3:** `src/domain/schemas/flow.ts` (`WebhookOutput.method`/`headers`), `src/flows/webhook-request.ts`,
  `src/features/flows/canvas/ActionConfigFields.tsx`.
- **B4:** `src/integrations/inbound/inbox-poller.ts`, `src/integrations/outbound/signing.ts` (`verifyRaw`).
- **C1:** `src/domain/schemas/notification.ts` (`kind:"flow"`), `src/store/useDataStore.ts` (024 §F3
  notify), `src/features/flows/FlowHistoryPage.tsx`, centro de notificaciones.
- **C2:** `src/store/useFlowStore.ts`, nuevo doc `flow-versions`.
- **C3:** `src/integrations/inbound/*-polling-manager.ts`, `src/store/useDataStore.ts` (`runPolledFlow`).
- **C4:** `src/storage/{FileSystemAdapter,DownloadAdapter}.ts` (`exportAll`/`importAll`),
  `src/features/settings/CollectionTransferCard.tsx`, `src/integrations/connections.ts`.

## Verificación

Al ser un documento de planificación, la validación es de exactitud:
1. Cada "estado actual" está anclado a archivo/línea reales, verificados en el código tras spec 032
   (`engine.ts`, `notification.ts`, `flow.ts`, `webhook-request.ts`, `connections.ts`, `SyncLogsPage.tsx`).
2. Antes de mover una feature a implementación, confirmar prioridad/fase con el PM — el roadmap es una
   propuesta, no una decisión cerrada.
3. Al implementar cada feature, actualizar `Progreso` por fase con estado, archivos, tests y
   verificación, siguiendo la convención de 018–032.
