import { Markdown } from "@/components/Markdown";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/store/useChatStore";
import { ToolCallChip } from "./ToolCallChip";
import { WriteConfirmCard } from "./WriteConfirmCard";

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    const text = message.parts
      .map((p) => (p.kind === "text" ? p.text : ""))
      .join("");
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("max-w-full", message.parts.length === 0 && "animate-pulse")}>
      {message.parts.length === 0 && (
        <p className="text-sm text-muted-foreground">Pensando…</p>
      )}
      {message.parts.map((part, i) => {
        switch (part.kind) {
          case "text":
            return <Markdown key={i}>{part.text}</Markdown>;
          case "toolCall":
            return <ToolCallChip key={part.id} part={part} />;
          case "pendingWrite":
            return <WriteConfirmCard key={part.id} part={part} />;
        }
      })}
    </div>
  );
}
