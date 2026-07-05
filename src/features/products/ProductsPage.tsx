import { useState } from "react";
import { Link } from "react-router-dom";
import { Package, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { EntityCard } from "@/components/EntityCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProductFormDialog } from "./ProductFormDialog";
import { useDataStore } from "@/store/useDataStore";
import { productStatusLabel } from "@/domain/labels";
import { ROUTES } from "@/routes/paths";
import type { Product } from "@/domain/schemas";

export function ProductsPage() {
  const products = useDataStore((s) => s.products);
  const projects = useDataStore((s) => s.projects);
  const createProduct = useDataStore((s) => s.createProduct);
  const updateProduct = useDataStore((s) => s.updateProduct);
  const deleteProduct = useDataStore((s) => s.deleteProduct);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | undefined>();
  const [toDelete, setToDelete] = useState<Product | undefined>();

  function openNew() {
    setEditing(undefined);
    setFormOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setFormOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Productos"
        description="Líneas de negocio que agrupan tus proyectos."
        actions={
          <Button onClick={openNew}>
            <Plus className="size-4" />
            Nuevo producto
          </Button>
        }
      />

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aún no hay productos"
          description="Crea un producto para agrupar proyectos relacionados (p. ej. una línea de negocio o una app)."
          action={
            <Button onClick={openNew}>
              <Plus className="size-4" />
              Nuevo producto
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const count = projects.filter((pr) => pr.productId === p.id).length;
            return (
              <EntityCard
                key={p.id}
                title={p.name}
                meta={<Badge variant="secondary">{productStatusLabel[p.status]}</Badge>}
                onEdit={() => openEdit(p)}
                onDelete={() => setToDelete(p)}
              >
                {p.vision && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{p.vision}</p>
                )}
                {count > 0 ? (
                  <Link
                    to={ROUTES.projectsByProduct(p.id)}
                    className="mt-3 block text-xs text-primary hover:underline"
                  >
                    {count} {count === 1 ? "proyecto" : "proyectos"} →
                  </Link>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">Sin proyectos aún.</p>
                )}
              </EntityCard>
            );
          })}
        </div>
      )}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        onSubmit={(p) => (editing ? updateProduct(p) : createProduct(p))}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(undefined)}
        title={`¿Eliminar "${toDelete?.name}"?`}
        description="Los proyectos asociados no se borrarán; quedarán sin producto."
        onConfirm={() => toDelete && deleteProduct(toDelete.id)}
      />
    </div>
  );
}
