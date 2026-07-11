# Tareas — 023-flows-integrations-advanced

- **Spec:** [spec.md](./spec.md)

Checklist ejecutable por olas. Cada ola corresponde a una Fase del spec. Cerrar cada ola con
typecheck/lint/tests en verde antes de pasar a la siguiente (las olas D/E tocan `engine.ts` y el
schema en el mismo terreno que C, así que conviene ese orden).

---

## Ola A — Vault: persistencia elegible + auto-lock configurable

- [x] **A.1** `crypto.ts`: variante de clave extraíble + `exportKeyRaw`/`importKeyRaw` (sin tocar el
  default no-extraíble usado por las operaciones normales).
- [x] **A.2** `vault.ts`: `persistenceMode: "off"|"session"|"always"` + guardar/restaurar clave en
  `sessionStorage`/`localStorage`; `restoreFromPersistence()`; `lock()` limpia ambos storages.
- [x] **A.3** `vault-auto-lock.ts`: `autoLockMinutes` configurable (`0` = desactivado); omitir el lock
  de `beforeunload` cuando `persistenceMode !== "off"`.
- [x] **A.4** `App.tsx`: llamar `restoreFromPersistence()` en el bootstrap, antes de
  `initVaultAutoLock()`.
- [x] **A.5** UI "Seguridad del Vault" (selector de modo + minutos de auto-lock) con aviso del
  trade-off de seguridad.
- [x] **A.6** Tests de la Ola A (roundtrip export/import, unlock/lock con cada modo,
  restoreFromPersistence) + `npm run typecheck && npm run lint`.

## Ola B — Explorador de conexión (operación + respuesta cruda) + guías faltantes

- [x] **B.1** `connections.ts`: `runConnectionProbe(provider, config, secret, operation)` con
  `raw`/`records`; `testConnection` se conserva como envoltura de compatibilidad.
- [x] **B.2** `ConnectionDialog.tsx`: panel "Explorador de conexión" — selector de operación, botón
  ejecutar, visor de respuesta cruda (JSON).
- [x] **B.3** `AppsScriptGuide.tsx`: paso "Crear App Privada de HubSpot" (scopes, dónde copiar el
  token) + variante `provider: "email"` (deploy del Apps Script de envío, permisos `MailApp`); wire el
  botón de guía del tab Email en `IntegrationsPage.tsx`.
- [x] **B.4** Tests de la Ola B (`runConnectionProbe` por operación, `send-test` de email) +
  typecheck/lint.

## Ola C — Variables asistidas + asociación origen→destino intuitiva

- [x] **C.1** `deriveAvailableVariables(trigger, sample)` (con valor de ejemplo por campo) +
  `INTERNAL_TARGET_FIELDS` (catálogo de campos destino por entidad: Task/Project/Person).
- [x] **C.2** `VariablePicker.tsx` — menú `{{ }}` que inserta el token en la posición del cursor,
  mostrando el valor de ejemplo de cada variable.
- [x] **C.3** `TransformConfigFields.tsx`: reemplazar las dos `<Input>` de texto libre del mapeo por
  **dos selectores emparejados** (campo recibido ↔ campo interno) + botón "Auto-emparejar" por
  similitud de nombre; conservar opción de texto libre para casos avanzados.
- [x] **C.4** `FlowCanvas.tsx`: pasar `sample` también al nodo `action`; `ActionConfigFields.tsx`:
  colgar `VariablePicker` de cada input interpolable (createTask, createProject, setField,
  createNotification, email, createPerson).
- [x] **C.5** Tests de la Ola C (derivación de variables, catálogo interno, auto-emparejado, inserción
  de token) + typecheck/lint.

## Ola D — Nodo "Crear tarea" completo + referencia al proyecto recién creado

- [x] **D.1** `flow.ts`: `CreateTaskOutputSchema` gana `status?`, `assigneeId?`, `dueDate?`, `tags?`,
  `estimate?`, `summary?`, `projectRef?: "explicit"|"trigger"|"createdProject"`; bump
  `SCHEMA_VERSION` (`common.ts`) + migración identidad en `migrations.ts`.
- [x] **D.2** `engine.ts`: rastrear `lastCreatedProjectId` durante el loop de registros (lo setea
  `case "createProject"`); `case "createTask"` resuelve el proyecto según `projectRef`; aplica los
  campos nuevos al task creado.
- [x] **D.3** `ActionConfigFields.tsx` (case `createTask`): selector "Proyecto destino" (Específico vía
  `EntitySelect` / Proyecto del evento / Proyecto creado en este flujo), selector de área scoped, y
  campos completos (status, assignee, dueDate, tags, estimate, summary, description, priority);
  exponer `productId`/`fields` de `createProject` (ya en el schema, sin UI hoy).
- [x] **D.4** Tests de la Ola D (resolución de `projectRef` en sus 3 modos, campos nuevos llegan al
  task) + typecheck/lint.

## Ola E — Deduplicación por clave en crear-tarea / crear-proyecto

- [x] **E.1** `flow.ts`/`project.ts`: `dedupeKey?: string` en `CreateTaskOutputSchema` y
  `CreateProjectOutputSchema`; `dedupeKey?: string|null` en `Task`/`Project`; bump `SCHEMA_VERSION` +
  migración identidad.
- [x] **E.2** `engine.ts`: antes de crear task/proyecto, si hay `dedupeKey` configurado, interpolarlo y
  buscar una entidad existente con esa clave; si existe, omitir (registrar motivo); si no, crear y
  persistir la clave en la entidad nueva.
- [x] **E.3** Auditar y documentar en el spec cómo interactúan watermark
  (`poll-sync-state.ts`)/`idempotencyCheck`/dedup nuevo — confirmar que no se pisan entre sí.
- [x] **E.4** Tests de la Ola E (dos corridas con `dedupeKey` fijo → una entidad; sin `dedupeKey` sigue
  creando siempre) + typecheck/lint.

## Ola F — Historial profundo y depurable + panel de servicios programados

- [x] **F.1** `engine.ts`: instrumentar `runFlowEngine` para acumular `FlowRunTrace` opt-in (trigger
  matched, por registro: condiciones con veredicto+operandos, mapped, transform in/out, outputs con
  motivo skip/exec/error).
- [x] **F.2** `FlowRunLog` (`useFlowStore.ts`) gana `trace?: FlowRunTrace` + `preview?`; escribirlos en
  `applyFlowResult`/`recordOutcome` (`useDataStore.ts`), recortando el tamaño de la traza guardada.
- [x] **F.3** `FlowHistoryPage.tsx` + ruta `/app/flows/history` (`routes/paths.ts`) + botón "Historial"
  en `FlowsPage.tsx`; filtros por flujo/estado; **drawer de depuración** que renderiza la traza paso a
  paso (timeline con `<pre>` colapsables para los datos crudos).
- [x] **F.4** `ScheduledServicesPage.tsx` + ruta `/app/flows/services`; muestra
  `pollingManager.getStatus()`, estado del `retry-engine`, y estado del vault auto-lock (solo lectura).
- [x] **F.5** Auditar arranque/parada de `pollingManager` (fugas de `setInterval` al editar/borrar
  flujos), el intervalo de `retry-engine`, y `visibility-aware`; arreglar cualquier fuga encontrada.
- [x] **F.6** Tests de la Ola F (traza con condición fallida marca operandos, output omitido marca
  motivo; filtros de historial; `getStatus()` refleja altas/bajas) + typecheck/lint.

## Ola G — Generador IA de la lógica de transformación

- [x] **G.1** `src/ai/generate-transform.ts`: `runGenerateTransform(...)` reusando
  `createClient`/`rateLimiter`/`classifyAiError`/`getModelsByGroup`; valida el código generado con
  `new Function("record", code)` antes de devolverlo.
- [x] **G.2** `TransformConfigFields.tsx`: botón "✨ Generar con IA" + input de instrucción en lenguaje
  natural; usa `useAiConfigStore` para `apiKey`/`model`; reusa mensajes de error y enlace a
  Ajustes → IA.
- [x] **G.3** Tests de la Ola G (`parseGenerateResponse` limpia markdown y valida sintaxis, propagación
  de errores de key/rate-limit) + typecheck/lint.

## Cierre

- [x] `npm run build` en verde.
- [x] Smoke manual en navegador por fase (ver `## Verificación` en spec.md).
- [x] Actualizar `## Progreso` de `spec.md` con el resultado de cada ola (fecha, conteo de tests,
  hallazgos reales encontrados durante la implementación — mismo patrón que specs 020-022).
