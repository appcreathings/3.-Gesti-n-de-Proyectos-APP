import { Sparkles, Check, X, RotateCcw, Lightbulb, Loader2, Settings, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FieldSuggestion } from "@/ai/improve";
import type { AiErrorKind } from "@/ai/gemini/errors";

export interface AiSuggestionsPanelProps {
  isLoading: boolean;
  error: string | null;
  suggestions: FieldSuggestion[];
  summary: string;
  acceptedIndices: Set<number>;
  rejectedIndices: Set<number>;
  onAccept: (index: number) => void;
  onReject: (index: number) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onRetry: () => void;
  onClose: () => void;
  errorType?: AiErrorKind | null;
  /** Mensaje crudo del SDK (ApiError.message) para el detalle técnico colapsable.
   * Vive solo en el estado de React de la sesión (Principio I, spec 031 §6). */
  errorDetail?: string | null;
  onGoToSettings?: () => void;
  onChangeModel?: () => void;
  currentModel?: string;
  fallbackAttempt?: number;
  totalAttempts?: number;
}

export function AiSuggestionsPanel({
  isLoading,
  error,
  suggestions,
  summary,
  acceptedIndices,
  rejectedIndices,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  onRetry,
  onClose,
  errorType,
  errorDetail,
  onGoToSettings,
  onChangeModel,
  currentModel,
  fallbackAttempt,
  totalAttempts,
}: AiSuggestionsPanelProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          Analizando con IA…
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (error) {
    const actions = getErrorActions(errorType);
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
        <div className="flex items-start gap-2 text-sm text-destructive">
          <Lightbulb className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <span>{error}</span>
            {currentModel && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Modelo: {currentModel}
              </p>
            )}
            {totalAttempts && totalAttempts > 1 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Intento {fallbackAttempt} de {totalAttempts} modelos intentados
              </p>
            )}
            {errorDetail && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:underline">
                  Ver detalle técnico
                </summary>
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-muted/60 p-2 text-[10px]">
                  {errorDetail}
                </pre>
              </details>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.showChangeModel && onChangeModel && (
            <Button variant="outline" size="sm" onClick={onChangeModel}>
              <ArrowRightLeft className="size-3.5" />
              Cambiar modelo
            </Button>
          )}
          {actions.showSettings && onGoToSettings && (
            <Button variant="outline" size="sm" onClick={onGoToSettings}>
              <Settings className="size-3.5" />
              Ir a configuración
            </Button>
          )}
          {actions.showRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RotateCcw className="size-3.5" />
              Reintentar
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="rounded-lg border border-muted bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-4 text-primary" />
          No se encontraron mejoras significativas para este contenido.
        </div>
      </div>
    );
  }

  const allHandled = suggestions.every(
    (_, i) => acceptedIndices.has(i) || rejectedIndices.has(i),
  );

  if (allHandled) {
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-sm text-primary">
          <Check className="size-4" />
          Sugerencias revisadas
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {acceptedIndices.size} aceptada{acceptedIndices.size !== 1 ? "s" : ""}
          {rejectedIndices.size > 0 &&
            `, ${rejectedIndices.size} rechazada${rejectedIndices.size !== 1 ? "s" : ""}`}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between border-b border-primary/10 px-4 py-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" />
          Sugerencias de IA
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Cerrar sugerencias"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {summary && (
        <p className="px-4 pb-1 pt-2 text-xs italic text-muted-foreground">{summary}</p>
      )}

      <div className="divide-y divide-primary/10 px-4 py-1">
        {suggestions.map((s, i) => {
          const accepted = acceptedIndices.has(i);
          const rejected = rejectedIndices.has(i);
          if (rejected) return null;

          return (
            <div key={i} className={`py-2 ${accepted ? "opacity-60" : ""}`}>
              <div className="mb-1 flex items-center gap-2">
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-primary">
                  {s.field}
                </span>
                {accepted && <Check className="size-3 text-green-600" />}
              </div>
              <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                <div className="rounded bg-muted/50 px-2 py-1">
                  <span className="text-muted-foreground">Actual: </span>
                  <span className="text-muted-foreground line-through">
                    {formatValue(s.originalValue)}
                  </span>
                </div>
                <div className="rounded bg-primary/10 px-2 py-1">
                  <span className="text-primary">Sugerido: </span>
                  <span className="font-medium text-primary">
                    {formatValue(s.suggestedValue)}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{s.reason}</p>
              {!accepted && (
                <div className="mt-1.5 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => onAccept(i)}
                    className="flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/20"
                  >
                    <Check className="size-3" />
                    Aceptar
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(i)}
                    className="flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-3" />
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-primary/10 px-4 py-2">
        <Button variant="ghost" size="sm" onClick={onRejectAll}>
          Rechazar todas
        </Button>
        <Button variant="default" size="sm" onClick={onAcceptAll}>
          <Check className="size-3.5" />
          Aceptar todas
        </Button>
      </div>
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "(vacío)";
  if (typeof value === "string") return value || "(vacío)";
  if (Array.isArray(value)) {
    if (value.length === 0) return "(vacío)";
    return value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
  }
  return String(value);
}

interface ErrorActions {
  showSettings: boolean;
  showChangeModel: boolean;
  showRetry: boolean;
}

function getErrorActions(errorType: AiErrorKind | null | undefined): ErrorActions {
  switch (errorType) {
    case "invalid-key":
      return { showSettings: true, showChangeModel: false, showRetry: false };
    case "rate-limit":
    case "quota-exhausted":
      return { showSettings: true, showChangeModel: true, showRetry: true };
    case "project-quota-zero":
      // Cambiar de modelo no ayuda (la cuota es de proyecto/región, no por modelo). Reintentar
      // tampoco: la cuota está en 0. Llevamos al usuario a Ajustes para que cambie de API key.
      return { showSettings: true, showChangeModel: false, showRetry: false };
    case "all-models-exhausted":
      return { showSettings: true, showChangeModel: false, showRetry: true };
    case "offline":
    case "aborted":
    case "unknown":
    default:
      return { showSettings: false, showChangeModel: false, showRetry: true };
  }
}
