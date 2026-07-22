import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Plus, Send, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EntitySelect } from "@/components/forms/EntitySelect";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type {
  Output,
  CreatePersonOutput,
  CreateNotificationOutput,
  CreateTaskOutput,
  RetryPolicy,
  Trigger,
} from "@/domain/schemas/flow";
import { TASK_COLUMNS, taskStatusLabel } from "@/domain/labels";
import { useDataStore } from "@/store/useDataStore";
import { getConnections, type IntegrationConnection } from "@/integrations/connections";
import { ROUTES } from "@/routes/paths";
import { interpolateObject } from "@/flows/interpolation";
import { testWebhook, type WebhookTestResult } from "@/flows/webhook-test";
import { deriveAvailableVariables, INTERNAL_TARGET_FIELDS } from "./variables";
import { InterpolableField } from "./InterpolableField";
import { WebhookSignatureGuide } from "./WebhookSignatureGuide";

interface Props {
  output: Output;
  trigger: Trigger;
  /** Muestra real de la última "Probar conexión" del trigger (spec 022 §A),
   * reenviada al nodo de acción para alimentar el selector de variables
   * (spec 023 §C) y las vistas previas en vivo (spec 026 §D). */
  sample?: Record<string, unknown>[];
  /** Qué registro de `sample` alimenta las vistas previas — selector
   * "Registro N" del `SampleExplorer` (spec 026 §D3). */
  previewRecordIndex?: number;
  onChange: (updates: Partial<Output>) => void;
}

/** Select con los campos de proyecto conocidos (`INTERNAL_TARGET_FIELDS.project`)
 * + opción "Otro…" que revela un input libre — reemplaza el `Input` de texto
 * libre para elegir un campo destino (spec 026 §B7), usado por `setField` y
 * por `createProject.fields[*].target`. Reduce el error "escribí un nombre
 * de campo que el proyecto no tiene y no se llenó nada". */
function TargetFieldSelect({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const isKnown = INTERNAL_TARGET_FIELDS.project.some((f) => f.field === value);
  const [customMode, setCustomMode] = useState(value !== "" && !isKnown);
  const selectValue = customMode ? "__custom__" : value;
  return (
    <div className="space-y-1.5">
      <Select
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          if (next === "__custom__") {
            setCustomMode(true);
            return;
          }
          setCustomMode(false);
          onChange(next);
        }}
      >
        <option value="">— Elegir campo —</option>
        {INTERNAL_TARGET_FIELDS.project.map((f) => (
          <option key={f.field} value={f.field}>
            {f.label}
          </option>
        ))}
        <option value="__custom__">Otro…</option>
      </Select>
      {customMode && <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />}
    </div>
  );
}

/** Reintentos de un output de red (spec 027 §E) — compartido por los drawer
 * de webhook y email. `attempts: 0` = sin reintentos (el campo `retry` se
 * borra del output, comportamiento previo intacto). */
function RetryFields({
  retry,
  onChange,
}: {
  retry?: RetryPolicy;
  onChange: (retry: RetryPolicy | undefined) => void;
}) {
  const attempts = retry?.attempts ?? 0;
  return (
    <div className="grid gap-2">
      <Label>Reintentos (0-5)</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={5}
          value={attempts}
          className="w-24"
          onChange={(e) => {
            const n = Math.max(0, Math.min(5, Math.trunc(Number(e.target.value) || 0)));
            onChange(n > 0 ? { attempts: n, backoff: retry?.backoff ?? "exponential" } : undefined);
          }}
        />
        <Select
          value={retry?.backoff ?? "exponential"}
          disabled={attempts === 0}
          onChange={(e) =>
            retry && onChange({ ...retry, backoff: e.target.value as RetryPolicy["backoff"] })
          }
        >
          <option value="exponential">Backoff exponencial</option>
          <option value="fixed">Espera fija (1s)</option>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        Solo reintenta fallos transitorios (error de red o HTTP ≥ 500) — nunca respuestas 4xx. 0 =
        sin reintentos.
      </p>
    </div>
  );
}

/** Editor de configuración para un único output. Extraído del viejo
 * `OutputStep.tsx` (retirado — el canvas es ahora la única superficie de
 * creación de flujos); la única diferencia estructural es que opera sobre un
 * output suelto en vez de un índice dentro de `flow.outputs`. */
export function ActionConfigFields({ output, trigger, sample, previewRecordIndex, onChange }: Props) {
  const projectTypes = useDataStore((s) => s.projectTypes);
  const projects = useDataStore((s) => s.projects);
  const products = useDataStore((s) => s.products);
  const [emailConnections, setEmailConnections] = useState<IntegrationConnection[]>([]);
  const availableVariables = deriveAvailableVariables(trigger, sample);

  // Estado de "Probar webhook" (spec 026 §C3) — declarado aquí (no dentro
  // del `case "webhook"`) porque los Hooks de React no pueden llamarse
  // condicionalmente dentro de un switch.
  const [webhookTestState, setWebhookTestState] = useState<
    { status: "idle" } | { status: "loading" } | { status: "result"; result: WebhookTestResult }
  >({ status: "idle" });
  const [confirmWebhookTestOpen, setConfirmWebhookTestOpen] = useState(false);
  const [signatureGuideOpen, setSignatureGuideOpen] = useState(false);

  // Filas editables de `createPerson.data`/`webhook.payload` (spec 026 §C3
  // — bug encontrado al construir el editor de payload). Ambos son
  // `Record<string, string>`; derivarlas directamente de `output.data`/
  // `output.payload` en cada render (como se hacía antes) descarta cualquier
  // fila recién agregada con clave vacía ANTES de que el usuario alcance a
  // escribirla (`if (k) ... ` en el updater filtra la clave "" al persistir),
  // así que "Añadir campo" no mostraba ninguna fila nueva. El estado local
  // (sembrado una sola vez desde `output`, gracias al `key={node.id}` que
  // `FlowCanvas` le da a este componente — instancia nueva por nodo) permite
  // que la fila en blanco exista mientras el usuario la completa; el objeto
  // persistido vía `onChange` sigue limpio de claves vacías.
  const [personDataRows, setPersonDataRows] = useState<[string, string][]>(() =>
    output.type === "createPerson" ? Object.entries(output.data) : []
  );
  const [payloadRows, setPayloadRows] = useState<[string, string][]>(() =>
    output.type === "webhook" && output.payload
      ? Object.entries(output.payload).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)] as [string, string])
      : []
  );

  useEffect(() => {
    getConnections("email").then(setEmailConnections);
  }, []);

  switch (output.type) {
    case "createTask": {
      const projectRef = output.projectRef ?? "explicit";
      const selectedProject = output.projectId ? projects.find((p) => p.id === output.projectId) : undefined;
      const areaOptions = selectedProject ? selectedProject.areas.map((a) => ({ id: a.id, name: a.name })) : [];
      const tagsValue = (output.tags ?? []).join(", ");

      const setProjectRef = (nextRef: CreateTaskOutput["projectRef"]) =>
        onChange({
          projectRef: nextRef,
          projectId: nextRef === "explicit" ? output.projectId : undefined,
          areaId: nextRef === "explicit" ? output.areaId : undefined,
        });

      return (
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>Título</Label>
            <InterpolableField
              value={output.title}
              onChange={(v) => onChange({ title: v })}
              placeholder="{{name}} - Nueva tarea"
              variables={availableVariables}
              sample={sample}
              previewRecordIndex={previewRecordIndex}
            />
            <p className="text-xs text-muted-foreground">Usa {"{{campo}}"} para interpolación</p>
          </div>

          <div className="grid gap-2">
            <Label>Proyecto destino</Label>
            <Select
              value={projectRef}
              onChange={(e) => setProjectRef(e.target.value as CreateTaskOutput["projectRef"])}
            >
              <option value="explicit">Proyecto específico</option>
              <option value="trigger">Proyecto del evento disparador</option>
              <option value="createdProject">Proyecto creado en este flujo (nodo Crear Proyecto anterior)</option>
            </Select>
            {projectRef === "explicit" && (
              <EntitySelect
                value={output.projectId ?? ""}
                onChange={(id) => onChange({ projectId: id || undefined, areaId: undefined })}
                options={projects.map((p) => ({ id: p.id, name: p.name }))}
                placeholder="— Elegir proyecto —"
              />
            )}
            {projectRef === "trigger" && (
              <p className="text-xs text-muted-foreground">
                Usa el proyecto del evento (o del registro externo, si lo trae) que disparó el flujo.
                Si no hay uno, la tarea no se crea.
              </p>
            )}
            {projectRef === "createdProject" && (
              <p className="text-xs text-muted-foreground">
                Usa el proyecto creado por un nodo "Crear Proyecto" anterior en este mismo flujo.
                Agrega ese nodo antes de este si aún no existe.
              </p>
            )}
          </div>

          {projectRef === "explicit" && selectedProject && (
            <div className="grid gap-2">
              <Label>Área (opcional)</Label>
              <EntitySelect
                value={output.areaId ?? ""}
                onChange={(id) => onChange({ areaId: id || undefined })}
                options={areaOptions}
                placeholder="— Sin área —"
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label>Estado</Label>
            <Select
              value={output.status ?? ""}
              onChange={(e) => onChange({ status: e.target.value || undefined })}
            >
              <option value="">{`${taskStatusLabel.todo} (predeterminado)`}</option>
              {TASK_COLUMNS.filter((s) => s !== "todo").map((s) => (
                <option key={s} value={s}>
                  {taskStatusLabel[s]}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Prioridad</Label>
            <Select value={output.priority || "medium"} onChange={(e) => onChange({ priority: e.target.value })}>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Responsable (opcional)</Label>
            <InterpolableField
              value={output.assigneeId ?? ""}
              onChange={(v) => onChange({ assigneeId: v || undefined })}
              placeholder="{{email}} o el id de una persona"
              variables={availableVariables}
              sample={sample}
              previewRecordIndex={previewRecordIndex}
            />
            <p className="text-xs text-muted-foreground">
              Se busca la persona por id, email o nombre exacto — si no hay match, la tarea queda sin
              responsable.
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Fecha límite (opcional)</Label>
            <InterpolableField
              value={output.dueDate ?? ""}
              onChange={(v) => onChange({ dueDate: v || undefined })}
              placeholder="{{closedate}} o YYYY-MM-DD"
              variables={availableVariables}
              sample={sample}
              previewRecordIndex={previewRecordIndex}
            />
            <p className="text-xs text-muted-foreground">
              Acepta fechas ISO o epoch-ms (ej. {"{{closedate}}"} de HubSpot) — se normaliza a
              YYYY-MM-DD.
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Etiquetas (opcional)</Label>
            <Input
              value={tagsValue}
              onChange={(e) => {
                const tags = e.target.value
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean);
                onChange({ tags: tags.length > 0 ? tags : undefined });
              }}
              placeholder="urgente, cliente-x"
            />
            <p className="text-xs text-muted-foreground">Separadas por comas.</p>
          </div>

          <div className="grid gap-2">
            <Label>Estimación (opcional)</Label>
            <Input
              type="number"
              value={output.estimate ?? ""}
              onChange={(e) =>
                onChange({ estimate: e.target.value === "" ? undefined : Number(e.target.value) })
              }
              placeholder="Horas o puntos"
            />
          </div>

          <div className="grid gap-2">
            <Label>Resumen (opcional)</Label>
            <InterpolableField
              value={output.summary ?? ""}
              onChange={(v) => onChange({ summary: v || undefined })}
              placeholder="Resumen corto de la tarea"
              variables={availableVariables}
              sample={sample}
              previewRecordIndex={previewRecordIndex}
            />
          </div>

          <div className="grid gap-2">
            <Label>Descripción (opcional)</Label>
            <InterpolableField
              value={output.description ?? ""}
              onChange={(v) => onChange({ description: v || undefined })}
              placeholder="{{descripcion}}"
              variables={availableVariables}
              sample={sample}
              previewRecordIndex={previewRecordIndex}
            />
          </div>

          <div className="grid gap-2">
            <Label>Clave de deduplicación (opcional)</Label>
            <InterpolableField
              value={output.dedupeKey ?? ""}
              onChange={(v) => onChange({ dedupeKey: v || undefined })}
              placeholder="{{id}}"
              variables={availableVariables}
              sample={sample}
              previewRecordIndex={previewRecordIndex}
            />
            <p className="text-xs text-muted-foreground">
              Si ya existe una tarea con esta clave (interpolada), se omite en vez de duplicar. Útil
              con el id del registro externo, ej. {"{{id}}"} de un contacto de HubSpot.
            </p>
          </div>
        </div>
      );
    }

    case "createProject":
      return (
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>Nombre del proyecto</Label>
            <InterpolableField
              value={output.name}
              onChange={(v) => onChange({ name: v })}
              placeholder="{{dealname}}"
              variables={availableVariables}
              sample={sample}
              previewRecordIndex={previewRecordIndex}
            />
            <p className="text-xs text-muted-foreground">
              Usa {"{{campo}}"} para interpolar (p.ej. {"{{dealname}}"} en un deal de HubSpot)
            </p>
          </div>
          <div className="grid gap-2">
            <Label>Tipo de proyecto (opcional)</Label>
            <Select
              value={output.projectTypeId ?? ""}
              onChange={(e) => onChange({ projectTypeId: e.target.value || undefined })}
            >
              <option value="">Proyecto en blanco (sin plantilla)</option>
              {projectTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              Si eliges un tipo, el proyecto se crea con sus áreas, checklists y procesos de plantilla.
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Producto (opcional)</Label>
            <EntitySelect
              value={output.productId ?? ""}
              onChange={(id) => onChange({ productId: id || undefined })}
              options={products.map((p) => ({ id: p.id, name: p.name }))}
              placeholder="— Sin producto —"
            />
          </div>

          <div className="grid gap-2">
            <Label>Campos adicionales (opcional)</Label>
            <p className="text-xs text-muted-foreground">
              Qué campo del registro llena qué campo del proyecto (además del nombre) — elige la
              variable con {"{{}}"} o escribe un path crudo, ej.{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">{"{{amount}}"}</code> →{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">description</code>.
            </p>
            {output.fields.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">Sin campos adicionales.</p>
            ) : (
              <div className="space-y-2">
                {output.fields.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1">
                      <InterpolableField
                        value={f.source}
                        onChange={(v) => {
                          const next = [...output.fields];
                          next[i] = { ...next[i], source: v };
                          onChange({ fields: next });
                        }}
                        placeholder="{{campo}} o campo.origen"
                        variables={availableVariables}
                        sample={sample}
                        previewRecordIndex={previewRecordIndex}
                      />
                    </div>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex-1">
                      <TargetFieldSelect
                        value={f.target}
                        onChange={(v) => {
                          const next = [...output.fields];
                          next[i] = { ...next[i], target: v };
                          onChange({ fields: next });
                        }}
                        placeholder="campo.destino"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onChange({ fields: output.fields.filter((_, j) => j !== i) })}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onChange({ fields: [...output.fields, { source: "", target: "" }] })}
            >
              <Plus className="size-4" />
              Añadir campo
            </Button>
          </div>

          <div className="grid gap-2">
            <Label>Clave de deduplicación (opcional)</Label>
            <InterpolableField
              value={output.dedupeKey ?? ""}
              onChange={(v) => onChange({ dedupeKey: v || undefined })}
              placeholder="{{dealId}}"
              variables={availableVariables}
              sample={sample}
              previewRecordIndex={previewRecordIndex}
            />
            <p className="text-xs text-muted-foreground">
              Si ya existe un proyecto con esta clave (interpolada), se omite en vez de duplicar.
            </p>
          </div>
        </div>
      );

    case "createPerson": {
      const dataEntries = personDataRows;
      const updatePersonData = (entries: [string, string][]) => {
        setPersonDataRows(entries);
        const data: Record<string, string> = {};
        for (const [k, v] of entries) if (k) data[k] = v;
        onChange({ data });
      };
      return (
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>Match por</Label>
            <Select
              value={output.matchField}
              onChange={(e) => onChange({ matchField: e.target.value as CreatePersonOutput["matchField"] })}
            >
              <option value="email">Email</option>
              <option value="name">Nombre</option>
              <option value="id">ID</option>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Origen del valor de match (opcional)</Label>
            <InterpolableField
              value={output.matchSource ?? ""}
              onChange={(v) => onChange({ matchSource: v || undefined })}
              placeholder="{{properties.email}}"
              variables={availableVariables}
              sample={sample}
              previewRecordIndex={previewRecordIndex}
            />
            <p className="text-xs text-muted-foreground">
              Si el registro anida el valor (ej. {"{{properties.email}}"} de HubSpot), especifícalo
              aquí. Vacío: usa directamente el campo "{output.matchField}" del registro.
            </p>
          </div>
          <div className="grid gap-2">
            <Label>Si no existe</Label>
            <Select
              value={output.ifNotFound}
              onChange={(e) => onChange({ ifNotFound: e.target.value as CreatePersonOutput["ifNotFound"] })}
            >
              <option value="create">Crear nueva</option>
              <option value="skip">Saltar</option>
              <option value="update">Actualizar</option>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Campos de la persona</Label>
            <p className="text-xs text-muted-foreground">
              Qué campo de Hito (name, email, roleTitle...) recibe qué valor del registro. Usa{" "}
              {"{{campo}}"} para interpolar.
            </p>
            {dataEntries.length === 0 ? (
              <p className="text-sm italic text-muted-foreground">
                Sin campos definidos. Se usará name/email/roleTitle del registro tal cual, si existen.
              </p>
            ) : (
              <div className="space-y-2">
                {dataEntries.map(([key, value], i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={key}
                      onChange={(e) => {
                        const next = [...dataEntries];
                        next[i] = [e.target.value, value];
                        updatePersonData(next);
                      }}
                      placeholder="name / email / roleTitle"
                      className="flex-1"
                    />
                    <span className="text-muted-foreground">=</span>
                    <div className="flex-1">
                      <InterpolableField
                        value={value}
                        onChange={(v) => {
                          const next = [...dataEntries];
                          next[i] = [key, v];
                          updatePersonData(next);
                        }}
                        placeholder="{{email}}"
                        variables={availableVariables}
                        sample={sample}
                        previewRecordIndex={previewRecordIndex}
                      />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => updatePersonData(dataEntries.filter((_, j) => j !== i))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button size="sm" variant="outline" onClick={() => updatePersonData([...dataEntries, ["", ""]])}>
              <Plus className="size-4" />
              Añadir campo
            </Button>
          </div>
        </div>
      );
    }

    case "setProjectStatus":
      return (
        <div className="grid gap-2">
          <Label>Estado</Label>
          <Select value={output.status} onChange={(e) => onChange({ status: e.target.value })}>
            <option value="backlog">Backlog</option>
            <option value="active">Activo</option>
            <option value="paused">Pausado</option>
            <option value="blocked">Bloqueado</option>
            <option value="done">Terminado</option>
          </Select>
        </div>
      );

    case "setField":
      return (
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>Campo del proyecto</Label>
            <TargetFieldSelect
              value={output.field}
              onChange={(v) => onChange({ field: v })}
              placeholder="description"
            />
          </div>
          <div className="grid gap-2">
            <Label>Valor</Label>
            <InterpolableField
              value={String(output.value ?? "")}
              onChange={(v) => onChange({ value: v })}
              placeholder="{{campo}}"
              variables={availableVariables}
              sample={sample}
              previewRecordIndex={previewRecordIndex}
            />
          </div>
        </div>
      );

    case "markAreaComplete":
      return (
        <p className="text-sm text-muted-foreground">
          Marca como completa el área del evento disparador (o la indicada explícitamente, si se
          configura desde el flujo).
        </p>
      );

    case "createNotification":
      return (
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>Severidad</Label>
            <Select
              value={output.severity}
              onChange={(e) => onChange({ severity: e.target.value as CreateNotificationOutput["severity"] })}
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Mensaje</Label>
            <InterpolableField
              value={output.message}
              onChange={(v) => onChange({ message: v })}
              placeholder="Tarea completada: {{title}}"
              variables={availableVariables}
              sample={sample}
              previewRecordIndex={previewRecordIndex}
            />
          </div>
        </div>
      );

    case "webhook": {
      const payloadMode: "full" | "custom" = output.payload ? "custom" : "full";
      const payloadEntries = payloadRows;
      const updatePayloadEntries = (entries: [string, string][]) => {
        setPayloadRows(entries);
        const payload: Record<string, string> = {};
        for (const [k, v] of entries) if (k) payload[k] = v;
        onChange({ payload });
      };

      const clampedIndex =
        sample && sample.length > 0 ? Math.min(Math.max(previewRecordIndex ?? 0, 0), sample.length - 1) : 0;
      const previewRecord = sample && sample.length > 0 ? sample[clampedIndex] : undefined;
      const previewSourceObj = payloadMode === "custom" ? (output.payload ?? {}) : (previewRecord ?? {});
      const preview = previewRecord ? interpolateObject(previewSourceObj, previewRecord) : undefined;

      return (
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>URL</Label>
            <Input
              value={output.url}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
            />
            {output.url && !/^https:\/\//.test(output.url) && (
              <p className="flex items-center gap-1.5 text-xs text-warning">
                <AlertCircle className="size-3.5 shrink-0" />
                La URL debería empezar con https:// — verificar antes de guardar.
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Secret</Label>
            <Input
              type="password"
              value={output.secret}
              onChange={(e) => onChange({ secret: e.target.value })}
              placeholder="whsec_..."
            />
            <p className="text-xs text-muted-foreground">
              Se usa para firmar el payload con HMAC-SHA256.{" "}
              <button
                type="button"
                onClick={() => setSignatureGuideOpen(true)}
                className="text-primary underline-offset-2 hover:underline"
              >
                ¿Cómo verifico esta firma?
              </button>
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Formato del envío</Label>
            <Select
              value={output.payloadShape ?? "bare"}
              onChange={(e) => onChange({ payloadShape: e.target.value as "envelope" | "bare" })}
            >
              <option value="envelope">Envelope firmado (recomendado)</option>
              <option value="bare">Payload plano</option>
            </Select>
            <p className="text-xs text-muted-foreground">
              {(output.payloadShape ?? "bare") === "envelope"
                ? "El body se envuelve en { eventId, eventType, timestamp, workspace, data } — verificable y con anti-replay."
                : "El body es el payload plano. Compatible con escenarios de Make/Zapier que ya esperaban ese shape."}
            </p>
          </div>

          <RetryFields retry={output.retry} onChange={(retry) => onChange({ retry })} />

          <div className="grid gap-2">
            <Label>Payload</Label>
            <Select
              value={payloadMode}
              onChange={(e) => onChange({ payload: e.target.value === "custom" ? (output.payload ?? {}) : undefined })}
            >
              <option value="full">Registro completo</option>
              <option value="custom">Personalizado</option>
            </Select>

            {payloadMode === "custom" && (
              <div className="space-y-2">
                {payloadEntries.length === 0 ? (
                  <p className="text-sm italic text-muted-foreground">Sin campos definidos.</p>
                ) : (
                  payloadEntries.map(([key, value], i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={key}
                        onChange={(e) => {
                          const next = [...payloadEntries];
                          next[i] = [e.target.value, value];
                          updatePayloadEntries(next);
                        }}
                        placeholder="cliente"
                        className="flex-1"
                      />
                      <span className="text-muted-foreground">=</span>
                      <div className="flex-1">
                        <InterpolableField
                          value={value}
                          onChange={(v) => {
                            const next = [...payloadEntries];
                            next[i] = [key, v];
                            updatePayloadEntries(next);
                          }}
                          placeholder="{{Nombre Cliente}}"
                          variables={availableVariables}
                          sample={sample}
                          previewRecordIndex={previewRecordIndex}
                        />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => updatePayloadEntries(payloadEntries.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updatePayloadEntries([...payloadEntries, ["", ""]])}
                >
                  <Plus className="size-4" />
                  Añadir campo
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {payloadMode === "full"
                ? "Se enviará el registro completo (después de mapeo/transformación) tal cual."
                : "Solo se enviarán los campos definidos aquí, con sus valores interpolados."}
            </p>
          </div>

          {preview && (
            <div className="rounded-lg border border-border bg-muted/20 p-2">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Vista previa del envío (registro {clampedIndex + 1}, sin llamar a la red)
              </p>
              <pre className="max-h-32 overflow-auto text-[10px]">
                <code>{JSON.stringify(preview.value, null, 2)}</code>
              </pre>
              {preview.unresolved.length > 0 && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-warning">
                  <AlertCircle className="size-3.5 shrink-0" />
                  {preview.unresolved.length === 1 ? "Token sin resolver" : "Tokens sin resolver"}:{" "}
                  {preview.unresolved.map((t) => `{{${t}}}`).join(", ")}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!output.url || !sample || sample.length === 0 || webhookTestState.status === "loading"}
              onClick={() => setConfirmWebhookTestOpen(true)}
            >
              <Send className="size-4" />
              {webhookTestState.status === "loading" ? "Enviando..." : "Probar webhook"}
            </Button>
            {(!sample || sample.length === 0) && (
              <p className="text-xs text-muted-foreground">
                Prueba la conexión del trigger primero — la prueba de envío usa un registro real.
              </p>
            )}
            {webhookTestState.status === "result" && (
              <p
                className={`flex items-center gap-1.5 text-xs ${
                  webhookTestState.result.ok ? "text-success" : "text-destructive"
                }`}
              >
                {webhookTestState.result.ok ? (
                  <CheckCircle2 className="size-3.5 shrink-0" />
                ) : (
                  <XCircle className="size-3.5 shrink-0" />
                )}
                {webhookTestState.result.status
                  ? `Respondió HTTP ${webhookTestState.result.status}${webhookTestState.result.ok ? "." : " — revisa el endpoint."}`
                  : `Error de red: ${webhookTestState.result.error}`}
              </p>
            )}
          </div>

          <ConfirmDialog
            open={confirmWebhookTestOpen}
            onOpenChange={setConfirmWebhookTestOpen}
            title="¿Enviar un POST real a este webhook?"
            description="Esto no es una simulación: se enviará una llamada real al endpoint configurado, usando el registro de muestra elegido arriba."
            confirmLabel="Enviar de prueba"
            confirmVariant="default"
            onConfirm={() => {
              if (!previewRecord) return;
              setWebhookTestState({ status: "loading" });
              testWebhook(output, previewRecord).then((result) => {
                setWebhookTestState({ status: "result", result });
              });
            }}
          />

          <WebhookSignatureGuide open={signatureGuideOpen} onOpenChange={setSignatureGuideOpen} />
        </div>
      );
    }

    case "email":
      return (
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>Conexión de email</Label>
            {emailConnections.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin conexiones de email. Crea una desde{" "}
                <Link to={ROUTES.integrations} className="text-primary hover:underline">
                  Integraciones
                </Link>
                .
              </p>
            ) : (
              <Select value={output.connectionId} onChange={(e) => onChange({ connectionId: e.target.value })}>
                <option value="">Selecciona una conexión...</option>
                {emailConnections.map((conn) => (
                  <option key={conn.id} value={conn.id}>
                    {conn.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Para</Label>
            <InterpolableField
              value={output.to}
              onChange={(v) => onChange({ to: v })}
              placeholder="{{email}}"
              variables={availableVariables}
              sample={sample}
              previewRecordIndex={previewRecordIndex}
            />
          </div>
          <div className="grid gap-2">
            <Label>Asunto</Label>
            <InterpolableField
              value={output.subject}
              onChange={(v) => onChange({ subject: v })}
              placeholder="Nueva tarea: {{title}}"
              variables={availableVariables}
              sample={sample}
              previewRecordIndex={previewRecordIndex}
            />
          </div>
          <div className="grid gap-2">
            <Label>Cuerpo</Label>
            <InterpolableField
              value={output.body}
              onChange={(v) => onChange({ body: v })}
              placeholder="Se ha creado una nueva tarea: {{title}}"
              variables={availableVariables}
              sample={sample}
              previewRecordIndex={previewRecordIndex}
            />
          </div>
          <RetryFields retry={output.retry} onChange={(retry) => onChange({ retry })} />
        </div>
      );

    default:
      return null;
  }
}
