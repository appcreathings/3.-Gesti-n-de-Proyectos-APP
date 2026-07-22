# Spec 034 — Webhooks salientes: configuración simple sin fricción y guía Zapier/Make

## Progreso

- **Estado general: 🟨 EN EJECUCIÓN (2026-07-22).** Nace de un reporte del usuario tras usar los
  webhooks con Zapier/Make: **(1) los datos llegan con una forma distinta a la esperada, (2) la lógica
  de desencriptado da error, y (3) falta una forma de configurar un webhook "limpio" sin encriptación
  para el primer contacto.** Se auditó el código real de los dos caminos de webhook saliente que hoy
  coexisten (Flow webhook output + suscripciones legacy) y la guía existente.

- **✅ Fase A — Webhook limpio (2026-07-22).** Firma opcional: `webhook-request.ts` con secreto vacío
  (o whitespace) NO firma y NO emite headers `X-Hito-*` — solo `Content-Type` + body (plano o envelope
  según `payloadShape`); `signature = ""`. Con secreto ⇒ firma verificable de 032 intacta. Default de
  webhooks nuevos revertido a Simple (`meta.ts`: `payloadShape:"bare"`, `secret:""`); los guardados
  conservan su valor persistido (retrocompat total — el motor lee el output). UI: preset **Simple** /
  **Firmado** en `ActionConfigFields` (deriva de `secret`); Simple limpia el secreto + payload plano,
  Firmado revela Secret con "Generar" + link a la guía de verificación + envelope. `webhook-test.ts` y
  el replay de `DeliveryDetailDrawer` ya toleran firma ausente.
  - **Archivos:** `src/flows/webhook-request.ts`, `src/features/flows/canvas/meta.ts`,
    `src/features/flows/canvas/ActionConfigFields.tsx`.
  - **Tests:** `webhook-request.test.ts` (+3: sin firma/plano, whitespace = vacío, envelope sin firma),
    `meta.test.ts` (nuevo: default bare/sin secreto). **634/634** (629 baseline + 5).
  - **Verificación:** `tsc --noEmit` ✅ · `eslint .` ✅ (3 errores preexistentes ajenos, sin nuevos) ·
    `vitest run` ✅ 634/634 · `vite build` ✅.
  - **Pendiente del usuario (E2E manual, no automatizable aquí):** crear un webhook Simple →
    `webhook.site`/Catch Hook real de Zapier/Make → confirmar payload plano SIN `X-Hito-Signature`.

## Context

Hoy existen **dos superficies distintas para enviar webhooks**, con modelos incompatibles — y esa
dualidad es la raíz de la confusión:

### Camino 1 — Output `webhook` de un Flujo (moderno, `FlowBuilder`)

- Secreto **inline en claro** (no vault), firma HMAC sobre el body real (spec 032 §A), reintentos
  (027 §E), "Probar webhook", vista previa.
- **Problema de shape:** desde spec 032, los webhooks nuevos nacen con `payloadShape: "envelope"`
  ([meta.ts](src/features/flows/canvas/meta.ts)) → Make/Zapier reciben
  `{ eventId, eventType, timestamp, workspace, data: {…} }` en vez del payload plano. El "Catch Hook"
  de Make autodetecta campos del primer payload; con el envelope, los campos reales quedan anidados bajo
  `data.*` y mezclados con metadata → **"los datos llegan diferentes a lo esperado"**.
- **No hay modo sin firma:** `WebhookOutputSchema.secret: z.string()` es obligatorio, y aún con
  `secret: ""` el motor calcula y envía `X-Hito-Signature` (HMAC con clave vacía). No existe un webhook
  verdaderamente "limpio" (payload plano, sin headers de firma).

### Camino 2 — Suscripciones de webhook (legacy, pestaña "Webhooks" de Integraciones)

- `dispatchOutboundEvents` **sí está cableado** ([useDataStore.ts:682-685](src/store/useDataStore.ts#L682-L685))
  y dispara en cada mutación de dominio.
- **Bug de desencriptado (silencioso):** `WebhookSubscriptionDialog` **obliga** a desbloquear el vault
  ([WebhookSubscriptionDialog.tsx:81-87](src/features/integrations/WebhookSubscriptionDialog.tsx#L81-L87))
  y **cifra el secreto siempre**. En el envío, `dispatcher.ts` lo **desencripta**
  ([dispatcher.ts:33-39](src/integrations/outbound/dispatcher.ts#L33-L39)); si el vault está **bloqueado**
  (auto-lock a los 10 min, o recarga sin persistencia de key), `decrypt()` lanza → el webhook se
  **descarta en silencio** (`continue` + un `console.error`). El usuario no se entera: el webhook
  simplemente nunca sale. **Esta es "la lógica de desencriptado da error".**
- **Shape aún más confuso:** el body es el envelope `{ eventId, eventType, timestamp, workspace, data }`
  donde `data` es el **DomainEvent interno crudo** (`{ type, projectId, taskId, from, to, … }`,
  [dispatcher.ts:54-62](src/integrations/outbound/dispatcher.ts#L54-L62)) — no un payload pensado para
  el usuario. Doble fuente de "datos diferentes a lo esperado".
- El secreto se autogenera y se muestra enmascarado; al editar no se puede regenerar
  ([WebhookSubscriptionDialog.tsx:66-79](src/features/integrations/WebhookSubscriptionDialog.tsx#L66-L79)).

### La guía existente no cubre el primer contacto

`WebhookSignatureGuide` es una guía de **verificación de firma HMAC** (Express/Python/Zapier/Make) —
material avanzado. **No existe** una guía de "primeros pasos" tipo "creá un Catch Hook en Zapier/Make,
pegá la URL, mandá una prueba, mirá que llegó" — que es lo que un usuario necesita antes de pensar en
firmas.

**Resultado buscado:** que enviar un webhook a Zapier/Make sea **trivial en el primer intento** (payload
plano, sin firma, sin vault, sin envelope), con una guía clara que muestre exactamente qué llega; y que
"firmar" y "envelope" sean una mejora **opt-in** para quien la necesite. Y que el bug de desencriptado
silencioso deje de existir.

**Outcome medible:**
- Un usuario nuevo puede crear un webhook, pegar la URL de su Catch Hook, pulsar "Enviar prueba" y verlo
  llegar a Make/Zapier con el **payload plano exacto** que ve en la vista previa — sin tocar el vault ni
  entender firmas (Fase A, D).
- Ningún webhook se descarta en silencio por el vault bloqueado; la firma es opcional y su secreto no
  exige encriptación (Fase B).
- El editor muestra, palabra por palabra, el JSON que recibirá Make/Zapier en cada modo (Fase C).
- Hay una guía de "Conectar con Zapier/Make" de primeros pasos, separada de la de verificación de firma
  (Fase D).

## Convención de estado

- ✅ **Ya construido** — existe en producción.
- 🟡 **Parcial / con bug** — construido pero incorrecto o con fricción.
- ❌ **Gap** — no existe.

---

## Fase A — Modo "webhook limpio": firma opcional y payload plano por defecto

**Estado:** ✅ Implementado (2026-07-22) — firma opcional + default Simple. Ver Progreso.

**Problema actual:** gaps de shape y de firma del Camino 1.

**Propuesta:**
- **Secreto/firma opcional:** cuando `secret` está vacío, el motor **no** firma ni envía
  `X-Hito-Signature`/`X-Hito-Delivery`/`X-Hito-Timestamp` — envía solo el body (payload plano o envelope
  según `payloadShape`) con `Content-Type: application/json`. `buildWebhookRequest`
  ([webhook-request.ts](src/flows/webhook-request.ts)) ya recibe el `output`; se agrega la rama "sin
  secreto → sin firma".
- **Default simple para webhooks nuevos:** `meta.ts` `defaultOutput("webhook")` pasa a
  `{ url:"", secret:"", payloadShape:"bare" }` — payload plano, sin firma. Es la configuración que "just
  works" con un Catch Hook. Firmar/envelope quedan como upgrade explícito en el drawer.
  - **Revisión de la decisión de 032:** spec 032 §A puso `payloadShape:"envelope"` como default nuevo;
    esta spec lo revierte a `"bare"` porque la fricción del envelope en el primer contacto supera el
    beneficio de la verificación (que la mayoría no configura). Envelope + firma siguen disponibles y
    documentados. Retrocompat: los webhooks ya guardados no cambian (su `payloadShape` persistido manda).
- **UI:** en `ActionConfigFields` (webhook), el selector de "Formato del envío" gana un preset claro:
  **"Simple (payload plano, sin firma)"** (default) vs **"Firmado (envelope verificable)"**. Al elegir
  "Simple", el campo Secret se oculta/limpia; al elegir "Firmado", aparece con el generador y la guía de
  verificación.

**Criterios de aceptación:**
- **Dado** un webhook con secreto vacío en modo Simple, **cuando** corre, **entonces** el body es el
  payload plano y **no** hay header `X-Hito-Signature`.
- **Dado** un webhook nuevo recién creado, **cuando** se abre, **entonces** está en modo Simple (plano,
  sin firma) por defecto.
- **Dado** un webhook firmado existente, **cuando** corre tras esta spec, **entonces** sigue firmando
  igual (retrocompat).

**Prioridad:** Alta — es el corazón del pedido ("webhook limpio sin encriptación", "datos como se
esperan"). Esfuerzo bajo-medio.

---

## Fase B — Arreglar el desencriptado silencioso y quitar la fricción del vault

**Estado:** 🟡 Bug de correctitud (Camino 2) — el webhook se descarta si el vault está bloqueado.

**Problema actual:** gaps del Camino 2 (desencriptado + fricción de vault).

**Propuesta (decisión de diseño):** el secreto de firma de un webhook **no es una credencial de acceso
a datos del usuario** (es una clave HMAC compartida que el propio usuario pega también en Make/Zapier);
cifrarla en el vault añade fricción y un modo de fallo silencioso, sin un beneficio de seguridad real.
Por eso:
- **Suscripciones sin vault:** `WebhookSubscription` guarda el secreto **en claro** (`secret: string`) o
  **sin secreto** (opcional), no `encryptedSecret`. `dispatcher.ts` deja de desencriptar — usa el
  secreto tal cual (y **omite la firma** si no hay secreto). Migración de las suscripciones existentes:
  si el vault está disponible al migrar, descifrar una vez y reguardar en claro; si no, marcar la
  suscripción como "reconfigurar secreto" en vez de romperla.
- **Sin bug silencioso:** si por lo que sea una suscripción no puede firmar, se **registra el fallo en
  `syncLogs`** (spec 033 A1) en vez de un `continue` mudo — el usuario lo ve en el historial.
- **Eliminar la exigencia de vault** en `WebhookSubscriptionDialog` (líneas 81-87): crear un webhook ya
  no pide desbloquear nada.

**Nota de consolidación:** ver Fase E — a mediano plazo el Camino 2 (suscripciones) se solapa con el
output webhook de un Flujo (event trigger → webhook). Esta fase primero lo **arregla**; la consolidación
de superficies se evalúa aparte para no romper suscripciones activas de golpe.

**Criterios de aceptación:**
- **Dado** una suscripción con el vault bloqueado, **cuando** ocurre un evento, **entonces** el webhook
  **se envía** (ya no se descarta) — o, si falla por otra causa, queda registrado en el historial.
- **Dado** crear una suscripción nueva, **cuando** el usuario la guarda, **entonces** **no** se le pide
  desbloquear el vault.
- **Dado** suscripciones existentes con secreto cifrado, **cuando** se migran, **entonces** siguen
  firmando con el mismo secreto (o se marcan para reconfigurar si el vault no estaba disponible).

**Prioridad:** Alta — es el bug "la lógica de desencriptado da error". Esfuerzo medio (toca schema Dexie
+ migración de suscripciones).

**Riesgo:** el secreto en claro vive en Dexie (IndexedDB local). Aceptable para una clave HMAC de
webhook en una app local-first mono-usuario (no es un token que dé acceso a los datos del usuario);
documentarlo. El export de workspace no incluye estos secretos (mismo criterio que 024 §F14 / 033 C4).

---

## Fase C — Vista previa exacta del payload ("esto es lo que recibe Make/Zapier")

**Estado:** 🟡 Parcial — hay una vista previa del payload interpolado, pero no deja claro el envelope vs
plano ni que "esto es literalmente lo que llega".

**Propuesta:**
- La vista previa del drawer del webhook muestra el **body final exacto** según el modo (plano o
  envelope), con un encabezado claro: **"Esto es lo que recibirá Make/Zapier"**, y —en modo firmado— la
  lista de headers `X-Hito-*` que acompañan.
- Para el Camino 2 (suscripciones), documentar/mostrar el shape del envelope con `data` = el evento, y
  (ideal) permitir un payload más limpio; como mínimo, la guía lo explica.
- Reusa el módulo de interpolación (026 §A) — la vista previa ya es fiel al motor.

**Criterios de aceptación:**
- **Dado** un webhook en modo Simple con muestra cargada, **cuando** se abre el drawer, **entonces** se
  ve el JSON plano exacto que llegará, rotulado como tal.
- **Dado** el modo Firmado, **cuando** se abre, **entonces** se ve el envelope + los headers de firma.

**Prioridad:** Media-alta — ataca directamente "los datos llegan diferentes a lo esperado" haciéndolos
predecibles antes de enviar. Esfuerzo bajo (la vista previa ya existe; es rótulo + fidelidad al modo).

---

## Fase D — Guía de primeros pasos "Conectar con Zapier/Make"

**Estado:** ❌ Gap — solo existe la guía de verificación de firma (avanzada).

**Propuesta:**
- Nueva guía "Conectar con Zapier/Make" (paso a paso, patrón `AppsScriptGuide`/`WebhookSignatureGuide`):
  1. En Zapier: *Zapier → Trigger "Webhooks by Zapier" → Catch Hook → copiar la URL*. En Make: *Custom
     webhook → Add → copiar la URL*.
  2. Pegar la URL en el webhook de Hito, dejar el modo **Simple**.
  3. Pulsar **"Enviar prueba"** (reusa `webhook-test.ts`) → en Zapier/Make aparece el registro con el
     payload plano → mapear los campos.
  4. (Opcional) Subir a modo **Firmado** y verificar con la guía existente.
- Enlazada desde el drawer del webhook y desde `/docs` (guía nueva o sección en
  `conectar-make-zapier-n8n`, spec 032 §D).
- Botón "Enviar prueba" disponible aunque no haya `lastSample` (usa un payload de ejemplo mínimo), para
  no bloquear el primer contacto.

**Criterios de aceptación:**
- **Dado** un webhook nuevo, **cuando** el usuario abre la guía, **entonces** obtiene los pasos exactos
  de Zapier y Make y puede enviar una prueba que llega.
- **Dado** que no hay muestra del trigger, **cuando** pulsa "Enviar prueba", **entonces** igual se envía
  un payload de ejemplo y ve el resultado.

**Prioridad:** Media-alta — es la mejora de experiencia pedida. Esfuerzo medio (contenido + wiring del
test sin muestra).

---

## Fase E — Consolidar las dos superficies de webhook (reducir la confusión)

**Estado:** 🟡 Deuda de producto — dos formas de hacer lo mismo (suscripciones legacy vs output webhook
de Flujo) confunden y duplican.

**Propuesta:** a mediano plazo, **un solo modelo**: un webhook saliente = un Flujo con trigger de evento
+ output webhook (ya soporta todo: eventos, plano/firmado, reintentos, historial, replay de 033 A1). La
pestaña "Webhooks" de Integraciones pasa a: (a) listar los webhooks de evento existentes con acceso a
crearlos como Flujo, o (b) un asistente "webhook rápido" que crea ese Flujo por debajo. Migrar las
suscripciones legacy a Flujos (como se migraron las Automatizaciones legacy, 019 §E). Documentar el
cambio; no romper suscripciones activas hasta migrarlas.

**Criterios de aceptación:**
- **Dado** una suscripción legacy, **cuando** se migra, **entonces** existe como Flujo evento→webhook
  equivalente y sigue disparando.
- **Dado** un usuario nuevo, **cuando** quiere un webhook, **entonces** hay **un** camino claro.

**Prioridad:** Media — alto valor de claridad, esfuerzo medio-alto (migración + UI). Se hace **después**
de que B arregle el bug, para no bloquear el fix urgente en el rediseño.

---

## Fuera de alcance (documentado)

- **Editor JSON libre / método y headers HTTP custom** en el webhook — es la spec 033 §B3, independiente.
- **Verificación de firma entrante** (inbox) — spec 033 §B4.
- **Cifrado del secreto de webhook en reposo** — se abandona deliberadamente (Fase B); la clave HMAC no
  amerita la fricción del vault. Los secretos de proveedores reales (HubSpot token) sí siguen cifrados.
- **Firmar el envelope legacy correctamente** más allá de arreglar el desencriptado — la consolidación
  (Fase E) lo vuelve redundante.

## Roadmap (impacto vs. esfuerzo)

| Fase | Prioridad | Esfuerzo |
|---|---|---|
| A · Webhook limpio (firma opcional + plano por defecto) | Alta | Bajo-medio |
| B · Arreglar desencriptado + quitar fricción de vault | Alta | Medio |
| C · Vista previa exacta del payload | Media-alta | Bajo |
| D · Guía primeros pasos Zapier/Make + "Enviar prueba" | Media-alta | Medio |
| E · Consolidar superficies (suscripciones → Flujos) | Media | Medio-alto |

Secuencia sugerida: **A → C → D** (el arco de "configuración fácil y clara", paralelizable) y **B** en
paralelo (arregla el bug urgente), dejando **E** para el final (rediseño que apoya en B).

## Archivos clave

- **A:** `src/flows/webhook-request.ts` (rama sin firma), `src/domain/schemas/flow.ts`
  (`secret` opcional / semántica de vacío), `src/features/flows/canvas/meta.ts` (default),
  `src/features/flows/canvas/ActionConfigFields.tsx` (preset Simple/Firmado), `src/flows/engine.ts`
  (no firmar sin secreto).
- **B:** `src/storage/integration-db.ts` (`WebhookSubscription.secret` en claro / opcional),
  `src/integrations/outbound/dispatcher.ts` (sin decrypt, firma opcional, log de fallo),
  `src/features/integrations/WebhookSubscriptionDialog.tsx` (sin exigir vault), migración de
  suscripciones.
- **C:** `src/features/flows/canvas/ActionConfigFields.tsx` (rótulo + fidelidad de modo),
  `InterpolationPreview`/`webhook-request.ts`.
- **D:** nueva guía (patrón `WebhookSignatureGuide.tsx`), `src/flows/webhook-test.ts` (prueba sin
  muestra), `/docs` (`conectar-make-zapier-n8n`).
- **E:** `src/store/useFlowStore.ts` (migración suscripciones→Flujos), `IntegrationsPage.tsx`
  (pestaña Webhooks), `dispatcher.ts` (deprecación).

## Verificación

- `npm run typecheck && npm run lint && npm test && npm run build` en verde con tests nuevos por fase.
- Smoke E2E manual (no automatizable aquí): crear un webhook Simple → `webhook.site`/Catch Hook real →
  confirmar payload plano sin `X-Hito-Signature`; bloquear el vault y disparar una suscripción →
  confirmar que ya no se descarta; "Enviar prueba" sin muestra → llega el ejemplo.
