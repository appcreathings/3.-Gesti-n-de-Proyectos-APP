import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { FolderKanban, Plus, Boxes } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { EntityCard } from "@/components/EntityCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ProjectFormDialog } from "./ProjectFormDialog";
import { CreateFromTypeDialog } from "./CreateFromTypeDialog";
import { useDataStore } from "@/store/useDataStore";
import {
  priorityLabel,
  priorityVariant,
  projectStatusLabel,
  projectStatusVariant,
} from "@/domain/labels";
import { projectChecklistProgress } from "@/domain/compute";
import { ROUTES } from "@/routes/paths";

export function ProjectsPage() {
  return (
    <>
      <Helmet>
        <title>Proyectos | Hito</title>
        <meta name="description" content="Gestiona proyectos con áreas, procesos, checklists y tareas en Hito." />
      </Helmet>
      <ProjectsContent />
    </>
  );
}

function ProjectsContent() {
  const projects = useDataStore((s) => s.projects);
  const products = useDataStore((s) => s.products);
  const createProject = useDataStore((s) => s.createProject);

  const [searchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [fromTypeOpen, setFromTypeOpen] = useState(false);
  const [productFilter, setProductFilter] = useState(searchParams.get("product") ?? "");
  const [statusFilter, setStatusFilter] = useState("");

  // Sync productFilter when URL param changes (e.g. clicking product link)
  useEffect(() => {
    const param = searchParams.get("product") ?? "";
    setProductFilter(param);
  }, [searchParams]);

  const filtered = useMemo(
    () =>
      projects.filter(
        (p) =>
          (!productFilter || p.productId === productFilter) &&
          (!statusFilter || p.status === statusFilter),
      ),
    [projects, productFilter, statusFilter],
  );

  const productName = (id: string | null) =>
    products.find((p) => p.id === id)?.name;

  return (
    <div>
      <PageHeader
        title="Proyectos"
        description="Esfuerzos con áreas, procesos, checklists y tareas."
        actions={
          <>
            <Button variant="outline" onClick={() => setFromTypeOpen(true)}>
              <Boxes className="size-4" />
              Desde tipo
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              Nuevo proyecto
            </Button>
          </>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Aún no hay proyectos"
          description="Crea tu primer proyecto. Luego podrás documentar áreas, procesos y checklists, y gestionar tareas."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              Nuevo proyecto
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-3">
            <Select
              className="w-full sm:w-48"
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
            >
              <option value="">Todos los productos</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <Select
              className="w-full sm:w-48"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos los estados</option>
              {Object.entries(projectStatusLabel).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => {
              const prog = projectChecklistProgress(p);
              return (
                <EntityCard
                  key={p.id}
                  href={ROUTES.project(p.id)}
                  title={p.name}
                  meta={
                    <>
                      <Badge variant={projectStatusVariant[p.status]}>
                        {projectStatusLabel[p.status]}
                      </Badge>
                      {productName(p.productId) && (
                        <span className="text-xs text-muted-foreground">
                          {productName(p.productId)}
                        </span>
                      )}
                      <Badge variant={priorityVariant[p.priority]}>
                        {priorityLabel[p.priority]}
                      </Badge>
                    </>
                  }
                >
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Checklists</span>
                      <span>
                        {prog.done}/{prog.total} · {prog.pct}%
                      </span>
                    </div>
                    <Progress value={prog.pct} />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {p.areas.length} {p.areas.length === 1 ? "área" : "áreas"} · {p.tasks.length}{" "}
                    {p.tasks.length === 1 ? "tarea" : "tareas"}
                  </p>
                </EntityCard>
              );
            })}
          </div>
        </>
      )}

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={(p) => createProject(p)}
      />
      <CreateFromTypeDialog open={fromTypeOpen} onOpenChange={setFromTypeOpen} />
    </div>
  );
}
