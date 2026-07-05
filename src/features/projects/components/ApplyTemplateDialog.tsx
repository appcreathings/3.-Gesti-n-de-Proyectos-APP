import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDataStore } from "@/store/useDataStore";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Kind being applied — controls which templates are shown. */
  kind: "checklist" | "process";
  onApplyChecklist?: (templateId: string) => void;
  onApplyProcess?: (templateId: string) => void;
}

/**
 * Dialog to pick a checklist or process template and apply it to an area.
 * Uses the TemplatePicker chip pattern from ProjectTypeDialog.
 */
export function ApplyTemplateDialog({
  open,
  onOpenChange,
  kind,
  onApplyChecklist,
  onApplyProcess,
}: Props) {
  const checklistTemplates = useDataStore((s) => s.checklistTemplates);
  const processTemplates = useDataStore((s) => s.processTemplates);
  const [selected, setSelected] = useState<string>("");

  const options =
    kind === "checklist"
      ? checklistTemplates.map((t) => ({ id: t.id, name: t.name }))
      : processTemplates.map((t) => ({ id: t.id, name: t.name }));

  const emptyMsg =
    kind === "checklist"
      ? "No hay plantillas de checklist. Créalas en Biblioteca → Plantillas de Checklist."
      : "No hay plantillas de proceso. Créalas en Biblioteca → Plantillas de Proceso.";

  const title =
    kind === "checklist" ? "Aplicar plantilla de checklist" : "Aplicar plantilla de proceso";

  function apply() {
    if (!selected) return;
    if (kind === "checklist") onApplyChecklist?.(selected);
    else onApplyProcess?.(selected);
    setSelected("");
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setSelected("");
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Se instanciará la plantilla seleccionada y se añadirá al área.
          </DialogDescription>
        </DialogHeader>

        {options.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{emptyMsg}</p>
        ) : (
          <div className="flex flex-wrap gap-2 py-2">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelected(o.id === selected ? "" : o.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  o.id === selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-accent",
                )}
              >
                {o.name}
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={apply} disabled={!selected}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
