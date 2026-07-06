import { Archive, Calendar, MessageCircle, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { priorityLabel, priorityVariant, taskStatusLabel } from "@/domain/labels";
import type { Area, Person, Task } from "@/domain/schemas";

interface Props {
  tasks: Task[];
  areas: Area[];
  people: Person[];
  onOpenDetail: (taskId: string) => void;
  onUnarchive: (taskId: string) => void;
}

export function ArchivedTasksList({ tasks, areas, people, onOpenDetail, onUnarchive }: Props) {
  const sortedTasks = [...tasks].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  if (sortedTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Archive className="size-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">No hay tareas archivadas</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {sortedTasks.length} tarea{sortedTasks.length !== 1 ? "s" : ""} archivada{sortedTasks.length !== 1 ? "s" : ""}
        </h3>
      </div>
      {sortedTasks.map((task) => {
        const area = areas.find((a) => a.id === task.areaId);
        const assignee = people.find((p) => p.id === task.assigneeId);

        return (
          <div
            key={task.id}
            className="group rounded-lg border bg-muted/30 p-3 hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => onOpenDetail(task.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {taskStatusLabel[task.status]}
                  </Badge>
                  <Badge variant={priorityVariant[task.priority]} className="text-[10px] px-1.5 py-0">
                    {priorityLabel[task.priority]}
                  </Badge>
                </div>
                <p className="text-sm font-medium leading-tight break-words line-clamp-1">
                  {task.title}
                </p>
                {task.summary && (
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5 line-clamp-1">
                    {task.summary}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {area && (
                    <span className="flex items-center gap-1">
                      <span className="size-3" />
                      {area.name}
                    </span>
                  )}
                  {assignee && (
                    <span className="flex items-center gap-1">
                      <User className="size-3" />
                      {assignee.name}
                    </span>
                  )}
                  {task.dueDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {task.dueDate}
                    </span>
                  )}
                  {(task.comments?.length ?? 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="size-3" />
                      {task.comments!.length}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnarchive(task.id);
                }}
              >
                <Archive className="size-3.5 mr-1" />
                Desarchivar
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
