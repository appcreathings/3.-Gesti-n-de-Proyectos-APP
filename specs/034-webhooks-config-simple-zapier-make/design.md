# Design 034 — Webhooks salientes simples + guía Zapier/Make

Diseño técnico de la spec 034. Anclado al código tras spec 033. Principio rector: **el primer contacto
debe ser trivial** (payload plano, sin firma, sin vault); firma/envelope son un upgrade opt-in. No
romper webhooks ni suscripciones ya guardados.

Estado inicial: `SCHEMA_VERSION = 16` (tras spec 033 C1). Los webhooks (Camino 1) viven en el schema de
dominio `flows`; las suscripciones (Camino 2) viven en Dexie `hito-integrations` (fuera de
`SCHEMA_VERSION`).

---

## Fase A — Webhook limpio (Flow webhook output)

### Semántica del secreto vacío = sin firma

Hoy `buildWebhookRequest` firma siempre (aún con `secret: ""`, `signRaw("", body)` produce una firma).
Cambio: **secreto vacío ⇒ no se firma y no se envían headers de firma.**

```ts
// webhook-request.ts
const shouldSign = output.secret.trim().length > 0;
// ...
const headers: Record<string, string> = { "Content-Type": "application/json" };
if (shouldSign) {
  const signature = await signRaw(rawBody, output.secret);
  headers["X-Hito-Signature"] = signature;
  headers["X-Hito-Event"] = "flow.execution";
  headers["X-Hito-Delivery"] = deliveryId;
  headers["X-Hito-Timestamp"] = timestamp;
}
```

`WebhookRequest.signature`/`deliveryId`/`timestamp` pasan a opcionales (o cadena vacía cuando no se
firma) — los consumidores (`webhook-test.ts`, `DeliveryDetailDrawer` replay) ya toleran ausencia.

### Default simple

`meta.ts` `defaultOutput("webhook")` → `{ type:"webhook", url:"", secret:"", payloadShape:"bare" }`
(hoy `payloadShape:"envelope"`). Revierte la decisión de 032 §A para webhooks **nuevos**; los guardados
conservan su `payloadShape` persistido (retrocompat total — el motor lee el valor del output, no un
default global).

### UI: preset Simple / Firmado

En `ActionConfigFields` (webhook), reemplazar el selector "Formato del envío" por un preset de dos
opciones derivado de `secret` + `payloadShape`:

| Preset | `secret` | `payloadShape` | Qué llega |
|---|---|---|---|
| **Simple (recomendado para empezar)** | `""` | `"bare"` | Payload plano, sin headers de firma |
| **Firmado (envelope verificable)** | generado/editable | `"envelope"` | Envelope + `X-Hito-*` |

Al elegir Simple: ocultar/limpiar el campo Secret. Al elegir Firmado: mostrar Secret (con generador
`whsec_…`) + el link a `WebhookSignatureGuide`. El editor de payload personalizado y la vista previa
(Fase C) son ortogonales al preset.

### Engine

El caso `webhook` de `engine.ts` no cambia su lógica —usa `buildWebhookRequest`, que ya decide firmar o
no—. Solo la traza (`resolved`) omite datos de firma cuando no se firmó.

### Tests

`webhook-request.test.ts`: secreto vacío ⇒ sin `X-Hito-Signature`, body plano; secreto presente ⇒ firma
verificable (baseline 032). `meta` default = bare/sin secreto. Retrocompat: output con `payloadShape`
persistido no cambia.

---

## Fase B — Suscripciones sin vault + arreglar el desencriptado

### Schema Dexie

`WebhookSubscription.encryptedSecret: EncryptedPayload` → **`secret?: string`** (en claro, opcional).
Nueva versión Dexie (`this.version(3)`) con un `upgrade` que, para cada suscripción existente:

```ts
// migración Dexie v2→v3 (dentro de integration-db.ts)
// Si el vault está desbloqueado en ese momento, descifrar y reguardar en claro;
// si no, marcar { secret: undefined, needsReconnect: true } para que la UI pida
// reconfigurar el secreto (no se puede descifrar sin la key).
```

Como el `upgrade` de Dexie es sync y el descifrado es async (vault), en la práctica la migración se hace
**perezosa en el arranque** (una función `migrateWebhookSubscriptionSecrets()` llamada en el bootstrap
tras hidratar, cuando el vault ya pudo restaurarse) en vez de dentro del `upgrade` de Dexie. La versión
Dexie solo cambia la forma del store; el descifrado one-shot vive en esa función.

### Dispatcher

```ts
// dispatcher.ts — sin decrypt
for (const sub of matchingSubs) {
  const payload = buildPayload(event, workspaceOrg);
  const secret = sub.secret?.trim() || null;
  const signature = secret ? await signRaw(JSON.stringify(payload), secret) : null;
  // ... encolar con signature? (header solo si existe). Si sub.needsReconnect → log de fallo
  //     en syncLogs (spec 033 A1) en vez de `continue` mudo.
}
```

El `retry-engine` que consume `outboundQueue` envía el header `X-Hito-Signature` solo si la entrega lo
trae. Sin secreto ⇒ webhook plano (coherente con Fase A).

### Diálogo

`WebhookSubscriptionDialog`: quitar el gate de vault (líneas 81-87) y el `encrypt`; guardar `secret` en
claro (o vacío). El campo Secret pasa a editable (con generador) y opcional; el preset Simple/Firmado
de Fase A aplica igual aquí. Al editar, si `needsReconnect`, pedir reingresar el secreto.

### Observabilidad del fallo

Ningún `continue` silencioso: si una suscripción no puede enviar (p. ej. `needsReconnect`), registrar
`syncLogs` con `direction:"outbound", provider:"webhook", status:"error"` describiendo la causa — visible
en `SyncLogsPage` (spec 033 A1).

### Tests

`dispatcher.test.ts`: sin secreto ⇒ sin firma, se encola igual; con secreto ⇒ firma; `needsReconnect` ⇒
log de error, no silencio. Migración: cifrado→claro con vault desbloqueado; sin vault ⇒ `needsReconnect`.

---

## Fase C — Vista previa exacta del payload

`ActionConfigFields` (webhook): la vista previa ya interpola el payload; agregar:
- Encabezado **"Esto es lo que recibirá Make/Zapier"**.
- Reflejar el modo: en Simple, el JSON plano; en Firmado, el envelope completo + una línea de headers
  `X-Hito-Signature`, `X-Hito-Timestamp`, `X-Hito-Delivery`.
- Construir la vista desde `buildWebhookRequest` (o su lógica de body) para que sea **byte-fiel** a lo
  que se enviará, no una aproximación.

Sin tests nuevos obligatorios (presentación sobre módulos ya testeados); smoke visual.

---

## Fase D — Guía "Conectar con Zapier/Make" + prueba sin muestra

### Guía

Nuevo componente `WebhookQuickstartGuide` (patrón `WebhookSignatureGuide`), con dos pestañas
Zapier/Make y los pasos: crear Catch Hook → copiar URL → pegar en Hito (modo Simple) → "Enviar prueba"
→ mapear campos → (opcional) subir a Firmado. Enlazado desde el drawer del webhook y desde `/docs`.

### "Enviar prueba" sin muestra

`webhook-test.ts` `testWebhook(output, sampleRecord)` hoy exige un `sampleRecord`. Cambio: si no hay
muestra, usar un **payload de ejemplo mínimo** (`{ demo: true, mensaje: "Prueba desde Hito", … }`) para
que el primer contacto no dependa de haber probado el trigger. La UI habilita "Enviar prueba" siempre
(con `ConfirmDialog`, envío real, criterio 025 §D).

### Tests

`webhook-test.test.ts`: sin muestra usa el ejemplo; con muestra usa el registro real.

---

## Fase E — Consolidación (suscripciones → Flujos)

Un webhook saliente = Flujo `trigger: event` + `output: webhook`. Migrar cada `WebhookSubscription` a un
`FlowRule` equivalente (uno por evento suscrito, o un flujo con condición por tipo), reusando el patrón
de `migrateLegacyAutomations` (019 §E). La pestaña "Webhooks" de Integraciones pasa a un asistente
"webhook rápido" que crea ese Flujo, o redirige a Flujos filtrado por outputs de webhook. `dispatcher.ts`
+ `outboundQueue` + `retry-engine` quedan deprecados una vez migrado (el output de Flujo ya tiene
reintentos sincrónicos, 027 §E). Hacer **después** de B, con la migración cubierta por tests, sin romper
suscripciones activas hasta migrarlas.

---

## Resumen de cambios de schema

| Fase | Qué | Dónde |
|---|---|---|
| A | `WebhookOutput.secret` semántica de vacío = sin firma; default `payloadShape:"bare"` | `flow.ts`/`meta.ts` — sin bump (semántica, no shape) |
| B | `WebhookSubscription.encryptedSecret` → `secret?` (claro) + `needsReconnect?` | Dexie `hito-integrations` v2→v3 |
| C/D | — | — |
| E | migración suscripciones → `flows` | doc `flows` (sin bump: crea FlowRule válidos) |

## Plan de tests (resumen)

- **A:** secreto vacío = sin firma/plano; con secreto = firma; default nuevo = simple; retrocompat.
- **B:** dispatcher sin/ con secreto; `needsReconnect` loguea; migración cifrado→claro.
- **C:** (smoke) vista previa fiel por modo.
- **D:** `testWebhook` sin muestra usa ejemplo.
- **E:** migración suscripción→Flujo equivalente dispara igual.
