import { useEffect, useState } from "react";
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
import { DateFieldPreview, DateRangeSummary } from "@/components/forms/DateFieldPreview";
import { quarterStatusLabel } from "@/domain/labels";
import { newQuarter } from "@/domain/factories";
import type { Quarter, QuarterStatus } from "@/domain/schemas";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  quarter?: Quarter;
  onSubmit: (q: Quarter) => void;
}

export function QuarterFormDialog({ open, onOpenChange, quarter, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<QuarterStatus>("planned");

  useEffect(() => {
    if (open) {
      setName(quarter?.name ?? "");
      setGoal(quarter?.goal ?? "");
      setStartDate(quarter?.startDate ?? "");
      setEndDate(quarter?.endDate ?? "");
      setStatus(quarter?.status ?? "planned");
    }
  }, [open, quarter]);

  function submit() {
    if (!name.trim()) return;
    const base = quarter ?? newQuarter(name);
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{quarter ? "Editar trimestre" : "Nuevo trimestre"}</DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">
          <div className="grid gap-1.5">
            <Label htmlFor="q-name">Nombre</Label>
            <Input
              id="q-name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="Q3 2026"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="q-start">Fecha de inicio</Label>
              <DateFieldPreview id="q-start" value={startDate} onChange={setStartDate} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="q-end">Fecha de fin</Label>
              <DateFieldPreview id="q-end" value={endDate} onChange={setEndDate} />
            </div>
          </div>
          <DateRangeSummary start={startDate} end={endDate} />
          <div className="grid gap-1.5">
            <Label htmlFor="q-status">Estado</Label>
            <Select
              id="q-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as QuarterStatus)}
            >
              {Object.entries(quarterStatusLabel).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="q-goal">Meta</Label>
            <Textarea
              id="q-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="¿Qué queremos lograr este trimestre?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            {quarter ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
