# Especificación — Resiliencia de la integración con Gemini (errores de cuota y fallback)

- **Feature ID:** 031-gemini-resiliencia-errores
- **Estado:** Implementado (2026-07-20) — verificación end-to-end con cuota real en 0 pendiente (T3151 en `tasks.md`; no se puede simular sin una cuenta afectada por el error real).
- **Fecha:** 2026-07-20
- **Principios afectados (constitución):** IV (diseño limpio y enfocado — el mensaje de error debe
  decir la verdad y ser accionable), V (simplicidad — se corrigen bugs puntuales en la infraestructura
  ya construida en specs 006/007/012, no se rediseña)
- **Depende de (no re-implementa, reutiliza):** 006-model-management (registry, rateLimiter,
  modelSelector), 007-rag-semantico (embeddings), 012-ai-improve-fallback (patrón de fallback en
  `improve.ts`, que aquí se replica donde falta)

## Resumen

El usuario reporta que el asistente de IA ahora **siempre** falla con "Límite de peticiones
alcanzado. Espera unos segundos y vuelve a intentarlo.", acompañado del error crudo de Google:

```json
{"error":{"code":429,"message":"Quota exceeded for quota metric 'API requests' and limit 'Request
limit per minute for a region' of service 'generativelanguage.googleapis.com'...","status":
"RESOURCE_EXHAUSTED","details":[{"reason":"RATE_LIMIT_EXCEEDED", "metadata":{"quota_location":
"us-south1","quota_limit_value":"0","quota_unit":"1/min/{project}/{region}","quota_limit":
"ApiRequestsPerMinutePerProjectPerRegion"}}]}}
```

El dato clave es `"quota_limit_value":"0"`: esto **no es un pico transitorio de tráfico**, es una
cuota de **0 peticiones/minuto por proyecto y región** en la cuenta de Google Cloud detrás de la API
key del usuario. Ningún reintento, por sí solo, puede funcionar — y como es una cuota a nivel de
proyecto/región (no por modelo), cambiar de modelo Gemini tampoco ayuda, porque todos los modelos de
texto comparten el mismo proyecto/región. Revisando el código directamente se confirmaron además
**dos bugs concretos** que agravan el síntoma y explican por qué el sistema de fallback de las specs
006/012 no está rescatando al usuario (ver `design.md` §1).

Esta spec corrige la integración para que: (1) distinga cuota-cero de proyecto (no accionable con
espera/reintento) de un rate-limit transitorio real; (2) el fallback entre modelos realmente recorra
todos los candidatos disponibles en vez de rendirse tras un solo reintento fallido; (3) un fallo en la
búsqueda semántica (RAG) no tumbe el envío completo de un mensaje de chat.

## Problema / Necesidad

Verificado leyendo el código el 2026-07-20 (detalle completo en `design.md`):

- **`src/ai/gemini/errors.ts:25-46`** (`classifyAiError`) mapea *todo* HTTP 429 a `"rate-limit"`, sin
  inspeccionar el cuerpo del error para distinguir un throttle temporal de una cuota de proyecto en
  cero. El mensaje mostrado ("espera unos segundos") es directamente falso para el caso del usuario.
- **`src/ai/gemini/agent.ts:104-140`** (`runAgentTurn`): tras un 429 en el intento inicial, el código
  cambia de modelo y hace **un único reintento** (`agent.ts:122`) que **no está envuelto en
  try/catch**. Si ese segundo intento también falla (altamente probable cuando la cuota es de
  proyecto, no de modelo — todos los modelos van a fallar igual), la excepción se escapa al catch
  externo (`agent.ts:164-171`), se reclasifica con `classifyAiError` y **vuelve a salir como
  `"rate-limit"`** en vez de `"all-models-exhausted"`. Este es el motivo técnico concreto de que el
  usuario vea *siempre* el mismo mensaje genérico de "espera unos segundos": el sistema de fallback
  construido en la spec 006 nunca llega a agotar la cadena ni a reportarlo correctamente, se rompe en
  el segundo intento.
- **`src/store/useChatStore.ts:121-124`**: la llamada a `buildRagContext(trimmed, config.apiKey)`
  (activa cuando el usuario tiene "Búsqueda semántica" encendida en Ajustes) **no está protegida**.
  Si el embedding de la pregunta falla — por la misma cuota-cero, por red, por lo que sea — la
  excepción no capturada rompe `send()` completo antes de siquiera intentar la conversación con el
  agente.
- **`src/ai/rag/search.ts:21-37`** (`embedText`): a diferencia de `improve.ts` y
  `generate-transform.ts` (que sí implementan fallback entre modelos de un grupo, spec 012), esta
  función solo verifica el rate limiter local y relanza cualquier error del SDK **sin clasificar y sin
  intentar el segundo modelo de embeddings** (`gemini-embedding-2` ya existe en el registry, spec
  006, pero no se usa aquí).
- El registro local de límites (`src/ai/models.ts`, `src/ai/rateLimiter.ts`) trackea ventanas RPM/TPM/
  RPD **estimadas** en el cliente; no tiene forma de saber que la cuenta real tiene la cuota en 0 hasta
  que la API lo rechaza — es información que solo Google conoce. La spec no pretende "arreglar" esa
  cuota (es un problema de la cuenta de Google Cloud del usuario), sino que la app se comporte
  correctamente y comunique la verdad cuando ocurre.

## Decisiones explícitas (no re-preguntar)

- **Nueva categoría de error `"project-quota-zero"`**, distinta de `"rate-limit"` y
  `"quota-exhausted"` (ya existentes desde spec 012). Se detecta parseando
  `"quota_limit_value":"0"` (u otro valor `0`) en el cuerpo del error embebido en el mensaje del SDK
  — mismo patrón que ya usa `extractStatus()` con el regex de `"code":(\d{3})`.
- **Cuota-cero de proyecto NO dispara la cadena de fallback entre modelos.** Es una decisión de
  producto explícita: como la cuota es por proyecto/región (no por modelo), intentar 3-4 modelos más
  es tiempo perdido y gasta cupo de RPD real contra la cuenta del usuario para nada. Al detectar
  `"project-quota-zero"` se falla rápido con un mensaje accionable, sin recorrer el grupo de
  fallback. Sí se sigue recorriendo el fallback para `"rate-limit"`/`"quota-exhausted"` normales
  (esos pueden ser genuinamente por modelo).
- **El fallback SÍ debe agotar todos los modelos del grupo, no solo intentar uno.** Se corrige el bug
  de `agent.ts` generalizando el reintento a un bucle real (detalle en `design.md` §3), acotado al
  tamaño del grupo de fallback configurado (máx. 4 modelos en el grupo "flash" hoy) para no crear un
  bucle sin límite.
- **RAG se degrada, no rompe el chat.** Si `buildRagContext`/`embedText` fallan por cualquier razón,
  el mensaje del usuario se envía igual sin contexto semántico adicional — nunca debe impedir la
  conversación normal con herramientas.
- **Sin backoff exponencial ni cola de reintentos diferidos.** Fuera de alcance a propósito (ver
  "Fuera de alcance") — el problema real reportado no es de ráfagas que se resuelven esperando, es de
  cuota en cero; un backoff más sofisticado no lo arregla.
- **No se cambian los límites del `MODEL_REGISTRY`** (spec 006) en base a este incidente — son
  valores documentados de la API, no la causa raíz. La causa raíz es una cuota de cuenta que la app no
  controla.

## Historias de usuario (con criterios de aceptación)

### HU-01 — Diagnóstico correcto: cuota de proyecto en cero vs. rate-limit transitorio
**Como** usuario con una API key configurada, **quiero** que la app me diga claramente cuándo el
problema es una cuota de proyecto en cero (no se arregla esperando) en vez de repetirme siempre
"espera unos segundos", **para** saber que debo actuar en Google Cloud/AI Studio en vez de reintentar
en vano.
- ✅ `classifyAiError` detecta el patrón de cuota en cero en el cuerpo del error y devuelve el nuevo
  `AiErrorKind` `"project-quota-zero"`, distinto de `"rate-limit"`.
- ✅ El mensaje mostrado explica que es una cuota de proyecto/región en cero (no un pico temporal) y
  ofrece una acción concreta: revisar cuotas en Google Cloud Console o generar una API key en otro
  proyecto de Google AI Studio.
- ✅ Test unitario que alimenta el JSON de error real reportado por el usuario y confirma que se
  clasifica como `"project-quota-zero"`, no `"rate-limit"`.

### HU-02 — El fallback de modelos agota el grupo, no se rinde tras un reintento
**Como** usuario con fallback automático activado (spec 006), **quiero** que si el segundo modelo
también falla el sistema siga intentando con los siguientes del grupo (o me informe correctamente que
se agotaron todos), **para** no ver el mismo error genérico tras un solo reintento fallido.
- ✅ `runAgentTurn` (`agent.ts`) recorre el grupo de fallback completo ante `"rate-limit"`/
  `"quota-exhausted"`, no solo un modelo adicional.
- ✅ Si todos los modelos del grupo fallan por rate-limit/cuota, el resultado final es
  `"all-models-exhausted"` — nunca `"rate-limit"` genérico tras haber agotado el fallback.
- ✅ Ante `"project-quota-zero"` en cualquier intento, el bucle corta inmediatamente sin probar más
  modelos (HU-01 + decisión explícita de arriba).
- ✅ Test que simula 2+ modelos fallando en secuencia con rate-limit y confirma que el error final
  agregado es correcto (no el del primer fallo).

### HU-03 — Un fallo en RAG no rompe el envío del mensaje
**Como** usuario con "Búsqueda semántica" activada en Ajustes, **quiero** que si el embedding de mi
pregunta falla (cuota, red, lo que sea), el asistente igual responda sin ese contexto extra, **para**
no perder la conversación completa por un fallo en una mejora opcional.
- ✅ La llamada a `buildRagContext` en `useChatStore.send()` queda protegida: un fallo se traduce a
  contexto vacío (`""`) y el turno del agente continúa con las herramientas normales.
- ✅ `embedText` (`rag/search.ts`) usa `classifyAiError` en vez de relanzar el error crudo del SDK, y
  prueba el segundo modelo de embeddings del grupo (`gemini-embedding-2`) antes de rendirse — mismo
  patrón que ya existe en `improve.ts` (spec 012).
- ✅ Test: `buildRagContext` con un mock que lanza error nunca propaga la excepción fuera de `send()`.

### HU-04 — Detalle técnico disponible sin ensuciar el mensaje principal
**Como** usuario (o como el propio desarrollador debuggeando), **quiero** poder ver el cuerpo crudo
del error de Google cuando existe, sin que ensucie el mensaje amigable principal, **para** poder
reportarlo a Google o diagnosticar más rápido.
- ✅ El banner/mensaje de error del chat (`AssistantPanel`) y de "Mejorar con IA"
  (`AiSuggestionsPanel`) incluyen un detalle colapsable ("Ver detalle técnico") con el mensaje crudo
  del SDK cuando está disponible.
- ✅ No se agrega telemetría ni logging remoto (Principio I, local-first) — el detalle vive solo en la
  sesión del cliente, nunca sale del navegador salvo que el propio usuario lo copie.

## Fuera de alcance

- Arreglar la cuota en cero del lado de la cuenta de Google Cloud del usuario — es un problema de la
  cuenta, no de la app. Esta spec solo hace que la app lo detecte y comunique correctamente.
- Backoff exponencial genérico o cola de reintentos diferidos con temporizador.
- Auto-descubrir los límites reales de cada API key haciendo llamadas de prueba — no se puede saber la
  cuota real sin gastarla; se sigue dependiendo del registry estático de spec 006 más lo que la API
  rechace en vivo.
- Migrar de `@google/genai` a fetch crudo, o pinnear `apiVersion`/`baseUrl` explícitamente en el
  cliente — no es la causa raíz identificada.
- Rediseñar la UI de selección de modelos/fallback de las specs 006/012 — se reutiliza tal cual, solo
  se corrige el bug de reintento único en `agent.ts` y se añade el nuevo tipo de error a los mapeos
  existentes.
- Cambiar los valores de `MODEL_REGISTRY` (RPM/TPM/RPD documentados) — no están en duda.

## Supuestos

- El cuerpo de error JSON compartido por el usuario es representativo de cómo el SDK `@google/genai`
  expone el error (embebido como texto en `Error.message`, mismo patrón que ya asume
  `extractStatus()` en `errors.ts` con su regex `"code":(\d{3})`). Antes de implementar, confirmar
  reproduciendo el error o inspeccionando un stack trace real — el usuario compartió el cuerpo de la
  respuesta HTTP, no el objeto `Error` completo tal como lo lanza el SDK.
- El problema de cuota en cero es de la cuenta/proyecto de Google Cloud del usuario, no de un cambio
  en el código de la app — no se han modificado `client.ts`/`models.ts` recientemente según el
  historial de specs (006/007/012 ya implementadas y estables).
- No hay otra spec en curso tocando `src/ai/**` en paralelo.

## Métricas de éxito

- Ante el JSON de error real reportado por el usuario, la app clasifica el error como
  `"project-quota-zero"` (no `"rate-limit"`) y muestra un mensaje distinto y accionable.
- El fallback de `agent.ts` prueba todos los modelos disponibles del grupo antes de reportar error
  agregado — verificable con test que simula 3+ fallos en cascada.
- Con RAG activado y el embedding fallando, un mensaje de chat normal se sigue completando con éxito
  (sin contexto semántico, pero sin romperse).
- `tsc --noEmit`, la suite Vitest completa (incluye los tests nuevos de `errors.ts`/`agent.ts`/
  `useChatStore.ts`/`rag/search.ts`) y `vite build` en verde.
