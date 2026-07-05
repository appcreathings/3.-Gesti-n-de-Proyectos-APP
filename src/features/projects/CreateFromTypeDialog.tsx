import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useDataStore } from "@/store/useDataStore";
import { ROUTES } from "@/routes/paths";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function CreateFromTypeDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const types = useDataStore((s) => s.projectTypes);
  const products = useDataStore((s) => s.products);
  const createProjectFromType = useDataStore((s) => s.createProjectFromType);

  const [typeId, setTypeId] = useState("");
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");

  useEffect(() => {
    if (open) {
      setTypeId(types[0]?.id ?? "");
      setName("");
      setProductId("");
    }
  }, [open, types]);

  const selectedType = types.find((t) => t.id === typeId);

  async function submit() {
    if (!typeId || !name.trim()) return;
    const id = await createProjectFromType(typeId, name.trim(), productId || null);
    onOpenChange(false);
    if (id) navigate(ROUTES.project(id));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear proyecto desde tipo</DialogTitle>
          <DialogDescription>
            Se generarán automáticamente las áreas, checklists y procesos del tipo elegido.
          </DialogDescription>
        </DialogHeader>

        {types.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Aún no hay tipos de proyecto. Crea uno en Biblioteca → Tipos de Proyecto.
          </p>
        ) : (
          <DialogBody>
            <div className="grid gap-2">
              <Label htmlFor="cf-type">Tipo de proyecto</Label>
              <Select id="cf-type" value={typeId} onChange={(e) => setTypeId(e.target.value)}>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              {selectedType && (
                <p className="text-xs text-muted-foreground">
                  {selectedType.defaultAreas.length} áreas se crearán:{" "}
                  {selectedType.defaultAreas.map((a) => a.name).join(", ") || "—"}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cf-name">Nombre del proyecto</Label>
              <Input
                id="cf-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del nuevo proyecto"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cf-product">Producto</Label>
              <Select
                id="cf-product"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">— Sin producto —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          </DialogBody>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!typeId || !name.trim()}>
            Crear proyecto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
