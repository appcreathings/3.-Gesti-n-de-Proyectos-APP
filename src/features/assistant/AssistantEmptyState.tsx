import { Link } from "react-router-dom";
import { KeyRound, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "¿Qué proyectos están estancados o en riesgo?",
  "Dame el resumen del día: vencidos y por vencer",
  "¿Qué tareas tengo bloqueadas?",
  "Crea una tarea urgente en un proyecto",
];

interface Props {
  hasKey: boolean;
  onSuggestion: (text: string) => void;
}

export function AssistantEmptyState({ hasKey, onSuggestion }: Props) {
  if (!hasKey) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="size-6 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Configura tu API key</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            El asistente usa Gemini (Google AI Studio). La clave se guarda solo en este
            dispositivo y nunca viaja con tus datos exportados.
          </p>
        </div>
        <Link
          to="/settings#ia"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          Ir a Ajustes → Asistente IA
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="size-6 text-primary" />
      </div>
      <div className="text-center">
        <h3 className="text-sm font-semibold">Tu copiloto de PM</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Pregunta por tu portafolio o pide acciones: crear tareas, marcar ítems,
          cambiar estados… Las escrituras se confirman contigo.
        </p>
      </div>
      <div className="grid w-full gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="rounded-lg border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
