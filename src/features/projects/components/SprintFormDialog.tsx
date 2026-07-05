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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { DateFieldPreview, DateRangeSummary } from "@/components/forms/DateFieldPreview";
import { sprintStatusLabel } from "@/domain/labels";
import { newSprint } from "@/domain/factories";
import type { Sprint, SprintStatus } from "@/domain/schemas";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sprint?: Sprint;
  onSubmit: (s: Sprint) => void;
}

export function SprintFormDialog({ open, onOpenChange, sprint, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<SprintStatus>("planned");

  useEffect(() => {
    if (open) {
      setName(sprint?.name ?? "");
      setGoal(sprint?.goal ?? "");
      setStartDate(sprint?.startDate ?? "");
      setEndDate(sprint?.endDate ?? "");
      setStatus(sprint?.status ?? "planned");
    }
  }, [open, sprint]);

  function submit() {
    if (!name.trim()) return;
    const base = sprint ?? newSprint(name);
    onSubmit({
      ...base,
      name: name.trim(),
      goal,
      startDate: startDate || null,
      endDate: endDate || null,
      status,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{sprint ? "Editar sprint" : "Nuevo sprint"}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-2">
            <Label htmlFor="sp-name">Nombre</Label>
            <Input
              id="sp-name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="Sprint 7"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="sp-start">Fecha de inicio</Label>
              <DateFieldPreview id="sp-start" value={startDate} onChange={setStartDate} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sp-end">Fecha de fin</Label>
              <DateFieldPreview id="sp-end" value={endDate} onChange={setEndDate} />
            </div>
          </div>
          <DateRangeSummary start={startDate} end={endDate} />
          <div className="grid gap-2">
            <Label htmlFor="sp-status">Estado</Label>
            <Select
              id="sp-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as SprintStatus)}
            >
              {Object.entries(sprintStatusLabel).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sp-goal">Meta</Label>
            <Textarea
              id="sp-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="¿Qué queremos lograr en este sprint?"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            {sprint ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
