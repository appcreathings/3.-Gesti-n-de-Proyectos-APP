import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Pencil,
  Trash2,
  CalendarClock,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Lock,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { daysUntil } from "@/domain/compute";
import { priorityLabel, priorityVariant } from "@/domain/labels";
import type { Area, Person, Sprint, Task } from "@/domain/schemas";

interface Props {
  task: Task;
  area?: Area;
  assignee?: Person;
  /** Shown only when the board isn't already scoped to a single sprint (e.g. "Todas las tareas"). */
  sprint?: Sprint;
  focused: boolean;
  focusRef?: React.RefObject<HTMLDivElement>;
  onMoveBack: () => void;
  onMove: () => void;
  onToggleBlock: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** Sortable Kanban card (reorder + cross-column). The "Mover" button remains as keyboard fallback. */
export function TaskCard({
  task,
  area,
  assignee,
  sprint,
  focused,
  focusRef,
  onMoveBack,
  onMove,
  onToggleBlock,
  onEdit,
  onDelete,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { status: task.status } });

  const d = daysUntil(task.dueDate);
  const overdue = task.status !== "done" && d !== null && d < 0;

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        if (focusRef && focused && node) {
          (focusRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group flex flex-col rounded-lg border border-border/70 bg-background p-3 transition-colors hover:border-border",
        focused && "ring-2 ring-foreground/60",
        isDragging && "z-10 opacity-80 shadow-lg ring-2 ring-foreground/30",
      )}
    >
      <div className="flex min-w-0 items-start gap-1.5 mb-1.5">
        <button
          className="mt-0.5 cursor-grab touch-none text-muted-foreground/50 transition-colors hover:text-foreground active:cursor-grabbing shrink-0"
          aria-label={`Arrastrar tarea ${task.title}`}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="size-3.5" />
        </button>
        <p className="text-sm font-medium leading-tight break-words line-clamp-2">{task.title}</p>
      </div>
      <div className="mt-0 mb-1.5 flex flex-wrap items-center gap-1">
        <Badge variant={priorityVariant[task.priority]} className="text-[11px] leading-tight px-1.5 py-0.5">
          {priorityLabel[task.priority]}
        </Badge>
        {area && (
          <Badge variant="secondary" className="text-[11px] leading-tight px-1.5 py-0.5 truncate max-w-[130px]">
            {area.name}
          </Badge>
        )}
        {sprint && (
          <Badge variant="outline" className="text-[11px] leading-tight px-1.5 py-0.5 truncate max-w-[130px]">
            {sprint.name}
          </Badge>
        )}
        {assignee && (
          <Badge variant="outline" className="text-[11px] leading-tight px-1.5 py-0.5 truncate max-w-[130px]">
            {assignee.name}
          </Badge>
        )}
        {task.dueDate && (
          <Badge
            variant={overdue ? "destructive" : "outline"}
            className="gap-1 text-[11px] leading-tight px-1.5 py-0.5"
          >
            {overdue ? (
              <AlertCircle className="size-3" />
            ) : (
              <CalendarClock className="size-3" />
            )}
            {task.dueDate}
          </Badge>
        )}
      </div>
      <div className="mt-auto flex items-center justify-end gap-1 border-t border-border/50 pt-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title="Devolver al estado anterior"
          onClick={onMoveBack}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title="Mover al siguiente estado"
          onClick={onMove}
        >
          <ArrowRight className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title={task.status === "blocked" ? "Desbloquear" : "Bloquear"}
          onClick={onToggleBlock}
        >
          {task.status === "blocked" ? (
            <Unlock className="size-4" />
          ) : (
            <Lock className="size-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onEdit}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
