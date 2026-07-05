import { useState } from "react";
import { LayoutGrid, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { HierarchyLegend } from "@/components/HierarchyLegend";
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
        <div className="space-y-4">
          {project.areas.map((area) => (
            <AreaCard
              key={area.id}
              area={area}
              people={people}
              mutate={mutate}
              tasks={project.tasks.filter((t) => t.areaId === area.id)}
              focusId={focusId}
              onEdit={() => {
                setEditing(area);
                setFormOpen(true);
              }}
              onRemove={() => mutate((p) => ops.removeArea(p, area.id))}
            />
          ))}
        </div>
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
