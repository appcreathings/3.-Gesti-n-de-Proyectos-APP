# Tasks 032 — Round-trip con Make/Zapier

Checklist de implementación de la spec 032. Estado inicial: **ninguna tarea ejecutada** (spec solo
documentada). Baseline de tests al empezar: 510/510 (tras spec 027). Convención de las specs 018–027:
cada fase cierra con `typecheck` + `lint` + `test` + `build` en verde y una nota en `spec.md → Progreso`.

Secuencia sugerida: **A ∥ B** (paralelas) → **C** → **D** ∥ **E**. El primer bump de schema (A o B, la
que se toque primero) introduce la migración identidad 14→15; las demás solo suman campos.

---

## Fase 0 — Preparación (compartida)

- [ ] **T3200** — Confirmar en un Apps Script real los límites de `LockService`/append concurrente en una
  pestaña de Sheet bajo ráfaga (decisión D1 del design). Si el Sheet no aguanta, revisar fallback a
  `PropertiesService` fragmentado antes de escribir el proxy final.
- [ ] **T3201** — Verificar con un webhook real (webhook.site) cómo llega hoy `X-Hito-Signature` y
  confirmar de primera mano que es inverificable (reproduce el bug de Fase A antes de arreglarlo).
- [ ] **T3202** — Bump `SCHEMA_VERSION` 14→15 en `src/domain/schemas/common.ts` + paso identidad para
  `flows` en `src/domain/migrations.ts` (patrón v13→v14 de 027). Test en `migrations.test.ts`. *(Lo hace
  la primera fase que se implemente; las demás no re-bumpean.)*

---

## Fase A — Firma saliente verificable + envelope

- [ ] **T3210** — `src/integrations/outbound/signing.ts`: extraer `signRaw(rawBody, secret)` /
  `verifyRaw(rawBody, secret, sig)`; `signPayload` pasa a ser wrapper (`signRaw(JSON.stringify(p), …)`)
  para no romper `dispatcher.ts` legacy.
- [ ] **T3211** — `src/domain/schemas/flow.ts`: `WebhookOutputSchema.payloadShape:
  z.enum(["envelope","bare"]).optional()`.
- [ ] **T3212** — `src/flows/webhook-request.ts`: construir el body (envelope/bare), serializar una vez,
  firmar el `rawBody`, y agregar headers `X-Hito-Delivery`/`X-Hito-Timestamp` (+ `X-Hito-Signature`
  sobre el body real). `bodyObj` envelope = `{id,type,timestamp,workspace:{org},data}`.
- [ ] **T3213** — `src/flows/webhook-test.ts`: exponer/mostrar la firma y los headers exactos enviados
  ("Probar webhook" ya hace POST real; solo devolver esos datos a la UI).
- [ ] **T3214** — `src/features/flows/canvas/ActionConfigFields.tsx` (caso webhook): selector "Formato
  del envío" (Envelope firmado recomendado / Payload plano) + bloque plegable "Cómo verificar la firma"
  con la receta copy-paste (Make / Zapier / Node). Default `"envelope"` para webhooks nuevos.
- [ ] **T3215** — Tests: `signing.test.ts` (round-trip, un byte cambiado invalida),
  `webhook-request.test.ts` (envelope y bare: `verifyRaw(body, secret, sig) === true`; headers de
  delivery/timestamp presentes; sin `payloadShape` → bare retrocompat).
- [ ] **T3216** — Verificación E2E manual: webhook.site + script Node de 5 líneas que verifica
  `HMAC(rawBody) === X-Hito-Signature`; manipular body → falla. Nota en `Progreso`.

---

## Fase B — Inbox-polling (entrada Make/Zapier) ⭐

- [ ] **T3220** — `src/domain/schemas/flow.ts`: `PollTriggerSchema.provider` gana `"inbox"`; validar que
  `objectType`/`fields` se ignoran para inbox. Ajustar `validateFlow` (027 §A) para reportar
  `connectionId` vacío en inbox igual que en hubspot/sheets.
- [ ] **T3221** — `src/storage/integration-db.ts`: `ConnectionProvider` gana `"webhook-inbox"` (config:
  `{ proxyUrl }`; secret opcional = inbox secret). Sin bump Dexie (solo amplía el union).
- [ ] **T3222** — `src/integrations/inbound/inbox-poller.ts` (NUEVO): `drainInbox(config, secret, cursor)`
  vía `postToProxy` (`{action:"drain",cursor,max,secret}`), aplana cada delivery a un record
  (`deliveryId`/`receivedAt` + body), devuelve `{records, nextCursor, backlog}`.
- [ ] **T3223** — `src/integrations/inbound/inbox-polling-manager.ts` (NUEVO): registro/desregistro con
  `pollTriggerKey` = `inbox:${connectionId}`; drena, dedup por `deliveryId`
  ([idempotency.ts](src/integrations/inbound/idempotency.ts)), corre `runPolledFlow`, persiste
  `nextCursor` ([poll-sync-state.ts](src/integrations/inbound/poll-sync-state.ts)).
- [ ] **T3224** — `src/flows/engine.ts`: `pollTriggerKey`/`matchesTrigger`/`resolveTriggerData` reconocen
  `provider:"inbox"` (rama sin `objectType`).
- [ ] **T3225** — `src/store/useFlowStore.ts`: enrutar `provider:"inbox"` a `inbox-polling-manager` en
  `addFlow`/`updateFlow`/`deleteFlow` (switch por provider, como hubspot vs sheets).
- [ ] **T3226** — `src/integrations/connections.ts`: rama `webhook-inbox` en `runConnectionProbe`
  ("Probar conexión" = un `drain` real que devuelve entregas de muestra para poblar el picker de `{{}}`);
  `DEFAULT_PROBE_OPERATION`/`PROBE_OPERATIONS_BY_PROVIDER` extendidos.
- [ ] **T3227** — `src/features/flows/steps/TriggerStep.tsx` + `TriggerNodeDrawer.tsx`: opción "Cuando
  Make/Zapier envíe datos (inbox)"; selección de conexión `webhook-inbox`; ocultar campos de
  objectType/fields.
- [ ] **T3228** — `src/features/integrations/IntegrationsPage.tsx` + `ConnectionDialog.tsx`: alta de
  conexión `webhook-inbox` (proxyUrl + inbox secret opcional).
- [ ] **T3229** — Tests: `inbox-poller.test.ts` (cursor/batch/vacío/error de proxy); engine (trigger
  inbox matchea, key por conexión distinta no colisiona); idempotencia (delivery repetido no re-ejecuta);
  catch-up (backlog en varios ticks).
- [ ] **T322A** — Verificación E2E manual: desplegar el proxy inbox (T3241), `curl`/Make POST → tick →
  Flujo corre y crea objeto; repetir `deliveryId` → no duplica; cerrar pestaña, 3 POST, reabrir →
  catch-up. Nota en `Progreso`.

---

## Fase C — Observabilidad + reenvío

- [ ] **T3230** — `src/flows/engine.ts`: al ejecutar `webhook`/`email`, persistir en `syncLogs`
  (direction outbound) el `requestPayload` (rawBody truncado, secreto enmascarado), `responsePayload`
  (primeros bytes), `httpStatus`, `retryCount`. Inbound (Fase B): registrar cada delivery drenada
  (`direction:"inbound"`, `provider:"inbox"`) + desenlace del Flujo.
- [ ] **T3231** — `src/features/integrations/DeliveryDetailDrawer.tsx`: mostrar body/respuesta reales
  (secreto enmascarado) + botón **"Reenviar"** con `ConfirmDialog` → reconstruye con
  `buildWebhookRequest` (misma firma de Fase A) → nuevo intento registrado.
- [ ] **T3232** — `src/features/integrations/SyncLogsPage.tsx`: filtros por direction/provider incluyen
  inbox; enlazar la entrada al `flow-run` que disparó (si aplica).
- [ ] **T3233** — Tests: captura enmascara el secreto; replay produce la misma firma verificable; inbound
  delivery se registra. Confirmar que `maintenance.ts` rota estos logs (no crecen sin límite).
- [ ] **T3234** — Verificación E2E manual: abrir entrega → body/respuesta reales → Reenviar → intento
  nuevo. Nota en `Progreso`.

---

## Fase D — Plantillas round-trip + guías

- [ ] **T3240** — `src/flows/templates.ts`: 2 plantillas nuevas (`enabled:false`, placeholders):
  "Make/Zapier → crear tarea" (trigger inbox, createTask con dedupeKey `{{deliveryId}}`) y "Tarea
  completada → avisar a Make/Zapier" (event `task.statusChanged`, condición `to==done`, webhook
  `payloadShape:"envelope"`).
- [ ] **T3241** — `src/features/integrations/guides/AppsScriptGuide.tsx`: provider `"webhook-inbox"` con
  su `Code.gs` (doPost ingreso + drain, buffer Sheet + LockService, secret opcional), pasos de
  despliegue, y el paso inverso "copia esta URL en el módulo Webhook de Make / paso Webhooks de Zapier".
- [ ] **T3242** — `src/features/docs/data/*` (+ `DOC_SLUGS`, patrón 029): guía "Conectar con Make, Zapier
  y n8n" — dos direcciones, verificación de firma (A), modelo inbox (B), caveat de disponibilidad.
  Confirmar sitemap en `dist/sitemap.xml` tras build.
- [ ] **T3243** — Tests: `templates.test.ts` (las 2 nuevas parsean contra `FlowRuleSchema`, arrancan
  `enabled:false`, `validateFlow` reporta exactamente sus placeholders); `DOC_SLUGS` incluye la guía.
- [ ] **T3244** — Verificación manual: instanciar las 2 plantillas desde el estado vacío de Flujos; abrir
  la guía inbox y la de `/docs`. Nota en `Progreso`.

---

## Fase E — Salud de integraciones + caveat

- [ ] **T3250** — `src/features/flows/ScheduledServicesPage.tsx` + `IntegrationsPage.tsx`: panel de salud
  por conexión (última entrada/salida OK desde `syncLogs`, nº de Flujos + frecuencia — semáforo esbozado
  en 024 §F10, backlog del último drain de inbox).
- [ ] **T3251** — Aviso persistente del caveat de disponibilidad ("polling e inbox corren solo con la
  pestaña abierta; al reabrir hay catch-up") en el panel y en la guía de Fase D. Advertencia si el
  backlog se acerca al límite de retención del proxy.
- [ ] **T3252** — Tests: salud deriva de `syncLogs`; el semáforo cuenta Flujos por conexión.
- [ ] **T3253** — Verificación manual: backlog y semáforo visibles; caveat presente. Nota en `Progreso`.

---

## Cierre

- [ ] **T3260** — `npm run typecheck && npm run lint && npm test && npm run build` en verde con todos los
  tests nuevos. Actualizar `spec.md → Progreso` con estado final por fase, archivos tocados, conteo de
  tests y verificación E2E, siguiendo la convención de las specs 018–027.
- [ ] **T3261** — Actualizar la memoria del proyecto (`gestor-proyectos-app.md`) con el resumen de la
  spec 032 una vez implementada.
