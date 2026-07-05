import { useState } from "react";
import { Plus, Workflow } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { AutomationDialog } from "@/features/automations/AutomationDialog";
import { AutomationRuleCard } from "@/features/automations/components/AutomationRuleCard";
import { useDataStore } from "@/store/useDataStore";
import type { AutomationRule, Project, Scope } from "@/domain/schemas";

interface Props {
  project: Project;
}

/** Same scope logic as the engine: which rules apply to this project. */
function scopeApplies(scope: Scope, project: Project): boolean {
  switch (scope.kind) {
    case "global":
      return true;
    case "project":
      return scope.id === project.id;
    case "product":
      return scope.id === project.productId;
    case "type":
      return scope.id === project.typeId;
  }
}

const scopeBadge: Record<Scope["kind"], string> = {
  global: "Global",
  project: "Este proyecto",
  product: "Su producto",
  type: "Su tipo",
};

/** Rules whose scope reaches this project, plus quick creation pre-scoped to it. */
export function ProjectAutomationsTab({ project }: Props) {
  const automations = useDataStore((s) => s.automations);
  const create = useDataStore((s) => s.createAutomation);
  const update = useDataStore((s) => s.updateAutomation);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AutomationRule | undefined>();

  const applicable = automations.filter((r) => scopeApplies(r.scope, project));
  const defaultScope: Scope = { kind: "project", id: project.id };

  const newRule = () => {
    setEditing(undefined);
    setOpen(true);
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={newRule}>
          <Plus className="size-4" />
          Nueva regla
        </Button>
      </div>

      {applicable.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="Sin automatizaciones aplicables"
          description="Crea una regla disparador → condición → acción para este proyecto, o define reglas globales/por producto/por tipo en la página de Automatizaciones."
          action={
            <Button onClick={newRule}>
              <Plus className="size-4" />
              Nueva regla
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {applicable.map((r) => (
            <AutomationRuleCard
              key={r.id}
              rule={r}
              scopeLabel={scopeBadge[r.scope.kind]}
              onToggleEnabled={(enabled) => update({ ...r, enabled })}
              onEdit={() => {
                setEditing(r);
                setOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <AutomationDialog
        open={open}
        onOpenChange={setOpen}
        rule={editing}
        defaultScope={defaultScope}
        onSubmit={(r) => (editing ? update(r) : create(r))}
      />
    </div>
  );
}
