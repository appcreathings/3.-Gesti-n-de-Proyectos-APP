# Spec 022 — Ejecutar flujos manualmente + mapeo de datos guiado por muestra real

## Progreso

- **Fase A — Muestra real en "Probar conexión" → mapeo guiado: ✅ implementada y verificada
  (2026-07-10).**
  - `parseSheetRows` extraída de `sheets-poller.ts` a función pura reutilizable (sin cambiar su
    comportamiento — 8 tests preexistentes en verde tras el refactor).
  - `ConnectionTestResult` gana `sample?: Record<string,unknown>[]`. HubSpot: sube el límite de la
    prueba a 3 registros y los aplana (`{id, ...properties}`, igual que el poller real). Sheets:
    usa `parseSheetRows` con el `headerRow` de la conexión en vez de solo contar filas. 6 tests
    nuevos (`connections.test.ts`, no existía).
  - Hilo de datos trigger→transform (la conexión ya existía en el canvas, solo faltaba pasar un
    dato más por el mismo camino): `TriggerStep` (`onSampleChange`) → `TriggerNodeDrawer` →
    `FlowCanvas` (nuevo estado `triggerSample`, efímero) → `TransformConfigFields` (`sample` prop).
  - `TransformConfigFields`: con muestra real, el input de "campo origen" gana un `<datalist>`
    nativo con los campos reales disponibles (sin dependencia nueva), más un panel plegable de
    "Vista previa de datos" con los registros crudos. Sin muestra (aún no se probó la conexión),
    cae al ejemplo hardcodeado de antes — mensaje honesto invitando a probar la conexión primero.
  - Verificado visualmente en navegador (Playwright): el caso sin-muestra renderiza limpio, sin
    errores de consola, el mapeo sigue funcionando como texto libre normal.
  - `typecheck`/`lint`/`test` (282/282)/`vite build` en verde.

- **Fase B — Ejecutar ahora (flujos de polling): ✅ implementada y verificada (2026-07-10).**
  - Nuevo `src/flows/manual-run.ts`: `fetchPollSampleForFlow(trigger)` — resuelve la conexión y llama
    **directo** al poller real (`pollHubSpot`/`pollHubSpotDeals`/`pollHubSpotTickets`/
    `pollGoogleSheets`, sin duplicar lógica) con `lastSyncAt: null` siempre, para que una prueba
    manual nunca dependa del watermark incremental del poll automático. 6 tests nuevos.
  - `pollTriggerKey` exportado desde `engine.ts` (antes privada) para que `manual-run.ts` construya
    el mismo `externalData` sin repetir la lógica de la key.
  - Nueva acción `useDataStore.runFlowNow(flowId, options?)`: corre `{...flow, enabled: true}`
    transitorio (bypassea `enabled` sin tocar el flujo guardado — se puede probar uno que aún no se
    activó) contra un solo flujo (nunca corre otros que compartan conexión/poll key), aplica por el
    mismo camino que un poll automático (`applyFlowResult` — sube `runCount`, entra al historial).
    5 tests nuevos (`useDataStore.runFlowNow.test.ts`).
  - **Bug real encontrado por el smoke test y arreglado**: un fallo *antes* de llegar al motor
    (conexión borrada, vault bloqueado, error de CORS/red) se devolvía a quien llamaba pero nunca
    quedaba registrado en el historial del flujo — el panel se veía vacío ("Historial (0)") sin
    ninguna pista de qué pasó. Ahora todo desenlace de "Ejecutar ahora" queda en el historial.
  - UI: botón "▶ Ejecutar ahora" en cada tarjeta de `FlowsPage.tsx` (solo para flujos de poll — los
    de evento lo ganan en la Fase C), con `ConfirmDialog` de aviso. `ConfirmDialog` ganó un prop
    `confirmVariant` (antes el botón de confirmar siempre era rojo/"Eliminar" — mal para una acción
    que no es un borrado). Tras ejecutar, el panel de historial se expande solo para mostrar el
    resultado — sin introducir un sistema de toasts nuevo.
  - Verificado end-to-end en navegador real (Playwright): crear un flujo de poll → "Ejecutar ahora"
    → diálogo de confirmación (botón azul, no rojo) → confirmar → historial muestra el error real
    de conexión con detalle claro. Cero errores de consola inesperados.
  - `typecheck`/`lint`/`test` (293/293)/`vite build` en verde.

- **Fase C — Ejecutar ahora (flujos de evento): ✅ implementada y verificada (2026-07-10).**
  - Nuevo `src/flows/synthetic-event.ts`: tabla `EVENT_SEED_REQUIREMENTS` (qué entidad extra necesita
    cada uno de los 11 `DomainEvent` — `task`/`area`/`checklist`/`item`/`none`) + `buildSyntheticEvent`,
    función pura que arma el evento real a partir de la entidad elegida. Los campos `from`/`to` se
    autocompletan con el valor actual de la entidad (decisión v1). Se implementaron los 11 tipos
    completos — al construirlo resultó ser el mismo patrón de selects en cascada sin importar la
    profundidad, así que no hizo falta excluir `item.checked`/`checklist.completed` como preveía el
    plan. 10 tests nuevos.
  - Nuevo `RunEventFlowDialog.tsx`: selector de Proyecto (`EntitySelect`, reutilizado tal cual) y,
    según el tipo de evento, cascada de Tarea o Área→Checklist→Ítem. El botón "Ejecutar ahora" queda
    deshabilitado hasta que la entidad requerida esté completa — verificado visualmente que el gate
    funciona (proyecto sin tareas → botón gris → tarea elegida → botón se habilita).
  - `runFlowNow` extendido: rama `event` usa `options.syntheticEvent`, mismo camino que polling
    (motor + `applyFlowResult`). 2 tests nuevos cubriendo el camino de evento.
  - **Segundo bug real encontrado por el smoke test** (misma familia que el de la Fase B): un flujo
    que corre sin error pero no ejecuta nada (0 outputs configurados, o las condiciones filtraron
    todos los registros) tampoco quedaba en el historial — ni `errors` ni `executedFlowIds` lo
    cubrían. Arreglado con el mismo patrón `recordOutcome`. 1 test nuevo.
  - `FlowsPage.tsx`: el botón "Ejecutar ahora" ahora aparece para **todos** los flujos (antes solo
    poll); para los de evento abre `RunEventFlowDialog` en vez del `ConfirmDialog` genérico.
  - Verificado end-to-end en navegador real con datos reales: crear proyecto → crear tarea → crear
    flujo de evento → "Ejecutar ahora" → elegir proyecto → elegir tarea (el selector se puebla con la
    tarea real) → botón se habilita → confirmar → historial muestra "El flujo corrió pero no tiene
    ninguna acción configurada" (mensaje honesto, ya que el flujo de prueba no tenía outputs). Cero
    errores de consola.
  - `typecheck`/`lint`/`test` (306/306)/`vite build` en verde.

**Estado: spec 022 completo — las 3 fases implementadas y verificadas.**

## Context

Spec 021 (`specs/021-hubspot-sheets-robustness/spec.md`, Fases A+B completas, Fase C en curso —
verificación guiada con el usuario) dejó las conexiones de HubSpot/Sheets funcionando de verdad. Pero
construir y probar un flujo sigue siendo lento e inseguro:

1. **No hay forma de ejecutar un flujo manualmente.** Hoy un flujo solo corre automáticamente (evento
   interno real, o el intervalo de polling). Para saber si un flujo hace lo que uno espera, hay que
   esperar a que ocurra un evento real o a que pase el intervalo — no hay botón "probar esto ahora".
   (Investigación confirmada: `src/flows/engine.ts:92` `runFlowEngine` ya acepta correr un subconjunto
   de flows, y `pollingManager.pollNow()` — `src/integrations/polling/polling-manager.ts:78` — ya
   sabe ejecutar un poller bajo demanda, pero **nada en la UI ni en el store los conecta** a un flujo
   específico; `useFlowStore` no tiene ninguna acción "ejecutar este flujo".)
2. **El mapeo de campos es texto libre a ciegas.** El paso de Transformación
   (`src/features/flows/canvas/TransformConfigFields.tsx`) tiene dos inputs de texto plano para
   `source`/`target`, sin autocompletar ni mostrar qué campos existen de verdad. La única "muestra"
   que existe hoy es una lista **hardcodeada** de ejemplo (`getSampleDataForTrigger`, línea 15-23),
   nunca datos reales. Mientras tanto, "Probar conexión" (`src/integrations/connections.ts:102`) **sí
   trae registros reales** (un contacto de HubSpot, una fila de Sheets) pero los descarta por completo
   — solo devuelve `{ok, detail}` (texto), tirando el payload real que ya tiene en memoria.

**Outcome buscado:** poder darle a "Ejecutar ahora" a un flujo y ver el resultado real de inmediato
(con confirmación, porque de verdad crea/modifica datos), y que al mapear campos en el paso de
Transformación el usuario vea y elija entre los campos reales que trae la conexión, no que los
adivine a ciegas.

## Decisiones confirmadas con el usuario

- **Confirmación antes de ejecutar de verdad**: "Ejecutar ahora" muestra un diálogo de confirmación
  (mismo patrón que `ConfirmDialog` ya usado para eliminar un flujo) antes de correr — no es
  "vista previa", corre de verdad (crea tareas/proyectos, puede mandar email/webhook), así que se
  avisa antes.
- **Selector de evento simplificado para v1**: para flujos disparados por evento, el usuario elige
  la entidad real (proyecto, y tarea/área si aplica) desde selects existentes
  (`src/components/forms/EntitySelect.tsx`); los campos extra del evento (`from`/`to`, etc.) se
  autocompletan con el valor **actual** de la entidad elegida, sin pedirlos a mano. Cubre "¿mis
  acciones disparan bien sobre esta entidad real?" sin un formulario distinto por cada uno de los
  11 tipos de evento.

## Fase A — Muestra real en "Probar conexión" → mapeo guiado

- **`src/integrations/connections.ts`**: extender `ConnectionTestResult` con `sample?:
  Record<string, unknown>[]` (opcional). Rama HubSpot: subir el `limit` de la prueba a unos pocos
  registros y devolver `results` aplanados (`{id, ...properties}`, igual que ya hace
  `hubspot-poller.ts`). Rama Sheets: en vez de solo contar filas, parsear la primera fila de datos
  usando `headerRow` — extraer esa lógica de `sheets-poller.ts` a una función pura compartida
  (`parseSheetRows`) para no duplicarla.
- **Threading del sample hasta el mapeo** (la conexión trigger→transform ya existe en el canvas, solo
  falta pasar un dato más por el mismo camino):
  `TriggerStep.tsx` (`handleTestConnection`) guarda el `sample` de la última prueba exitosa y lo
  expone vía un nuevo prop `onSampleChange` → `TriggerNodeDrawer.tsx` lo reenvía → `FlowCanvas.tsx`
  lo guarda en estado del canvas (junto a `triggerData`, ya existente) y lo pasa como prop nuevo al
  `case "transform"` (ya recibe `trigger={...}` ahí mismo) → `TransformConfigFields.tsx` lo recibe.
  Es efímero (estado de React, no se persiste) — coincide con cómo ya funciona "Probar con datos de
  ejemplo" hoy.
- **`TransformConfigFields.tsx`**: si hay `sample` real, se usa (si no, cae al fallback hardcodeado
  actual). El input de `source` en cada fila de mapeo gana un `<datalist>` nativo con las claves del
  sample (autocompletar sin dependencia nueva). Se agrega un panel plegable de "Vista previa de
  datos" mostrando el/los registro(s) de muestra para que el usuario vea valores reales, no solo
  nombres de campo.
- Tests: `testConnection` devuelve `sample` poblado (HubSpot y Sheets); `parseSheetRows` extraída y
  testeada una sola vez, reusada por el poller y por `testConnection`.

## Fase B — Ejecutar ahora (flujos disparados por polling)

- Nuevo `src/flows/manual-run.ts`: `runFlowNow(flow: FlowRule): Promise<ManualRunResult>`. Para
  trigger `poll`: resuelve la conexión, llama **directo** al poller real
  (`pollHubSpot`/`pollHubSpotDeals`/`pollHubSpotTickets`/`pollGoogleSheets`, ya existentes) con
  `lastSyncAt: null` (fuerza traer datos frescos, ignora el watermark incremental — así una prueba
  nunca da "0 resultados" solo porque nada cambió desde el último poll real), usando los
  `fields`/`filters` reales del trigger (misma función que ya usa el registro automático — sin
  duplicar lógica). Corre `runFlowEngine` con `flows: [{...flow, enabled: true}]` (bypassea el
  filtro de `enabled` sin tocar el flujo guardado — así se puede probar un flujo que aún no se activó)
  y aplica con `applyFlowResult` (mismo camino que un poll automático: sube `runCount`, entra al
  historial).
- UI: botón "▶ Ejecutar ahora" en cada tarjeta de `FlowsPage.tsx` (junto a Editar/Eliminar), con el
  `ConfirmDialog` de aviso. Tras ejecutar, expandir automáticamente el panel de historial (ya existe)
  para que el resultado sea visible de inmediato.
- Tests: `manual-run.test.ts` — confirma `lastSyncAt: null`, que solo corre el flujo pedido (no otros
  que compartan la misma conexión), y que aplica aunque el flujo esté deshabilitado.

## Fase C — Ejecutar ahora (flujos disparados por evento)

- Diálogo nuevo (ej. `RunEventFlowDialog.tsx`): selector de Proyecto (`EntitySelect`) y, según el
  tipo de evento del trigger, selector adicional de Tarea o Área (cascada, scoped al proyecto
  elegido) — tabla de qué necesita cada uno de los 11 `DomainEvent` (algunos solo necesitan
  `projectId`; otros `taskId`; los de checklist/ítem necesitan un paso más anidado). Campos como
  `from`/`to` se completan solos con el valor actual de la entidad elegida.
- Construye el `DomainEvent` sintético con esos ids reales y corre por el mismo camino que la Fase B
  (`runFlowNow` gana una variante para eventos: `flows:[{...flow,enabled:true}]`, `events:
  [syntheticEvent]`), aplica con `applyFlowResult`.
- Si en el camino los tipos de evento más anidados (`item.checked`, `checklist.completed`) resultan
  demasiado UI para esta fase, se puede dejar esos dos fuera de "Ejecutar ahora" en v1 (mensaje "este
  tipo de evento no soporta ejecución manual todavía") y cubrir los otros 9 — decisión a tomar según
  cómo se vea la UI real, no bloqueante para el resto de la fase.
- Tests: función pura de construcción del evento sintético a partir del tipo + ids elegidos.

## Archivos clave

- **Fase A**: `src/integrations/connections.ts`, `src/integrations/inbound/sheets-poller.ts`
  (extraer `parseSheetRows`), `src/features/flows/steps/TriggerStep.tsx`,
  `src/features/flows/canvas/TriggerNodeDrawer.tsx`, `src/features/flows/canvas/FlowCanvas.tsx`,
  `src/features/flows/canvas/TransformConfigFields.tsx`.
- **Fase B**: nuevo `src/flows/manual-run.ts`, `src/features/flows/FlowsPage.tsx`, reusa
  `src/flows/engine.ts` (`runFlowEngine`), `src/store/useDataStore.ts` (`applyFlowResult` — puede
  necesitar exportarse o replicarse mínimamente si hoy es privada al módulo), pollers ya existentes.
- **Fase C**: nuevo diálogo bajo `src/features/flows/`, reusa `src/components/forms/EntitySelect.tsx`,
  `src/automations/events.ts` (formas de `DomainEvent`), extiende `manual-run.ts`.

Reutilizar: `EntitySelect` (`src/components/forms/EntitySelect.tsx`), `ConfirmDialog` (ya usado en
`FlowsPage.tsx` para eliminar), `pollHubSpot*`/`pollGoogleSheets` (`src/integrations/inbound/`),
`applyFlowResult`/`runFlowEngine` (motor y aplicación ya existentes, sin reinventar).

## Verificación

- `npm run typecheck && npm run lint && npm test` en verde con los tests nuevos de cada fase.
- `npm run build` en verde.
- Smoke manual en navegador (dev server): Fase A — probar una conexión real o mockeada y confirmar
  que el datalist de mapeo se puebla con campos reales. Fase B — ejecutar un flujo de poll ya
  configurado (de spec 021) y confirmar que trae datos reales y aplica. Fase C — ejecutar un flujo de
  evento eligiendo una tarea real existente y confirmar que la acción configurada corre sobre ella.

## Fuera de alcance (documentado)

- Modo "vista previa sin persistir" para "Ejecutar ahora" — se decidió que corre de verdad, con
  confirmación previa, no en modo simulación.
- Formulario completo editable para los 11 tipos de evento (from/to a mano) — v1 usa el valor actual
  de la entidad elegida.
- Autocompletar también el campo `target` del mapeo — no tiene un enum real de campos válidos (depende
  de qué outputs interpolen qué claves), se deja como texto libre.
