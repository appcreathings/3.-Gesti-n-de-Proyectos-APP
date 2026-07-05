import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { AiImproveButton } from "@/components/ai/AiImproveButton";
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          {/* ── Campo principal siempre visible ── */}
          <div className="grid gap-1.5">
            <Label htmlFor="t-title">Título</Label>
            <Input
              id="t-title"
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !showAdvanced) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
          </div>

          {/* ── Toggle "Más opciones" ── */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-fit justify-start px-2 text-muted-foreground hover:text-foreground"
          >
            {showAdvanced ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
            <SlidersHorizontal className="size-3.5" />
            {showAdvanced ? "Menos opciones" : "Más opciones"}
          </Button>

          {/* ── Opciones avanzadas ── */}
          {showAdvanced && (
            <>
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
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="t-due">Fecha límite</Label>
                <DateFieldPreview id="t-due" value={dueDate} onChange={setDueDate} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="t-desc">Descripción</Label>
                <Textarea
                  id="t-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!title.trim()}>
            {task ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
