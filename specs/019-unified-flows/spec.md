# Spec 019: Refactorización del Flow Builder

## 0. Revisión crítica y remediación (2026-07-09)

> Este spec se cerró como "✅ COMPLETADO" el 2026-07-07. Una auditoría archivo
> por archivo (3 exploraciones independientes + lectura directa del código)
> encontró que esa conclusión era falsa: la mayoría de las rutas críticas
> estaban **construidas pero rotas de punta a punta**, el mismo patrón que ya
> había afectado a [018-integrations-mvp](../018-integrations-mvp/spec.md).
> Los 201 tests pasaban porque probaban piezas aisladas — p. ej. el test de
> poll fabricaba a mano el `externalData` que producción nunca construía.

### 0.1 Los 18 problemas reales encontrados (antes de esta remediación)

**Motor interno (evento → acción) — funcionaba pero con bugs de targeting:**
1. `createTask`/`setProjectStatus`/`setField`/`markAreaComplete` operaban sobre `projectMap.values().next().value` — el **primer proyecto arbitrario**, ignorando el `projectId` real del evento.
2. El change-tracking marcaba **todos** los proyectos como cambiados en cualquier output interno → re-persistía y subía `updatedAt` de todos.
3. `createNotification` fijaba `entityRef.projectId: ""` → notificación sin vínculo.
4. `incrementRunCount` subía el contador de todos los flows habilitados por cada evento, hubieran matcheado o no.
5. `executeTransform` tragaba el error silenciosamente y descartaba el registro sin traza.
6. Con `mapping: []` (el caso por defecto), `applyMapping` devolvía `{}` — **borraba todo el registro** — pese a que la UI decía "los datos se pasarán sin transformar".

**HubSpot inbound (poll) — muerto de punta a punta:**
7. `runFlowEngine` solo se invocaba sin `externalData` desde `useDataStore` → `matchesTrigger` de poll siempre daba `false`.
8. `PollResult.newRecords` era un **número** (conteo), no los registros; nada construía el mapa que el engine esperaba.
9. El sink era un stub: `executeMappingAction` = `console.log` en los 3 pollers de HubSpot.
10. `lastSyncAt` nunca se persistía entre polls (siempre `null`) y la idempotencia persistente consultaba una key que nunca se escribía.

**Webhooks outbound — no disparaba nada nunca:**
11. `dispatcher.ts` hacía `.where("enabled").equals(1)` contra un campo **booleano** (`true !== 1`, e IndexedDB no indexa booleanos) → siempre `[]`.
12. Editar una webhook subscription sobrescribía el secreto real con la máscara `"••••••••••••"` (el campo era de solo lectura en la UI, así que esto pasaba en *cada* edición).

**Vault:**
13. `unlock()` aceptaba **cualquier** contraseña (sin canario de verificación) — "desbloqueado con éxito" seguido de fallos silenciosos de `decrypt`.

**Routing / duplicación:**
14. Editar un flow navegaba a `/app/flows/:id/edit`, ruta **inexistente** → 404. El builder era create-only.
15. Al guardar, el builder redirigía a `/app/automations` (página legacy huérfana del menú) en vez de a Flows.
16. Tres superficies solapadas: `AutomationsPage` (legacy, funcional pero fuera del menú), `FlowsPage` (nueva), `IntegrationFlowBuilder` (sandbox cuyos botones "Guardar"/"Activar" no tenían `onClick`).
17. `migrateAutomationsToFlows` existía pero **nunca se invocaba** desde ningún lado.

**Schema deshonesto:**
18. El enum de triggers de evento incluía `date.due`/`date.approaching`/`app.opened`, que el store **nunca emite** (triggers muertos), y omitía eventos reales que sí emite (`task.commented`, `task.archived`, `task.unarchived`, etc.).

### 0.2 Qué se corrigió en esta remediación

Todo lo anterior se corrigió de punta a punta, en 7 fases:

- **Fase A** — `src/flows/engine.ts`: targeting correcto vía `projectId`/`areaId`/`taskId` del evento origen (nunca "el primero"); change-tracking preciso (solo el proyecto realmente mutado); `executedFlowIds` para que `runCount` solo suba en flows que de verdad ejecutaron; errores de transform capturados en `result.errors` en vez de descartados en silencio; `applyMapping([])` ahora pasa el registro tal cual (coincide con lo que la UI ya prometía).
- **Fase B** — Los 3 pollers de HubSpot (`hubspot-poller.ts`, `-deals-poller.ts`, `-tickets-poller.ts`) ahora solo hacen fetch y devuelven `records` planos; el mapeo/outputs los define el propio flow. Nuevo `useDataStore.runPolledFlow()` + `applyFlowResult()` compartido corren el flow engine con `externalData` real. `lastSyncAt` persiste en `localStorage` por poll-key.
- **Fase C** — `dispatcher.ts` filtra `enabled === true` en memoria (no más `.equals(1)`); editar una webhook subscription ya no reescribe el secreto si no se tocó; `vault.ts` verifica un canario cifrado en `unlock()`.
- **Fase D** — Ruta `flows/:id/edit` real; `FlowBuilderPage` soporta modo edición; `useFlowStore.updateFlow` siempre desregistra el polling previo antes de re-registrar (evita fugas de timers); `polling-manager.register()` limpia cualquier timer previo para la misma key.
- **Fase E** — Legacy Automations se migra una sola vez a Flows (`useFlowStore.migrateLegacyAutomations`); `/app/automations` y `/app/integrations/new` redirigen a Flows; una sola superficie de creación.
- **Fase F** — El enum de eventos del trigger ahora coincide exactamente con lo que el store emite; se retiró el `ScheduleSchema` muerto; nuevo historial de ejecución por flow (`useFlowStore.runs`), visible en `FlowsPage`.
- **Fase G** — 21 tests nuevos (targeting, change-tracking, executedFlowIds, transform errors, dispatcher, vault, migración) + limpieza de `any` en los archivos tocados. `npm run typecheck` y `npm test` (222/222) limpios; `npm run lint` sin errores nuevos (los que quedan son preexistentes, ajenos a Flows/Integraciones).

### 0.3 Qué queda fuera de alcance (documentado, no implementado)

- Google Sheets inbound (`sheets-poller.ts`) sigue siendo código muerto — no hay `gapi` cargado ni un poller registrado para él.
- No hay scheduler de cron real (se retiró la superficie muerta en vez de construir uno).
- `transformCode` sigue ejecutando `new Function` sin sandbox (aceptado como macro local de una app mono-usuario; solo se mejoró el reporte de errores).
- `AutomationsPage.tsx` e `IntegrationFlowBuilder.tsx` (+ sus 6 steps) quedan como archivos sin usar — las rutas ya no los sirven, pero no se borraron los archivos en esta pasada.
- La verificación end-to-end real de HubSpot (con un proxy Apps Script en vivo) y de un webhook contra un endpoint real no se pudo ejecutar en este entorno; el camino de poll está cubierto por tests unitarios (`runPolledFlow`/`externalData`) pero no por una prueba con HubSpot real.

---

## Contexto

El Flow Builder actual tiene problemas fundamentales que impiden su funcionamiento:

1. **Conceptos confundidos**: Sheets y Schedule como "inputs" no tienen sentido lógico
2. **Código de transformación roto**: El placeholder y la ejecución no coinciden
3. **Sin conexión real**: Integraciones (HubSpot, webhooks, email) son UI sin backend
4. **No cumple requerimiento**: No permite automatizar acciones sobre objetos reales

## Objetivo

Crear un Flow Builder funcional que permita automatizar acciones sobre los objetos reales de la aplicación (tareas, proyectos, personas) con integraciones externas opcionales.

## Requerimiento Original

> "Tener un flow builder que me permita crear automatizaciones con integraciones a la medida a partir de los diferentes objetos de la aplicación"

## Plan de Refactorización

### Fase 1: Simplificar Schema ✅ COMPLETADO

**Objetivo**: Eliminar conceptos sin sentido y clarificar terminología

**Cambios realizados**:
- ✅ Eliminar `SheetsInputSchema` y `ScheduleInputSchema`
- ✅ Renombrar `Input` → `Trigger` (más claro)
- ✅ Renombrar `poll-hubspot` → `poll` (solo un provider por ahora)
- ✅ Agregar validación de sintaxis en `transformCode`
- ✅ Mover `schedule` a propiedad opcional del FlowRule
- ✅ Renombrar `InputStep.tsx` → `TriggerStep.tsx`
- ✅ Actualizar todos los archivos que usan `input` para que usen `trigger`
- ✅ Corregir conflictos de nombres en `index.ts`
- ✅ Todos los tests pasando (191 tests)

**Archivos modificados**:
- `src/domain/schemas/flow.ts`
- `src/domain/schemas/index.ts`
- `src/features/flows/steps/TriggerStep.tsx` (renombrado de InputStep.tsx)
- `src/features/flows/FlowBuilderPage.tsx`
- `src/features/flows/steps/OutputStep.tsx`
- `src/flows/engine.ts`
- `src/flows/engine.test.ts`
- `src/flows/migration.ts`

**Criterios de aceptación**:
- [x] Schema solo tiene `EventTrigger` y `PollTrigger`
- [x] `transformCode` valida sintaxis JavaScript
- [x] TypeScript compila sin errores
- [x] Todos los tests pasan

**Tiempo**: 0.5 días (completado)

---

### Fase 2: Refactorizar TriggerStep (1 día)

**Objetivo**: Simplificar UI y conectar con API real

**Cambios**:
- Renombrar `InputStep.tsx` → `TriggerStep.tsx`
- Eliminar opciones "Google Sheets" y "Programado"
- Renombrar "Evento Interno" → "Cuando ocurra un evento"
- Renombrar "HubSpot Polling" → "Cuando lleguen datos de HubSpot"
- Agregar guía de configuración paso a paso para HubSpot
- Conectar "Probar conexión" con fetch real (no fake)

**Archivos**:
- `src/features/flows/steps/TriggerStep.tsx` (renombrado de InputStep.tsx)
- `src/features/flows/FlowBuilderPage.tsx` (actualizar imports)

**Criterios de aceptación**:
- [ ] Solo 2 opciones de trigger: evento y polling
- [ ] Guía de configuración visible para HubSpot
- [ ] "Probar conexión" hace fetch real al proxy
- [ ] Muestra resultado real (éxito/error)

---

### Fase 3: Corregir Código de Transformación (0.5 días)

**Objetivo**: Hacer que el editor de código funcione correctamente

**Cambios**:
- Corregir placeholder para que retorne directamente (no defina función)
- Agregar validación de sintaxis antes de ejecutar
- Usar datos reales del trigger configurado en pruebas
- Mostrar errores de sintaxis claramente

**Archivos**:
- `src/features/flows/steps/LogicStep.tsx`

**Criterios de aceptación**:
- [ ] Placeholder muestra código que retorna directamente
- [ ] Validación de sintaxis antes de ejecutar
- [ ] Usa datos reales del trigger en pruebas
- [ ] Errores de sintaxis se muestran claramente

---

### Fase 4: Conectar Acciones Internas (2 días) ⭐ PRIORIDAD

**Objetivo**: Conectar outputs con useDataStore para que las acciones funcionen

**Cambios**:
- Conectar `createTask` con `useDataStore.addTask()`
- Conectar `createPerson` con `useDataStore.createPerson()`
- Conectar `setProjectStatus` con `useDataStore.updateProject()`
- Conectar `createNotification` con `useDataStore.addNotifications()`
- Ejecutar flows cuando ocurran DomainEvents
- Agregar logging de ejecuciones

**Archivos**:
- `src/flows/engine.ts`
- `src/store/useDataStore.ts`

**Criterios de aceptación**:
- [ ] Flow con trigger "task.statusChanged" + output "createNotification" funciona
- [ ] Flow con trigger "checklist.completed" + output "createTask" funciona
- [ ] Flow con trigger "project.statusChanged" + output "setProjectStatus" funciona
- [ ] Notificaciones aparecen en el centro de notificaciones
- [ ] Tareas se crean en el proyecto correcto
- [ ] Logs de ejecución se registran

---

### Fase 5: Conectar Integraciones Externas (2 días)

**Objetivo**: Conectar HubSpot, webhooks y email con backend real

**Cambios**:
- Conectar polling con `pollingManager.register()`
- Conectar credenciales con vault (encriptar/desencriptar)
- Conectar webhooks con `dispatchOutboundEvents()`
- Conectar email con `sendEmailViaAppsScript()`
- Firmar payloads con HMAC-SHA256

**Archivos**:
- `src/flows/engine.ts`
- `src/integrations/polling/polling-manager.ts`
- `src/integrations/outbound/dispatcher.ts`

**Criterios de aceptación**:
- [ ] Flow con trigger "poll" + output "createPerson" trae datos reales de HubSpot
- [ ] Credenciales se encriptan con vault
- [ ] Webhooks se envían a Zapier/Slack
- [ ] Emails se envían vía proxy
- [ ] Payloads firmados con HMAC-SHA256

---

### Fase 6: Persistencia y UI Final (1 día)

**Objetivo**: Guardar flows y mostrar lista

**Cambios**:
- Crear `useFlowStore` para gestionar flows
- Persistir flows en IndexedDB (`integrationDb.flowRules`)
- Conectar FlowBuilderPage con FlowStore
- Crear FlowsPage (lista de flows guardados)
- Agregar botón "Activar/Desactivar"
- Mostrar historial de ejecuciones

**Archivos**:
- `src/store/useFlowStore.ts` (nuevo)
- `src/features/flows/FlowBuilderPage.tsx`
- `src/features/flows/FlowsPage.tsx` (renombrado de AutomationsPage.tsx)
- `src/storage/integration-db.ts` (agregar tabla flowRules)

**Criterios de aceptación**:
- [ ] Flows se guardan en IndexedDB
- [ ] Flows persisten tras recargar página
- [ ] Lista de flows muestra nombre, trigger, outputs, estado
- [ ] Botón "Activar/Desactivar" funciona
- [ ] Botón "Editar" abre FlowBuilderPage
- [ ] Botón "Eliminar" elimina flow

---

## Orden de Implementación

1. **Fase 1** (Schema) - Base para todo lo demás
2. **Fase 4** (Acciones internas) - Prioridad del usuario
3. **Fase 2** (TriggerStep) - UI simplificada
4. **Fase 3** (Código transformación) - Corregir bugs
5. **Fase 6** (Persistencia) - Flows guardados
6. **Fase 5** (Integraciones externas) - HubSpot, webhooks, email

## Tiempo Total Estimado

**7 días** (0.5 + 2 + 1 + 0.5 + 1 + 2)

## Criterios de Aceptación Globales

- [ ] Flow Builder permite crear automatizaciones con eventos internos
- [ ] Flow Builder permite crear automatizaciones con polling de HubSpot
- [ ] Las acciones internas (crear tarea, persona, notificación) funcionan
- [ ] Las integraciones externas (webhooks, email) funcionan
- [ ] Los flows se guardan y persisten
- [ ] El código de transformación funciona correctamente
- [ ] La UI es clara y guía al usuario
- [ ] TypeScript compila sin errores
- [ ] Tests unitarios pasan

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| HubSpot API cambia | Baja | Alto | Proxy del usuario aísla de cambios |
| Vault se corrompe | Baja | Alto | Backup de credenciales en File System |
| Performance con muchos flows | Media | Medio | Lazy loading + pagination |
| Usuario olvida contraseña vault | Media | Alto | Warning claro + no recovery (by design) |

## Decisiones de Diseño

### ¿Por qué eliminar Sheets y Schedule como triggers?

**Sheets**: No es una fuente de eventos. Es una fuente de datos que se puede consultar, pero no dispara automatizaciones por sí sola. Si el usuario necesita datos de Sheets, puede usar un flow con trigger "schedule" que consulte Sheets como parte de la lógica.

**Schedule**: Es un cron job, no un input de datos. Un schedule dice "cuándo ejecutar", no "de dónde vienen los datos". Se mueve a propiedad opcional del FlowRule para flows que necesitan ejecución periódica sin trigger de evento.

### ¿Por qué renombrar Input → Trigger?

"Input" es ambiguo. Puede significar:
- De dónde vienen los datos (HubSpot)
- Cuándo se ejecuta el flow (evento)
- Qué datos se procesan (record)

"Trigger" es más claro: dice cuándo se ejecuta el flow. Los datos que se procesan son el "record" o "data" del trigger.

### ¿Por qué priorizar acciones internas?

1. **Valor inmediato**: El usuario puede automatizar tareas sin configurar integraciones externas
2. **Menos complejidad**: No requiere proxies, credenciales, ni APIs externas
3. **Base sólida**: Una vez que las acciones internas funcionan, agregar integraciones externas es incremental
4. **Testing más fácil**: No depende de servicios externos para validar

---

## Changelog

- **2026-07-07**: Spec inicial creado
- **2026-07-07**: Refactorización planificada tras análisis crítico
- **2026-07-07**: Fase 1 completada - Schema simplificado y renombrado
- **2026-07-07**: Fase 2 completada - TriggerStep refactorizado con guía de configuración
- **2026-07-07**: Fase 3 completada - Código de transformación corregido con validación de sintaxis
- **2026-07-07**: Fase 4 completada - Acciones internas conectadas con useDataStore
- **2026-07-07**: Fase 5 completada - Integraciones externas conectadas (webhooks con HMAC, email con firma)
- **2026-07-07**: Fase 6 completada - FlowsPage creada con lista de flujos, toggle, editar y eliminar
- **2026-07-07**: Extensión de deals/tickets completada:
  - Schema extendido para soportar objectType: "contacts" | "deals" | "tickets"
  - Creados pollers específicos: `hubspot-deals-poller.ts` y `hubspot-tickets-poller.ts`
  - Extendido mapping-engine con mappings por defecto para deals y tickets
  - Actualizado TriggerStep UI con selector de objectType y campos dinámicos
  - Creado hubspot-polling-manager para registro automático de polling
  - Integrado con useFlowStore para registro/desregistro automático
  - Tests unitarios para ambos pollers (10 tests adicionales)
  - Total de tests: 201 (todos pasando)
- **2026-07-09**: Auditoría crítica reveló que el estado "✅ COMPLETADO" era incorrecto — ver §0 al inicio del documento para el detalle completo de los 18 problemas encontrados y las 7 fases de remediación aplicadas.

## Progreso

Las casillas de abajo describen la construcción original (2026-07-07); ver §0.2 para lo que la remediación del 2026-07-09 corrigió sobre esta base.

- [x] Fase 1: Simplificar Schema (0.5 días) - construida
- [x] Fase 2: Refactorizar TriggerStep (1 día) - construida
- [x] Fase 3: Corregir Código de Transformación (0.5 días) - construida
- [x] Fase 4: Conectar Acciones Internas (2 días) - construida, con bugs de targeting (corregidos en la remediación, Fase A)
- [x] Fase 5: Conectar Integraciones Externas (2 días) - construida, pero desconectada (corregida en la remediación, Fases B/C)
- [x] Fase 6: Persistencia y UI Final (1 día) - construida, con edición rota (corregida en la remediación, Fase D)
- [x] Extensión Deals/Tickets (4 días) - construida, con el mismo problema de Fase 5

**Estado real (2026-07-09)**: ✅ Remediado y verificado (`typecheck` + `lint` + 222 tests en verde). Ver §0.3 para lo que queda explícitamente fuera de alcance.

## Extensión Completada: Deals y Tickets de HubSpot

### Resumen

La extensión para traer **deals** (negocios) y **tickets** (soporte) de HubSpot ha sido implementada exitosamente. El Flow Builder ahora soporta tres tipos de objetos de HubSpot:

- **Contacts**: Contactos de HubSpot (email, nombre, empresa)
- **Deals**: Negocios/Oportunidades (dealname, amount, dealstage, pipeline)
- **Tickets**: Tickets de soporte (subject, content, priority, category)

### Archivos Creados

1. **`src/integrations/inbound/hubspot-deals-poller.ts`**
   - Poller específico para deals de HubSpot
   - Endpoint: `/crm/v3/objects/deals`
   - Campos: dealname, amount, dealstage, closedate, pipeline, hubspot_owner_id
   - Soporte para incremental sync con lastSyncAt

2. **`src/integrations/inbound/hubspot-tickets-poller.ts`**
   - Poller específico para tickets de HubSpot
   - Endpoint: `/crm/v3/objects/tickets`
   - Campos: subject, content, hs_ticket_priority, hs_pipeline_stage, hs_ticket_category
   - Soporte para incremental sync con lastSyncAt

3. **`src/integrations/inbound/hubspot-polling-manager.ts`**
   - Manager centralizado para registro de polling
   - Desencripta tokens del vault automáticamente
   - Selecciona el poller correcto según objectType
   - Registra polling con backoff exponencial

4. **`src/integrations/inbound/hubspot-deals-poller.test.ts`**
   - Tests unitarios para poller de deals
   - 5 tests: fetch exitoso, errores API, errores de red, incremental sync, resultados vacíos

5. **`src/integrations/inbound/hubspot-tickets-poller.test.ts`**
   - Tests unitarios para poller de tickets
   - 5 tests: fetch exitoso, errores API, errores de red, incremental sync, resultados vacíos

### Archivos Modificados

1. **`src/domain/schemas/flow.ts`**
   - Extendido `PollTriggerSchema` para soportar `objectType: "contacts" | "deals" | "tickets"`

2. **`src/integrations/inbound/mapping-engine.ts`**
   - Agregados mappings para `hubspot-deals`:
     - dealname → title
     - amount → value
     - dealstage → stage
     - closedate → closeDate
     - pipeline → pipeline
   - Agregados mappings para `hubspot-tickets`:
     - subject → title
     - content → description
     - hs_ticket_priority → priority
     - hs_pipeline_stage → status
     - hs_ticket_category → category

3. **`src/features/flows/steps/TriggerStep.tsx`**
   - Actualizado `HUBSPOT_OBJECT_TYPES` para incluir "tickets"
   - Agregado `HUBSPOT_FIELDS_BY_TYPE` con campos sugeridos por objectType
   - UI muestra dinámicamente los campos según el objectType seleccionado

4. **`src/flows/engine.ts`**
   - Actualizado `matchesTrigger()` para manejar diferentes objectTypes
   - Actualizado `resolveTriggerData()` para usar la key correcta según objectType
   - Keys: "hubspot" para contacts, "hubspot-deals" para deals, "hubspot-tickets" para tickets

5. **`src/store/useFlowStore.ts`**
   - `addFlow()`: Registra polling automáticamente si trigger es poll y está habilitado
   - `updateFlow()`: Re-registra polling si trigger es poll y está habilitado
   - `deleteFlow()`: Desregistra polling si el flow eliminado tenía trigger poll

### Flujo de Trabajo

1. **Usuario crea un flow con trigger poll**:
   - Selecciona "Cuando lleguen datos de HubSpot"
   - Elige objectType: contacts, deals, o tickets
   - Configura proxy URL y access token
   - Selecciona campos a traer
   - Configura intervalo de polling

2. **Flow se guarda**:
   - `useFlowStore.addFlow()` detecta trigger poll
   - Importa dinámicamente `hubspot-polling-manager`
   - Llama a `registerHubSpotPolling(trigger)`
   - Manager desencripta token del vault
   - Selecciona poller correcto según objectType
   - Registra polling con `pollingManager.register()`

3. **Polling se ejecuta**:
   - Cada intervalo configurado (default: 5 min)
   - Llama al poller específico (contacts/deals/tickets)
   - Poller hace fetch a endpoint correcto
   - Aplica filtros de lastSyncAt si existe
   - Transforma datos con mapping-engine
   - Ejecuta acciones configuradas

4. **Flow se elimina**:
   - `useFlowStore.deleteFlow()` detecta trigger poll
   - Llama a `unregisterHubSpotPolling(objectType)`
   - Polling se detiene automáticamente

### Tests

- **Total de tests**: 201 (191 previos + 10 nuevos)
- **Tests de deals poller**: 5 tests pasando
- **Tests de tickets poller**: 5 tests pasando
- **Cobertura**: Fetch exitoso, errores API, errores de red, incremental sync, resultados vacíos

### Consideraciones de Rate Limits

HubSpot tiene límites de API que varían por plan:
- **Starter**: 10 req/10s
- **Professional**: 150 req/10s
- **Enterprise**: 200 req/10s

El polling manager implementa backoff exponencial para manejar rate limits:
- Intervalo base: configurable (default: 5 min)
- Backoff: duplica intervalo tras cada error
- Máximo: 30 minutos
- Recuperación: vuelve al intervalo base tras éxito

### Próximos Pasos

La extensión está completa y funcional. Posibles mejoras futuras:
1. Soporte para campos personalizados de HubSpot
2. Mapeo de owners de HubSpot a personas de Hito
3. Filtros avanzados por pipeline/stage
4. Webhooks de HubSpot en lugar de polling (requiere servidor)

