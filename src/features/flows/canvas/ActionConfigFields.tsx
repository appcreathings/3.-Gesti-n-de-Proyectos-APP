import { useEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { EntitySelect } from "@/components/forms/EntitySelect";
import type {
  Output,
  CreatePersonOutput,
  CreateNotificationOutput,
  CreateTaskOutput,
  Trigger,
} from "@/domain/schemas/flow";
import { TASK_COLUMNS, taskStatusLabel } from "@/domain/labels";
import { useDataStore } from "@/store/useDataStore";
import { getConnections, type IntegrationConnection } from "@/integrations/connections";
import { ROUTES } from "@/routes/paths";
import { deriveAvailableVariables } from "./variables";
import { VariablePicker } from "./VariablePicker";
import { VariableValidationHint } from "./VariableValidationHint";

interface Props {
  output: Output;
  trigger: Trigger;
  /** Muestra real de la última "Probar conexión" del trigger (spec 022 §A),
   * reenviada al nodo de acción para alimentar el selector de variables
   * (spec 023 §C). */
  sample?: Record<string, unknown>[];
  onChange: (updates: Partial<Output>) => void;
}

/** Envuelve un `<Input>` con un `VariablePicker` a la derecha — patrón
 * repetido en cada campo interpolable de este archivo. */
function InterpolableField({
  value,
  onChange,
  placeholder,
  inputRef,
  variables,
  type,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputRef: RefObject<HTMLInputElement>;
  variables: ReturnType<typeof deriveAvailableVariables>;
  type?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      <VariablePicker variables={variables} inputRef={inputRef} value={value} onChange={onChange} />
    </div>
  );
}

/** Editor de configuración para un único output. Extraído del viejo
 * `OutputStep.tsx` (retirado — el canvas es ahora la única superficie de
 * creación de flujos); la única diferencia estructural es que opera sobre un
 * output suelto en vez de un índice dentro de `flow.outputs`. */
export function ActionConfigFields({ output, trigger, sample, onChange }: Props) {
  const projectTypes = useDataStore((s) => s.projectTypes);
  const projects = useDataStore((s) => s.projects);
  const products = useDataStore((s) => s.products);
  const [emailConnections, setEmailConnections] = useState<IntegrationConnection[]>([]);
  const availableVariables = deriveAvailableVariables(trigger, sample);

  const titleRef = useRef<HTMLInputElement>(null);
  const projectNameRef = useRef<HTMLInputElement>(null);
  const setFieldValueRef = useRef<HTMLInputElement>(null);
  const notificationMessageRef = useRef<HTMLInputElement>(null);
  const emailToRef = useRef<HTMLInputElement>(null);
  const emailSubjectRef = useRef<HTMLInputElement>(null);
  const emailBodyRef = useRef<HTMLInputElement>(null);
  const taskDescriptionRef = useRef<HTMLInputElement>(null);
  const taskAssigneeRef = useRef<HTMLInputElement>(null);
  const taskDueDateRef = useRef<HTMLInputElement>(null);
  const taskSummaryRef = useRef<HTMLInputElement>(null);
  const taskDedupeKeyRef = useRef<HTMLInputElement>(null);
  const projectDedupeKeyRef = useRef<HTMLInputElement>(null);
  const personValueRefs = useRef<Map<number, HTMLInputElement | null>>(new Map());
  const projectFieldSourceRefs = useRef<Map<number, HTMLInputElement | null>>(new Map());

  function indexedRef(store: Map<number, HTMLInputElement | null>, index: number): RefObject<HTMLInputElement> {
    return {
      get current() {
        return store.get(index) ?? null;
      },
      set current(el: HTMLInputElement | null) {
        store.set(index, el);
      },
    } as RefObject<HTMLInputElement>;
  }
  const personValueRef = (index: number) => indexedRef(personValueRefs.current, index);
  const projectFieldSourceRef = (index: number) => indexedRef(projectFieldSourceRefs.current, index);

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
              inputRef={titleRef}
              variables={availableVariables}
            />
            <VariableValidationHint template={output.title} available={availableVariables} />
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
              placeholder="{{ownerId}} o el id de una persona"
              inputRef={taskAssigneeRef}
              variables={availableVariables}
            />
            <VariableValidationHint template={output.assigneeId ?? ""} available={availableVariables} />
          </div>

          <div className="grid gap-2">
            <Label>Fecha límite (opcional)</Label>
            <InterpolableField
              value={output.dueDate ?? ""}
              onChange={(v) => onChange({ dueDate: v || undefined })}
              placeholder="{{dueDate}} o YYYY-MM-DD"
              inputRef={taskDueDateRef}
              variables={availableVariables}
            />
            <VariableValidationHint template={output.dueDate ?? ""} available={availableVariables} />
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
              inputRef={taskSummaryRef}
              variables={availableVariables}
            />
            <VariableValidationHint template={output.summary ?? ""} available={availableVariables} />
          </div>

          <div className="grid gap-2">
            <Label>Descripción (opcional)</Label>
            <InterpolableField
              value={output.description ?? ""}
              onChange={(v) => onChange({ description: v || undefined })}
              placeholder="{{descripcion}}"
              inputRef={taskDescriptionRef}
              variables={availableVariables}
            />
            <VariableValidationHint template={output.description ?? ""} available={availableVariables} />
          </div>

          <div className="grid gap-2">
            <Label>Clave de deduplicación (opcional)</Label>
            <InterpolableField
              value={output.dedupeKey ?? ""}
              onChange={(v) => onChange({ dedupeKey: v || undefined })}
              placeholder="{{id}}"
              inputRef={taskDedupeKeyRef}
              variables={availableVariables}
            />
            <VariableValidationHint template={output.dedupeKey ?? ""} available={availableVariables} />
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
              inputRef={projectNameRef}
              variables={availableVariables}
            />
            <VariableValidationHint template={output.name} available={availableVariables} />
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
              Qué campo del registro llena qué campo del proyecto (además del nombre), ej.{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">amount</code> →{" "}
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
                        placeholder="campo.origen"
                        inputRef={projectFieldSourceRef(i)}
                        variables={availableVariables}
                      />
                    </div>
                    <span className="text-muted-foreground">→</span>
                    <Input
                      value={f.target}
                      onChange={(e) => {
                        const next = [...output.fields];
                        next[i] = { ...next[i], target: e.target.value };
                        onChange({ fields: next });
                      }}
                      placeholder="campo.destino"
                      className="flex-1"
                    />
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
              inputRef={projectDedupeKeyRef}
              variables={availableVariables}
            />
            <VariableValidationHint template={output.dedupeKey ?? ""} available={availableVariables} />
            <p className="text-xs text-muted-foreground">
              Si ya existe un proyecto con esta clave (interpolada), se omite en vez de duplicar.
            </p>
          </div>
        </div>
      );

    case "createPerson": {
      const dataEntries = Object.entries(output.data);
      const updatePersonData = (entries: [string, string][]) => {
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
                        inputRef={personValueRef(i)}
                        variables={availableVariables}
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
            <Input value={output.field} onChange={(e) => onChange({ field: e.target.value })} placeholder="description" />
          </div>
          <div className="grid gap-2">
            <Label>Valor</Label>
            <InterpolableField
              value={String(output.value ?? "")}
              onChange={(v) => onChange({ value: v })}
              placeholder="{{campo}}"
              inputRef={setFieldValueRef}
              variables={availableVariables}
            />
            <VariableValidationHint template={String(output.value ?? "")} available={availableVariables} />
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
              inputRef={notificationMessageRef}
              variables={availableVariables}
            />
            <VariableValidationHint template={output.message} available={availableVariables} />
          </div>
        </div>
      );

    case "webhook":
      return (
        <div className="space-y-3">
          <div className="grid gap-2">
            <Label>URL</Label>
            <Input
              value={output.url}
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
            />
          </div>
          <div className="grid gap-2">
            <Label>Secret</Label>
            <Input
              type="password"
              value={output.secret}
              onChange={(e) => onChange({ secret: e.target.value })}
              placeholder="whsec_..."
            />
            <p className="text-xs text-muted-foreground">Se usa para firmar el payload con HMAC-SHA256</p>
          </div>
        </div>
      );

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
              inputRef={emailToRef}
              variables={availableVariables}
            />
            <VariableValidationHint template={output.to} available={availableVariables} />
          </div>
          <div className="grid gap-2">
            <Label>Asunto</Label>
            <InterpolableField
              value={output.subject}
              onChange={(v) => onChange({ subject: v })}
              placeholder="Nueva tarea: {{title}}"
              inputRef={emailSubjectRef}
              variables={availableVariables}
            />
            <VariableValidationHint template={output.subject} available={availableVariables} />
          </div>
          <div className="grid gap-2">
            <Label>Cuerpo</Label>
            <InterpolableField
              value={output.body}
              onChange={(v) => onChange({ body: v })}
              placeholder="Se ha creado una nueva tarea: {{title}}"
              inputRef={emailBodyRef}
              variables={availableVariables}
            />
            <VariableValidationHint template={output.body} available={availableVariables} />
          </div>
        </div>
      );

    default:
      return null;
  }
}
