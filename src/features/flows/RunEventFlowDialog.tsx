import { useEffect, useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { EntitySelect } from "@/components/forms/EntitySelect";
import { useDataStore } from "@/store/useDataStore";
import { triggerLabel } from "@/domain/labels";
import type { DomainEvent } from "@/automations/events";
import type { FlowRule } from "@/domain/schemas/flow";
import { EVENT_SEED_REQUIREMENTS, buildSyntheticEvent } from "@/flows/synthetic-event";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Debe tener `trigger.type === "event"`. */
  flow: FlowRule;
  onRun: (syntheticEvent: DomainEvent) => void;
}

/**
 * "Ejecutar ahora" para un flujo disparado por evento (spec 022 §C): el
 * usuario elige una entidad real (proyecto, y tarea/área/checklist/ítem si
 * el tipo de evento lo requiere) para simular el evento sobre ella. Los
 * campos extra del evento (`from`/`to`, etc.) se completan solos con el
 * valor actual — decisión de v1, evita un formulario distinto por cada uno
 * de los 11 tipos de evento.
 */
export function RunEventFlowDialog({ open, onOpenChange, flow, onRun }: Props) {
  const projects = useDataStore((s) => s.projects);
  const trigger = flow.trigger;
  const eventType = trigger.type === "event" ? trigger.event : null;
  const seedKind = eventType ? EVENT_SEED_REQUIREMENTS[eventType] : "none";

  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [checklistId, setChecklistId] = useState("");
  const [itemId, setItemId] = useState("");

  useEffect(() => {
    if (!open) return;
    setProjectId("");
    setTaskId("");
    setAreaId("");
    setChecklistId("");
    setItemId("");
  }, [open]);

  if (!eventType) return null;

  const project = projects.find((p) => p.id === projectId);
  const task = project?.tasks.find((t) => t.id === taskId);
  const area = project?.areas.find((a) => a.id === areaId);
  const checklist = area?.checklists.find((c) => c.id === checklistId);
  const item = checklist?.items.find((i) => i.id === itemId);

  const canConfirm = Boolean(
    project &&
      (seedKind === "none" ||
        (seedKind === "task" && task) ||
        (seedKind === "area" && area) ||
        (seedKind === "checklist" && area && checklist) ||
        (seedKind === "item" && area && checklist && item))
  );

  const handleConfirm = () => {
    if (!project || !canConfirm) return;
    const event = buildSyntheticEvent(eventType, { project, task, area, checklist, item });
    onRun(event);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-lg">
        <DialogHeader>
          <DialogTitle>¿Ejecutar "{flow.name}" ahora?</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Elige sobre qué entidad simular el evento "{triggerLabel[eventType] ?? eventType}".
              Esto aplica las acciones configuradas de verdad — puede crear tareas o proyectos, y
              enviar emails o webhooks. No es una simulación.
            </p>

            <div className="grid gap-2">
              <Label>Proyecto</Label>
              <EntitySelect
                value={projectId}
                onChange={(id) => {
                  setProjectId(id);
                  setTaskId("");
                  setAreaId("");
                  setChecklistId("");
                  setItemId("");
                }}
                options={projects.map((p) => ({ id: p.id, name: p.name }))}
                required
              />
            </div>

            {seedKind === "task" && project && (
              <div className="grid gap-2">
                <Label>Tarea</Label>
                {project.tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Este proyecto no tiene tareas.</p>
                ) : (
                  <EntitySelect
                    value={taskId}
                    onChange={setTaskId}
                    options={project.tasks.map((t) => ({ id: t.id, name: t.title }))}
                    required
                  />
                )}
              </div>
            )}

            {(seedKind === "area" || seedKind === "checklist" || seedKind === "item") && project && (
              <div className="grid gap-2">
                <Label>Área</Label>
                {project.areas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Este proyecto no tiene áreas.</p>
                ) : (
                  <EntitySelect
                    value={areaId}
                    onChange={(id) => {
                      setAreaId(id);
                      setChecklistId("");
                      setItemId("");
                    }}
                    options={project.areas.map((a) => ({ id: a.id, name: a.name }))}
                    required
                  />
                )}
              </div>
            )}

            {(seedKind === "checklist" || seedKind === "item") && area && (
              <div className="grid gap-2">
                <Label>Checklist</Label>
                {area.checklists.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Esta área no tiene checklists.</p>
                ) : (
                  <EntitySelect
                    value={checklistId}
                    onChange={(id) => {
                      setChecklistId(id);
                      setItemId("");
                    }}
                    options={area.checklists.map((c) => ({ id: c.id, name: c.name }))}
                    required
                  />
                )}
              </div>
            )}

            {seedKind === "item" && checklist && (
              <div className="grid gap-2">
                <Label>Ítem</Label>
                {checklist.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Este checklist no tiene ítems.</p>
                ) : (
                  <EntitySelect
                    value={itemId}
                    onChange={setItemId}
                    options={checklist.items.map((i) => ({ id: i.id, name: i.text }))}
                    required
                  />
                )}
              </div>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            Ejecutar ahora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
