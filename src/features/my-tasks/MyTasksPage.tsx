import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { UserCheck, ChevronDown, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { daysUntil } from "@/domain/compute";
import { priorityLabel, priorityVariant, taskStatusLabel } from "@/domain/labels";
import { useDataStore } from "@/store/useDataStore";
import type { Project, Task } from "@/domain/schemas";
import { TaskDetailDrawer } from "@/features/projects/components/kanban/TaskDetailDrawer";
import * as ops from "@/domain/projectOps";

interface TaskWithProject extends Task {
  project: Project;
  projectName: string;
  areaName?: string;
}

export function MyTasksPage() {
  const projects = useDataStore((s) => s.projects);
  const people = useDataStore((s) => s.people);
  const mutate = useDataStore((s) => s.mutateProject);
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedPersonId = searchParams.get("person");
  const statusFilter = searchParams.get("status");

  const selectedPerson = selectedPersonId ? people.find((p) => p.id === selectedPersonId) : null;

  // Get all tasks assigned to the selected person
  const tasksByProject = useMemo(() => {
    if (!selectedPersonId) return new Map<string, { project: Project; tasks: TaskWithProject[] }>();

    const result = new Map<string, { project: Project; tasks: TaskWithProject[] }>();

    for (const project of projects) {
      const tasks: TaskWithProject[] = [];

      for (const task of project.tasks) {
        if (task.assigneeId !== selectedPersonId) continue;
        if (task.archived) continue;

        // Apply status filter
        if (statusFilter && task.status !== statusFilter) continue;

        const area = project.areas.find((a) => a.id === task.areaId);
        tasks.push({
          ...task,
          project,
          projectName: project.name,
          areaName: area?.name,
        });
      }

      if (tasks.length > 0) {
        result.set(project.id, { project, tasks });
      }
    }

    return result;
  }, [projects, selectedPersonId, statusFilter]);

  const totalTasks = useMemo(() => {
    let count = 0;
    for (const { tasks } of tasksByProject.values()) {
      count += tasks.length;
    }
    return count;
  }, [tasksByProject]);

  // Detail drawer state
  const [detailTask, setDetailTask] = useState<TaskWithProject | null>(null);
  const [detailProject, setDetailProject] = useState<Project | null>(null);

  function openDetail(task: TaskWithProject) {
    setDetailTask(task);
    setDetailProject(task.project);
  }

  function closeDetail() {
    setDetailTask(null);
    setDetailProject(null);
  }

  function handleUpdateTask(updatedTask: Task) {
    if (!detailProject) return;
    mutate(detailProject.id, (p) => ops.updateTask(p, updatedTask));
    setDetailTask({ ...updatedTask, project: detailProject, projectName: detailProject.name });
  }

  function setPerson(personId: string | null) {
    const next = new URLSearchParams(searchParams);
    if (personId) {
      next.set("person", personId);
    } else {
      next.delete("person");
    }
    setSearchParams(next, { replace: true });
  }

  function setStatus(status: string | null) {
    const next = new URLSearchParams(searchParams);
    if (status) {
      next.set("status", status);
    } else {
      next.delete("status");
    }
    setSearchParams(next, { replace: true });
  }

  return (
    <div>
      <PageHeader
        label="Mis tareas"
        title="Tareas asignadas"
        description="Vista unificada de todas tus tareas asignadas en todos los proyectos."
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium">Persona</label>
          <Select
            value={selectedPersonId ?? ""}
            onChange={(e) => setPerson(e.target.value || null)}
          >
            <option value="">Seleccionar persona...</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-sm font-medium">Estado</label>
          <Select
            value={statusFilter ?? ""}
            onChange={(e) => setStatus(e.target.value || null)}
          >
            <option value="">Todos</option>
            <option value="todo">Por hacer</option>
            <option value="doing">En curso</option>
            <option value="blocked">Bloqueada</option>
            <option value="done">Hecha</option>
          </Select>
        </div>
      </div>

      {!selectedPersonId ? (
        <EmptyState
          icon={UserCheck}
          title="Selecciona una persona"
          description="Elige una persona del selector superior para ver sus tareas asignadas."
        />
      ) : totalTasks === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No hay tareas asignadas"
          description={
            statusFilter
              ? `No hay tareas con estado "${taskStatusLabel[statusFilter as keyof typeof taskStatusLabel]}" asignadas a ${selectedPerson?.name}.`
              : `No hay tareas asignadas a ${selectedPerson?.name}.`
          }
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {totalTasks} tarea{totalTasks !== 1 ? "s" : ""} asignada{totalTasks !== 1 ? "s" : ""} a{" "}
            <span className="font-medium text-foreground">{selectedPerson?.name}</span>
          </p>
          {Array.from(tasksByProject.entries()).map(([projectId, { project, tasks }]) => (
            <ProjectTaskGroup
              key={projectId}
              project={project}
              tasks={tasks}
              onOpenDetail={openDetail}
            />
          ))}
        </div>
      )}

      {detailTask && detailProject && (
        <TaskDetailDrawer
          task={detailTask}
          areas={detailProject.areas}
          people={people}
          sprints={detailProject.sprints}
          onUpdate={handleUpdateTask}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}

function ProjectTaskGroup({
  project,
  tasks,
  onOpenDetail,
}: {
  project: Project;
  tasks: TaskWithProject[];
  onOpenDetail: (task: TaskWithProject) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-2xl border border-border/70 bg-background">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-3 border-b border-border/60 p-4 text-left hover:bg-accent/50"
      >
        {collapsed ? (
          <ChevronRight className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
        <span className="flex-1 font-semibold">{project.name}</span>
        <Badge variant="secondary">{tasks.length}</Badge>
      </button>
      {!collapsed && (
        <div className="divide-y divide-border/60">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onClick={() => onOpenDetail(task)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onClick }: { task: TaskWithProject; onClick: () => void }) {
  const d = daysUntil(task.dueDate);
  const overdue = task.status !== "done" && d !== null && d < 0;
  const dueSoon = task.status !== "done" && d !== null && d >= 0 && d <= 3;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent/50",
        overdue && "bg-red-50 dark:bg-red-950/20",
        dueSoon && !overdue && "bg-amber-50 dark:bg-amber-950/20",
      )}
    >
      <Badge variant={priorityVariant[task.priority]} className="text-xs">
        {priorityLabel[task.priority]}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{task.title}</p>
        {task.areaName && (
          <p className="text-xs text-muted-foreground truncate">{task.areaName}</p>
        )}
      </div>
      {task.dueDate && (
        <Badge variant={overdue ? "destructive" : "outline"} className="text-xs">
          {task.dueDate}
        </Badge>
      )}
      <Badge variant="outline" className="text-xs">
        {taskStatusLabel[task.status]}
      </Badge>
    </button>
  );
}
