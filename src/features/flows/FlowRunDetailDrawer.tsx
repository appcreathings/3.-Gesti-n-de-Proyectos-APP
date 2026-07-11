import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FlowRunLog } from "@/store/useFlowStore";
import { FlowRunTraceView } from "./FlowRunTraceView";

interface Props {
  run: FlowRunLog | null;
  onClose: () => void;
}

/** Detalle de una corrida del historial global (spec 023 §F) — si la corrida
 * tiene traza (la mayoría, desde que `runFlowEngine` siempre pide `trace:
 * true`), la renderiza paso a paso; si no (ej. un fallo antes de llegar al
 * engine, como vault bloqueado), muestra el mensaje honesto igual. */
export function FlowRunDetailDrawer({ run, onClose }: Props) {
  if (!run) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-2xl flex-col bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-6">
          <div>
            <h2 className="text-lg font-semibold">{run.flowName}</h2>
            <p className="text-xs text-muted-foreground">{new Date(run.at).toLocaleString()}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex items-start gap-2">
              {run.status === "success" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              )}
              <div>
                <Badge variant={run.status === "success" ? "success" : "destructive"} className="text-[10px]">
                  {run.status === "success" ? "Éxito" : "Error"}
                </Badge>
                <p className="mt-1 text-sm">{run.detail}</p>
              </div>
            </div>

            {run.trace ? (
              <FlowRunTraceView trace={run.trace} />
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Sin traza detallada para esta corrida — probablemente un fallo antes de llegar al
                motor de flujos (conexión no encontrada, vault bloqueado, error de red).
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
