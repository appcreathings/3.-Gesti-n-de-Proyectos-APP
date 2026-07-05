import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AREA_ICONS } from "@/features/projects/components/AreaFormDialog";
import type {
  ChecklistTemplate,
  DefaultArea,
  ProcessTemplate,
  ProjectType,
} from "@/domain/schemas";
import { newProjectType } from "@/domain/factories";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  type?: ProjectType;
  checklistTemplates: ChecklistTemplate[];
  processTemplates: ProcessTemplate[];
  onSubmit: (t: ProjectType) => void;
}

export function ProjectTypeDialog({
  open,
  onOpenChange,
  type,
  checklistTemplates,
  processTemplates,
  onSubmit,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [areas, setAreas] = useState<DefaultArea[]>([]);

  useEffect(() => {
    if (open) {
      setName(type?.name ?? "");
      setDescription(type?.description ?? "");
      setAreas(type?.defaultAreas ?? []);
    }
  }, [open, type]);

  function addArea() {
    setAreas((s) => [
      ...s,
      { name: "", icon: "folder", checklistTemplateIds: [], processTemplateIds: [] },
    ]);
  }
  function patchArea(idx: number, patch: Partial<DefaultArea>) {
    setAreas((s) => s.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  }
  function toggle(idx: number, key: "checklistTemplateIds" | "processTemplateIds", id: string) {
    setAreas((s) =>
      s.map((a, i) => {
        if (i !== idx) return a;
        const has = a[key].includes(id);
        return {
          ...a,
          [key]: has ? a[key].filter((x) => x !== id) : [...a[key], id],
        };
      }),
    );
  }

  function submit() {
    if (!name.trim()) return;
    const base = type ?? newProjectType(name);
    onSubmit({
      ...base,
      name: name.trim(),
      description,
      defaultAreas: areas.filter((a) => a.name.trim()),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {type ? "Editar tipo de proyecto" : "Nuevo tipo de proyecto"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[64vh] gap-4 overflow-y-auto pr-1">
          <div className="grid gap-1.5">
            <Label htmlFor="ty-name">Nombre</Label>
            <Input
              id="ty-name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="p. ej. Proyecto de Software"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ty-desc">Descripción</Label>
            <Textarea
              id="ty-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Áreas por defecto</Label>
              <Button variant="ghost" size="sm" onClick={addArea}>
                <Plus className="size-4" />
                Añadir área
              </Button>
            </div>
            {areas.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Sin áreas. Define áreas y asóciales plantillas para que se generen al
                crear un proyecto de este tipo.
              </p>
            )}
            <div className="space-y-3">
              {areas.map((area, idx) => (
                <div key={idx} className="rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Select
                      value={area.icon}
                      onChange={(e) => patchArea(idx, { icon: e.target.value })}
                      className="h-9 w-full sm:w-32"
                    >
                      {AREA_ICONS.map((i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </Select>
                    <Input
                      value={area.name}
                      onChange={(e) => patchArea(idx, { name: e.target.value })}
                      placeholder="Nombre del área"
                      className="h-9"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      onClick={() => setAreas((s) => s.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  <TemplatePicker
                    title="Checklists por defecto"
                    empty="No hay plantillas de checklist. Créalas en la pestaña Checklists."
                    options={checklistTemplates}
                    selected={area.checklistTemplateIds}
                    onToggle={(id) => toggle(idx, "checklistTemplateIds", id)}
                  />
                  <TemplatePicker
                    title="Procesos por defecto"
                    empty="No hay plantillas de proceso."
                    options={processTemplates}
                    selected={area.processTemplateIds}
                    onToggle={(id) => toggle(idx, "processTemplateIds", id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            {type ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplatePicker({
  title,
  empty,
  options,
  selected,
  onToggle,
}: {
  title: string;
  empty: string;
  options: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{title}</p>
      {options.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => {
            const on = selected.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onToggle(o.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  on
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-accent",
                )}
              >
                {o.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
