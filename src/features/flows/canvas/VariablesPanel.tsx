import { useMemo, useState } from "react";
import { ArrowRight, Braces, Check, ChevronRight, Copy, Database, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Trigger } from "@/domain/schemas/flow";
import { triggerLabel, providerLabel } from "@/domain/labels";
import type { StageVariables, VariableRow } from "./variables";
import { buildToken } from "./insertToken";

interface Props {
  /** Trigger del flujo — para el encabezado de origen. */
  trigger: Trigger | undefined;
  /** Muestra real de la última "Probar conexión" exitosa — para el encabezado
   * de origen. */
  sample: Record<string, unknown>[] | undefined;
  /** Las dos etapas del pipeline, ya calculadas por `FlowCanvas` (spec 039
   * §C3). El panel es la única superficie que muestra **las dos**: es donde se
   * ve qué renombra el Transformar (CA-04.4). */
  stages: StageVariables;
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
 * Desde spec 039 §C3 muestra las **dos etapas** del pipeline cuando difieren:
 * lo que ven las condiciones (pre-mapeo) y lo que ven las acciones
 * (post-mapeo). Que las dos listas sean distintas es la información, no un
 * problema a esconder.
 *
 * Spec 039 §F (HU-07): las filas **ya no se arrastran**. El panel informa y
 * deja copiar el token; poner una variable en un campo es el picker de ese
 * campo. Es una retirada deliberada de 037 §B, no un olvido: el arrastre pedía
 * puntería para hacer algo que el picker hace mejor, y su reemplazo (el picker
 * homologado, §D) ya estaba en pie antes de quitarlo. */
export function VariablesPanel({ trigger, sample, stages, collapsed, onToggle, onOpenTrigger }: Props) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const rows = stages.before;
  // Sólo hay dos etapas que mostrar si el mapeo efectivamente reemplaza el
  // registro. Sin mapeo, `after === before` (el passthrough de `applyMapping`)
  // y una segunda sección idéntica sería ruido.
  const showAfter = stages.after !== stages.before;

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
    navigator.clipboard?.writeText(buildToken(field)).then(() => {
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
          {/* CA-07.4: qué forma espera cada destino — la información que
              antes solo se descubría arrastrando. */}
          <p className="px-3 py-1.5 text-[10px] leading-snug text-muted-foreground">
            Copia el token, o usa el botón <code className="font-mono">{"{}"}</code> del campo que
            quieras rellenar. Cada destino espera una forma distinta:{" "}
            <code className="font-mono">{"{{campo}}"}</code> en las acciones, el nombre solo en
            condiciones y en el origen del mapeo, y{" "}
            <code className="font-mono">record.campo</code> en el código del Transformar.
          </p>
          <div className="flex-1 space-y-1 overflow-auto px-2 pb-2">
            {/* Encabezados de etapa (CA-04.4): sólo cuando hay dos etapas que
                distinguir — con una sola lista, un encabezado "Del trigger"
                suelto sería un rótulo sin contraparte. */}
            {showAfter && (
              <StageHeading
                title="Del trigger"
                subtitle="Lo que ven las condiciones (antes de Transformar)"
              />
            )}
            {rows.map((row) => (
              <VariableRowItem
                key={row.field}
                row={row}
                copied={copiedField === row.field}
                onCopy={() => copyToken(row.field)}
              />
            ))}

            {showAfter && (
              <>
                <StageHeading
                  title="Después de Transformar"
                  subtitle="Lo que ven las acciones (el mapeo reemplaza el registro)"
                />
                {stages.after.length === 0 ? (
                  <p className="px-1 text-[10px] italic leading-snug text-muted-foreground">
                    El mapeo no tiene ningún destino completo todavía.
                  </p>
                ) : (
                  stages.after.map((row) => (
                    <VariableRowItem
                      key={`after-${row.field}`}
                      row={row}
                      copied={copiedField === row.field}
                      onCopy={() => copyToken(row.field)}
                    />
                  ))
                )}
              </>
            )}

            {stages.afterIsPartial && (
              // CA-04.6: con código en el Transformar la lista se declara
              // incompleta en vez de fingir exactitud — el código puede añadir
              // o quitar claves y eso no se sabe sin ejecutarlo.
              <p className="px-1 pt-1 text-[10px] leading-snug text-muted-foreground">
                El nodo Transformar tiene código: esta lista puede quedarse corta o de más — el
                código puede añadir o quitar campos.
              </p>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

/** Encabezado real de sección (design §7): la separación entre etapas no puede
 * depender solo de un cambio de color. */
function StageHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-1 px-1 pb-0.5 pt-2 first:pt-0">
      <ArrowRight className="mt-[3px] size-3 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <h4 className="text-[10px] font-semibold uppercase tracking-wide">{title}</h4>
        <p className="text-[10px] leading-snug text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function VariableRowItem({
  row,
  copied,
  onCopy,
}: {
  row: VariableRow;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded border border-border/50 bg-background px-2 py-1">
      <div className="flex items-center gap-1">
        <code className="min-w-0 flex-1 truncate font-mono text-[11px] font-medium">
          {row.field}
        </code>
        <button
          type="button"
          onClick={onCopy}
          title={`Copiar ${buildToken(row.field)}`}
          aria-label={`Copiar token de ${row.field}`}
          className="flex shrink-0 items-center rounded p-0.5 text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
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
            <span className="shrink-0 text-[10px] text-muted-foreground">{row.presence}</span>
          )}
        </div>
      )}
    </div>
  );
}
