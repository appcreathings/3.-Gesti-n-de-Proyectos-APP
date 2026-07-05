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
import { PersonSelect } from "@/components/forms/PersonSelect";
import { productStatusLabel } from "@/domain/labels";
import type { Product, ProductStatus } from "@/domain/schemas";
import { newProduct } from "@/domain/factories";
import { useDataStore } from "@/store/useDataStore";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product?: Product;
  onSubmit: (p: Product) => void;
}

export function ProductFormDialog({ open, onOpenChange, product, onSubmit }: Props) {
  const people = useDataStore((s) => s.people);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [vision, setVision] = useState("");
  const [status, setStatus] = useState<ProductStatus>("active");
  const [ownerId, setOwnerId] = useState("");

  useEffect(() => {
    if (open) {
      setName(product?.name ?? "");
      setDescription(product?.description ?? "");
      setVision(product?.vision ?? "");
      setStatus(product?.status ?? "active");
      setOwnerId(product?.ownerId ?? "");
    }
  }, [open, product]);

  function submit() {
    if (!name.trim()) return;
    const base = product ?? newProduct(name);
    onSubmit({
      ...base,
      name: name.trim(),
      description,
      vision,
      status,
      ownerId: ownerId || null,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="p-name">Nombre</Label>
            <Input
              id="p-name"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Nombre del producto"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-vision">Visión</Label>
            <Textarea
              id="p-vision"
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              placeholder="¿Qué busca lograr este producto?"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-desc">Descripción</Label>
            <Textarea
              id="p-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="p-status">Estado</Label>
              <Select
                id="p-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
              >
                {Object.entries(productStatusLabel).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-owner">Responsable</Label>
              <PersonSelect
                id="p-owner"
                value={ownerId}
                onChange={setOwnerId}
                people={people}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            {product ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
