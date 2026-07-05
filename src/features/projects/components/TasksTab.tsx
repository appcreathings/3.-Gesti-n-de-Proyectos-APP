import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import * as ops from "@/domain/projectOps";
import { TASK_COLUMNS } from "@/domain/labels";
import type { Person, Project, Sprint, Task, TaskStatus } from "@/domain/schemas";
import { TaskFormDialog } from "./TaskFormDialog";
import { SprintFormDialog } from "./SprintFormDialog";
import { SprintSwitcher, type SprintScope } from "./SprintSwitcher";
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

const PREV: Record<TaskStatus, TaskStatus> = {
  todo: "done",
  doing: "todo",
  blocked: "doing",
  done: "doing",
};

const COLUMN_IDS = new Set<string>(TASK_COLUMNS);

export function TasksTab({ project, people, mutate, focusId }: Props) {
  const [dialog, setDialog] = useState<{ open: boolean; task?: Task; status?: TaskStatus }>(
    { open: false },
  );
  const [sprintDialog, setSprintDialog] = useState<{ open: boolean; sprint?: Sprint }>({
    open: false,
  });
  const [deleteSprint, setDeleteSprint] = useState<Sprint | null>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const areaFilterId = searchParams.get("area");
  const areaFilter = areaFilterId ? project.areas.find((a) => a.id === areaFilterId) : undefined;

  // Default scope: the project's active sprint if it has one, otherwise "all"
  // (unchanged behavior for projects with no sprints — principio V).
  const activeSprint = project.sprints.find((s) => s.status === "active");
  const sprintScope: SprintScope =
    searchParams.get("sprint") ?? (activeSprint ? activeSprint.id : "all");

  function setSprintScope(scope: SprintScope) {
    const next = new URLSearchParams(searchParams);
    if (scope === "all") next.delete("sprint");
    else next.set("sprint", scope);
    setSearchParams(next, { replace: true });
  }

  const areaScoped = areaFilterId
    ? project.tasks.filter((t) => t.areaId === areaFilterId)
    : project.tasks;

  // Tasks visible in the board: area filter combined with the sprint scope.
  const tasksInScope = useMemo(() => {
    if (sprintScope === "all") return areaScoped;
    if (sprintScope === "backlog") return areaScoped.filter((t) => t.sprintId === null);
    return areaScoped.filter((t) => t.sprintId === sprintScope);
  }, [areaScoped, sprintScope]);

  function clearAreaFilter() {
    const next = new URLSearchParams(searchParams);
    next.delete("area");
    setSearchParams(next, { replace: true });
  }

  // Distance constraint keeps the card buttons clickable; keyboard sensor for a11y.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Scroll focused task into view on first render (deep-link)
  useEffect(() => {
    if (focusId && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusId]);

  function submitTask(t: Task) {
    if (project.tasks.some((x) => x.id === t.id)) {
      mutate((p) => ops.updateTask(p, t));
    } else {
      mutate((p) => ops.addTask(p, t));
    }
  }

  function submitSprint(s: Sprint) {
    const isNew = !project.sprints.some((x) => x.id === s.id);
    mutate((p) => (isNew ? ops.addSprint(p, s) : ops.updateSprint(p, s)));
    // Jump straight into the newly created sprint so the user can start adding tasks.
    if (isNew) setSprintScope(s.id);
  }

  function confirmDeleteSprint() {
    if (!deleteSprint) return;
    mutate((p) => ops.removeSprint(p, deleteSprint.id));
    if (sprintScope === deleteSprint.id) setSprintScope("all");
    setDeleteSprint(null);
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeTask = project.tasks.find((t) => t.id === active.id);
    if (!activeTask) return;
    const overId = String(over.id);

    // Dropped over a column's empty space → move to end of that column.
    if (COLUMN_IDS.has(overId)) {
      if (activeTask.status !== overId) {
        mutate((p) => ops.updateTask(p, { ...activeTask, status: overId as TaskStatus }));
      }
      return;
    }

    const overTask = project.tasks.find((t) => t.id === overId);
    if (!overTask || overTask.id === activeTask.id) return;

    // Dropped over a card in the same column → reorder the visible subset only,
    // so tasks hidden by the ?area=/?sprint= filters keep their relative positions.
    if (overTask.status === activeTask.status) {
      const columnIds = tasksInScope
        .filter((t) => t.status === activeTask.status)
        .map((t) => t.id);
      const oldIndex = columnIds.indexOf(activeTask.id);
      const newIndex = columnIds.indexOf(overTask.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const ordered = arrayMove(columnIds, oldIndex, newIndex);
      mutate((p) => ops.reorderTasks(p, ordered));
      return;
    }

    // Dropped over a card in another column → change status and insert at that position.
    const targetIds = tasksInScope
      .filter((t) => t.status === overTask.status && t.id !== activeTask.id)
      .map((t) => t.id);
    const insertAt = targetIds.indexOf(overTask.id);
    const ordered = [...targetIds];
    ordered.splice(insertAt === -1 ? ordered.length : insertAt, 0, activeTask.id);
    mutate((p) => {
      const moved = ops.updateTask(p, { ...activeTask, status: overTask.status });
      return ops.reorderTasks(moved, ordered);
    });
  }

  return (
    <div>
      <SprintSwitcher
        sprints={project.sprints}
        scope={sprintScope}
        onScopeChange={setSprintScope}
        taskCount={tasksInScope.length}
        onCreateSprint={() => setSprintDialog({ open: true })}
        onEditSprint={(s) => setSprintDialog({ open: true, sprint: s })}
        onDeleteSprint={setDeleteSprint}
      />

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
        <Button
          onClick={() =>
            setDialog({
              open: true,
              status: undefined,
            })
          }
        >
          <Plus className="size-4" />
          Nueva tarea
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto md:grid md:grid-cols-2 md:gap-4 xl:grid-cols-4 xl:gap-3 md:snap-none md:overflow-visible">
          {TASK_COLUMNS.map((col) => {
            const tasks = tasksInScope.filter((t) => t.status === col);
            return (
              <KanbanColumn
                key={col}
                status={col}
                count={tasks.length}
                taskIds={tasks.map((t) => t.id)}
                onAdd={() => setDialog({ open: true, status: col })}
              >
                {tasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    area={project.areas.find((a) => a.id === t.areaId)}
                    assignee={people.find((p) => p.id === t.assigneeId)}
                    sprint={
                      sprintScope === "all"
                        ? project.sprints.find((s) => s.id === t.sprintId)
                        : undefined
                    }
                    focused={t.id === focusId}
                    focusRef={focusRef}
                    onMoveBack={() =>
                      mutate((p) => ops.updateTask(p, { ...t, status: PREV[t.status] }))
                    }
                    onMove={() =>
                      mutate((p) => ops.updateTask(p, { ...t, status: NEXT[t.status] }))
                    }
                    onToggleBlock={() =>
                      mutate((p) =>
                        ops.updateTask(p, {
                          ...t,
                          status: t.status === "blocked" ? "doing" : "blocked",
                        })
                      )
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
        sprints={project.sprints}
        defaultStatus={dialog.status}
        defaultSprintId={sprintScope === "all" || sprintScope === "backlog" ? null : sprintScope}
        onSubmit={submitTask}
      />

      <SprintFormDialog
        open={sprintDialog.open}
        onOpenChange={(o) => setSprintDialog((s) => ({ ...s, open: o }))}
        sprint={sprintDialog.sprint}
        onSubmit={submitSprint}
      />

      <ConfirmDialog
        open={!!deleteSprint}
        onOpenChange={(o) => !o && setDeleteSprint(null)}
        title={`¿Eliminar "${deleteSprint?.name}"?`}
        description="Las tareas del sprint volverán al backlog."
        onConfirm={confirmDeleteSprint}
      />
    </div>
  );
}
