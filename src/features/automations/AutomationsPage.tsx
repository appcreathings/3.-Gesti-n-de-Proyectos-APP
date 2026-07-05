import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Plus, Workflow } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AutomationDialog } from "./AutomationDialog";
import { AutomationRuleCard } from "./components/AutomationRuleCard";
import { useDataStore } from "@/store/useDataStore";
import type { AutomationRule } from "@/domain/schemas";

export function AutomationsPage() {
  const automations = useDataStore((s) => s.automations);
  const create = useDataStore((s) => s.createAutomation);
  const update = useDataStore((s) => s.updateAutomation);
  const remove = useDataStore((s) => s.deleteAutomation);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AutomationRule | undefined>();
  const [toDelete, setToDelete] = useState<AutomationRule | undefined>();

  const scopeLabel = (r: AutomationRule) =>
    r.scope.kind === "global" ? "Global" : r.scope.kind;

  return (
    <>
      <Helmet>
        <title>Automatizaciones | Hito</title>
        <meta name="description" content="Reglas disparador → condición → acción para automatizar procesos en Hito." />
      </Helmet>
      <div>
      <PageHeader
        title="Automatizaciones"
        description="Reglas disparador → condición → acción. Se ejecutan en tu navegador al cambiar los datos."
        actions={
          <Button
            onClick={() => {
              setEditing(undefined);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Nueva regla
          </Button>
        }
      />

      {automations.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="Sin automatizaciones"
          description="Crea reglas para que el PM trabaje solo: cerrar un área al completar su checklist, generar checklists al añadir un área, avisar al cambiar de estado…"
          action={
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus className="size-4" />
              Nueva regla
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {automations.map((r) => (
            <AutomationRuleCard
              key={r.id}
              rule={r}
              scopeLabel={scopeLabel(r)}
              onToggleEnabled={(enabled) => update({ ...r, enabled })}
              onEdit={() => {
                setEditing(r);
                setOpen(true);
              }}
              onDelete={() => setToDelete(r)}
            />
          ))}
        </div>
      )}

      <AutomationDialog
        open={open}
        onOpenChange={setOpen}
        rule={editing}
        onSubmit={(r) => (editing ? update(r) : create(r))}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(undefined)}
        title={`¿Eliminar la regla "${toDelete?.name}"?`}
        onConfirm={() => toDelete && remove(toDelete.id)}
      />
    </div>
    </>
  );
}
