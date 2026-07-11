# Especificación — Módulo de Integraciones y Automatizaciones (MVP Local-First)

- **Feature ID:** 018-integrations-mvp
- **Estado:** En implementación — backend construido, pendiente de cableado, UI parcial, sin tests
- **Fecha:** 2026-07-07 (revisión: re-baseline contra código real)
- **Principios afectados (constitución):** I (local-first), II (esquema como contrato), V (simplicidad), VI (migrabilidad)

---

## 0. Estado de implementación (resumen ejecutivo para quien retome este spec)

Este documento se escribió originalmente como diseño *green-field*. La implementación avanzó en paralelo y **diverge** de varias decisiones del diseño original. Esta revisión corrige el spec contra el código real (verificado archivo por archivo) y separa "ya construido" de "pendiente".

### 0.1 Qué existe y funciona

| Módulo | Archivo | Estado |
|---|---|---|
| Cripto (AES-GCM + PBKDF2) | [`src/integrations/crypto.ts`](../../src/integrations/crypto.ts) | ✅ Completo |
| Vault (Zustand) | [`src/integrations/vault.ts`](../../src/integrations/vault.ts) | ✅ Completo |
| Auto-lock del vault | [`src/integrations/vault-auto-lock.ts`](../../src/integrations/vault-auto-lock.ts) | ✅ Completo, **no inicializado** |
| Polling Manager | [`src/integrations/polling/polling-manager.ts`](../../src/integrations/polling/polling-manager.ts) | ✅ Completo, **no registra ningún provider** |
| Visibility-aware polling | [`src/integrations/polling/visibility-aware.ts`](../../src/integrations/polling/visibility-aware.ts) | ✅ Completo, **no inicializado** |
| HubSpot poller | [`src/integrations/inbound/hubspot-poller.ts`](../../src/integrations/inbound/hubspot-poller.ts) | ⚠️ Funcional pero `executeMappingAction()` es un stub (`console.log`, no persiste personas/tareas) |
| Google Sheets poller | [`src/integrations/inbound/sheets-poller.ts`](../../src/integrations/inbound/sheets-poller.ts) | ✅ Completo, no invocado desde ningún sitio |
| Mapping engine | [`src/integrations/inbound/mapping-engine.ts`](../../src/integrations/inbound/mapping-engine.ts) | ✅ Completo |
| Idempotencia | [`src/integrations/inbound/idempotency.ts`](../../src/integrations/inbound/idempotency.ts) | ✅ Completo |
| Outbound dispatcher | [`src/integrations/outbound/dispatcher.ts`](../../src/integrations/outbound/dispatcher.ts) | ✅ Completo, **nunca invocado desde el engine de automatizaciones** |
| Firma HMAC | [`src/integrations/outbound/signing.ts`](../../src/integrations/outbound/signing.ts) | ✅ Completo |
| Retry engine | [`src/integrations/outbound/retry-engine.ts`](../../src/integrations/outbound/retry-engine.ts) | ✅ Completo, **`startOutboundProcessor()` nunca se llama** |
| Email vía proxy | [`src/integrations/outbound/email-via-apps-script.ts`](../../src/integrations/outbound/email-via-apps-script.ts) | ✅ Completo |
| Diagnóstico CORS | [`src/integrations/diagnostics.ts`](../../src/integrations/diagnostics.ts) | ✅ Completo, sin UI que lo use |
| Mantenimiento/rotación | [`src/integrations/maintenance.ts`](../../src/integrations/maintenance.ts) | ✅ Completo, **`runMaintenance()` nunca se llama** |
| Persistencia (Dexie) | [`src/storage/integration-db.ts`](../../src/storage/integration-db.ts) | ✅ Completo — ver §4.1 (corrección de decisión de diseño) |
| Página de integraciones | [`src/features/integrations/IntegrationsPage.tsx`](../../src/features/integrations/IntegrationsPage.tsx) | ⚠️ **Mockup visual** — `useState` local, "Última sync: hace 3 min (12 registros)" hardcodeado, no lee/escribe en `integration-db` ni usa el vault |
| Flow Builder (wizard) | [`src/features/integrations/IntegrationFlowBuilder.tsx`](../../src/features/integrations/IntegrationFlowBuilder.tsx) + `components/*Step.tsx` | ⚠️ Sandbox de prueba funcional (mapeo + transform + test), pero **no persiste el flujo en ningún lado** — al terminar el wizard no se registra un poller ni una config real |
| Logs de sincronización | [`src/features/integrations/SyncLogsPage.tsx`](../../src/features/integrations/SyncLogsPage.tsx) + `DeliveryDetailDrawer.tsx` | ✅ Wired de verdad a `integrationDb.syncLogs`, con ruta activa |
| Rutas | `src/App.tsx` | `/app/integrations`, `/app/integrations/new`, `/app/integrations/logs` — **las tres existen**; no hay anidamiento bajo `/app/settings` |
| Tests | — | ❌ **Ninguno.** `src/integrations/**/*.test.ts` no existe |

### 0.2 Los 4 gaps reales que bloquean un MVP usable

1. **Nada dispara los webhooks de salida.** `dispatchOutboundEvents` existe y funciona pero no se invoca desde `runAutomations()` en `src/store/useDataStore.ts` (donde ya se calculan los `DomainEvent[]` vía `diffProjectEvents`). Cero webhooks salen jamás, pase lo que pase en la app.
2. **Nada se inicializa al arrancar la app.** `initVaultAutoLock`, `pollingManager`, `startOutboundProcessor`, `runMaintenance` no aparecen ni en `src/main.tsx` ni en `src/App.tsx`. Aunque el usuario configure todo perfectamente, no hay proceso de fondo corriendo.
3. **La UI de configuración no persiste nada real.** `IntegrationsPage` es un mockup con estado local; el `IntegrationFlowBuilder` es un sandbox de pruebas que nunca escribe una config activa. No existe hoy un camino de "usuario configura HubSpot → queda guardado y pollando".
4. **El mapeo de HubSpot no llega a los datos.** Incluso si el polling se activara, `executeMappingAction()` en `hubspot-poller.ts` solo hace `console.log` — no crea/actualiza personas ni tareas.

El resto de este documento (arquitectura, seguridad, CORS, etc.) sigue siendo el diseño de referencia, corregido en los puntos donde el código ya tomó una decisión distinta (marcados inline). Ver [plan.md](./plan.md) para las Waves de trabajo restante y [tasks.md](./tasks.md) para el checklist.

---

## 1. Resumen Ejecutivo

Se especifica el MVP del módulo de integraciones para **Hito**, manteniendo el compromiso **100% client-side / sin infraestructura propia** que define la constitución del proyecto. La app se conecta con **HubSpot** y **Google Sheets** (entrada) y envía datos a **Zapier / Make** y **correo electrónico** (salida), todo mediante llamadas directas desde el navegador.

### 1.1 Restricción fundamental: CORS

Antes de diseñar, debemos ser honestos sobre una limitación técnica real del modelo browser-to-cloud:

| API destino | ¿Permite CORS desde browser? | Veredicto MVP |
|---|---|---|
| **Zapier / Make Webhooks** | ✅ Sí, sin restricciones | Funciona nativamente |
| **Google Sheets** (Google API v4) | ✅ Sí, vía `gapi.js` + OAuth | Funciona con Google Identity Services |
| **HubSpot CRM API** | ❌ No expone headers CORS para origins arbitrarios | **Requiere estrategia alternativa** |
| **Resend API** | ❌ Bloquea browser origins | **Requiere estrategia alternativa** |
| **SendGrid API** | ❌ Bloquea browser origins | **Requiere estrategia alternativa** |

**Implicación:** Para HubSpot y servicios de email, el usuario necesitará una de estas opciones (ordenadas por preferencia):

1. **Google Apps Script Web App** como proxy gratuito del usuario (recomendado para HubSpot y email).
2. **Cloudflare Worker** del propio usuario (gratis, 100k req/día, deploy en 2 min).
3. **Extensión de navegador** que desactive CORS (solo desarrollo, no producción).

El spec documenta ambas vías y deja la decisión al usuario final. Esta parte del análisis se mantiene sin cambios — sigue siendo correcta y es la base del contrato de proxy que el código ya implementa (ver §6.2).

---

## 2. Objetivos y Casos de Uso

### 2.1 Integraciones de Entrada (Inbound)

| ID | Caso de uso | Fuente | Mecanismo |
|---|---|---|---|
| IN-01 | Importar contactos/deals desde HubSpot | HubSpot CRM | Polling con API key del usuario |
| IN-02 | Sincronizar datos desde una hoja de cálculo | Google Sheets | Polling con OAuth del usuario |
| IN-03 | Detectar cambios incrementales | HubSpot / Sheets | Timestamp-based delta polling |

### 2.2 Integraciones de Salida (Outbound)

| ID | Caso de uso | Destino | Mecanismo |
|---|---|---|---|
| OUT-01 | Notificar tarea completada | Zapier / Make | POST directo a webhook URL |
| OUT-02 | Notificar cambio de estado de proyecto | Zapier / Make | POST directo a webhook URL |
| OUT-03 | Notificar nuevo comentario | Zapier / Make | POST directo a webhook URL |
| OUT-04 | Enviar email de notificación | Email (vía proxy) | POST a Apps Script / Worker del usuario |
| OUT-05 | Webhook genérico personalizado | Cualquier URL | POST con firma HMAC |

### 2.3 Fuera de scope para MVP

- Webhooks entrantes pasivos (requerirían servidor).
- OAuth server-side flows.
- Integración bidireccional en tiempo real.
- Marketplace de integraciones pre-construidas.

---

## 3. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NAVEGADOR DEL USUARIO                         │
│                                                                       │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────────────┐   │
│  │  React UI │──▶│ Zustand Store│──▶│  Integration Engine         │   │
│  │ (Settings │   │  (sync state)│   │                            │   │
│  │  & Views) │   └──────────────┘   │  ┌─────────┐ ┌──────────┐ │   │
│  └──────────┘                       │  │ Polling  │ │ Outbound │ │   │
│                                      │  │ Manager  │ │ Dispatcher│ │   │
│  ┌──────────────────────────────┐   │  └────┬────┘ └────┬─────┘ │   │
│  │ IndexedDB (Dexie — hito-     │   │       │           │       │   │
│  │  integrations, ver §4.1)     │   │  ┌────▼────┐ ┌────▼─────┐ │   │
│  │  ├─ integrationConfigs       │   │  │ Inbound  │ │ Outbound │ │   │
│  │  ├─ webhookSubscriptions     │   │  │ Handlers │ │ Hooks    │ │   │
│  │  ├─ syncLogs                 │   │  └────┬────┘ └────┬─────┘ │   │
│  │  └─ outboundQueue            │   │       │           │       │   │
│  └──────────────────────────────┘   └───────┼───────────┼───────┘   │
│  ┌──────────────────────────────┐           │           │           │
│  │  Web Crypto API              │           │           │           │
│  │  (AES-GCM encrypt/decrypt)   │           │           │           │
│  │  (PBKDF2 key derivation)     │           │           │           │
│  └──────────────────────────────┘           │           │           │
│  ┌──────────────────────────────┐           │           │           │
│  │  File System Access API      │           │           │           │
│  │  (backup/export JSON)        │           │           │           │
│  └──────────────────────────────┘           │           │           │
└─────────────────────────────────────────────┼───────────┼───────────┘
                                              │           │
                    ┌─────────────────────────┘           │
                    ▼                                     ▼
        ┌───────────────────┐              ┌──────────────────────────┐
        │  APIs Externas    │              │  Destinos Outbound        │
        │  (Inbound Polling)│              │  (Outbound POST)          │
        │                   │              │                            │
        │  • HubSpot API    │              │  • Zapier Webhooks         │
        │  • Google Sheets  │              │  • Make (Integromat)       │
        │    API v4         │              │  • Custom Webhook URLs     │
        │                   │              │  • Apps Script proxy       │
        │  [User's API keys │              │  • Email via proxy         │
        │   encrypted en    │              │                            │
        │   vault]          │              │  [Signed with HMAC secret] │
        └───────────────────┘              └──────────────────────────┘
```

**Nota (§0.2):** este diagrama describe el diseño de referencia. El "Integration Engine" (Polling Manager + Outbound Dispatcher) existe como código pero **no está conectado** — nada lo invoca automáticamente hoy.

### 3.1 Flujo de datos

**Inbound (Polling):**
1. `PollingManager` ejecuta un `setInterval` configurable (default: 5 min) cuando la app está abierta. *(Implementado; nada lo registra aún — pendiente en Wave A.)*
2. Llama a la API externa con las credenciales desencriptadas del usuario (en memoria volátil, vía `useVaultStore`).
3. Compara `lastSyncTimestamp` para detectar deltas.
4. Transforma los datos externos en acciones internas (crear/actualizar tareas/personas) mediante `mappingEngine.transform()`. *(El poller de HubSpot calcula la acción pero `executeMappingAction()` es un stub — pendiente conectar a las mutaciones reales de `useDataStore`.)*
5. Registra resultado en `syncLogs`.

**Outbound (Event-Driven):**
1. `diffProjectEvents()` existente (`src/automations/events.ts`) genera eventos de dominio — **sin cambios, se reutiliza tal cual**.
2. `dispatchOutboundEvents(events, workspaceOrg)` en `src/integrations/outbound/dispatcher.ts` debe escuchar esos eventos. *(Implementado pero no invocado — pendiente en Wave A: cablear en `runAutomations()` de `useDataStore.ts`.)*
3. Busca `webhookSubscriptions` matching en Dexie.
4. Construye payload JSON, firma con HMAC-SHA256, encola en `outboundQueue`.
5. `retry-engine.ts` procesa la cola cada 30s con `fetch()` POST y backoff exponencial. *(Implementado; `startOutboundProcessor()` pendiente de invocarse al arrancar la app.)*
6. Registra resultado en `syncLogs`.

---

## 4. Arquitectura de Almacenamiento Local

### 4.1 Estrategia de almacenamiento (dual-layer + Dexie) — **decisión de diseño actualizada**

La app ya opera con dos capas de persistencia para el dominio (proyectos/tareas): File System Access API (primaria) e IndexedDB raw vía `src/storage/idb.ts` (secundaria, para el `FileSystemDirectoryHandle` y configs simples).

**Corrección respecto al diseño original:** este spec proponía inicialmente *no* introducir Dexie.js y reutilizar el wrapper KV existente (`idb.ts`). **La implementación ya adoptó Dexie** en [`src/storage/integration-db.ts`](../../src/storage/integration-db.ts) (`class IntegrationDatabase extends Dexie`, base de datos `"hito-integrations"`). Se ratifica esta decisión porque:

- El wrapper KV de `idb.ts` (`idbGet/idbSet/idbDel`) es un almacén clave-valor puro, sin índices — no soporta las queries que necesitan las 4 tablas de integraciones (`webhookSubscriptions` por `*events` multiEntry, `syncLogs` por `[provider+status]`, `outboundQueue` por `nextRetryAt`).
- Dexie (~15KB) es una desviación consciente y acotada del Principio V (simplicidad): se usa exclusivamente para el dominio de integraciones, en una base de datos separada (`hito-integrations`), sin tocar el almacenamiento de proyectos/tareas.
- `idb.ts` sigue siendo el store correcto para lo que ya persiste (handle de carpeta, config de IA); no se migra nada existente a Dexie.

Las 4 tablas Dexie ya implementadas: `integrationConfigs`, `webhookSubscriptions`, `syncLogs`, `outboundQueue` (ver §9.1 para el esquema completo, que coincide con el código).

### 4.2 Estructura de datos en IndexedDB (Dexie) — alineada con el código

```typescript
// src/storage/integration-db.ts (código real)

export interface IntegrationConfig {
  key: string;
  provider: "hubspot" | "google-sheets" | "zapier" | "email" | "custom";
  encryptedPayload: EncryptedPayload;   // { ciphertext, iv, salt } — ver §5
  enabled: boolean;
  lastTestedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookSubscription {
  id: string;
  name: string;
  url: string;
  encryptedSecret: EncryptedPayload;    // el secret HMAC se encripta con el vault
  events: string[];
  filters: { projectIds?: string[]; areaIds?: string[] };
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SyncLog {
  id: string;
  direction: "inbound" | "outbound";
  provider: string;
  eventType: string;
  status: "success" | "error" | "pending";
  requestPayload: string;   // truncado a 10KB
  responsePayload: string;  // truncado a 10KB
  httpStatus: number | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
}

export interface OutboundDelivery {
  id: string;
  subscriptionId: string;
  url: string;
  event: string;
  payload: string;
  signature: string;
  attemptCount: number;
  nextRetryAt: string;   // ISO date con backoff exponencial
  createdAt: string;
}
```

*(Diferencia con el diseño original: `IntegrationConfig.encryptedPayload` y `WebhookSubscription.encryptedSecret` son objetos `EncryptedPayload` estructurados —`{ ciphertext, iv, salt }`—, no un `string` + `iv` sueltos como decía el borrador inicial.)*

### 4.3 File System Access API — Backup de configuraciones (pendiente de implementar)

Las configuraciones de integración **deberían** guardarse también como archivos JSON encriptados en la carpeta del usuario, junto con sus datos (para que sobrevivan a un `IndexedDB` limpiado en modo privado — ver riesgo R4 en §15). **Esto aún no está implementado**: hoy toda la persistencia de integraciones vive solo en Dexie (`hito-integrations`) y el salt del vault en `localStorage` (`hito:vault-salt`, no en IndexedDB como decía el borrador original).

```
carpeta-del-usuario/
  workspace.json
  projects/
  products/
  integrations/                    ← PENDIENTE (no implementado)
    hubspot.config.enc             ← AES-GCM encrypted
    google-sheets.config.enc
    webhook-subscriptions.json     ← Las URLs no son secretas, solo los secrets
    sync-logs/
      2026-07-07.json              ← Rotación diaria, max 30 días
```

---

## 5. Encriptación de Credenciales (Web Crypto API)

### 5.1 Flujo de derivación de clave

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────┐
│  Contraseña  │────▶│  PBKDF2          │────▶│  CryptoKey    │
│  maestra     │     │  600,000 iters   │     │  (AES-GCM     │
│  (en memoria)│     │  SHA-256         │     │   256-bit)    │
│              │     │  + salt aleatorio│     │               │
└──────────────┘     └──────────────────┘     └───────┬───────┘
                                                       │
                              ┌────────────────────────┘
                              ▼
                     ┌──────────────────┐
                     │  AES-GCM encrypt │
                     │  + IV aleatorio  │
                     │  por operación   │
                     └────────┬─────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │  Dexie           │
                     │  (hito-          │
                     │  integrations)   │
                     │  (ciphertext)    │
                     └──────────────────┘
```

### 5.2 Implementación real — `src/integrations/crypto.ts`

El código real coincide con el diseño, con dos funciones adicionales (`encryptWithKey`/`decryptWithKey`) que reutilizan una `CryptoKey` ya derivada — usadas por el vault para no re-derivar la key en cada operación:

```typescript
// src/integrations/crypto.ts (código real, íntegro)

const PBKDF2_ITERATIONS = 600_000; // OWASP 2023 recommendation for SHA-256
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  salt: string;
}

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

// encryptPayload/decryptPayload: variante self-contained (deriva la key cada vez,
// a partir de la passphrase). Usada cuando no hay una key ya derivada en memoria.
export async function encryptPayload(passphrase: string, payload: unknown): Promise<EncryptedPayload> { /* ... */ }
export async function decryptPayload<T>(passphrase: string, encrypted: EncryptedPayload): Promise<T> { /* ... */ }

// encryptWithKey/decryptWithKey: variante que reutiliza una CryptoKey ya derivada
// (la que vive en el vault mientras está desbloqueado). Evita re-derivar PBKDF2
// en cada operación de encrypt/decrypt.
export async function encryptWithKey(key: CryptoKey, salt: Uint8Array, payload: unknown): Promise<EncryptedPayload> { /* ... */ }
export async function decryptWithKey<T>(key: CryptoKey, encrypted: EncryptedPayload): Promise<T> { /* ... */ }
```

### 5.3 Vault store — `src/integrations/vault.ts` (código real)

**Corrección respecto al borrador original:** la primera versión de este spec proponía un `decrypt()` con un bug (`deriveKey("", salt)` en vez de usar la key en memoria). El código real es correcto y además expone `setupMasterPassword` y `hasMasterPassword` (no estaban en el diseño original):

```typescript
// src/integrations/vault.ts (código real, íntegro)
import { create } from "zustand";
import { deriveKey, encryptWithKey, decryptWithKey } from "./crypto";
import type { EncryptedPayload } from "./crypto";

const VAULT_SALT_KEY = "hito:vault-salt"; // localStorage, NO IndexedDB — el salt es público

interface VaultState {
  _masterKey: CryptoKey | null;
  _salt: Uint8Array | null;
  isUnlocked: boolean;
  hasMasterPassword: boolean;   // derivado de si ya existe un salt guardado

  unlock(passphrase: string): Promise<boolean>;
  lock(): void;
  setupMasterPassword(passphrase: string): Promise<void>;  // primera vez: genera salt + key
  encrypt(data: unknown): Promise<EncryptedPayload>;
  decrypt<T>(enc: EncryptedPayload): Promise<T>;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  _masterKey: null,
  _salt: null,
  isUnlocked: false,
  hasMasterPassword: loadSaltFromStorage() !== null,

  async unlock(passphrase) {
    const salt = loadSaltFromStorage();
    if (!salt) return false;
    try {
      const key = await deriveKey(passphrase, salt);
      set({ _masterKey: key, _salt: salt, isUnlocked: true });
      return true;
    } catch {
      return false;
    }
  },

  lock() {
    set({ _masterKey: null, _salt: null, isUnlocked: false });
  },

  async setupMasterPassword(passphrase) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    saveSaltToStorage(salt);
    const key = await deriveKey(passphrase, salt);
    set({ _masterKey: key, _salt: salt, isUnlocked: true, hasMasterPassword: true });
  },

  async encrypt(data) {
    const { _masterKey, _salt } = get();
    if (!_masterKey || !_salt) throw new Error("Vault is locked");
    return encryptWithKey(_masterKey, _salt, data);
  },

  async decrypt<T>(enc) {
    const { _masterKey } = get();
    if (!_masterKey) throw new Error("Vault is locked");
    return decryptWithKey<T>(_masterKey, enc);
  },
}));
```

`unlock()` devuelve `boolean` (no `void`) para que la UI muestre "contraseña incorrecta" sin necesidad de try/catch adicional.

### 5.4 Auto-lock por inactividad — `src/integrations/vault-auto-lock.ts`

Implementado tal como se diseñó originalmente (`initVaultAutoLock()`/`stopVaultAutoLock()`, timeout 10 min, listeners de actividad, `beforeunload` → lock inmediato). **Pendiente:** nadie llama `initVaultAutoLock()` en el arranque de la app — ver Wave A en [plan.md](./plan.md).

---

## 6. Integraciones de Entrada (Inbound Polling)

### 6.1 Polling Manager — Arquitectura

Implementado en [`src/integrations/polling/polling-manager.ts`](../../src/integrations/polling/polling-manager.ts) tal como se diseñó: `register(provider, config, handler)`, backoff exponencial en fallo (techo 30 min), recuperación al intervalo normal tras éxito, `stopAll()`. **Pendiente:** ningún provider está registrado hoy — ni HubSpot ni Google Sheets llaman a `pollingManager.register(...)` desde ningún punto de la app.

### 6.2 HubSpot — Handler de Polling (contrato real del proxy, corregido)

**Corrección respecto al borrador original:** el diseño inicial proponía un `fetch` directo al `proxyUrl` con header `Authorization: Bearer`. **El contrato real, ya implementado y usado tanto por `hubspot-poller.ts` como por el botón "Probar conexión" de `IntegrationsPage.tsx`, envía el token en el body** (porque el proxy de Apps Script — ver §8.1 — reenvía la llamada a HubSpot desde el servidor de Google, no desde el navegador):

```typescript
// src/integrations/inbound/hubspot-poller.ts (código real, resumido)

export interface HubSpotCredentials {
  accessToken: string;
  portalId?: string;
}

export interface HubSpotConfig {
  proxyUrl: string;
  credentials: HubSpotCredentials;
  pollingIntervalMs: number;
  objectTypes: string[];
}

export async function pollHubSpot(
  config: HubSpotConfig,
  lastSyncAt: string | null
): Promise<PollResult> {
  const params = new URLSearchParams({
    limit: "100",
    properties: "email,firstname,lastname,company,phone,lastmodifieddate,createdate",
  });
  if (lastSyncAt) {
    params.append("filterGroups", JSON.stringify([{
      filters: [{ propertyName: "lastmodifieddate", operator: "GT", value: lastSyncAt }],
    }]));
  }

  // El token NO va en un header Authorization — va en el body, porque quien
  // llama a HubSpot es el proxy (Apps Script), no el navegador.
  const response = await fetch(config.proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      _hubspotToken: config.credentials.accessToken,
      path: `/crm/v3/objects/contacts?${params.toString()}`,
      method: "GET",
    }),
    signal: AbortSignal.timeout(15_000),
  });

  // ... maneja !response.ok, parsea contacts, y por cada uno:
  //   1. idempotencyCheck(`hubspot-${contact.id}`) — descarta duplicados
  //   2. mappingEngine.transform("hubspot", contact.properties) — calcula la acción
  //   3. executeMappingAction(action) — **STUB**: hoy solo hace console.log,
  //      no crea/actualiza Person ni Task. Pendiente: conectar a las mutaciones
  //      reales de useDataStore (upsertPerson / upsertTask).
  // ... y registra el resultado en integrationDb.syncLogs.
}
```

**Gap crítico marcado en código:** `executeMappingAction()` es el único punto donde el poller "toca" el dominio de la app, y hoy es un placeholder. Sin esto, incluso con polling activo, los contactos de HubSpot nunca se convierten en personas reales dentro de Hito.

### 6.3 Google Sheets — Handler de Polling

Implementado en [`src/integrations/inbound/sheets-poller.ts`](../../src/integrations/inbound/sheets-poller.ts) siguiendo el diseño original (gapi.js, OAuth, mapeo de columnas). Igual que HubSpot, no está registrado en el `PollingManager` ni conectado a mutaciones reales del dominio.

### 6.4 Transformación de datos (Mapping Layer)

Implementado en [`src/integrations/inbound/mapping-engine.ts`](../../src/integrations/inbound/mapping-engine.ts) tal como se diseñó: clase `MappingEngine` con `registerMapping()`/`transform()`, mapeos por defecto para HubSpot. El resultado de `transform()` (una `MappingAction[]`) es lo que `executeMappingAction()` debería ejecutar — ver gap en §6.2.

---

## 7. Integraciones de Salida (Outbound / Event-Driven)

### 7.1 Event Bus — Dispatcher de salida (firma real, corregida)

**Corrección respecto al borrador original:** la firma de `dispatchOutboundEvents` en el código real es `(events: DomainEvent[], workspaceOrg: string)`, no `(events, subscriptions)` — el dispatcher **lee las subscriptions él mismo** desde Dexie (`integrationDb.webhookSubscriptions.where("enabled").equals(1)`), y desencripta el secret de cada una vía `useVaultStore.getState().decrypt(...)` antes de firmar:

```typescript
// src/integrations/outbound/dispatcher.ts (código real, resumido)

export async function dispatchOutboundEvents(
  events: DomainEvent[],
  workspaceOrg: string
): Promise<void> {
  const subscriptions = await integrationDb.webhookSubscriptions
    .where("enabled").equals(1).toArray();

  for (const event of events) {
    const matchingSubs = subscriptions.filter((sub) => sub.events.includes(event.type));
    for (const sub of matchingSubs) {
      const payload = buildPayload(event, workspaceOrg);
      const secret = await useVaultStore.getState().decrypt<string>(sub.encryptedSecret);
      const signature = await signPayload(payload, secret);
      await enqueueDelivery({ subscriptionId: sub.id, url: sub.url, payload, signature, event: JSON.stringify(event) });
    }
  }
}
```

También expone el CRUD de suscripciones: `getWebhookSubscriptions()`, `createWebhookSubscription()`, `updateWebhookSubscription()`, `deleteWebhookSubscription()` — listo para que la UI de gestión de webhooks (pendiente, Wave B) los use directamente.

**Pendiente (gap #1 de §0.2):** esta función existe y es correcta, pero **nada la invoca**. El punto de invocación natural es `runAutomations()` en `src/store/useDataStore.ts:409`, justo después de `runEngine(...)` (línea 412), que ya tiene `events` en scope. Ver Wave A en [plan.md](./plan.md).

### 7.2 Firma HMAC de payloads

Implementado en [`src/integrations/outbound/signing.ts`](../../src/integrations/outbound/signing.ts) tal como se diseñó (`signPayload`, más `verifyPayloadSignature` que no estaba en el borrador original).

### 7.3 Retry Policy con Backoff Exponencial

Implementado en [`src/integrations/outbound/retry-engine.ts`](../../src/integrations/outbound/retry-engine.ts) tal como se diseñó: `calculateRetryDelay()` (base 1s, ×2, techo 5min, jitter ±20%), `processOutboundQueue()` (4xx no reintenta, 5xx sí, máx 5 intentos), `startOutboundProcessor()`/`stopOutboundProcessor()` (intervalo de 30s). **Pendiente:** `startOutboundProcessor()` nunca se llama al arrancar la app — ver Wave A.

### 7.4 Envío de correos (Email)

Implementado en [`src/integrations/outbound/email-via-apps-script.ts`](../../src/integrations/outbound/email-via-apps-script.ts) tal como se diseñó (Opción A, Apps Script). La UI de configuración de email en `IntegrationsPage.tsx` existe visualmente pero no persiste la config (mismo gap #3 de §0.2).

**Opción B — Cloudflare Worker del usuario** (documentación de referencia para el usuario, sin cambios):

```typescript
// El usuario deploya este worker (código que Hito le proporciona):
//
// export default {
//   async fetch(request, env) {
//     const { to, subject, htmlBody } = await request.json();
//     await fetch("https://api.resend.com/emails", {
//       method: "POST",
//       headers: {
//         "Authorization": `Bearer ${env.RESEND_API_KEY}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ from: env.FROM_EMAIL, to, subject, html: htmlBody }),
//     });
//     return new Response(JSON.stringify({ ok: true }), {
//       headers: { "Access-Control-Allow-Origin": "*" },
//     });
//   },
// };
```

---

## 8. El Problema de CORS — Estrategias de Mitigación

Esta sección se mantiene sin cambios respecto al diseño original — el análisis sigue siendo correcto y es la base del contrato real implementado en §6.2.

### 8.1 Análisis por API

#### HubSpot API (❌ No soporta CORS)

| Opción | Complejidad | Costo | Recomendación |
|---|---|---|---|
| **Google Apps Script proxy** | Baja (5 min setup) | Gratis | ✅ Recomendada para MVP — es la implementada |
| **Cloudflare Worker proxy** | Media (15 min setup) | Gratis (100k/día) | ✅ Para usuarios técnicos |
| **Extensión de navegador** | Ninguna | Gratis | ⚠️ Solo desarrollo |
| **Servidor propio del usuario** | Alta | Variable | ❌ Fuera de scope |

**Código del proxy en Apps Script para HubSpot** (contrato que ya consume `hubspot-poller.ts` y `IntegrationsPage.handleTestConnection`):

```javascript
// Google Apps Script — HubSpot Proxy
// Deploy as Web App, set access to "Anyone"
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const hubspotToken = data._hubspotToken;
  delete data._hubspotToken;

  const url = `https://api.hubapi.com${data.path}`;
  const response = UrlFetchApp.fetch(url, {
    method: data.method || "get",
    headers: {
      "Authorization": `Bearer ${hubspotToken}`,
      "Content-Type": "application/json",
    },
    payload: data.method === "post" ? JSON.stringify(data.body) : undefined,
    muteHttpExceptions: true,
  });

  return ContentService.createTextOutput(response.getContentText())
    .setMimeType(ContentService.MimeType.JSON);
}
```

#### Google Sheets API (✅ CORS nativo con gapi.js)

Sin cambios respecto al diseño original — `src/integrations/inbound/sheets-poller.ts` sigue este contrato.

#### Zapier / Make Webhooks (✅ CORS permitido)

Sin cambios — funciona directamente sin proxy.

### 8.2 UI de diagnóstico CORS

Implementado en [`src/integrations/diagnostics.ts`](../../src/integrations/diagnostics.ts) (`diagnoseIntegration(provider)` → `ok | cors-error | auth-error | timeout | unknown`). **Pendiente:** no hay ningún componente de UI que lo invoque — ver Wave B en [plan.md](./plan.md).

---

## 9. Modelo de Datos en IndexedDB

### 9.1 Esquema completo con Dexie.js — **ya implementado**, no opcional

El diseño original presentaba Dexie como opción condicional ("si se adopta..."). Ya se adoptó — este es el esquema real en [`src/storage/integration-db.ts`](../../src/storage/integration-db.ts):

```typescript
import Dexie, { type Table } from "dexie";

export class IntegrationDatabase extends Dexie {
  integrationConfigs!: Table<IntegrationConfig, string>;
  webhookSubscriptions!: Table<WebhookSubscription, string>;
  syncLogs!: Table<SyncLog, string>;
  outboundQueue!: Table<OutboundDelivery, string>;

  constructor() {
    super("hito-integrations");
    this.version(1).stores({
      integrationConfigs: "key, provider, enabled",
      webhookSubscriptions: "id, enabled, *events",
      syncLogs: "id, direction, provider, eventType, status, createdAt, [provider+status]",
      outboundQueue: "id, subscriptionId, nextRetryAt, attemptCount",
    });
  }
}

export const integrationDb = new IntegrationDatabase();
export async function clearIntegrationDb(): Promise<void> { await integrationDb.delete(); }
```

### 9.2 Índices y justificación

Sin cambios respecto al diseño original — los índices reales coinciden exactamente con lo planeado.

| Tabla | Índice | Propósito |
|---|---|---|
| `syncLogs` | `createdAt` | Consultar historial por fecha en UI de logs |
| `syncLogs` | `[provider+status]` | Filtrar logs por provider y estado (errores) |
| `outboundQueue` | `nextRetryAt` | Procesar solo deliveries cuyo retry ya venció |
| `webhookSubscriptions` | `*events` (multiEntry) | Buscar suscripciones que listen a un evento específico |
| `integrationConfigs` | `provider` | Lookup rápido de credenciales por provider |

### 9.3 Rotación y limpieza

Implementado en [`src/integrations/maintenance.ts`](../../src/integrations/maintenance.ts) tal como se diseñó (retención 30 días / 5,000 logs, cola muerta a 7 días con 5 reintentos agotados). **Pendiente:** `runMaintenance()` nunca se llama al abrir la app — ver Wave A.

---

## 10. Experiencia de Usuario (UI/UX) — actualizada a la UI real construida

**Corrección respecto al diseño original:** el borrador proponía una UI de diálogos anidada bajo `/app/settings/integrations` (ProviderCard, CredentialDialog, VaultSetupDialog, WebhookSubscriptionDialog). **Esa UI nunca se construyó.** En su lugar se construyó — y se ratifica como UI canónica — una experiencia de dos piezas bajo `/app/integrations` (top-level, no anidada en Settings):

### 10.1 `IntegrationsPage` — hub por tabs

**Ruta:** `/app/integrations` ([`src/features/integrations/IntegrationsPage.tsx`](../../src/features/integrations/IntegrationsPage.tsx))

Un `Tabs` con 4 pestañas (HubSpot / Google Sheets / Webhooks / Email), cada una con su `Panel` de configuración:

- **HubSpot:** aviso de que requiere proxy + botón "Guía de configuración" (`AppsScriptGuide`), inputs de Proxy URL y API token, botón "Probar conexión" (usa el contrato real de §6.2 y §8.1), selector de intervalo de polling, indicador de última sync.
- **Google Sheets:** aviso de compatibilidad nativa (sin proxy), inputs de Spreadsheet ID + rango, botón "Conectar con Google".
- **Webhooks:** lista de suscripciones activas (o estado vacío), botón "Nueva suscripción", badges de los eventos disponibles (`task.statusChanged`, `task.commented`, `task.added`, `project.statusChanged`, `checklist.completed`, `area.completed`).
- **Email:** aviso de que requiere proxy, inputs de Email Proxy URL y remitente, botón "Ver guía de Apps Script".

**Estado actual:** todo el contenido de la página es **presentacional**. El único flujo real es "Probar conexión" en la pestaña HubSpot, que hace un `fetch` de verdad contra el proxy. Ningún input persiste en `integrationDb` ni en el vault; el indicador de "Última sync: hace 3 min (12 registros)" es texto fijo. **Pendiente (Wave B):** conectar cada tab a `integrationDb.integrationConfigs` (encriptando con el vault) y a `dispatchOutboundEvents`'s CRUD de suscripciones.

### 10.2 `IntegrationFlowBuilder` — wizard de mapeo custom

**Ruta:** `/app/integrations/new` ([`src/features/integrations/IntegrationFlowBuilder.tsx`](../../src/features/integrations/IntegrationFlowBuilder.tsx))

Stepper de 6 pasos (tipos en [`types.ts`](../../src/features/integrations/types.ts)):

1. **`ProviderConfigStep`** — selección de proveedor (HubSpot / Google Sheets / Custom vía `PROVIDER_CONFIG`), credenciales (`proxyUrl`, `accessToken`), prueba de conexión.
2. **`DataSourceStep`** — endpoint/rango, método HTTP, parámetros de consulta, obtención de datos de ejemplo.
3. **`MappingEditorStep`** — mapeo visual campo origen → campo destino (`FieldMapping[]`, soporta notación de punto para campos anidados).
4. **`CodeEditorStep`** — editor de una función `transform(record)` en JavaScript con syntax highlighting (Prism.js vía `react-simple-code-editor`), validación de sintaxis, sandbox con timeout de 1s.
5. **`ActionDefinitionStep`** — tipo de acción (`upsertPerson | upsertTask | updateTaskStatus | custom`), campo de matching, política si no se encuentra el registro (`create | skip | error`).
6. **`TestSandboxStep`** — ejecución del flujo completo (mapping → transform → acción) contra datos de ejemplo, con `TestResult` (input/output/tiempo de ejecución/errores).

**Estado actual:** el sandbox de pruebas es completamente funcional — es una herramienta real de validación de mapeos. Pero **el resultado del wizard no se persiste en ningún lado**: no existe un `handleSave`/`handleFinish` que escriba un `IntegrationFlow` en Dexie ni que lo registre en el `PollingManager`. Terminar el wizard hoy no produce ninguna integración activa. **Pendiente (Wave B):** decidir si un `IntegrationFlow` completado se traduce en un `IntegrationConfig` + registro en `pollingManager`, o si se persiste como su propia entidad y se ejecuta con su propio scheduler.

### 10.3 Logs e Historial — ya funcional

**Ruta:** `/app/integrations/logs` ([`src/features/integrations/SyncLogsPage.tsx`](../../src/features/integrations/SyncLogsPage.tsx) + `DeliveryDetailDrawer.tsx`)

A diferencia de las otras dos páginas, **esta sí está completamente cableada**: lee de `integrationDb.syncLogs.orderBy("createdAt").reverse()`, con filtros y un drawer de detalle (`DeliveryDetailDrawer`) que muestra request/response/headers de cada delivery. No requiere trabajo adicional más allá de que existan logs reales que mostrar (lo cual depende de que Wave A cablee el resto).

### 10.4 Flujo de Onboarding (diseño de referencia, aún no implementado end-to-end)

```
1. Usuario navega a /app/integrations
2. Selecciona la tab de un proveedor → ve explicación + requisitos
3. Si es la primera vez → se pide crear contraseña maestra (useVaultStore.setupMasterPassword)
4. Usuario ingresa API Key / credenciales
5. Se encripta con AES-GCM (vault.encrypt) y se guarda en integrationDb.integrationConfigs
   [PENDIENTE — hoy no ocurre]
6. Usuario ejecuta "Probar conexión" → diagnóstico CORS (diagnostics.ts) [existe fetch básico,
   falta integrar diagnoseIntegration()]
7. Usuario configura intervalo de polling → se registra en pollingManager [PENDIENTE]
8. Usuario elige qué mapear (contacts → personas, deals → tareas) vía IntegrationFlowBuilder
   o el mapeo por defecto de mapping-engine.ts
```

---

## 11. Consideraciones de Seguridad

Sin cambios respecto al diseño original — el análisis de amenazas sigue vigente y el código implementado ya sigue estas mitigaciones (AES-GCM, vault en memoria volátil, HMAC en outbound, enmascarado de payloads sensibles en logs, backoff ante rate limits).

### 11.1 Resumen de amenazas y mitigaciones

| Amenaza | Mitigación |
|---|---|
| Robo de API keys de Dexie | Encriptación AES-GCM con clave derivada de contraseña maestra (`vault.ts`) |
| XSS que acceda a credenciales | CSP estricta; vault en memoria volátil con auto-lock (implementado, pendiente de inicializar) |
| Replay de webhooks salientes | Cada payload incluye `eventId` único + timestamp; receptor puede deduplicar |
| Suplantación de webhooks entrantes | Firma HMAC en cada delivery; receptor verifica con `X-Hito-Signature` |
| Credential leakage en logs | Los payloads en `syncLogs` deben enmascarar campos sensibles — **verificar en Wave C** que ningún token termine en texto plano en `requestPayload`/`responsePayload` |
| Polling excesivo (rate limits) | Backoff exponencial + respeto de `Retry-After` header |

### 11.2 Content Security Policy

Sin cambios — sigue pendiente de aplicarse en `index.html`.

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://apis.google.com;
  connect-src 'self'
    https://api.hubapi.com
    https://sheets.googleapis.com
    https://hooks.zapier.com
    https://hook.us1.make.com
    https://api.resend.com
    *.googleusercontent.com;
  frame-src https://accounts.google.com;
">
```

### 11.3 Idempotencia en recepción de eventos

Implementado en [`src/integrations/inbound/idempotency.ts`](../../src/integrations/inbound/idempotency.ts) (`idempotencyCheck(eventId)`, `clearIdempotencyCache()`) tal como se diseñó, y ya usado por `hubspot-poller.ts`.

### 11.4 Multi-tenancy (aislamiento de datos)

Sin cambios — en el modelo local-first el aislamiento es inherente.

---

## 12. Consideraciones de Performance

Sin cambios respecto al diseño original.

### 12.1 Timeouts estrictos

Confirmado en código: `hubspot-poller.ts` usa 15s, `retry-engine.ts` usa 10s, ambos con `AbortSignal.timeout(...)`.

### 12.2 Throttling de polling

Diseñado en [`src/integrations/polling/visibility-aware.ts`](../../src/integrations/polling/visibility-aware.ts) (pausa al perder foco, poll inmediato al recuperar). **Pendiente:** nadie llama `initVisibilityAwarePolling()` — mismo gap de inicialización que el resto de Wave A.

### 12.3 Límites de almacenamiento

Sin cambios respecto al diseño original — los límites (5,000 syncLogs, 500 outboundQueue, payloads truncados a 10KB) están implementados en `maintenance.ts`, pendiente de invocarse.

---

## 13. Migración desde la Arquitectura Actual

### 13.1 Impacto en código existente — corregido contra el código real

| Módulo existente | Cambio requerido |
|---|---|
| `src/automations/events.ts` | **Ninguno.** Los `DomainEvent` se reutilizan tal cual. |
| `src/automations/engine.ts` | **Ninguno.** `runEngine()` es puro (`EngineInput → EngineResult`); el hook de outbound **no** va aquí. |
| `src/store/useDataStore.ts` | **Pendiente.** El hook de outbound va en `runAutomations()` (línea ~409-422), justo después de `runEngine(...)` (línea 412) — ahí ya están `events` en scope y se llama desde `createProject`/`saveProject`. |
| `src/storage/idb.ts` | **Ninguno.** No se toca; las integraciones usan Dexie por separado (`integration-db.ts`). |
| `src/storage/StorageAdapter.ts` | **Ninguno.** |
| `src/main.tsx` / `src/App.tsx` | **Pendiente.** Bootstrap de `initVaultAutoLock`, `pollingManager` (registrar providers activos), `startOutboundProcessor`, `runMaintenance`. |
| `src/features/integrations/` | **Ya existe** (11 archivos). Pendiente: conectar `IntegrationsPage`/`IntegrationFlowBuilder` a `integrationDb` + vault. |
| `package.json` | **Ya aplicado.** `dexie` está instalado y en uso; `react-simple-code-editor` + `prismjs` para el `CodeEditorStep` (no estaban en el borrador original, que solo preveía `gapi-script`). |

### 13.2 Schema version bump — pendiente

`SCHEMA_VERSION` sigue en **7** (`src/domain/schemas/common.ts:3`). El bump a 8 planeado en el diseño original **no se ha hecho** — no hace falta hasta que se persista algo del dominio de integraciones dentro del `Project`/`Task` schema (hoy todo vive en Dexie, fuera del esquema versionado de dominio). Evaluar en Wave A si realmente se necesita, o si el bump solo aplica si se añaden campos a `Task`/`Project` para reflejar el origen de una integración.

### 13.3 Constitución — ¿Se viola el Principio I?

Sin cambios — la respuesta original sigue siendo correcta: **No.** Las integraciones son, por definición, una acción explícita del usuario.

---

## 14. Dependencias Nuevas Propuestas — actualizado

| Paquete | Propósito | Estado |
|---|---|---|
| `dexie` | Wrapper rico para IndexedDB de integraciones | ✅ Instalado y en uso |
| `react-simple-code-editor` | Editor de código con syntax highlighting para `CodeEditorStep` | ✅ Instalado y en uso (no estaba en el borrador original) |
| `prismjs` + `@types/prismjs` | Syntax highlighting (JS) para el editor de transformaciones | ✅ Instalado y en uso |
| `gapi-script` | Google API client loader (Sheets) | ⬜ No añadido aún — `sheets-poller.ts` asume `gapi` global cargado por script tag manual |

**No se añade** ningún backend, cola de mensajes, ni servicio externo.

---

## 15. Riesgos y Decisiones Pendientes

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | HubSpot cambia su política CORS | Baja | Alto | El proxy del usuario aísla de este cambio |
| R2 | El usuario olvida su contraseña maestra | Media | Alto | Las credenciales encriptadas se pierden; debe re-ingresarlas. No hay recovery (by design). |
| R3 | Google depreca gapi.js auth2 | Baja | Medio | Migrar a Google Identity Services (GIS) — misma API subyacente |
| R4 | IndexedDB se limpia (private browsing) | Media | Medio | Hoy **no hay mitigación real** — el backup en File System Access API (§4.3) sigue sin implementarse. Si Dexie se limpia, se pierden configs y logs sin posibilidad de recuperación desde archivo. |
| R5 | Rate limiting de HubSpot/Sheets | Media | Bajo | Backoff exponencial + polling cada 5min (muy conservador) |
| R6 *(nuevo)* | El Flow Builder se percibe como "la integración ya funciona" porque el sandbox de pruebas es convincente, pero no persiste nada | Alta | Alto | Documentar claramente en la UI que el wizard es una herramienta de *diseño y prueba* de mapeos, no de activación, hasta que Wave B implemente la persistencia |
| R7 *(nuevo)* | Bump de `SCHEMA_VERSION` innecesario si integraciones vive enteramente fuera del esquema de dominio versionado | Baja | Bajo | Confirmar en Wave A si de verdad se toca `Project`/`Task`; si no, no incrementar `SCHEMA_VERSION` |

---

## 16. Criterios de Aceptación (Definition of Done)

### 16.1 Ya cumplido por el código existente

- [x] Encriptación AES-GCM + PBKDF2 (600k iteraciones) implementada y correcta.
- [x] Vault con auto-lock, `setupMasterPassword`/`unlock`/`lock` implementados.
- [x] Esquema Dexie completo (4 tablas, índices correctos).
- [x] Polling Manager con backoff exponencial implementado.
- [x] Pollers de HubSpot y Google Sheets implementados (transporte + parsing).
- [x] Dispatcher outbound + firma HMAC-SHA256 implementados.
- [x] Retry engine con backoff exponencial y distinción 4xx/5xx implementado.
- [x] Envío de email vía Apps Script implementado.
- [x] Diagnóstico CORS (`diagnoseIntegration`) implementado.
- [x] Mantenimiento/rotación de logs implementado.
- [x] Pantalla de logs (`SyncLogsPage` + `DeliveryDetailDrawer`) funcional y con ruta activa.
- [x] `IntegrationFlowBuilder`: sandbox de mapeo + transform + prueba, funcional como herramienta de diseño.

### 16.2 Pendiente — bloquea un MVP usable (ver Waves en plan.md)

- [ ] `dispatchOutboundEvents` se invoca automáticamente tras cada `saveProject`/`createProject` (Wave A).
- [ ] Los procesos de fondo (vault-auto-lock, polling, outbound processor, maintenance) se inicializan al abrir la app (Wave A).
- [ ] `executeMappingAction()` en `hubspot-poller.ts` crea/actualiza personas y tareas reales, no solo `console.log` (Wave A).
- [ ] El usuario puede configurar HubSpot desde `IntegrationsPage` y que quede persistido (encriptado) y pollando de verdad (Wave B).
- [ ] El usuario puede crear/editar/eliminar suscripciones de webhooks desde la UI, con CRUD real contra `integrationDb` (Wave B).
- [ ] El `IntegrationFlowBuilder` persiste el flujo diseñado como una integración activa, o el spec documenta explícitamente que es solo una herramienta de prueba (decisión pendiente, Wave B).
- [ ] El diagnóstico CORS se muestra en la UI, no solo en código (Wave B).
- [ ] Tests unitarios de crypto, vault, signing, retry-engine, dispatcher, mapping-engine, idempotency (Wave C).
- [ ] `npm run typecheck`, `npm run lint`, `npm run test` pasan sin errores tras el cableado (Wave C).
- [ ] Ningún dato sale del navegador sin acción explícita del usuario (ya cierto hoy, pero debe seguir siéndolo tras Wave A/B).
