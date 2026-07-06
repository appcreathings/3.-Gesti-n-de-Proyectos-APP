import { useCallback, useEffect, useRef, useState } from "react";
import { Archive, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { EntitySelect } from "@/components/forms/EntitySelect";
import { PersonSelect } from "@/components/forms/PersonSelect";
import { DateFieldPreview } from "@/components/forms/DateFieldPreview";
import { priorityLabel, taskStatusLabel } from "@/domain/labels";
import { uuid } from "@/lib/utils";
import { nowIso } from "@/lib/utils";
import type { Area, Comment, Person, Priority, Sprint, Task, TaskStatus } from "@/domain/schemas";

interface Props {
  task: Task | null;
  areas: Area[];
  people: Person[];
  sprints: Sprint[];
  onUpdate: (updated: Task) => void;
  onClose: () => void;
}

export function TaskDetailDrawer({ task, areas, people, sprints, onUpdate, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const [areaId, setAreaId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [sprintId, setSprintId] = useState("");
  const [newComment, setNewComment] = useState("");
  const [drawerWidth, setDrawerWidth] = useState(() => {
    try {
      const saved = localStorage.getItem("kanban-drawer-width");
      return saved ? parseInt(saved, 10) : 400;
    } catch {
      return 400;
    }
  });
  const drawerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setSummary(task.summary ?? "");
      setDescription(task.description);
      setStatus(task.status);
      setPriority(task.priority);
      setAreaId(task.areaId ?? "");
      setAssigneeId(task.assigneeId ?? "");
      setDueDate(task.dueDate ?? "");
      setSprintId(task.sprintId ?? "");
    }
  }, [task]);

  useEffect(() => {
    if (!task) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [task, onClose]);

  useEffect(() => {
    if (task && titleRef.current) {
      titleRef.current.focus();
    }
  }, [task?.id]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = window.innerWidth - e.clientX;
      const clamped = Math.min(800, Math.max(320, newWidth));
      setDrawerWidth(clamped);
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        try {
          localStorage.setItem("kanban-drawer-width", String(drawerWidth));
        } catch {
          // Ignore localStorage errors
        }
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [drawerWidth]);

  const persist = useCallback(
    (field: string, value: string | null) => {
      if (!task) return;
      const updates: Partial<Task> = {};
      switch (field) {
        case "title":
          if ((value as string).trim() && (value as string).trim() !== task.title)
            updates.title = (value as string).trim();
          break;
        case "summary":
          if ((value as string) !== (task.summary ?? "")) updates.summary = value as string;
          break;
        case "description":
          if (value !== task.description) updates.description = value as string;
          break;
        case "status":
          if (value !== task.status) updates.status = value as TaskStatus;
          break;
        case "priority":
          if (value !== task.priority) updates.priority = value as Priority;
          break;
        case "areaId":
          {
            const v = (value as string) || null;
            if (v !== task.areaId) updates.areaId = v;
          }
          break;
        case "assigneeId":
          {
            const v = (value as string) || null;
            if (v !== task.assigneeId) updates.assigneeId = v;
          }
          break;
        case "dueDate":
          {
            const v = (value as string) || null;
            if (v !== task.dueDate) updates.dueDate = v;
          }
          break;
        case "sprintId":
          {
            const v = (value as string) || null;
            if (v !== task.sprintId) updates.sprintId = v;
          }
          break;
      }
      if (Object.keys(updates).length > 0) {
        onUpdate({ ...task, ...updates, updatedAt: new Date().toISOString() });
      }
    },
    [task, onUpdate],
  );

  const addComment = useCallback(() => {
    if (!task || !newComment.trim()) return;
    const comment: Comment = {
      id: uuid(),
      authorId: null,
      text: newComment.trim(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    onUpdate({
      ...task,
      comments: [...(task.comments ?? []), comment],
      updatedAt: nowIso(),
    });
    setNewComment("");
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [task, newComment, onUpdate]);

  const toggleArchive = useCallback(() => {
    if (!task) return;
    onUpdate({
      ...task,
      archived: !task.archived,
      updatedAt: nowIso(),
    });
    if (!task.archived) {
      onClose();
    }
  }, [task, onUpdate, onClose]);

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "ahora";
    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours}h`;
    if (diffDays < 7) return `hace ${diffDays}d`;
    return date.toLocaleDateString();
  };

  if (!task) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 transition-opacity md:bg-transparent"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="false"
        aria-label={`Detalle de tarea: ${task.title}`}
        style={{ width: drawerWidth }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[800px] flex-col border-l bg-background shadow-lg transition-transform duration-200 ease-out md:max-w-none"
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize bg-transparent hover:bg-primary/50 active:bg-primary hidden md:block"
          onMouseDown={(e) => {
            isResizingRef.current = true;
            e.preventDefault();
          }}
          aria-hidden="true"
        />
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-xs text-muted-foreground">
            {taskStatusLabel[task.status]}
          </span>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="d-title" className="text-xs text-muted-foreground">
                Título
              </Label>
              <Input
                ref={titleRef}
                id="d-title"
                value={title}
                className="text-base font-medium"
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => persist("title", title)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="d-summary" className="text-xs text-muted-foreground">
                Resumen
              </Label>
              <Input
                id="d-summary"
                value={summary}
                maxLength={140}
                placeholder="Resumen corto del alcance de la tarea..."
                className="text-sm"
                onChange={(e) => setSummary(e.target.value)}
                onBlur={() => persist("summary", summary)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
              />
              <span className="text-[10px] text-muted-foreground text-right">
                {summary.length}/140
              </span>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="d-desc" className="text-xs text-muted-foreground">
                Descripción
              </Label>
              <Textarea
                id="d-desc"
                value={description}
                placeholder="Añade contexto, criterios de aceptación o notas relevantes..."
                className="min-h-[120px] resize-y text-sm"
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => persist("description", description)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="d-status" className="text-xs text-muted-foreground">
                  Estado
                </Label>
                <Select
                  id="d-status"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as TaskStatus);
                    persist("status", e.target.value);
                  }}
                >
                  {Object.entries(taskStatusLabel).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="d-priority" className="text-xs text-muted-foreground">
                  Prioridad
                </Label>
                <Select
                  id="d-priority"
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value as Priority);
                    persist("priority", e.target.value);
                  }}
                >
                  {Object.entries(priorityLabel).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="d-area" className="text-xs text-muted-foreground">
                  Área
                </Label>
                <EntitySelect
                  id="d-area"
                  value={areaId}
                  onChange={(v) => {
                    setAreaId(v);
                    persist("areaId", v);
                  }}
                  options={areas}
                  placeholder="— Sin área —"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="d-assignee" className="text-xs text-muted-foreground">
                  Responsable
                </Label>
                <PersonSelect
                  id="d-assignee"
                  value={assigneeId}
                  onChange={(v) => {
                    setAssigneeId(v);
                    persist("assigneeId", v);
                  }}
                  people={people}
                />
              </div>
            </div>

            {sprints.length > 0 && (
              <div className="grid gap-1.5">
                <Label htmlFor="d-sprint" className="text-xs text-muted-foreground">
                  Sprint
                </Label>
                <Select
                  id="d-sprint"
                  value={sprintId}
                  onChange={(e) => {
                    setSprintId(e.target.value);
                    persist("sprintId", e.target.value);
                  }}
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
              <Label htmlFor="d-due" className="text-xs text-muted-foreground">
                Fecha límite
              </Label>
              <DateFieldPreview
                id="d-due"
                value={dueDate}
                onChange={(v) => {
                  setDueDate(v);
                  persist("dueDate", v);
                }}
              />
            </div>

            <div className="border-t pt-3">
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">Creada:</span>{" "}
                  {new Date(task.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Actualizada:</span>{" "}
                  {new Date(task.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <Button
                variant={task.archived ? "default" : "outline"}
                size="sm"
                onClick={toggleArchive}
                className="w-full"
              >
                <Archive className="size-3.5 mr-1.5" />
                {task.archived ? "Desarchivar tarea" : "Archivar tarea"}
              </Button>
            </div>

            <div className="border-t pt-4">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-3">
                <MessageCircle className="size-3.5" />
                Comentarios ({task.comments?.length ?? 0})
              </Label>

              {(task.comments?.length ?? 0) > 0 && (
                <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
                  {task.comments!.map((comment) => (
                    <div key={comment.id} className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm whitespace-pre-wrap">{comment.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        {formatRelativeDate(comment.createdAt)}
                      </p>
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
                </div>
              )}

              <div className="space-y-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribe un comentario..."
                  className="min-h-[80px] resize-y text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      addComment();
                    }
                  }}
                />
                <Button
                  onClick={addComment}
                  disabled={!newComment.trim()}
                  size="sm"
                  className="w-full"
                >
                  <Send className="size-3.5 mr-1.5" />
                  Comentar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
