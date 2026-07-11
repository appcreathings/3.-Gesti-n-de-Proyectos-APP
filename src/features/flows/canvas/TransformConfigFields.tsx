import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Wand2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FieldMapping, Trigger } from "@/domain/schemas/flow";
import { useGenerateTransform } from "@/hooks/useGenerateTransform";
import {
  deriveAvailableVariables,
  allInternalTargetFields,
  suggestFieldMappingPairs,
  type AvailableVariable,
} from "./variables";

interface Props {
  mapping: FieldMapping[];
  transformCode?: string;
  trigger: Trigger;
  /** Registros de muestra reales traídos por la última "Probar conexión"
   * exitosa del nodo trigger (spec 022 §A). Si no hay ninguno todavía (el
   * usuario no ha probado la conexión), se cae al ejemplo hardcodeado de
   * `getSampleDataForTrigger` — solo para que "Probar con datos de ejemplo"
   * siga funcionando sin bloquear al usuario. */
  sample?: Record<string, unknown>[];
  onChange: (updates: { mapping?: FieldMapping[]; transformCode?: string }) => void;
}

function getSampleDataForTrigger(trigger: Trigger): Record<string, unknown> {
  if (trigger.type === "event") {
    return { type: trigger.event, projectId: "sample-project", taskId: "sample-task", from: "todo", to: "done" };
  }
  if (trigger.provider === "hubspot") {
    return { email: "test@example.com", firstname: "John", lastname: "Doe", company: "Acme Corp", phone: "+1234567890" };
  }
  return {};
}

const SOURCE_FIELDS_DATALIST_ID = "transform-source-fields";
/** Sentinel para "no está en la lista, escribir a mano" en los selectores
 * emparejados del mapeo — nunca colisiona con un nombre de campo real. */
const CUSTOM_VALUE = "__custom__";

function MappingSourceCell({
  value,
  available,
  onChange,
}: {
  value: string;
  available: AvailableVariable[];
  onChange: (next: string) => void;
}) {
  const isKnown = value !== "" && available.some((v) => v.field === value);
  const selectValue = value === "" ? "" : isKnown ? value : CUSTOM_VALUE;

  return (
    <div className="flex-1 space-y-1">
      <Select
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next === CUSTOM_VALUE ? "" : next);
        }}
      >
        <option value="">Campo recibido...</option>
        {available.map((v) => (
          <option key={v.field} value={v.field}>
            {v.field}
            {v.example ? ` — ${v.example}` : ""}
          </option>
        ))}
        <option value={CUSTOM_VALUE}>Personalizado (escribir)...</option>
      </Select>
      {selectValue === CUSTOM_VALUE && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="campo.origen"
          list={SOURCE_FIELDS_DATALIST_ID}
        />
      )}
    </div>
  );
}

function MappingTargetCell({
  value,
  internalFields,
  onChange,
}: {
  value: string;
  internalFields: { field: string; label: string }[];
  onChange: (next: string) => void;
}) {
  const isKnown = value !== "" && internalFields.some((f) => f.field === value);
  const selectValue = value === "" ? "" : isKnown ? value : CUSTOM_VALUE;

  return (
    <div className="flex-1 space-y-1">
      <Select
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next === CUSTOM_VALUE ? "" : next);
        }}
      >
        <option value="">Campo interno de Hito...</option>
        {internalFields.map((f) => (
          <option key={f.field} value={f.field}>
            {f.label} ({f.field})
          </option>
        ))}
        <option value={CUSTOM_VALUE}>Personalizado (escribir)...</option>
      </Select>
      {selectValue === CUSTOM_VALUE && (
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="campo.destino" />
      )}
    </div>
  );
}

export function TransformConfigFields({ mapping, transformCode, trigger, sample, onChange }: Props) {
  const [testResult, setTestResult] = useState<{
    success: boolean;
    input: unknown;
    output: unknown;
    error?: string;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  const generateTransform = useGenerateTransform();

  const hasRealSample = Boolean(sample && sample.length > 0);
  // Variables disponibles: muestra real si existe, si no los campos
  // conocidos del tipo de evento del trigger (spec 023 §C) — alimenta tanto
  // el datalist de abajo como los selectores emparejados del mapeo.
  const availableVariables = deriveAvailableVariables(trigger, sample);
  const availableFields = availableVariables.map((v) => v.field);
  const internalFields = allInternalTargetFields();

  const addMapping = () => {
    onChange({ mapping: [...mapping, { source: "", target: "" }] });
  };
  const updateMapping = (index: number, updates: Partial<FieldMapping>) => {
    const next = [...mapping];
    next[index] = { ...next[index], ...updates };
    onChange({ mapping: next });
  };
  const removeMapping = (index: number) => {
    onChange({ mapping: mapping.filter((_, i) => i !== index) });
  };
  const handleAutoMap = () => {
    const suggested = suggestFieldMappingPairs(availableVariables, internalFields);
    if (suggested.length > 0) onChange({ mapping: suggested });
  };

  const handleGenerateTransform = async () => {
    const sampleInput = hasRealSample ? sample![0] : undefined;
    await generateTransform.generate(aiInstruction, sampleInput, availableFields);
  };

  // Aplica el código generado en cuanto la petición resuelve — un `onChange`
  // directo durante el render actualizaría el estado del padre en medio de
  // este render, así que se hace en un efecto (se dispara cuando `code`
  // cambia de `null` a un string nuevo).
  useEffect(() => {
    if (generateTransform.code) {
      onChange({ transformCode: generateTransform.code });
      generateTransform.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateTransform.code]);

  const handleTestTransform = () => {
    if (!transformCode) {
      setTestResult({ success: true, input: null, output: null });
      return;
    }
    try {
      new Function("record", transformCode);
    } catch (error) {
      setTestResult({
        success: false,
        error: `Error de sintaxis: ${error instanceof Error ? error.message : "Error desconocido"}`,
        input: null,
        output: null,
      });
      return;
    }
    const sampleInput = hasRealSample ? sample![0] : getSampleDataForTrigger(trigger);
    try {
      const fn = new Function("record", transformCode);
      const result = fn({ ...sampleInput });
      setTestResult({ success: true, input: sampleInput, output: result });
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
        input: sampleInput,
        output: null,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Mapeo de campos</h3>
          {hasRealSample && (
            <button
              type="button"
              onClick={() => setPreviewOpen((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Vista previa de datos ({sample!.length})
              {previewOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Asignar valores del registro a campos de Hito
          {hasRealSample
            ? " — el campo origen sugiere los campos reales de tu última prueba de conexión."
            : ' — prueba la conexión en el paso de Trigger para ver campos reales en vez de escribirlos a ciegas.'}
        </p>

        {hasRealSample && previewOpen && (
          <div className="max-h-40 space-y-2 overflow-auto rounded-lg border border-border bg-muted/30 p-3">
            {sample!.map((record, i) => (
              <pre key={i} className="text-xs">
                <code>{JSON.stringify(record, null, 2)}</code>
              </pre>
            ))}
          </div>
        )}

        {hasRealSample && (
          <datalist id={SOURCE_FIELDS_DATALIST_ID}>
            {availableFields.map((field) => (
              <option key={field} value={field} />
            ))}
          </datalist>
        )}

        {mapping.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">Sin mapeo. Los datos se pasarán sin transformar.</p>
        ) : (
          <div className="space-y-2">
            {mapping.map((m, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <MappingSourceCell
                  value={m.source}
                  available={availableVariables}
                  onChange={(source) => updateMapping(idx, { source })}
                />
                <span className="mt-2 text-muted-foreground">→</span>
                <MappingTargetCell
                  value={m.target}
                  internalFields={internalFields}
                  onChange={(target) => updateMapping(idx, { target })}
                />
                <Button size="icon" variant="ghost" className="mt-0.5" onClick={() => removeMapping(idx)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addMapping}>
            <Plus className="size-4" />
            Añadir mapping
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAutoMap}
            disabled={availableVariables.length === 0}
            title={
              availableVariables.length === 0
                ? "Prueba la conexión primero para tener campos que emparejar"
                : "Sugiere asociaciones por similitud de nombre"
            }
          >
            <Wand2 className="size-4" />
            Auto-emparejar
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Transformación (código, opcional)</h3>
        <p className="text-xs text-muted-foreground">
          Código JavaScript para transformaciones complejas. El parámetro{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">record</code> contiene los
          datos de entrada (ya mapeados, si hay mapeo).
        </p>

        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary" />
            <p className="text-xs font-medium">Generar con IA</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              placeholder="Ej: pasa el email a minúsculas y arma el nombre completo"
              className="flex-1"
              disabled={generateTransform.isLoading}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateTransform}
              disabled={generateTransform.isLoading || !aiInstruction.trim()}
            >
              {generateTransform.isLoading ? "Generando..." : "Generar"}
            </Button>
          </div>
          {generateTransform.error && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="size-3.5 shrink-0" />
              {generateTransform.error}
              {generateTransform.errorType === "invalid-key" && (
                <button
                  type="button"
                  onClick={generateTransform.goToSettings}
                  className="underline hover:no-underline"
                >
                  Ir a Ajustes
                </button>
              )}
            </div>
          )}
        </div>

        <Textarea
          value={transformCode || ""}
          onChange={(e) => onChange({ transformCode: e.target.value })}
          placeholder={`// Debes retornar el objeto transformado\nrecord.name = record.name.toUpperCase();\nreturn record;`}
          className="min-h-[150px] font-mono text-sm"
        />
        <Button size="sm" onClick={handleTestTransform}>
          <Play className="size-4" />
          Probar con datos de ejemplo
        </Button>

        {testResult && (
          <div
            className={`rounded-lg border p-4 ${
              testResult.success ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
            }`}
          >
            <div className="flex items-start gap-3">
              {testResult.success ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              )}
              <div className="flex-1 space-y-2">
                <p className={`text-sm font-medium ${testResult.success ? "text-success" : "text-destructive"}`}>
                  {testResult.success ? "✓ Ejecución exitosa" : "✗ Error de ejecución"}
                </p>
                {testResult.error && (
                  <pre className="rounded bg-background p-3 text-xs text-destructive">
                    <code>{testResult.error}</code>
                  </pre>
                )}
                {testResult.input != null && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Input:</p>
                    <pre className="max-h-32 overflow-auto rounded bg-background p-3 text-xs">
                      <code>{JSON.stringify(testResult.input, null, 2)}</code>
                    </pre>
                  </div>
                )}
                {testResult.output != null && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Output:</p>
                    <pre className="max-h-32 overflow-auto rounded bg-background p-3 text-xs">
                      <code>{JSON.stringify(testResult.output, null, 2)}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
