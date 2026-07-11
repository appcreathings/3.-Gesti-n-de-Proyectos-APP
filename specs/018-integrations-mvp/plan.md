# Plan de Implementación — 018-integrations-mvp

- **Spec:** [spec.md](./spec.md)
- **Estado:** El backend (`src/integrations/`, 15 archivos) y la mitad de la UI ya están construidos. Este plan ya no es un diseño *green-field* de 3 waves — es el plan del **trabajo restante** para cablear lo existente, completar la UI y añadir tests.
- **Estimación del trabajo restante:** 5-7 días de desarrollo (3 waves de cableado/UI/tests, no de construcción de backend)
- **Dependencias externas:** Ninguna (todo client-side)

---

## Estado actual (verificado contra el código, 2026-07-07)

### Backend `src/integrations/` + `src/storage/integration-db.ts`

| Archivo | Estado |
|---|---|
| `crypto.ts` | ✅ Completo |
| `vault.ts` | ✅ Completo |
| `vault-auto-lock.ts` | ✅ Completo — no inicializado |
| `polling/polling-manager.ts` | ✅ Completo — sin providers registrados |
| `polling/visibility-aware.ts` | ✅ Completo — no inicializado |
| `inbound/hubspot-poller.ts` | ⚠️ `executeMappingAction()` es un stub (`console.log`) |
| `inbound/sheets-poller.ts` | ✅ Completo — no invocado |
| `inbound/mapping-engine.ts` | ✅ Completo |
| `inbound/idempotency.ts` | ✅ Completo |
| `outbound/dispatcher.ts` | ✅ Completo — nunca invocado |
| `outbound/signing.ts` | ✅ Completo |
| `outbound/retry-engine.ts` | ✅ Completo — `startOutboundProcessor()` nunca se llama |
| `outbound/email-via-apps-script.ts` | ✅ Completo |
| `diagnostics.ts` | ✅ Completo — sin UI que lo use |
| `maintenance.ts` | ✅ Completo — `runMaintenance()` nunca se llama |
| `storage/integration-db.ts` (Dexie) | ✅ Completo (4 tablas, índices correctos) |

**Ningún archivo backend tiene tests.**

### UI `src/features/integrations/`

| Archivo | Estado |
|---|---|
| `IntegrationsPage.tsx` (ruta `/app/integrations`) | ⚠️ Mockup — `useState` local, sin persistencia real |
| `IntegrationFlowBuilder.tsx` + 6 `components/*Step.tsx` (ruta `/app/integrations/new`) | ⚠️ Sandbox de prueba funcional, **no persiste el flujo diseñado** |
| `SyncLogsPage.tsx` (ruta `/app/integrations/logs`) | ✅ Wired de verdad a `integrationDb.syncLogs` |
| `DeliveryDetailDrawer.tsx` | ✅ Wired, usado desde `SyncLogsPage` |

Las tres rutas ya están registradas en `src/App.tsx` (no hace falta añadir ninguna, salvo que Wave B decida añadir una ruta de gestión de webhooks separada).

---

## Wave A — Cableado crítico (1.5-2 días)

**Objetivo:** que lo ya construido empiece a ejecutarse. Sin esta wave, nada de lo implementado tiene efecto observable en la app, sin importar qué haga la UI.

### Fases

| # | Fase | Entregable |
|---|---|---|
| A.1 | Hook de outbound en el store | En `src/store/useDataStore.ts`, dentro de `runAutomations()` (línea ~409, tras `runEngine(...)` en línea 412), invocar `dispatchOutboundEvents(events, workspaceOrg)`. No debe bloquear ni fallar el flujo de guardado si el dispatch lanza (usar try/catch, log de error). |
| A.2 | Bootstrap de procesos de fondo | En `src/App.tsx` (o un nuevo `src/integrations/bootstrap.ts` importado desde ahí), en un `useEffect` post-hydrate: `initVaultAutoLock()`, `initVisibilityAwarePolling()`, `startOutboundProcessor()`, `runMaintenance()` (una vez por sesión). Registrar providers en `pollingManager` solo si hay `integrationConfigs` con `enabled: true` en Dexie. Cleanup en unmount. |
| A.3 | Conectar `executeMappingAction` a mutaciones reales | En `hubspot-poller.ts` (y por extensión `sheets-poller.ts`), reemplazar el stub `console.log` por llamadas reales a `useDataStore` (`upsertPerson`/`upsertTask` según el tipo de `MappingAction`). Definir estas funciones de upsert si no existen ya en `useDataStore.ts` con esa semántica exacta. |
| A.4 | Decisión de `SCHEMA_VERSION` | Confirmar si Wave A/B tocan `Project`/`Task` schema (p.ej. para marcar origen de integración en una tarea creada por HubSpot). Si sí: bump 7→8 + entrada en `src/domain/migrations.ts` (aditiva, no destructiva). Si no: no tocar `SCHEMA_VERSION` — las integraciones viven enteramente en Dexie, fuera del esquema de dominio versionado. |

### Criterio de salida de Wave A
- Al completar una tarea o cambiar el estado de un proyecto, si hay una suscripción de webhook activa que escuche ese evento, se ve una entrada nueva en `integrationDb.syncLogs` (verificable con `SyncLogsPage`, que ya funciona).
- Al abrir la app con una integración `enabled` en Dexie, el polling arranca solo (verificable viendo el intervalo disparar `pollHubSpot`/`pollGoogleSheets` en devtools/network).
- Un contacto de HubSpot recibido por polling termina como una `Person` real en el store, no solo en la consola.

---

## Wave B — UI funcional (2-3 días)

**Objetivo:** que un usuario pueda configurar una integración desde `IntegrationsPage`/`IntegrationFlowBuilder` y que quede activa de verdad — cerrando el gap entre "se ve bien" y "hace algo".

### Fases

| # | Fase | Entregable |
|---|---|---|
| B.1 | `IntegrationsPage` — persistencia real de HubSpot/Sheets/Email | Reemplazar el `useState` local por lectura/escritura en `integrationDb.integrationConfigs`, encriptando `accessToken`/credenciales con `useVaultStore.encrypt()` antes de guardar. Si el vault está bloqueado o sin contraseña maestra, mostrar el flujo de `setupMasterPassword`/`unlock` antes de permitir guardar. |
| B.2 | `IntegrationsPage` — tab Webhooks con CRUD real | Usar `getWebhookSubscriptions/createWebhookSubscription/updateWebhookSubscription/deleteWebhookSubscription` (ya expuestos por `dispatcher.ts`) en vez del estado vacío estático. Formulario de nueva suscripción: nombre, URL, checkboxes de eventos, secret auto-generado (`crypto.randomUUID()`) y encriptado con el vault antes de guardar como `encryptedSecret`. |
| B.3 | Estado de sync real | Sustituir "Última sync: hace 3 min (12 registros)" por una lectura real del último `syncLogs` por provider (`integrationDb.syncLogs.where("provider").equals(...).last()`). |
| B.4 | Diagnóstico CORS en UI | Invocar `diagnoseIntegration(provider)` (ya implementado) desde el botón "Probar conexión" de cada tab, mostrando el estado real (`ok/cors-error/auth-error/timeout`) en vez del booleano simplificado actual. |
| B.5 | Decisión sobre `IntegrationFlowBuilder` | Definir si el resultado del wizard (`IntegrationFlow`) se persiste como un `IntegrationConfig` de tipo `"custom"` + se registra en `pollingManager`, o si se documenta como herramienta de diseño/prueba únicamente (sin persistencia) hasta una fase posterior. Si se decide persistir: añadir el `handleFinish`/guardado al último step (`TestSandboxStep`) y la lectura de vuelta en `IntegrationsPage`. |

### Criterio de salida de Wave B
- Cerrar y reabrir la app conserva la configuración de HubSpot/Sheets/Email/Webhooks (persistida en Dexie, no en memoria de React).
- Se puede crear, editar y eliminar una suscripción de webhook desde la UI sin tocar la consola del navegador.
- El estado de "última sync" y el diagnóstico CORS reflejan datos reales, no texto fijo.

---

## Wave C — Tests + hardening (1.5-2 días)

**Objetivo:** cobertura mínima de la lógica más sensible (cripto, firmas, reintentos) antes de considerar el módulo production-ready, más verificación de que no hay fugas de credenciales en logs.

### Fases

| # | Fase | Entregable |
|---|---|---|
| C.1 | Tests de `crypto.ts` | Roundtrip `encryptPayload`/`decryptPayload` y `encryptWithKey`/`decryptWithKey`; passphrase incorrecta lanza; mismo payload con IV distinto produce ciphertext distinto. |
| C.2 | Tests de `vault.ts` | `setupMasterPassword` → `encrypt` → `lock` → `unlock` → `decrypt` roundtrip; `unlock` con passphrase incorrecta devuelve `false`; `lock()` nullifica `_masterKey`. |
| C.3 | Tests de `signing.ts` | Firma conocida con secret y payload fijos (vector de prueba); payload distinto → firma distinta; `verifyPayloadSignature` acepta firma válida y rechaza alterada. |
| C.4 | Tests de `retry-engine.ts` | `calculateRetryDelay` (backoff exponencial + jitter dentro de rango esperado); 4xx no reintenta (delivery se borra); 5xx reintenta con backoff; al superar `maxRetries` se marca/borra con log de error. |
| C.5 | Tests de `dispatcher.ts` | Matching de suscripciones por `event.type`; suscripciones deshabilitadas no reciben eventos; fallo al desencriptar un secret no detiene el resto de suscripciones. |
| C.6 | Tests de `mapping-engine.ts` e `idempotency.ts` | Transformación de un contacto HubSpot de ejemplo → `MappingAction` esperado; `idempotencyCheck` descarta un `eventId` repetido y acepta uno nuevo. |
| C.7 | Auditoría de logs | Confirmar que `requestPayload`/`responsePayload` en `syncLogs` no incluyen tokens/API keys en texto plano (enmascarar si es necesario en los pollers/dispatcher). |
| C.8 | Verificación final | `npm run typecheck`, `npm run lint`, `npm run test` sin errores. |

### Criterio de salida de Wave C
- Suite de tests unitarios pasando para los 6 módulos listados.
- Ningún secreto en texto plano en `syncLogs`.
- Build limpio (typecheck + lint + test).

---

## Resumen de Entregables por Archivo

```
src/integrations/
  crypto.ts                          ✅ existe, ⬜ tests (Wave C.1)
  vault.ts                           ✅ existe, ⬜ tests (Wave C.2)
  vault-auto-lock.ts                 ✅ existe, ⬜ inicializar (Wave A.2)
  diagnostics.ts                     ✅ existe, ⬜ usar desde UI (Wave B.4)
  maintenance.ts                     ✅ existe, ⬜ inicializar (Wave A.2)
  polling/
    polling-manager.ts               ✅ existe, ⬜ registrar providers (Wave A.2)
    visibility-aware.ts              ✅ existe, ⬜ inicializar (Wave A.2)
  inbound/
    hubspot-poller.ts                ⚠️ existe, ⬜ conectar executeMappingAction (Wave A.3)
    sheets-poller.ts                 ✅ existe, ⬜ invocar desde polling-manager (Wave A.2)
    mapping-engine.ts                ✅ existe, ⬜ tests (Wave C.6)
    idempotency.ts                   ✅ existe, ⬜ tests (Wave C.6)
  outbound/
    dispatcher.ts                    ✅ existe, ⬜ invocar desde useDataStore (Wave A.1), ⬜ tests (Wave C.5)
    signing.ts                       ✅ existe, ⬜ tests (Wave C.3)
    retry-engine.ts                  ✅ existe, ⬜ inicializar (Wave A.2), ⬜ tests (Wave C.4)
    email-via-apps-script.ts         ✅ existe

src/storage/
  integration-db.ts                  ✅ existe (Dexie, 4 tablas)

src/store/
  useDataStore.ts                    ⬜ hook dispatchOutboundEvents en runAutomations (Wave A.1), ⬜ upsertPerson/upsertTask desde poller (Wave A.3)

src/App.tsx / src/main.tsx
                                      ⬜ bootstrap de procesos de fondo (Wave A.2)

src/features/integrations/
  IntegrationsPage.tsx               ⚠️ mockup, ⬜ persistencia real (Wave B.1-B.4)
  IntegrationFlowBuilder.tsx         ⚠️ sandbox sin persistencia, ⬜ decisión + implementación (Wave B.5)
  components/*Step.tsx (x6)          ✅ existen, sin cambios previstos
  SyncLogsPage.tsx                   ✅ funcional
  DeliveryDetailDrawer.tsx           ✅ funcional
```

---

## Dependencias y Orden de Ejecución

```
Wave A (crítico) ────────────────────────────────────────────▶
  A.1 (hook dispatch) ─┐
  A.2 (bootstrap)      ├──▶ A.3 (mapping → domino real) ──▶ A.4 (decisión schema version)
                       ┘

Wave B (depende de A.1/A.2 para tener algo que persistir y ver funcionar) ─▶
  B.1 → B.2 (paralelo con B.1) → B.3, B.4 (paralelo) → B.5

Wave C (depende de que el código de A/B esté estable para no re-escribir tests) ─▶
  C.1, C.2, C.3 (paralelo) → C.4, C.5, C.6 (paralelo) → C.7 → C.8
```

**Dependencias críticas:**
- Wave B depende de Wave A: no tiene sentido construir persistencia de configuración si nada la consume (polling/outbound apagados).
- Wave C puede empezar en paralelo a Wave B para los módulos ya estables de Wave A (crypto, vault, signing, retry-engine no cambian en Wave B), pero los tests de `dispatcher`/`mapping-engine` deben esperar a que A.1/A.3 fijen su forma final de invocación.
