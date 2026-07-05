import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react";
import { AiImproveButton } from "@/components/ai/AiImproveButton";
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
import { EntitySelect } from "@/components/forms/EntitySelect";
import { PersonSelect, MultiPersonSelect } from "@/components/forms/PersonSelect";
import { DateFieldPreview, DateRangeSummary } from "@/components/forms/DateFieldPreview";
import { priorityLabel, projectStatusLabel } from "@/domain/labels";
import type { Priority, Project, ProjectStatus, Stakeholder } from "@/domain/schemas";
import { newProject } from "@/domain/factories";
import { useDataStore } from "@/store/useDataStore";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  project?: Project;
  defaultProductId?: string | null;
  onSubmit: (p: Project) => void;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  defaultProductId = null,
  onSubmit,
}: Props) {
  const products = useDataStore((s) => s.products);
  const projectTypes = useDataStore((s) => s.projectTypes);
  const people = useDataStore((s) => s.people);
  const quarters = useDataStore((s) => s.quarters);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [productId, setProductId] = useState<string>("");
  const [typeId, setTypeId] = useState<string>("");
  const [quarterId, setQuarterId] = useState<string>("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (open) {
      setName(project?.name ?? "");
      setDescription(project?.description ?? "");
      setProductId(project?.productId ?? defaultProductId ?? "");
      setTypeId(project?.typeId ?? "");
      setQuarterId(project?.quarterId ?? "");
      setStatus(project?.status ?? "active");
      setPriority(project?.priority ?? "medium");
      setDueDate(project?.dueDate ?? "");
      setStartDate(project?.startDate ?? "");
      setOwnerId(project?.ownerId ?? "");
      setStakeholders(project?.stakeholders ?? []);
      setShowAdvanced(!!project);
    }
  }, [open, project, defaultProductId]);

  function submit() {
    if (!name.trim()) return;
    const base = project ?? newProject(name);
    onSubmit({
      ...base,
      name: name.trim(),
      description,
      productId: productId || null,
      typeId: typeId || null,
      quarterId: quarterId || null,
      status,
      priority,
      dueDate: dueDate || null,
      startDate: startDate || null,
      ownerId: ownerId || null,
      stakeholders,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{project ? "Editar proyecto" : "Nuevo proyecto"}</DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">
          {/* ── Nombre siempre visible ── */}
          <div className="grid gap-1.5">
            <Label htmlFor="pr-name">Nombre</Label>
            <Input
              id="pr-name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !showAdvanced) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Nombre del proyecto"
            />
          </div>

          {/* ── Producto: siempre visible (contexto esencial) ── */}
          <div className="grid gap-1.5">
            <Label htmlFor="pr-product">Producto</Label>
            <EntitySelect
              id="pr-product"
              value={productId}
              onChange={setProductId}
              options={products}
              placeholder="— Sin producto —"
            />
          </div>

          {/* ── Toggle Más opciones ── */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-fit justify-start px-2 text-muted-foreground hover:text-foreground"
          >
            {showAdvanced ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
            <SlidersHorizontal className="size-3.5" />
            {showAdvanced ? "Menos opciones" : "Más opciones"}
          </Button>

          {showAdvanced && (
            <>
              {/* Tipo de proyecto (permite cambiar el tipo) */}
              {projectTypes.length > 0 && (
                <div className="grid gap-1.5">
                  <Label htmlFor="pr-type">Tipo de proyecto</Label>
                  <EntitySelect
                    id="pr-type"
                    value={typeId}
                    onChange={setTypeId}
                    options={projectTypes}
                    placeholder="— Sin tipo —"
                  />
                  {typeId && !project && (
                    <p className="text-xs text-muted-foreground">
                      Tip: para generar áreas automáticamente desde un tipo, usa "Crear desde
                      tipo" en la lista de proyectos.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="pr-status">Estado</Label>
                  <Select
                    id="pr-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  >
                    {Object.entries(projectStatusLabel).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="pr-priority">Prioridad</Label>
                  <Select
                    id="pr-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                  >
                    {Object.entries(priorityLabel).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </div>
                {quarters.length > 0 && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="pr-quarter">Trimestre</Label>
                    <EntitySelect
                      id="pr-quarter"
                      value={quarterId}
                      onChange={setQuarterId}
                      options={quarters}
                      placeholder="— Sin trimestre —"
                    />
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label htmlFor="pr-start">Fecha de inicio</Label>
                  <DateFieldPreview id="pr-start" value={startDate} onChange={setStartDate} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="pr-due">Fecha límite</Label>
                  <DateFieldPreview id="pr-due" value={dueDate} onChange={setDueDate} />
                </div>
              </div>
              <DateRangeSummary start={startDate} end={dueDate} />

              <div className="grid gap-1.5">
                <Label htmlFor="pr-owner">Responsable principal</Label>
                <PersonSelect
                  id="pr-owner"
                  value={ownerId}
                  onChange={setOwnerId}
                  people={people}
                />
              </div>

              {people.length > 0 && (
                <div className="grid gap-1.5">
                  <Label>Equipo (RACI)</Label>
                  <MultiPersonSelect
                    people={people}
                    value={stakeholders}
                    onChange={setStakeholders}
                  />
                </div>
              )}

              <div className="grid gap-1.5">
                <Label htmlFor="pr-desc">Descripción</Label>
                <Textarea
                  id="pr-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </>
          )}
          <AiImproveButton
            entityType="project"
            fields={{
              name,
              description,
              status,
              priority,
              startDate,
              dueDate,
              ownerId,
              stakeholders,
            }}
            onApply={(field, value) => {
              switch (field) {
                case "name":
                  setName(value as string);
                  break;
                case "description":
                  setDescription(value as string);
                  break;
                case "status":
                  setStatus(value as ProjectStatus);
                  break;
                case "priority":
                  setPriority(value as Priority);
                  break;
                case "startDate":
                  setStartDate(value as string);
                  break;
                case "dueDate":
                  setDueDate(value as string);
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
            {project ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
