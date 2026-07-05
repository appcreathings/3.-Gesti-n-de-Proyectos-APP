import { useState } from "react";
import { GripVertical, LayoutGrid, Plus } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { HierarchyLegend } from "@/components/HierarchyLegend";
import { SortableItem } from "@/components/dnd/SortableItem";
import * as ops from "@/domain/projectOps";
import type { Area, Person, Project } from "@/domain/schemas";
import { AreaCard } from "./AreaCard";
import { AreaFormDialog } from "./AreaFormDialog";

interface Props {
  project: Project;
  people: Person[];
  mutate: (recipe: (p: Project) => Project) => void;
  focusId?: string;
}

export function AreasTab({ project, people, mutate, focusId }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Area | undefined>();

  function submitArea(area: Area) {
    if (project.areas.some((a) => a.id === area.id)) {
      mutate((p) => ops.updateArea(p, area));
    } else {
      mutate((p) => ops.addArea(p, area));
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = project.areas.map((a) => a.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const ordered = arrayMove(ids, oldIndex, newIndex);
    mutate((p) => ops.reorderAreas(p, ordered));
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <HierarchyLegend compact />
        <Button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          Nueva área
        </Button>
      </div>

      {project.areas.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title="Sin áreas todavía"
          description="Crea áreas (Desarrollo, Diseño, Legal, Marketing…) para documentar sus procesos y checklists."
          action={
            <Button
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              Nueva área
            </Button>
          }
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={project.areas.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {project.areas.map((area) => (
                <SortableItem key={area.id} id={area.id}>
                  {({ setNodeRef, style, attributes, listeners, isDragging }) => (
                    <div
                      ref={setNodeRef}
                      style={style}
                      className={isDragging ? "z-10 opacity-80" : undefined}
                    >
                      <AreaCard
                        area={area}
                        people={people}
                        mutate={mutate}
                        tasks={project.tasks.filter((t) => t.areaId === area.id)}
                        focusId={focusId}
                        dragHandle={
                          <button
                            type="button"
                            className="cursor-grab touch-none text-muted-foreground/50 transition-colors hover:text-foreground active:cursor-grabbing"
                            aria-label={`Arrastrar área ${area.name}`}
                            {...listeners}
                            {...attributes}
                          >
                            <GripVertical className="size-4 shrink-0" />
                          </button>
                        }
                        onEdit={() => {
                          setEditing(area);
                          setFormOpen(true);
                        }}
                        onRemove={() => mutate((p) => ops.removeArea(p, area.id))}
                      />
                    </div>
                  )}
                </SortableItem>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <AreaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        area={editing}
        people={people}
        onSubmit={submitArea}
      />
    </div>
  );
}
