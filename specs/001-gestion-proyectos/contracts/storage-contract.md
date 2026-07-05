# Contrato — Almacenamiento y Automatizaciones

Define las interfaces estables entre la UI y la persistencia/automatización. La UI **solo** depende
de estos contratos, nunca de la File System Access API directamente (constitución, Principio VI).

## 1. StorageAdapter

```ts
// src/storage/StorageAdapter.ts
export type Collection =
  | "products" | "projects" | "project-types"
  | "checklist-templates" | "process-templates" | "automations";

export interface StorageAdapter {
  /** Inicializa: pide/recupera la carpeta, crea workspace.json si falta. */
  init(): Promise<void>;
  isReady(): boolean;

  /** Workspace (singleton). */
  readWorkspace(): Promise<Workspace>;
  writeWorkspace(ws: Workspace): Promise<void>;

  /** Colecciones por archivo (un archivo por entidad). */
  list(col: Collection): Promise<string[]>;                 // ids
  read<T>(col: Collection, id: string): Promise<T>;          // valida con Zod
  write<T>(col: Collection, id: string, data: T): Promise<void>; // valida + escribe atómico + actualiza índice
  remove(col: Collection, id: string): Promise<void>;

  /** Colecciones agregadas en un solo archivo (people, notifications). */
  readDoc<T>(name: "people" | "notifications"): Promise<T>;
  writeDoc<T>(name: "people" | "notifications", data: T): Promise<void>;

  /** Portabilidad. */
  exportAll(): Promise<Blob>;        // zip o json con todo
  importAll(blob: Blob): Promise<void>;
  backup(): Promise<void>;           // snapshot en /.backups/<timestamp>/
}
```

### Implementaciones
- **FileSystemAdapter** (Chromium): usa `showDirectoryPicker()`, persiste el `FileSystemDirectoryHandle`
  en IndexedDB; reverifica permiso con `handle.queryPermission`/`requestPermission`. Escritura: write
  completo del archivo (la API no garantiza rename atómico) precedido de backup en cambios de esquema.
- **DownloadAdapter** (fallback): mantiene el estado en memoria/IndexedDB; `write` marca "sucio" y el
  usuario exporta; `importAll` carga un JSON. Documentado en `research.md`.

### Garantías
- `read`/`write` **validan con Zod**; un archivo inválido lanza error tipado (no datos corruptos silenciosos).
- `write` actualiza la entrada correspondiente del `index` en `workspace.json`.
- Si `schemaVersion` del archivo < actual → migrar antes de devolver.

## 2. Bus de eventos de dominio

```ts
// src/automations/events.ts
export type DomainEvent =
  | { type: "item.checked";        projectId: string; areaId: string; checklistId: string; itemId: string }
  | { type: "checklist.completed"; projectId: string; areaId: string; checklistId: string }
  | { type: "area.completed";      projectId: string; areaId: string }
  | { type: "project.created";     projectId: string; typeId: string | null }
  | { type: "project.statusChanged"; projectId: string; from: string; to: string }
  | { type: "area.added";          projectId: string; areaId: string }
  | { type: "date.due";            ref: EntityRef }
  | { type: "date.approaching";    ref: EntityRef; daysLeft: number }
  | { type: "app.opened" }
  | { type: "schedule";            cadence: "daily" | "weekly" };

export interface EventBus {
  emit(e: DomainEvent): void;
  subscribe(handler: (e: DomainEvent) => void): () => void;
}
```

Los slices del store **emiten** eventos tras mutar datos. El motor de automatizaciones **suscribe**.

## 3. Motor de automatizaciones

```ts
// src/automations/engine.ts
export type Trigger = { type: DomainEvent["type"] };

export type Condition = {
  field: string;          // p.ej. "project.status", "checklist.progress", "item.dueIn"
  op: "==" | "!=" | ">" | ">=" | "<" | "<=" | "in" | "contains";
  value: unknown;
};

export type Action =
  | { type: "setProjectStatus"; status: string }
  | { type: "markAreaComplete" }
  | { type: "createChecklistFromTemplate"; templateId: string; areaId?: string }
  | { type: "createTask"; title: string; areaId?: string; priority?: string }
  | { type: "createNotification"; severity: "info" | "warning" | "critical"; message: string }
  | { type: "setField"; field: string; value: unknown }
  | { type: "recreateRecurringChecklist"; checklistId: string };

export interface AutomationEngine {
  /** Llamado por el EventBus. Evalúa reglas activas en scope, corre acciones idempotentes. */
  onEvent(e: DomainEvent, ctx: EvalContext): Promise<void>;
  /** Triggers temporales: evaluar al abrir y por intervalo. */
  evaluateTemporal(now: Date, ctx: EvalContext): Promise<void>;
}
```

### Reglas de idempotencia
- Cada acción que crea entidades comprueba existencia previa (p.ej. no recrear un checklist ya presente
  para el mismo `templateId` + `areaId` en la misma ventana).
- `AutomationRule.lastRunAt` evita re-disparos en la misma sesión para triggers temporales.

### Mapa categoría → trigger/acción (referencia rápida)
| Categoría | Trigger | Acción |
|-----------|---------|--------|
| Reglas de estado | `checklist.completed` / `area.completed` | `markAreaComplete` / `setProjectStatus` |
| Plantillas automáticas | `project.created` / `area.added` | `createChecklistFromTemplate` |
| Recordatorios/fechas | `date.due` / `date.approaching` / `schedule` | `createNotification` / `recreateRecurringChecklist` |
| Notificaciones/resumen | `app.opened` / `schedule(daily)` | `createNotification` (alimenta "Resumen del día") |

## 4. Validación (Zod en los límites)

- Cada colección define `XxxSchema` en `src/domain/schemas/`. `read` hace `Schema.parse(json)`;
  `write` hace `Schema.parse(data)` antes de serializar.
- Tipos TS se derivan con `z.infer<typeof XxxSchema>` (una sola fuente de verdad).
