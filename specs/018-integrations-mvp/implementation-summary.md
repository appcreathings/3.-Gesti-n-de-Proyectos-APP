# Estado de Implementación — 018-integrations-mvp

- **Fecha de esta revisión:** 2026-07-07
- **Estado:** Backend construido (15/15 archivos), UI parcialmente construida (2/4 piezas funcionales), **sin cableado entre ambos**, sin tests.

> Este documento reemplaza una versión anterior que describía la implementación como "~25% del spec, falta la lógica de negocio (vault, polling, outbound, retry, logs)". Esa descripción **ya no es correcta**: toda esa lógica de negocio existe y está bien construida. Lo que falta es distinto — y más específico — de lo que decía esa versión. Ver §3 para el detalle exacto.

---

## 1. Qué existe hoy (verificado archivo por archivo)

### 1.1 Backend — `src/integrations/` (15 archivos) + `src/storage/integration-db.ts`

Todos los módulos descritos en el diseño original ([spec.md](./spec.md)) están escritos:

- **Cripto:** [`crypto.ts`](../../src/integrations/crypto.ts) — AES-GCM 256-bit + PBKDF2 (600k iteraciones), con variantes self-contained (`encryptPayload`/`decryptPayload`) y con key reutilizable (`encryptWithKey`/`decryptWithKey`).
- **Vault:** [`vault.ts`](../../src/integrations/vault.ts) — `useVaultStore` (Zustand): `setupMasterPassword`, `unlock`, `lock`, `encrypt`, `decrypt`. Salt en `localStorage`, key solo en memoria. Más [`vault-auto-lock.ts`](../../src/integrations/vault-auto-lock.ts) para el auto-bloqueo por inactividad.
- **Polling:** [`polling/polling-manager.ts`](../../src/integrations/polling/polling-manager.ts) (backoff exponencial, techo 30min) y [`polling/visibility-aware.ts`](../../src/integrations/polling/visibility-aware.ts) (pausa/resume por visibilidad de pestaña).
- **Inbound:** [`inbound/hubspot-poller.ts`](../../src/integrations/inbound/hubspot-poller.ts), [`inbound/sheets-poller.ts`](../../src/integrations/inbound/sheets-poller.ts), [`inbound/mapping-engine.ts`](../../src/integrations/inbound/mapping-engine.ts), [`inbound/idempotency.ts`](../../src/integrations/inbound/idempotency.ts).
- **Outbound:** [`outbound/dispatcher.ts`](../../src/integrations/outbound/dispatcher.ts) (incluye CRUD de suscripciones), [`outbound/signing.ts`](../../src/integrations/outbound/signing.ts) (HMAC-SHA256), [`outbound/retry-engine.ts`](../../src/integrations/outbound/retry-engine.ts) (backoff + procesador de cola cada 30s), [`outbound/email-via-apps-script.ts`](../../src/integrations/outbound/email-via-apps-script.ts).
- **Operación:** [`diagnostics.ts`](../../src/integrations/diagnostics.ts) (diagnóstico CORS), [`maintenance.ts`](../../src/integrations/maintenance.ts) (rotación de logs y cola muerta).
- **Persistencia:** [`src/storage/integration-db.ts`](../../src/storage/integration-db.ts) — Dexie, DB `hito-integrations`, 4 tablas (`integrationConfigs`, `webhookSubscriptions`, `syncLogs`, `outboundQueue`) con índices correctos.

### 1.2 UI — `src/features/integrations/` (11 archivos)

- **`IntegrationsPage.tsx`** (ruta `/app/integrations`) — hub con tabs HubSpot / Google Sheets / Webhooks / Email. Visualmente completo, pero **presentacional**: estado en `useState` local, sin lectura/escritura en `integrationDb` ni en el vault.
- **`IntegrationFlowBuilder.tsx`** + 6 steps en `components/` (ruta `/app/integrations/new`) — wizard de 6 pasos con sandbox de prueba de mapeos **funcional** (ejecuta transform + acción contra datos de ejemplo), pero **no persiste el resultado** en ningún lado al terminar.
- **`SyncLogsPage.tsx`** + **`DeliveryDetailDrawer.tsx`** (ruta `/app/integrations/logs`) — **completamente funcional**, lee de verdad `integrationDb.syncLogs`.

Las tres rutas ya están registradas en `src/App.tsx`, con entrada de navegación en el sidebar.

---

## 2. Dependencias instaladas

```json
{
  "dexie": "...",
  "react-simple-code-editor": "^0.14.1",
  "prismjs": "^1.29.0",
  "@types/prismjs": "^1.26.5"
}
```

`dexie` no estaba prevista en el diseño original como dependencia definitiva (se planteaba como opcional); ya se adoptó y se ratifica en el spec revisado. `gapi-script` (para Google Sheets) no se ha añadido — `sheets-poller.ts` asume que `gapi` se carga globalmente vía script tag.

---

## 3. Los 4 gaps reales (el foco de lo que falta)

A diferencia de "falta el backend", el estado real es que **el backend existe pero está desconectado**:

1. **Nada dispara los webhooks de salida.** `dispatchOutboundEvents()` existe y es correcto, pero no hay ninguna llamada a él desde `src/store/useDataStore.ts` (donde ya se generan los `DomainEvent[]` vía `diffProjectEvents`). Verificado con grep: cero referencias a `dispatchOutboundEvents` fuera de su propio archivo y de la UI.
2. **Nada se inicializa al arrancar la app.** `src/main.tsx` y `src/App.tsx` no invocan `initVaultAutoLock`, `pollingManager.register(...)`, `startOutboundProcessor`, ni `runMaintenance`. El código de fondo existe pero nunca arranca.
3. **La UI no persiste nada real.** `IntegrationsPage` es un mockup interactivo; `IntegrationFlowBuilder` es un sandbox de pruebas sin guardado. Hoy no hay ningún camino de "el usuario configura algo → queda guardado y activo".
4. **El mapeo de HubSpot no llega al dominio.** `executeMappingAction()` en `hubspot-poller.ts` es literalmente:
   ```typescript
   async function executeMappingAction(action) {
     console.log("[HubSpot Poller] Executing action:", action.type, action.data);
   }
   ```
   Incluso si el polling estuviera activo, ningún contacto de HubSpot se convierte en una `Person` o `Task` real.

Ninguno de estos 4 gaps requiere reescribir el backend — son puntos de conexión puntuales. Ver [plan.md](./plan.md) (Wave A) para el detalle exacto de cada fix.

---

## 4. Próximos pasos

Ver [plan.md](./plan.md) para el detalle completo. Resumen:

- **Wave A — Cableado crítico (1.5-2 días):** conectar `dispatchOutboundEvents`, inicializar los procesos de fondo, conectar `executeMappingAction` a mutaciones reales, decidir sobre `SCHEMA_VERSION`.
- **Wave B — UI funcional (2-3 días):** persistencia real en `IntegrationsPage` (configs + webhooks), estado de sync real, diagnóstico CORS visible, decisión sobre persistencia del `IntegrationFlowBuilder`.
- **Wave C — Tests + hardening (1.5-2 días):** tests unitarios de crypto/vault/signing/retry-engine/dispatcher/mapping-engine/idempotency, auditoría de que no haya secretos en `syncLogs`, verificación final de typecheck/lint/test.

**Tiempo estimado para completar el MVP:** 5-7 días — significativamente menos que la estimación anterior (10 días), porque el trabajo que falta es cableado y UI, no construcción de backend desde cero.
