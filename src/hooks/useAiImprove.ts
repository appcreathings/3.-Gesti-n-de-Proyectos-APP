import { useState, useRef, useCallback } from "react";
import {
  runImprove,
  type EntityType,
  type FieldSuggestion,
  type AiImproveResult,
} from "@/ai/improve";
import { useAiConfigStore } from "@/store/useAiConfigStore";

export interface UseAiImproveOptions {
  entityType: EntityType;
  fields: Record<string, unknown>;
  onApply: (field: string, value: unknown) => void;
}

export interface UseAiImproveReturn {
  improve: () => Promise<void>;
  cancel: () => void;
  isLoading: boolean;
  error: string | null;
  result: AiImproveResult | null;
  acceptedIndices: Set<number>;
  rejectedIndices: Set<number>;
  acceptField: (index: number) => void;
  rejectField: (index: number) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  reset: () => void;
  pendingSuggestions: FieldSuggestion[];
}

export function useAiImprove({
  entityType,
  fields,
  onApply,
}: UseAiImproveOptions): UseAiImproveReturn {
  const config = useAiConfigStore((s) => s.config);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiImproveResult | null>(null);
  const [acceptedIndices, setAcceptedIndices] = useState<Set<number>>(new Set());
  const [rejectedIndices, setRejectedIndices] = useState<Set<number>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  const improve = useCallback(async () => {
    if (!config.apiKey) {
      setError("Configura una API key en Ajustes → IA");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setResult(null);
    setAcceptedIndices(new Set());
    setRejectedIndices(new Set());

    const res = await runImprove({
      apiKey: config.apiKey,
      model: config.model,
      entityType,
      fields,
      signal: controller.signal,
    });

    if (controller.signal.aborted) return;

    setIsLoading(false);

    if (res.ok) {
      setResult(res.data);
    } else {
      const messages: Record<string, string> = {
        "invalid-key": "La API key no es válida. Revísala en Ajustes → IA.",
        "rate-limit": "Demasiadas solicitudes. Espera un momento y vuelve a intentarlo.",
        "all-models-exhausted": "Todos los modelos alcanzaron su límite. Espera un minuto.",
        offline: "Sin conexión a internet.",
        aborted: "Solicitud cancelada.",
        unknown: "Error inesperado. Inténtalo de nuevo.",
      };
      setError(messages[res.error] ?? "Error desconocido");
    }
  }, [config.apiKey, config.model, entityType, fields]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const acceptField = useCallback(
    (index: number) => {
      setAcceptedIndices((prev) => {
        const next = new Set(prev);
        next.add(index);
        return next;
      });
      setRejectedIndices((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });

      const suggestion = result?.suggestions[index];
      if (suggestion) {
        onApply(suggestion.field, suggestion.suggestedValue);
      }
    },
    [result, onApply],
  );

  const rejectField = useCallback((index: number) => {
    setRejectedIndices((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    setAcceptedIndices((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  const acceptAll = useCallback(() => {
    if (!result) return;
    const indices = new Set<number>();
    result.suggestions.forEach((s, i) => {
      indices.add(i);
      onApply(s.field, s.suggestedValue);
    });
    setAcceptedIndices(indices);
    setRejectedIndices(new Set());
  }, [result, onApply]);

  const rejectAll = useCallback(() => {
    if (!result) return;
    const indices = new Set<number>();
    result.suggestions.forEach((_, i) => indices.add(i));
    setRejectedIndices(indices);
    setAcceptedIndices(new Set());
  }, [result]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setError(null);
    setResult(null);
    setAcceptedIndices(new Set());
    setRejectedIndices(new Set());
  }, []);

  const pendingSuggestions = result
    ? result.suggestions.filter((_, i) => !acceptedIndices.has(i) && !rejectedIndices.has(i))
    : [];

  return {
    improve,
    cancel,
    isLoading,
    error,
    result,
    acceptedIndices,
    rejectedIndices,
    acceptField,
    rejectField,
    acceptAll,
    rejectAll,
    reset,
    pendingSuggestions,
  };
}
