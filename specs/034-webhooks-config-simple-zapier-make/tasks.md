# Tasks 034 — Webhooks salientes simples + guía Zapier/Make

Checklist de implementación. Estado inicial: **ninguna tarea ejecutada**. Baseline: **629/629 tests**
(tras spec 033 + fixes). `SCHEMA_VERSION = 16`. Cada fase cierra con
`typecheck`+`lint`+`test`+`build` en verde y nota en `spec.md → Progreso`.

Secuencia sugerida: **A → C → D** (arco "fácil y claro") en paralelo con **B** (bug urgente); **E** al
final.

---

## Fase A — Webhook limpio (firma opcional + plano por defecto)

- [ ] **T3400** — `src/flows/webhook-request.ts`: secreto vacío ⇒ no firmar y no emitir headers
  `X-Hito-*`; solo `Content-Type` + body. `signature`/`deliveryId`/`timestamp` opcionales en
  `WebhookRequest`.
- [ ] **T3401** — `src/features/flows/canvas/meta.ts`: `defaultOutput("webhook")` →
  `{ url:"", secret:"", payloadShape:"bare" }` (revierte el default envelope de 032 para nuevos; los
  guardados conservan el suyo).
- [ ] **T3402** — `src/features/flows/canvas/ActionConfigFields.tsx`: preset **Simple** / **Firmado**
  (deriva de `secret`+`payloadShape`); Simple oculta/limpia Secret, Firmado lo muestra con generador +
  link a la guía de verificación.
- [ ] **T3403** — Verificar `webhook-test.ts` y el replay de `DeliveryDetailDrawer` toleran ausencia de
  firma (secreto vacío).
- [ ] **T3404** — Tests `webhook-request.test.ts`: secreto vacío ⇒ sin `X-Hito-Signature`, body plano;
  con secreto ⇒ `verifyRaw` true (baseline 032); default `meta` = bare/sin secreto; retrocompat de un
  output con `payloadShape` persistido.

## Fase B — Suscripciones sin vault + arreglar desencriptado

- [ ] **T3410** — `src/storage/integration-db.ts`: `WebhookSubscription.encryptedSecret` →
  `secret?: string` + `needsReconnect?: boolean`; Dexie `this.version(3)` con el nuevo store.
- [ ] **T3411** — `migrateWebhookSubscriptionSecrets()` (arranque, tras restaurar el vault): descifra las
  suscripciones existentes a `secret` en claro si el vault está desbloqueado; si no, `needsReconnect:true`.
- [ ] **T3412** — `src/integrations/outbound/dispatcher.ts`: quitar `decrypt`; firmar solo si hay
  `secret` (con `signRaw`); si `needsReconnect`/falla, registrar `syncLogs` (033 A1) en vez de `continue`
  mudo.
- [ ] **T3413** — `retry-engine.ts`: enviar `X-Hito-Signature` solo si la entrega la trae (webhook plano
  cuando no hay secreto).
- [ ] **T3414** — `src/features/integrations/WebhookSubscriptionDialog.tsx`: quitar el gate de vault y el
  `encrypt`; Secret editable/opcional con generador; preset Simple/Firmado; reingreso si `needsReconnect`.
- [ ] **T3415** — Tests `dispatcher.test.ts`: sin secreto ⇒ sin firma, se encola; con secreto ⇒ firma;
  `needsReconnect` ⇒ log de error, no silencio; migración cifrado→claro (con/sin vault).

## Fase C — Vista previa exacta del payload

- [ ] **T3420** — `ActionConfigFields` (webhook): encabezado "Esto es lo que recibirá Make/Zapier";
  reflejar modo (plano vs envelope + headers de firma); construir la vista desde `buildWebhookRequest`
  para fidelidad byte a byte.
- [ ] **T3421** — Smoke visual (sin tests nuevos obligatorios).

## Fase D — Guía Zapier/Make + prueba sin muestra

- [ ] **T3430** — `WebhookQuickstartGuide` (patrón `WebhookSignatureGuide`): pestañas Zapier/Make con los
  pasos (Catch Hook → URL → Hito Simple → Enviar prueba → mapear → opcional Firmado). Enlazada desde el
  drawer del webhook.
- [ ] **T3431** — `src/flows/webhook-test.ts`: si no hay muestra, usar un payload de ejemplo mínimo;
  habilitar "Enviar prueba" siempre (ConfirmDialog, envío real).
- [ ] **T3432** — `/docs`: sección/guía de primeros pasos Zapier/Make (o ampliar
  `conectar-make-zapier-n8n`, 032 §D). Confirmar sitemap.
- [ ] **T3433** — Tests `webhook-test.test.ts`: sin muestra usa el ejemplo; con muestra usa el registro.

## Fase E — Consolidar superficies (suscripciones → Flujos)

- [ ] **T3440** — Migrar cada `WebhookSubscription` a un `FlowRule` evento→webhook equivalente (patrón
  `migrateLegacyAutomations`, 019 §E); tests de equivalencia de disparo.
- [ ] **T3441** — Pestaña "Webhooks" de `IntegrationsPage`: asistente "webhook rápido" que crea el Flujo,
  o redirección a Flujos filtrado por outputs webhook.
- [ ] **T3442** — Deprecar `dispatcher.ts`/`outboundQueue`/`retry-engine` para webhooks una vez migrado
  (sin romper suscripciones activas hasta migrarlas).

## Cierre (por fase)

- [ ] **T34F** — `typecheck`+`lint`+`test`+`build` en verde con los tests de la fase; actualizar
  `spec.md → Progreso` (convención 018–033) y la memoria del proyecto.
