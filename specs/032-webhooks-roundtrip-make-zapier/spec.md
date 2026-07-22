# Spec 032 — Round-trip con Make/Zapier: webhooks entrantes (inbox-polling), firma saliente verificable y observabilidad de entregas

## Progreso

- **Estado general: 🟢 Fases 0/A/B/D completas + C/E parciales, implementadas y verificadas
  (2026-07-21).** `npm run typecheck` limpio, `npm test` **588/588** (baseline 510 tras spec 027 →
  +78), `npm run lint` sin errores nuevos (los 3 restantes son preexistentes: `ai/gemini/agent.ts`,
  `ai/modelSelector.test.ts`, `hooks/useBreakpoint.ts`, documentados desde spec 025), `npm run build`
  OK + sitemap incluye la guía nueva. **Pendiente:** verificación E2E manual del usuario (desplegar el
  proxy inbox de Apps Script, POST desde Make/`curl`, y verificar la firma saliente con
  webhook.site/Node) — no ejecutable sin un iPaaS real ni Playwright en el proyecto.

- **Fase 0 — Schema ✅:** `SCHEMA_VERSION` 14→15 (`common.ts`) + paso identidad `{ to: 15 }` en
  `migrations.ts` (2 tests nuevos en `migrations.test.ts`). Test que fijaba 14 actualizado a 15.

- **Fase A — Firma saliente verificable ✅:** `signRaw`/`verifyRaw` en `signing.ts` (firma el body
  crudo real); `buildWebhookRequest` reescrito — serializa el body una vez y firma **ese string**,
  con envelope `{ eventId, eventType, timestamp, workspace, data }` (alineado al `WebhookSignatureGuide`
  ya existente, que describía este shape pero el código nunca lo enviaba) y headers `X-Hito-Delivery`/
  `X-Hito-Timestamp` (anti-replay). `WebhookOutput.payloadShape` (`"envelope"|"bare"`, ausente=bare
  retrocompat, nuevos default envelope vía `meta.ts`). Selector "Formato del envío" + receta de
  verificación actualizada en `ActionConfigFields`/`WebhookSignatureGuide`. `webhook-test.ts` expone
  firma/headers. **Bug corregido:** antes `X-Hito-Signature` era inverificable (se firmaba un envelope
  con `eventId`/`timestamp` que nunca se transmitían). Tests: `signing.test.ts` (+4), `webhook-request.test.ts`
  (+5, incluye `verifyRaw(rawBody)===true` y body manipulado falla).

- **Fase B — Inbox-polling (entrada Make/Zapier) ✅:** `PollTrigger.provider` gana `"inbox"`,
  `ConnectionProvider` gana `"webhook-inbox"`. NUEVOS `inbox-poller.ts` (`drainInbox` vía `postToProxy`,
  dedup por `deliveryId`, `flattenDelivery`) e `inbox-polling-manager.ts` (hermano de HubSpot/Sheets,
  key `inbox:${connectionId}`, cursor por `receivedAt`, `runPolledFlow`). `engine.pollTriggerKey`
  reconoce inbox. `useFlowStore` enruta inbox; `connections.runConnectionProbe` rama inbox (drain de
  muestra); `manual-run.fetchPollSampleForFlow` rama inbox; `validation.ts` reporta conexión inbox
  faltante. UI: `TriggerStep` (opción "Cuando Make/Zapier envíe datos" + hint), `ConnectionDialog`
  (`webhook-inbox` con secreto opcional vía nuevo `secretOptional`), `IntegrationsPage` (pestaña Inbox).
  Tests: `inbox-poller.test.ts` (NUEVO, 7 — cursor/batch/vacío/error/dedup/secret), engine (+1 key
  inbox sin colisión).

- **Fase D — Plantillas round-trip + guías ✅:** 2 plantillas nuevas en `templates.ts`
  ("Make/Zapier → crear tarea" inbox, "Tarea completada → avisar a Make/Zapier" webhook envelope) +
  categoría "Make/Zapier" + `requires: "webhook-inbox"`. `AppsScriptGuide` gana el provider
  `webhook-inbox` con su `Code.gs` de inbox (doPost ingreso+drain, buffer en pestaña de Sheet con
  `LockService`, retención FIFO, secret opcional) y el paso "pega esta URL en Make/Zapier". Nueva guía
  `/docs/conectar-make-zapier-n8n` (`modules.tsx`+`slugs.ts`, confirmada en `dist/sitemap.xml`). Tests:
  `templates.test.ts` actualizado (6→8, +2 expected-errors).

- **Fase C — Observabilidad (parcial) 🟡:** el output `webhook` del motor ahora captura en la traza
  (`resolved`) el **status HTTP y un fragmento de la respuesta real** de Make/Zapier (secreto siempre
  ausente) — "¿mi escenario recibió el webhook?" deja de ser un misterio. **Diferido** (riesgo de
  desestabilizar el motor puro y su suite): persistir cada entrega de Flujo en `syncLogs`/
  `SyncLogsPage` y el botón **Reenviar** (replay) — quedan como follow-up de esta fase.

- **Fase E — Salud + caveat (parcial) 🟡:** banner de **caveat de disponibilidad** en
  `ScheduledServicesPage` ("el sondeo y el inbox corren solo con Hito abierto; al reabrir hay
  catch-up") + inbox mencionado en el panel de Entrada. **Diferido:** el semáforo rico por conexión
  (última entrada/salida OK, backlog del inbox) — depende de la persistencia de Fase C.

### Estado original (planning, 2026-07-21)

Sesión de análisis/planning end-to-end del módulo de Flujos e Integraciones, con foco en el round-trip
con Make/Zapier. Se auditó el código real y las specs 018–027. El diseño y las tasks de abajo guiaron
la implementación.

## Context

El módulo de Flujos e Integraciones (specs 018–027) es maduro y está bien cableado: motor confiable,
validación/plantillas/organización (027), interpolación real (026), polling indexado por conexión sin
colisión (024 §F10), reintentos + política de fallo (027 §E), y bootstrap completo en
[App.tsx:213-243](src/App.tsx#L213-L243) (vault auto-lock, visibility-aware polling, outbound
processor, maintenance, re-registro de pollers al hidratar Flows).

Esta spec **no reescribe nada de eso**. Cierra la brecha que impide que el ciclo con un iPaaS
externo (Make / Zapier / n8n) funcione **de punta a punta y en las dos direcciones**, que es
exactamente lo que un usuario no-code espera cuando conecta Hito a su stack de automatización.

La auditoría E2E del 2026-07-21 encontró **dos problemas estructurales** y varios gaps de
completitud, cada uno anclado a código verificado.

### Estado real por dirección (verificado archivo por archivo)

**Salida (Hito → Make/Zapier): FUNCIONA, pero la firma HMAC es inverificable por el receptor.**
El output `webhook` de un Flujo construye la request en
[webhook-request.ts](src/flows/webhook-request.ts): payload interpolado (026 §C), reintentos (027 §E),
"Probar webhook", y firma HMAC. Pero hay un **bug de correctitud de interoperabilidad**:

- [signing.ts:3-24](src/integrations/outbound/signing.ts#L3-L24) firma
  `HMAC-SHA256(JSON.stringify(payload))` y devuelve `sha256=<hex>`.
- [webhook-request.ts:33-57](src/flows/webhook-request.ts#L33-L57) firma el **envelope**
  `{ eventId: uuid(), eventType: "flow.execution", timestamp: nowIso(), workspace: {org:"Hito"}, data: payload }`,
  **pero el body que sale es `JSON.stringify(payload)`** (solo `data`), y los headers son únicamente
  `X-Hito-Signature` y `X-Hito-Event`.
- **Consecuencia:** `eventId` y `timestamp` se generan, entran en el material firmado, y **nunca se
  transmiten** (ni en el body ni en headers). El receptor recibe `body = data` pero la firma se
  calculó sobre un objeto distinto que él no puede reconstruir. **La firma HMAC es imposible de
  verificar en el lado de Make/Zapier** — el header `X-Hito-Signature` es, en la práctica, decorativo.
  Además, sin `X-Hito-Timestamp` transmitido no hay protección contra replay. Esto rompe la promesa de
  seguridad documentada en 018 §11.1 ("Suplantación de webhooks: firma HMAC; receptor verifica con
  `X-Hito-Signature`").

**Entrada (Make/Zapier → Hito): NO EXISTE.**
El único inbound es **polling**: HubSpot y Google Sheets vía un proxy Apps Script del usuario
([connections.ts](src/integrations/connections.ts), [proxy-fetch.ts](src/integrations/proxy-fetch.ts)).
El schema de triggers ([flow.ts:44-60](src/domain/schemas/flow.ts#L44-L60)) solo admite
`provider: "hubspot" | "google-sheets"`. Los webhooks entrantes pasivos están **explícitamente fuera
de alcance desde 018 §2.3** ("requerirían servidor"), y así sigue: **Make/Zapier no tiene ninguna
forma de empujar datos hacia Hito**. El único workaround posible hoy (que Make escriba a un Google
Sheet y Hito lo pollee) no está soportado como patrón: no hay dedup por delivery-id, ni mapeo guiado,
ni documentación. El "y viceversa" del pedido, hoy, no funciona.

### Los gaps concretos

1. **Firma saliente inverificable** (bug) — se firman bytes que no se envían
   ([webhook-request.ts:33-57](src/flows/webhook-request.ts#L33-L57)). Ningún receptor de Make/Zapier
   puede validar `X-Hito-Signature`. Sin `X-Hito-Timestamp`/`X-Hito-Delivery`, tampoco hay anti-replay.
2. **No hay canal de entrada desde un iPaaS** (gap) — el trigger de entrada solo conoce HubSpot/Sheets
   ([flow.ts:44-60](src/domain/schemas/flow.ts#L44-L60)). Make/Zapier/n8n no pueden iniciar un Flujo en
   Hito. Falta el 50% del round-trip.
3. **No se captura el request/response real de una entrega saliente** (gap parcial, ya notado en
   024 §F4) — la traza guarda solo valores interpolados truncados (`resolved`, cap `MAX_TRACE_RECORDS=5`
   en [engine.ts](src/flows/engine.ts)), nunca el body enviado ni el status/mensaje de respuesta de
   Make/Zapier. Depurar "¿por qué mi escenario de Make no recibió nada?" es a ciegas.
4. **No hay reenvío (replay) de una entrega** (gap) — si un webhook falló o el escenario de Make estaba
   apagado, no existe "Reenviar esta entrega". Hoy la única opción es re-disparar el evento de dominio.
5. **Cero plantillas ni guía del round-trip** (gap) — las 6 plantillas de 027 §C son
   HubSpot/Sheets/email/internas; ninguna cubre "Make/Zapier → Hito" ni "Hito → Make/Zapier verificable".
   `AppsScriptGuide` ([AppsScriptGuide.tsx](src/features/integrations/guides/AppsScriptGuide.tsx))
   cubre hubspot/google-sheets/email, no un inbox. `/docs` no tiene receta E2E.
6. **Sin panel de salud de integraciones** (gap) — `ScheduledServicesPage` lista timers de polling
   crudos, pero no hay una vista por conexión de "última entrada/salida OK, backlog pendiente,
   frecuencia" ni se comunica el caveat de disponibilidad (el polling y el inbox-drain corren **solo
   mientras la pestaña está abierta**).

**Resultado buscado:** que un usuario no-code pueda (a) enviar webhooks a Make/Zapier con una firma
que su escenario **realmente pueda verificar** (con receta copy-paste), (b) recibir datos **desde**
Make/Zapier/n8n hacia Hito sin montar un servidor, usando el mismo modelo de proxy Apps Script que ya
domina, (c) ver exactamente qué se envió/recibió y **reenviar** una entrega, y (d) arrancar desde una
plantilla y una guía que documenten el ciclo completo.

**Outcome medible:**
- Un receptor (Make/Zapier/Node) puede verificar `X-Hito-Signature` con el secreto compartido y
  rechazar un payload manipulado o con timestamp viejo (Fase A).
- Make/Zapier ejecuta un POST a un proxy inbox del usuario y, en el siguiente tick de polling, un Flujo
  de Hito corre con ese registro como entrada — sin duplicar si el tick se repite (Fase B).
- Cada entrega saliente muestra host, body enviado y status/respuesta reales (secreto enmascarado), y
  puede reenviarse con un clic (Fase C).
- Desde el estado vacío, "Make/Zapier → crear tarea" y "Tarea completada → Make/Zapier" quedan
  preconfiguradas, y `/docs` explica el round-trip completo (Fase D).
- El panel de salud muestra, por conexión, última entrada/salida OK y backlog, con el caveat de
  disponibilidad explícito (Fase E).

## Decisiones de diseño propuestas (a confirmar al iniciar implementación)

- **Firmar exactamente los bytes que se envían (invariante).** La firma se calcula sobre el **string
  del body tal cual sale** (`signature = HMAC(rawBody)`), no sobre un objeto paralelo. Es la única
  forma de que el receptor pueda reproducir el cálculo. Se abandona el envelope-firmado-pero-no-enviado.
- **Envelope estándar por defecto, con opción "plano" retrocompatible.** Los webhooks nuevos envían un
  envelope verificable `{ id, type, timestamp, workspace, data }` como body (patrón GitHub/Stripe),
  con headers `X-Hito-Signature`, `X-Hito-Delivery` (= `id`), `X-Hito-Timestamp`, `X-Hito-Event`. Un
  toggle por webhook `payloadShape: "envelope" | "bare"` conserva el body plano (`data` suelto) para
  quien ya construyó un escenario de Make esperándolo — **en ambos modos la firma cubre el body real**,
  así que ambos pasan a ser verificables. Default para webhooks nuevos: `"envelope"`; los existentes
  (sin el campo) se tratan como `"bare"` para no romper integraciones ya montadas.
- **Entrada por "inbox-polling", no por servidor.** Se preserva el Principio I (local-first, sin
  infraestructura propia): Make/Zapier hace POST al **proxy Apps Script del propio usuario**, que
  **acumula** las entregas en una cola (pestaña de Sheet o `PropertiesService`/`CacheService`); Hito
  **pollea** ese inbox con el mismo `pollingManager` que ya usa para HubSpot/Sheets, drena las entregas
  nuevas y las despacha al Flujo por el camino `externalData` ya existente (`runPolledFlow`). No hay
  webhook pasivo, no hay servidor de Hito — solo un proxy más, del mismo tipo que el usuario ya sabe
  desplegar.
- **Idempotencia por delivery-id.** Cada entrega del inbox trae un `deliveryId` (generado por el proxy)
  y un `receivedAt`; Hito dedup con el módulo existente
  ([idempotency.ts](src/integrations/inbound/idempotency.ts)) para que un re-drain (o un tick repetido)
  nunca cree la tarea dos veces. El cursor de drenado se persiste como los demás cursores de polling
  (`lastSyncAt` por poll-key, patrón de 024 §F10).
- **Verificación opcional de entrada.** El proxy inbox acepta un `X-Hito-Inbox-Secret` (o firma HMAC
  del cuerpo) que Make/Zapier debe enviar; el proxy rechaza lo que no lo traiga. Esto evita que un
  tercero que descubra la URL del inbox inyecte registros. Es opcional (default off) para no bloquear
  el primer "hola mundo", pero recomendado y guiado.
- **Catch-up al abrir la app.** Como el drain corre solo con la pestaña abierta, al arrancar (o al
  recuperar foco, reusando [visibility-aware.ts](src/integrations/polling/visibility-aware.ts)) el
  primer poll drena **todo el backlog** acumulado en el proxy mientras Hito estuvo cerrado. El proxy
  retiene hasta un límite (documentado); más allá, se descartan los más viejos y el panel de salud lo
  advierte. Se acepta explícitamente que Hito no es un consumidor 24/7 — es la contraparte honesta del
  modelo local-first.
- **Reutilizar, no inventar.** Delivery log de salida = extender la traza/`syncLogs` ya existentes, no
  una tabla nueva si se puede evitar. Inbox = un `ConnectionProvider` más y una rama de
  `runConnectionProbe`/`postToProxy`, no un subsistema aparte. Plantillas = `templates.ts` (027 §C).
  Guía = `AppsScriptGuide` (un provider más) + una guía de `/docs` (patrón 029).
- **Un solo bump de schema** para toda la spec: `PollTrigger.provider` gana `"inbox"`,
  `WebhookOutput` gana `payloadShape`, `ConnectionProvider` gana `"webhook-inbox"`. Todos
  opcionales/defaulted → migración identidad, flujos existentes corren idéntico.

## Convención de estado

- ✅ **Ya construido** — existe en producción.
- 🟡 **Parcial / con bug** — subsistema construido pero con comportamiento incorrecto o sin cablear.
- ❌ **Gap** — no existe, feature nuevo.

---

## Fase A — Firma saliente verificable + envelope estándar de webhook

**Estado:** 🟡 Bug de correctitud — la firma existe pero cubre bytes que no se envían
([webhook-request.ts:33-57](src/flows/webhook-request.ts#L33-L57)), así que ningún receptor la puede
validar.

**Problema actual:** gap 1 del Context.

**Propuesta:**
- `src/flows/webhook-request.ts`:
  - Construir el body **primero** (envelope o plano según `payloadShape`), serializarlo una sola vez, y
    firmar **ese string exacto**: `signature = signRaw(rawBody, secret)`.
  - Modo `"envelope"` (default nuevo): body =
    `{ id, type: "flow.execution", timestamp, workspace: { org }, data: payload }`. `id` = uuid,
    `timestamp` = ISO. Headers: `X-Hito-Signature: sha256=…`, `X-Hito-Delivery: <id>`,
    `X-Hito-Timestamp: <timestamp>`, `X-Hito-Event: flow.execution`.
  - Modo `"bare"` (retrocompat): body = `payload` (comportamiento visual actual), pero la firma ahora
    cubre ese mismo body → deja de ser inverificable. Mismos headers de delivery/timestamp.
- `src/integrations/outbound/signing.ts`: nueva `signRaw(rawBody: string, secret): Promise<string>`
  (el core actual, sin el `JSON.stringify` interno); `signPayload` pasa a ser un wrapper
  (`signRaw(JSON.stringify(payload), secret)`) para no romper al dispatcher legacy. Nueva
  `verifyRaw(rawBody, secret, signature)` simétrica.
- `src/domain/schemas/flow.ts`: `WebhookOutputSchema.payloadShape: z.enum(["envelope","bare"]).optional()`
  (ausente = `"bare"` para flujos guardados; la UI de creación nueva default `"envelope"`).
- UI `ActionConfigFields` (webhook): selector "Formato del envío": **Envelope firmado (recomendado)** /
  **Payload plano**. Bloque plegable **"Cómo verificar la firma"** con receta copy-paste para
  Make (módulo *Webhooks* + *Custom JS*), Zapier (*Code step*) y Node/Apps Script — muestra el
  pseudocódigo `HMAC_SHA256(rawBody, secret) === header` y la ventana de tolerancia del timestamp.
- "Probar webhook" ([webhook-test.ts](src/flows/webhook-test.ts)): mostrar la firma calculada y los
  headers exactos que se enviaron, para que el usuario los pegue en su verificador.
- Tests: `webhook-request.test.ts` (envelope: firma == HMAC del body enviado; bare: idem; headers de
  delivery/timestamp presentes), `signing.test.ts` (`signRaw`/`verifyRaw` round-trip, un byte
  cambiado invalida).

**Criterios de aceptación:**
- **Dado** un webhook en modo envelope, **cuando** el receptor calcula `HMAC(rawBody, secret)`,
  **entonces** coincide con `X-Hito-Signature` (hoy nunca coincide).
- **Dado** un payload manipulado en tránsito, **cuando** el receptor verifica, **entonces** la firma no
  coincide y puede rechazarlo.
- **Dado** `X-Hito-Timestamp` fuera de una ventana (ej. 5 min), **cuando** el receptor lo evalúa,
  **entonces** puede rechazar el replay.
- **Dado** un webhook guardado antes de esta spec (sin `payloadShape`), **cuando** corre, **entonces**
  envía el body plano de siempre pero ahora con firma verificable — el escenario de Make existente que
  no verificaba firma sigue recibiendo el mismo shape.

**Prioridad:** Alta — es "que los webhooks a Make/Zapier funcionen bien" del pedido; hoy la seguridad
anunciada no se cumple. Esfuerzo bajo-medio.

**Dependencias / riesgos:** Cambiar el default a `"envelope"` cambia el shape del body para webhooks
nuevos — mitigado con el toggle y con que los existentes quedan `"bare"`. Documentar la ventana de
timestamp recomendada sin imponerla (el receptor decide).

---

## Fase B — Entrada desde Make/Zapier: inbox-polling (el "viceversa") ⭐

**Estado:** ❌ Gap — no existe canal de entrada de un iPaaS; el trigger solo conoce HubSpot/Sheets
([flow.ts:44-60](src/domain/schemas/flow.ts#L44-L60)).

**Problema actual:** gap 2 del Context — la mitad faltante del round-trip.

**Propuesta:**
- **Proxy inbox (Apps Script), guiado en la UI:** nuevo `Code.gs` que:
  - `doPost(e)` desde Make/Zapier: valida el `X-Hito-Inbox-Secret`/firma opcional, genera
    `deliveryId` + `receivedAt`, y **acumula** el body en una cola (pestaña de Sheet dedicada o
    `PropertiesService`), respondiendo `{ status: 200, data: { deliveryId } }`.
  - `doPost(e)` con `{ action: "drain", cursor }` desde Hito: devuelve las entregas con
    `receivedAt > cursor` (hasta un batch máximo) en el envelope `{status,data}` que
    [proxy-envelope.ts](src/integrations/inbound/proxy-envelope.ts) ya sabe desenvolver, e informa el
    nuevo cursor. Retención acotada (ej. 500 entregas / 7 días), FIFO.
- `src/domain/schemas/flow.ts`: `PollTriggerSchema.provider` gana `"inbox"`; para `provider:"inbox"`,
  `objectType`/`fields` no aplican, `intervalMs` sí. `ConnectionProvider` (integration-db) gana
  `"webhook-inbox"` (config: `proxyUrl`; secret opcional = el inbox secret compartido con Make/Zapier).
- **Poller de inbox:** `src/integrations/inbound/inbox-poller.ts` (NUEVO) — `drainInbox(config, cursor)`
  vía `postToProxy` (reusa CORS/`text/plain`/desenvelope de [proxy-fetch.ts](src/integrations/proxy-fetch.ts)),
  devuelve `records` planos (cada delivery = un registro para el Flujo, con `deliveryId`/`receivedAt`
  como campos disponibles en `{{}}`). Registrado por
  `src/integrations/inbound/inbox-polling-manager.ts` (NUEVO), hermano de los de HubSpot/Sheets, usando
  `pollTriggerKey` (024 §F10) `inbox:${connectionId}`.
- **Dedup + cursor:** cada `deliveryId` pasa por [idempotency.ts](src/integrations/inbound/idempotency.ts);
  el cursor (`receivedAt` máximo drenado) se persiste como los demás (`poll-sync-state.ts`).
- **Catch-up:** el primer drain tras abrir la app (o recuperar foco) trae todo el backlog buffered.
- `src/flows/engine.ts`: `matchesTrigger`/`resolveTriggerData` reconocen `provider:"inbox"` (misma
  mecánica que HubSpot/Sheets — la key `inbox:${connectionId}` ya la produce `pollTriggerKey`).
- UI: `TriggerStep`/`TriggerNodeDrawer` ganan la opción "Cuando Make/Zapier envíe datos (inbox)";
  la conexión `webhook-inbox` se crea en Integraciones con su `AppsScriptGuide` propio (Fase D).
  "Probar conexión" hace un `drain` real y muestra las entregas de muestra (pobla el picker de `{{}}`
  como ya hace `testConnection`).
- Tests: `inbox-poller.test.ts` (drain con cursor, batch, vacío, error de proxy), engine (trigger
  `inbox` matchea y despacha), idempotencia (delivery repetido no re-ejecuta), key por conexión.

**Criterios de aceptación:**
- **Dado** un Flujo con trigger inbox activo y una conexión `webhook-inbox` configurada, **cuando**
  Make/Zapier hace POST al proxy con `{ "email": "x@y.com", "nombre": "Ana" }`, **entonces** en el
  siguiente tick Hito corre el Flujo con ese registro y (ej.) crea la tarea/persona mapeada.
- **Dado** el mismo `deliveryId` drenado dos veces (tick repetido o re-drain), **cuando** el engine
  corre, **entonces** la acción se ejecuta **una sola vez**.
- **Dado** Make envió 12 entregas con la pestaña cerrada, **cuando** el usuario abre Hito,
  **entonces** el primer drain procesa las 12 (hasta el límite de retención) en orden.
- **Dado** un secret de inbox configurado, **cuando** un POST llega sin él, **entonces** el proxy lo
  rechaza y no entra a la cola.
- **Dado** dos Flujos inbox con conexiones distintas, **cuando** ambos activos, **entonces** cada uno
  drena solo su propia cola (key por `connectionId`, sin colisión — hereda 024 §F10).

**Prioridad:** Alta — es el "y viceversa" del pedido; sin esto el round-trip con Make/Zapier no existe.
Esfuerzo medio (proxy nuevo + provider + poller, pero todo sobre rieles ya construidos).

**Dependencias / riesgos:** Ninguna previa dura (Fase A es paralelizable). Riesgo: el buffer del proxy
puede desbordar si Hito está mucho tiempo cerrado — mitigado con retención documentada + aviso en el
panel de salud (Fase E). Riesgo: `PropertiesService` tiene límites de tamaño en Apps Script — el diseño
(design.md §3) evalúa Sheet-tab vs Properties y elige según límites reales.

---

## Fase C — Observabilidad y reenvío de entregas

**Estado:** 🟡 Parcial — la traza guarda valores interpolados truncados (026 §E, cap 5 registros), pero
no el request/response real (024 §F4 lo dejó en backlog) ni permite reenviar.

**Problema actual:** gaps 3 y 4 del Context.

**Propuesta:**
- **Captura de entrega saliente:** al ejecutar un output `webhook`/`email`, persistir un registro de
  entrega (extiende `syncLogs`/`outboundQueue` de [integration-db.ts](src/storage/integration-db.ts), o
  la traza de `flow-runs`): host destino, headers de firma (secreto **enmascarado**), body enviado
  (truncado a N KB), status HTTP y primeros bytes de la respuesta, intento nº (reusa el conteo de retry
  de 027 §E). Nunca el `secret` en claro (criterio de 024 §F4 / 026 §E).
- **Reenviar (replay):** acción "Reenviar" en el detalle de una entrega —
  reconstruye la request con `buildWebhookRequest` (Fase A, misma firma) y la re-envía, registrando un
  nuevo intento. Confirmación explícita (es una llamada real, criterio de "Ejecutar"/spec 025 §D).
- **Entradas del inbox también observables:** cada delivery drenada (Fase B) aparece como registro
  inbound en el mismo panel, con su `deliveryId` y el resultado del Flujo que disparó.
- UI: extender `DeliveryDetailDrawer`/`SyncLogsPage` ya existentes
  ([DeliveryDetailDrawer.tsx](src/features/integrations/DeliveryDetailDrawer.tsx),
  [SyncLogsPage.tsx](src/features/integrations/SyncLogsPage.tsx)) — ya están cableados a `syncLogs`
  (018 §10.3), solo falta que reciban datos ricos y el botón Reenviar.
- Tests: captura enmascara el secreto; replay reconstruye la misma firma; inbound delivery se registra.

**Criterios de aceptación:**
- **Dado** un webhook a Make, **cuando** se abre su entrega, **entonces** se ve el body enviado y el
  status/respuesta real de Make, con el secreto enmascarado.
- **Dado** una entrega fallida (Make estaba apagado), **cuando** el usuario pulsa "Reenviar",
  **entonces** se re-envía con la misma firma verificable y queda un intento nuevo registrado.
- **Dado** una entrada del inbox, **cuando** se abre en el panel, **entonces** se ve el body recibido y
  el desenlace del Flujo.

**Prioridad:** Media-alta — es lo que convierte "no llegó nada a Make" de un misterio en un diagnóstico.
Esfuerzo medio.

**Dependencias / riesgos:** Fase A (el replay usa el builder de firma nuevo). Vigilar tamaño de
`syncLogs` (ya acotado por `maintenance.ts`, 018 §9.3). No persistir secretos en claro.

---

## Fase D — Plantillas round-trip, guía E2E e inbox guide

**Estado:** ❌ Gap — ninguna de las 6 plantillas de 027 §C cubre Make/Zapier; `AppsScriptGuide` no
tiene variante inbox; `/docs` no tiene receta E2E.

**Propuesta:**
- `src/flows/templates.ts`: 2 plantillas nuevas (siempre `enabled:false`, placeholders vacíos):
  1. **"Make/Zapier → crear tarea"** (trigger `inbox`, createTask con `{{título}}`/`{{email}}` y
     dedupeKey `{{deliveryId}}`).
  2. **"Tarea completada → avisar a Make/Zapier"** (event `task.statusChanged`, condición `to == done`,
     webhook `payloadShape:"envelope"`). Cada `build()` valida contra `FlowRuleSchema` (test de 027 §C).
- `AppsScriptGuide`: nuevo provider `"webhook-inbox"` con su `Code.gs` (doPost acumula + drain),
  pasos de despliegue, y **la URL del inbox para pegar en Make/Zapier** (el paso inverso: aquí la URL
  se copia hacia el iPaaS, no hacia Hito).
- `/docs` (patrón spec 029): guía nueva "Conectar con Make, Zapier y n8n" — explica las dos
  direcciones, la verificación de firma (Fase A) y el modelo inbox (Fase B), con el caveat de
  disponibilidad.
- Tests: `templates.test.ts` (las 2 nuevas parsean y `validateFlow` reporta exactamente sus
  placeholders); `DOC_SLUGS` incluye la guía nueva (sitemap, patrón 029).

**Criterios de aceptación:**
- **Dado** el estado vacío de Flujos, **cuando** el usuario elige "Make/Zapier → crear tarea",
  **entonces** aterriza en el builder con el banner (027 §A) pidiendo elegir la conexión inbox.
- **Dado** la guía inbox, **cuando** el usuario la sigue, **entonces** obtiene una URL de proxy para
  pegar en el módulo Webhook de Make / el paso Webhooks de Zapier.
- **Dado** `/docs`, **cuando** el usuario abre "Conectar con Make, Zapier y n8n", **entonces** ve el
  round-trip completo documentado.

**Prioridad:** Media — es el time-to-value del round-trip; esfuerzo medio (curación + guía).

**Dependencias / riesgos:** Fases A y B (las plantillas y guías las describen). Mantener las plantillas
sincronizadas con el bump de schema (test lo garantiza).

---

## Fase E — Salud de integraciones y caveat de disponibilidad

**Estado:** 🟡 Parcial — `ScheduledServicesPage` muestra timers crudos; no hay salud por conexión ni se
comunica el caveat de disponibilidad.

**Propuesta:**
- Panel de salud por conexión (extiende `ScheduledServicesPage`/`IntegrationsPage`): última entrada OK
  (inbox drain), última salida OK (webhook/email), nº de Flujos que la consultan y frecuencia (reusa el
  semáforo esbozado en 024 §F10), y **backlog pendiente** del inbox (del último drain).
- Aviso explícito y persistente: "El polling y la recepción vía inbox funcionan **solo mientras Hito
  está abierto** en una pestaña. Al reabrir, Hito recupera lo pendiente (catch-up)." — en el panel y en
  la guía de Fase D.
- Aviso de backlog cerca del límite de retención del proxy (riesgo de pérdida si Hito lleva mucho
  cerrado).
- Tests: salud deriva de `syncLogs`; el semáforo cuenta Flujos por conexión.

**Criterios de aceptación:**
- **Dado** una conexión inbox con 40 entregas buffered, **cuando** el usuario abre el panel,
  **entonces** ve el backlog y, si excede el umbral, una advertencia.
- **Dado** una conexión consultada por 3 Flujos cada 5 min, **cuando** se abre el panel, **entonces**
  ve "3 flujos · cada 5 min".
- **Dado** cualquier conexión, **cuando** se abre el panel, **entonces** el caveat de disponibilidad es
  visible.

**Prioridad:** Media-baja — cierra la honestidad del modelo local-first; esfuerzo bajo (deriva de datos
que las Fases B/C ya producen).

**Dependencias / riesgos:** Fases B y C (la salud lee sus datos). Ninguna arquitectónica.

---

## Fuera de alcance (documentado)

- **Webhooks entrantes pasivos reales** (sin polling) — seguirían requiriendo un servidor propio,
  contra el Principio I. El inbox-polling es la contraparte local-first deliberada. Si algún día se
  ofrece un backend opcional, sería otra spec.
- **Editor JSON libre / métodos y headers HTTP arbitrarios en el webhook saliente** (026/027 fuera de
  alcance) — se mantiene; el envelope de Fase A es POST fijo + headers de firma.
- **Retry por-acción con cola persistente para el output de Flujo** — 027 §E ya da retry sincrónico;
  una cola durable (como el `outboundQueue`/`retry-engine` legacy) para el output de Flujo queda fuera.
- **Coalescing de drains de inbox entre Flujos** que compartan conexión (análogo a 024 §F10 parte 2) —
  sin pérdida de datos (cada key es independiente), solo redundancia; queda para después.
- **Verificación de firma entrante estricta obligatoria** — se ofrece opcional (secret compartido);
  forzarla por defecto rompería el primer "hola mundo".
- **Conectores nativos (sin proxy) para Make/Zapier** — no aplica: Make/Zapier ya aceptan CORS del
  navegador para la salida (018 §1.1); la entrada usa proxy por el modelo sin servidor, no por CORS.

## Roadmap (impacto vs. esfuerzo)

| Fase | Esfuerzo | Prioridad | Bloquea |
|---|---|---|---|
| A · Firma saliente verificable + envelope | Bajo-medio | Alta | C (replay usa el builder) |
| B · Inbox-polling (entrada Make/Zapier) ⭐ | Medio | Alta | D, E |
| C · Observabilidad + reenvío de entregas | Medio | Media-alta | E |
| D · Plantillas round-trip + guías | Medio | Media | — |
| E · Salud de integraciones + caveat | Bajo | Media-baja | — |

Secuencia sugerida: **A y B en paralelo** (independientes; B es el corazón del pedido) → **C** (usa la
firma de A y las entradas de B) → **D** y **E** (documentan y hacen visible lo construido). Todas las
fases comparten un único bump de schema (`provider:"inbox"`, `payloadShape`, `"webhook-inbox"`) — la
primera en implementarse introduce la migración identidad; las siguientes solo suman campos.

## Archivos clave

- **Firma (Fase A):** `src/integrations/outbound/signing.ts` (`signRaw`/`verifyRaw`),
  `src/flows/webhook-request.ts` (firmar el body real + envelope + headers),
  `src/domain/schemas/flow.ts` (`WebhookOutput.payloadShape`), `src/flows/webhook-test.ts` (mostrar
  firma/headers), `src/features/flows/canvas/ActionConfigFields.tsx` (selector + receta de verificación).
- **Inbox (Fase B, NUEVO):** `src/integrations/inbound/inbox-poller.ts`,
  `src/integrations/inbound/inbox-polling-manager.ts`; `src/domain/schemas/flow.ts`
  (`PollTrigger.provider "inbox"`), `src/storage/integration-db.ts` (`ConnectionProvider "webhook-inbox"`),
  `src/flows/engine.ts` (`matchesTrigger`/`resolveTriggerData`/`pollTriggerKey` reconocen inbox),
  `src/integrations/connections.ts` (`runConnectionProbe` rama inbox), `src/features/flows/steps/TriggerStep.tsx`.
- **Observabilidad (Fase C):** `src/flows/engine.ts` (captura request/response),
  `src/storage/integration-db.ts` (`syncLogs` enriquecidos),
  `src/features/integrations/DeliveryDetailDrawer.tsx` (+ Reenviar), `SyncLogsPage.tsx`.
- **Plantillas/guías (Fase D):** `src/flows/templates.ts`,
  `src/features/integrations/guides/AppsScriptGuide.tsx` (provider inbox),
  `src/features/docs/data/*` (+ `DOC_SLUGS`, patrón 029).
- **Salud (Fase E):** `src/features/flows/ScheduledServicesPage.tsx`,
  `src/features/integrations/IntegrationsPage.tsx`.
- **Reutilizados sin tocar (o casi):** `src/integrations/proxy-fetch.ts`,
  `src/integrations/inbound/proxy-envelope.ts`, `src/integrations/inbound/idempotency.ts`,
  `src/integrations/inbound/poll-sync-state.ts`, `src/integrations/polling/polling-manager.ts`,
  `src/store/useDataStore.ts` (`runPolledFlow`/`applyFlowResult`).

## Verificación

- `npm run typecheck && npm run lint && npm test` en verde con los tests nuevos de cada fase (baseline
  actual: 510/510 tras spec 027). `npm run build` en verde.
- Smoke E2E real (el proyecto no tiene Playwright; se hace smoke de runtime + prueba manual):
  - **A:** configurar un webhook envelope contra `webhook.site` / listener local → verificar que
    `HMAC(rawBody, secret) === X-Hito-Signature` con un script Node de 5 líneas; manipular el body y
    ver que falla.
  - **B:** desplegar el proxy inbox → POST desde Make (o `curl`) con un JSON → confirmar que en el
    siguiente tick el Flujo corre y crea el objeto; repetir el mismo `deliveryId` y ver que no
    duplica; cerrar la pestaña, enviar 3 POST, reabrir y ver el catch-up.
  - **C:** abrir la entrega en `SyncLogsPage` → ver body/respuesta reales (secreto enmascarado) →
    "Reenviar" → nuevo intento con la misma firma.
  - **D:** instanciar las 2 plantillas desde el estado vacío; abrir la guía `/docs`.
  - **E:** ver el backlog y el semáforo de Flujos por conexión, y el caveat de disponibilidad.
- Screenshots anexados a `Progreso` al cerrar cada fase, convención specs 018–027.
