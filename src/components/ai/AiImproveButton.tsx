import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiSuggestionsPanel } from "./AiSuggestionsPanel";
import { AiModelSelector } from "./AiModelSelector";
import { useAiImprove } from "@/hooks/useAiImprove";
import { useAiConfigStore } from "@/store/useAiConfigStore";
import type { EntityType } from "@/ai/improve";

export interface AiImproveButtonProps {
  entityType: EntityType;
  fields: Record<string, unknown>;
  onApply: (field: string, value: unknown) => void;
}

export function AiImproveButton({ entityType, fields, onApply }: AiImproveButtonProps) {
  const apiKey = useAiConfigStore((s) => s.config.apiKey);
  const hasKey = !!apiKey;

  const {
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
    currentModel,
    fallbackAttempt,
    totalAttempts,
    goToSettings,
  } = useAiImprove({ entityType, fields, onApply });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!hasKey || isLoading}
          title={!hasKey ? "Configura una API key en Ajustes → IA" : undefined}
          onClick={() => {
            if (isLoading) {
              cancel();
            } else {
              improve();
            }
          }}
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {isLoading ? "Analizando…" : "Mejorar con IA"}
        </Button>

        {hasKey && (
          <AiModelSelector
            value={currentModel}
            onChange={() => {}}
            compact
            showAvailability
            disabled={isLoading}
          />
        )}
      </div>

      {result && (
        <AiSuggestionsPanel
          isLoading={false}
          error={null}
          suggestions={result.suggestions}
          summary={result.summary}
          acceptedIndices={acceptedIndices}
          rejectedIndices={rejectedIndices}
          onAccept={acceptField}
          onReject={rejectField}
          onAcceptAll={acceptAll}
          onRejectAll={rejectAll}
          onRetry={improve}
          onClose={reset}
        />
      )}

      {!result && error && (
        <AiSuggestionsPanel
          isLoading={false}
          error={error}
          errorType={errorType}
          errorDetail={errorDetail}
          suggestions={[]}
          summary=""
          acceptedIndices={new Set()}
          rejectedIndices={new Set()}
          onAccept={() => {}}
          onReject={() => {}}
          onAcceptAll={() => {}}
          onRejectAll={() => {}}
          onRetry={improve}
          onClose={reset}
          onGoToSettings={goToSettings}
          onChangeModel={() => {}}
          currentModel={currentModel}
          fallbackAttempt={fallbackAttempt}
          totalAttempts={totalAttempts}
        />
      )}

      {isLoading && (
        <AiSuggestionsPanel
          isLoading={true}
          error={null}
          suggestions={[]}
          summary=""
          acceptedIndices={new Set()}
          rejectedIndices={new Set()}
          onAccept={() => {}}
          onReject={() => {}}
          onAcceptAll={() => {}}
          onRejectAll={() => {}}
          onRetry={() => {}}
          onClose={() => {}}
        />
      )}
    </div>
  );
}
