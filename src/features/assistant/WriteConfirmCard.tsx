import { ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatStore, type ChatPart } from "@/store/useChatStore";

type PendingWritePart = Extract<ChatPart, { kind: "pendingWrite" }>;

/** Inline approval card for a write the assistant wants to execute. */
export function WriteConfirmCard({ part }: { part: PendingWritePart }) {
  const approve = useChatStore((s) => s.approvePendingWrite);

  return (
    <div
      role="alertdialog"
      aria-label="Confirmar acción del asistente"
      className="my-2 rounded-lg border border-warning/50 bg-warning/10 p-3"
    >
      <div className="flex items-start gap-2">
        <ShieldQuestion className="mt-0.5 size-4 shrink-0 text-warning" />
        <div className="flex-1">
          <p className="text-sm font-medium">{part.description}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            El asistente quiere modificar tus datos ({part.name}).
          </p>
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => approve(part.id, false)}>
          Cancelar
        </Button>
        <Button size="sm" autoFocus onClick={() => approve(part.id, true)}>
          Confirmar
        </Button>
      </div>
    </div>
  );
}
