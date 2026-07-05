# 006 — Gestión de Modelos con Fallback Automático

**Estado:** Propuesto  
**Prioridad:** Media  
**Dependencias:** Ninguna

---

## 1. Motivación

Actualmente la app tiene dos modelos hardcodeados (`gemini-2.5-flash` y `gemini-2.5-pro`) definidos en `src/ai/config.ts`. El sistema detecta rate-limit (HTTP 429) pero solo muestra un error al usuario. No hay forma de:

- Ver qué modelos tienen cuota disponible
- Aprovechar modelos con límites no usados (Gemini 3.1 Flash Lite tiene 15 RPM, Gemma 4 tiene TPM ilimitado, etc.)
- Hacer fallback automático cuando se agota un modelo
- Trackear el consumo local contra los límites conocidos

El usuario tiene acceso a muchos modelos de Gemini con distintos límites. Este spec propone un sistema para gestionarlos y cambiarlos automáticamente.

---

## 2. Arquitectura General

```
┌──────────────────────────────────────────────────────┐
│  UI                                                   │
│  AiSettingsCard (selector con límites)                │
│  AssistantPanel (badge modelo activo + fallback)      │
│  RateLimitStatus (tooltip consumo)                    │
└──────────────────┬───────────────────────────────────┘
                   │ lee
┌──────────────────▼───────────────────────────────────┐
│  Zustand Stores                                       │
│  useAiConfigStore (modelo preferido, grupo fallback)  │
│  useChatStore (eventos de fallback en mensajes)       │
└──────────────────┬───────────────────────────────────┘
                   │ usa
┌──────────────────▼───────────────────────────────────┐
│  ModelSelector                                        │
│  - Resuelve modelo activo según preferencia + límites │
│  - Orquesta fallback entre modelos del mismo grupo    │
│  - Emite eventos cuando hay switch                    │
└──────┬──────────────────────────────────┬────────────┘
       │ consulta                         │ notifica
┌──────▼──────────┐          ┌────────────▼───────────┐
│  RateLimiter     │          │  Model Registry         │
│  - Ventanas      │          │  - Definiciones c/limite│
│    deslizantes   │          │  - Grupos de fallback   │
│  - RPM/TPM/RPD   │          │  - Prioridades          │
│  - Saturación    │          └────────────────────────┘
└─────────────────┘
```

---

## 3. Model Registry — `src/ai/models.ts` (NUEVO)

### 3.1 Tipos

```typescript
interface ModelLimit {
  rpm: number;
  tpm: number;
  rpd: number;
}

interface ModelDefinition {
  id: string;                    // "gemini-2.5-flash"
  label: string;                 // "Gemini 2.5 Flash"
  category:
    | "texto"
    | "multimodal"
    | "agentes"
    | "audio"
    | "embedding"
    | "live"
    | "otros";
  limits: ModelLimit;
  unlimitedTpm?: boolean;        // true para Gemma 4
  unlimitedRpm?: boolean;
  unlimitedRpd?: boolean;
  fallbackGroup: string;         // "flash", "flash-extended", "pro", etc.
  priority: number;              // menor = preferido dentro del grupo
}

type ModelFallbackChain = {
  group: string;
  label: string;
  /**
   * IDs de modelos en orden de prioridad.
   * Si el primero no tiene cuota, se prueba el segundo, etc.
   */
  models: string[];
}[];
```

### 3.2 Definiciones

Todas las entradas de la tabla que el usuario proporcionó, filtradas solo a las que **tienen cuota disponible** (RPM, TPM o RPD > 0) o que el usuario pueda usar como parte de un grupo de fallback (aunque hoy estén en 0, pueden tener cuota mañana). Se incluyen comentarios de estado.

```typescript
export const MODEL_REGISTRY: ModelDefinition[] = [
  // ── Flash ──────────────────────────────────────────────
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    category: "texto",
    limits: { rpm: 6, tpm: 250_000, rpd: 20 },
    fallbackGroup: "flash",
    priority: 1,
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    category: "texto",
    limits: { rpm: 10, tpm: 250_000, rpd: 20 },
    fallbackGroup: "flash",
    priority: 2,
  },
  {
    id: "gemini-3-flash",
    label: "Gemini 3 Flash",
    category: "texto",
    limits: { rpm: 5, tpm: 250_000, rpd: 20 },
    fallbackGroup: "flash",
    priority: 3,
  },
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    category: "texto",
    limits: { rpm: 5, tpm: 250_000, rpd: 20 },
    fallbackGroup: "flash",
    priority: 4,
  },

  // ── Flash Extended ─────────────────────────────────────
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite",
    category: "texto",
    limits: { rpm: 15, tpm: 250_000, rpd: 500 },
    fallbackGroup: "flash-extended",
    priority: 1,
  },
  {
    id: "gemma-4-26b",
    label: "Gemma 4 26B",
    category: "otros",
    limits: { rpm: 15, tpm: 0, rpd: 1_500 },
    unlimitedTpm: true,
    fallbackGroup: "flash-extended",
    priority: 2,
  },
  {
    id: "gemma-4-31b",
    label: "Gemma 4 31B",
    category: "otros",
    limits: { rpm: 15, tpm: 0, rpd: 1_500 },
    unlimitedTpm: true,
    fallbackGroup: "flash-extended",
    priority: 3,
  },

  // ── Pro ────────────────────────────────────────────────
  {
    id: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    category: "texto",
    limits: { rpm: 0, tpm: 0, rpd: 0 },  // actualmente sin cuota
    fallbackGroup: "pro",
    priority: 1,
  },
  {
    id: "gemini-3.1-pro",
    label: "Gemini 3.1 Pro",
    category: "texto",
    limits: { rpm: 0, tpm: 0, rpd: 0 },
    fallbackGroup: "pro",
    priority: 2,
  },

  // ── Audio ──────────────────────────────────────────────
  {
    id: "gemini-2.5-flash-tts",
    label: "Gemini 2.5 Flash TTS",
    category: "audio",
    limits: { rpm: 3, tpm: 10_000, rpd: 10 },
    fallbackGroup: "audio",
    priority: 1,
  },
  {
    id: "gemini-3.1-flash-tts",
    label: "Gemini 3.1 Flash TTS",
    category: "audio",
    limits: { rpm: 3, tpm: 10_000, rpd: 10 },
    fallbackGroup: "audio",
    priority: 2,
  },

  // ── Live ───────────────────────────────────────────────
  {
    id: "gemini-2.5-flash-native-audio-dialog",
    label: "Gemini 2.5 Flash Native Audio Dialog",
    category: "live",
    limits: { rpm: Infinity, tpm: 1_000_000, rpd: Infinity },
    unlimitedRpm: true,
    unlimitedRpd: true,
    fallbackGroup: "live",
    priority: 1,
  },
  {
    id: "gemini-3-flash-live",
    label: "Gemini 3 Flash Live",
    category: "live",
    limits: { rpm: Infinity, tpm: 65_000, rpd: Infinity },
    unlimitedRpm: true,
    unlimitedRpd: true,
    fallbackGroup: "live",
    priority: 2,
  },

  // ── Embedding ──────────────────────────────────────────
  {
    id: "gemini-embedding-1",
    label: "Gemini Embedding 1",
    category: "embedding",
    limits: { rpm: 100, tpm: 30_000, rpd: 1_000 },
    fallbackGroup: "embedding",
    priority: 1,
  },
  {
    id: "gemini-embedding-2",
    label: "Gemini Embedding 2",
    category: "embedding",
    limits: { rpm: 100, tpm: 30_000, rpd: 1_000 },
    fallbackGroup: "embedding",
    priority: 2,
  },
];
```

### 3.3 Cadenas de Fallback

```typescript
export const FALLBACK_CHAINS: ModelFallbackChain = [
  {
    group: "flash",
    label: "Flash (rápido, propósito general)",
    models: [
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-3-flash",
      "gemini-3.5-flash",
    ],
  },
  {
    group: "flash-extended",
    label: "Flash extendido (más cuota)",
    models: [
      "gemini-3.1-flash-lite",
      "gemma-4-26b",
      "gemma-4-31b",
    ],
  },
  {
    group: "pro",
    label: "Pro (razonamiento profundo)",
    models: [
      "gemini-2.5-pro",
      "gemini-3.1-pro",
    ],
  },
  {
    group: "audio",
    label: "Audio / TTS",
    models: [
      "gemini-2.5-flash-tts",
      "gemini-3.1-flash-tts",
    ],
  },
  {
    group: "live",
    label: "Live API (tiempo real)",
    models: [
      "gemini-2.5-flash-native-audio-dialog",
      "gemini-3-flash-live",
    ],
  },
  {
    group: "embedding",
    label: "Embeddings",
    models: [
      "gemini-embedding-1",
      "gemini-embedding-2",
    ],
  },
];
```

---

## 4. Rate Limiter — `src/ai/rateLimiter.ts` (NUEVO)

### 4.1 API

```typescript
export interface RateLimitStatus {
  modelId: string;
  rpmUsed: number;
  rpmLimit: number;
  tpmUsed: number;
  tpmLimit: number;
  rpdUsed: number;
  rpdLimit: number;
  saturated: boolean;      // true si se recibió 429 y no ha pasado retryAfter
  retryAt: Date | null;    // cuándo se puede reintentar (después de 429)
  resetsAt: {              // cuándo se resetea cada ventana
    rpm: Date;
    tpm: Date;
    rpd: Date;
  };
}

export class RateLimiter {
  canMakeRequest(modelId: string): boolean;
  recordRequest(modelId: string, tokenEstimate?: number): void;
  recordTokens(modelId: string, tokenCount: number): void;
  markSaturated(modelId: string, retryAfterSeconds?: number): void;
  getStatus(modelId: string): RateLimitStatus;
  getAllStatuses(): RateLimitStatus[];

  // Devuelve los IDs de modelos disponibles en un grupo
  getAvailableInGroup(group: string): string[];

  // Evento: cuando un modelo recupera cuota después de saturated
  onModelUnblocked?: (modelId: string) => void;
}
```

### 4.2 Ventanas Deslizantes

- **RPM:** ventana de 60 segundos. Se cuenta cuántas requests cayeron en los últimos 60s.
- **TPM:** ventana de 60 segundos. Suma de tokens estimados en los últimos 60s.
- **RPD:** ventana de 24 horas. Conteo de requests en las últimas 24h.

Implementación: arrays de timestamps. Se podan con `prune()` antes de cada consulta.

```typescript
private windows = new Map<string, {
  rpm: number[];     // timestamps de requests (últimos 60s)
  tpm: { ts: number; tokens: number }[];  // tokens por request (últimos 60s)
  rpd: number[];     // timestamps de requests (últimas 24h)
  saturated: boolean;
  retryAt: number;   // timestamp epoch, 0 = no saturado
}>();
```

### 4.3 Estimación de Tokens

El SDK `@google/genai` no expone token count en la response. Estrategias:

1. **Headers HTTP** — si la API devuelve `X-RateLimit-*` headers, parsearlos. El fetch wrapper en `client.ts` debería exponerlos.
2. **Estimación por caracteres** — `text.length / 4` como aproximación.
3. **Valor fijo por request** — asumir un promedio conservador (ej. 500 tokens por request de chat normal).

Se implementa la opción 2 como default, con opción a sobreescribir via `recordTokens()` si en el futuro el SDK expone el dato.

### 4.4 Persistencia

El `RateLimiter` vive en memoria volátil. No se persiste a IndexedDB porque:
- Los límites de la API se resetean al recargar la página (ventanas frescas)
- La complejidad de persistir ventanas deslizantes no justifica el beneficio
- La experiencia de fallback funciona igual aunque se pierda el tracking al recargar

---

## 5. Model Selector — `src/ai/modelSelector.ts` (NUEVO)

### 5.1 API

```typescript
export interface FallbackEvent {
  from: string;
  to: string;
  reason: "rate-limited" | "saturated" | "preferred-unavailable";
  timestamp: Date;
}

export interface ModelSelection {
  modelId: string;
  switched: boolean;
  reason: "preferred" | "fallback" | "none-available";
  fallbackEvent?: FallbackEvent;
}

export class ModelSelector {
  constructor(
    private registry: ModelDefinition[],
    private chains: ModelFallbackChain,
    private rateLimiter: RateLimiter,
  ) {}

  /**
   * Dado un modelo preferido, devuelve el mejor disponible.
   * - Si el preferido tiene cuota → se usa
   * - Si no → fallback dentro del grupo
   * - Si el grupo entero está agotado → se devuelve error
   */
  select(preferredId: string, groupOverride?: string): ModelSelection;

  /**
   * Después de un 429, forzar exclusión del modelo actual
   * y seleccionar el siguiente disponible.
   */
  selectAfterRateLimit(preferredId: string): ModelSelection;

  /**
   * Registrar listener para eventos de fallback.
   */
  onFallback: ((event: FallbackEvent) => void) | null;
}
```

### 5.2 Algoritmo de Selección

```
select(preferredId):
  1. Obtener definición del modelo preferido
  2. Obtener grupo de fallback (del preferred o del groupOverride)
  3. Para cada modelo en el grupo (en orden priority):
     a. rateLimiter.canMakeRequest(modelId) ?
        Sí → devolver este modelo como selección
        No → continuar al siguiente
  4. Si ningún modelo del grupo está disponible:
     - Buscar en grupos adyacentes (flash → flash-extended)
     - Si tampoco → devolver { modelId: null, reason: "none-available" }
```

### 5.3 Integración con el Agent

El `runAgentTurn()` recibe un `ModelSelector` en lugar de un `model` string:

```typescript
interface AgentTurnOptions {
  // ...campos existentes...
  modelSelector: ModelSelector;   // NUEVO, reemplaza a `model: string`
  preferredModel: string;         // del config del usuario
  fallbackGroup: string;          // grupo activo
}
```

Flujo modificado de `runAgentTurn()`:

```
1. selection = modelSelector.select(preferredModel, fallbackGroup)
2. if !selection.modelId → error "todos los modelos agotados"
3. chat.sendMessageStream({ model: selection.modelId })
4. si 429:
   a. rateLimiter.markSaturated(modelId, retryAfter)
   b. nuevaSelection = modelSelector.selectAfterRateLimit(preferredModel)
   c. si nuevaSelection.modelId:
      - onFallback({ from: modelId, to: nuevaSelection.modelId, ... })
      - chat = recrear con nuevo modelo + mismo history
      - goto paso 3 (reintentar el mismo mensaje)
   d. si no → error "todos los modelos agotados"
5. si success:
   a. rateLimiter.recordRequest(modelId, estimatedTokens)
   b. continuar con el loop de function calls normalmente
```

---

## 6. Store — `useAiConfigStore.ts` (MODIFICADO)

### 6.1 Estado Nuevo

```typescript
interface AiConfigState {
  // ...existente...

  /** Grupo de fallback seleccionado por el usuario */
  fallbackGroup: string;   // default: "flash"

  /** Fallback automático activado */
  autoFallback: boolean;   // default: true

  /** Instancia compartida del rate limiter (singleton) */
  // No va en la store, se crea en su propio módulo.
}

interface AiConfigStateActions {
  // ...existente...

  setFallbackGroup: (group: string) => Promise<void>;
  setAutoFallback: (enabled: boolean) => Promise<void>;
}
```

### 6.2 Persistencia

Se agregan `fallbackGroup` y `autoFallback` al schema de `AiConfigSchema` y se persisten en IndexedDB junto al resto de la config.

---

## 7. UI: Selector de Modelos — `AiSettingsCard.tsx` (MODIFICADO)

### 7.1 Layout

```
┌──────────────────────────────────────────────────┐
│  Modelo principal                                 │
│                                                   │
│  ┌──────────────────────────────────────────────┐ │
│  │ Gemini 2.5 Flash                   6/250K/20 │ │
│  │   ├ Rápido y económico (recomendado)         │ │
│  │   └ Límites: 6 req/min · 250K tok/min · 20/d│ │
│  │                                              │ │
│  │ Gemini 2.5 Flash Lite             10/250K/20 │ │
│  │   └ Límites: 10 req/min · 250K tok/min · 20/d│ │
│  │                                              │ │
│  │ Gemini 3.1 Flash Lite             15/250K/500│ │
│  │   └ Límites: 15 req/min · 250K tok/min ·500/d│ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  ┌──────────────────────────────────────────────┐ │
│  │ ☑ Fallback automático                        │ │
│  │   Cuando un modelo alcanza su límite,         │ │
│  │   cambia automáticamente a otro disponible.   │ │
│  └──────────────────────────────────────────────┘ │
│                                                   │
│  Grupo de fallback: [Flash (rápido, propósito…▼] │ │
│  │ flash          │ flash-extended │ pro │ audio │ │
│                                                   │ │
│  Estado actual: usando Gemini 3 Flash (fallback)  │ │
│  ┌──────────────────────────────────────────────┐ │
│  │ 3.1 Flash Lite │ 15/15 RPM ████████░░ 80%   │ │
│  │ 2.5 Flash      │ 6/6 RPM   ████████░░ 80%   │ │
│  │ 3 Flash        │ 2/5 RPM   ██░░░░░░░░ 20%   │ │
│  └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

### 7.2 Componentes Nuevos

| Componente | Propósito |
|---|---|
| `ModelSelect` | Reemplaza `<select>` actual. Lista de modelos con indicadores visuales de cuota y límites. |
| `FallbackConfig` | Toggle auto-fallback + selector de grupo de fallback. |
| `ModelUsageBars` | Barras de progreso mostrando consumo actual de cada modelo en el grupo. |

---

## 8. UI: Indicadores en el Panel — `AssistantPanel.tsx` (MODIFICADO)

### 8.1 Badge de Modelo Activo

En el header, el badge del modelo cambia:

```
🔮 Asistente              [2.5-flash ▼]
                           ↑ verde = preferido
                             amarillo = fallback activo
                             rojo = sin cuota disponible
```

Tooltip al hacer hover:

```
Modelo activo: Gemini 3 Flash
Preferido: Gemini 2.5 Flash (se restablece en 42s)
Grupo: Flash
3/5 RPM usados · 120K/250K TPM
```

### 8.2 Mensaje de Fallback en el Chat

Cuando ocurre un switch automático, se inserta un mensaje especial en el chat:

```
🤖 Cambio automático de modelo
   Gemini 2.5 Flash alcanzó su límite (6/6 RPM).
   → Usando Gemini 3 Flash (5 RPM · 250K TPM · 20 RPD)
   El cambio fue transparente, puedes seguir escribiendo.
```

### 8.3 Banner de Error Mejorado

El banner de rate-limit actual se reemplaza con:

```
⚠️ Gemini 2.5 Flash sin cuota disponible
   • Fallback automático activado → Gemini 3 Flash
   • Tiempo restante del preferido: 42 segundos
   • Otros disponibles en el grupo: 3.1 Flash Lite (15 RPM)
   
   [Cambiar grupo de fallback] [Esperar y reintentar]
```

---

## 9. Componente RateLimitStatus — `src/features/assistant/RateLimitStatus.tsx` (NUEVO)

Tooltip/badge colapsable en el panel del asistente:

```typescript
interface RateLimitStatusProps {
  modelSelector: ModelSelector;
  rateLimiter: RateLimiter;
  preferredModel: string;
  activeModel: string;
  fallbackGroup: string;
}
```

Muestra:
- Modelo activo con indicador de estado (color)
- Consumo: barras de progreso para RPM / TPM / RPD
- Tiempo hasta restablecimiento si está saturado
- Lista de otros modelos disponibles en el grupo

---

## 10. Plan de Implementación

| Fase | Archivos | Descripción | Estimación |
|------|----------|-------------|------------|
| **1** | `src/ai/models.ts` | Registry de modelos con grupos de fallback | 1h |
| **2** | `src/ai/rateLimiter.ts` | Rate limiter con ventanas deslizantes | 2h |
| **3** | `src/ai/modelSelector.ts` | Selector con lógica de fallback | 1.5h |
| **4** | `src/ai/gemini/agent.ts`, `src/ai/gemini/errors.ts` | Integrar ModelSelector en agent, reintentar 429 con fallback | 2h |
| **5** | `src/store/useAiConfigStore.ts`, `src/ai/config.ts` | Agregar fallbackGroup, autoFallback a la store y schema | 1h |
| **6** | `src/features/settings/AiSettingsCard.tsx` | Nuevo selector de modelos + config de fallback | 3h |
| **7** | `src/features/assistant/AssistantPanel.tsx`, `src/features/assistant/RateLimitStatus.tsx` | Badge de modelo activo, tooltip, indicadores | 2h |
| **8** | Tests | Unit tests para rateLimiter, modelSelector, agent | 2h |
| | **Total** | | **~14.5h** |

---

## 11. Riesgos y Consideraciones

| Riesgo | Mitigación |
|--------|-----------|
| Los límites reales de la API pueden diferir de los documentados | El rate limiter es tracking local. Si la API rechaza antes de nuestro límite estimado, el 429 gatilla el fallback igual. El tracking se puede ajustar por configuración. |
| El SDK no expone token count | Usar estimación chars/4. Si en el futuro el SDK lo expone, `recordTokens()` permite sobreescribir. |
| Cambiar de modelo en medio de un loop de function calls puede causar incoherencia | El fallback ocurre a nivel de request individual. El nuevo modelo recibe el history completo, no hay pérdida de estado. |
| Modelos con capacidades distintas (TTS, Live, Embedding) no son intercambiables con texto | Los grupos de fallback separan por categoría. El usuario selecciona el grupo según su caso de uso. |
| Gemma 4 no es un modelo Gemini — puede tener comportamiento distinto | Se incluye como opción de fallback extendido con advertencia en la UI: "Modelo experimental, puede tener comportamiento diferente". |

---

## 12. Métricas de Éxito

- Reducción de errores de rate-limit visibles al usuario en un **90%**
- Tasa de uso de modelos secundarios (no preferidos) > 0% (antes era 0%)
- Sin regresión en tiempos de respuesta (el overhead del tracker es O(1) por request)
- El usuario puede completar sesiones de trabajo sin interrupciones por límites de API
