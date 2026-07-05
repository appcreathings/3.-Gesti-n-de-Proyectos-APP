import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  CheckSquare,
  ClipboardCheck,
  FolderPlus,
  KanbanSquare,
  PlusCircle,
  RefreshCw,
} from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import type { ActivityEntry } from "@/domain/schemas";

interface Props {
  projectId: string;
  entries: ActivityEntry[];
}

const ICONS: Record<string, typeof Activity> = {
  "item.checked": CheckSquare,
  "checklist.completed": ClipboardCheck,
  "area.completed": ClipboardCheck,
  "area.added": FolderPlus,
  "project.created": PlusCircle,
  "project.statusChanged": RefreshCw,
  "task.added": KanbanSquare,
  "task.statusChanged": KanbanSquare,
};

const dayFormatter = new Intl.DateTimeFormat("es", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeFormatter = new Intl.DateTimeFormat("es", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Chronological history of the project, grouped by day (newest first). */
export function ActivityTab({ projectId, entries }: Props) {
  const navigate = useNavigate();

  const groups = useMemo(() => {
    const own = entries.filter((e) => e.projectId === projectId);
    const byDay = new Map<string, ActivityEntry[]>();
    for (const e of own) {
      const day = e.at.slice(0, 10);
      const list = byDay.get(day) ?? [];
      list.push(e);
      byDay.set(day, list);
    }
    return [...byDay.entries()];
  }, [entries, projectId]);

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="Sin actividad todavía"
        description="Aquí verás el historial del proyecto: ítems marcados, checklists completadas, tareas movidas y cambios de estado."
      />
    );
  }

  const open = (e: ActivityEntry) => {
    if (!e.entityRef) return;
    const params = new URLSearchParams();
    const kind = e.entityRef.kind;
    if (kind === "task") {
      params.set("tab", "tasks");
      if (e.entityRef.taskId) params.set("focus", e.entityRef.taskId);
    } else if (kind === "checklistItem" || kind === "checklist" || kind === "area") {
      params.set("tab", "areas");
      const focus = e.entityRef.itemId ?? e.entityRef.checklistId ?? e.entityRef.areaId;
      if (focus) params.set("focus", focus);
    } else {
      params.set("tab", "overview");
    }
    navigate(`/projects/${projectId}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {groups.map(([day, list]) => (
        <section key={day}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {dayFormatter.format(new Date(`${day}T12:00:00`))}
          </h3>
          <ol className="space-y-1">
            {list.map((e) => {
              const Icon = ICONS[e.type] ?? Activity;
              const linkable = Boolean(e.entityRef);
              return (
                <li key={e.id}>
                  <button
                    onClick={() => open(e)}
                    disabled={!linkable}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border bg-background px-3 py-2 text-left text-sm transition-colors",
                      linkable && "hover:bg-muted/60",
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1">{e.message}</span>
                    <time
                      dateTime={e.at}
                      className="shrink-0 text-xs tabular-nums text-muted-foreground"
                    >
                      {timeFormatter.format(new Date(e.at))}
                    </time>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
