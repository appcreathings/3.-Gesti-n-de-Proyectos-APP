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
import { PersonSelect } from "@/components/forms/PersonSelect";
import { SortableItem } from "@/components/dnd/SortableItem";
import { cn, uuid } from "@/lib/utils";
import type { Person, Process, ProcessStep } from "@/domain/schemas";
import { newProcess } from "@/domain/factories";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  process?: Process;
  people?: Person[];
  onSubmit: (p: Process) => void;
}

export function ProcessEditorDialog({
  open,
  onOpenChange,
  process,
  people = [],
  onSubmit,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [ownerId, setOwnerId] = useState("");

  useEffect(() => {
    if (open) {
      setName(process?.name ?? "");
      setDescription(process?.description ?? "");
      setSteps(process?.steps ?? []);
      setOwnerId(process?.ownerId ?? "");
    }
  }, [open, process]);

  function addStep() {
    setSteps((s) => [...s, { id: uuid(), text: "", details: "" }]);
  }
  function setStep(id: string, text: string) {
    setSteps((s) => s.map((x) => (x.id === id ? { ...x, text } : x)));
  }
  function delStep(id: string) {
    setSteps((s) => s.filter((x) => x.id !== id));
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

  function submit() {
    if (!name.trim()) return;
    const base = process ?? newProcess(name);
    onSubmit({
      ...base,
      name: name.trim(),
      description,
      steps: steps.filter((s) => s.text.trim()),
      version: process ? base.version + 1 : 1,
      ownerId: ownerId || null,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{process ? "Editar proceso" : "Nuevo proceso"}</DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">
          <div className="grid gap-1.5">
            <Label htmlFor="proc-name">Nombre del proceso (SOP)</Label>
            <Input
              id="proc-name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!description && steps.length === 0) submit();
                }
              }}
              placeholder="p. ej. Despliegue a producción"
            />
          </div>

          {people.length > 0 && (
            <div className="grid gap-1.5">
              <Label htmlFor="proc-owner">Responsable del proceso</Label>
              <PersonSelect
                id="proc-owner"
                value={ownerId}
                onChange={setOwnerId}
                people={people}
              />
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="proc-desc">Descripción (Markdown)</Label>
            <Textarea
              id="proc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-28 font-mono text-xs"
              placeholder="Documenta el proceso. Admite **negrita**, listas, `código`…"
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Pasos</Label>
              <Button variant="ghost" size="sm" onClick={addStep}>
                <Plus className="size-4" />
                Añadir paso
              </Button>
            </div>
            {steps.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Sin pasos. Añade los pasos secuenciales del proceso.
              </p>
            )}
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
                            <GripVertical className="size-4 shrink-0" />
                          </button>
                          <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">
                            {i + 1}.
                          </span>
                          <Input
                            value={s.text}
                            onChange={(e) => setStep(s.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                // Add next step automatically
                                addStep();
                              }
                            }}
                            placeholder="Describe el paso"
                            className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => delStep(s.id)}
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
            entityType="process"
            fields={{ name, description, steps, ownerId }}
            onApply={(field, value) => {
              switch (field) {
                case "name":
                  setName(value as string);
                  break;
                case "description":
                  setDescription(value as string);
                  break;
                case "ownerId":
                  setOwnerId(value as string);
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
            {process ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
