# Memoria del proyecto — Gestión de Proyectos APP (Hito)

Bitácora técnica por spec. Cada entrada resume qué cambió, dónde, y qué quedó
pendiente, para que cualquier sesión futura (humano o agente) recupere contexto
sin releer todo el repo. Orden: más reciente primero.

> **Nota de creación:** este archivo se inicia con la spec 030. Las specs
> 001–029 se implementaron antes de existir esta bitácora y no están
> retro-portadas aquí; su histórico vive en `specs/*/` y en `git log`.

## Stack y convenciones (recordatorio)

- **App:** React 18 + Vite + TypeScript + Zustand + Zod, SPA local-first.
- **Storage:** `StorageAdapter` con dos implementaciones — `FileSystemAdapter`
  (Chromium, File System Access API, una carpeta de `.json`) y `DownloadAdapter`
  (Firefox/Safari, IndexedDB + export/import). Singleton de módulo en
  `useAppStore.ts`, reasignado solo por `bootstrap()`/transiciones de modo.
- **Validación:** toda entidad se valida con `collectionSchema[col].parse` en el
  I/O boundary (constitución, principio II). `SCHEMA_VERSION = 14`.
- **Tests:** Vitest en entorno `node` (sin jsdom). Cmd: `npm.cmd run typecheck`
  / `npm.cmd test` / `npm.cmd run build`. En Windows, **no** usar `Start-Process`
  con npm — usar la Bash tool o `npm.cmd`.
- **Specs:** GitHub Spec Kit (`spec.md` / `design.md` / `tasks.md` por feature).
  El `Estado` en `spec.md` pasa de `Borrador` → `Implementado (fecha)` al cerrar.

---

## Spec 031 — Resiliencia de la integración con Gemini (errores de cuota y fallback) (2026-07-20)

**Estado:** Implementado. Smoke E2E real con una key sin cuota pendiente (T3151) — verificado
unitariamente con el JSON exacto reportado por el usuario.

### Qué hace
Corrige cuatro bugs que provocaban que el asistente **siempre** fallara con "espera unos
segundos" cuando la cuenta de Google Cloud del usuario tiene la cuota en 0 (no un pico
transitorio), y que el sistema de fallback construido en specs 006/012 no rescataba al
usuario.

### Cambios clave
- **`src/ai/gemini/errors.ts`**: nuevo `AiErrorKind "project-quota-zero"`, detectado por
  `hasZeroQuota(e)` (regex `/"quota_limit_value"\s*:\s*"?0"?(?!\d)/` sobre `e.message`) que
  se ejecuta **antes** del `if (status === 429)` genérico. Mensaje accionable: explica que
  reintentar no ayuda, dirige a Google Cloud Console / AI Studio.
- **`src/ai/gemini/agent.ts`**: reescrito `runAgentTurn` — reemplazado el reintento único
  desprotegido por `attemptTurn(modelId, message)` (función que devuelve
  `{ ok, calls | kind }` en vez de lanzar) + bucle `while (!outcome.ok)` que recorre **todo**
  el grupo de fallback vía `modelSelector.select(preferred, group, tried)` con `Set` acumulativo.
  `project-quota-zero` / `invalid-key` / `offline` / `unknown` / `aborted` cortan en el primer
  fallo sin probar más modelos (decisión explícita de la spec: la cuota-cero es de
  proyecto/región, cambiar de modelo no ayuda). Cuando se agota el grupo, el resultado es
  `"all-models-exhausted"` (antes se escapaba como `"rate-limit"`).
- **`src/ai/gemini/agent.ts:AgentTurnResult`**: añadido `rawMessage?: string` con el mensaje
  crudo del SDK para el detalle técnico colapsable.
- **`src/store/useChatStore.ts`**: `buildRagContext(...)` envuelto con `.catch(() => "")` —
  un fallo del embedding (cuota, red, etc.) ya no rompe `send()`; el turno del agente continúa
  sin contexto RAG. Añadido `errorDetail: string | null` al store.
- **`src/ai/rag/search.ts`**: `embedText` reescrito para recorrer `getModelsByGroup("embedding")`
  con `classifyAiError` (mismo patrón que `runImproveWithFallback`, spec 012) — prueba
  `gemini-embedding-2` cuando `gemini-embedding-001` cae por rate-limit/cuota, y relanza
  directo ante `project-quota-zero`/`invalid-key`/etc.
- **`src/ai/modelSelector.ts`**: eliminado `selectAfterRateLimit` (quedó sin uso tras el bucle
  con `Set tried`); reemplazado por `select(preferred, group, excludeIds)` que ya aceptaba un
  Set como tercer arg. Tests actualizados para cubrir el camino `excludeIds`.
- **`src/ai/improve.ts`**: añadido `rawMessage?` a `ImproveResult` y `ImproveResultWithMeta`;
  `runImprove`/`runImproveWithFallback` propagan el mensaje crudo del SDK.
- **UI (Fase 4):**
  - **`AssistantPanel.tsx`**: lee el nuevo `errorDetail`, renderiza `<details>` "Ver detalle
    técnico" con el JSON del SDK en `<pre>`. El mensaje principal sigue siendo `AI_ERROR_MESSAGES[error]`.
  - **`AiSuggestionsPanel.tsx`**: añadido `errorDetail?` prop + `<details>` idéntico; caso
    `project-quota-zero` añadido al switch `getErrorActions` (showSettings=true,
    showChangeModel=false, showRetry=false — ni cambiar modelo ni reintentar ayudan).
  - **`useAiImprove.ts` / `useGenerateTransform.ts` / `AiImproveButton.tsx`**: añadido el caso
    `project-quota-zero` a los mapeos locales (algunos tipados como `Record<string, string>`
    escapaban al chequeo exhaustivo de tsc) y propagado `errorDetail`.

### Supuesto crítico confirmado (Fase 0, T3101)
Inspeccionado `node_modules/@google/genai@2.10.0/dist/index.mjs`: el SDK construye `ApiError`
con `message = JSON.stringify(errorBody)` en el camino no-streaming (`index.mjs:8407-8413`,
`embedContent`/`generateContent`) y `message = "got status: ${status}. ${JSON.stringify(chunkJson)}"`
en el streaming (`index.mjs:8164`, `sendMessageStream`). En ambos casos el cuerpo JSON —
incluyendo `"quota_limit_value":"0"` — viaja como texto dentro de `Error.message`. La
implementación de `hasZeroQuota`/`extractStatus` leyendo directamente de `e.message` es
correcta. Detalle registrado en `design.md §2`.

### Tests nuevos
- **`src/ai/gemini/errors.test.ts`** (14 tests): JSON real del usuario → `project-quota-zero`;
  regresiones para 429 sin cuota-cero (`rate-limit`), 400/401/403 (`invalid-key`),
  TypeError (`offline`), `navigator.onLine=false` (prioridad correcta del guard offline).
- **`src/ai/gemini/agent.test.ts`** (8 tests): T3123 cascada con 4 modelos del grupo flash,
  T3124 corte inmediato ante `project-quota-zero` (1 solo stream), T3125 happy path + éxito
  tras 1 fallback, variante `project-quota-zero` en 2º intento corta también, `autoFallback=false`.
- **`src/ai/rag/search.test.ts`** (+5 tests sobre los 6 existentes): `embedText` cae a
  `gemini-embedding-2` ante rate-limit, NO cae ante `project-quota-zero`/`invalid-key`,
  lanza último error cuando todos caen.
- **`src/store/useChatStore.ragFallback.test.ts`** (3 tests): `buildRagContext` lanza →
  `runAgentTurn` igual se llama, status `idle`, mensaje del usuario persiste; variante
  `ragEnabled=false` no invoca buildRagContext.
- **`src/ai/modelSelector.test.ts`**: reemplazados los 2 tests de `selectAfterRateLimit` por
  2 tests del parámetro `excludeIds` (el camino que usa el nuevo bucle).

### Verificación
- `npm run typecheck` ✓, `npm test` ✓ (563 tests, +30 nuevos respecto a spec 030), `npm run build` ✓.
- **T3151 smoke E2E real pendiente:** requeriría una API key con cuota real en 0; los tests
  unitarios alimentan el JSON exacto reportado por el usuario a `classifyAiError` y verifican
  la clasificación + el corte del bucle de fallback con mocks, que es lo único que la app
  controla (la cuota real es del lado de Google Cloud).

### Back-compat / no rotos
- `SCHEMA_VERSION` sin cambios. Sin migraciones. Sin cambios a `MODEL_REGISTRY`/`FALLBACK_CHAINS`.
- `selectAfterRateLimit` eliminado era solo usado por `agent.ts` (verificado con grep).
- `AiErrorKind` es parte de la superficie pública de `errors.ts`; añadir un caso es un
  "breaking change" intencional de TypeScript que la propia spec usa como checklist — `tsc`
  señaló los `Record<AiErrorKind, ...>` exhaustivos que faltaba actualizar, todos cubiertos.
- Sin telemetría ni logging remoto: `rawMessage` vive solo en el estado de React de la sesión,
  nunca sale del navegador (Principio I).

---

## Spec 030 — Demo local + modo navegador por defecto (2026-07-20)

**Estado:** Implementado. Smoke visual manual pendiente (sin Playwright en la sesión).

### Qué hace
`/app` accesible por defecto en cualquier navegador: siembra automáticamente un
demo realista (startup SaaS ficticia **"Nimbus"**) que vive en el navegador
(IndexedDB) hasta que el usuario conecte una carpeta local. Resuelve la asimetría
Chromium (muro de carpeta) vs Firefox/Safari (app vacía).

### Cambios clave
- **`src/storage/mode.ts`** (nuevo): modo persistente (`"filesystem"|"browser"`) +
  flags de ciclo de vida del demo (`isDemoSeeded`/`isDemoCleared`/`banner`) en
  `localStorage` con `try/catch` defensivo.
- **`src/storage/index.ts`**: `createStorageAdapter(mode)` — la elección de
  adapter se desacopla del navegador y depende del modo.
- **`src/store/useAppStore.ts`**: `const adapter` → `let adapter` (reasignable);
  `bootstrap()` resuelve modo (un handle guardado **siempre** gana → back-compat
  HU-06), reasigna el adapter si toca, y siembra el demo **solo** en modo
  navegador + nunca sembrado/vaciado + workspace vacío. Nuevas acciones
  `connectFolderFromBrowser({keepDemo})`, `clearWorkspace()`, `loadDemo()` — las
  tres terminan en `window.location.reload()` (Principio V: evita re-hidratar
  N stores en caliente).
- **`src/domain/demo/`** (nuevo): `seedData.ts` construye el escenario Nimbus
  con las factories reales + `instantiateProjectFromType`; `seed.ts` lo escribe
  vía `adapter.write`/`writeDoc`. IDs fijos `demo-*` (trazables, cero colisión
  con datos uuid reales). 1 producto, 1 trimestre, 4 personas (RACI), 2 tipos,
  2 plantillas checklist + 2 proceso, 3 proyectos (Kanban en los 4 estados,
  health amber, hito, sprint activo, comentarios/subtareas, ítem de checklist
  enlazado a tarea), 1 automatización, actividad + notificaciones.
- **UI nueva:** `WorkspaceStatus` (reemplaza el indicador read-only del sidebar:
  sincronizado / sin sincronizar + "Conectar carpeta" o "Exportar copia"),
  `ConnectFolderDialog` (3 salidas: llevar datos / empezar limpio / cancelar,
  sobre `ui/dialog` directo, **no** `ConfirmDialog`), `DemoBanner` (descartable,
  sobre el `<Outlet/>`). Integradas en `AppLayout.tsx`.
- **`SettingsPage.tsx`**: card "Datos de ejemplo" (cargar / vaciar) solo en modo
  navegador. **`DashboardPage.tsx`**: CTA "Cargar datos de ejemplo" en estado
  vacío si `mode==="browser" && !isDemoCleared()`.

### Decisiones de implementación (correcciones a design.md)
- **`clearWorkspace` no usa `importAll(emptyBundle`)**: ambos `importAll`
  (FileSystem y Download) son **aditivos** — no borran entidades ausentes del
  bundle. Se implementa con `list`+`remove` por colección + `writeDoc(emptyDoc)`
  + `writeWorkspace(emptyWorkspace())`, que funciona idéntico en ambos adapters.
  Corrección registrada en `design.md §4`.
- **`isDemo = mode==="browser" && isDemoSeeded() && !isDemoCleared()`**: el
  `&& !isDemoCleared()` es necesario para que, tras "Vaciar", el banner no
  quede colgado sobre un workspace vacío. Refinamiento registrado en
  `design.md §4`.

### Back-compat (HU-06) — el riesgo crítico, verificado con tests
Cubierta por `src/store/useAppStore.bootstrap.test.ts` (5 tests):
1. Handle guardado (Chromium) → modo filesystem, **nunca** siembra.
2. Handle guardado + permiso revocado → `needs-reconnect`, sin sembrar.
3. Productos/proyectos reales en DownloadAdapter (Firefox) → **no** siembra encima.
4. Perfil limpio siembra exactamente una vez; la recarga no re-siembra.
5. Tras `isDemoCleared`, no vuelve a sembrar aunque el workspace esté vacío.

### Verificación
- `tsc --noEmit` ✓, `vitest run` ✓ (533 tests, +14 nuevos: mode 9, bootstrap 5,
  seed 9 — alguno reemplaza stub), `vite build` ✓.
- `dist/sitemap.xml` sigue incluyendo `/app` y subrutas; `robots.txt` sin
  cambios (`Allow: /`).
- **Pendiente:** smoke visual manual en navegador real (Chromium fresh → demo →
  editar → recargar → "Conectar carpeta" llevar datos / empezar limpio;
  Firefox → "Exportar copia" + vaciar; back-compat con `local-data-app/` ya
  conectada). No ejecutable en esta sesión por falta de harness de navegador.

### Fuera de alcance ( intacto / no tocado )
Sin cambios de esquema ni migraciones (`SCHEMA_VERSION` sigue en 14). Flujos/
Integraciones no se siembran en el demo. SSR/SSG y ruta `/demo` pública
descartados. `ConnectScreen.tsx` sin cambios (ya solo alcanzable en modo
carpeta; su copy no mencionaba el demo).
