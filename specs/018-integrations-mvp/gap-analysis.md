# Gap Analysis — Spec 018 Implementación Actual

- **Fecha:** 2026-07-07
- **Spec de referencia:** [spec.md](./spec.md)
- **Estado:** Análisis completo

---

## 1. Resumen Ejecutivo

Se ha implementado aproximadamente el **15% del spec 018**. La implementación actual cubre la UI básica y la guía de configuración, pero **faltan todos los componentes de lógica de negocio**: vault de credenciales, polling, outbound dispatcher, retry engine, mapping engine, y el sistema de logs.

### Implementación actual vs Spec

| Componente | Spec | Implementado | Estado |
|---|---|---|---|
| Guía de Apps Script | §8.1 | ✅ `AppsScriptGuide.tsx` | Completo |
| Página de Integraciones (UI) | §10.1 | ✅ `IntegrationsPage.tsx` | Parcial (falta vault) |
| Editor visual de automatizaciones | N/A (bonus) | ✅ `AutomationsPage.tsx` | Completo |
| Rutas y navegación | §10 | ✅ | Completo |
| Vault de credenciales (AES-GCM) | §5 | ❌ | **Falta** |
| IndexedDB schema | §4.2, §9 | ❌ | **Falta** |
| Polling Manager | §6.1 | ❌ | **Falta** |
| HubSpot Poller | §6.2 | ❌ | **Falta** |
| Google Sheets Poller | §6.3 | ❌ | **Falta** |
| Mapping Engine | §6.4 | ❌ | **Falta** |
| Idempotencia | §11.3 | ❌ | **Falta** |
| Outbound Dispatcher | §7.1 | ❌ | **Falta** |
| HMAC Signing | §7.2 | ❌ | **Falta** |
| Retry Engine | §7.3 | ❌ | **Falta** |
| Email via Apps Script | §7.4 | ❌ | **Falta** |
| Diagnostics CORS | §8.2 | ❌ | **Falta** |
| Maintenance (rotación logs) | §9.3 | ❌ | **Falta** |
| UI de logs e historial | §10.3 | ❌ | **Falta** |
| UI de suscripciones webhook | §10.2 | ❌ | **Falta** |
| Tests unitarios | §16 | ❌ | **Falta** |

---

## 2. Componentes Faltantes — Detalle

### 2.1 Vault de Credenciales (CRÍTICO)

**Archivos faltantes:**
- `src/integrations/crypto.ts` — Encrypt/decrypt con AES-GCM + PBKDF2
- `src/integrations/vault.ts` — Zustand store para contraseña maestra en memoria
- `src/integrations/vault-auto-lock.ts` — Auto-lock tras 10 min de inactividad

**Impacto:** Sin vault, las API keys no se pueden guardar de forma segura. Es el bloque fundamental.

**Estimación:** 1 día

---

### 2.2 IndexedDB Schema (CRÍTICO)

**Archivos faltantes:**
- `src/storage/integration-db.ts` — Tablas para configs, subscriptions, logs, queue

**Tablas necesarias:**
- `integrationConfigs` — Credenciales encriptadas por provider
- `webhookSubscriptions` — URLs y eventos para outbound
- `syncLogs` — Historial de syncs inbound/outbound
- `outboundQueue` — Cola de deliveries pendientes con retry

**Impacto:** Sin esto, no hay persistencia de configuraciones ni logs.

**Estimación:** 0.5 días

---

### 2.3 Polling Manager + Handlers (ALTA PRIORIDAD)

**Archivos faltantes:**
- `src/integrations/polling/polling-manager.ts` — Intervalos, backoff, visibility-aware
- `src/integrations/polling/visibility-aware.ts` — Pausa/resumen al cambiar foco
- `src/integrations/inbound/hubspot-poller.ts` — Polling a HubSpot vía proxy
- `src/integrations/inbound/sheets-poller.ts` — Polling a Google Sheets vía gapi.js
- `src/integrations/inbound/idempotency.ts` — Deduplicación de eventos

**Impacto:** Sin polling, no hay sincronización inbound.

**Estimación:** 2 días

---

### 2.4 Mapping Engine (ALTA PRIORIDAD)

**Archivos faltantes:**
- `src/integrations/inbound/mapping-engine.ts` — Transformación de datos externos → modelo local

**Funcionalidad:**
- Mapeo visual de campos (UI)
- Transformaciones programáticas (JavaScript)
- Validaciones de datos entrantes

**Impacto:** Sin mapping, los datos de HubSpot/Sheets no se pueden convertir en tareas/personas locales.

**Estimación:** 1 día

---

### 2.5 Outbound Dispatcher + Retry (ALTA PRIORIDAD)

**Archivos faltantes:**
- `src/integrations/outbound/dispatcher.ts` — Escucha DomainEvents y dispara webhooks
- `src/integrations/outbound/signing.ts` — Firma HMAC-SHA256 de payloads
- `src/integrations/outbound/retry-engine.ts` — Backoff exponencial + cola persistente
- `src/integrations/outbound/email-via-apps-script.ts` — Envío de email vía proxy

**Impacto:** Sin outbound, no hay notificaciones a Zapier/Slack/Email.

**Estimación:** 1.5 días

---

### 2.6 Diagnostics + Maintenance (MEDIA PRIORIDAD)

**Archivos faltantes:**
- `src/integrations/diagnostics.ts` — Diagnóstico de conectividad CORS
- `src/integrations/maintenance.ts` — Rotación de logs (30 días / 5,000 registros)

**Impacto:** Sin diagnostics, el usuario no puede troubleshootear problemas de conexión.

**Estimación:** 0.5 días

---

### 2.7 UI de Logs y Suscripciones (MEDIA PRIORIDAD)

**Archivos faltantes:**
- `src/features/integrations/SyncLogsPage.tsx` — Historial de syncs inbound/outbound
- `src/features/integrations/DeliveryDetailDrawer.tsx` — Detalle de delivery con payload
- `src/features/integrations/WebhookSubscriptionDialog.tsx` — Crear/editar suscripciones
- `src/features/integrations/DiagnosticPanel.tsx` — Estado de conectividad por provider

**Impacto:** Sin UI de logs, el usuario no puede auditar ni debuggear integraciones.

**Estimación:** 1.5 días

---

### 2.8 Tests Unitarios (MEDIA PRIORIDAD)

**Archivos faltantes:**
- `src/integrations/crypto.test.ts`
- `src/integrations/vault.test.ts`
- `src/integrations/polling/polling-manager.test.ts`
- `src/integrations/inbound/mapping-engine.test.ts`
- `src/integrations/outbound/dispatcher.test.ts`
- `src/integrations/outbound/retry-engine.test.ts`
- `src/integrations/outbound/signing.test.ts`

**Impacto:** Sin tests, no hay garantía de correctness.

**Estimación:** 1 día

---

## 3. Componente Adicional Requerido: Integration Flow Builder

El usuario solicita un **gestor visual de integraciones** con las siguientes capacidades:

### 3.1 Requerimientos

1. **Editor visual de mappings** — Definir qué campo del proveedor externo mapea a qué campo local
2. **Editor de código JavaScript** — Escribir validaciones y transformaciones personalizadas
3. **Sandbox de pruebas** — Probar la integración con datos de ejemplo antes de activar
4. **Preview de datos transformados** — Ver el resultado de la transformación en tiempo real
5. **Definir acciones** — Qué hacer con los datos recibidos (crear tarea, actualizar persona, etc.)

### 3.2 Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│  Integration Flow Builder                                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─ Provider Config ─────────────────────────────────────┐  │
│  │  HubSpot / Google Sheets / Custom Webhook              │  │
│  │  [Credentials] [Proxy URL] [Test Connection]           │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ↓                                     │
│  ┌─ Data Source ───────────────────────────────────────────┐  │
│  │  Endpoint: /crm/v3/objects/contacts                      │  │
│  │  Range: Tasks!A2:F (para Sheets)                         │  │
│  │  [Fetch Sample Data]                                     │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ↓                                     │
│  ┌─ Mapping Editor (Visual) ──────────────────────────────┐  │
│  │  Source Field          →    Target Field                 │  │
│  │  ─────────────────────────────────────────────────────   │  │
│  │  properties.email      →    person.email                 │  │
│  │  properties.firstname  →    person.name                  │  │
│  │  properties.company    →    person.roleTitle             │  │
│  │  [+ Add Mapping]                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ↓                                     │
│  ┌─ Validation & Transform (Code Editor) ─────────────────┐  │
│  │  // JavaScript sandbox                                   │  │
│  │  function transform(record) {                           │  │
│  │    // Validate                                           │  │
│  │    if (!record.email) return null; // skip              │  │
│  │                                                          │  │
│  │    // Transform                                          │  │
│  │    return {                                             │  │
│  │      email: record.email.toLowerCase(),                 │  │
│  │      name: `${record.firstname} ${record.lastname}`,    │  │
│  │      roleTitle: record.company ?? "Unknown"             │  │
│  │    };                                                   │  │
│  │  }                                                      │  │
│  │                                                          │  │
│  │  [Run Test] [Validate Syntax]                           │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ↓                                     │
│  ┌─ Action Definition ────────────────────────────────────┐  │
│  │  For each valid record:                                 │  │
│  │  [▼ Create/Update Person]                               │  │
│  │  Match by: [▼ email]                                    │  │
│  │  If not found: [▼ Create new]                           │  │
│  └────────────────────────────────────────────────────────┘  │
│                          ↓                                     │
│  ┌─ Test Sandbox ─────────────────────────────────────────┐  │
│  │  Input (sample):                                        │  │
│  │  { "properties": { "email": "test@example.com", ... }} │  │
│  │                                                          │  │
│  │  Output (after transform):                              │  │
│  │  { "email": "test@example.com", "name": "John Doe" }   │  │
│  │                                                          │  │
│  │  [Run with Sample Data] [Fetch Live Sample]             │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  [Save Integration] [Activate] [Cancel]                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Implementación Propuesta

**Componentes:**
- `IntegrationFlowBuilder.tsx` — Contenedor principal con stepper
- `ProviderConfigStep.tsx` — Configuración de credenciales y proxy
- `DataSourceStep.tsx` — Definir endpoint/rango y fetch sample data
- `MappingEditorStep.tsx` — Editor visual de mappings (drag & drop)
- `CodeEditorStep.tsx` — Editor de JavaScript para validaciones/transformaciones
- `ActionDefinitionStep.tsx` — Definir qué hacer con los datos
- `TestSandboxStep.tsx` — Probar integración con datos de ejemplo

**Librerías:**
- `@monaco-editor/react` — Editor de código con syntax highlighting (alternativa: `react-simple-code-editor`)
- `@dnd-kit/core` — Drag & drop para mappings (ya está en el proyecto)

**Seguridad:**
- El código JavaScript se ejecuta en un sandbox con `Function()` constructor
- No tiene acceso a `window`, `document`, ni APIs del navegador
- Timeout de ejecución: 1 segundo
- Solo puede transformar datos, no hacer I/O

---

## 4. Plan de Implementación Actualizado

### Wave 1 — Infraestructura Base (2 días)

1. Vault de credenciales (crypto + vault + auto-lock)
2. IndexedDB schema (integration-db)
3. UI de vault setup (contraseña maestra)

### Wave 2 — Inbound Polling (2.5 días)

4. Polling Manager + visibility-aware
5. HubSpot poller (vía proxy)
6. Google Sheets poller (vía gapi.js)
7. Idempotencia

### Wave 3 — Mapping Engine + Flow Builder (3 días)

8. Mapping Engine (lógica)
9. Integration Flow Builder (UI)
10. Editor de código JavaScript (Monaco o simple)
11. Sandbox de pruebas

### Wave 4 — Outbound Dispatcher (2 días)

12. Outbound Dispatcher
13. HMAC Signing
14. Retry Engine
15. Email via Apps Script

### Wave 5 — UI de Logs y Suscripciones (1.5 días)

16. SyncLogsPage
17. WebhookSubscriptionDialog
18. DeliveryDetailDrawer
19. DiagnosticPanel

### Wave 6 — Maintenance + Tests (1 día)

20. Maintenance (rotación de logs)
21. Tests unitarios

**Total estimado:** 12 días

---

## 5. Recomendaciones

### 5.1 Priorización

1. **Wave 1 + 2 primero** — Sin vault y polling, no hay integraciones funcionales.
2. **Wave 3 (Flow Builder) segundo** — Es el diferenciador clave y permite al usuario configurar mappings sin tocar código.
3. **Wave 4 + 5 después** — Outbound es importante pero menos crítico que inbound para el MVP.
4. **Wave 6 al final** — Maintenance y tests son importantes pero no bloquean el lanzamiento.

### 5.2 Decisiones Técnicas

1. **Editor de código:** Usar `react-simple-code-editor` en lugar de Monaco para mantener el bundle size bajo (~5KB vs ~2MB).
2. **Sandbox de JavaScript:** Usar `Function()` constructor con timeout de 1s. No usar `eval()` por seguridad.
3. **Mapping visual:** Implementar con drag & drop nativo (ya tenemos `@dnd-kit` en el proyecto).
4. **Dexie.js:** No adoptar por ahora. El wrapper actual de IndexedDB es suficiente para el MVP.

### 5.3 Riesgos

1. **CORS en HubSpot:** El proxy de Apps Script es la única vía viable. Si Google cambia las políticas, habría que migrar a Cloudflare Workers.
2. **Rate limiting:** HubSpot limita a 10 req/second. El polling cada 5 min es conservador, pero si el usuario tiene muchos contactos, podría necesitar paginación.
3. **Seguridad del sandbox de JavaScript:** Aunque usamos `Function()` sin acceso a `window`, un usuario malintencionado podría escribir código malicioso. Mitigar con timeout y captura de errores.

---

## 6. Conclusión

La implementación actual del spec 018 está en **~15%**. Los componentes de UI están listos, pero falta toda la lógica de negocio (vault, polling, mapping, outbound, retry, logs).

Se recomienda implementar en el orden propuesto (Waves 1-6) para tener un MVP funcional en **12 días**. El Integration Flow Builder es el componente más complejo y diferenciador, y debe recibir atención especial en la Wave 3.
