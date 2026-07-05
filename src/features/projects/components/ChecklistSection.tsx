import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  CalendarClock,
  AlertCircle,
  ArrowRight,
  GripVertical,
  ListChecks,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "@/components/dnd/SortableItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { newItem } from "@/domain/factories";
import { checklistProgress, daysUntil } from "@/domain/compute";
import type { Checklist, ChecklistItem, Person } from "@/domain/schemas";
import { ItemEditorDialog } from "./ItemEditorDialog";

interface Props {
  checklist: Checklist;
  people: Person[];
  onAddItem: (item: ChecklistItem) => void;
  onUpdateItem: (item: ChecklistItem) => void;
  onRemoveItem: (itemId: string) => void;
  onRemove: () => void;
  onConvertItemToTask: (item: ChecklistItem) => void;
  onReorderItems: (orderedIds: string[]) => void;
  /** Item id to highlight and scroll into view (from deep-link ?focus=). */
  focusId?: string;
}

export function ChecklistSection({
  checklist,
  people,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onRemove,
  onConvertItemToTask,
  onReorderItems,
  focusId,
}: Props) {
  const navigate = useNavigate();
  const [newText, setNewText] = useState("");
  const [editing, setEditing] = useState<ChecklistItem | undefined>();
  const prog = checklistProgress(checklist);
  const focusRef = useRef<HTMLLIElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = checklist.items.map((i) => i.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorderItems(arrayMove(ids, oldIndex, newIndex));
  }

  // Scroll focused item into view
  useEffect(() => {
    if (focusId && focusRef.current) {
      focusRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusId]);

  function add() {
    if (!newText.trim()) return;
    onAddItem(newItem(newText.trim()));
    setNewText("");
  }

  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold">{checklist.name}</h4>
          <Badge variant="secondary">
            {prog.done}/{prog.total}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="size-4" />
        </Button>
      </div>

      <Progress value={prog.pct} className="mb-3" />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={checklist.items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-1">
            {checklist.items.map((item) => {
              const d = daysUntil(item.dueDate);
              const overdue = !item.done && d !== null && d < 0;
              const assignee = people.find((p) => p.id === item.assigneeId);
              return (
                <SortableItem key={item.id} id={item.id}>
                  {({ setNodeRef, style, attributes, listeners, isDragging }) => (
                    <li
                      ref={(node) => {
                        setNodeRef(node);
                        if (item.id === focusId) {
                          (focusRef as React.MutableRefObject<HTMLLIElement | null>).current =
                            node;
                        }
                      }}
                      style={style}
                      className={cn(
                        "group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent",
                        item.id === focusId && "ring-2 ring-primary",
                        isDragging && "z-10 bg-accent opacity-80",
                      )}
                    >
                      <button
                        type="button"
                        className="cursor-grab touch-none text-muted-foreground/50 transition-colors hover:text-foreground active:cursor-grabbing"
                        aria-label={`Arrastrar ítem ${item.text}`}
                        {...listeners}
                        {...attributes}
                      >
                        <GripVertical className="size-3.5 shrink-0" />
                      </button>
                      <Checkbox
                checked={item.done}
                onCheckedChange={(c) => onUpdateItem({ ...item, done: c })}
                aria-label={item.text}
              />
              <span
                className={cn(
                  "flex-1 text-sm",
                  item.done && "text-muted-foreground line-through",
                )}
              >
                {item.text}
                {item.required && (
                  <span className="ml-1 text-destructive" title="Requerido">
                    *
                  </span>
                )}
              </span>
              {assignee && (
                <Badge variant="outline" className="text-[10px]">
                  {assignee.name}
                </Badge>
              )}
              {item.dueDate && (
                <Badge
                  variant={overdue ? "destructive" : "outline"}
                  className="gap-1 text-[10px]"
                >
                  {overdue ? (
                    <AlertCircle className="size-3" />
                  ) : (
                    <CalendarClock className="size-3" />
                  )}
                  {item.dueDate}
                </Badge>
              )}
              {/* Linked task indicator */}
              {item.linkedTaskId && (
                <button
                  type="button"
                  title="Ver tarea vinculada"
                  className="flex items-center gap-1 rounded text-xs text-primary hover:underline"
                  onClick={() => {
                    // Navigate to tasks tab, focusing the linked task
                    const url = new URL(window.location.href);
                    url.searchParams.set("tab", "tasks");
                    url.searchParams.set("focus", item.linkedTaskId!);
                    navigate(url.pathname + url.search);
                  }}
                >
                  <ArrowRight className="size-3" />
                  Tarea
                </button>
              )}
              <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                {/* Quick "Convert to task" button – only when no task linked yet */}
                {!item.linkedTaskId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    title="Convertir en tarea"
                    onClick={() => onConvertItemToTask(item)}
                  >
                    <ListChecks className="size-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setEditing(item)}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => onRemoveItem(item.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
                    </li>
                  )}
                </SortableItem>
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="mt-2 flex gap-2">
        <Input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Añadir ítem…"
          className="h-9"
        />
        <Button size="icon" variant="secondary" className="size-9" onClick={add}>
          <Plus className="size-4" />
        </Button>
      </div>

      {editing && (
        <ItemEditorDialog
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(undefined)}
          item={editing}
          people={people}
          hasTask={!!editing.linkedTaskId}
          onSubmit={onUpdateItem}
          onConvertToTask={() => {
            onConvertItemToTask(editing);
            setEditing(undefined);
          }}
        />
      )}
    </div>
  );
}
