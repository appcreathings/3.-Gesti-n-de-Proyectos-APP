# Spec 027 — Flujos: validación, plantillas, organización y expresividad — listo para producto

## Progreso

- **Estado general: ✅ implementada y verificada (2026-07-16) — las 7 fases (A–G) completas.**
  `npm run typecheck && npm test && npm run build` en verde: **510/510 tests** (baseline 446 →
  +64 nuevos), build de producción OK, dev server arranca y sirve HTTP 200. Lint: los 3 errores
  restantes son pre-existentes en archivos ajenos a esta spec (`ai/gemini/agent.ts`,
  `ai/modelSelector.test.ts`, `hooks/useBreakpoint.ts`) — ningún archivo de Flujos falla lint.
  Smoke visual con Playwright: **pendiente** — el proyecto no tiene Playwright instalado ni harness
  de navegador; se hizo smoke de runtime (dev server compila y sirve sin errores).

### Detalle por fase

- **A · Validación + activación segura** ✅ — `src/flows/validation.ts` (validador puro compartido)
  + `validation.test.ts` (17 tests). Banner de issues clicable en el builder
  (`FlowIssuesBanner.tsx`), diálogo de guardado con "Guardar como inactivo" (default) / "Guardar
  activo igualmente", badge de problemas por tarjeta y guard de activación con lista de problemas
  en la lista. `PollTrigger.connectionId`/webhook `url`/email `connectionId` pasaron de
  `.min(1)`/`.url()` a string libre para que el validador los reporte en vez de romper el parse.
- **B · Dirty guard + Ctrl+S** ✅ — `isDirty` recomputado sobre el flujo **compilado** desde el
  grafo; `useBlocker` de react-router + `beforeunload` para navegación/cierre; `Ctrl/Cmd+S` guarda
  in-place sin salir, el botón guarda y sale; el botón refleja "Sin cambios" cuando no hay dirty.
- **C · Plantillas + onboarding** ✅ — `src/flows/templates.ts` (6 plantillas curadas, siempre
  `enabled: false`) + `templates.test.ts` (21 tests, cada `build()` valida contra `FlowRuleSchema`
  y reporta exactamente sus placeholders). Galería en `FlowsPage` + 3 destacadas en el estado vacío.
- **D · Buscador/filtros/etiquetas + vista compacta** ✅ — buscador por nombre, chips de estado
  (Todos/Activos/Inactivos/Con problemas), etiquetas clicables, y resumen textual del pipeline
  (`FlowPipelineSummary`) por defecto — el `FlowPreviewCanvas` (ReactFlow) se monta solo al
  expandir "Ver diagrama".
- **E · Reintentos + onErrorPolicy** ✅ — `TransientOutputError` (red / HTTP ≥ 500) reintentado
  solo para webhook/email con `retry`, `calculateRetryDelay` extraído a `retry-delay.ts` (puro,
  sin Dexie), `onErrorPolicy: "stop"` marca skipped las acciones siguientes. Campos de retry en
  los drawer, política por flujo en el builder, intentos y política en la traza.
- **F · conditionMode all/any** ✅ — `LogicSchema.conditionMode` (ausente = "all"),
  `evaluateConditionsDetailed` respeta el modo, selector en el canvas visible con ≥ 2 condiciones,
  modo mostrado en la traza.
- **G · Modificadores de formato** ✅ — `parseToken` gana mods (`upper`/`lower`/`trim`/`date`/
  `number:N`), sintaxis `{{campo|mod||default}}` (default `||` primero), warnings no destructivos.
  `coerceDateString` extraído y reusado por `dueDate` y el mod `date`; `formatNumberEs` determinista
  (es-locale). Submenú "insertar con formato" en `VariablePicker`; warnings en la vista previa.
- **Schema** ✅ — bump único 13→14 (`SCHEMA_VERSION`), migración identidad `{ to: 14 }`,
  `tags`/`onErrorPolicy`/`conditionMode`/`retry` todos opcionales con defaults del motor — flujos
  existentes corren idéntico.

## Context

Las specs 018–026 dejaron el módulo de Flujos funcionalmente correcto: motor confiable (024),
ciclo configurar→probar→depurar completo (025), e interpolación/llenado de objetos/webhooks
funcionando de verdad (026 — 446/446 tests, smoke visual verificado). Esta spec cierra la brecha
entre "funciona correctamente" y "es un producto completo": lo que un usuario no-code espera de un
Zapier/Make y todavía no encuentra aquí.

La revisión de producto del 2026-07-16 (post-026) identificó los gaps, cada uno anclado a código:

1. **Un flujo roto se guarda ACTIVO sin ninguna validación** — `handleSave`
   (`FlowBuilderPage.tsx:86-88`) solo verifica que exista un trigger; `createEmptyFlow` arranca con
   `enabled: true` (`src/flows/migration.ts:157`). Resultado: un poll de HubSpot sin conexión
   elegida, un webhook sin URL, un email sin conexión, o un "Crear Tarea" en proyecto específico
   sin proyecto — todos se guardan activos, registran polling de inmediato y solo revientan en
   runtime (o peor: fallan en silencio como `skipped`). El único aviso existente es el texto "Sin
   outputs — este flujo no hace nada todavía" en la tarjeta (`FlowsPage.tsx:288-293`), post-hoc y
   sin bloquear nada. Es el gap #1 para un producto: **el sistema deja publicar configuraciones que
   sabe rotas.**
2. **"Cancelar" y navegar fuera descartan cambios sin avisar** — el botón Cancelar navega directo
   (`FlowBuilderPage.tsx:204-206`) y no hay guard de navegación. El builder YA computa `isDirty`
   (`FlowBuilderPage.tsx:120-134`) pero solo lo usa para el aviso de "Ejecutar". Un clic accidental
   pierde una sesión entera de configuración.
3. **No hay plantillas** (024 §F8, backlog) — el `EmptyState` de la lista es solo texto + botón
   "Nuevo flujo" (`FlowsPage.tsx:124-135`). El time-to-value de la primera automatización es
   construir todo desde cero: elegir trigger, conocer `{{}}`, mapear campos. Una galería de
   plantillas curadas es la diferencia entre "herramienta para quien ya sabe" y "producto".
4. **La lista no escala** (024 §F11, backlog) — `FlowsPage` es una lista plana de tarjetas
   (`FlowsPage.tsx:137-164`), sin buscador, sin filtros por estado, sin etiquetas. Además cada
   tarjeta monta un `FlowPreviewCanvas` (ReactFlow completo, `FlowsPage.tsx:287`) — con 15-20
   flujos son 15-20 instancias de ReactFlow renderizando a la vez.
5. **El motor no reintenta nada** (024 §F1, backlog) — un webhook que falla por un 500 transitorio
   o un proxy de email caído 30 segundos = output fallido definitivo. Y si una acción intermedia
   falla, las siguientes corren igual (`engine.ts` — loop de outputs con try/catch por acción, sin
   política configurable). La plomería ya existe: `calculateRetryDelay` en
   `src/integrations/outbound/retry-engine.ts` y la distinción transitorio/permanente.
6. **Condiciones AND-only** (024 §F6 v1, backlog) — `evaluateConditionsDetailed` hace
   `details.every(...)` (`engine.ts:400`). "Notificar si el deal es > 10k **o** la etapa es
   'cerrado'" hoy exige duplicar el flujo entero.
7. **Sin modificadores de formato en tokens** (026 fuera de alcance) — `{{closedate}}` ya se
   coacciona en `dueDate`, pero en un asunto de email o payload de webhook sale crudo
   (epoch-ms). No hay `{{campo|upper}}`, `{{fecha|date}}`, `{{monto|number}}` — el escape actual
   es `transformCode` (JavaScript), inaccesible para el perfil no-code.

**Resultado buscado:** que un usuario no-code pueda (a) partir de una plantilla y tener su primera
automatización corriendo en minutos, (b) confiar en que el sistema no le deja activar algo roto y
le dice exactamente qué falta, (c) encontrar y organizar sus flujos cuando tenga veinte, y (d)
expresar reglas reales (OR, formatos) sin escribir JavaScript.

**Outcome medible:**
- Un flujo con configuración incompleta no puede quedar activo sin que el usuario vea la lista
  exacta de problemas y lo confirme (gap 1).
- Salir del builder con cambios sin guardar pide confirmación (gap 2).
- Desde el estado vacío, "Usar plantilla" produce un flujo precargado donde los problemas
  pendientes (elegir conexión/proyecto) están señalados por la validación de (a) (gap 3).
- Con 20 flujos, encontrar uno por nombre/etiqueta/estado toma segundos y la lista no renderiza 20
  canvas de ReactFlow (gap 4).
- Un webhook con fallo transitorio se recupera solo; el usuario decide si un fallo detiene el
  resto del flujo (gap 5).
- Un grupo de condiciones puede evaluarse como "todas" o "cualquiera" (gap 6).
- `{{closedate|date}}` en un email sale como fecha legible sin tocar código (gap 7).

## Decisiones de diseño propuestas (a confirmar al iniciar implementación)

- **Validar ≠ bloquear guardar.** Guardar siempre se permite (el trabajo del usuario nunca se
  pierde por validación). Lo que se protege es la **activación**: guardar con errores ofrece
  "Guardar como inactivo" (default) o "Guardar activo igualmente" (confirmación explícita), y el
  toggle de activación en la lista muestra los problemas antes de activar un flujo con errores.
  Warnings (tokens huérfanos, secret vacío) nunca bloquean nada — mismo criterio que 025 §B.
- **Un solo validador compartido** (`src/flows/validation.ts`): lo consumen el builder (banner),
  la lista (badge por tarjeta) y el guard de activación. Devuelve issues tipados con severidad y
  referencia al nodo — clicable para abrir el drawer correspondiente.
- **`conditionMode: "all" | "any"` plano, no árbol.** 024 §F6 proponía un árbol `all`/`any`
  anidable; para el perfil no-code un toggle "deben cumplirse todas / alcanza con una" cubre la
  gran mayoría de los casos con una fracción del costo (schema, UI, migración y traza). El árbol
  anidado queda documentado como evolución futura, no se construye ahora.
- **Plantillas como datos, no código:** `FLOW_TEMPLATES` en `src/flows/templates.ts` — arrays de
  `FlowRule` parciales con placeholders (`connectionId: ""`, `projectId: ""`). "Usar plantilla"
  instancia vía `createEmptyFlow` + merge, siempre `enabled: false`, y navega al builder donde la
  validación de Fase A señala exactamente qué falta completar. Las plantillas se validan en un
  test contra `FlowRuleSchema` para no romperse silenciosamente cuando el schema evolucione.
- **Reintentos solo para outputs de red (webhook/email) y solo en fallos transitorios** (error de
  red / HTTP ≥ 500), reusando el criterio ya probado de `retry-engine.ts`. Los outputs internos
  (createTask, etc.) no reintentan: no fallan por transitorios y reintentarlos arriesga duplicar
  efectos. Política por flujo `onErrorPolicy: "continue" | "stop"` con default `"continue"`
  (comportamiento actual, sin sorpresas para flujos existentes).
- **Sintaxis de modificadores `{{campo|mod|mod2||default}}`:** el default `||` (026) se parsea
  primero (split por `||`), después los mods por `|` sobre la parte izquierda. Mods v1: `upper`,
  `lower`, `trim`, `date` (epoch-ms/ISO → `YYYY-MM-DD`, reusa `coerceDueDate`), `number:N`
  (decimales, separador local). Mod desconocido = se ignora con warning en `unresolved`-style
  (no rompe el valor).
- **Etiquetas y modo de condiciones → un solo bump de schema** (13→14, paso identidad):
  `FlowRule.tags?: string[]`, `LogicSchema.conditionMode` (default `"all"`), `FlowRule.onErrorPolicy`
  (default `"continue"`), `retry` en webhook/email outputs — todos opcionales/defaulted, una sola
  migración para toda la spec.
- **Vista compacta en la lista:** el `FlowPreviewCanvas` por tarjeta se reemplaza por un resumen
  textual (`trigger → N condiciones → N acciones` con iconos de `meta.ts`) y el canvas se renderiza
  solo al expandir la tarjeta — corrige el costo de N instancias de ReactFlow sin perder la vista
  visual cuando se pide.

## Convención de estado

- ✅ **Ya construido** — existe en producción.
- 🟡 **Parcial / con bug** — subsistema construido pero con comportamiento incorrecto o sin cablear.
- ❌ **Gap** — no existe, feature nuevo.

---

## Fase A — Validación de flujos y activación segura

**Estado:** ❌ Gap — no existe ninguna validación de configuración; el único check al guardar es
`if (!compiled.trigger) return` (`FlowBuilderPage.tsx:88`).

**Problema actual:** gap 1 del Context. Combinación agravante: `createEmptyFlow` arranca
`enabled: true`, así que el camino por defecto de un usuario nuevo produce un flujo activo roto.

**Propuesta:**
- `src/flows/validation.ts` (NUEVO):
  ```ts
  export interface FlowIssue {
    severity: "error" | "warning";
    nodeKind: "trigger" | "condition" | "transform" | "action" | "flow";
    /** Índice del output para acciones (abre el drawer correcto al clicar). */
    outputIndex?: number;
    message: string; // español natural, accionable
  }
  export function validateFlow(flow: FlowRule, deps: { projects: Project[] }): FlowIssue[]
  ```
  Checks v1 (errores): poll sin `connectionId`; flujo sin outputs; webhook sin URL o con URL no
  parseable; email sin `connectionId` o sin `to`; createTask `projectRef: "explicit"` sin
  `projectId` o con `projectId` que no existe en `deps.projects`; createTask
  `projectRef: "createdProject"` sin un `createProject` anterior en el flujo; createProject con
  `name` vacío; setField sin `field`. Checks v1 (warnings): webhook sin secret; tokens huérfanos
  contra `lastSample` (reusa `validateVariables` — solo si hay muestra); condición con `field`
  vacío.
- `FlowBuilderPage.tsx`:
  - Banner de issues sobre el canvas (colapsable): lista con icono por severidad; clic en un issue
    abre el drawer del nodo correspondiente (via `outputIndex`/`nodeKind` → `selectedId` del
    canvas, prop nueva).
  - `handleSave` con errores → `ConfirmDialog`: "Este flujo tiene N problemas y no puede ejecutarse
    correctamente" con opciones **Guardar como inactivo** (default) / **Guardar activo
    igualmente**. Sin errores (solo warnings o nada), guarda directo como hoy.
- `FlowsPage.tsx`:
  - Badge ámbar/rojo "N problemas" en la tarjeta cuando `validateFlow` reporta issues (computado
    en render — la validación es pura y barata).
  - Toggle de activación sobre un flujo con errores → `ConfirmDialog` con la lista de problemas
    antes de permitir activar.
- Tests: `src/flows/validation.test.ts` (NUEVO) — un caso por check, flujo válido devuelve `[]`,
  severidades correctas.

**Criterios de aceptación:**
- **Dado** un flujo poll sin conexión elegida, **cuando** el usuario pulsa Guardar, **entonces** ve
  el diálogo con el problema exacto y el default lo guarda inactivo.
- **Dado** un flujo con errores guardado inactivo, **cuando** intenta activarlo desde la lista,
  **entonces** ve la lista de problemas y debe confirmar explícitamente.
- **Dado** un flujo con solo warnings (token huérfano), **cuando** guarda, **entonces** el guardado
  procede sin diálogo — el warning ya está visible en el banner y en el hint del campo.
- **Dado** el banner de issues, **cuando** el usuario clica un problema de la acción 2, **entonces**
  se abre el drawer de esa acción.

**Prioridad:** Alta — es la base de confianza del producto y la guía de las plantillas (Fase C).

**Dependencias / riesgos:** Ninguna previa. Riesgo de falsos positivos (ej. `projectId` de un
proyecto archivado) — mantener los checks conservadores; ante la duda, warning en vez de error.

---

## Fase B — Protección de edición (dirty guard)

**Estado:** 🟡 Parcial — `isDirty` ya se computa (`FlowBuilderPage.tsx:120-134`) pero solo avisa
al Ejecutar; Cancelar y la navegación descartan sin preguntar.

**Propuesta:**
- `Cancelar` con `isDirty` → `ConfirmDialog` "¿Descartar los cambios sin guardar?".
- Guard de navegación del router (`useBlocker` de react-router) con el mismo diálogo para
  cualquier navegación interna; `beforeunload` para cierre/recarga de pestaña.
- Botón Guardar refleja el estado: "Guardar cambios" habilitado solo si `isDirty` (en edición);
  atajo `Ctrl/Cmd+S` para guardar sin salir (hoy guardar siempre navega a la lista — separar
  "guardar" de "guardar y salir": `Ctrl+S` guarda en el lugar, el botón guarda y sale, para no
  romper el hábito existente).
- El `isDirty` actual compara `flow` contra el store pero no incluye el `graph` editado sin
  compilar — corregirlo comparando el flujo **compilado** (`compileGraphToRule(graph)`) contra el
  guardado, que es lo que realmente se perdería.

**Criterios de aceptación:**
- **Dado** cambios sin guardar, **cuando** el usuario pulsa Cancelar o navega a otra página,
  **entonces** se le pide confirmación antes de descartar.
- **Dado** cambios sin guardar, **cuando** pulsa `Ctrl+S`, **entonces** el flujo se guarda (con la
  validación de Fase A) sin salir del editor y el botón vuelve a estado "sin cambios".
- **Dado** un flujo recién abierto sin tocar, **cuando** pulsa Cancelar, **entonces** sale directo
  (sin diálogo).

**Prioridad:** Alta, esfuerzo bajo — protege el trabajo del usuario con piezas que ya existen.

**Dependencias / riesgos:** Fase A (el guardado in-place debe pasar por la misma validación). El
`isDirty` por `JSON.stringify` es sensible al orden de claves — aceptable (falso positivo = un
diálogo de más, nunca pérdida de datos).

---

## Fase C — Galería de plantillas y onboarding (cierra 024 §F8)

**Estado:** ❌ Gap.

**Propuesta:**
- `src/flows/templates.ts` (NUEVO): `FLOW_TEMPLATES: FlowTemplate[]` donde
  `FlowTemplate = { id, name, description, category, requires: ("hubspot"|"google-sheets"|"email")[],
  build: () => FlowRule }`. Plantillas v1 (6):
  1. **Deal de HubSpot → proyecto con tarea de kickoff** (poll deals, createProject con dedupeKey
     `{{id}}`, createTask `projectRef: "createdProject"`).
  2. **Fila nueva de Sheets → tarea** (poll sheets, createTask con dedupeKey de fila).
  3. **Contacto de HubSpot → persona** (poll contacts, createPerson match por email con
     `matchSource: {{properties.email}}`).
  4. **Tarea completada → email de aviso** (event `task.statusChanged`, condición `to == done`,
     email).
  5. **Proyecto creado → webhook** (event `project.created`, webhook payload personalizado).
  6. **Deal grande → notificación** (poll deals, condición `amount > N`, createNotification).
  Cada `build()` produce un `FlowRule` `enabled: false` con placeholders vacíos donde va la
  conexión/proyecto del usuario.
- `FlowsPage.tsx`: botón "Plantillas" en el header → dialog de galería (cards con nombre,
  descripción, badges de qué integraciones requiere). "Usar plantilla" → `addFlow` + navega al
  builder, donde el banner de Fase A lista exactamente qué falta ("elige una conexión de
  HubSpot", "elige el proyecto destino").
- `EmptyState` de la lista: además de "Nuevo flujo", muestra 3 plantillas destacadas inline.
- Test: `templates.test.ts` — cada `build()` parsea contra `FlowRuleSchema`, arranca
  `enabled: false`, y `validateFlow` reporta exactamente los placeholders esperados (garantiza que
  las plantillas no se pudran cuando el schema evolucione).

**Criterios de aceptación:**
- **Dado** el estado vacío, **cuando** el usuario elige "Fila nueva de Sheets → tarea",
  **entonces** aterriza en el builder con el flujo precargado y el banner le dice que falta elegir
  la conexión de Sheets y el proyecto destino.
- **Dado** una plantilla instanciada y completada, **cuando** la activa, **entonces** funciona sin
  editar nada más (los `{{}}`/dedupeKeys ya vienen bien puestos).
- **Dado** un bump futuro de `SCHEMA_VERSION`, **cuando** corren los tests, **entonces** cualquier
  plantilla incompatible falla el build (no en runtime del usuario).

**Prioridad:** Alta para producto — es el time-to-value; esfuerzo medio (el costo es curaduría).

**Dependencias / riesgos:** Fase A (el banner es la guía post-instanciación — sin él, la plantilla
deja al usuario igual de perdido). Riesgo: plantillas HubSpot dependen del shape real de la API —
usar los mismos campos default de `HUBSPOT_DEFAULT_FIELDS_FOR_OBJECT_TYPE`.

---

## Fase D — Organización a escala: buscador, filtros y etiquetas (cierra 024 §F11)

**Estado:** ❌ Gap.

**Propuesta:**
- Schema (bump 13→14, compartido con E/F): `FlowRule.tags: z.array(z.string()).default([])`.
- `FlowsPage.tsx`:
  - Input de búsqueda por nombre (filtro en vivo, client-side).
  - Filtros por chip: Todos / Activos / Inactivos / **Con problemas** (union de: último run
    `error`/`partial` en `flow-runs`, o `validateFlow` con errores — reusa Fase A).
  - Etiquetas por flujo (editables en el builder, junto al nombre): chips clicables que filtran.
  - **Vista compacta por defecto**: resumen textual del pipeline (icono trigger → n.º condiciones
    → iconos de acciones desde `meta.ts`) en vez del `FlowPreviewCanvas`; el canvas se monta solo
    al expandir la tarjeta (estado por tarjeta, igual que el historial actual).
- Tests: filtro "con problemas" (mock de runs + issues), tags round-trip por schema.

**Criterios de aceptación:**
- **Dado** 20 flujos, **cuando** el usuario escribe en el buscador, **entonces** la lista filtra en
  vivo por nombre.
- **Dado** el filtro "Con problemas", **cuando** se aplica, **entonces** solo aparecen flujos cuyo
  último run falló o cuya validación reporta errores.
- **Dado** un flujo etiquetado "Ventas", **cuando** se clica la etiqueta, **entonces** la lista
  filtra por ella.
- **Dado** la lista con 20 flujos, **cuando** carga, **entonces** no se monta ningún ReactFlow
  hasta expandir una tarjeta.

**Prioridad:** Media-alta — el dolor crece con la adopción; la vista compacta además corrige un
problema de performance real hoy.

**Dependencias / riesgos:** Fase A para el filtro "con problemas" (puede degradar a solo-runs si A
se pospone). Bump de schema compartido con E/F — coordinar en una sola migración.

---

## Fase E — Reintentos y política de fallo (cierra 024 §F1)

**Estado:** 🟡 Parcial — el backoff y la clasificación transitorio/permanente existen en
`retry-engine.ts` pero el motor de flujos no los usa.

**Propuesta:**
- Schema (mismo bump 13→14): `WebhookOutputSchema`/`EmailOutputSchema` ganan
  `retry: z.object({ attempts: z.number().min(0).max(5), backoff: z.enum(["fixed","exponential"]) }).optional()`;
  `FlowRuleSchema` gana `onErrorPolicy: z.enum(["continue","stop"]).default("continue")`.
- `engine.ts`:
  - Wrapper de reintento alrededor de `executeOutput` SOLO para webhook/email con `retry`
    configurado: reintenta en error de red o HTTP ≥ 500 (el mensaje del error ya distingue —
    estructurar con un `TransientError` para no parsear strings), nunca en 4xx. Delay via
    `calculateRetryDelay` reusado. La traza registra `attempts: N` en el output.
  - `onErrorPolicy: "stop"`: cuando un output agota reintentos (o falla sin retry), los outputs
    restantes del registro se marcan `outcome: "skipped"`, `reason: "Omitido — una acción anterior
    falló (política: detener)"` en la traza, sin ejecutarse.
  - En dry-run (`describeOutputs`), el plan menciona la política si es `"stop"`.
- UI (`FlowBuilderPage`/`ActionConfigFields`): select "Si una acción falla: continuar con las
  demás (default) / detener el flujo" junto a `notifyOnFailure`; campos "Reintentos (0-5)" +
  "Backoff" en los drawers de webhook y email.
- Tests: reintento en 500→200 (éxito al segundo intento), sin reintento en 400, agotamiento →
  error, `stop` marca skipped los siguientes, `continue` preserva el comportamiento actual
  (baseline sin retry configurado intacto).

**Criterios de aceptación:**
- **Dado** un webhook con `attempts: 3` y un endpoint que responde 500 dos veces y 200 la tercera,
  **cuando** el flujo corre, **entonces** el output termina `executed` y la traza muestra los
  intentos.
- **Dado** un 404, **cuando** el output falla, **entonces** no se reintenta.
- **Dado** `onErrorPolicy: "stop"` y la acción 1 fallando, **cuando** el flujo corre, **entonces**
  las acciones 2+ figuran `skipped` con motivo explícito y no se ejecutan.
- **Dado** flujos existentes sin tocar, **cuando** corren, **entonces** el comportamiento es
  idéntico al actual (sin retry, política continue).

**Prioridad:** Media-alta — confiabilidad visible; esfuerzo medio (toca el loop central del motor).

**Dependencias / riesgos:** Riesgo de duplicar envíos si un webhook llegó al destino pero la
respuesta se perdió — documentado (el receptor debe deduplicar por `eventId`, que ya viaja firmado
en el payload). No reintentar outputs internos elimina el riesgo de duplicación interna.

---

## Fase F — Grupos de condiciones "todas / cualquiera" (cierra 024 §F6 v1, simplificado)

**Estado:** ❌ Gap — `evaluateConditionsDetailed` es AND-fijo (`engine.ts:400`).

**Propuesta:**
- Schema (mismo bump 13→14): `LogicSchema.conditionMode: z.enum(["all","any"]).default("all")`.
  **Decisión deliberada:** plano, no árbol (ver Decisiones) — el árbol anidable de 024 §F6 queda
  como evolución futura.
- `engine.ts`: `evaluateConditionsDetailed` respeta el modo (`every` / `some`); la traza ya
  registra cada condición con su veredicto individual, así que `FlowRunTraceView` solo necesita
  mostrar el modo en el encabezado del bloque de condiciones ("cualquiera debe cumplirse").
- `graph.ts`/`compileGraphToRule`: el modo vive en `LogicSchema`, no por nodo — se edita desde un
  selector en el canvas visible cuando hay ≥ 2 nodos de condición ("Se deben cumplir: todas /
  cualquiera").
- Dry-run y validación (Fase A) lo heredan gratis.
- Tests: `any` con solo una condición cumplida pasa; `all` preserva baseline; traza refleja el
  modo; flujos existentes (sin campo) siguen en `all`.

**Criterios de aceptación:**
- **Dado** dos condiciones y modo "cualquiera", **cuando** solo una se cumple, **entonces** el
  registro pasa y la traza muestra qué condición lo dejó pasar.
- **Dado** un flujo guardado antes de esta spec, **cuando** corre, **entonces** evalúa AND como
  siempre.
- **Dado** un solo nodo de condición, **cuando** se edita el flujo, **entonces** el selector de
  modo no aparece (sin ruido).

**Prioridad:** Media — expresividad real con costo contenido gracias al recorte plano.

**Dependencias / riesgos:** Bump de schema compartido con D/E. Riesgo de confusión no-code —
mitigado con la frase explícita en la UI y el modo visible en la traza.

---

## Fase G — Modificadores de formato en tokens

**Estado:** ❌ Gap — 026 dejó los formateadores explícitamente fuera de alcance; el único recurso
actual es `transformCode` (JavaScript).

**Propuesta:**
- `src/flows/interpolation.ts`: `parseToken` gana mods — sintaxis `{{campo|mod|mod2||default}}`
  (default `||` se separa primero; mods por `|` sobre la parte izquierda). Mods v1:
  - `upper` / `lower` / `trim` — string básicos.
  - `date` — epoch-ms (13 dígitos) o ISO → `YYYY-MM-DD` (reusa la lógica de `coerceDueDate`,
    extraída a este módulo para no duplicarla).
  - `number:N` — número con N decimales (`Intl.NumberFormat` es-locale).
  - Mod desconocido: se ignora y el token se reporta en un nuevo
    `InterpolationResult.warnings: string[]` (no rompe el valor).
- Como el módulo es la fuente única (026 §A), **la vista previa en vivo, la validación y el
  dry-run soportan los mods automáticamente** — cero cableado extra en UI.
- `VariablePicker`: submenú "Insertar con formato…" por variable (fecha/número/mayúsculas) para
  descubribilidad — el usuario no tiene que conocer la sintaxis.
- Tests: cada mod, combinación mods+default, mod desconocido no destructivo, retrocompat (tokens
  sin mods idénticos — incluye que un valor con `|` literal en el default no se rompa).

**Criterios de aceptación:**
- **Dado** `{{closedate|date}}` en el asunto de un email con `closedate` epoch-ms, **cuando** el
  flujo corre, **entonces** el asunto muestra `2026-07-27`.
- **Dado** `{{amount|number:2}}`, **cuando** se interpola `"5000"`, **entonces** produce `5.000,00`
  (formato es).
- **Dado** un mod inexistente `{{x|nope}}`, **cuando** se interpola, **entonces** el valor de `x`
  sale sin transformar y la vista previa lo advierte.
- **Dado** todos los templates guardados de flujos existentes, **cuando** corren, **entonces**
  interpolan idéntico (sin mods = camino actual).

**Prioridad:** Media-baja — pulido de expresividad; esfuerzo bajo-medio por el módulo compartido.

**Dependencias / riesgos:** Cuidado con la ambigüedad `|` vs `||` en el parser (resolver `||`
primero); documentar que un default que contiene `|` literal debe evitarse en v1.

---

## Fuera de alcance (documentado)

- **Branching por salida** (024 §F6 v2) — condiciones de guarda por output; requiere rediseño del
  canvas. El modo all/any de la Fase F no lo sustituye pero cubre el caso más pedido.
- **Árbol anidado de condiciones** — ver Decisiones; el modo plano es el v1 deliberado.
- **Versionado + rollback** (024 §F9) — sigue en backlog de 024; el dirty-guard (Fase B) y el
  export (024 §F14) mitigan mientras tanto.
- **Coalescing de polling + semáforo de carga** (024 §F10 parte 2) — sin pérdida de datos hoy
  (el fix de colisión ya está), solo redundancia de llamadas.
- **Export de Conexiones sin secretos** (024 §F14 residual).
- **Editor JSON libre / headers y métodos HTTP custom en webhook** (026 fuera de alcance, se
  mantiene).
- **Traza > 5 registros con muestreo de errores** (024 §F4a) — valioso pero independiente de la
  experiencia de creación que esta spec refina.
- **Multiusuario/roles** (024 §F12).

## Roadmap (impacto vs. esfuerzo)

| Fase | Esfuerzo | Prioridad | Bloquea |
|---|---|---|---|
| A · Validación + activación segura | Medio | Alta | C, D (filtro "con problemas") |
| B · Dirty guard + Ctrl+S | Bajo | Alta | — |
| C · Plantillas + onboarding | Medio | Alta (producto) | — |
| D · Buscador/filtros/etiquetas + vista compacta | Medio | Media-alta | — |
| E · Reintentos + onErrorPolicy | Medio | Media-alta | — |
| F · conditionMode all/any | Bajo-medio | Media | — |
| G · Modificadores de formato | Bajo-medio | Media-baja | — |

Secuencia sugerida: **A → B → C → D** (el arco de producto), con **E → F → G** (el arco de motor)
paralelizable desde el cierre de A. Las fases D, E y F comparten el bump de schema 13→14 — la
primera que se implemente introduce la migración; las siguientes solo suman campos opcionales.

## Archivos clave

- **Validación (NUEVO):** `src/flows/validation.ts` + `validation.test.ts`.
- **Plantillas (NUEVO):** `src/flows/templates.ts` + `templates.test.ts`.
- **Motor:** `src/flows/engine.ts` (retry wrapper, `onErrorPolicy`, `conditionMode` en
  `evaluateConditionsDetailed:389-401`), `src/integrations/outbound/retry-engine.ts` (reusar
  `calculateRetryDelay`), `src/flows/interpolation.ts` (mods §G).
- **Schema:** `src/domain/schemas/flow.ts` (`tags`, `conditionMode`, `onErrorPolicy`,
  `retry`), `src/domain/schemas/common.ts` (`SCHEMA_VERSION` 13→14), `src/domain/migrations.ts`.
- **UI lista:** `src/features/flows/FlowsPage.tsx` (buscador/filtros/etiquetas/badge de
  problemas/vista compacta/galería), `src/components/EmptyState` usage.
- **UI builder:** `src/features/flows/FlowBuilderPage.tsx` (banner de issues, diálogo de guardado,
  dirty guard, Ctrl+S, selector onErrorPolicy, editor de tags),
  `src/features/flows/canvas/FlowCanvas.tsx` (apertura de drawer por issue, selector
  conditionMode), `ActionConfigFields.tsx` (campos retry), `VariablePicker.tsx` (insertar con
  formato).
- **Traza:** `src/features/flows/FlowRunTraceView.tsx` (modo de condiciones, intentos de retry,
  skipped-by-stop).

## Verificación

- `npm run typecheck && npm run lint && npm test` en verde con los tests nuevos de cada fase
  (baseline actual: 446/446). `npm run build` en verde.
- Smoke en navegador real (Playwright contra `npm run dev`):
  - **A:** guardar un flujo poll sin conexión → diálogo con el problema → queda inactivo; intentar
    activarlo desde la lista → diálogo con la lista de problemas.
  - **B:** editar un flujo, tocar el título de una acción, pulsar Cancelar → diálogo de descarte;
    `Ctrl+S` guarda sin salir.
  - **C:** desde el estado vacío, instanciar la plantilla de Sheets → builder con banner "falta
    conexión / falta proyecto".
  - **D:** con varios flujos, buscar por nombre y filtrar por "Con problemas"; verificar que la
    lista no monta ReactFlow hasta expandir.
  - **E:** webhook contra endpoint que devuelve 500 (mock local) con retry → traza muestra
    intentos; con `onErrorPolicy: stop`, la segunda acción queda `skipped`.
  - **F:** dos condiciones en modo "cualquiera" → simular con registro que cumple solo una → pasa.
  - **G:** `{{closedate|date}}` en la vista previa en vivo muestra la fecha formateada.
- Screenshots anexados a `Progreso` al cerrar cada fase, convención specs 018–026.
