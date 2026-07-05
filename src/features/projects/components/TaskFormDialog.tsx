import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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
import { priorityLabel, taskStatusLabel } from "@/domain/labels";
import { newTask } from "@/domain/factories";
import type { Area, Person, Priority, Task, TaskStatus } from "@/domain/schemas";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  task?: Task;
  areas: Area[];
  people: Person[];
  defaultStatus?: TaskStatus;
  onSubmit: (t: Task) => void;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  areas,
  people,
  defaultStatus = "todo",
  onSubmit,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<Priority>("medium");
  const [areaId, setAreaId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
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
      // Expand advanced options automatically when editing
      setShowAdvanced(!!task);
    }
  }, [open, task, defaultStatus]);

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
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {showAdvanced ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
            {showAdvanced ? "Menos opciones" : "Más opciones"}
          </button>

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
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="t-due">Fecha límite</Label>
                <Input
                  id="t-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
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
