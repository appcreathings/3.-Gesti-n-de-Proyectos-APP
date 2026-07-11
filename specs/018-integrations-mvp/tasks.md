# Tareas — 018-integrations-mvp

- **Spec:** [spec.md](./spec.md)
- **Plan:** [plan.md](./plan.md)

Este checklist ya no describe construcción desde cero: el backend (`src/integrations/`) y media UI ya existen. Las tareas marcadas `[x]` están hechas por el código actual (verificado archivo por archivo); las `[ ]` son el trabajo restante, agrupado por Wave A/B/C tal como en [plan.md](./plan.md).

---

## Backend ya construido (verificado, sin acción pendiente salvo lo anotado)

### Crypto — `src/integrations/crypto.ts`
- [x] `deriveKey()` con PBKDF2 (600,000 iteraciones, SHA-256)
- [x] `encryptPayload()`/`decryptPayload()` self-contained (deriva key desde passphrase)
- [x] `encryptWithKey()`/`decryptWithKey()` reutilizando una `CryptoKey` ya derivada
- [x] AES-GCM 256-bit + IV aleatorio por operación
- [ ] Tests (ver Wave C.1 en tasks de abajo)

### Vault — `src/integrations/vault.ts` + `vault-auto-lock.ts`
- [x] `useVaultStore` (Zustand): `_masterKey`, `_salt`, `isUnlocked`, `hasMasterPassword`
- [x] `setupMasterPassword(passphrase)`, `unlock(passphrase): Promise<boolean>`, `lock()`
- [x] `encrypt(data)`/`decrypt(enc)` usando la key en memoria
- [x] Salt persistido en `localStorage` (`hito:vault-salt`) — no encriptado, es público
- [x] Auto-lock a los 10 min de inactividad + `beforeunload` (`vault-auto-lock.ts`)
- [ ] Tests (Wave C.2)
- [ ] Inicializar `initVaultAutoLock()` al arrancar la app (Wave A.2)

### Persistencia — `src/storage/integration-db.ts`
- [x] Dexie DB `hito-integrations` con 4 tablas: `integrationConfigs`, `webhookSubscriptions`, `syncLogs`, `outboundQueue`
- [x] Índices: `provider`, `enabled`, `*events` (multiEntry), `[provider+status]`, `nextRetryAt`
- [x] `clearIntegrationDb()`
- [ ] Tests de CRUD/queries (opcional, no listado en Wave C — evaluar si hace falta más allá de los tests de los módulos que la consumen)

### Polling — `src/integrations/polling/`
- [x] `PollingManager`: `register(provider, config, handler)`, backoff exponencial, techo 30 min, recuperación tras éxito, `stopAll()`
- [x] `visibility-aware.ts`: pausa/resume por `visibilitychange`, poll inmediato al recuperar foco
- [ ] Registrar HubSpot y Google Sheets en `pollingManager` según `integrationConfigs.enabled` (Wave A.2)
- [ ] Inicializar `initVisibilityAwarePolling()` al arrancar (Wave A.2)
- [ ] Tests de polling-manager (backoff, intervalos) — no crítico para Wave C, evaluar si se añade

### Inbound — `src/integrations/inbound/`
- [x] `hubspot-poller.ts`: `pollHubSpot()`, contrato real del proxy (`POST { _hubspotToken, path, method }`), timeout 15s, idempotencia, log de sync
- [x] `sheets-poller.ts`: `pollGoogleSheets()` vía gapi.js
- [x] `mapping-engine.ts`: clase `MappingEngine`, `registerMapping()`/`transform()`, mapeo por defecto de HubSpot
- [x] `idempotency.ts`: `idempotencyCheck(eventId)`, cache FIFO + persistencia
- [ ] **`executeMappingAction()` en `hubspot-poller.ts` es un stub (`console.log`)** — conectar a `upsertPerson`/`upsertTask` reales de `useDataStore` (Wave A.3)
- [ ] Tests de `mapping-engine.ts` e `idempotency.ts` (Wave C.6)
- [ ] Tests de `hubspot-poller.ts` (mock fetch, éxito y error 429) — evaluar alcance en Wave C

### Outbound — `src/integrations/outbound/`
- [x] `dispatcher.ts`: `dispatchOutboundEvents(events, workspaceOrg)` — lee subscriptions de Dexie, desencripta secret vía vault, firma y encola
- [x] `dispatcher.ts`: CRUD de suscripciones (`get/create/update/deleteWebhookSubscription`)
- [x] `signing.ts`: `signPayload()`/`verifyPayloadSignature()` HMAC-SHA256
- [x] `retry-engine.ts`: `calculateRetryDelay()` (backoff base 1s ×2, techo 5min, jitter ±20%), `processOutboundQueue()` (4xx no reintenta, 5xx sí, máx 5 intentos), `startOutboundProcessor()`/`stopOutboundProcessor()` (cada 30s)
- [x] `email-via-apps-script.ts`: `sendEmailViaAppsScript()`
- [ ] **Invocar `dispatchOutboundEvents(events, workspaceOrg)` desde `runAutomations()` en `src/store/useDataStore.ts`** (Wave A.1)
- [ ] Inicializar `startOutboundProcessor()` al arrancar (Wave A.2)
- [ ] Tests de `signing.ts` (Wave C.3)
- [ ] Tests de `retry-engine.ts` (Wave C.4)
- [ ] Tests de `dispatcher.ts` (Wave C.5)

### Diagnóstico y mantenimiento
- [x] `diagnostics.ts`: `diagnoseIntegration(provider)` → `ok/cors-error/auth-error/timeout/unknown`
- [x] `maintenance.ts`: rotación de `syncLogs` (30 días / 5,000 registros), limpieza de `outboundQueue` muerta (7 días, 5 reintentos)
- [ ] Invocar `diagnoseIntegration()` desde el botón "Probar conexión" de `IntegrationsPage` (Wave B.4)
- [ ] Invocar `runMaintenance()` una vez por sesión al abrir la app (Wave A.2)

---

## UI ya construida (verificado)

### `IntegrationsPage.tsx` (ruta `/app/integrations`)
- [x] Tabs: HubSpot / Google Sheets / Webhooks / Email
- [x] Botón "Probar conexión" con `fetch` real al proxy (tab HubSpot)
- [x] `AppsScriptGuide` embebida (guía de proxy)
- [ ] Persistir credenciales/config en `integrationDb.integrationConfigs` encriptadas con el vault, en vez de `useState` local (Wave B.1)
- [ ] CRUD real de `webhookSubscriptions` en la tab Webhooks (Wave B.2)
- [ ] Estado de "última sync" leído de `syncLogs`, no hardcodeado (Wave B.3)
- [ ] Diagnóstico CORS real en vez de booleano simplificado (Wave B.4)

### `IntegrationFlowBuilder.tsx` + `components/*Step.tsx` (ruta `/app/integrations/new`)
- [x] `ProviderConfigStep`, `DataSourceStep`, `MappingEditorStep`, `CodeEditorStep`, `ActionDefinitionStep`, `TestSandboxStep`
- [x] Sandbox de prueba funcional (mapping → transform → acción, con `TestResult`)
- [ ] Decidir y, si aplica, implementar la persistencia del `IntegrationFlow` resultante (Wave B.5)

### `SyncLogsPage.tsx` + `DeliveryDetailDrawer.tsx` (ruta `/app/integrations/logs`)
- [x] Lectura real de `integrationDb.syncLogs.orderBy("createdAt").reverse()`
- [x] Filtros y drawer de detalle de delivery
- [x] Ruta registrada en `src/App.tsx`
- Sin tareas pendientes — funcionará en cuanto Wave A genere logs reales.

---

## Wave A — Cableado crítico

- [ ] **A.1** Invocar `dispatchOutboundEvents(events, workspaceOrg)` en `runAutomations()` de `src/store/useDataStore.ts` (tras `runEngine(...)`, ~línea 412), con try/catch que no bloquee el guardado.
- [ ] **A.2** Bootstrap en `src/App.tsx`/`src/main.tsx`: `initVaultAutoLock()`, `initVisibilityAwarePolling()`, `startOutboundProcessor()`, `runMaintenance()` (una vez por sesión), registro condicional de providers en `pollingManager` según `integrationConfigs.enabled`. Cleanup en unmount.
- [ ] **A.3** Reemplazar el stub `console.log` de `executeMappingAction()` en `hubspot-poller.ts` por `upsertPerson`/`upsertTask` reales contra `useDataStore` (crear estas acciones si no existen con esa semántica).
- [ ] **A.4** Decidir si Wave A/B requieren bump de `SCHEMA_VERSION` (7→8, con migración aditiva en `src/domain/migrations.ts`) — solo si se toca `Project`/`Task`; si las integraciones quedan enteramente en Dexie, no tocar.
- [ ] Typecheck + Lint tras Wave A

---

## Wave B — UI funcional

- [ ] **B.1** `IntegrationsPage`: persistencia real de HubSpot/Sheets/Email en `integrationDb.integrationConfigs`, encriptado con el vault; flujo de `setupMasterPassword`/`unlock` si el vault no está listo.
- [ ] **B.2** `IntegrationsPage` tab Webhooks: CRUD real vía `get/create/update/deleteWebhookSubscription`; formulario con checkboxes de eventos, secret auto-generado y encriptado.
- [ ] **B.3** Estado de "última sync" leído de `integrationDb.syncLogs` por provider.
- [ ] **B.4** Diagnóstico CORS real (`diagnoseIntegration`) en el botón "Probar conexión" de cada tab.
- [ ] **B.5** Decisión + implementación de persistencia del `IntegrationFlow` del wizard (o documentar explícitamente como herramienta de solo-diseño/prueba).
- [ ] Typecheck + Lint tras Wave B

---

## Wave C — Tests + hardening

- [ ] **C.1** Tests de `crypto.ts`: roundtrip encrypt/decrypt (ambas variantes), passphrase incorrecta lanza, IV distinto → ciphertext distinto.
- [ ] **C.2** Tests de `vault.ts`: `setupMasterPassword` → `encrypt` → `lock` → `unlock` → `decrypt` roundtrip; `unlock` con passphrase incorrecta → `false`; `lock()` nullifica `_masterKey`.
- [ ] **C.3** Tests de `signing.ts`: firma con vector conocido; payload distinto → firma distinta; `verifyPayloadSignature` acepta válida / rechaza alterada.
- [ ] **C.4** Tests de `retry-engine.ts`: cálculo de backoff; 4xx no reintenta; 5xx reintenta; máx reintentos → delivery se descarta con log.
- [ ] **C.5** Tests de `dispatcher.ts`: matching de suscripciones por evento; deshabilitadas no reciben; fallo al desencriptar un secret no detiene las demás.
- [ ] **C.6** Tests de `mapping-engine.ts` e `idempotency.ts`: transformación de contacto HubSpot de ejemplo; deduplicación de `eventId`.
- [ ] **C.7** Auditoría de `syncLogs`: confirmar que no hay tokens/API keys en texto plano en `requestPayload`/`responsePayload`; enmascarar si hace falta.
- [ ] **C.8** `npm run typecheck` + `npm run lint` + `npm run test` finales, sin errores.

---

## Integración Final (checklist de cierre, una vez completadas A/B/C)

- [x] Ruta `/app/integrations` al router
- [x] Ruta `/app/integrations/new` al router
- [x] Ruta `/app/integrations/logs` al router
- [x] Link en menú lateral ("Integraciones", icono Webhook)
- [ ] Inicializar polling manager al cargar app (si hay integraciones activas) — Wave A.2
- [ ] Inicializar outbound processor al cargar app — Wave A.2
- [ ] Inicializar auto-lock del vault — Wave A.2
- [ ] Inicializar mantenimiento al cargar app — Wave A.2
- [ ] `SCHEMA_VERSION` — decisión en A.4; aplicar solo si corresponde
- [ ] README de integraciones (guía de setup para usuarios) — pendiente, no iniciado
- [ ] Typecheck final: `npm run typecheck`
- [ ] Lint final: `npm run lint`
- [ ] Tests finales: `npm run test`
