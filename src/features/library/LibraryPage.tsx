import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Boxes,
  ListChecks,
  FileText,
  LayoutGrid,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { EntityCard } from "@/components/EntityCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LibraryOrderLegend } from "@/components/HierarchyLegend";
import { useDataStore } from "@/store/useDataStore";
import type {
  ChecklistTemplate,
  ProcessTemplate,
  ProjectType,
} from "@/domain/schemas";
import { ChecklistTemplateDialog } from "./ChecklistTemplateDialog";
import { ProcessTemplateDialog } from "./ProcessTemplateDialog";
import { ProjectTypeDialog } from "./ProjectTypeDialog";
import { ROUTES } from "@/routes/paths";

export function LibraryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "checklists";

  return (
    <div>
      <PageHeader
        title="Biblioteca"
        description="Define plantillas y tipos reutilizables. Empieza por las plantillas, luego los tipos."
      />
      {/* Order legend — always visible so the user understands the flow */}
      <div className="mb-5">
        <LibraryOrderLegend />
      </div>
      <Tabs
        value={activeTab}
        onValueChange={(tab) => navigate(ROUTES.library(tab), { replace: true })}
      >
        {/* Tabs ordered by dependency: checklist templates → process templates → types */}
        <TabsList>
          <TabsTrigger value="checklists">① Plantillas de Checklist</TabsTrigger>
          <TabsTrigger value="processes">② Plantillas de Proceso</TabsTrigger>
          <TabsTrigger value="types">③ Tipos de Proyecto</TabsTrigger>
        </TabsList>
        <TabsContent value="checklists">
          <ChecklistTemplatesTab />
        </TabsContent>
        <TabsContent value="processes">
          <ProcessTemplatesTab />
        </TabsContent>
        <TabsContent value="types">
          <TypesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Plantillas de Checklist (Paso 1) ---------- */
function ChecklistTemplatesTab() {
  const templates = useDataStore((s) => s.checklistTemplates);
  const create = useDataStore((s) => s.createChecklistTemplate);
  const update = useDataStore((s) => s.updateChecklistTemplate);
  const remove = useDataStore((s) => s.deleteChecklistTemplate);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ChecklistTemplate | undefined>();
  const [toDelete, setToDelete] = useState<ChecklistTemplate | undefined>();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Bloques reutilizables de checklists. Úsalos en Tipos o aplícalos directamente a áreas.
        </p>
        <Button
          onClick={() => {
            setEditing(undefined);
            setOpen(true);
          }}
        >
          <Plus className="size-4" />
          Nueva plantilla
        </Button>
      </div>
      {templates.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Sin plantillas de checklist"
          description="Crea tu primera plantilla (p. ej. 'QA Release', 'Onboarding cliente') para instanciarla en cualquier área."
          action={
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus className="size-4" />
              Crear primera plantilla
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <EntityCard
                key={t.id}
                title={t.name}
                meta={t.category && <Badge variant="secondary">{t.category}</Badge>}
                onEdit={() => {
                  setEditing(t);
                  setOpen(true);
                }}
                onDelete={() => setToDelete(t)}
              >
                <p className="text-sm text-muted-foreground">
                  {t.items.length} {t.items.length === 1 ? "ítem" : "ítems"}
                </p>
              </EntityCard>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
            Con plantillas listas, ahora puedes asociarlas a un{" "}
            <Link to={ROUTES.library("types")} className="inline-flex items-center gap-0.5 text-primary hover:underline">
              Tipo de Proyecto <ArrowRight className="size-3" />
            </Link>
          </p>
        </>
      )}

      <ChecklistTemplateDialog
        open={open}
        onOpenChange={setOpen}
        template={editing}
        onSubmit={(t) => (editing ? update(t) : create(t))}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(undefined)}
        title={`¿Eliminar la plantilla "${toDelete?.name}"?`}
        onConfirm={() => toDelete && remove(toDelete.id)}
      />
    </div>
  );
}

/* ---------- Plantillas de Proceso (Paso 2) ---------- */
function ProcessTemplatesTab() {
  const templates = useDataStore((s) => s.processTemplates);
  const create = useDataStore((s) => s.createProcessTemplate);
  const update = useDataStore((s) => s.updateProcessTemplate);
  const remove = useDataStore((s) => s.deleteProcessTemplate);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProcessTemplate | undefined>();
  const [toDelete, setToDelete] = useState<ProcessTemplate | undefined>();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          SOPs reutilizables con pasos. Asociálos a las áreas de un Tipo de Proyecto.
        </p>
        <Button
          onClick={() => {
            setEditing(undefined);
            setOpen(true);
          }}
        >
          <Plus className="size-4" />
          Nueva plantilla
        </Button>
      </div>
      {templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin plantillas de proceso"
          description="Documenta SOPs reutilizables que podrás asociar a las áreas de un tipo de proyecto."
          action={
            <Button
              onClick={() => {
                setEditing(undefined);
                setOpen(true);
              }}
            >
              <Plus className="size-4" />
              Crear primer proceso
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <EntityCard
                key={t.id}
                title={t.name}
                meta={t.category && <Badge variant="secondary">{t.category}</Badge>}
                onEdit={() => {
                  setEditing(t);
                  setOpen(true);
                }}
                onDelete={() => setToDelete(t)}
              >
                <p className="text-sm text-muted-foreground">
                  {t.steps.length} {t.steps.length === 1 ? "paso" : "pasos"}
                </p>
              </EntityCard>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
            Con procesos listos, asócialos a un{" "}
            <Link to={ROUTES.library("types")} className="inline-flex items-center gap-0.5 text-primary hover:underline">
              Tipo de Proyecto <ArrowRight className="size-3" />
            </Link>
          </p>
        </>
      )}

      <ProcessTemplateDialog
        open={open}
        onOpenChange={setOpen}
        template={editing}
        onSubmit={(t) => (editing ? update(t) : create(t))}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(undefined)}
        title={`¿Eliminar la plantilla "${toDelete?.name}"?`}
        onConfirm={() => toDelete && remove(toDelete.id)}
      />
    </div>
  );
}

/* ---------- Tipos de Proyecto (Paso 3) ---------- */
function TypesTab() {
  const types = useDataStore((s) => s.projectTypes);
  const checklistTemplates = useDataStore((s) => s.checklistTemplates);
  const processTemplates = useDataStore((s) => s.processTemplates);
  const create = useDataStore((s) => s.createProjectType);
  const update = useDataStore((s) => s.updateProjectType);
  const remove = useDataStore((s) => s.deleteProjectType);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectType | undefined>();
  const [toDelete, setToDelete] = useState<ProjectType | undefined>();

  const hasTemplates = checklistTemplates.length > 0 || processTemplates.length > 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Blueprints de proyectos con áreas y plantillas por defecto.
          {!hasTemplates && (
            <span className="ml-1 text-warning">
              Crea plantillas de checklist o proceso primero para poder asociarlas aquí.
            </span>
          )}
        </p>
        <Button
          onClick={() => {
            setEditing(undefined);
            setOpen(true);
          }}
        >
          <Plus className="size-4" />
          Nuevo tipo
        </Button>
      </div>
      {types.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Sin tipos de proyecto"
          description="Un tipo define áreas y plantillas por defecto. Al crear un proyecto desde un tipo, todo se genera automáticamente."
          action={
            !hasTemplates ? (
              <Link to={ROUTES.library("checklists")}>
                <Button variant="outline">
                  Crear plantilla de checklist primero
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
            ) : (
              <Button
                onClick={() => {
                  setEditing(undefined);
                  setOpen(true);
                }}
              >
                <Plus className="size-4" />
                Crear primer tipo
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {types.map((t) => (
              <EntityCard
                key={t.id}
                title={t.name}
                onEdit={() => {
                  setEditing(t);
                  setOpen(true);
                }}
                onDelete={() => setToDelete(t)}
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LayoutGrid className="size-4" />
                  {t.defaultAreas.length} {t.defaultAreas.length === 1 ? "área" : "áreas"}
                </div>
                {t.defaultAreas.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.defaultAreas.map((a, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">
                        {a.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </EntityCard>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
            Tipos listos. Ahora ve a{" "}
            <Link to={ROUTES.projects} className="inline-flex items-center gap-0.5 text-primary hover:underline">
              Proyectos → "Desde tipo" <ArrowRight className="size-3" />
            </Link>{" "}
            para crear tu primer proyecto con estructura.
          </p>
        </>
      )}

      <ProjectTypeDialog
        open={open}
        onOpenChange={setOpen}
        type={editing}
        checklistTemplates={checklistTemplates}
        processTemplates={processTemplates}
        onSubmit={(t) => (editing ? update(t) : create(t))}
      />
      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(undefined)}
        title={`¿Eliminar el tipo "${toDelete?.name}"?`}
        description="Los proyectos ya creados desde este tipo no se modifican."
        onConfirm={() => toDelete && remove(toDelete.id)}
      />
    </div>
  );
}
