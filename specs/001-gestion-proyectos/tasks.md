# Tasks — Gestor de Proyectos

Tareas numeradas por milestone. `[P]` = paralelizable. Cada milestone deja la app usable de punta a punta.

## M0 — Scaffold (columna vertebral) ✅
- [x] T001 Inicializar Vite + React + TS (estricto), ESLint/Prettier.
- [x] T002 Configurar Tailwind + tema base (light/dark) + tokens de diseño.
- [x] T003 Integrar shadcn/ui (button, card, dialog, tabs, input, badge, table, toast, dropdown) + lucide-react.
- [x] T004 [P] `domain/schemas/`: Zod de Workspace, Product, Project (Area/Process/Checklist/Item/Task), ProjectType, ChecklistTemplate, AutomationRule, Person, Notification. Tipos con `z.infer`.
- [x] T005 [P] `storage/StorageAdapter.ts` (interfaz del contrato).
- [x] T006 `storage/FileSystemAdapter.ts`: showDirectoryPicker, handle en IndexedDB, permisos, read/write/list/remove, escritura con backup.
- [x] T007 [P] `storage/DownloadAdapter.ts` (fallback export/import + IndexedDB).
- [x] T008 `storage/workspace.ts`: bootstrap de `workspace.json`, índice, validación, `backup()`.
- [x] T009 Layout app (sidebar + topbar con estado de guardado) + React Router + pantalla "Elegir carpeta".
- [x] T010 Store Zustand base + provisión del adapter; pantalla Ajustes (carpeta/tema/parámetros).
- [~] T011 [P] Tests: round-trip Zod por colección; `FileSystemAdapter` con mocks de handle (diferido).

## M1 — Núcleo CRUD ✅
- [x] T020 Productos: lista + crear/editar/eliminar (persistencia round-trip).
- [x] T021 Proyectos: lista con filtros (producto/estado) + CRUD + % avance.
- [x] T022 Detalle de proyecto: tabs (Resumen/Áreas/Tareas/Automatizaciones/Actividad).
- [x] T023 Áreas: añadir/editar/eliminar + marcar completa.
- [x] T024 Procesos por área: editor markdown + pasos + versión + render markdown.
- [x] T025 Checklists e ítems: CRUD, marcar hecho, responsable/fecha/notas, % de avance.
- [x] T026 Tareas (Kanban): columnas por estado, prioridad, responsable, fecha; crear tarea desde ítem.
- [x] T027 Personas: gestión básica para asignaciones (people.json), en Ajustes.

## M2 — Definiciones (Tipos y Plantillas) ✅
- [x] T030 Plantillas de Checklist: CRUD (nombre, categoría, ítems, requerido).
- [x] T031 Tipos de Proyecto: CRUD (áreas por defecto con plantillas asociadas por área).
- [x] T032 Flujo "Crear proyecto desde Tipo": despliega áreas + checklists + procesos.
- [x] T033 Plantillas de Proceso: CRUD (markdown + pasos).

## M3 — Automatizaciones ✅ (engine con tests Vitest)
- [x] T040 `automations/events.ts`: eventos vía diff de proyecto; emisión desde el data store.
- [x] T041 `automations/engine.ts`: evaluador puro trigger→condición→acción, idempotencia, sin re-entrancia.
- [x] T042 Constructor de reglas (UI): trigger, condiciones, acciones, activar/desactivar, scope.
- [x] T043 Reglas de estado (checklist/área completa → markAreaComplete/setProjectStatus).
- [x] T044 Plantillas automáticas (area.added → createChecklistFromTemplate, idempotente).
- [~] T045 Automatizaciones por defecto en Tipos: cubierto vía reglas con scope `type`; auto-attach por `defaultAutomationIds` diferido.

## M4 — Fechas y notificaciones ✅ (evaluador temporal puro con tests Vitest)
- [x] T050 Evaluación temporal (app.opened + foco de ventana): vencidos, por vencer, estancados. `automations/temporal.ts` + `lib/dates.ts`; ids deterministas idempotentes; disparo en `App.tsx`.
- [x] T051 Checklists recurrentes (daily/weekly) → reseteo idempotente por periodo (`rolloverRecurring`).
- [x] T052 Centro de notificaciones (leídas/no leídas, severidad) + badge en sidebar; persiste en notifications.json.
- [x] T053 "Resumen del día" en el dashboard (vencidos/por vencer/estancados + KPIs reales).

## M5 — Dashboard CEO ✅ (agregación pura + salud derivada con tests Vitest)
- [x] T060 KPIs de portafolio (activos, % avance medio, vencidos, estancados) + distribución por estado. `features/dashboard/portfolio.ts`.
- [x] T061 Salud RAG por producto/proyecto (manual + derivada vía `domain/health.ts`, toggle `deriveHealth` en Ajustes) + barra de distribución RAG y rollup por producto.
- [x] T062 Detección y vista de proyectos estancados (tarjeta dedicada con "días sin actividad").

## M6 — Pulido ✅ (migraciones con tests; export por colección; a11y base)
- [x] T070 Estados vacíos que guían en cada pantalla (las 9 vistas usan `EmptyState`).
- [x] T071 Navegación por teclado + contraste: "saltar al contenido" + `id=main-content`, anillo de foco global para enlaces/elementos custom (`index.css`), `aria-label` en botones-icono de las listas (Productos/Biblioteca/Automatizaciones) + revelado por `focus-within`.
- [x] T072 Export/Import completo + por colección (`features/settings/CollectionTransferCard.tsx`: 6 colecciones + people/notifications, merge por id, rehidrata).
- [x] T073 Backup antes de migraciones + prueba v1→v2: `domain/migrations.ts` (registro de migraciones forward + `migrateRecord`) cableado en los read paths de ambos adapters con snapshot único por sesión antes de la 1ª migración; `domain/migrations.test.ts` (6 tests, incluye cadena v1→v3 ficticia). No-op a v1.
- [~] T074 [P] Pulido visual: pasada medida (dashboard CEO ya reconstruido en M5; realce hover en KPIs). Skill frontend-design disponible para un rediseño más profundo si se desea.

## M7 — Experiencia: creación, relaciones y jerarquía ✅

- [x] T080 `EntitySelect`/`PersonSelect`/`MultiPersonSelect` reutilizables + reemplazo en forms existentes.
- [x] T081 `QuickAddInput` reutilizable; unificar `Enter` en ProjectFormDialog, ProcessEditorDialog (Enter añade paso); modo "Más opciones" en TaskFormDialog y ProjectFormDialog.
- [x] T082 `MultiPersonSelect` (RACI/stakeholders) en `ProjectFormDialog`; owners en proyecto/área (`AreaFormDialog`)/producto (`ProductFormDialog`)/proceso (`ProcessEditorDialog`).
- [x] T083 Helpers `instantiateChecklistFromTemplate`/`instantiateProcessFromTemplate`/`addMissingAreasFromType` en `instantiate.ts`; ops `applyChecklistToArea`/`applyProcessToArea` en `projectOps.ts`; botón "Aplicar plantilla" en `AreaCard` vía `ApplyTemplateDialog`; `typeId` expuesto en `ProjectFormDialog`.
- [x] T084 Vínculo ítem↔tarea visible en fila (indicador "→ Tarea" clicable + botón "Convertir en tarea" directo en hover); tarea muestra badge de área; `ChecklistSection` navega con `?tab=tasks&focus=<taskId>`.
- [x] T085 Cross-links: producto clicable en `OverviewTab` → `/projects?product=<id>`; contador de proyectos en `ProductsPage` → link filtrado; `ProjectsPage` lee `?product=` del query param.
- [x] T086 Deep-links con `?tab=areas|tasks|overview` y `?focus=<id>` desde notificaciones y dashboard; `ProjectDetailPage` controla tabs por query param; `TasksTab` y `ChecklistSection` resaltan y hacen scroll al objeto enfocado.
- [x] T087 Command palette (Cmd+K / Ctrl+K) con `cmdk`; indexa proyectos, productos, plantillas, tipos; acciones "Nuevo proyecto", "Desde tipo", "Ir a Biblioteca"; trigger visual en sidebar.
- [x] T088 `LibraryPage` reordenada (① Checklists → ② Procesos → ③ Tipos) con `LibraryOrderLegend`; estados vacíos con CTA de siguiente paso; `HierarchyLegend` en dashboard vacío; `DashboardPage` vacío con botones hacia Biblioteca y Proyectos.

## Verificación final (E2E)
Estado automatizado: typecheck limpio, build OK, **29 tests Vitest** (engine 6 · temporal 9 · health 8 · migrations 6).

Smoke test manual (ver `spec.md` HU + sección 8 del plan raíz): elegir carpeta → crear Tipo → crear Proyecto desde Tipo →
documentar Proceso → completar checklist (regla de estado) → fecha vencida (notificación + resumen) →
revisar JSON en disco (round-trip Zod) → dashboard refleja salud/estancados.

## M8 — Pulido de uso diario ✅
- [x] T090 Kanban drag-and-drop con `@dnd-kit/core` (+ `@dnd-kit/utilities`): `kanban/KanbanColumn.tsx` (droppable) + `kanban/TaskCard.tsx` (draggable, handle con aria-label); botón "Mover" conservado como fallback de teclado; `PointerSensor` con distancia 5px para no romper los botones de la tarjeta.
- [x] T091 Eventos `task.added` / `task.statusChanged` en `automations/events.ts` + triggers en `TriggerType`/labels + `events.test.ts` (4 tests).
- [x] T092 Doc agregado `activity`: `domain/schemas/activity.ts` (cap 500), `DocName` + `emptyDoc()` compartido en `StorageAdapter.ts` (refactor del doc-vacío duplicado en ambos adapters), `DOC_DIRS`/export/import en `FileSystemAdapter` y `DownloadAdapter`, `automations/activity.ts` puro (`describeEvents` + `appendEntries`) + `activity.test.ts` (4 tests), gancho `logActivity` en `createProject`/`saveProject` de `useDataStore`.
- [x] T093 `ActivityTab.tsx`: historial agrupado por día con deep-links `?tab=…&focus=…`; cableado en `ProjectDetailPage` (reemplaza EmptyState).
- [x] T094 `ProjectAutomationsTab.tsx`: reglas cuyo scope alcanza el proyecto (misma lógica del engine) + "Nueva regla" con `defaultScope` pre-fijado en `AutomationDialog`.
- [x] T095 Card "Organización" en Ajustes (`org.name`) + acción `updateOrg` en `useAppStore`.
- [x] T096 Limpieza: `PlaceholderPage.tsx` eliminado; README actualizado.

## M9 — Capa de herramientas IA estilo MCP ✅ (`src/ai/tools/`, dominio puro)
- [x] T100 `types.ts` (`ToolContext` inyectado + `defineTool` tipado) y `schema.ts` (`toFunctionDeclaration` vía `zod-to-json-schema` sin `$ref`; `toMcpTool` para paridad MCP futura).
- [x] T101 `serializers.ts`: vistas con presupuesto de tokens (projectSummary/projectDetail/taskView/productView/notificationView), reusa `domain/compute.ts`.
- [x] T102 `readTools.ts` (11 tools): get_workspace_overview (reusa `dashboard/portfolio.ts`), list_products/projects/tasks/project_types/templates/people/automations/notifications, get_project, search_workspace.
- [x] T103 `writeTools.ts` (8 tools con `describeCall` humano): create_task, update_task, set_checklist_item, create_project, create_project_from_type, update_project, add_area, create_product — todos vía acciones del store (automatizaciones + reindex + persistencia gratis).
- [x] T104 `registry.ts` (dispatcher `callTool` con `safeParse`; errores devueltos al modelo como dato) + `index.ts` (`createBoundTools` sobre los stores).
- [x] T105 `tools.test.ts` (13 tests): declaraciones sin $ref y required correcto, nombres snake_case únicos, dispatcher (desconocida/args inválidos/error de ejecución), read tools sobre contexto falso, write tools con spies.

## M10 — Cliente Gemini + Ajustes IA ✅ (`@google/genai` v2)
- [x] T110 `ai/config.ts`: `AiConfigSchema` (apiKey, model flash/pro, confirmWrites) persistido en IndexedDB (`aiConfig`) — NUNCA en workspace.json ni exportaciones. `store/useAiConfigStore.ts` con hydrate en `App.tsx`.
- [x] T111 `ai/gemini/client.ts` (`validateApiKey` vía `models.list`) + `errors.ts` (invalid-key/rate-limit/offline/aborted/unknown + mensajes ES).
- [x] T112 `ai/gemini/systemPrompt.ts` puro (org, fecha, umbrales, índice ligero de `workspace.index`, política de tools) + `systemPrompt.test.ts` (2 tests).
- [x] T113 `ai/gemini/agent.ts`: loop streaming multi-ronda (máx. 8) con function calling, hook `onConfirmWrite` (cancelación → functionResponse de error sin reintento), `AbortSignal`.
- [x] T114 `features/settings/AiSettingsCard.tsx`: key tipo password con ojo, "Validar y guardar" con badges accesibles, selector de modelo, checkbox de confirmación, borrar clave, link a Google AI Studio, ancla `#ia`.

## M11 — Panel de chat del asistente ✅
- [x] T120 `store/useChatStore.ts`: partes text/toolCall/pendingWrite, status idle/streaming/awaiting-confirmation/error, send/stop/approvePendingWrite/newConversation, snapshot `aiChat:last` en IndexedDB (cap 50 mensajes, sin payloads de tools).
- [x] T121 `AssistantPanel.tsx` global en `AppLayout` (derecha de `<main>`, sobrevive navegación) + atajo Ctrl/Cmd+J + botón "Asistente" en sidebar + estado abierto en localStorage.
- [x] T122 `ChatMessageList` (role=log aria-live) / `ChatMessageBubble` (Markdown existente) / `ToolCallChip` (chip colapsable con args/resultado) / `ChatInput` (Enter envía, Shift+Enter salto, botón detener).
- [x] T123 `WriteConfirmCard` inline (describeCall humano, Confirmar/Cancelar) integrado al flujo pendingWrite del agente.
- [x] T124 `AssistantEmptyState`: sin key → CTA a `/settings#ia`; con key → prompts sugeridos de PM. Errores visibles y recuperables (banner con mensaje ES).
- [x] T125 Persistencia de última conversación + "Nueva conversación" (limpia idb + historial Gemini).
- [x] T126 A11y: foco al abrir panel, aria-live en el log, aria-labels en controles, kbd hints.

## Verificación M8–M11
Estado automatizado: typecheck limpio, build OK, **52 tests Vitest** (los 29 previos + events 4 · activity 4 · tools 13 · systemPrompt 2).
Smoke test manual: arrastrar tarjeta Kanban → JSON en disco; completar checklist → entrada en Actividad; Ajustes → validar key real → asistente lee portafolio (chips de tools) → "crea una tarea…" → tarjeta de confirmación → tarea en Kanban + JSON + automatización disparada; exportar workspace → sin API key en el JSON.
