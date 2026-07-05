import { useRef, useState } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  disabled: boolean;
  streaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export function ChatInput({ disabled, streaming, onSend, onStop }: Props) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const t = text.trim();
    if (!t || disabled || streaming) return;
    onSend(t);
    setText("");
    if (ref.current) ref.current.style.height = "auto";
  }

  return (
    <div className="border-t p-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={text}
          disabled={disabled}
          rows={1}
          placeholder="Pregunta o pide una acción… (Enter envía)"
          aria-label="Mensaje para el asistente"
          className="max-h-40 flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        {streaming ? (
          <Button
            variant="outline"
            size="icon"
            aria-label="Detener respuesta"
            onClick={onStop}
          >
            <Square className="size-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            aria-label="Enviar mensaje"
            disabled={disabled || !text.trim()}
            onClick={submit}
          >
            <Send className="size-4" />
          </Button>
        )}
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        Shift+Enter para salto de línea · El asistente puede leer y, con tu confirmación,
        modificar tus datos.
      </p>
    </div>
  );
}
