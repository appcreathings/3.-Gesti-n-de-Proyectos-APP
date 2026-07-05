# Tasks — MCP mejorado (005)

Tareas por fase. Cada fase deja typecheck limpio. Antes de seguir, `npm run typecheck && npm run test`.

## F0 — Dependencias ✅

- [x] T500 `npm i @modelcontextprotocol/sdk tsx -D` en el `package.json` raíz.
- [x] T501 Script `"mcp:server": "tsx scripts/mcp-server.mjs"` en `package.json`.

## F1 — Split por dominio (read + write) ✅

- [x] T510 Crear `src/ai/tools/glossary.ts` con helpers `*Name(id)` movidos desde `writeTools.ts`
      (`projectName`, `productName`, `checklistTemplateName`, `processTemplateName`,
      `typeName`, `personLabel`, `automationName`, `areaLabel`) + `requireX(id)` equivalentes.
- [x] T511 `src/ai/tools/read/{workspace,project,task,template,people,automation,notification,product}.ts`:
      mover cada `defineTool` del `readTools.ts` actual al módulo correspondiente (8 archivos).
- [x] T512 `src/ai/tools/write/{task,project,area,checklist,template,person,automation,notification,product}.ts`:
      mover cada `defineTool` del `writeTools.ts` actual (9 archivos).
- [x] T513 Refactor `registry.ts`: `createAiTools` agrega todos los módulos (`createReadTools` y
      `createWriteTools` ya no existen como exports públicos); mantener nombres en orden estable.
- [x] T514 Validación: test consolidado `namesAndShapes.test.ts` (nombres snake_case únicos,
      declaraciones sin `$ref`, `required` correcto).
- [x] T515 **Eliminar** `src/ai/tools/readTools.ts` y `src/ai/tools/writeTools.ts` (no quedan
      re-exports — los imports vienen directo de los módulos; verificar con grep).

## F2 — Tools compuestos ✅

- [x] T520 `src/ai/tools/compositTools.ts`: implementa `summarize_project_health`,
      `complete_checklist`, `apply_type_to_project` reusando `domain/compute.ts` + `instantiate.ts`.
- [x] T521 Registrar en `createAiTools` (después de los write tools).
- [x] T522 Tests `compositeTools.test.ts` (3 tests, uno por tool, con datos sintéticos que
      cubran el caso feliz y el edge case de ids no encontrados).

## F3 — Servidor MCP ✅

- [x] T530 `src/ai/tools/server.ts`: `createMcpServer(tools, callToolImpl): McpServer` que monta
      `Server` (con `ListToolsRequestSchema` y `CallToolRequestSchema`); normaliza
      `params.arguments ↔ params.args`.
- [x] T531 `scripts/mcp-server.mjs`: entrypoint que importa `server.ts` (vía `tsx`) y crea un
      contexto de sólo lectura con fixtures quemadas; log a `stderr` (nunca `stdout`,
      requisito de MCP stdio).
- [x] T532 README del repo: documentar `npm run mcp:server` y su carácter de sólo lectura.

## F4 — Ajustes a tests y arquitectura ✅

- [x] T540 `src/ai/tools/tools.test.ts` (M9): reemplazar `readTools.ts`/`writeTools.ts` por
      imports directos desde `read/index.ts` y `write/index.ts` (o desde `registry`).
- [x] T541 `src/ai/tools/dispatcher.test.ts` (3): preserva contrato del dispatcher
      (desconocida, args inválidos, error de ejecución) tras el split.
- [x] T542 `src/ai/tools/server.test.ts` (2): usa `InMemoryTransport` del SDK para
      `tools/list` + `tools/call` (args válidas e inválidas → `isError`).

## F5 — Verificación ✅

- [x] T550 `npm run typecheck`: 0 errores TS estrictos.
- [x] T551 `npm run test`: ≥ **61** tests (52 previos + 9 nuevos) en verde.
- [x] T552 `npm run build`: `tsc -b && vite build` limpio.

## Pendiente explícito

- Smoke manual opcional: arrancar `npm run mcp:server` y conectar Claude Desktop u otro
  cliente MCP — fuera del flujo automatizado.
