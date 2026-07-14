import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Copy, Check, Braces, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  /** Registros traídos por la última "Probar conexión" del trigger. Si
   * está vacío o ausente, el componente no se renderiza. Spec 025 §A
   * (muestra persistida) + §B/E (sincronización reactiva con el
   * picker/validación). */
  sample: Record<string, unknown>[] | undefined;
}

interface FieldInfo {
  /** Path completo del campo (ej. "email", "record.email"). */
  path: string;
  /** Valor de ejemplo (del primer registro que lo tenga). */
  example: string;
  /** Tipo inferido del valor: "string" | "number" | "boolean" | "object" |
   * "array" | "null" | "unknown". */
  type: string;
  /** En cuántos de los N registros aparece el campo (para detectar
   * campos que solo a veces vienen). */
  presence: string;
}

/** Detecta el tipo JS de un valor — usado para mostrar un ícono/tipo
 * junto al nombre del campo en el explorador. */
function detectType(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/** Formatea el ejemplo truncado para que quepa en la UI sin romper layout. */
function formatExample(value: unknown): string {
  if (value === null || value === undefined) return "(vacío)";
  const str = typeof value === "string" ? value : JSON.stringify(value);
  return str.length > 60 ? `${str.slice(0, 57)}...` : str;
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
export function SampleExplorer({ sample }: Props) {
  const [rawOpen, setRawOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fields = useMemo<FieldInfo[]>(() => {
    if (!sample || sample.length === 0) return [];
    const total = sample.length;
    const fieldMap = new Map<string, { example: unknown; count: number; type: string }>();
    for (const record of sample) {
      for (const [key, value] of Object.entries(record)) {
        const existing = fieldMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          fieldMap.set(key, { example: value, count: 1, type: detectType(value) });
        }
      }
    }
    return Array.from(fieldMap.entries())
      .map(([path, info]) => ({
        path,
        example: formatExample(info.example),
        type: info.type,
        presence: `${info.count}/${total}`,
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [sample]);

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