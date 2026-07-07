import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { taskStatusLabel } from "@/domain/labels";
import type { TaskStatus } from "@/domain/schemas";

interface Props {
  status: TaskStatus;
  count: number;
  wipLimit?: number | null;
  /** Ids of the visible tasks in this column, in display order (for intra-column sorting). */
  taskIds: string[];
  onAdd: () => void;
  children: React.ReactNode;
}

/** Droppable Kanban column with sortable cards; highlights while a card hovers over it. */
export function KanbanColumn({ status, count, wipLimit, taskIds, onAdd, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: "column", status },
  });

  const isEmpty = taskIds.length === 0;
  const isOverLimit = wipLimit !== null && wipLimit !== undefined && count > wipLimit;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[85vw] shrink-0 snap-start flex-col rounded-xl border-2 border-transparent bg-background p-3 transition-colors sm:min-w-0 sm:shrink sm:border-border/70",
        isOver && "border-foreground/40 bg-foreground/[0.06]",
        isOverLimit && "bg-amber-50 dark:bg-amber-950/20",
      )}
    >
      <div className="mb-3 flex items-center justify-between px-0.5">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground truncate">
          {taskStatusLabel[status]}
        </span>
        <Badge
          variant={isOverLimit ? "destructive" : "outline"}
          className="font-mono text-[11px] px-1.5 py-0.5"
        >
          {count}{wipLimit !== null && wipLimit !== undefined ? `/${wipLimit}` : ""}
        </Badge>
      </div>
      <div className="flex-1 space-y-2.5">
        {/* Fixed min-height wrapper: the empty-state hint is absolutely positioned inside it and
            only fades in/out, so a column never mounts/unmounts this box — that mount/unmount is
            what caused the layout to jump while a live drag preview empties/fills a column. */}
        <div className="relative min-h-[110px]">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2.5">{children}</div>
          </SortableContext>
          <div
            aria-hidden={!isEmpty}
            className={cn(
              "pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg border-2 border-dashed text-xs transition-colors",
              isEmpty ? "opacity-100" : "opacity-0",
              isOver ? "border-primary/50 bg-primary/5 text-primary" : "border-border/50 text-muted-foreground",
            )}
          >
            Arrastra tareas aquí
          </div>
        </div>
        <button
          className="w-full rounded-lg border border-dashed border-border/70 py-2.5 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
          onClick={onAdd}
        >
          + Añadir
        </button>
      </div>
    </div>
  );
}
