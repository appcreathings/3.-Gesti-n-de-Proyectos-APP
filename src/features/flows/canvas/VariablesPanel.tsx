import { useMemo, useState } from "react";
import { Braces, Check, ChevronRight, Copy, Database, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Trigger } from "@/domain/schemas/flow";
import { triggerLabel, providerLabel } from "@/domain/labels";
import { variableRows, type VariableRow } from "./variables";
// El MIME se mudó a `useVariableDrop` (spec 037 §B1): ahora tiene varios
// consumidores —este panel y los cuatro destinos que aceptan el drop— y el
// hook es el módulo que los dos lados comparten.
import { VARIABLE_DRAG_MIME } from "./useVariableDrop";

interface Props {
  /** Trigger del flujo — para el fallback sin muestra real (campos del evento
   * o `config.fields` del poll) y para el encabezado de origen. */
  trigger: Trigger | undefined;
  /** Muestra real de la última "Probar conexión" exitosa. */
  sample: Record<string, unknown>[] | undefined;
  collapsed: boolean;
  onToggle: () => void;
  /** Abre el drawer del nodo Trigger — CTA del estado vacío (CA-04.5). */
  onOpenTrigger: () => void;
}

/** Panel de variables acoplado al canvas (spec 036 §C2 / HU-04): overlay
 * colapsable a la derecha —no una tercera columna, para no competir con el
 * `DebuggerPanel` (R4)—. Muestra siempre qué datos trae el flujo y de dónde
 * salen, sin tener que abrir el drawer del Trigger.
 *
 * Cada fila se puede copiar como token `{{campo}}` o arrastrar directamente a
 * un campo interpolable (`InterpolableField` es el drop target). */
export function VariablesPanel({ trigger, sample, collapsed, onToggle, onOpenTrigger }: Props) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Muestra real (la más rica) o los mismos fallbacks que
  // `deriveAvailableVariables`. Vive en `variables.ts` desde spec 037 §D2 para
  // que el selector de campo de las condiciones ofrezca esta misma lista.
  const rows = useMemo<VariableRow[]>(() => variableRows(trigger, sample), [sample, trigger]);

  // Origen visible (CA-04.3) — mismos niveles que `deriveAvailableVariables`.
  // Spec 038 §B1 (CA-06.3): cuando el trigger es de polling, el origen nombra
  // el proveedor con la MISMA tabla que el nodo del canvas y `validateFlow` —
  // antes decía solo "Campos elegidos en el poll", sin decir de dónde salen.
  const origin = useMemo(() => {
    const provider = trigger?.type === "poll" ? ` · ${providerLabel[trigger.provider]}` : "";
    if (sample && sample.length > 0) {
      return `Muestra real · ${sample.length} registro${sample.length !== 1 ? "s" : ""}${provider}`;
    }
    if (!trigger) return "";
    if (trigger.type === "event") {
      return `Campos del evento · ${triggerLabel[trigger.event] ?? trigger.event}`;
    }
    const base =
      trigger.config.fields.length > 0 ? "Campos elegidos en el poll" : "Campos por defecto del poll";
    return `${base}${provider}`;
  }, [sample, trigger]);

  function copyToken(field: string) {
    navigator.clipboard?.writeText(`{{${field}}}`).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField((cur) => (cur === field ? null : cur)), 1500);
    });
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        title="Mostrar variables disponibles"
        aria-label="Mostrar variables disponibles"
        aria-expanded={false}
        className="absolute right-0 top-4 z-10 flex items-center gap-1.5 rounded-l-md border border-r-0 border-border bg-background px-2 py-2 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Braces className="size-3.5" />
        Variables
        {rows.length > 0 && (
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            {rows.length}
          </Badge>
        )}
      </button>
    );
  }

  return (
    <aside
      className="absolute right-0 top-0 z-10 flex h-full w-64 flex-col border-l border-border bg-background/95 shadow-sm backdrop-blur"
      aria-label="Variables disponibles"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Braces className="size-3.5 shrink-0 text-primary" />
          <h3 className="truncate text-xs font-semibold">Variables</h3>
          {rows.length > 0 && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {rows.length}
            </Badge>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          title="Ocultar panel de variables"
          aria-label="Ocultar panel de variables"
          aria-expanded
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {rows.length > 0 && (
        <div className="flex items-center gap-1.5 border-b border-border px-3 py-1.5">
          <Database className="size-3 shrink-0 text-muted-foreground" />
          <p className="truncate text-[10px] text-muted-foreground" title={origin}>
            {origin}
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        // CA-04.5: estado vacío que guía en vez de dejar el panel mudo.
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-3 text-center">
          <Zap className="size-5 text-muted-foreground" />
          <p className="text-[11px] leading-snug text-muted-foreground">
            Todavía no hay campos conocidos. Prueba la conexión en el nodo Trigger para ver los
            campos reales de tus datos.
          </p>
          <Button size="sm" variant="outline" className="w-full" onClick={onOpenTrigger}>
            Abrir nodo Trigger
          </Button>
        </div>
      ) : (
        <>
          <p className="px-3 py-1.5 text-[10px] leading-snug text-muted-foreground">
            Arrastra una variable a un campo del flujo, o copia su token. Se inserta en la forma
            que espera cada campo: <code className="font-mono">{"{{campo}}"}</code> en las
            acciones, el nombre solo en condiciones y en el origen del mapeo, y{" "}
            <code className="font-mono">record.campo</code> en el código.
          </p>
          <div className="flex-1 space-y-1 overflow-auto px-2 pb-2">
            {rows.map((row) => (
              <div
                key={row.field}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(VARIABLE_DRAG_MIME, row.field);
                  // `text/plain` como fallback para soltar fuera de un destino
                  // conocido (ej. otra app, o un campo que no es drop target).
                  e.dataTransfer.setData("text/plain", `{{${row.field}}}`);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                // Lo que se inserta depende del destino (CA-02.1): token en un
                // campo de acción, nombre crudo en una condición o en el origen
                // del mapeo, `record.campo` en el textarea de código.
                title={`Arrastra "${row.field}" a un campo del flujo`}
                className="cursor-grab rounded border border-border/50 bg-background px-2 py-1 active:cursor-grabbing hover:border-border hover:bg-accent/50"
              >
                <div className="flex items-center gap-1">
                  <code className="min-w-0 flex-1 truncate font-mono text-[11px] font-medium">
                    {row.field}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToken(row.field)}
                    title={`Copiar {{${row.field}}}`}
                    aria-label={`Copiar token de ${row.field}`}
                    className="flex shrink-0 items-center rounded p-0.5 text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {copiedField === row.field ? (
                      <Check className="size-3" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </div>
                {(row.type || row.example || row.presence) && (
                  <div className="mt-0.5 flex items-center gap-1">
                    {row.type && (
                      <Badge variant="outline" className="px-1 py-0 text-[9px] uppercase">
                        {row.type}
                      </Badge>
                    )}
                    {row.example && (
                      <span
                        className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground"
                        title={row.example}
                      >
                        {row.example}
                      </span>
                    )}
                    {row.presence && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {row.presence}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
