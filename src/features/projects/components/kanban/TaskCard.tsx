import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Pencil,
  Trash2,
  CalendarClock,
  AlertCircle,
  ArrowRight,
  GripVertical,
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
  onMove: () => void;
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
  onMove,
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
        "group flex flex-col rounded-lg border border-border/70 bg-background p-2.5 md:p-2 xl:p-3 transition-colors hover:border-border",
        focused && "ring-2 ring-foreground/60",
        isDragging && "z-10 opacity-80 shadow-lg ring-2 ring-foreground/30",
      )}
    >
      <div className="flex min-w-0 items-start gap-1.5 mb-1.5 md:mb-1 xl:mb-1.5">
        <button
          className="mt-0.5 cursor-grab touch-none text-muted-foreground/50 transition-colors hover:text-foreground active:cursor-grabbing shrink-0"
          aria-label={`Arrastrar tarea ${task.title}`}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="size-3 md:size-2.5 xl:size-3" />
        </button>
        <p className="text-sm md:text-[8px] xl:text-sm font-medium leading-tight break-words line-clamp-2">{task.title}</p>
      </div>
      <div className="mt-0 mb-1.5 md:mb-1 xl:mb-1.5 flex flex-wrap items-center gap-1">
        <Badge variant={priorityVariant[task.priority]} className="text-[10px] md:text-[7px] xl:text-[10px] leading-tight px-1.5 py-0.5">
          {priorityLabel[task.priority]}
        </Badge>
        {area && (
          <Badge variant="secondary" className="text-[10px] md:text-[7px] xl:text-[10px] leading-tight px-1.5 py-0.5 truncate max-w-[100px]">
            {area.name}
          </Badge>
        )}
        {sprint && (
          <Badge variant="outline" className="text-[10px] md:text-[7px] xl:text-[10px] leading-tight px-1.5 py-0.5 truncate max-w-[100px]">
            {sprint.name}
          </Badge>
        )}
        {assignee && (
          <Badge variant="outline" className="text-[10px] md:text-[7px] xl:text-[10px] leading-tight px-1.5 py-0.5 truncate max-w-[100px]">
            {assignee.name}
          </Badge>
        )}
        {task.dueDate && (
          <Badge
            variant={overdue ? "destructive" : "outline"}
            className="gap-1 text-[10px] md:text-[7px] xl:text-[10px] leading-tight px-1.5 py-0.5"
          >
            {overdue ? (
              <AlertCircle className="size-3 md:size-2 xl:size-3" />
            ) : (
              <CalendarClock className="size-3 md:size-2 xl:size-3" />
            )}
            {task.dueDate}
          </Badge>
        )}
      </div>
      <div className="mt-auto flex items-center justify-end gap-1 border-t border-border/50 pt-1.5 md:pt-1 xl:pt-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 md:size-5 xl:size-7"
          title="Mover al siguiente estado"
          onClick={onMove}
        >
          <ArrowRight className="size-3.5 md:size-2.5 xl:size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 md:size-5 xl:size-7"
          onClick={onEdit}
        >
          <Pencil className="size-3.5 md:size-2.5 xl:size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 md:size-5 xl:size-7"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5 md:size-2.5 xl:size-3.5" />
        </Button>
      </div>
    </div>
  );
}
