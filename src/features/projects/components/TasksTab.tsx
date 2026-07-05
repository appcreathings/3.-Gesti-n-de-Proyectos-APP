import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as ops from "@/domain/projectOps";
import { TASK_COLUMNS } from "@/domain/labels";
import type { Person, Project, Task, TaskStatus } from "@/domain/schemas";
import { TaskFormDialog } from "./TaskFormDialog";
import { KanbanColumn } from "./kanban/KanbanColumn";
import { TaskCard } from "./kanban/TaskCard";

interface Props {
  project: Project;
  people: Person[];
  mutate: (recipe: (p: Project) => Project) => void;
  /** If set, scroll to and highlight this task id (from deep-link ?focus=). */
  focusId?: string;
}

const NEXT: Record<TaskStatus, TaskStatus> = {
  todo: "doing",
  doing: "done",
  blocked: "doing",
  done: "todo",
};

const COLUMN_IDS = new Set<string>(TASK_COLUMNS);

export function TasksTab({ project, people, mutate, focusId }: Props) {
  const [dialog, setDialog] = useState<{ open: boolean; task?: Task; status?: TaskStatus }>(
    { open: false },
  );
  const focusRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const areaFilterId = searchParams.get("area");
  const areaFilter = areaFilterId ? project.areas.find((a) => a.id === areaFilterId) : undefined;
  const tasksInScope = areaFilterId
    ? project.tasks.filter((t) => t.areaId === areaFilterId)
    : project.tasks;

  function clearAreaFilter() {
    const next = new URLSearchParams(searchParams);
    next.delete("area");
    setSearchParams(next, { replace: true });
  }

  // Distance constraint keeps the card buttons clickable; keyboard sensor for a11y.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // Scroll focused task into view on first render (deep-link)
  useEffect(() => {
    if (focusId && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusId]);

  function submit(t: Task) {
    if (project.tasks.some((x) => x.id === t.id)) {
      mutate((p) => ops.updateTask(p, t));
    } else {
      mutate((p) => ops.addTask(p, t));
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const overId = event.over?.id;
    if (typeof overId !== "string" || !COLUMN_IDS.has(overId)) return;
    const task = project.tasks.find((t) => t.id === event.active.id);
    if (!task || task.status === overId) return;
    mutate((p) => ops.updateTask(p, { ...task, status: overId as TaskStatus }));
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        {areaFilter ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Filtrando por área:
            <Badge variant="secondary">{areaFilter.name}</Badge>
            <Button variant="ghost" size="sm" onClick={clearAreaFilter}>
              <X className="size-3.5" />
              Quitar filtro
            </Button>
          </div>
        ) : (
          <div />
        )}
        <Button onClick={() => setDialog({ open: true })}>
          <Plus className="size-4" />
          Nueva tarea
        </Button>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {TASK_COLUMNS.map((col) => {
            const tasks = tasksInScope.filter((t) => t.status === col);
            return (
              <KanbanColumn
                key={col}
                status={col}
                count={tasks.length}
                onAdd={() => setDialog({ open: true, status: col })}
              >
                {tasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    area={project.areas.find((a) => a.id === t.areaId)}
                    assignee={people.find((p) => p.id === t.assigneeId)}
                    focused={t.id === focusId}
                    focusRef={focusRef}
                    onMove={() =>
                      mutate((p) => ops.updateTask(p, { ...t, status: NEXT[t.status] }))
                    }
                    onEdit={() => setDialog({ open: true, task: t })}
                    onDelete={() => mutate((p) => ops.removeTask(p, t.id))}
                  />
                ))}
              </KanbanColumn>
            );
          })}
        </div>
      </DndContext>

      <TaskFormDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((s) => ({ ...s, open: o }))}
        task={dialog.task}
        areas={project.areas}
        people={people}
        defaultStatus={dialog.status}
        onSubmit={submit}
      />
    </div>
  );
}
