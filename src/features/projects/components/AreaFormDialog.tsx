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
import { Select } from "@/components/ui/select";
import { PersonSelect } from "@/components/forms/PersonSelect";
import { areaIcon } from "@/lib/icons";
import type { Area, Person } from "@/domain/schemas";
import { newArea } from "@/domain/factories";

export const AREA_ICONS = [
  "folder",
  "code",
  "palette",
  "megaphone",
  "scale",
  "wallet",
  "settings",
  "users",
  "shield",
  "truck",
] as const;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  area?: Area;
  people?: Person[];
  onSubmit: (a: Area) => void;
}

export function AreaFormDialog({ open, onOpenChange, area, people = [], onSubmit }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>("folder");
  const [ownerId, setOwnerId] = useState("");

  useEffect(() => {
    if (open) {
      setName(area?.name ?? "");
      setIcon(area?.icon ?? "folder");
      setOwnerId(area?.ownerId ?? "");
    }
  }, [open, area]);

  function submit() {
    if (!name.trim()) return;
    const base = area ?? newArea(name, icon);
    onSubmit({ ...base, name: name.trim(), icon, ownerId: ownerId || null });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{area ? "Editar área" : "Nueva área"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="ar-name">Nombre</Label>
            <Input
              id="ar-name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="p. ej. Desarrollo, Diseño, Legal"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ar-icon">Icono</Label>
            {/* Show icon preview alongside the text name */}
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = areaIcon(icon);
                return <Icon className="size-4 shrink-0 text-muted-foreground" />;
              })()}
              <Select id="ar-icon" value={icon} onChange={(e) => setIcon(e.target.value)}>
                {AREA_ICONS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {people.length > 0 && (
            <div className="grid gap-1.5">
              <Label htmlFor="ar-owner">Responsable del área</Label>
              <PersonSelect
                id="ar-owner"
                value={ownerId}
                onChange={setOwnerId}
                people={people}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            {area ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
