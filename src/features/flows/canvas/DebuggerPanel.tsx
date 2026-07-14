import { useState } from "react";
import { Beaker, Loader2, AlertCircle, History, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FlowRule } from "@/domain/schemas/flow";
import type { FlowRunTrace } from "@/flows/engine";
import { dryRunFlow } from "@/flows/dry-run";
import { FlowRunTraceView } from "../FlowRunTraceView";
import { useDataStore } from "@/store/useDataStore";
import type { FlowRunLog } from "@/store/useFlowStore";
import { ROUTES } from "@/routes/paths";
import { useNavigate } from "react-router-dom";

interface Props {
  flow: FlowRule;
  /** Traza de un run real reciente (vía "Ejecutar" desde el editor) que el
   * panel debe mostrar como bloque verde, distinguible del dry-run. Si se
   * setea, tiene prioridad de visualización sobre cualquier dry-run
   * previo. Spec 025 §D. */
  realRunResult?: FlowRunLog | null;
  onClearRealRun?: () => void;
}

type Status = "idle" | "loading" | "result" | "error";

/**
 * Dock lateral del `FlowBuilderPage` (spec 025 §C/§D). Permite al usuario
 * simular el flujo completo (dry-run, no persiste) y ver la traza inline
 * de la última ejecución real, sin salir del editor.
 *
 * Estados:
 *  - `idle`: mensaje guía + botones Simular/Ejecutar (Ejecutar delega al
 *    padre vía `onClearRealRun` del realRunResult — el builder maneja el
 *    diálogo de confirmación).
 *  - `loading`: spinner mientras el dry-run trae la muestra y corre el
 *    motor.
 *  - `result`: `FlowRunTraceView` con borde gris (dry) o verde (real).
 *  - `error`: `AlertCircle` rojo + mensaje.
 */
export function DebuggerPanel({ flow, realRunResult, onClearRealRun }: Props) {
  const navigate = useNavigate();
  const projects = useDataStore((s) => s.projects);
  const people = useDataStore((s) => s.people);
  const projectTypes = useDataStore((s) => s.projectTypes);
  const checklistTemplates = useDataStore((s) => s.checklistTemplates);
  const processTemplates = useDataStore((s) => s.processTemplates);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dryTrace, setDryTrace] = useState<FlowRunTrace | null>(null);

  const handleDryRun = async () => {
    setStatus("loading");
    setError(null);
    setDryTrace(null);
    try {
      const result = await dryRunFlow(flow, {
        projects,
        people,
        projectTypes,
        checklistTemplates,
        processTemplates,
      });
      if (!result.ok) {
        setStatus("error");
        setError(result.error ?? "Error desconocido.");
        return;
      }
      setDryTrace(result.trace ?? null);
      setStatus("result");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const showReal = Boolean(realRunResult);
  const showDry = !showReal && status === "result" && dryTrace;

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Beaker className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Depurador</h3>
        </div>
        {showReal && (
          <Badge variant="success" className="text-[10px]">
            Run real
          </Badge>
        )}
        {showDry && (
          <Badge variant="secondary" className="text-[10px]">
            Simulación
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-4 py-3">
        <Button size="sm" variant="outline" onClick={handleDryRun} disabled={status === "loading"}>
          {status === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <Beaker className="size-3.5" />}
          {status === "loading" ? "Simulando..." : "Simular flujo"}
        </Button>
        <p className="text-xs text-muted-foreground">
          No crea tareas ni envía emails — muestra qué pasaría.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {status === "error" && (
          <div className="flex items-start gap-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">No se pudo simular:</p>
              <p>{error}</p>
              <p className="text-muted-foreground">
                Verifica que la conexión del trigger siga activa y que traiga registros.
              </p>
            </div>
          </div>
        )}

        {showReal && realRunResult && (
          <div className="space-y-3 rounded-lg border border-success/30 bg-success/5 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-success" />
              <div className="text-xs">
                <p className="font-medium">
                  {realRunResult.status === "success"
                    ? "Ejecución exitosa"
                    : realRunResult.status === "partial"
                      ? "Ejecutado con errores"
                      : "Ejecución fallida"}
                </p>
                <p className="text-muted-foreground">{realRunResult.detail}</p>
              </div>
            </div>
            {realRunResult.trace && <FlowRunTraceView trace={realRunResult.trace} />}
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate(ROUTES.flowHistory)}
              >
                <History className="size-3.5" />
                Ver en Historial global
              </Button>
              {onClearRealRun && (
                <Button size="sm" variant="ghost" onClick={onClearRealRun}>
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        )}

        {showDry && dryTrace && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
            <FlowRunTraceView trace={dryTrace} />
          </div>
        )}

        {!showReal && !showDry && status !== "error" && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            <Play className="size-6 opacity-30" />
            <p>
              Pulsa <strong>Simular flujo</strong> para previsualizar qué haría el flujo con datos reales
              de tu última prueba de conexión.
            </p>
            <p className="text-[10px]">
              Para una corrida real (que crea tareas y envía emails/webhooks), usa el botón <strong>Ejecutar</strong> arriba.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}