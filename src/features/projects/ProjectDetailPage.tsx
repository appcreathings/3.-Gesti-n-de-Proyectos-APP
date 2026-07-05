import { useCallback, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useDataStore } from "@/store/useDataStore";
import {
  projectStatusLabel,
  projectStatusVariant,
} from "@/domain/labels";
import type { Health, Project } from "@/domain/schemas";
import { ProjectFormDialog } from "./ProjectFormDialog";
import { OverviewTab } from "./components/OverviewTab";
import { AreasTab } from "./components/AreasTab";
import { TasksTab } from "./components/TasksTab";
import { ProjectAutomationsTab } from "./components/ProjectAutomationsTab";
import { ActivityTab } from "./components/ActivityTab";

export function ProjectDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const project = useDataStore((s) => s.projects.find((p) => p.id === id));
  const products = useDataStore((s) => s.products);
  const people = useDataStore((s) => s.people);
  const activity = useDataStore((s) => s.activity);
  const saveProject = useDataStore((s) => s.saveProject);
  const mutateProject = useDataStore((s) => s.mutateProject);
  const deleteProject = useDataStore((s) => s.deleteProject);

  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "overview";
  const focusId = searchParams.get("focus") ?? undefined;

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const mutate = useCallback(
    (recipe: (p: Project) => Project) => void mutateProject(id, recipe),
    [id, mutateProject],
  );

  if (!project) {
    return (
      <EmptyState
        icon={ArrowLeft}
        title="Proyecto no encontrado"
        description="Puede que haya sido eliminado."
        action={
          <Button onClick={() => navigate("/projects")}>
            Volver a proyectos
          </Button>
        }
      />
    );
  }

  const productName = products.find((p) => p.id === project.productId)?.name;

  return (
    <div>
      <PageHeader
        breadcrumb={[
          { label: "Proyectos", href: "/projects" },
          ...(productName
            ? [{ label: productName, href: `/projects?product=${project.productId}` }]
            : []),
          { label: project.name },
        ]}
        title={project.name}
        badge={
          <Badge variant={projectStatusVariant[project.status]}>
            {projectStatusLabel[project.status]}
          </Badge>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              Editar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" />
              Eliminar
            </Button>
          </>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(tab) => {
          navigate(`/projects/${id}?tab=${tab}`, { replace: true });
        }}
      >
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="areas">Áreas</TabsTrigger>
          <TabsTrigger value="tasks">Tareas</TabsTrigger>
          <TabsTrigger value="automations">Automatizaciones</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            project={project}
            productName={productName}
            productId={project.productId}
            onChangeHealth={(h: Health) =>
              saveProject({ ...project, health: h })
            }
          />
        </TabsContent>
        <TabsContent value="areas">
          <AreasTab project={project} people={people} mutate={mutate} focusId={focusId} />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksTab project={project} people={people} mutate={mutate} focusId={focusId} />
        </TabsContent>
        <TabsContent value="automations">
          <ProjectAutomationsTab project={project} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab projectId={project.id} entries={activity} />
        </TabsContent>
      </Tabs>

      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        onSubmit={(p) => saveProject({ ...project, ...p })}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`¿Eliminar "${project.name}"?`}
        description="Se eliminará el proyecto y todo su contenido (áreas, procesos, checklists y tareas)."
        onConfirm={() => {
          void deleteProject(project.id);
          navigate("/projects");
        }}
      />
    </div>
  );
}
