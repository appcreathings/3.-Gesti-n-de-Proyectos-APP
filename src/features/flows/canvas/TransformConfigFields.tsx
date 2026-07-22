import { useEffect, useRef, useState } from "react";
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
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
} from "./variables";
import { MDN_JS_GUIDE_URL, TRANSFORM_SNIPPETS, applySnippet } from "./transformSnippets";
import { useVariableDrop, VARIABLE_DROP_RING } from "./useVariableDrop";
import { mappingEffect } from "./mappingEffect";
// Nota: en spec 025 §B se evaluó usar `VariableValidationHint` aquí también,
// pero NO aplica en este paso del editor:
//  - `mapping[*].source` es un path crudo ("amount", "properties.dealname"),
//    no un template `{{token}}` — el `VariablePicker` ya lo valida mostrando
//    los campos disponibles, y si el usuario escribe uno que no está, el
//    resultado será undefined al ejecutar, visible en la traza del run.
//  - `transformCode` es código JavaScript, no un template de interpolación —
//    los `{{campo}}` no se resuelven dentro del `new Function`.
// Documentado en `design.md` §6.

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
  /** Tokens `{{campo}}` que usan las acciones del flujo, provistos por
   * `CanvasInner` (spec 037 §C1). Sirven para avisar cuándo el mapeo descarta
   * un campo que una acción sigue necesitando (CA-03.3). */
  usedTokens?: string[];
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

interface MappingFieldOption {
  field: string;
  /** Texto de la opción (origen: `campo — ejemplo`; destino: `Etiqueta (campo)`). */
  label: string;
}

/** Celda de una fila del mapeo: `<select>` con los campos conocidos + una
 * opción "Personalizado (escribir)…" que despliega un input de texto libre.
 * Sirve tanto al origen como al destino (spec 037 §A2) — antes eran dos
 * componentes casi idénticos, `MappingSourceCell` y `MappingTargetCell`, y el
 * defecto de abajo vivía por partida doble.
 *
 * **El defecto:** el modo personalizado se derivaba del valor
 * (`selectValue = value === "" ? "" : isKnown ? value : CUSTOM_VALUE`). Al
 * elegir la opción, el handler hacía `onChange("")`; en el re-render la primera
 * rama ganaba, `selectValue` volvía a `""`, el `<Input>` condicionado a
 * `selectValue === CUSTOM_VALUE` no se montaba nunca y el `<select>` rebotaba a
 * la opción vacía. Era literalmente imposible entrar al modo personalizado.
 *
 * **La corrección:** "estoy escribiendo a mano" NO es derivable del valor —
 * `""` significa a la vez "sin elegir" y "custom recién abierto", así que
 * necesita estado propio. */
function MappingFieldCell({
  value,
  options,
  onChange,
  emptyLabel,
  inputPlaceholder,
  datalistId,
  acceptsVariableDrop = false,
}: {
  value: string;
  options: MappingFieldOption[];
  onChange: (next: string) => void;
  emptyLabel: string;
  inputPlaceholder: string;
  /** Solo el origen ofrece autocompletado con los campos de la muestra. */
  datalistId?: string;
  /** Solo el origen acepta variables arrastradas: el destino es un campo
   * interno de Hito, no un campo del registro entrante (spec 037 §B3). */
  acceptsVariableDrop?: boolean;
}) {
  // `null` = deriva del valor (comportamiento al abrir el drawer con un valor
  // ya guardado); `true`/`false` = el usuario eligió explícitamente en esta
  // sesión y su elección manda hasta que elija otra cosa.
  const [customMode, setCustomMode] = useState<boolean | null>(null);
  const derivedCustom = value !== "" && !options.some((o) => o.field === value);
  const isCustom = customMode ?? derivedCustom;

  const inputRef = useRef<HTMLInputElement>(null);
  // `path`: el origen del mapeo es un path crudo que el motor resuelve con
  // `resolvePath`, no un template que interpole — un `{{}}` acá no resolvería.
  const drop = useVariableDrop({ mode: "path", inputRef, value, onChange });

  return (
    <div className="flex-1 space-y-1">
      <Select
        value={isCustom ? CUSTOM_VALUE : value}
        onChange={(e) => {
          const next = e.target.value;
          if (next === CUSTOM_VALUE) {
            // Entrar al modo personalizado deja el valor vacío para que el
            // usuario escriba — y el modo persiste aunque el valor sea ""
            // (CA-01.1, CA-01.3: borrar todo el texto no rebota al select).
            setCustomMode(true);
            onChange("");
            return;
          }
          setCustomMode(false);
          onChange(next);
        }}
      >
        <option value="">{emptyLabel}</option>
        {options.map((o) => (
          <option key={o.field} value={o.field}>
            {o.label}
          </option>
        ))}
        <option value={CUSTOM_VALUE}>Personalizado (escribir)...</option>
      </Select>
      {isCustom && (
        <>
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={inputPlaceholder}
            list={datalistId}
            aria-label="Nombre del campo personalizado"
            className={cn(acceptsVariableDrop && drop.dragOver && VARIABLE_DROP_RING)}
            {...(acceptsVariableDrop ? drop.dropProps : {})}
          />
          {acceptsVariableDrop && (
            <span id={drop.hintId} className="sr-only">
              {drop.hintText}
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function TransformConfigFields({
  mapping,
  transformCode,
  trigger,
  sample,
  usedTokens,
  onChange,
}: Props) {
  const [testResult, setTestResult] = useState<{
    success: boolean;
    input: unknown;
    output: unknown;
    error?: string;
  } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  // Ejemplos de código plegados por defecto (CA-07.2) — ayuda a demanda, sin
  // ruido para quien ya sabe qué escribir.
  const [examplesOpen, setExamplesOpen] = useState(false);
  // Detalle de qué campos sobreviven al mapeo — plegado por defecto para no
  // saturar el drawer (R4); el aviso de tokens rotos sí se ve sin desplegar.
  const [effectOpen, setEffectOpen] = useState(false);
  const [aiInstruction, setAiInstruction] = useState("");
  // Ver `removeMapping`: sube al borrar una fila para remontar las celdas.
  const [rowsGeneration, setRowsGeneration] = useState(0);
  const generateTransform = useGenerateTransform();

  // El textarea es JavaScript, no un template: soltar una variable acá inserta
  // la expresión que la lee (`record.campo`), no un token (spec 037 §B3).
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const codeDrop = useVariableDrop({
    mode: "code",
    inputRef: codeRef,
    value: transformCode ?? "",
    onChange: (next) => onChange({ transformCode: next }),
  });

  const hasRealSample = Boolean(sample && sample.length > 0);
  // Variables disponibles: muestra real si existe, si no los campos
  // conocidos del tipo de evento del trigger (spec 023 §C) — alimenta tanto
  // el datalist de abajo como los selectores emparejados del mapeo.
  const availableVariables = deriveAvailableVariables(trigger, sample);
  const availableFields = availableVariables.map((v) => v.field);
  const internalFields = allInternalTargetFields();

  const sourceOptions = availableVariables.map((v) => ({
    field: v.field,
    label: v.example ? `${v.field} — ${v.example}` : v.field,
  }));
  const targetOptions = internalFields.map((f) => ({
    field: f.field,
    label: `${f.label} (${f.field})`,
  }));

  // Qué le pasa a los datos (spec 037 §C / HU-03). `applyMapping` NO enriquece:
  // con ≥ 1 fila devuelve un objeto nuevo con SOLO los `target` mapeados, así
  // que todo lo demás se descarta en silencio. El motor no se toca — esto lo
  // explica contra los campos que el flujo realmente va a recibir.
  const effect = mappingEffect(mapping, availableFields, usedTokens ?? []);
  const hasKnownFields = availableFields.length > 0;
  const showEffect = mapping.length > 0 && hasKnownFields;

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
    // Fuerza el remontado de las celdas: los índices se corrieron y el estado
    // local de "modo personalizado" de cada celda debe re-derivarse del valor
    // que le toca ahora, no del que tenía la fila anterior en ese índice.
    setRowsGeneration((g) => g + 1);
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
          {/* CA-07.4: separación explícita entre la ruta sin código (mapeo) y
              la avanzada (JavaScript), para que cada usuario sepa cuál es la
              suya sin tener que probar. */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Mapeo de campos</h3>
            <Badge variant="secondary" className="text-[10px]">
              Sin código
            </Badge>
            {/* CA-03.1 / CA-03.5: el efecto real del mapeo, como etiqueta
                visible y no enterrado en el texto de ayuda. */}
            <Badge
              variant={mapping.length > 0 ? "warning" : "secondary"}
              className="text-[10px]"
              title={
                mapping.length > 0
                  ? "Con al menos una fila, el registro pasa a ser SOLO los campos destino que definas acá."
                  : "Sin filas de mapeo, el registro sigue igual."
              }
            >
              {mapping.length > 0 ? "Reemplaza el registro" : "Pasa los datos tal cual"}
            </Badge>
          </div>
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
            : ' — prueba la conexión en el paso de Trigger para ver campos reales en vez de escribirlos a ciegas.'}{" "}
          <strong className="font-medium text-foreground">
            En cuanto agregas una fila, el registro pasa a tener únicamente los campos destino que
            listes acá; el resto se descarta.
          </strong>
        </p>

        {/* CA-03.4: el orden real de ejecución, que no es evidente — sobre todo
            que las condiciones ven el registro ANTES del mapeo. */}
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/20 p-2 text-[10px] text-muted-foreground">
          {["Registro crudo", "Condiciones", "Mapeo", "Código", "Acciones"].map((step, i) => (
            <span key={step} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="size-3 shrink-0" />}
              <span
                className={cn(
                  "rounded bg-background px-1.5 py-0.5",
                  step === "Mapeo" && "font-medium text-foreground",
                )}
              >
                {step}
              </span>
            </span>
          ))}
          <span className="w-full pt-1">
            Las condiciones se evalúan contra el registro <strong>crudo</strong> (antes del mapeo);
            el código y las acciones reciben el registro <strong>ya mapeado</strong>.
          </span>
        </div>

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
              // `rowsGeneration` en la key: al borrar una fila los índices se
              // corren, y sin remontar las celdas el "modo personalizado" que
              // eligió una fila se quedaría pegado a la que ocupa su índice.
              <div key={`${rowsGeneration}-${idx}`} className="flex items-start gap-2">
                <MappingFieldCell
                  value={m.source}
                  options={sourceOptions}
                  onChange={(source) => updateMapping(idx, { source })}
                  emptyLabel="Campo recibido..."
                  inputPlaceholder="campo.origen"
                  datalistId={SOURCE_FIELDS_DATALIST_ID}
                  acceptsVariableDrop
                />
                <span className="mt-2 text-muted-foreground">→</span>
                <MappingFieldCell
                  value={m.target}
                  options={targetOptions}
                  onChange={(target) => updateMapping(idx, { target })}
                  emptyLabel="Campo interno de Hito..."
                  inputPlaceholder="campo.destino"
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

        {mapping.length > 0 && (
          // CA-03.6: la asimetría con `createProject.fields` (que sí admite
          // tokens) confunde, así que se dice explícitamente.
          <p className="text-[10px] text-muted-foreground">
            El origen es un path del registro: admite{" "}
            <code className="font-mono">propiedades.monto</code>, pero{" "}
            <strong>no</strong> admite <code className="font-mono">{"{{campo}}"}</code> — acá no se
            interpola.
          </p>
        )}

        {/* CA-03.3: el aviso accionable va SIEMPRE visible (no plegado): si el
            mapeo rompe un token que una acción usa, enterarse no puede depender
            de que el usuario despliegue un panel. */}
        {showEffect && effect.brokenTokens.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
            <div className="space-y-1 text-xs">
              <p className="font-medium">
                {effect.brokenTokens.length === 1
                  ? "Una acción usa un campo que este mapeo descarta"
                  : `${effect.brokenTokens.length} campos que usan tus acciones quedarían descartados`}
              </p>
              <p className="text-muted-foreground">
                {effect.brokenTokens.map((t) => `{{${t}}}`).join(", ")} dejaría
                {effect.brokenTokens.length === 1 ? "" : "n"} de resolver. Agregá una fila que lo
                conserve, o quitá el token de la acción.
              </p>
            </div>
          </div>
        )}

        {/* CA-03.2 / R4: el detalle campo por campo, plegable. */}
        {showEffect && (
          <div className="rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setEffectOpen((v) => !v)}
              aria-expanded={effectOpen}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-medium hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>
                Qué le pasa a tus datos{" "}
                <span className="font-normal text-muted-foreground">
                  ({effect.kept.length} se conserva{effect.kept.length === 1 ? "" : "n"},{" "}
                  {effect.dropped.length} se descarta{effect.dropped.length === 1 ? "" : "n"})
                </span>
              </span>
              {effectOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
            {effectOpen && (
              <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="flex items-center gap-1 text-[11px] font-medium">
                    <CheckCircle2 className="size-3.5 text-success" />
                    Sobreviven al mapeo
                  </p>
                  {effect.kept.length === 0 ? (
                    <p className="text-[10px] italic text-muted-foreground">
                      Ninguno todavía — completá el campo destino de cada fila.
                    </p>
                  ) : (
                    <ul className="space-y-0.5">
                      {effect.kept.map((f) => (
                        <li key={f} className="truncate font-mono text-[10px]" title={f}>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="flex items-center gap-1 text-[11px] font-medium">
                    <Trash2 className="size-3.5 text-muted-foreground" />
                    Se descartan
                  </p>
                  {effect.dropped.length === 0 ? (
                    <p className="text-[10px] italic text-muted-foreground">
                      Ninguno: el mapeo cubre todos los campos conocidos.
                    </p>
                  ) : (
                    <ul className="space-y-0.5">
                      {effect.dropped.map((f) => {
                        // La marca es texto, no color: quien no distingue el
                        // ámbar igual lee por qué ese campo importa (design §6).
                        const breaksAnAction = effect.brokenTokens.some(
                          (t) => t === f || t.startsWith(`${f}.`),
                        );
                        return (
                          <li
                            key={f}
                            className={cn(
                              "truncate text-[10px]",
                              breaksAnAction ? "font-medium" : "text-muted-foreground",
                            )}
                            title={f}
                          >
                            <span className="font-mono">{f}</span>
                            {breaksAnAction && " — lo usa una acción"}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground sm:col-span-2">
                  {hasRealSample
                    ? "Campos según la última prueba de conexión."
                    : "Campos según el tipo de trigger — prueba la conexión para verlos reales."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CA-07.4: la línea divisoria y el encabezado marcan dónde termina la
          ruta sin código y empieza la avanzada. */}
      <div className="space-y-3 border-t border-border pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Transformación (código, opcional)</h3>
            <Badge variant="outline" className="text-[10px]">
              Avanzado
            </Badge>
          </div>
          {/* CA-07.1: documentación de JavaScript, en español, en pestaña nueva. */}
          <a
            href={MDN_JS_GUIDE_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Guía de JavaScript en MDN (se abre en una pestaña nueva)"
          >
            <ExternalLink className="size-3.5" />
            Aprender JavaScript
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          Código JavaScript para transformaciones complejas. Si el mapeo de arriba te alcanza, no
          necesitas esta sección.
        </p>

        {/* CA-07.2: contrato explícito entra/sale — el "código a ciegas" venía
            sobre todo de no saber qué hay que devolver. */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 p-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Entra</span>
            <code className="rounded bg-background px-1.5 py-0.5 font-mono">record</code>
          </div>
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">tu código lo modifica</span>
          </div>
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Sale</span>
            <code className="rounded bg-background px-1.5 py-0.5 font-mono">return record;</code>
          </div>
        </div>

        {/* CA-07.2: ejemplos plegables que se insertan con un clic. */}
        <div className="rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setExamplesOpen((v) => !v)}
            aria-expanded={examplesOpen}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs font-medium hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>Ejemplos listos para usar</span>
            {examplesOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
          {examplesOpen && (
            <div className="space-y-2 border-t border-border p-3">
              {TRANSFORM_SNIPPETS.map((s) => (
                <div key={s.label} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-medium">{s.label}</p>
                    <pre className="overflow-x-auto rounded bg-muted/40 p-2 text-[10px]">
                      <code>{s.body}</code>
                    </pre>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => onChange({ transformCode: applySnippet(transformCode, s.body) })}
                    title={`Insertar el ejemplo "${s.label}" en el código`}
                  >
                    Usar
                  </Button>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground">
                Los ejemplos usan nombres de campo de muestra — ajústalos a los tuyos (los ves en el
                panel de Variables del canvas).
              </p>
            </div>
          )}
        </div>

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
          ref={codeRef}
          value={transformCode || ""}
          onChange={(e) => onChange({ transformCode: e.target.value })}
          placeholder={`// Debes retornar el objeto transformado\nrecord.name = record.name.toUpperCase();\nreturn record;`}
          className={cn("min-h-[150px] font-mono text-sm", codeDrop.dragOver && VARIABLE_DROP_RING)}
          {...codeDrop.dropProps}
        />
        <span id={codeDrop.hintId} className="sr-only">
          {codeDrop.hintText}
        </span>
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
