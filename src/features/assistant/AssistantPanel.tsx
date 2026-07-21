import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, BarChart3, MessageSquarePlus, Settings, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AI_ERROR_MESSAGES } from "@/ai/gemini/errors";
import { rateLimiter } from "@/ai/rateLimiter";
import { getModelDef } from "@/ai/models";
import { cn } from "@/lib/utils";
import { useAiConfigStore } from "@/store/useAiConfigStore";
import { useChatStore } from "@/store/useChatStore";
import { AssistantEmptyState } from "./AssistantEmptyState";
import { ChatInput } from "./ChatInput";
import { ChatMessageList } from "./ChatMessageList";
import { RateLimitStatus } from "./RateLimitStatus";
import { ROUTES } from "@/routes/paths";
import { useBreakpoint } from "@/hooks/useBreakpoint";

export function AssistantPanel() {
  const navigate = useNavigate();
  const open = useChatStore((s) => s.open);
  const toggleOpen = useChatStore((s) => s.toggleOpen);
  const messages = useChatStore((s) => s.messages);
  const status = useChatStore((s) => s.status);
  const error = useChatStore((s) => s.error);
  const errorDetail = useChatStore((s) => s.errorDetail);
  const send = useChatStore((s) => s.send);
  const stop = useChatStore((s) => s.stop);
  const newConversation = useChatStore((s) => s.newConversation);
  const hydrated = useChatStore((s) => s.hydrated);
  const hydrateFromIdb = useChatStore((s) => s.hydrateFromIdb);

  const config = useAiConfigStore((s) => s.config);
  const hasKey = Boolean(config.apiKey);

  const panelRef = useRef<HTMLElement>(null);
  const [showRateLimit, setShowRateLimit] = useState(false);
  const isDesktop = useBreakpoint("lg");

  useEffect(() => {
    if (!hydrated) void hydrateFromIdb();
  }, [hydrated, hydrateFromIdb]);

  useEffect(() => {
    if (open) {
      panelRef.current
        ?.querySelector<HTMLElement>("textarea, button, a")
        ?.focus();
    }
  }, [open]);

  if (!open) return null;

  const streaming = status === "streaming" || status === "awaiting-confirmation";

  const activeDef = getModelDef(config.model);
  const canUsePreferred = hasKey ? rateLimiter.canMakeRequest(config.model) : false;
  const isOnFallback = hasKey && config.autoFallback && !canUsePreferred;

  const isExhausted = hasKey && !canUsePreferred;
  const modelBadgeVariant = !hasKey
    ? "outline"
    : isOnFallback
      ? "warning"
      : isExhausted
        ? "destructive"
        : "success";

  return (
    <>
      {!isDesktop && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => toggleOpen(false)}
        />
      )}
      <aside
        ref={panelRef}
        aria-label="Asistente IA"
        className={cn(
          "relative flex flex-col overflow-hidden",
          isDesktop
            ? "w-[400px] shrink-0 border-l bg-card"
            : "fixed inset-0 z-50 border-0 bg-card",
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Asistente</h2>
        {hasKey && (
          <Badge variant={modelBadgeVariant} className="font-mono text-[10px] gap-1">
            {config.model.replace("gemini-", "")}
            {isOnFallback && <AlertTriangle className="size-3" />}
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          {hasKey && (
            <Button
              variant="ghost"
              size="icon"
              title="Estado de límites"
              aria-label="Estado de límites"
              onClick={() => setShowRateLimit((v) => !v)}
              className={showRateLimit ? "bg-accent" : ""}
            >
              <BarChart3 className="size-4" />
            </Button>
          )}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              title="Nueva conversación"
              aria-label="Nueva conversación"
              onClick={() => newConversation()}
            >
              <MessageSquarePlus className="size-4" />
            </Button>
          )}
          <button
            onClick={() => {
              toggleOpen(false);
              navigate(ROUTES.settings("ia"));
            }}
            title="Ajustes del asistente"
            aria-label="Ajustes del asistente"
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Settings className="size-4" />
          </button>
          <Button
            variant="ghost"
            size="icon"
            title="Cerrar (Ctrl+J)"
            aria-label="Cerrar asistente"
            onClick={() => toggleOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
      </header>

      {showRateLimit && hasKey && (
        <div className="border-b px-3 py-2">
          <RateLimitStatus />
        </div>
      )}

      {messages.length === 0 ? (
        <AssistantEmptyState hasKey={hasKey} onSuggestion={(t) => void send(t)} />
      ) : (
        <ChatMessageList messages={messages} />
      )}

      {error && (
        <div
          role="alert"
          className="mx-3 mb-2 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
          <div className="grid gap-0.5">
            <span>{AI_ERROR_MESSAGES[error]}</span>
            {error === "rate-limit" && config.autoFallback && (
              <span className="text-muted-foreground">
                Fallback automático activado. El sistema intentó cambiar a otro modelo disponible.
                {activeDef && ` Grupo actual: ${config.fallbackGroup}.`}
              </span>
            )}
            {error === "all-models-exhausted" && (
              <span className="text-muted-foreground">
                Todos los modelos del grupo {config.fallbackGroup} están sin cuota.
                Espera un momento o cambia el grupo de fallback en Ajustes.
              </span>
            )}
            {errorDetail && (
              <details className="mt-1 text-muted-foreground">
                <summary className="cursor-pointer text-[11px] underline-offset-2 hover:underline">
                  Ver detalle técnico
                </summary>
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-muted/60 p-2 text-[10px]">
                  {errorDetail}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}

      <ChatInput
        disabled={!hasKey}
        streaming={streaming}
        onSend={(t) => void send(t)}
        onStop={stop}
      />
    </aside>
    </>
  );
}
