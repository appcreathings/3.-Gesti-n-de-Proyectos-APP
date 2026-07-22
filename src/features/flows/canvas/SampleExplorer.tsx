import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check, Braces, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { sampleFields, type SampleFieldInfo } from "./useSampleFields";

interface Props {
  /** Registros traídos por la última "Probar conexión" del trigger. Si
   * está vacío o ausente, el componente no se renderiza. Spec 025 §A
   * (muestra persistida) + §B/E (sincronización reactiva con el
   * picker/validación). */
  sample: Record<string, unknown>[] | undefined;
  /** Qué registro alimenta las vistas previas en vivo del resto del canvas
   * (`InterpolationPreview`, spec 026 §D3). Solo se muestra el selector
   * cuando hay más de un registro — con uno solo no hay nada que elegir. */
  previewRecordIndex?: number;
  onPreviewRecordIndexChange?: (index: number) => void;
}

/** Explorador de la muestra traída por "Probar conexión" en el nodo
 * trigger del editor de flujos. Muestra:
 *  - Conteo de registros y badge de frescura (cuándo se probó).
 *  - Lista de campos disponibles (path, tipo, ejemplo, presencia).
 *  - Botón "Copiar {{campo}}" para copiar el token al portapapeles y
 *    pegarlo en cualquier campo interpolable (title, message, etc.).
 *  - Panel plegable con el JSON crudo de cada registro para inspección.
 *
 * Es la pieza que faltaba en spec 025 §A: el badge "Muestra: N reg · HH:mm"
 * solo decía cuántos registros trajo, pero no dejaba ver qué campos
 * tenía ni copiar tokens — el usuario tenía que abrir el drawer de
 * Transformación para verlos. */
export function SampleExplorer({
  sample,
  previewRecordIndex = 0,
  onPreviewRecordIndexChange,
}: Props) {
  const [rawOpen, setRawOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fields = useMemo<SampleFieldInfo[]>(() => sampleFields(sample), [sample]);

  if (!sample || sample.length === 0 || fields.length === 0) return null;

  function copyToken(field: string) {
    const token = `{{${field}}}`;
    navigator.clipboard?.writeText(token).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField((cur) => (cur === field ? null : cur)), 1500);
    });
  }

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="size-3.5 text-primary" />
          <h4 className="text-xs font-semibold">Explorador de muestra</h4>
          <Badge variant="secondary" className="text-[10px]">
            {sample.length} registro{sample.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {sample.length > 1 && onPreviewRecordIndexChange && (
            <Select
              value={String(Math.min(previewRecordIndex, sample.length - 1))}
              onChange={(e) => onPreviewRecordIndexChange(Number(e.target.value))}
              size="sm"
              className="w-auto"
              title="Registro usado en las vistas previas de los campos"
            >
              {sample.map((_, i) => (
                <option key={i} value={i}>
                  Registro {i + 1}
                </option>
              ))}
            </Select>
          )}
          <button
            type="button"
            onClick={() => setRawOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Braces className="size-3.5" />
            JSON crudo
            {rawOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Campos que trajo la última prueba de conexión. Copia el token{" "}
        <code className="rounded bg-background px-1 py-0.5 font-mono">{"{{campo}}"}</code>{" "}
        y pégalo en cualquier campo interpolable del flujo (título de tarea, asunto de
        email, etc.).
      </p>

      {rawOpen ? (
        <div className="max-h-48 space-y-2 overflow-auto">
          {sample.map((record, i) => (
            <div key={i} className="space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground">Registro {i + 1}</p>
              <pre className="max-h-32 overflow-auto rounded border border-border bg-background p-2 text-[10px]">
                <code>{JSON.stringify(record, null, 2)}</code>
              </pre>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {fields.map((f) => (
            <div
              key={f.path}
              className="flex items-center gap-2 rounded border border-border/50 bg-background px-2 py-1 text-xs"
            >
              <code className="font-mono text-[11px] font-medium">{f.path}</code>
              <Badge variant="outline" className="text-[9px] uppercase">
                {f.type}
              </Badge>
              <span className="flex-1 truncate text-muted-foreground" title={f.example}>
                {f.example}
              </span>
              <span className="text-[10px] text-muted-foreground">{f.presence}</span>
              <button
                type="button"
                onClick={() => copyToken(f.path)}
                className="flex shrink-0 items-center gap-1 rounded px-1 py-0.5 text-[10px] text-primary hover:bg-primary/10"
                title={`Copiar {{${f.path}}}`}
              >
                {copiedField === f.path ? (
                  <>
                    <Check className="size-3" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    {"{{...}}"}
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}