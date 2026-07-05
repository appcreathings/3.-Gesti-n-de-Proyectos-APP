import { useDroppable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { taskStatusLabel } from "@/domain/labels";
import type { TaskStatus } from "@/domain/schemas";

interface Props {
  status: TaskStatus;
  count: number;
  onAdd: () => void;
  children: React.ReactNode;
}

/** Droppable Kanban column; highlights while a card hovers over it. */
export function KanbanColumn({ status, count, onAdd, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl bg-muted/50 p-3 transition-colors",
        isOver && "bg-primary/10 ring-2 ring-primary/40",
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold">{taskStatusLabel[status]}</h3>
        <Badge variant="outline">{count}</Badge>
      </div>
      <div className="flex-1 space-y-2">
        {children}
        <button
          className="w-full rounded-lg border border-dashed py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          onClick={onAdd}
        >
          + Añadir
        </button>
      </div>
    </div>
  );
}
