# Spec 020 — Rediseño funcional de Flujos e Integraciones (con React Flow)

## Progreso

- **Fase 1 — Modelo de Conexiones + vault: ✅ implementada y verificada (2026-07-09).**
  `IntegrationConnection` (tabla Dexie `integrationConnections`, v2 aditiva), CRUD real en
  `src/integrations/connections.ts` (cifra el secreto con el vault, `testConnection` honesto),
  `ConnectionDialog.tsx`, `IntegrationsPage.tsx` reescrita (HubSpot/Sheets/Email pasan de maqueta a
  CRUD persistente). Guía movida a `features/integrations/guides/` y corregida (ya no apunta a
  "Ajustes → Integraciones"). `typecheck`/`lint`/`test` (222/222) en verde.
- **Fases 2 (Schema v2) + 3 (Engine): ✅ implementadas y verificadas (2026-07-09), fusionadas en un
  solo checkpoint** porque el cambio de schema (`PollTrigger`/`email` output → `connectionId`,
  nuevo output `createProject`, campo `graph?`) rompía en cascada TypeScript en el engine y en el
  wizard existente — dejarlo a medio camino habría sido un build rojo. Cambios:
  - `SCHEMA_VERSION` 7→8; migración real (no identidad) para `flows` en `migrations.ts`: descarta
    credenciales embebidas legacy (nunca realmente cifradas) y deja `connectionId: ""` para que el
    usuario reconecte; idempotente (no pisa un `connectionId` ya real). 4 tests nuevos.
  - `src/flows/engine.ts`: nuevo caso `createProject` (usa `instantiateProjectFromType` o
    `newProject`, interpola `name`, aplica `fields`); `result.newProjects` (separado de
    `changedProjects` — se persiste vía `createProject()`, no `saveProject()`); `email` resuelve la
    conexión (import dinámico, para no romper la testabilidad del engine — arrastrar `vault.ts`
    estático rompía `engine.test.ts` por `localStorage` fuera de browser); key de poll trigger
    ahora depende de `provider` (hubspot/google-sheets), no hardcodeada.
  - `hubspot-polling-manager.ts` resuelve la conexión real (arregla el bug de Fase 1: el token se
    guardaba en texto plano y el poller intentaba descifrarlo → registro siempre fallaba en
    silencio → polling nunca arrancaba).
  - Wizard existente (`TriggerStep`/`OutputStep`) actualizado para seleccionar conexiones en vez de
    pedir proxy+token/proxyUrl inline, y para ofrecer "Crear Proyecto" como output. Esta UI se
    reemplaza por el canvas en la Fase 4 — el arreglo aquí es el mínimo para no dejar el build roto,
    no la superficie final.
  - `useFlowStore.ts`: corregido bug preexistente que escribía `schemaVersion: 1` fijo en cada
    guardado (deshacía la migración en cada lectura siguiente); polling de HubSpot ahora gateado por
    `provider === "hubspot"` (Sheets no dispara nada hasta la Fase 5).
  - `typecheck`/`lint` limpios, 226/226 tests en verde (4 nuevos de migración).

- **Fase 4 — Builder React Flow: ✅ implementada y verificada (2026-07-10).** `@xyflow/react` (v12)
  instalado. Modelo de canvas en `src/flows/graph.ts` (puro, sin dependencia de la UI): pipeline
  fijo de 4 etapas — trigger (1) → condition (0..n) → transform (1, singleton) → action (0..n).
  `buildGraphFromRule`/`compileGraphToRule` (con 9 tests nuevos); las aristas son derivadas
  (`relinkEdges`), no editables a mano — el motor no soporta ramas condicionales por nodo, así que
  el canvas no promete más de lo que puede ejecutar.
  - `src/features/flows/canvas/`: `nodeTypes.tsx` (tarjetas visuales por tipo de nodo, con indicador
    de "configuración incompleta"), `meta.ts` (metadatos/paleta de los 8 tipos de output — ahora
    incluye `setField`/`markAreaComplete`, que el wizard viejo no exponía), `FlowCanvas.tsx`
    (orquestación: `ReactFlow` + paleta flotante "+ Condición"/"+ Acción" + diálogo de configuración
    por nodo), `ConditionConfigFields`/`TransformConfigFields`/`ActionConfigFields` (extraídos de
    los viejos `LogicStep`/`OutputStep`, ahora retirados), `TriggerNodeDrawer` (adaptador liviano
    sobre `TriggerStep`, que se conserva).
  - `FlowBuilderPage.tsx` reescrita: aloja el canvas, campo de **nombre del flujo visible** (gap
    documentado en la Fase 2), guarda persistiendo tanto el `graph` visual como los campos
    ejecutables compilados.
  - `FlowsPage.tsx`: el diagrama estático hecho a mano se reemplazó por `FlowPreviewCanvas` (mismo
    `nodeTypes`, solo lectura, derivado de `flow.graph`).
  - **Bug preexistente y ajeno encontrado y arreglado**: `vite.config.ts` usaba `manualChunks` en
    forma-objeto (Rollup clásico), incompatible con el bundler Rolldown que ya trae `vite@8.1.3`
    instalado — `npm run build` fallaba para cualquier cambio, no solo los de este spec. Convertido a
    forma-función. Verificado con `vite build` real: el chunk de React Flow queda lazy (~59 kB gzip),
    el bundle inicial no creció.
  - `typecheck`/`lint`/`test` (235/235) y `vite build` en verde.

- **Fase 5 — Google Sheets funcional + guías: ✅ implementada y verificada (2026-07-10).**
  - **Bug real encontrado y arreglado en los 3 pollers de HubSpot**: `hubspot-poller.ts` (contacts)
    desenvolvía `{status,data}` correctamente, pero `hubspot-deals-poller.ts` y
    `-tickets-poller.ts` leían `data.results` directo — con el `Code.gs` real de la guía (que
    SIEMPRE envuelve en `{status,data}`), deals/tickets llegaban vacíos en silencio. Unificado en
    `src/integrations/inbound/proxy-envelope.ts` (`unwrapProxyEnvelope`), usado por los 4 pollers y
    por `testConnection`.
  - **`sheets-poller.ts` reescrito** — sin `gapi`/OAuth de navegador (nunca se cargaba, código
    muerto desde spec 018/019): ahora lee vía el mismo patrón de proxy de Apps Script que HubSpot
    (`{action:"read", spreadsheetId, range} → {status,data:{values}}`). Solo hace fetch y devuelve
    registros planos — el mapeo lo define el propio flow, igual que HubSpot. 6 tests nuevos.
  - `sheets-polling-manager.ts` (nuevo, paralelo a `hubspot-polling-manager.ts`; sin
    `resolveConnectionSecret` — el proxy de Sheets corre bajo la cuenta de Google del usuario, sin
    token que pasar). `poll-sync-state.ts` extrae el helper de `localStorage` compartido entre ambos
    managers (antes duplicado). `useFlowStore.ts` simplificado: `registerPollTrigger`/
    `unregisterPollTrigger` despachan por `provider` en vez de repetir el if/else 3 veces.
  - Conexión de Sheets gana el campo `headerRow`; `testConnection("google-sheets", ...)` pasa de
    "solo alcanzable" (placeholder honesto de la Fase 1) a una prueba real (lee el rango y cuenta
    filas).
  - `AppsScriptGuide.tsx` ahora es `provider`-aware (`hubspot` | `google-sheets`): título, código
    `Code.gs` embebido y texto de "¿por qué necesito esto?" cambian según el proveedor. Wired en
    `IntegrationsPage` (tab Sheets ya tiene botón de guía) y en `TriggerStep`.
  - **`TriggerStep.tsx`**: el selector de trigger gana una tercera opción ("Cuando lleguen filas de
    Google Sheets"), con su propio selector de conexión (filtrado por proveedor) y "Probar
    conexión" real. El motor (`pollTriggerKey` en `engine.ts`) ya soportaba multi-proveedor desde la
    Fase 3, sin cambios adicionales ahí.
  - **Gap preexistente documentado, no arreglado** (fuera de alcance de esta fase): los campos
    "Filtros (qué traer)" y "Campos a traer" del trigger de HubSpot son decorativos — ningún poller
    de HubSpot los consume (`properties`/`filterGroups` están hardcodeados). Ya eran no-funcionales
    antes de este spec; no se replicó el patrón para Sheets.
  - `typecheck`/`lint`/`test` (241/241) y `vite build` en verde.

- **Fase 6 — Limpieza + verificación e2e: ✅ completa (2026-07-10).**
  - **Archivos muertos borrados** (confirmado sin importadores vivos antes de borrar):
    `AutomationsPage.tsx` (huérfana — su ruta ya redirige a `/app/flows`), `IntegrationFlowBuilder.tsx`
    + sus 6 `components/*Step.tsx`, `features/integrations/types.ts`. **No se borraron**
    `AutomationDialog.tsx`/`AutomationRuleCard.tsx`: siguen vivos, usados por
    `ProjectAutomationsTab.tsx` (pestaña de automatizaciones *por-proyecto*, un sistema legacy
    distinto y aún activo, separado del rework global de Flujos — habría sido un error borrarlos).
  - **Verificación end-to-end real en navegador** (Playwright headless contra el dev server, con la
    File System Access API deshabilitada a propósito para forzar el fallback a `DownloadAdapter` —
    así la conexión de almacenamiento no requiere un diálogo nativo de carpeta): recorrido completo
    `/app/integrations` (4 tabs, gate de vault confirmado — "Nueva conexión" de HubSpot deshabilitado
    hasta desbloquear el vault; diálogo de conexión de Sheets con el nuevo campo `headerRow`) →
    `/app/flows` → `/app/flows/new` (canvas con nodos Trigger + Transformar visibles, paleta
    "+ Condición"/"+ Acción" con los 8 tipos de output incluyendo "Crear Proyecto", diálogo de
    configuración del trigger mostrando las 3 opciones — evento, HubSpot, Google Sheets). **Cero
    errores de consola/página en todo el recorrido.** Capturas de pantalla revisadas visualmente.
  - `typecheck`/`lint`/`test` (241/241)/`vite build` en verde tras la limpieza.

**Estado: spec 020 completo — las 6 fases implementadas y verificadas.**

### Fuera de alcance, documentado (no implementado en este spec)

- Condiciones por-rama en el canvas (v1 usa condición global AND — coincide con lo que el engine
  soporta).
- Webhooks entrantes de HubSpot (se sigue usando polling).
- Cron/scheduler real.
- Sandbox para `transformCode` (sigue `new Function`, aceptado para una app mono-usuario).
- Filtros/campos-a-traer del trigger de HubSpot (`config.filters`/`config.fields` en la UI son
  decorativos — ningún poller los consume; bug preexistente a este spec, documentado en Fase 5).
- Verificación contra HubSpot/Apps Script reales (requiere credenciales de un usuario real; cubierto
  por tests unitarios + el smoke test de UI, no por una integración en vivo).

## Context

La herramienta de Flujos/Integraciones se marcó "COMPLETADA" dos veces (specs 018 y 019) pero
sigue rota de punta a punta para el usuario. Una exploración archivo-por-archivo (3 agentes +
lectura directa) confirmó **cuatro fallas de raíz**, todas reales en el código actual:

1. **"Integraciones" y "Flujos" se solapan y confunden.** `IntegrationsPage` (`/app/integrations`)
   es una página semi-maqueta: el tab HubSpot recolecta proxy+token pero **no los persiste**; el
   tab Google Sheets es 100% maqueta (el botón "Conectar con Google" no tiene `onClick`); su "guía"
   es en realidad la de HubSpot. Mientras tanto el builder de flujos **vuelve a pedir** proxy+token
   por cada flujo. Nadie sabe dónde vive la configuración ni cuál es la diferencia entre las dos
   páginas.
2. **HubSpot no conecta negocios (deals) para crear proyectos — es imposible por diseño.** El
   `OutputSchema` (`src/domain/schemas/flow.ts:170`) no tiene `createProject`; el engine
   (`src/flows/engine.ts:320`) no lo maneja; el `OutputStep` no lo ofrece. Además, aunque existiera,
   el token se guarda **en texto plano** en `encryptedToken.ciphertext` sin paso de cifrado al
   guardar (`TriggerStep.tsx:283`, `FlowBuilderPage.tsx:59`), pero `registerHubSpotPolling`
   **descifra** (`hubspot-polling-manager.ts:35`) → lanza y se traga el error → **el polling nunca
   arranca**. Y aun con datos, `createTask` desde un poll hace no-op porque el registro externo no
   tiene proyecto de origen y la UI no ofrece selector de proyecto.
3. **La guía de Google Sheets está desactualizada / inexistente.** El único wizard
   (`AppsScriptGuide.tsx`) es HubSpot-only, apunta a una ruta que ya no existe ("Ajustes →
   Integraciones") y usa un envelope de proxy inconsistente con los pollers de deals/tickets. Sheets
   como tal es código muerto (`sheets-poller.ts`, sin `gapi`, nunca registrado).
4. **El flujo de creación de automatizaciones no es claro.** Wizard lineal de 3 pasos sin
   visualización, con 2 de 8 outputs no creables desde la UI y sin campo visible para el nombre.

**Outcome buscado:** una herramienta funcional de verdad, con un modelo conceptual claro
(Integraciones = conexiones reutilizables; Flujos = automatizaciones que las consumen), un
constructor visual de nodos con React Flow, y el caso estrella "negocio de HubSpot → proyecto"
funcionando end-to-end.

## Decisiones del usuario (confirmadas)

- **Builder:** canvas de nodos completo con React Flow (arrastrar/conectar Trigger → Condición →
  Acción[es]).
- **Modelo:** Integraciones = conexiones/credenciales reutilizables (cifradas una vez en el vault);
  Flujos las consumen **por referencia** (`connectionId`), sin re-pedir credenciales.
- **Deal → Proyecto:** `createProject` instancia desde un **Tipo de Proyecto**
  (`createProjectFromType`), trayendo áreas/checklists/procesos de plantilla; nombre y campos se
  mapean desde el deal.
- **Alcance:** rediseño completo funcional (no parches puntuales).

---

## Arquitectura objetivo

### A. Modelo conceptual y separación de superficies

- **Integraciones = Conexiones.** Nueva entidad `IntegrationConnection`: una conexión guardada y
  reutilizable a un sistema externo (HubSpot, Google Sheets, Email/SMTP-proxy, Webhook endpoint).
  Guarda credenciales **cifradas con el vault** una sola vez. `IntegrationsPage` pasa de maqueta a
  CRUD real de conexiones + estado (última sync, probar conexión, logs).
- **Flujos = Automatizaciones.** Un `FlowRule` referencia conexiones por `connectionId` en su
  trigger de poll y en sus outputs webhook/email. Nunca embebe credenciales.
- Esto elimina la duplicación y responde la pregunta del usuario: *la Integración es la conexión
  (se configura una vez); el Flujo es la regla que la usa.*

### B. Constructor visual con React Flow

- Añadir dependencia **`@xyflow/react`** (React Flow v12, nombre actual del paquete).
- `FlowBuilderPage` pasa de wizard de 3 pasos a **lienzo de nodos**:
  - Tipos de nodo: `trigger` (1), `condition` (0..n), `action` (1..n). Edges definen el orden
    trigger → [condición] → acciones.
  - Panel lateral (drawer) para configurar el nodo seleccionado (reutilizar los formularios que ya
    existen en `steps/TriggerStep`, `LogicStep`, `OutputStep`, extraídos a componentes de config).
  - Campo de **nombre del flujo** visible en la barra del canvas (hoy falta).
  - Paleta lateral para arrastrar nodos nuevos.
- **Persistencia del grafo:** extender `FlowRuleSchema` con `graph?: { nodes, edges }` (posiciones +
  conexiones) como fuente de la vista; el `FlowRule` ejecutable (trigger/logic/outputs) sigue siendo
  la verdad para el engine. Dos funciones puras nuevas en `src/flows/graph.ts`:
  - `compileGraphToRule(graph, base)` → produce `trigger`, `logic.conditions` (AND global en v1),
    `outputs[]`.
  - `buildGraphFromRule(rule)` → genera un grafo por defecto para flujos legacy (sin `graph`) y para
    la migración de los ya guardados.
  - v1: las condiciones son un bloque global (coincide con el engine actual y con el preview
    aprobado: una condición → varias acciones en paralelo). Condiciones por-rama quedan documentadas
    como v2.

### C. `createProject` (deal/registro externo → proyecto)

- Nuevo `CreateProjectOutputSchema` en `src/domain/schemas/flow.ts`:
  `{ type: "createProject", projectTypeId?: string, name: string (plantilla `{{...}}`),
  productId?: string, fields?: FieldMapping[] }`.
- **Engine puro:** `executeOutput` (`engine.ts:320`) gana un caso `createProject` que construye el
  proyecto con `instantiateProjectFromType` (`src/domain/instantiate.ts:24`) cuando hay
  `projectTypeId`, o `newProject` (`src/domain/factories.ts:37`) si no; interpola `name` y aplica
  `fields` sobre el registro transformado; lo agrega a un nuevo `result.newProjects[]`. El engine
  **no** persiste (se mantiene puro).
- `FlowEngineInput` gana `projectTypes` (y `processTemplates` si hace falta para instanciar).
- `applyFlowResult` (`src/store/useDataStore.ts:421`) persiste `newProjects` vía
  `get().createProject(p)` — que ya dispara `project.created`, activity log y webhooks salientes.
- **UI:** `OutputStep`/nodo de acción gana "Crear Proyecto" con selector de Tipo de Proyecto, campo
  de nombre (con tokens `{{dealname}}`), y mapeo opcional de campos. También añadir selector de
  proyecto a `createTask` (arreglo del no-op en polls).

### D. Credenciales / vault (arreglo del bug que impide el polling)

- Al **guardar una conexión** en `IntegrationsPage`, cifrar las credenciales con
  `useVaultStore.getState().encrypt(...)` y persistir el `EncryptedPayload` real (no texto plano).
  Requiere vault desbloqueado → mostrar gate claro (reutilizar `VaultSetupDialog`).
- El trigger de poll deja de llevar `encryptedToken`; lleva `connectionId`.
  `registerHubSpotPolling` resuelve la conexión y descifra desde ahí (contrato consistente).
- Persistir las conexiones en la tabla Dexie **ya existente** `integrationConfigs`
  (`src/storage/integration-db.ts`), hoy sin uso.

### E. Google Sheets funcional (vía Apps Script proxy, sin gapi/OAuth)

- Retirar el `sheets-poller.ts` basado en `gapi` (muerto) y reemplazarlo por un poller que lee la
  hoja **a través de un Apps Script proxy** — mismo patrón que HubSpot, sin OAuth de navegador.
- Conexión "Google Sheets" = { proxyUrl, spreadsheetId, range, headerRow }. Guía Apps Script propia
  y actualizada.

### F. Guías actualizadas

- Convertir `AppsScriptGuide` en **provider-aware** (HubSpot y Sheets) o crear una guía por proveedor
  bajo `src/features/integrations/guides/`. Corregir la ruta mencionada (ya no es "Ajustes →
  Integraciones"; la config vive en la conexión). Unificar el envelope de respuesta del proxy y
  alinear los tres pollers de HubSpot (contacts/deals/tickets) a un mismo contrato de lectura.

### G. Limpieza de código muerto

- Borrar los archivos huérfanos confirmados: `src/features/automations/AutomationsPage.tsx` (+
  `AutomationDialog` si aplica), `src/features/integrations/IntegrationFlowBuilder.tsx` + sus 6
  `components/*Step.tsx`, y `src/features/integrations/types.ts`. Sus rutas ya redirigen a Flows
  (`App.tsx:162,169`). Mover `AppsScriptGuide.tsx` fuera de `features/automations/`.

---

## Plan de implementación por fases

**Fase 1 — Modelo de Conexiones + vault (base).**
`IntegrationConnectionSchema` nuevo; store/CRUD sobre `integrationConfigs` (Dexie); cifrado real al
guardar; `IntegrationsPage` reescrita a CRUD de conexiones con "probar conexión" y estado. Gate de
vault claro.

**Fase 2 — Schema de Flujos v2.**
Añadir `CreateProjectOutput`; cambiar `PollTrigger` y outputs webhook/email para referenciar
`connectionId`; añadir `graph?` a `FlowRuleSchema`. Migración de `schemaVersion` (`SCHEMA_VERSION` en
`common.ts`, registrar en `migrations.ts` para kinds `flows`; `buildGraphFromRule` para poblar
`graph` y mover credenciales embebidas → conexión creada al vuelo).

**Fase 3 — Engine.**
`executeOutput` caso `createProject`; `FlowEngineInput.projectTypes`; `result.newProjects`;
`applyFlowResult` persiste proyectos nuevos; polling resuelve credenciales desde la conexión.
Arreglar targeting de `createTask` en polls (selector de proyecto).

**Fase 4 — Builder React Flow.**
Añadir `@xyflow/react`; reescribir `FlowBuilderPage` como canvas con nodos trigger/condition/action,
drawer de config (reutilizando formularios existentes), campo de nombre, paleta; `graph.ts`
(`compileGraphToRule`/`buildGraphFromRule`). `FlowsPage` conserva la lista pero su mini-diagrama pasa
a un preview React Flow de solo lectura derivado de `graph`.

**Fase 5 — Google Sheets funcional + guías.**
Poller Sheets vía Apps Script; conexión Sheets; guía Sheets; guía provider-aware; unificar envelope
de proxy y contrato de pollers HubSpot.

**Fase 6 — Limpieza, tests y verificación.**
Borrar archivos muertos; tests unitarios nuevos (createProject output, compile/build graph,
conexión→decrypt→poll, migración); `typecheck` + `lint` + `test` en verde; verificación e2e (ver
abajo).

---

## Archivos clave a modificar/crear

- **Schemas:** `src/domain/schemas/flow.ts` (createProject, connectionId, graph), nuevo
  `src/domain/schemas/connection.ts`, `src/domain/schemas/common.ts` (SCHEMA_VERSION),
  `src/domain/migrations.ts`.
- **Engine/grafo:** `src/flows/engine.ts` (executeOutput, FlowEngineInput, newProjects), nuevo
  `src/flows/graph.ts`, `src/store/useDataStore.ts` (`applyFlowResult`, input del engine),
  `src/store/useFlowStore.ts`.
- **Conexiones:** nuevo `src/store/useConnectionStore.ts` (o ampliar integraciones),
  `src/storage/integration-db.ts` (usar `integrationConfigs`),
  `src/integrations/inbound/hubspot-polling-manager.ts` (resolver conexión), pollers HubSpot,
  reemplazo de `sheets-poller.ts`.
- **UI:** `src/features/integrations/IntegrationsPage.tsx` (CRUD conexiones),
  `src/features/flows/FlowBuilderPage.tsx` (canvas) + nuevos nodos/paleta/drawer en
  `src/features/flows/canvas/`, `src/features/flows/FlowsPage.tsx` (preview),
  `src/features/integrations/guides/` (guías), `src/routes/paths.ts` si hace falta.
- **Borrar:** `src/features/automations/AutomationsPage.tsx`,
  `src/features/integrations/IntegrationFlowBuilder.tsx` + `components/*Step.tsx`,
  `src/features/integrations/types.ts`.

Reutilizar lo existente: `useDataStore.createProject/createProjectFromType`
(`useDataStore.ts:204/232`), `instantiateProjectFromType` (`instantiate.ts:24`), `newProject`
(`factories.ts:37`), `useVaultStore` (`vault.ts`), `pollingManager` (`polling-manager.ts`),
`dispatchOutboundEvents`/`signPayload`, `interpolateString` (`engine.ts:520`).

---

## Verificación end-to-end

1. **Crear proyecto desde deal (caso estrella):** con un Apps Script proxy real + token HubSpot de
   prueba, crear conexión HubSpot → guardar (verificar `EncryptedPayload` real, no texto plano) →
   crear flujo poll deals con acción `createProject(Tipo="Onboarding cliente", name="{{dealname}}")`
   → activar → confirmar que un deal nuevo genera un proyecto con sus áreas/checklists de plantilla.
   Cubrir también con test unitario del engine (deal record → `result.newProjects`).
2. **Polling arranca de verdad:** verificar que al guardar el flujo el timer se registra (no se traga
   excepción de decrypt) y que aparece en `SyncLogsPage`.
3. **Builder React Flow:** crear un flujo desde el canvas (trigger evento → condición → 2 acciones),
   guardar, recargar, reabrir en modo edición y confirmar que el grafo se reconstruye desde `graph`.
4. **Migración:** cargar flujos guardados con el schema viejo y confirmar que se migran (graph
   poblado, credenciales movidas a conexión) sin duplicar ni romper.
5. **Sheets:** con proxy Apps Script, conectar una hoja y confirmar que un poll trae filas y ejecuta
   la acción configurada.
6. `npm run typecheck`, `npm run lint`, `npm test` en verde (con tests nuevos de las Fases 3/4/6).
   Usar la skill `/verify` o `/run` para ejercitar la app real, no solo los tests.

## Fuera de alcance (documentado)

- Condiciones por-rama en el canvas (v1 usa condición global AND); webhooks entrantes de HubSpot
  (seguimos con polling); cron/scheduler real; sandbox para `transformCode` (sigue `new Function`,
  app mono-usuario).
