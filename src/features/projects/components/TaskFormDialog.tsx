import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from "lucide-react";
import { AiImproveButton } from "@/components/ai/AiImproveButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { EntitySelect } from "@/components/forms/EntitySelect";
import { PersonSelect } from "@/components/forms/PersonSelect";
import { DateFieldPreview } from "@/components/forms/DateFieldPreview";
import { priorityLabel, taskStatusLabel } from "@/domain/labels";
import { newTask } from "@/domain/factories";
import type { Area, Person, Priority, Sprint, Task, TaskStatus } from "@/domain/schemas";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task?: Task;
  areas: Area[];
  people: Person[];
  sprints: Sprint[];
  defaultStatus?: TaskStatus;
  /** Sprint pre-selected for a new task (e.g. created from within a sprint scope). */
  defaultSprintId?: string | null;
  onSubmit: (t: Task) => void;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  areas,
  people,
  sprints,
  defaultStatus = "todo",
  defaultSprintId = null,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<Priority>("medium");
  const [areaId, setAreaId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [sprintId, setSprintId] = useState("");
  // "Más opciones" toggle: start expanded when editing an existing task
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(task?.title ?? "");
      setDescription(task?.description ?? "");
      setStatus(task?.status ?? defaultStatus);
      setPriority(task?.priority ?? "medium");
      setAreaId(task?.areaId ?? "");
      setAssigneeId(task?.assigneeId ?? "");
      setDueDate(task?.dueDate ?? "");
      setSprintId(task?.sprintId ?? defaultSprintId ?? "");
      // Expand advanced options automatically when editing
      setShowAdvanced(!!task);
    }
  }, [open, task, defaultStatus, defaultSprintId]);

  function submit() {
    if (!title.trim()) return;
    const base = task ?? newTask(title);
    onSubmit({
      ...base,
      title: title.trim(),
      description,
      status,
      priority,
      areaId: areaId || null,
      assigneeId: assigneeId || null,
      dueDate: dueDate || null,
      sprintId: sprintId || null,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
          <DialogDescription>
            {task
              ? "Actualiza los datos de la tarea. Los cambios se guardan al hacer clic en Guardar."
              : "Completa la información para crear una nueva tarea en el proyecto."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          {/* ── Información principal ── */}
          <section className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="t-title">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="t-title"
                value={title}
                autoFocus
                placeholder="Ej: Revisar propuesta de diseño"
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !showAdvanced) {
                    e.preventDefault();
                    submit();
                  }
                }}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="t-desc">Descripción</Label>
              <Textarea
                id="t-desc"
                value={description}
                placeholder="Añade contexto, criterios de aceptación o notas relevantes..."
                className="min-h-[100px] resize-y"
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </section>

          {/* ── Toggle "Más opciones" ── */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-fit justify-start gap-2"
          >
            {showAdvanced ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
            <SlidersHorizontal className="size-3.5" />
            {showAdvanced ? "Ocultar opciones avanzadas" : "Mostrar opciones avanzadas"}
          </Button>

          {/* ── Opciones avanzadas ── */}
          {showAdvanced && (
            <section className="grid gap-4 rounded-lg border bg-muted/30 p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="t-status">Estado</Label>
                  <Select
                    id="t-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  >
                    {Object.entries(taskStatusLabel).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="t-priority">Prioridad</Label>
                  <Select
                    id="t-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                  >
                    {Object.entries(priorityLabel).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="t-area">Área</Label>
                  <EntitySelect
                    id="t-area"
                    value={areaId}
                    onChange={setAreaId}
                    options={areas}
                    placeholder="— Sin área —"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="t-assignee">Responsable</Label>
                  <PersonSelect
                    id="t-assignee"
                    value={assigneeId}
                    onChange={setAssigneeId}
                    people={people}
                  />
                </div>
                {sprints.length > 0 && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="t-sprint">Sprint</Label>
                    <Select
                      id="t-sprint"
                      value={sprintId}
                      onChange={(e) => setSprintId(e.target.value)}
                    >
                      <option value="">— Backlog —</option>
                      {sprints.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label htmlFor="t-due">Fecha límite</Label>
                  <DateFieldPreview id="t-due" value={dueDate} onChange={setDueDate} />
                </div>
              </div>
            </section>
          )}

          <AiImproveButton
            entityType="task"
            fields={{
              title,
              description,
              status,
              priority,
              areaId,
              assigneeId,
              dueDate,
              sprintId,
            }}
            onApply={(field, value) => {
              switch (field) {
                case "title":
                  setTitle(value as string);
                  break;
                case "description":
                  setDescription(value as string);
                  break;
                case "status":
                  setStatus(value as TaskStatus);
                  break;
                case "priority":
                  setPriority(value as Priority);
                  break;
                case "areaId":
                  setAreaId(value as string);
                  break;
                case "assigneeId":
                  setAssigneeId(value as string);
                  break;
                case "dueDate":
                  setDueDate(value as string);
                  break;
                case "sprintId":
                  setSprintId(value as string);
                  break;
              }
            }}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 size-4" />
            Cerrar
          </Button>
          <Button onClick={submit} disabled={!title.trim()}>
            {task ? "Guardar cambios" : "Crear tarea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
