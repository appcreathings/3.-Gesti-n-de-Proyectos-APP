# Plan Técnico — MCP mejorado (005)

- **Feature:** 005-mcps-mejorados
- **Gates:** II (esquema-contrato, preservado) · V (simplicidad, sin nuevos transports) ·
  VI (migrabilidad, contrato público preservado). No toca I/III/IV.

## Stack y dependencias

| Cambio | Detalle |
|---|---|
| Nueva | `@modelcontextprotocol/sdk` (v1.x estable) — sólo en `src/ai/tools/server.ts` y `scripts/mcp-server.mjs` |
| Sin nuevas | runtime del SPA — `zod`, `zod-to-json-schema`, `@google/genai` siguen igual |

El SDK se aísla del resto del código: `agent.ts` y el Asistente no lo importan.

## Estructura objetivo

```
src/ai/tools/
  types.ts                  # AiTool, ToolContext, defineTool (sin cambios de contrato)
  schema.ts                 # toFunctionDeclaration, toMcpTool (sin cambios)
  registry.ts               # callTool, findTool, getFunctionDeclarations, createAiTools
  index.ts                  # createBoundTools (recompone stores sobre el dominio-split)
  serializers.ts            # vistas (sin cambios)
  compositTools.ts          # NUEVO: summarize_project_health, complete_checklist, apply_type_to_project
  glossary.ts               # NUEVO: helpers compartidos (label/name por id) por dominio
  read/
    workspace.ts            # get_workspace_overview, search_workspace
    project.ts              # list_projects, get_project
    task.ts                 # list_tasks
    template.ts             # list_project_types, list_templates
    people.ts               # list_people
    automation.ts           # list_automations
    notification.ts         # list_notifications
    product.ts              # list_products
  write/
    task.ts                 # create/update_task, ...
    project.ts              # create/createFromType/update/delete_project, add_area
    area.ts                 # update/delete_area
    checklist.ts            # add/update/remove_checklist_item, set_checklist_item
    template.ts             # create/update/delete checklist & process templates, create/update/delete project_type
    person.ts               # create/update/delete_person
    automation.ts           # create/update/delete_automation
    notification.ts         # create/mark_read/clear_notifications
    product.ts              # create/update/delete_product
  server.ts                 # NUEVO: arrancar MCP server via SDK (no se monta por defecto)
scripts/
  mcp-server.mjs            # NUEVO: entrypoint binario que monta server.ts en stdio
```

## Contrato preservado

`src/ai/tools/index.ts` mantiene `createBoundTools()`, `AiTool`, `ToolContext`, `callTool`,
`getFunctionDeclarations`, `findTool`. `agent.ts` (M11) y los tests (M9) no cambian.

Los tests existentes pasan porque el `AiTool[]` que produce `createAiTools(ctx)` es la
concatenación de los nuevos módulos en el mismo orden lógico (read primero, write después).

## Tools compuestos (firmas)

- **summarize_project_health**
  ```ts
  input: { projectId: string }
  output: {
    project: { id, name, status, health, daysUntilDue },
    areas: Array<{ id, name, completed, progressPct, overdueItems, dueSoonItems, tasks }>,
    totals: { overdueItems, dueSoonItems, requiredIncomplete, tasksByStatus },
    next: Array<{ id, label, dueDate, daysLeft }>, // top-10 por proximidad
  }
  ```
  Reusa `areaProgress` / `projectTaskProgress` / `daysUntil` (dominio puro).

- **complete_checklist**
  ```ts
  input: {
    projectId: string;
    areaId: string;
    checklistId: string;
    mode: "all" | "required" | "ids";
    itemIds?: string[];   // obligatorio si mode="ids"
  }
  output: { ok: true, marked: number, skipped: number }
  ```
  Mutación via `actions.mutateProject` (automatizaciones + persistencia).

- **apply_type_to_project**
  ```ts
  input: { projectId: string; typeId: string; onlyMissing?: boolean /* default true */ }
  output: {
    ok: true,
    addedAreas: Array<{ name, instantiatedChecklists, instantiatedProcesses }>;
  }
  ```
  Reusa `addMissingAreasFromType` (de `domain/instantiate.ts`).

## Servidor MCP (`src/ai/tools/server.ts`)

- Importa `@modelcontextprotocol/sdk/server/{stdio,index}.js` y `mcp-types`.
- Expone: `createMcpServer(tools: AiTool[], callToolImpl: typeof callTool)`: `McpServer`.
- `tools/list` → mapea `AiTool` → `{ name, description, inputSchema }` usando `toMcpTool`.
- `tools/call` → normaliza `params.arguments ↔ params.args`, delega a `callTool`, devuelve
  `{ content: [{ type: "text", text: JSON.stringify(result) }], isError: !ok }`.
- Sin persistencia: el caller le pasa un `callToolImpl` ya enlazado a un contexto (en el
  entrypoint se cablea con un `ToolContext` que no persiste, sólo reporta errores de read-only;
  **el alcance real de mutación depende del contexto inyectado**).

### Entry point (`scripts/mcp-server.mjs`)

- Compila/importa el módulo TS? **No.** Para mantenerlo simple y sin toolchain extra, el entrypoint
  es un `.mjs` que usa `tsx` (`npx tsx scripts/mcp-server.mjs`) o se compila con `tsc -b` y se
  expone `dist/.../server.js`. **Decisión final:** `tsx` (debe agregarse a devDependencies).
- Por ahora, el `ToolContext` que monta es un stub mínimo de **sólo lectura** apuntando a datos
  quemados; sirve para validar el handshake MCP contra clientes externos sin tocar el
  filesystem del usuario. La documentación lo dice explícitamente:
  > "Servidor MCP de sólo lectura sobre fixtures. Para usar el servidor con los datos reales
  > del usuario desde el SPA, use el Asistente integrado (Cmd/Ctrl+J)."

## Tests (Vitest)

- `src/ai/tools/dispatcher.test.ts` (nuevo, 3): preserva contrato del dispatcher al cambiar el split.
- `src/ai/tools/compositeTools.test.ts` (nuevo, 3): cada tool compuesto con datos sintéticos.
- `src/ai/tools/server.test.ts` (nuevo, 2): handshake con `InMemoryTransport` (listar +
  llamar), `tools/call` con args inválidos → `isError: true`.
- `src/ai/tools/readTools.test.ts` (nuevo, refactor de los 13 tests actuales): distribuidos
  entre los módulos por dominio o centralizados aquí. Decisión: **mantener** un `readTools.test.ts`
  con snapshot del listado total (nombres únicos, descripciones, sin `$ref`) y **mover** los
  tests de ejecución a `registry.test.ts` (dispatcher) ya existente.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Romper el contrato público (`AiTool`/`ToolContext`/`createBoundTools`) | El refactor sólo reorganiza módulos; tests de M9+M11 son la red de seguridad. |
| Índices duplicados de tools (mismo nombre dos veces) | Test nuevo: nombres únicos sobre el array total. |
| `toMcpTool` ahora se invoca múltiples veces (impacto perf) | Sólo se llama al handshake del servidor MCP, no en cada turn. |
| `tsx` añade dependencia sólo para el comando MCP | Aislado a `mcp:server`; el build de Vite no la usa. |
| `@modelcontextprotocol/sdk` aún no instalado | Instalar en este M12, validar tipado contra TS estricto. |

## Estrategia de implementación (F0–F5)

- **F0 Deps.** `npm i @modelcontextprotocol/sdk tsx -D` + `package.json` script `mcp:server`.
- **F1 Split por dominio.** Mover definiciones de `readTools.ts` a `read/<domain>.ts` y de
  `writeTools.ts` a `write/<domain>.ts`; re-exports en `registry.ts` para preservar
  `createReadTools`/`createWriteTools` o reemplazar por `createAiTools` (se elige la segunda:
  eliminar las funciones públicas intermedias reduce superficie).
- **F2 Composite.** Nuevo `src/ai/tools/compositTools.ts` (+ tests).
- **F3 Server MCP.** `src/ai/tools/server.ts` exporta `createMcpServer`. Scripts `mcp-server.mjs`.
- **F4 Ajuste tests existentes** que importaban de `readTools`/`writeTools` directamente.
  Verificar que `tools.test.ts` siga funcionando con los import paths actualizados.
- **F5 Verificación.** `npm run typecheck && npm run test && npm run build`.

## Verificación final

- `npm run typecheck` limpio.
- `npm run test` con todos los tests en verde (≥ 9 nuevos + 52 previos = **61**).
- `npm run build` limpio.
- `npm run mcp:server` arranca con handshake JSON-RPC válido (probado por test con
  `InMemoryTransport` y por smoke manual opcional).

## Gates de la constitución (rev.)

- ✅ **I Local-first:** sin cambios; el servidor MCP de sólo lectura usa fixtures, no accede a FS.
- ✅ **II Esquema-contrato:** `AiTool` y `ToolContext` idénticos; `getFunctionDeclarations` igual.
- ✅ **III Plantillas/Tipos:** sin cambios.
- ✅ **IV Diseño limpio:** más cohesión por dominio; sin nuevos componentes UI.
- ✅ **V Simplicidad/incremental:** sólo stdio, sin HTTP; sin auth.
- ✅ **VI Migrabilidad:** contrato público preservado; `StorageAdapter` intacto.
