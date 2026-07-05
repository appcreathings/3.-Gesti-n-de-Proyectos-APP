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
import type { Area, Person, Task } from "@/domain/schemas";

interface Props {
  task: Task;
  area?: Area;
  assignee?: Person;
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
        "group rounded-lg border bg-background p-3 shadow-sm transition-colors",
        focused && "ring-2 ring-primary",
        isDragging && "z-10 opacity-80 shadow-lg ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1.5">
          <button
            className="mt-0.5 cursor-grab touch-none text-muted-foreground/50 transition-colors hover:text-foreground active:cursor-grabbing"
            aria-label={`Arrastrar tarea ${task.title}`}
            {...listeners}
            {...attributes}
          >
            <GripVertical className="size-3.5" />
          </button>
          <p className="text-sm font-medium">{task.title}</p>
        </div>
        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            title="Mover al siguiente estado"
            onClick={onMove}
          >
            <ArrowRight className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-6" onClick={onEdit}>
            <Pencil className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-6" onClick={onDelete}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant={priorityVariant[task.priority]} className="text-[10px]">
          {priorityLabel[task.priority]}
        </Badge>
        {area && (
          <Badge variant="secondary" className="text-[10px]">
            {area.name}
          </Badge>
        )}
        {assignee && (
          <Badge variant="outline" className="text-[10px]">
            {assignee.name}
          </Badge>
        )}
        {task.dueDate && (
          <Badge
            variant={overdue ? "destructive" : "outline"}
            className="gap-1 text-[10px]"
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
    </div>
  );
}
