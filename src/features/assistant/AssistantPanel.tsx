import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, MessageSquarePlus, Settings, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AI_ERROR_MESSAGES } from "@/ai/gemini/errors";
import { useAiConfigStore } from "@/store/useAiConfigStore";
import { useChatStore } from "@/store/useChatStore";
import { AssistantEmptyState } from "./AssistantEmptyState";
import { ChatInput } from "./ChatInput";
import { ChatMessageList } from "./ChatMessageList";

/**
 * Global assistant side panel (Ctrl/Cmd+J). Mounted once in AppLayout, to the
 * right of <main>, so the conversation survives route changes.
 */
export function AssistantPanel() {
  const open = useChatStore((s) => s.open);
  const toggleOpen = useChatStore((s) => s.toggleOpen);
  const messages = useChatStore((s) => s.messages);
  const status = useChatStore((s) => s.status);
  const error = useChatStore((s) => s.error);
  const send = useChatStore((s) => s.send);
  const stop = useChatStore((s) => s.stop);
  const newConversation = useChatStore((s) => s.newConversation);
  const hydrated = useChatStore((s) => s.hydrated);
  const hydrateFromIdb = useChatStore((s) => s.hydrateFromIdb);

  const config = useAiConfigStore((s) => s.config);
  const hasKey = Boolean(config.apiKey);

  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!hydrated) void hydrateFromIdb();
  }, [hydrated, hydrateFromIdb]);

  // Ctrl/Cmd+J toggles the panel (same pattern as the Cmd+K palette).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleOpen();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggleOpen]);

  // Move focus into the panel when it opens.
  useEffect(() => {
    if (open) {
      panelRef.current
        ?.querySelector<HTMLElement>("textarea, button, a")
        ?.focus();
    }
  }, [open]);

  if (!open) return null;

  const streaming = status === "streaming" || status === "awaiting-confirmation";

  return (
    <aside
      ref={panelRef}
      aria-label="Asistente IA"
      className="flex w-[400px] shrink-0 flex-col border-l bg-card/30"
    >
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <Sparkles className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Asistente</h2>
        {hasKey && (
          <Badge variant="outline" className="font-mono text-[10px]">
            {config.model.replace("gemini-", "")}
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-0.5">
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
          <Link
            to="/settings#ia"
            title="Ajustes del asistente"
            aria-label="Ajustes del asistente"
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Settings className="size-4" />
          </Link>
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
          <span>{AI_ERROR_MESSAGES[error]}</span>
        </div>
      )}

      <ChatInput
        disabled={!hasKey}
        streaming={streaming}
        onSend={(t) => void send(t)}
        onStop={stop}
      />
    </aside>
  );
}
