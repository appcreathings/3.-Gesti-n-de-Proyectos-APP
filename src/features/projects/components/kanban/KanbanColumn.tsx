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
        "flex flex-col rounded-xl border border-border/70 bg-background p-3 transition-colors",
        isOver && "bg-foreground/[0.04] ring-2 ring-foreground/30",
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {taskStatusLabel[status]}
          </span>
          <span className="font-mono text-xs text-muted-foreground/70">{count}</span>
        </div>
        <Badge variant="outline" className="font-mono text-[10px]">
          {count}
        </Badge>
      </div>
      <div className="flex-1 space-y-2">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
        <button
          className="w-full rounded-lg border border-dashed border-border/70 py-2 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
          onClick={onAdd}
        >
          + Añadir
        </button>
      </div>
    </div>
  );
}
