import { useEffect, useState } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useDataStore } from "@/store/useDataStore";
import {
  EVENT_TRIGGERS,
  actionLabel,
  conditionFieldLabel,
  projectStatusLabel,
  severityLabel,
  triggerLabel,
} from "@/domain/labels";
import { newAutomation } from "@/domain/factories";
import type {
  Action,
  AutomationRule,
  Condition,
  Scope,
} from "@/domain/schemas";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rule?: AutomationRule;
  onSubmit: (r: AutomationRule) => void;
  /** Pre-selected scope for new rules (e.g. from a project's Automatizaciones tab). */
  defaultScope?: Scope;
}

const OPS = ["==", "!=", ">", ">=", "<", "<="] as const;
const ACTION_TYPES = [
  "setProjectStatus",
  "markAreaComplete",
  "createChecklistFromTemplate",
  "createTask",
  "createNotification",
  "setField",
] as const;

export function AutomationDialog({ open, onOpenChange, rule, onSubmit, defaultScope }: Props) {
  const templates = useDataStore((s) => s.checklistTemplates);
  const projects = useDataStore((s) => s.projects);
  const products = useDataStore((s) => s.products);
  const types = useDataStore((s) => s.projectTypes);

  const [name, setName] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [scope, setScope] = useState<Scope>({ kind: "global" });
  const [triggerType, setTriggerType] = useState<string>("checklist.completed");
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [actions, setActions] = useState<Action[]>([]);

  useEffect(() => {
    if (open) {
      setName(rule?.name ?? "");
      setEnabled(rule?.enabled ?? true);
      setScope(rule?.scope ?? defaultScope ?? { kind: "global" });
      setTriggerType(rule?.trigger.type ?? "checklist.completed");
      setConditions(rule?.conditions ?? []);
      setActions(rule?.actions ?? []);
    }
  }, [open, rule]);

  function defaultAction(type: string): Action {
    switch (type) {
      case "setProjectStatus":
        return { type: "setProjectStatus", status: "done" };
      case "markAreaComplete":
        return { type: "markAreaComplete" };
      case "createChecklistFromTemplate":
        return { type: "createChecklistFromTemplate", templateId: templates[0]?.id ?? "" };
      case "createTask":
        return { type: "createTask", title: "" };
      case "createNotification":
        return { type: "createNotification", severity: "info", message: "" };
      default:
        return { type: "setField", field: "project.health", value: "amber" };
    }
  }

  function setAction(idx: number, a: Action) {
    setActions((s) => s.map((x, i) => (i === idx ? a : x)));
  }

  function submit() {
    if (!name.trim()) return;
    const base = rule ?? newAutomation(name);
    onSubmit({
      ...base,
      name: name.trim(),
      enabled,
      scope,
      trigger: { type: triggerType as AutomationRule["trigger"]["type"] },
      conditions,
      actions,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="size-5 text-primary" />
            {rule ? "Editar automatización" : "Nueva automatización"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid max-h-[64vh] gap-5 overflow-y-auto pr-1">
          <div className="grid gap-1.5">
            <Label htmlFor="au-name">Nombre</Label>
            <Input
              id="au-name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="p. ej. Cerrar área al completar su checklist"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox checked={enabled} onCheckedChange={setEnabled} aria-label="Activa" />
            <Label className="cursor-pointer" onClick={() => setEnabled(!enabled)}>
              Regla activa
            </Label>
          </div>

          {/* Ámbito */}
          <div className="grid gap-1.5">
            <Label>Ámbito</Label>
            <div className="flex gap-2">
              <Select
                value={scope.kind}
                onChange={(e) => {
                  const kind = e.target.value as Scope["kind"];
                  setScope(kind === "global" ? { kind } : ({ kind, id: "" } as Scope));
                }}
                className="w-40"
              >
                <option value="global">Global</option>
                <option value="project">Proyecto</option>
                <option value="product">Producto</option>
                <option value="type">Tipo</option>
              </Select>
              {scope.kind !== "global" && (
                <Select
                  value={"id" in scope ? scope.id : ""}
                  onChange={(e) =>
                    setScope({ kind: scope.kind, id: e.target.value } as Scope)
                  }
                >
                  <option value="">— Elegir —</option>
                  {scope.kind === "project" &&
                    projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  {scope.kind === "product" &&
                    products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  {scope.kind === "type" &&
                    types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </Select>
              )}
            </div>
          </div>

          {/* Disparador */}
          <div className="grid gap-1.5">
            <Label>Disparador</Label>
            <Select value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
              {EVENT_TRIGGERS.map((t) => (
                <option key={t} value={t}>
                  {triggerLabel[t]}
                </option>
              ))}
            </Select>
          </div>

          {/* Condiciones */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Condiciones (todas deben cumplirse)</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setConditions((s) => [
                    ...s,
                    { field: "project.progress", op: ">=", value: "100" },
                  ])
                }
              >
                <Plus className="size-4" />
                Condición
              </Button>
            </div>
            {conditions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Sin condiciones: la regla se ejecuta siempre que ocurra el disparador.
              </p>
            )}
            {conditions.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select
                  value={c.field}
                  onChange={(e) =>
                    setConditions((s) =>
                      s.map((x, j) => (j === i ? { ...x, field: e.target.value } : x)),
                    )
                  }
                >
                  {Object.entries(conditionFieldLabel).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
                <Select
                  value={c.op}
                  className="w-20"
                  onChange={(e) =>
                    setConditions((s) =>
                      s.map((x, j) =>
                        j === i ? { ...x, op: e.target.value as Condition["op"] } : x,
                      ),
                    )
                  }
                >
                  {OPS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
                <Input
                  value={String(c.value ?? "")}
                  className="w-28"
                  onChange={(e) =>
                    setConditions((s) =>
                      s.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)),
                    )
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConditions((s) => s.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Acciones */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Acciones</Label>
              <Select
                className="w-56"
                value=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  setActions((s) => [...s, defaultAction(e.target.value)]);
                  e.target.value = "";
                }}
              >
                <option value="">+ Añadir acción…</option>
                {ACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {actionLabel[t]}
                  </option>
                ))}
              </Select>
            </div>
            {actions.length === 0 && (
              <p className="text-xs text-muted-foreground">Añade al menos una acción.</p>
            )}
            <div className="space-y-2">
              {actions.map((a, i) => (
                <div key={i} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">{actionLabel[a.type]}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => setActions((s) => s.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <ActionFields
                    action={a}
                    templates={templates}
                    onChange={(na) => setAction(i, na)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!name.trim() || actions.length === 0}>
            {rule ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActionFields({
  action,
  templates,
  onChange,
}: {
  action: Action;
  templates: { id: string; name: string }[];
  onChange: (a: Action) => void;
}) {
  switch (action.type) {
    case "setProjectStatus":
      return (
        <Select
          value={action.status}
          onChange={(e) => onChange({ ...action, status: e.target.value })}
        >
          {Object.entries(projectStatusLabel).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
      );
    case "markAreaComplete":
      return (
        <p className="text-xs text-muted-foreground">
          Marca como completa el área del disparador.
        </p>
      );
    case "createChecklistFromTemplate":
      return (
        <Select
          value={action.templateId}
          onChange={(e) => onChange({ ...action, templateId: e.target.value })}
        >
          <option value="">— Elegir plantilla —</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      );
    case "createTask":
      return (
        <Input
          value={action.title}
          placeholder="Título de la tarea"
          onChange={(e) => onChange({ ...action, title: e.target.value })}
        />
      );
    case "createNotification":
      return (
        <div className="grid gap-2">
          <Select
            value={action.severity}
            className="w-40"
            onChange={(e) =>
              onChange({ ...action, severity: e.target.value as typeof action.severity })
            }
          >
            {Object.entries(severityLabel).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <Input
            value={action.message}
            placeholder="Mensaje de la notificación"
            onChange={(e) => onChange({ ...action, message: e.target.value })}
          />
        </div>
      );
    case "setField":
      return (
        <div className="flex gap-2">
          <Select
            value={action.field}
            onChange={(e) => onChange({ ...action, field: e.target.value })}
          >
            <option value="project.health">Salud del proyecto</option>
            <option value="project.status">Estado del proyecto</option>
            <option value="project.priority">Prioridad del proyecto</option>
          </Select>
          <Input
            value={String(action.value ?? "")}
            placeholder="Valor"
            onChange={(e) => onChange({ ...action, value: e.target.value })}
          />
        </div>
      );
    default:
      return null;
  }
}
