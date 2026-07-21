import { useState, useRef, useCallback, useEffect } from "react";
import {
  runImproveWithFallback,
  type EntityType,
  type FieldSuggestion,
  type AiImproveResult,
} from "@/ai/improve";
import { useAiConfigStore } from "@/store/useAiConfigStore";
import type { AiErrorKind } from "@/ai/gemini/errors";

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
  errorType: AiErrorKind | null;
  errorDetail: string | null;
  result: AiImproveResult | null;
  acceptedIndices: Set<number>;
  rejectedIndices: Set<number>;
  acceptField: (index: number) => void;
  rejectField: (index: number) => void;
  acceptAll: () => void;
  rejectAll: () => void;
  reset: () => void;
  pendingSuggestions: FieldSuggestion[];
  currentModel: string;
  fallbackAttempt: number;
  totalAttempts: number;
  goToSettings: () => void;
}

export function useAiImprove({
  entityType,
  fields,
  onApply,
}: UseAiImproveOptions): UseAiImproveReturn {
  const config = useAiConfigStore((s) => s.config);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<AiErrorKind | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [result, setResult] = useState<AiImproveResult | null>(null);
  const [acceptedIndices, setAcceptedIndices] = useState<Set<number>>(new Set());
  const [rejectedIndices, setRejectedIndices] = useState<Set<number>>(new Set());
  const [currentModel, setCurrentModel] = useState(config.model);
  const [fallbackAttempt, setFallbackAttempt] = useState(1);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setCurrentModel(config.model);
  }, [config.model]);

  const improve = useCallback(async () => {
    if (!config.apiKey) {
      setError("Configura una API key en Ajustes → IA");
      setErrorType("invalid-key");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);
    setErrorType(null);
    setErrorDetail(null);
    setResult(null);
    setAcceptedIndices(new Set());
    setRejectedIndices(new Set());
    setFallbackAttempt(1);
    setCurrentModel(config.model);

    const res = await runImproveWithFallback({
      apiKey: config.apiKey,
      model: config.model,
      entityType,
      fields,
      signal: controller.signal,
      autoFallback: config.autoFallback,
      fallbackGroup: config.fallbackGroup,
      onFallback: (_from, to) => {
        setFallbackAttempt((prev) => prev + 1);
        setCurrentModel(to);
      },
    });

    if (controller.signal.aborted) return;

    setIsLoading(false);
    setTotalAttempts(res.fallbackChain?.length ?? 1);

    if (res.ok) {
      setResult(res.data);
      setCurrentModel(res.modelUsed ?? config.model);
    } else {
      // Mantenemos el mapeo local (contextual, "Asistente IA" → "IA") pero heredamos el caso
      // project-quota-zero del módulo central para no duplicar el texto accionable.
      const messages: Record<string, string> = {
        "invalid-key": "La API key no es válida. Revísala en Ajustes → IA.",
        "rate-limit": "Límite de peticiones alcanzado. Espera un momento.",
        "quota-exhausted": "Cuota de tokens agotada. Cambia de modelo o espera.",
        "project-quota-zero":
          "Tu proyecto de Google Cloud tiene la cuota en 0 en la región asignada — no es un " +
          "límite temporal. Revisa las cuotas en Google Cloud Console o crea una API key en otro " +
          "proyecto desde AI Studio.",
        "all-models-exhausted": "Todos los modelos alcanzaron su límite.",
        offline: "Sin conexión a internet.",
        aborted: "Solicitud cancelada.",
        unknown: "Error inesperado. Inténtalo de nuevo.",
      };
      setError(messages[res.error] ?? "Error desconocido");
      setErrorType(res.error);
      setErrorDetail(res.rawMessage ?? null);
    }
  }, [config.apiKey, config.model, config.autoFallback, config.fallbackGroup, entityType, fields]);

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
    setErrorType(null);
    setErrorDetail(null);
    setResult(null);
    setAcceptedIndices(new Set());
    setRejectedIndices(new Set());
    setFallbackAttempt(1);
    setTotalAttempts(0);
  }, []);

  const pendingSuggestions = result
    ? result.suggestions.filter((_, i) => !acceptedIndices.has(i) && !rejectedIndices.has(i))
    : [];

  const goToSettings = useCallback(() => {
    window.location.href = "/settings#ia";
  }, []);

  return {
    improve,
    cancel,
    isLoading,
    error,
    errorType,
    errorDetail,
    result,
    acceptedIndices,
    rejectedIndices,
    acceptField,
    rejectField,
    acceptAll,
    rejectAll,
    reset,
    pendingSuggestions,
    currentModel,
    fallbackAttempt,
    totalAttempts,
    goToSettings,
  };
}
