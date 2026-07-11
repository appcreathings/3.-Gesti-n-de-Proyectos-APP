# Spec 021 — HubSpot + Google Sheets: que la conexión funcione de verdad

## Progreso

- **Fase A — CORS + detección de errores reales: ✅ implementada y verificada (2026-07-10).**
  - Nuevo `src/integrations/proxy-fetch.ts` (`postToProxy`): usa `Content-Type: text/plain;charset=utf-8`
    en vez de `application/json` (evita el preflight `OPTIONS` que Apps Script no puede responder);
    desenvuelve `{status,data}` y trata `envelope.status >= 400` como error real (antes `response.ok`
    era siempre `true` con Apps Script, así que un 400/401/403 de HubSpot se leía como "0 registros");
    clasifica `TypeError`/"Failed to fetch" como error de CORS con mensaje accionable, y `AbortError`
    como timeout. 8 tests nuevos.
  - Migrados los 6 sitios que llamaban al proxy: `connections.ts` (`testConnection`, HubSpot y
    Sheets), `hubspot-poller.ts`, `hubspot-deals-poller.ts`, `hubspot-tickets-poller.ts`,
    `sheets-poller.ts`. `email-via-apps-script.ts` se dejó intacto a propósito — ya usaba
    `text/plain` correctamente y su contrato de proxy no tiene el envelope `{status,data}` (no es un
    drop-in seguro para `postToProxy`).
  - Borrado `src/integrations/diagnostics.ts` (código muerto, cero llamadas, mismo bug de
    `Content-Type` — su única pieza útil, la clasificación de error CORS, quedó plegada dentro de
    `proxy-fetch.ts`).
  - Tests existentes actualizados: 3 archivos afirmaban `Content-Type: application/json` o un mensaje
    de error sin prefijo — ajustados a la nueva forma unificada (`text/plain`,
    `"<Proveedor> API error: <mensaje>"`).
  - `typecheck`/`lint`/`test` (251/251)/`vite build` en verde.

- **Fase B — HubSpot Search real + Filtros/Campos conectados: ✅ implementada y verificada (2026-07-10).**
  - Los 3 pollers de HubSpot migraron de `GET /crm/v3/objects/{type}` (que ignoraba `filterGroups`
    por completo) a `POST /crm/v3/objects/{type}/search` — el único endpoint que de verdad soporta
    filtros. El proxy ya reenviaba POST con body genéricamente, sin cambios ahí.
  - Nuevo `src/integrations/inbound/hubspot-search.ts`: mapeo puro `ConditionOp` → operador de
    HubSpot Search (`EQ/NEQ/GT/GTE/LT/LTE/IN/CONTAINS_TOKEN`), constructor del body de búsqueda
    (filtros del usuario + filtro de `lastSyncAt` en el mismo `filterGroup`, orden ascendente por
    `lastmodifieddate` para que el watermark incremental avance de verdad), y `mergeProperties`
    (campos elegidos por el usuario + un piso obligatorio por tipo — nunca se puede romper el sync
    incremental deseleccionando un campo). 17 tests nuevos.
  - **Decisión tomada sobre el operador `in`**: se mantiene en el selector; el valor se captura como
    string separado por comas en la UI y se parte en un array al construir el filtro de HubSpot
    (`mapPollFilterToHubSpot`).
  - `hubspot-polling-manager.ts`: ahora sí pasa `trigger.config.fields`/`trigger.config.filters` al
    poller — antes se perdían (`HubSpotConfig` solo llevaba `objectTypes`).
  - `TriggerStep.tsx`: el selector de operador de "Filtros" ganó `>=`, `<=`, `in` (antes solo
    ofrecía `== != > < contains`, sin soportar todo lo que `ConditionOp` permite).
  - Test nuevo `hubspot-poller.test.ts` (contactos no tenía cobertura propia): confirma el endpoint
    de Search, el envelope-error (401 ya no se lee como "0 contactos"), y el piso de propiedades.
  - `typecheck`/`lint`/`test` (276/276)/`vite build` en verde.

**Pendiente:** Fase C (verificación guiada con HubSpot/Sheets reales del usuario) — requiere que tú
despliegues un proxy real y me des acceso a probar con tu token/hoja.

## Context

Spec 020 (`specs/020-flows-integrations-v2/spec.md`, ✅ completado) rediseñó Flujos/Integraciones con
un modelo de Conexiones reutilizables y un canvas visual, pero nunca se probó contra un HubSpot/Apps
Script **real** — solo contra tests unitarios (con `fetch` mockeado) y un smoke test de UI (sin red
real). Al pedir "asegura que la conexión de prueba a HubSpot funcione pese al problema de CORS local",
una investigación de solo-lectura (confirmada por un agente Plan que releyó cada archivo) encontró que
el sistema tiene **tres bugs reales independientes** que garantizan que nunca funcionaría contra un
proxy real, aunque el token/URL estén perfectos:

1. **Bug de CORS (bloqueante, el más grave).** Los 6 fetch del navegador hacia el proxy de Apps
   Script (`connections.ts` `testConnection` ×2, los 3 pollers de HubSpot, `sheets-poller.ts`, y el
   `diagnostics.ts` no usado) mandan `Content-Type: application/json`. Eso convierte el POST en una
   petición CORS "no simple", que dispara un preflight `OPTIONS` — y Apps Script Web Apps **no
   pueden responder** `OPTIONS`. El navegador bloquea la petición real antes de que salga. El único
   sitio que ya lo hace bien es `email-via-apps-script.ts` (`text/plain`), la solución estándar
   conocida para este problema exacto de Apps Script.
2. **La API de HubSpot está mal usada para el filtro incremental.** Los 3 pollers arman
   `filterGroups` como parámetro de un `GET /crm/v3/objects/{type}` — endpoint que no soporta
   `filterGroups` (es exclusivo del endpoint de Search, `POST .../search`). El filtro por
   `lastmodifieddate` (sync incremental) probablemente nunca filtró nada. Además, **`config.fields`
   y `config.filters` del trigger (los campos "Filtros"/"Campos a traer" de la UI) ni siquiera
   llegan a los pollers** — se pierden en `hubspot-polling-manager.ts`, que solo pasa `objectTypes`.
3. **Los pollers no detectan errores reales de HubSpot.** Apps Script Web Apps devuelven siempre
   HTTP 200 a nivel de transporte (el código de error real vive solo dentro del JSON,
   `{status, data}`); el código actual revisa `response.ok`, que **siempre es true**, así que un
   error 400/401/403 de HubSpot se trata como "0 registros" en silencio en vez de como error.

Ninguno de estos tres requiere tocar el script de Apps Script que ve el usuario (el proxy ya reenvía
`path/method/body` genéricamente) — son arreglos puramente del lado del cliente (Hito).

**Alcance de este spec:** solo A+B+C (dejar HubSpot/Sheets robustos y verificados de verdad). Las
condiciones por-rama en el canvas (branching), que el usuario también pidió, se separan a un
**spec 022** futuro — es una pieza distinta (schema+migración+motor+UI) y mezclarla arriesga dejar
este arreglo a medias. El diseño completo de esa pieza ya quedó documentado (ver Anexo al final) para
cuando se planee.

## Decisiones (confirmadas con el usuario)

- **Spec 022 separado** para las condiciones por-rama — no entra en esta ejecución.
- **Helper compartido** `postToProxy()` para los 6 sitios, en vez de repetir el fix 6 veces — evita
  que un poller futuro reintroduzca el mismo bug.

## Fase A — Arreglar el bug de CORS + detección de errores reales

- Nuevo `src/integrations/proxy-fetch.ts`: `postToProxy(url, payload, timeoutMs)` — hace el fetch con
  `Content-Type: text/plain` (evita el preflight), desenvuelve `{status,data}` con
  `unwrapProxyEnvelope` (ya existe, `inbound/proxy-envelope.ts`), y **trata `status >= 400` dentro
  del envelope como error** (no solo `!response.ok`, que con Apps Script siempre es true). También
  clasifica errores de red: `TypeError`/"Failed to fetch" → mensaje claro de CORS apuntando a la
  guía; `AbortError` → timeout.
- Migrar los 6 sitios a usar este helper: `connections.ts` (`testConnection`, ambas ramas),
  `hubspot-poller.ts`, `hubspot-deals-poller.ts`, `hubspot-tickets-poller.ts`, `sheets-poller.ts`.
  `email-via-apps-script.ts` puede quedar igual (ya usa `text/plain`) o migrar también por
  consistencia.
- Borrar `src/integrations/diagnostics.ts` (código muerto, cero llamadas, mismo bug — su única pieza
  útil, la clasificación de error CORS, se pliega dentro de `proxy-fetch.ts`).
- Actualizar tests existentes que hoy afirman `Content-Type: application/json` (ej.
  `hubspot-deals-poller.test.ts:64`) para que esperen `text/plain`. Tests nuevos para
  `proxy-fetch.ts`: envelope de error (`status >= 400`), clasificación CORS/timeout.

## Fase B — HubSpot Search real + conectar Filtros/Campos de la UI

- Migrar los 3 pollers de HubSpot de `GET /objects/{type}` a `POST /objects/{type}/search`, body:
  `{ properties, filterGroups, sorts: [{propertyName:"lastmodifieddate", direction:"ASCENDING"}],
  limit: 100, after? }`, enviado por el proxy como `{_hubspotToken, path:".../search", method:"POST",
  body}` (el proxy ya reenvía POST con body, sin cambios ahí).
- Extender `HubSpotConfig` con `fields`/`filters`; **conectar** `hubspot-polling-manager.ts` para que
  pase `trigger.config.fields`/`trigger.config.filters` (hoy se pierden). `properties` = campos
  elegidos por el usuario + un piso obligatorio (`lastmodifieddate`, `createdate`, el campo identidad
  del tipo) para que el sync incremental y la idempotencia nunca se rompan si el usuario deselecciona
  algo necesario.
- Nuevo `src/integrations/inbound/hubspot-search.ts`: mapeo puro `ConditionOp` → operador de HubSpot
  Search (`EQ/NEQ/GT/GTE/LT/LTE`; `in`→`IN` con `values: []` en vez de `value` — decidir UX: separar
  por comas en la UI, o retirar `in` del selector de filtros por ahora; `contains`→`CONTAINS_TOKEN`
  con wildcards `*valor*`; operador no mapeable → se descarta con warning, no rompe el poll). El
  filtro de `lastSyncAt` (`lastmodifieddate GT lastSyncAt`) se añade como una condición más dentro del
  mismo `filterGroup` (AND con los filtros del usuario).
- `TriggerStep.tsx`: el selector de operador del poll filter hoy solo ofrece `== != > < contains`
  (le faltan `>= <= in` que sí soporta `ConditionOp`) — alinear con la lista completa de
  `ConditionConfigFields`.
- Tests: `hubspot-search.test.ts` (tabla de mapeo de operadores, incl. `in`→`values` y descarte de
  operador no soportado); pollers — `config.fields` aparece en `body.properties` con el piso
  obligatorio, `config.filters` aparece en `body.filterGroups`; reescribir el test de sync
  incremental existente para afirmar `path` termina en `/search`, `method: "POST"`, y
  `body.filterGroups[0].filters` contiene la cláusula `lastmodifieddate GT`.

## Fase C — Verificación guiada con HubSpot/Sheets reales (después de A+B)

Proceso, no código — te acompaño a:
1. Desplegar el proxy de la guía (ejecutar como "Yo", acceso "Cualquier persona"), copiar la URL.
2. Crear un HubSpot Private App token con scopes `crm.objects.{contacts,deals,tickets}.read`,
   guardarlo como Conexión en Integraciones.
3. "Probar conexión" → debe dar verde (esto es lo que valida que la Fase A funcionó de verdad).
4. Configurar un flujo de poll con un filtro + un par de campos elegidos; correrlo y confirmar que
   llegan registros reales, solo con las propiedades elegidas, respetando el filtro (valida la Fase B).
5. Vigilar fallos que solo aparecen contra la API real: typos de nombre de propiedad (400), falta de
   scope (403), rate limit (429), y el lag de indexación de búsqueda para registros recién creados en
   HubSpot (aceptado como limitación conocida del polling).

## Verificación (A + B, antes de la Fase C)

- `npm run typecheck && npm run lint && npm test` en verde, incluidos los tests nuevos/reescritos.
- `npm run build` en verde.
- Repetir el smoke test de Playwright de spec 020 (o uno ampliado) para confirmar que la UI de
  "Probar conexión" sigue funcionando visualmente; la validación real de red queda para la Fase C con
  el usuario.

## Riesgos / decisiones abiertas a confirmar en la revisión

- Forma del valor para el operador `in` en la UI de filtros (string con comas vs. quitar la opción).
- HubSpot Search tiene rate limits más estrictos y lag de indexación — aceptado como limitación de
  un MVP de polling, se documenta, no se resuelve en este spec.

---

## Anexo — Diseño ya hecho para spec 022 (condiciones por-rama, NO se ejecuta ahora)

Cada output gana `conditions: FlowCondition[]` opcional (default `[]`), evaluado además de las
condiciones globales — así "si monto>1000 haz A, si no haz B" se expresa como dos outputs con
condiciones opuestas, sin necesitar aristas editables a mano (se respeta el principio de spec 020: las
aristas son derivadas, no conectadas por el usuario). Cambios: `OutputSchema` (las 9 variantes ganan
el campo, via un `.extend` compartido), bump de `SCHEMA_VERSION` + paso de migración identidad,
`engine.ts` gana un guard de una línea antes de `executeOutput`, canvas reutiliza
`ConditionConfigFields` en una lista repetible dentro de `ActionConfigFields`. Riesgo a resolver ahí:
`evaluateCondition` en `engine.ts` exige que ambos operandos sean `number` para `>`/`>=`/etc., pero
HubSpot devuelve numéricos como string (`amount: "10000"`) — una condición por-acción `amount > 1000`
nunca matchearía sin coerción numérica (bug que también afecta a las condiciones globales hoy).
