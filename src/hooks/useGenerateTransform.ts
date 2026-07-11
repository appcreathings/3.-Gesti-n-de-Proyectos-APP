import { useState, useRef, useCallback } from "react";
import { runGenerateTransformWithFallback } from "@/ai/generate-transform";
import { useAiConfigStore } from "@/store/useAiConfigStore";
import type { AiErrorKind } from "@/ai/gemini/errors";

export interface UseGenerateTransformReturn {
  generate: (instruction: string, sampleRecord: Record<string, unknown> | undefined, availableFields: string[]) => Promise<void>;
  cancel: () => void;
  isLoading: boolean;
  error: string | null;
  errorType: AiErrorKind | null;
  code: string | null;
  reset: () => void;
  goToSettings: () => void;
}

const ERROR_MESSAGES: Record<AiErrorKind, string> = {
  "invalid-key": "La API key no es válida. Revísala en Ajustes → IA.",
  "rate-limit": "Límite de peticiones alcanzado. Espera un momento.",
  "quota-exhausted": "Cuota de tokens agotada. Cambia de modelo o espera.",
  "all-models-exhausted": "Todos los modelos alcanzaron su límite.",
  offline: "Sin conexión a internet.",
  aborted: "Solicitud cancelada.",
  unknown: "No se pudo generar un código válido. Reformula la instrucción o inténtalo de nuevo.",
};

/** Análogo a `useAiImprove` (spec 023 §G) para el botón "Generar con IA" de
 * la transformación de un flujo — mismo ciclo de carga/cancelación/error,
 * pero produce código en vez de sugerencias de campo. */
export function useGenerateTransform(): UseGenerateTransformReturn {
  const config = useAiConfigStore((s) => s.config);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<AiErrorKind | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (instruction: string, sampleRecord: Record<string, unknown> | undefined, availableFields: string[]) => {
      if (!config.apiKey) {
        setError("Configura una API key en Ajustes → IA");
        setErrorType("invalid-key");
        return;
      }
      if (!instruction.trim()) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);
      setErrorType(null);
      setCode(null);

      const res = await runGenerateTransformWithFallback({
        apiKey: config.apiKey,
        model: config.model,
        instruction,
        sampleRecord,
        availableFields,
        signal: controller.signal,
        autoFallback: config.autoFallback,
        fallbackGroup: config.fallbackGroup,
      });

      if (controller.signal.aborted) return;
      setIsLoading(false);

      if (res.ok) {
        setCode(res.code);
      } else {
        setError(ERROR_MESSAGES[res.error] ?? "Error desconocido");
        setErrorType(res.error);
      }
    },
    [config.apiKey, config.model, config.autoFallback, config.fallbackGroup]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setError(null);
    setErrorType(null);
    setCode(null);
  }, []);

  const goToSettings = useCallback(() => {
    window.location.href = "/settings#ia";
  }, []);

  return { generate, cancel, isLoading, error, errorType, code, reset, goToSettings };
}
