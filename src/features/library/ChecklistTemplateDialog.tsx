import { useEffect, useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { SortableItem } from "@/components/dnd/SortableItem";
import { cn, uuid } from "@/lib/utils";
import type { ChecklistTemplate, TemplateItem } from "@/domain/schemas";
import { newChecklistTemplate } from "@/domain/factories";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  template?: ChecklistTemplate;
  onSubmit: (t: ChecklistTemplate) => void;
}

export function ChecklistTemplateDialog({ open, onOpenChange, template, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (open) {
      setName(template?.name ?? "");
      setCategory(template?.category ?? "");
      setItems(template?.items ?? []);
      setDraft("");
    }
  }, [open, template]);

  function addItem() {
    if (!draft.trim()) return;
    setItems((s) => [...s, { id: uuid(), text: draft.trim(), required: false }]);
    setDraft("");
  }

  function submit() {
    if (!name.trim()) return;
    const base = template ?? newChecklistTemplate(name);
    onSubmit({ ...base, name: name.trim(), category, items });
    onOpenChange(false);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((s) => {
      const oldIndex = s.findIndex((x) => x.id === active.id);
      const newIndex = s.findIndex((x) => x.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return s;
      return arrayMove(s, oldIndex, newIndex);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {template ? "Editar plantilla de checklist" : "Nueva plantilla de checklist"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="ct-name">Nombre</Label>
              <Input
                id="ct-name"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                placeholder="p. ej. QA Release"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ct-cat">Categoría</Label>
              <Input
                id="ct-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="QA, Legal…"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Ítems</Label>
            {items.length === 0 && (
              <p className="text-xs text-muted-foreground">Sin ítems todavía.</p>
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={items.map((it) => it.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-1.5">
                  {items.map((it) => (
                    <SortableItem key={it.id} id={it.id}>
                      {({ setNodeRef, style, attributes, listeners, isDragging }) => (
                        <li
                          ref={setNodeRef}
                          style={style}
                          className={cn(
                            "flex items-center gap-2",
                            isDragging && "z-10 opacity-80",
                          )}
                        >
                          <button
                            type="button"
                            className="cursor-grab touch-none text-muted-foreground/50 transition-colors hover:text-foreground active:cursor-grabbing"
                            aria-label={`Arrastrar ítem ${it.text || "sin texto"}`}
                            {...listeners}
                            {...attributes}
                          >
                            <GripVertical className="size-4" />
                          </button>
                          <Checkbox
                            checked={it.required}
                            onCheckedChange={(c) =>
                              setItems((s) =>
                                s.map((x) => (x.id === it.id ? { ...x, required: c } : x)),
                              )
                            }
                            aria-label="Requerido"
                          />
                          <Input
                            value={it.text}
                            onChange={(e) =>
                              setItems((s) =>
                                s.map((x) =>
                                  x.id === it.id ? { ...x, text: e.target.value } : x,
                                ),
                              )
                            }
                            className="h-9"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9"
                            onClick={() => setItems((s) => s.filter((x) => x.id !== it.id))}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </li>
                      )}
                    </SortableItem>
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                placeholder="Texto del ítem…  (marca la casilla para 'requerido')"
                className="h-9"
              />
              <Button size="icon" variant="secondary" className="size-9" onClick={addItem}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            {template ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
