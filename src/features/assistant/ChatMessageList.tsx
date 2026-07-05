import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/store/useChatStore";
import { ChatMessageBubble } from "./ChatMessageBubble";

export function ChatMessageList({ messages }: { messages: ChatMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  // Follow the stream: scroll to bottom whenever content changes.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Conversación con el asistente"
      className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
    >
      {messages.map((m) => (
        <ChatMessageBubble key={m.id} message={m} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
