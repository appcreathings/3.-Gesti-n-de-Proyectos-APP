# Spec: Mejorar con IA (AI Improve)

> **Código:** AI-IMPROVE-001  
> **Versión:** 1.0.0  
> **Fecha:** 2026-07-05  
> **Principios afectados:** IV (Diseño limpio), V (Simplicidad incremental)  
> **Dependencias:** AI infraestructura existente (Gemini, rate limiter, ai config)

---

## 1. Objetivo

Añadir un botón **"Mejorar con IA"** en los 8 diálogos de edición del sistema que, al clickearlo, envía el contenido del formulario a Gemini, recibe sugerencias estructuradas, y permite al usuario revisarlas y aceptarlas/rechazarlas antes de guardar.

---

## 2. Comportamiento deseado (User Story)

> Como usuario, cuando estoy editando un proyecto/tarea/proceso/etc en su diálogo de edición, quiero un botón que envíe el contenido actual del formulario a la IA para que me sugiera mejoras concretas en los campos, revisar cada sugerencia, y decidir cuáles aplicar antes de guardar.

### Flujo principal

1. Usuario abre diálogo de edición (ej. "Editar proyecto")
2. Usuario completa algunos campos
3. Usuario hace clic en **"Mejorar con IA"** (icono Sparkles)
4. Aparece un panel de carga: "Analizando con IA…"
5. Gemini devuelve sugerencias estructuradas
6. Se muestra el panel de revisión con las sugerencias divididas por campo:
   - Nombre del campo
   - Valor original (tachado/gris)
   - Valor sugerido (verde/primario + bold)
   - Razón de la sugerencia
   - Botón [✓ Aceptar] / [✗ Rechazar] por campo
7. Usuario acepta/rechaza cada sugerencia individualmente, o usa [Aceptar todas] / [Rechazar todas]
8. Las sugerencias aceptadas actualizan los `useState` del formulario en vivo
9. Usuario guarda normalmente con [Guardar]

### Flujos alternativos

| Situación | Comportamiento |
|-----------|---------------|
| Sin API key | Botón deshabilitado + tooltip "Configura IA en Ajustes" |
| Error de red | Panel muestra error + botón [Reintentar] |
| Rate limit | Mensaje "Demasiadas solicitudes. Espera un momento." |
| Sin sugerencias | "No se encontraron mejoras significativas para este contenido" |
| Loading | Botón deshabilitado con spinner; panel con skeleton |

---

## 3. Arquitectura

### Diagrama de capas

```
┌─────────────────────────────────────────────┐
│  8 Dialogs de edición                        │
│  (ProjectFormDialog, TaskFormDialog, …)      │
│  ┌─────────────────────────────────────────┐ │
│  │ <AiImproveButton>      ┌──────────────┐│ │
│  │                        │useAiImprove   ││ │
│  │ <AiSuggestionsPanel>   │   hook       ││ │
│  │                        └──────┬───────┘│ │
│  └───────────────────────────────┼─────────┘ │
└──────────────────────────────────┼───────────┘
                                   │
┌──────────────────────────────────▼───────────┐
│  src/ai/improve.ts                           │
│  - buildPrompt(entityType, fields) → string  │
│  - runImprove(apiKey, model, prompt) → Result │
│  - parseResponse(text) → AiImproveResult     │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│  Gemini SDK (createClient)                   │
│  RateLimiter (recordRequest)                 │
│  AiConfigStore (apiKey, model)               │
└─────────────────────────────────────────────┘
```

### Árbol de archivos nuevos

```
src/
├── ai/
│   ├── improve.ts                  # Tipos, prompts, servicio
│   └── prompts/
│       └── improve.ts              # Prompt builders por entidad
├── hooks/
│   └── useAiImprove.ts             # Hook React
└── components/
    └── ai/
        ├── AiImproveButton.tsx      # Botón con Sparkles
        └── AiSuggestionsPanel.tsx   # Panel de revisión
```

---

## 4. Especificación técnica

### 4.1 Tipos (`src/ai/improve.ts`)

```typescript
import { z } from "zod";

export const SUGGESTION_FIELDS = [
  "name", "description", "status", "priority",
  "title", "steps", "notes", "category",
  "icon", "text", "areas", "ownerId",
  "assigneeId", "dueDate", "startDate",
] as const;
export type SuggestionField = (typeof SUGGESTION_FIELDS)[number];

export const FieldSuggestionSchema = z.object({
  field: z.string(),
  originalValue: z.unknown(),
  suggestedValue: z.unknown(),
  reason: z.string(),
});
export type FieldSuggestion = z.infer<typeof FieldSuggestionSchema>;

export const AiImproveResultSchema = z.object({
  suggestions: z.array(FieldSuggestionSchema),
  summary: z.string(),
});
export type AiImproveResult = z.infer<typeof AiImproveResultSchema>;

export type EntityType =
  | "project" | "task" | "process" | "area"
  | "checklist-item" | "checklist-template"
  | "process-template" | "project-type";
```

### 4.2 Prompt builder (`src/ai/prompts/improve.ts`)

Cada entidad tiene su propio builder. Estructura común:

```
Eres un experto en gestión de proyectos. Revisa los siguientes datos
y sugiere mejoras concretas donde aportes valor real.

{DATOS_SERIALIZADOS}

Reglas:
1. No sugieras cambios triviales o cosméticos
2. Si un campo de texto está vacío y hay contexto suficiente para llenarlo, sugiere contenido
3. Si status/priority no alinean con las fechas, sugiere ajuste
4. Para arrays (steps, items, areas), sugiere añadir/mejorar elementos
5. Responde ÚNICAMENTE con JSON válido (sin markdown ni texto extra):
{ ... }
```

### 4.3 Hook `useAiImprove`

```typescript
interface UseAiImproveOptions {
  entityType: EntityType;
  fields: Record<string, unknown>;
}

interface UseAiImproveReturn {
  improve: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  result: AiImproveResult | null;
  acceptField: (index: number) => void;
  rejectField: (index: number) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  reset: () => void;
  pendingSuggestions: FieldSuggestion[];  // ni aceptados ni rechazados
}
```

### 4.4 Componente `AiSuggestionsPanel`

**Props:**
```typescript
interface AiSuggestionsPanelProps {
  isLoading: boolean;
  error: string | null;
  result: AiImproveResult | null;
  acceptedFields: Set<number>;
  onAccept: (index: number) => void;
  onReject: (index: number) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onRetry: () => void;
  onClose: () => void;
}
```

**Estados visuales:**

| state | render |
|-------|--------|
| `isLoading===true` | Skeleton con 3 filas animadas + "Analizando con IA…" |
| `error!==null` | Icono alerta + mensaje + botón [Reintentar] |
| `result.suggestions.length===0` | "No se encontraron mejoras significativas" |
| `result.suggestions.length>0` | Lista de sugerencias + summary |
| Todos aceptados/rechazados | Panel colapsa automáticamente |

### 4.5 Componente `AiImproveButton`

```typescript
interface AiImproveButtonProps {
  entityType: EntityType;
  fields: Record<string, unknown>;
  disabled?: boolean;
  disabledReason?: string;
}
```

Renderiza:
- Botón `outline` con `<Sparkles className="size-4" />` y texto "Mejorar con IA"
- Si `disabled`, muestra tooltip con `disabledReason`
- Internamente usa `useAiImprove`
- Muestra `AiSuggestionsPanel` debajo del botón cuando hay resultados

---

## 5. Integración en diálogos

Cada diálogo requiere 2 cambios:

```diff
  // 1. Importar
+ import { AiImproveButton } from "@/components/ai/AiImproveButton";

  // 2. En el footer, antes del botón Guardar/Crear
+ <AiImproveButton
+   entityType="project"
+   fields={{ name, description, status, priority, startDate, dueDate, ownerId, stakeholders }}
+   onApply={(field, value) => {
+     switch (field) {
+       case "name": setName(value as string); break;
+       case "description": setDescription(value as string); break;
+       // ...
+     }
+   }}
+ />
```

### Mapeo de campos por entidad

| Dialog | entityType | fields |
|--------|-----------|--------|
| ProjectFormDialog | `project` | name, description, status, priority, startDate, dueDate, ownerId, stakeholders |
| TaskFormDialog | `task` | title, description, status, priority, areaId, assigneeId, dueDate, sprintId |
| ProcessEditorDialog | `process` | name, description, steps, ownerId |
| AreaFormDialog | `area` | name, icon, ownerId |
| ItemEditorDialog | `checklist-item` | text, required, dueDate, assigneeId, notes |
| ChecklistTemplateDialog | `checklist-template` | name, category, items |
| ProcessTemplateDialog | `process-template` | name, category, description, steps |
| ProjectTypeDialog | `project-type` | name, description, defaultAreas |

---

## 6. Diseño visual (wireframe ASCII)

```
┌──────────────────────────────────────────┐
│  Editar proyecto                          │
│                                          │
│  ┌─ Nombre ──────────────────────────┐   │
│  │ Proyecto Alpha                     │   │
│  └────────────────────────────────────┘   │
│  ┌─ Descripción ─────────────────────┐   │
│  │ ...                                │   │
│  └────────────────────────────────────┘   │
│                                          │
│  ┌──── AI Suggestions ──────────────────┐│
│  │ ✓ Nombre                             ││
│  │   ✗ "Proyecto Alpha"                 ││
│  │   ✓ "Lanzamiento Plataforma Alpha"   ││
│  │   📝 Más descriptivo para el alcance ││
│  │   [Aceptar] [Rechazar]               ││
│  │                                      ││
│  │ ✓ Descripción                        ││
│  │   ✗ (vacío)                          ││
│  │   ✓ "Migrar infraestructura..."      ││
│  │   📝 Añade contexto faltante         ││
│  │   [Aceptar] [Rechazar]               ││
│  │                                      ││
│  │ [Aceptar todas] [Rechazar todas]     ││
│  └──────────────────────────────────────┘│
│                                          │
│  [Cancelar]  [✨ Mejorar con IA]  [Guardar]│
└──────────────────────────────────────────┘
```

---

## 7. Implementación

### Fase 1 — Core AI (prioridad alta)
1. `src/ai/improve.ts` — tipos + servicio
2. `src/ai/prompts/improve.ts` — prompts por entidad
3. `src/hooks/useAiImprove.ts` — hook React

### Fase 2 — Componentes UI (prioridad alta)
4. `src/components/ai/AiImproveButton.tsx`
5. `src/components/ai/AiSuggestionsPanel.tsx`

### Fase 3 — Integración en diálogos (prioridad alta)
6–10. Project, Task, Process, Area, Checklist Item

### Fase 4 — Templates (prioridad media)
11–13. ChecklistTemplate, ProcessTemplate, ProjectType

---

## 8. Validación

- Cada diálogo debe mostrar el botón solo cuando hay API key configurada
- Las sugerencias aceptadas deben reflejarse en los inputs del formulario
- Rechazar una sugerencia debe descartarla sin afectar otras
- El panel debe cerrarse/limpiarse al cerrar el diálogo
- Sin API key: botón visible pero deshabilitado con tooltip explicativo
- Rate limiting: capturar error y mostrar mensaje amigable

---

## 9. No incluido (scope explícitamente excluido)

- Modificaciones al agente conversacional (`agent.ts`)
- Historial de mejoras en `useChatStore`
- Persistencia de sugerencias aceptadas/rechazadas
- Sugerencias multi-idioma (español únicamente por ahora)
- Tooltips Radix/Tooltip component genérico
