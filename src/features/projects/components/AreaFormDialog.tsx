import { useEffect, useState } from "react";
import { AiImproveButton } from "@/components/ai/AiImproveButton";
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
import { PersonSelect } from "@/components/forms/PersonSelect";
import { IconPicker } from "@/components/forms/IconPicker";
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
      <DialogContent className="md:max-w-lg sm:h-auto sm:min-h-[65vh] md:h-auto md:min-h-[65vh] lg:h-auto lg:min-h-[65vh]">
        <DialogHeader>
          <DialogTitle>{area ? "Editar área" : "Nueva área"}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="grid gap-2">
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
          <div className="grid gap-2">
            <Label>Icono</Label>
            <IconPicker icons={AREA_ICONS} value={icon} onChange={setIcon} />
          </div>
          {people.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="ar-owner">Responsable del área</Label>
              <PersonSelect
                id="ar-owner"
                value={ownerId}
                onChange={setOwnerId}
                people={people}
              />
            </div>
          )}
          <AiImproveButton
            entityType="area"
            fields={{ name, icon, ownerId }}
            onApply={(field, value) => {
              switch (field) {
                case "name":
                  setName(value as string);
                  break;
                case "icon":
                  setIcon(value as string);
                  break;
                case "ownerId":
                  setOwnerId(value as string);
                  break;
              }
            }}
          />
        </DialogBody>
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
