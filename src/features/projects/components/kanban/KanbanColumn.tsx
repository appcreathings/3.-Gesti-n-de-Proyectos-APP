import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { taskStatusLabel } from "@/domain/labels";
import type { TaskStatus } from "@/domain/schemas";

interface Props {
  status: TaskStatus;
  count: number;
  /** Ids of the visible tasks in this column, in display order (for intra-column sorting). */
  taskIds: string[];
  onAdd: () => void;
  children: React.ReactNode;
}

/** Droppable Kanban column with sortable cards; highlights while a card hovers over it. */
export function KanbanColumn({ status, count, taskIds, onAdd, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[80vw] shrink-0 snap-start flex-col rounded-xl border border-border/70 bg-background p-3 md:p-2.5 xl:p-3 transition-colors sm:min-w-0 sm:shrink md:min-w-0",
        isOver && "bg-foreground/[0.04] ring-2 ring-foreground/30",
      )}
    >
      <div className="mb-3 md:mb-2 xl:mb-3 flex items-center justify-between px-0.5">
        <span className="font-mono text-[10px] md:text-[8px] xl:text-[10px] uppercase tracking-widest text-muted-foreground truncate">
          {taskStatusLabel[status]}
        </span>
        <Badge variant="outline" className="font-mono text-[10px] md:text-[8px] xl:text-[10px] px-1.5 py-0.5">
          {count}
        </Badge>
      </div>
      <div className="flex-1 space-y-2.5 md:space-y-2 xl:space-y-2.5">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
        <button
          className="w-full rounded-lg border border-dashed border-border/70 py-2.5 md:py-2 xl:py-2.5 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
          onClick={onAdd}
        >
          + Añadir
        </button>
      </div>
    </div>
  );
}
