# Design 032 — Round-trip con Make/Zapier

Diseño técnico de la spec 032. Anclado al código real de las specs 018–027. Principio rector: **cerrar
el ciclo con un iPaaS externo sin violar el Principio I (local-first, sin infraestructura propia de
Hito)** — la única "infra" sigue siendo el proxy Apps Script del propio usuario.

## 1. Panorama end-to-end (objetivo)

```
   ┌─────────────────────────── NAVEGADOR (Hito, local-first) ───────────────────────────┐
   │                                                                                      │
   │   Flujo (trigger → condición → transformación → acciones)                            │
   │        ▲ entrada                                        │ salida                      │
   │        │ externalData (record)                          ▼                             │
   │   ┌────┴───────────────┐                        ┌───────────────────┐                │
   │   │ inbox-poller       │  drain (poll)          │ webhook output    │  POST directo  │
   │   │ (Fase B, NUEVO)    │◀───────────────┐       │ (Fase A: firma    │───────────────▶│
   │   └────────────────────┘                │       │  sobre el body)   │                │
   │        pollingManager (ya existe)       │       └───────────────────┘                │
   │        idempotency + cursor (ya existe) │             │ registra                     │
   │                                          │            ▼                              │
   │                                   syncLogs / delivery log (Fase C) ──▶ SyncLogsPage  │
   └──────────────────────────────────────────┼──────────────────────────┼───────────────┘
                                               │ drain (POST text/plain)  │ POST application/json
                                               ▼                          ▼
                          ┌────────────────────────────────┐   ┌──────────────────────────┐
                          │ Apps Script INBOX (del usuario) │   │  Make / Zapier / n8n      │
                          │  doPost(Make→cola) (Fase B/D)   │◀──│  (escenario del usuario)  │
                          │  doPost(action:drain→Hito)      │   │  recibe envelope firmado  │
                          │  buffer FIFO + deliveryId       │──▶│  verifica X-Hito-Signature│
                          └────────────────────────────────┘   └──────────────────────────┘
```

**Salida (Hito → Make/Zapier):** POST directo desde el navegador (Make/Zapier aceptan CORS, 018 §1.1).
No usa proxy. Fase A lo hace verificable.

**Entrada (Make/Zapier → Hito):** Make/Zapier no puede hablar con un navegador. En su lugar, POST al
**proxy inbox del usuario** (un Apps Script Web App, mismo modelo que HubSpot/Sheets/email), que
**acumula**. Hito **drena** ese buffer por polling. No hay webhook pasivo ni servidor de Hito.

## 2. Fase A — Firma verificable + envelope

### 2.1 El bug, en una línea

Hoy: `sig = HMAC(JSON.stringify(envelope))` pero `body = JSON.stringify(payload)` con
`envelope ≠ payload` y `envelope.{eventId,timestamp}` nunca transmitidos → el receptor no puede
reproducir el material firmado. (Ver [webhook-request.ts:33-57](src/flows/webhook-request.ts#L33-L57).)

### 2.2 Invariante nuevo

> **La firma se calcula sobre el string exacto del body que se envía.** `signature = HMAC(rawBody)`.

### 2.3 `signing.ts`

```ts
// NUEVO core: firma un string crudo (los bytes reales del body).
export async function signRaw(rawBody: string, secret: string): Promise<string> {
  // ... importKey HMAC-SHA256 + sign(encoder.encode(rawBody)) → "sha256=<hex>"
}
export async function verifyRaw(rawBody: string, secret: string, sig: string): Promise<boolean> {
  return (await signRaw(rawBody, secret)) === sig;
}
// Compat: el dispatcher legacy (dispatcher.ts) sigue llamando signPayload.
export async function signPayload(p: OutboundPayload, secret: string) {
  return signRaw(JSON.stringify(p), secret);
}
```

### 2.4 `webhook-request.ts` (reescrito)

```ts
export async function buildWebhookRequest(output: WebhookOutput, data: Record<string, unknown>) {
  const { value: payload, unresolved } = output.payload
    ? interpolateObject(output.payload, data)
    : { value: data, unresolved: [] as string[] };

  const id = uuid();
  const timestamp = nowIso();
  const shape = output.payloadShape ?? "bare"; // guardados viejos = bare

  const bodyObj = shape === "envelope"
    ? { id, type: "flow.execution", timestamp, workspace: { org: "Hito" }, data: payload }
    : payload;

  const rawBody = JSON.stringify(bodyObj);            // ← se serializa UNA vez
  const signature = await signRaw(rawBody, output.secret);  // ← se firma ESE string

  return {
    url: output.url, payload, unresolved,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hito-Signature": signature,   // sha256=<hex> sobre rawBody
        "X-Hito-Event": "flow.execution",
        "X-Hito-Delivery": id,
        "X-Hito-Timestamp": timestamp,
      },
      body: rawBody,                     // ← exactamente lo que se firmó
    },
  };
}
```

**Nota de correctitud:** el receptor debe verificar sobre el **raw body** que recibe, no sobre un
`JSON.parse`→`JSON.stringify` (que reordena claves). La receta copy-paste (Fase A UI) lo dice
explícitamente: en Make usar el *raw body*, en Express `express.raw()`.

### 2.5 Receta de verificación (para la UI y `/docs`)

```js
// Node / Zapier Code / Make Custom JS — pseudocódigo que la UI muestra:
const crypto = require("crypto");
const expected = "sha256=" + crypto.createHmac("sha256", SECRET).update(rawBody).digest("hex");
const ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(req.header("X-Hito-Signature")));
const fresh = Math.abs(Date.now() - Date.parse(req.header("X-Hito-Timestamp"))) < 5*60*1000;
if (!ok || !fresh) reject();
```

### 2.6 Retrocompat

- `payloadShape` ausente ⇒ `"bare"` ⇒ mismo shape de body que hoy, **pero ahora firmado sobre el body
  real** (deja de ser inverificable sin cambiar lo que el escenario de Make recibe).
- Webhooks nuevos: la UI default `"envelope"`.

## 3. Fase B — Inbox-polling

### 3.1 Contrato del proxy inbox (Apps Script)

Dos roles en el mismo Web App, distinguidos por el body:

**a) Ingreso (lo llama Make/Zapier):** cualquier POST cuyo body **no** sea `{action:"drain"}`.

```js
function doPost(e) {
  const body = e.postData.contents;
  const parsed = safeJson(body);
  if (parsed && parsed.action === "drain") return drain(parsed);   // ← lo llama Hito

  // Ingreso desde Make/Zapier:
  if (INBOX_SECRET && e.parameter.secret !== INBOX_SECRET
      && (e.postData.type || "").indexOf(INBOX_SECRET) < 0) {
    return json({ status: 401, data: { error: "bad secret" } });
  }
  const delivery = {
    deliveryId: Utilities.getUuid(),
    receivedAt: new Date().toISOString(),
    body: parsed ?? { raw: body },
  };
  appendToBuffer(delivery);                 // cola FIFO acotada (ver §3.2)
  return json({ status: 200, data: { deliveryId: delivery.deliveryId } });
}
```

**b) Drenado (lo llama Hito):** POST `{ action:"drain", cursor:"<iso>", max:100 }`.

```js
function drain(req) {
  const all = readBuffer();                             // ordenado por receivedAt asc
  const pending = all.filter(d => d.receivedAt > (req.cursor || ""));
  const batch = pending.slice(0, req.max || 100);
  const nextCursor = batch.length ? batch[batch.length-1].receivedAt : (req.cursor || "");
  return json({ status: 200, data: { deliveries: batch, nextCursor, backlog: pending.length } });
}
```

- Envelope `{status,data}` — lo desenvuelve [proxy-envelope.ts](src/integrations/inbound/proxy-envelope.ts)
  tal cual (ya es la fuente de verdad para los 4 pollers).
- Hito llama con `text/plain` (evita el preflight CORS que Apps Script no responde — ver
  [proxy-fetch.ts:30-42](src/integrations/proxy-fetch.ts#L30-L42)). El drain **no borra** el buffer: se
  avanza por cursor `receivedAt` (idempotente; un re-drain del mismo cursor no pierde nada). La limpieza
  la hace el propio proxy por retención (§3.2), no el ack de Hito — así un fallo de Hito a mitad de
  proceso nunca pierde entregas.

### 3.2 Almacén del buffer en el proxy: decisión

| Opción | Límite Apps Script | Veredicto |
|---|---|---|
| `PropertiesService` (Script Properties) | ~500 KB total, 9 KB por valor | Suficiente para colas pequeñas; requiere fragmentar |
| **Pestaña de Sheet dedicada** | Millones de filas; `LockService` para concurrencia | **Recomendada** — retención natural por filas, fácil de inspeccionar, tolera ráfagas |
| `CacheService` | 6 h TTL, se puede evaporar | Descartada (pérdida silenciosa) |

**Decisión:** pestaña de Sheet (`_hito_inbox`) con `LockService` para el append concurrente. Retención
FIFO configurable (default 500 filas / 7 días); al superar, se borran las más viejas y el drain reporta
`backlog` para que el panel de salud (Fase E) avise. La guía (Fase D) crea la hoja automáticamente en
el primer `doPost` si no existe.

### 3.3 Poller y registro en Hito

```ts
// src/integrations/inbound/inbox-poller.ts (NUEVO)
export async function drainInbox(
  config: { proxyUrl: string }, secret: string | null, cursor: string | null
): Promise<{ records: Record<string, unknown>[]; nextCursor: string; backlog: number }> {
  const res = await postToProxy<{ deliveries: InboxDelivery[]; nextCursor: string; backlog: number }>(
    config.proxyUrl, { action: "drain", cursor: cursor ?? "", max: 100, secret }
  );
  if (!res.ok) throw new Error(res.message);
  // cada delivery → un record plano para el Flujo, con deliveryId/receivedAt disponibles en {{}}
  const records = res.data.deliveries.map(d => ({ deliveryId: d.deliveryId, receivedAt: d.receivedAt, ...flatten(d.body) }));
  return { records, nextCursor: res.data.nextCursor, backlog: res.data.backlog };
}
```

- `src/integrations/inbound/inbox-polling-manager.ts` (NUEVO): hermano de
  `hubspot-polling-manager.ts`/`sheets-polling-manager.ts`. Usa `pollTriggerKey` (024 §F10) →
  `inbox:${connectionId}`. Registra en `pollingManager` con el `intervalMs` del trigger. Al drenar:
  filtra cada `deliveryId` por [idempotency.ts](src/integrations/inbound/idempotency.ts), corre
  `runPolledFlow(flow, records)` (el camino `externalData` ya existente), y persiste `nextCursor` vía
  `poll-sync-state.ts`.
- `useFlowStore.addFlow/updateFlow/deleteFlow` ya registran/desregistran polling para triggers `poll`
  (019); solo hay que enrutar `provider:"inbox"` a `inbox-polling-manager` (switch por provider, como ya
  se hace con hubspot vs sheets).

### 3.4 Cambios en el engine

`pollTriggerKey`, `matchesTrigger`, `resolveTriggerData` en [engine.ts](src/flows/engine.ts) ya ramifican
por provider; se agrega la rama `"inbox"` → key `inbox:${connectionId}`, sin `objectType`. La ejecución
(condición → transformación → outputs) es idéntica: para el engine, una entrega de inbox es un `record`
más.

### 3.5 Catch-up

`initVisibilityAwarePolling` ([visibility-aware.ts](src/integrations/polling/visibility-aware.ts)) ya
hace un poll inmediato al recuperar foco; el registro inbox se beneficia gratis. Al **abrir** la app, el
re-registro de pollers al hidratar Flows ([App.tsx:245-268](src/App.tsx#L245-L268)) dispara el primer
drain, que trae todo el backlog buffered (limitado por `max` por tick; si hay más, ticks sucesivos lo
terminan). Un delivery drenado en un tick previo no se re-procesa (cursor + idempotencia).

## 4. Fase C — Delivery log + replay

### 4.1 Datos

Se extiende `syncLogs` (ya cableado a `DeliveryDetailDrawer`/`SyncLogsPage`, 018 §10.3) — no una tabla
nueva. Por entrega saliente (`webhook`/`email`) se persiste:

```ts
// campos ya en SyncLog (018 §4.2) + uso pleno:
direction: "outbound",
provider: "webhook" | "email",
requestPayload: rawBody,               // truncado a 10 KB, secreto NO va aquí
responsePayload: firstBytes,           // truncado a 10 KB
httpStatus, errorMessage, retryCount,  // reusa el conteo de retry de 027 §E
// headers de firma con el secreto enmascarado ("sha256=…"/"••••")
```

Entradas inbound (Fase B): `direction:"inbound"`, `provider:"inbox"`, `requestPayload` = body recibido,
más el desenlace del Flujo disparado.

### 4.2 Replay

```
"Reenviar" (DeliveryDetailDrawer) → ConfirmDialog (llamada real, criterio 025 §D)
  → reconstruye con buildWebhookRequest(output, data)   // misma firma verificable de Fase A
  → fetch → registra un SyncLog nuevo (retryCount++, o attempt manual)
```

El `output` y el `data` originales se toman del `SyncLog`/`flow-run` asociado. Enmascarar el secreto en
todo momento (nunca sale del vault en claro a la UI).

## 5. Cambios de schema (un solo bump)

```ts
// src/domain/schemas/flow.ts
PollTriggerSchema.provider: z.enum(["hubspot","google-sheets","inbox"])  // + inbox
WebhookOutputSchema.payloadShape: z.enum(["envelope","bare"]).optional() // ausente = bare

// src/storage/integration-db.ts
type ConnectionProvider = "hubspot" | "google-sheets" | "email" | "webhook-inbox"  // + webhook-inbox
```

- `SCHEMA_VERSION` bump (14→15) con **paso identidad** en `migrations.ts` (patrón de 026/027): todos los
  campos nuevos son opcionales/defaulted, ningún flujo existente se transforma.
- `ConnectionProvider` en Dexie no está bajo `SCHEMA_VERSION` (es la base `hito-integrations`, 018 §4.1);
  solo se amplía el union de tipos + las ramas de `runConnectionProbe`/`AppsScriptGuide`/UI.

## 6. Seguridad

| Vector | Mitigación |
|---|---|
| Firma saliente inverificable (bug actual) | Fase A: firmar el body real + transmitir `id`/`timestamp` en headers |
| Replay de un webhook saliente | `X-Hito-Timestamp` transmitido; el receptor rechaza fuera de ventana |
| Inyección en el inbox por un tercero que descubre la URL | `X-Hito-Inbox-Secret` opcional (recomendado) verificado en el proxy antes de encolar |
| Secreto del inbox / HMAC en claro en la UI o logs | Cifrado en el vault (connections.ts ya lo hace); enmascarado en `syncLogs` y en la traza (criterio 024 §F4 / 026 §E) |
| Buffer del proxy accesible ("Cualquier persona") | El drain requiere el mismo secret; el ingreso también. Documentar que la URL del inbox es sensible |

## 7. Reutilización (qué NO se construye)

- `pollingManager`, backoff, visibility-aware, idempotency, poll-sync-state, proxy-fetch,
  proxy-envelope, `runPolledFlow`/`applyFlowResult` → **se reusan tal cual**; el inbox es "un provider
  más" sobre esos rieles.
- `DeliveryDetailDrawer`/`SyncLogsPage`/`maintenance` (rotación de logs) → ya cableados; Fase C solo los
  alimenta con datos ricos + botón Reenviar.
- `templates.ts`/`AppsScriptGuide`/`/docs` → patrones ya establecidos (027 §C, 018, 029).

## 8. Riesgos y decisiones abiertas

| # | Riesgo | Mitigación |
|---|---|---|
| R1 | Buffer del proxy desborda con Hito cerrado mucho tiempo | Retención documentada + `backlog` en el drain + aviso en panel de salud (Fase E). Es el caveat honesto del modelo local-first. |
| R2 | Concurrencia de append en el Sheet del inbox bajo ráfaga de Make | `LockService` en `doPost`; batch de drain acotado |
| R3 | El receptor verifica sobre body re-serializado (claves reordenadas) y la firma no coincide | La receta (Fase A) exige verificar sobre el **raw body**; se documenta explícitamente |
| R4 | `PollTrigger` asume `objectType`/`fields` en la UI de HubSpot | La rama inbox oculta esos campos; `validateFlow` (027 §A) ya reporta `connectionId` vacío |
| R5 | Dónde vive exactamente el `objectType` no aplica a inbox pero el schema lo permite (opcional) | Validación: `provider:"inbox"` ignora `objectType`; test lo fija |
| **D1** | ¿Sheet-tab vs Properties para el buffer? | **Decidido:** Sheet-tab (§3.2). Confirmar límites reales de `LockService` en Fase 0 de tasks. |
| **D2** | ¿El drain borra (ack) o solo avanza cursor? | **Decidido:** solo cursor; la retención la hace el proxy. Evita pérdida por fallo parcial de Hito. |
| **D3** | ¿`payloadShape` default para webhooks nuevos? | **Decidido:** `"envelope"` en la UI de creación; ausente (guardados) = `"bare"`. |

## 9. Plan de tests (resumen; detalle en tasks.md)

- **A:** `signing.test.ts` (`signRaw`/`verifyRaw`), `webhook-request.test.ts` (firma == HMAC del body
  enviado en envelope y bare; headers de delivery/timestamp; retrocompat sin `payloadShape`).
- **B:** `inbox-poller.test.ts` (drain con cursor/batch/vacío/error), engine (trigger inbox matchea +
  key por conexión), idempotencia (delivery repetido no re-ejecuta), catch-up (backlog en varios ticks).
- **C:** captura enmascara secreto; replay reconstruye la misma firma; inbound registrado.
- **D:** `templates.test.ts` (2 nuevas parsean + placeholders exactos), `DOC_SLUGS` incluye la guía.
- **E:** salud deriva de `syncLogs`; semáforo cuenta Flujos por conexión.
