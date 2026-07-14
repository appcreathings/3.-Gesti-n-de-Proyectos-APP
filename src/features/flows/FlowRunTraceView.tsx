import { useState } from "react";
import { CheckCircle2, XCircle, MinusCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { FlowRunTrace, FlowRunRecordTrace, FlowRunOutputTrace } from "@/flows/engine";
import { outputMeta } from "./canvas/meta";

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {label}
        {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      </button>
      {open && (
        <pre className="mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-muted/30 p-2 text-xs">
          <code>{JSON.stringify(value, null, 2)}</code>
        </pre>
      )}
    </div>
  );
}

function OutputRow({ output }: { output: FlowRunOutputTrace }) {
  const meta = outputMeta(output.type);
  const Icon =
    output.outcome === "executed" ? CheckCircle2 : output.outcome === "skipped" ? MinusCircle : XCircle;
  const color =
    output.outcome === "executed"
      ? "text-success"
      : output.outcome === "skipped"
        ? "text-muted-foreground"
        : "text-destructive";

  // Spec 025 §C: cuando `plan` está presente (dry-run), mostrar el plan
  // descriptivo en lugar del badge "ejecutado"/"error" — distingue
  // visualmente una simulación de un run real. El plan ya es auto-descriptivo
  // ("Se crearía la tarea…", "Se omitiría…").
  if (output.plan) {
    return (
      <div className="flex items-start gap-2 text-xs">
        <Icon className={`mt-0.5 size-3.5 shrink-0 ${color}`} />
        <div className="flex-1">
          <span className="font-medium">{meta.label}</span>{" "}
          <span className="text-muted-foreground italic">{output.plan}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon className={`mt-0.5 size-3.5 shrink-0 ${color}`} />
      <div className="flex-1">
        <span className="font-medium">{meta.label}</span>{" "}
        <span className={color}>
          {output.outcome === "executed" ? "ejecutado" : output.outcome === "skipped" ? "omitido" : "error"}
        </span>
        {output.reason && <p className="mt-0.5 text-muted-foreground">{output.reason}</p>}
      </div>
    </div>
  );
}

function RecordTraceBlock({ trace, index }: { trace: FlowRunRecordTrace; index: number }) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <p className="text-xs font-semibold text-muted-foreground">Registro {index + 1}</p>
      <JsonBlock label="Registro crudo" value={trace.record} />

      {trace.conditions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Condiciones</p>
          {trace.conditions.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              {c.passed ? (
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" />
              ) : (
                <XCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
              )}
              <span className="font-mono">
                {c.field} {c.op} {JSON.stringify(c.expected)}
              </span>
              <span className="text-muted-foreground">— valor real: {JSON.stringify(c.actual)}</span>
            </div>
          ))}
        </div>
      )}

      {!trace.conditionsPassed ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertCircle className="size-3.5 shrink-0" />
          Registro descartado — no cumplió las condiciones.
        </p>
      ) : (
        <>
          {trace.mapped && <JsonBlock label="Después del mapeo" value={trace.mapped} />}
          {trace.transform && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Transformación (código)</p>
              {trace.transform.error ? (
                <p className="text-xs text-destructive">{trace.transform.error}</p>
              ) : (
                <JsonBlock label="Salida del transform" value={trace.transform.output} />
              )}
            </div>
          )}

          {trace.outputs.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Acciones</p>
              {trace.outputs.map((o, i) => (
                <OutputRow key={i} output={o} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Timeline paso a paso de una corrida: trigger → por registro, condiciones
 * con veredicto → mapeo → transform → desenlace de cada output (spec 023
 * §F). Convierte el historial en un depurador real. */
export function FlowRunTraceView({ trace }: { trace: FlowRunTrace }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Trigger matcheó — {trace.recordCount} registro{trace.recordCount !== 1 ? "s" : ""} recibido
        {trace.recordCount !== 1 ? "s" : ""}
        {trace.records.length < trace.recordCount &&
          ` (mostrando los primeros ${trace.records.length})`}
        .
      </p>
      {trace.records.map((r, i) => (
        <RecordTraceBlock key={i} trace={r} index={i} />
      ))}
    </div>
  );
}
