import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  closestCorners,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Archive, Plus, X } from "lucide-react";
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
import { TaskDetailDrawer } from "./kanban/TaskDetailDrawer";
import { ArchivedTasksList } from "./kanban/ArchivedTasksList";

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
  const [activeId, setActiveId] = useState<string | null>(null);
  // Ephemeral drag preview: mirrors board-by-column while a drag is in progress so cards reflow
  // live (onDragOver) instead of "jumping" only on drop. Null when no drag is active — render then
  // falls back to `boardFromScope` derived straight from props.
  const [dragBoard, setDragBoard] = useState<Record<TaskStatus, string[]> | null>(null);
  // Touch drags are restricted to intra-column reorder (see spec 010) — cross-column moves on
  // touch happen via the existing move buttons instead, to avoid fighting the column snap-scroll.
  const isTouchDragRef = useRef(false);
  const focusRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const areaFilterId = searchParams.get("area");
  const areaFilter = areaFilterId ? project.areas.find((a) => a.id === areaFilterId) : undefined;

  // Detail drawer state (spec 013)
  const detailTaskId = searchParams.get("detail");
  const detailTask = detailTaskId ? project.tasks.find((t) => t.id === detailTaskId) ?? null : null;

  // Archived filter state (spec 015)
  const showArchived = searchParams.get("archived") === "true";

  function toggleArchived() {
    const next = new URLSearchParams(searchParams);
    if (showArchived) {
      next.delete("archived");
    } else {
      next.set("archived", "true");
    }
    setSearchParams(next, { replace: true });
  }

  function openDetail(taskId: string) {
    const next = new URLSearchParams(searchParams);
    next.set("detail", taskId);
    setSearchParams(next, { replace: true });
  }

  function closeDetail() {
    const next = new URLSearchParams(searchParams);
    next.delete("detail");
    setSearchParams(next, { replace: true });
  }

  function handleUpdateTask(updatedTask: Task) {
    mutate((p) => ops.updateTask(p, updatedTask));
  }

  function handleUnarchive(taskId: string) {
    const task = project.tasks.find((t) => t.id === taskId);
    if (task) {
      mutate((p) => ops.updateTask(p, { ...task, archived: false }));
    }
  }

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

  // Filter by archived status (spec 015): exclude archived tasks by default
  const archivedFiltered = showArchived
    ? project.tasks.filter((t) => t.archived)
    : project.tasks.filter((t) => !t.archived);

  const areaScoped = areaFilterId
    ? archivedFiltered.filter((t) => t.areaId === areaFilterId)
    : archivedFiltered;

  // Tasks visible in the board: area filter combined with the sprint scope.
  const tasksInScope = useMemo(() => {
    if (sprintScope === "all") return areaScoped;
    if (sprintScope === "backlog") return areaScoped.filter((t) => t.sprintId === null);
    return areaScoped.filter((t) => t.sprintId === sprintScope);
  }, [areaScoped, sprintScope]);

  // Archived tasks: only apply area filter, not sprint scope (spec 016)
  const archivedTasks = useMemo(() => {
    const archived = project.tasks.filter((t) => t.archived);
    return areaFilterId ? archived.filter((t) => t.areaId === areaFilterId) : archived;
  }, [project.tasks, areaFilterId]);

  // Visible task ids per column, derived from props. The single source of truth outside a drag.
  const boardFromScope = useMemo(() => {
    const board = {} as Record<TaskStatus, string[]>;
    for (const col of TASK_COLUMNS) {
      board[col] = tasksInScope.filter((t) => t.status === col).map((t) => t.id);
    }
    return board;
  }, [tasksInScope]);

  // While dragging, render from the ephemeral preview; otherwise from the derived scope.
  const board = dragBoard ?? boardFromScope;

  function clearAreaFilter() {
    const next = new URLSearchParams(searchParams);
    next.delete("area");
    setSearchParams(next, { replace: true });
  }

  // Distance constraint keeps the card buttons clickable; keyboard sensor for a11y.
  // Mouse + Touch (not the generic Pointer sensor) so each activates independently — mixing
  // Pointer and Touch caused double-activation on touch devices.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Resolves the column empty-space droppable first (fixes dropping on an empty column), then
  // falls back to rect/corner-based resolution for dropping over a specific card.
  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) return rectCollisions;
    return closestCorners(args);
  };

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

  function columnOf(b: Record<TaskStatus, string[]>, taskId: string): TaskStatus | undefined {
    return TASK_COLUMNS.find((col) => b[col].includes(taskId));
  }

  function onDragStart(event: DragStartEvent) {
    // Block drag while the detail drawer is open (spec 013)
    if (detailTaskId) {
      event.activatorEvent.preventDefault?.();
      return;
    }
    setActiveId(String(event.active.id));
    // Touch drags are restricted to intra-column reorder (onDragOver below) — column changes on
    // touch go through the existing move buttons instead.
    isTouchDragRef.current = event.activatorEvent.type.startsWith("touch");
    setDragBoard(boardFromScope);
    if ("vibrate" in navigator) {
      navigator.vibrate(50);
    }
  }

  // Live preview: reflows `dragBoard` on every hover so the drop position is visible before the
  // user lets go — this is what removes the "jump" at drop time.
  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeTaskId = String(active.id);
    const overId = String(over.id);

    setDragBoard((prev) => {
      if (!prev) return prev;
      const fromCol = columnOf(prev, activeTaskId);
      const toCol = COLUMN_IDS.has(overId) ? (overId as TaskStatus) : columnOf(prev, overId);
      if (!fromCol || !toCol) return prev;
      // Touch: ignore hovers that would move the card to a different column.
      if (isTouchDragRef.current && toCol !== fromCol) return prev;

      if (toCol === fromCol) {
        const ids = prev[fromCol];
        const oldIndex = ids.indexOf(activeTaskId);
        const newIndex = COLUMN_IDS.has(overId) ? ids.length - 1 : ids.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
        return { ...prev, [fromCol]: arrayMove(ids, oldIndex, newIndex) };
      }

      const fromIds = prev[fromCol].filter((id) => id !== activeTaskId);
      const toIds = prev[toCol].filter((id) => id !== activeTaskId);
      const insertAt = COLUMN_IDS.has(overId) ? toIds.length : toIds.indexOf(overId);
      const nextToIds = [...toIds];
      nextToIds.splice(insertAt === -1 ? nextToIds.length : insertAt, 0, activeTaskId);
      return { ...prev, [fromCol]: fromIds, [toCol]: nextToIds };
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const finalBoard = dragBoard;
    setActiveId(null);
    setDragBoard(null);
    if (!over || !finalBoard) return;

    const activeTaskId = String(active.id);
    const activeTask = project.tasks.find((t) => t.id === activeTaskId);
    if (!activeTask) return;
    const finalCol = columnOf(finalBoard, activeTaskId);
    if (!finalCol) return;

    const orderedIds = finalBoard[finalCol];
    const unchanged =
      finalCol === activeTask.status &&
      orderedIds.length === boardFromScope[finalCol].length &&
      orderedIds.every((id, i) => id === boardFromScope[finalCol][i]);
    if (unchanged) return;

    // Single persistence for the whole gesture: status change (if any) + final column order.
    mutate((p) => {
      const next =
        finalCol === activeTask.status ? p : ops.updateTask(p, { ...activeTask, status: finalCol });
      return ops.reorderTasks(next, orderedIds);
    });
  }

  function onDragCancel() {
    setActiveId(null);
    setDragBoard(null);
  }

  // Safe lookup for the DragOverlay — avoids a non-null assertion that could crash on a stray
  // re-render mid-drag if the active task were ever removed.
  const activeTask = activeId ? project.tasks.find((t) => t.id === activeId) : undefined;

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
        <div className="flex items-center gap-2">
          {areaFilter ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Filtrando por área:
              <Badge variant="secondary">{areaFilter.name}</Badge>
              <Button variant="ghost" size="sm" onClick={clearAreaFilter}>
                <X className="size-3.5" />
                Quitar filtro
              </Button>
            </div>
          ) : null}
          {showArchived && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">Archivadas</Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showArchived ? "secondary" : "outline"}
            size="sm"
            onClick={toggleArchived}
          >
            <Archive className="size-3.5 mr-1.5" />
            {showArchived ? "Ver activas" : `Archivadas (${project.tasks.filter((t) => t.archived).length})`}
          </Button>
          <Button
            onClick={() =>
              setDialog({
                open: true,
                status: undefined,
              })
            }
            disabled={showArchived}
          >
            <Plus className="size-4" />
            Nueva tarea
          </Button>
        </div>
      </div>

      {showArchived ? (
        <ArchivedTasksList
          tasks={archivedTasks}
          areas={project.areas}
          people={people}
          onOpenDetail={openDetail}
          onUnarchive={handleUnarchive}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto sm:grid sm:grid-cols-2 sm:gap-4 xl:grid-cols-4 xl:gap-3 sm:snap-none sm:overflow-visible">
            {TASK_COLUMNS.map((col) => {
              const ids = board[col];
              const tasks = ids
                .map((id) => project.tasks.find((t) => t.id === id))
                .filter((t): t is Task => !!t);
              return (
                <KanbanColumn
                  key={col}
                  status={col}
                  count={tasks.length}
                  taskIds={ids}
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
                      disabled={!!detailTaskId}
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
                      onEdit={() => openDetail(t.id)}
                      onDelete={() => mutate((p) => ops.removeTask(p, t.id))}
                      onOpenDetail={() => openDetail(t.id)}
                      onArchive={() =>
                        mutate((p) => ops.updateTask(p, { ...t, archived: !t.archived }))
                      }
                    />
                  ))}
                </KanbanColumn>
              );
            })}
          </div>
          <DragOverlay
            dropAnimation={{
              duration: 200,
              easing: "cubic-bezier(0.2, 0, 0, 1)",
            }}
          >
            {activeTask ? (
              <TaskCard
                task={activeTask}
                area={project.areas.find((a) => a.id === activeTask.areaId)}
                assignee={people.find((p) => p.id === activeTask.assigneeId)}
                focused={false}
                isOverlay
                onMoveBack={() => {}}
                onMove={() => {}}
                onToggleBlock={() => {}}
                onEdit={() => {}}
                onDelete={() => {}}
                onOpenDetail={() => {}}
                onArchive={() => {}}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

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

      <TaskDetailDrawer
        task={detailTask}
        areas={project.areas}
        people={people}
        sprints={project.sprints}
        onUpdate={handleUpdateTask}
        onClose={closeDetail}
      />
    </div>
  );
}
