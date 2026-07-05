import { useEffect, useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { AiImproveButton } from "@/components/ai/AiImproveButton";
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
import { Textarea } from "@/components/ui/textarea";
import { SortableItem } from "@/components/dnd/SortableItem";
import { cn, uuid } from "@/lib/utils";
import type { ProcessTemplate } from "@/domain/schemas";
import { newProcessTemplate } from "@/domain/factories";

interface Step {
  id: string;
  text: string;
  details: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  template?: ProcessTemplate;
  onSubmit: (t: ProcessTemplate) => void;
}

export function ProcessTemplateDialog({ open, onOpenChange, template, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    if (open) {
      setName(template?.name ?? "");
      setCategory(template?.category ?? "");
      setDescription(template?.description ?? "");
      setSteps(template?.steps ?? []);
    }
  }, [open, template]);

  function submit() {
    if (!name.trim()) return;
    const base = template ?? newProcessTemplate(name);
    onSubmit({
      ...base,
      name: name.trim(),
      category,
      description,
      steps: steps.filter((s) => s.text.trim()),
    });
    onOpenChange(false);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSteps((s) => {
      const oldIndex = s.findIndex((x) => x.id === active.id);
      const newIndex = s.findIndex((x) => x.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return s;
      return arrayMove(s, oldIndex, newIndex);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {template ? "Editar plantilla de proceso" : "Nueva plantilla de proceso"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="pt-name">Nombre</Label>
              <Input
                id="pt-name"
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                placeholder="p. ej. Onboarding cliente"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pt-cat">Categoría</Label>
              <Input
                id="pt-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ops, Ventas…"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pt-desc">Descripción (Markdown)</Label>
            <Textarea
              id="pt-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-28 font-mono text-xs"
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Pasos</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSteps((s) => [...s, { id: uuid(), text: "", details: "" }])}
              >
                <Plus className="size-4" />
                Añadir paso
              </Button>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onDragEnd}
            >
              <SortableContext
                items={steps.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <ol className="grid gap-2">
                  {steps.map((s, i) => (
                    <SortableItem key={s.id} id={s.id}>
                      {({ setNodeRef, style, attributes, listeners, isDragging }) => (
                        <li
                          ref={setNodeRef}
                          style={style}
                          className={cn(
                            "flex items-center gap-2 rounded-md border bg-background p-2 shadow-sm",
                            isDragging && "z-10 opacity-80",
                          )}
                        >
                          <button
                            type="button"
                            className="cursor-grab touch-none text-muted-foreground/50 transition-colors hover:text-foreground active:cursor-grabbing"
                            aria-label={`Arrastrar paso ${i + 1}`}
                            {...listeners}
                            {...attributes}
                          >
                            <GripVertical className="size-4" />
                          </button>
                          <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
                            {i + 1}.
                          </span>
                          <Input
                            value={s.text}
                            onChange={(e) =>
                              setSteps((arr) =>
                                arr.map((x) =>
                                  x.id === s.id ? { ...x, text: e.target.value } : x,
                                ),
                              )
                            }
                            placeholder="Describe el paso"
                            className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => setSteps((arr) => arr.filter((x) => x.id !== s.id))}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </li>
                      )}
                    </SortableItem>
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          </div>
          <AiImproveButton
            entityType="process-template"
            fields={{ name, category, description, steps }}
            onApply={(field, value) => {
              switch (field) {
                case "name":
                  setName(value as string);
                  break;
                case "category":
                  setCategory(value as string);
                  break;
                case "description":
                  setDescription(value as string);
                  break;
              }
            }}
          />
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
