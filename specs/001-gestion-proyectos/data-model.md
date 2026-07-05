# Modelo de Datos — Gestor de Proyectos

- **schemaVersion:** 1
- **Fuente de verdad:** este documento + los esquemas Zod en `src/domain/schemas/`.
- Todas las entidades llevan `id` (UUID), `createdAt`, `updatedAt` (ISO 8601).

## Diagrama de relaciones

```
Workspace
 ├─ Product (1) ──< Project (N)
 │                    ├─ Area (N)
 │                    │   ├─ Process (N)
 │                    │   └─ Checklist (N) ──< ChecklistItem (N)
 │                    ├─ Task (N)            (item.linkedTaskId → Task)
 │                    └─ Milestone (N)       [MVP+]
 ├─ ProjectType (N)        (blueprint de Project)
 ├─ ChecklistTemplate (N)  (blueprint de Checklist)
 ├─ ProcessTemplate (N)    [MVP+]
 ├─ AutomationRule (N)
 ├─ Person (N)
 └─ Notification (N)
```

## Enumeraciones

```ts
ProductStatus  = "idea" | "active" | "maintenance" | "sunset"
ProjectStatus  = "backlog" | "active" | "paused" | "blocked" | "done" | "archived" // configurable por workflow
Health         = "green" | "amber" | "red"
Priority       = "low" | "medium" | "high" | "critical"
TaskStatus     = "todo" | "doing" | "blocked" | "done"
RaciRole       = "responsible" | "accountable" | "consulted" | "informed"
Severity       = "info" | "warning" | "critical"
```

## Entidades (shapes JSON)

### Workspace — `workspace.json`
```jsonc
{
  "schemaVersion": 1,
  "org": { "name": "Mi Empresa" },
  "settings": {
    "theme": "system",            // "light" | "dark" | "system"
    "stalledAfterDays": 14,        // proyecto "estancado" si updatedAt > N días
    "dueSoonDays": 7
  },
  "index": {                       // índice ligero para listados sin abrir cada archivo
    "products":  [{ "id": "...", "name": "...", "status": "active" }],
    "projects":  [{ "id": "...", "name": "...", "productId": "...", "status": "active", "health": "green", "updatedAt": "..." }],
    "types":     [{ "id": "...", "name": "..." }],
    "templates": [{ "id": "...", "name": "..." }],
    "automations":[{ "id": "...", "name": "...", "enabled": true }]
  }
}
```

### Product — `products/<id>.json`
```jsonc
{
  "id": "uuid", "schemaVersion": 1,
  "name": "Producto X",
  "description": "…",
  "vision": "…",
  "objectives": [{ "id": "uuid", "text": "Objetivo / KPI", "target": "…", "done": false }],
  "status": "active",
  "ownerId": "person-uuid | null",
  "tags": ["línea-negocio"],
  "createdAt": "…", "updatedAt": "…"
}
```

### Project — `projects/<id>.json` (documento agregado)
```jsonc
{
  "id": "uuid", "schemaVersion": 1,
  "productId": "uuid | null",
  "typeId": "uuid | null",
  "name": "Proyecto Y",
  "description": "…",
  "status": "active",
  "priority": "high",
  "health": "amber",               // manual o derivada
  "ownerId": "person-uuid | null",
  "stakeholders": [{ "personId": "uuid", "role": "accountable" }],   // RACI
  "startDate": "YYYY-MM-DD | null",
  "dueDate": "YYYY-MM-DD | null",
  "tags": [],
  "areas": [ /* Area[] */ ],
  "tasks": [ /* Task[] */ ],
  "milestones": [ /* Milestone[] (MVP+) */ ],
  "createdAt": "…", "updatedAt": "…"
}
```

#### Area (embebida en Project)
```jsonc
{
  "id": "uuid",
  "name": "Desarrollo",
  "icon": "code",                  // nombre de icono lucide
  "ownerId": "person-uuid | null",
  "completed": false,              // puede marcarla una automatización
  "processes": [ /* Process[] */ ],
  "checklists": [ /* Checklist[] */ ],
  "createdAt": "…", "updatedAt": "…"
}
```

#### Process (embebido en Area)
```jsonc
{
  "id": "uuid",
  "name": "Despliegue a producción",
  "description": "Markdown…",
  "steps": [{ "id": "uuid", "text": "Paso 1", "details": "…" }],
  "version": 1,
  "ownerId": "person-uuid | null",
  "templateId": "uuid | null",     // si nació de una ProcessTemplate
  "createdAt": "…", "updatedAt": "…"
}
```

#### Checklist (embebido en Area)
```jsonc
{
  "id": "uuid",
  "name": "QA release",
  "templateId": "uuid | null",
  "recurrence": "none",            // "none" | "daily" | "weekly"
  "items": [ /* ChecklistItem[] */ ],
  "createdAt": "…", "updatedAt": "…"
}
```

#### ChecklistItem
```jsonc
{
  "id": "uuid",
  "text": "Ejecutar pruebas E2E",
  "done": false,
  "required": true,
  "assigneeId": "person-uuid | null",
  "dueDate": "YYYY-MM-DD | null",
  "notes": "…",
  "linkedTaskId": "uuid | null"
}
```

#### Task (embebida en Project)
```jsonc
{
  "id": "uuid",
  "title": "Configurar CI",
  "description": "…",
  "status": "todo",
  "priority": "medium",
  "assigneeId": "person-uuid | null",
  "dueDate": "YYYY-MM-DD | null",
  "areaId": "uuid | null",
  "sourceItemId": "uuid | null",   // si nació de un ítem de checklist
  "tags": [],
  "createdAt": "…", "updatedAt": "…"
}
```

#### Milestone (embebido en Project) — MVP+
```jsonc
{ "id": "uuid", "name": "Beta", "dueDate": "YYYY-MM-DD | null", "taskIds": ["uuid"], "done": false }
```

### ProjectType — `project-types/<id>.json`
```jsonc
{
  "id": "uuid", "schemaVersion": 1,
  "name": "Proyecto de Software",
  "description": "…",
  "statusWorkflow": ["backlog","active","paused","blocked","done","archived"],
  "defaultAreas": [
    {
      "name": "Desarrollo", "icon": "code",
      "processTemplateIds": ["uuid"],          // MVP+
      "checklistTemplateIds": ["uuid"]
    }
  ],
  "defaultAutomationIds": ["uuid"],
  "createdAt": "…", "updatedAt": "…"
}
```

### ChecklistTemplate — `checklist-templates/<id>.json`
```jsonc
{
  "id": "uuid", "schemaVersion": 1,
  "name": "QA Release",
  "category": "QA",
  "items": [{ "id": "uuid", "text": "…", "required": true }],
  "tags": [],
  "createdAt": "…", "updatedAt": "…"
}
```

### ProcessTemplate — `process-templates/<id>.json` (MVP+)
```jsonc
{ "id": "uuid", "schemaVersion": 1, "name": "Onboarding cliente", "description": "Markdown…",
  "steps": [{ "id": "uuid", "text": "…" }], "category": "Ops", "createdAt": "…", "updatedAt": "…" }
```

### AutomationRule — `automations/<id>.json`
```jsonc
{
  "id": "uuid", "schemaVersion": 1,
  "name": "Cerrar área al completar checklist",
  "enabled": true,
  "scope": { "kind": "global" },               // | { kind:"product", id } | { kind:"project", id } | { kind:"type", id }
  "trigger": { "type": "checklist.completed" },// ver contracts/storage-contract.md
  "conditions": [{ "field": "checklist.progress", "op": ">=", "value": 100 }],
  "actions": [{ "type": "markAreaComplete" }],
  "lastRunAt": "… | null",                     // idempotencia
  "createdAt": "…", "updatedAt": "…"
}
```

### Person — `people/people.json` (colección en un solo archivo)
```jsonc
{ "schemaVersion": 1, "people": [
  { "id": "uuid", "name": "Ana", "email": "…", "roleTitle": "CEO", "createdAt": "…", "updatedAt": "…" }
] }
```

### Notification — `notifications/notifications.json`
```jsonc
{ "schemaVersion": 1, "notifications": [
  { "id": "uuid", "type": "date.due", "severity": "warning",
    "message": "El ítem 'Pruebas E2E' vence hoy",
    "entityRef": { "kind": "checklistItem", "projectId": "uuid", "itemId": "uuid" },
    "read": false, "createdAt": "…" }
] }
```

## Reglas derivadas (no se persisten, se calculan)

- **progress(checklist)** = ítems hechos / total.
- **progress(area)** = media ponderada de sus checklists; o ítems hechos / total de todos los checklists.
- **progress(project)** = combinación de áreas + tareas done.
- **isStalled(project)** = `now - updatedAt > settings.stalledAfterDays`.
- **dueSoon(item|task)** = `0 <= dueDate - now <= settings.dueSoonDays`.
- **health derivada (opcional)** = red si hay vencidos críticos o estancado; amber si hay por vencer; verde si no.

## Migraciones

- Carpeta `src/domain/migrations/`. Función `migrate(json, fromVersion) -> json` por colección.
- Antes de migrar, snapshot en `/.backups/<timestamp>/`.
- `schemaVersion` se valida por archivo al leer; si es menor, se migra y reescribe.
