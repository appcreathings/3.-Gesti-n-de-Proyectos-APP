import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Trash2,
  CalendarClock,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  GripVertical,
  Lock,
  Unlock,
  MessageCircle,
  MoreVertical,
  Pencil,
  Archive,
  Clock,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, highlightText } from "@/lib/utils";
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
  /** Rendered inside the DragOverlay (the "ghost" that follows the pointer while dragging). */
  isOverlay?: boolean;
  /** Disable drag-and-drop (e.g. when the detail drawer is open). */
  disabled?: boolean;
  /** Search query for highlighting matches (spec 017). */
  searchQuery?: string;
  /** Bulk selection state (spec 017). */
  selected?: boolean;
  onToggleSelect?: () => void;
  /** Selection mode toggle (spec 017 HU-13). */
  selectionMode?: boolean;
  onMoveBack: () => void;
  onMove: () => void;
  onToggleBlock: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenDetail: () => void;
  onArchive: () => void;
}

/** Sortable Kanban card (reorder + cross-column). The "Mover" button remains as keyboard fallback. */
export function TaskCard({
  task,
  area,
  assignee,
  sprint,
  focused,
  focusRef,
  isOverlay,
  disabled,
  searchQuery,
  selected,
  onToggleSelect,
  selectionMode,
  onMoveBack,
  onMove,
  onToggleBlock,
  onEdit,
  onDelete,
  onOpenDetail,
  onArchive,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { status: task.status }, disabled });
  // The overlay instance shares the dragged task's id, so its own `useSortable` also reports
  // `isDragging: true` — `isPlaceholder` isolates "this is the dimmed origin slot" from that.
  const isPlaceholder = isDragging && !isOverlay;

  const d = daysUntil(task.dueDate);
  const overdue = task.status !== "done" && d !== null && d < 0;
  const dueSoon = task.status !== "done" && d !== null && d >= 0 && d <= 3;
  const isBlocked = task.status === "blocked";

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
        "relative group flex flex-col rounded-lg border p-3 transition-colors",
        isOverlay
          ? "cursor-grabbing border-border/70 bg-background shadow-2xl ring-2 ring-foreground/30 scale-[1.02]"
          : isPlaceholder
            ? // Origin slot while the card itself follows the pointer via DragOverlay — a calm
              // dashed placeholder instead of a translucent duplicate of the full card.
              "border-dashed border-border/50 bg-foreground/[0.02]"
            : "border-border/70 bg-background hover:border-border cursor-pointer",
        focused && !isPlaceholder && !isOverlay && "ring-2 ring-foreground/60",
        // Spec 017 HU-13: Visual indicator for selected tasks
        selected && selectionMode && !isPlaceholder && !isOverlay && "ring-2 ring-blue-400 ring-offset-2",
        // Spec 017: Visual indicators for blocked, overdue, and due-soon tasks
        !isPlaceholder && !isOverlay && isBlocked && "border-l-4 border-l-red-500",
        !isPlaceholder && !isOverlay && overdue && "bg-red-50 dark:bg-red-950/20",
        !isPlaceholder && !isOverlay && dueSoon && !overdue && "bg-amber-50 dark:bg-amber-950/20",
      )}
      onClick={!isOverlay && !isPlaceholder ? onOpenDetail : undefined}
    >
      <div className="flex min-w-0 items-start gap-1.5 mb-1.5">
        {/* Spec 017 HU-13: Checkbox in flow before drag handle (only in selection mode) */}
        {selectionMode && onToggleSelect && !isPlaceholder && !isOverlay && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            onClick={(e) => e.stopPropagation()}
            className="size-4 cursor-pointer shrink-0 mt-2.5"
          />
        )}
        <button
          className="flex items-center justify-center -m-1.5 p-1.5 cursor-grab touch-none text-muted-foreground/50 transition-colors hover:text-foreground active:cursor-grabbing shrink-0 min-w-[44px] min-h-[44px]"
          aria-label={`Arrastrar tarea ${task.title}`}
          onClick={(e) => e.stopPropagation()}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="size-3.5" />
        </button>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isBlocked && !isPlaceholder && (
              <Lock className="size-3.5 text-red-500 shrink-0" />
            )}
            <p className="text-sm font-medium leading-tight break-words line-clamp-2">
              {searchQuery ? highlightText(task.title, searchQuery) : task.title}
            </p>
          </div>
          {task.summary && !isPlaceholder && (
            <p className="text-xs text-muted-foreground leading-tight mt-0.5 line-clamp-2">
              {searchQuery ? highlightText(task.summary, searchQuery) : task.summary}
            </p>
          )}
        </div>
      </div>
      {/* Placeholder (dragging, not the overlay): keep just the title above for context, drop the
          badges/actions so the origin slot reads as a calm hole rather than a duplicate card. */}
      {!isPlaceholder && (
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
          {(task.comments?.length ?? 0) > 0 && (
            <Badge
              variant="outline"
              className="gap-1 text-[11px] leading-tight px-1.5 py-0.5"
            >
              <MessageCircle className="size-3" />
              {task.comments!.length}
            </Badge>
          )}
          {task.estimate !== null && task.estimate !== undefined && (
            <Badge
              variant="outline"
              className="gap-1 text-[11px] leading-tight px-1.5 py-0.5"
            >
              <Clock className="size-3" />
              {task.estimate}h
            </Badge>
          )}
          {(task.subtasks?.length ?? 0) > 0 && (
            <Badge
              variant="outline"
              className="gap-1 text-[11px] leading-tight px-1.5 py-0.5"
            >
              <CheckSquare className="size-3" />
              {task.subtasks!.filter((s) => s.done).length}/{task.subtasks!.length}
            </Badge>
          )}
          {(task.tags ?? []).slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-[11px] leading-tight px-1.5 py-0.5 truncate max-w-[100px]"
            >
              {searchQuery ? highlightText(tag, searchQuery) : tag}
            </Badge>
          ))}
          {(task.tags?.length ?? 0) > 3 && (
            <Badge variant="outline" className="text-[11px] leading-tight px-1.5 py-0.5">
              +{task.tags!.length - 3}
            </Badge>
          )}
        </div>
      )}
      {!isOverlay && !isPlaceholder && (
        <div className="mt-auto flex items-center justify-end gap-1 border-t border-border/50 pt-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            title="Devolver al estado anterior"
            onClick={(e) => { e.stopPropagation(); onMoveBack(); }}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            title="Mover al siguiente estado"
            onClick={(e) => { e.stopPropagation(); onMove(); }}
          >
            <ArrowRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            title={task.status === "blocked" ? "Desbloquear" : "Bloquear"}
            onClick={(e) => { e.stopPropagation(); onToggleBlock(); }}
          >
            {task.status === "blocked" ? (
              <Unlock className="size-4" />
            ) : (
              <Lock className="size-4" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                title="Más opciones"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEdit(); }}>
                <Pencil className="size-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e: React.MouseEvent) => { e.stopPropagation(); onArchive(); }}>
                <Archive className="size-4 mr-2" /> {task.archived ? "Desarchivar" : "Archivar"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4 mr-2" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
