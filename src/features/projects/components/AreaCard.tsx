import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Layers,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Markdown } from "@/components/Markdown";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { areaIcon } from "@/lib/icons";
import { areaProgress } from "@/domain/compute";
import { newChecklist, newTask } from "@/domain/factories";
import {
  instantiateChecklistFromTemplate,
  instantiateProcessFromTemplate,
} from "@/domain/instantiate";
import * as ops from "@/domain/projectOps";
import { useDataStore } from "@/store/useDataStore";
import type { Area, ChecklistItem, Person, Process, Project, Task } from "@/domain/schemas";
import { ProcessEditorDialog } from "./ProcessEditorDialog";
import { ChecklistSection } from "./ChecklistSection";
import { ApplyTemplateDialog } from "./ApplyTemplateDialog";

interface Props {
  area: Area;
  people: Person[];
  mutate: (recipe: (p: Project) => Project) => void;
  onEdit: () => void;
  onRemove: () => void;
  /** Tasks belonging to this area (for the hierarchy counters and link to Kanban). */
  tasks: Task[];
  /** Item id to highlight (from deep-link ?focus=). */
  focusId?: string;
  /** Drag handle rendered in the header when the card lives in a sortable list. */
  dragHandle?: React.ReactNode;
}

export function AreaCard({
  area,
  people,
  mutate,
  onEdit,
  onRemove,
  tasks,
  focusId,
  dragHandle,
}: Props) {
  const Icon = areaIcon(area.icon);
  const prog = areaProgress(area);
  const tasksDone = tasks.filter((t) => t.status === "done").length;
  const checklistTemplates = useDataStore((s) => s.checklistTemplates);
  const processTemplates = useDataStore((s) => s.processTemplates);
  const [procDialog, setProcDialog] = useState<{ open: boolean; proc?: Process }>({
    open: false,
  });
  const [applyDialog, setApplyDialog] = useState<{ open: boolean; kind: "checklist" | "process" }>({
    open: false,
    kind: "checklist",
  });
  const [expandedProc, setExpandedProc] = useState<string | null>(null);
  const [newChecklistName, setNewChecklistName] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [procToRemove, setProcToRemove] = useState<Process | undefined>();

  function saveProcess(proc: Process) {
    if (area.processes.some((p) => p.id === proc.id)) {
      mutate((p) => ops.updateProcess(p, area.id, proc));
    } else {
      mutate((p) => ops.addProcess(p, area.id, proc));
    }
  }

  function addChecklist() {
    if (!newChecklistName.trim()) return;
    mutate((p) => ops.addChecklist(p, area.id, newChecklist(newChecklistName.trim())));
    setNewChecklistName("");
  }

  function convertItemToTask(clId: string, item: ChecklistItem) {
    const task = newTask(item.text, area.id);
    task.dueDate = item.dueDate;
    task.assigneeId = item.assigneeId;
    mutate((p) => {
      const withTask = ops.addTask(p, { ...task, sourceItemId: item.id });
      return ops.updateItem(withTask, area.id, clId, {
        ...item,
        linkedTaskId: task.id,
      });
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2.5">
          {dragHandle}
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{area.name}</h3>
              <Badge variant={prog.pct === 100 ? "success" : "secondary"}>
                {prog.done}/{prog.total}
              </Badge>
              {area.completed && (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="size-3" /> Completa
                </Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <FileText className="size-3" />
                {area.processes.length} {area.processes.length === 1 ? "proceso" : "procesos"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Layers className="size-3" />
                {area.checklists.length} {area.checklists.length === 1 ? "checklist" : "checklists"}
              </span>
              {tasks.length > 0 ? (
                <Link
                  to={`?tab=tasks&area=${area.id}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <ListChecks className="size-3" />
                  {tasksDone}/{tasks.length} tareas
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <ListChecks className="size-3" />
                  Sin tareas
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            title={area.completed ? "Marcar como no completa" : "Marcar área completa"}
            onClick={() =>
              mutate((p) =>
                ops.updateArea(p, { ...area, completed: !area.completed }),
              )
            }
          >
            {area.completed ? (
              <CheckCircle2 className="size-4 text-success" />
            ) : (
              <Circle className="size-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setConfirmRemove(true)}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Procesos */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Procesos (SOPs)
            </h4>
            <div className="flex gap-1">
              {processTemplates.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setApplyDialog({ open: true, kind: "process" })}
                >
                  <Layers className="size-4" />
                  Plantilla
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setProcDialog({ open: true })}
              >
                <Plus className="size-4" />
                Proceso
              </Button>
            </div>
          </div>
          {area.processes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Sin procesos documentados"
              description="Documenta el primer SOP de esta área."
              action={
                <Button size="sm" onClick={() => setProcDialog({ open: true })}>
                  <Plus className="size-4" />
                  Agregar proceso
                </Button>
              }
              className="py-8"
            />
          ) : (
            <div className="space-y-2">
              {area.processes.map((proc) => {
                const open = expandedProc === proc.id;
                return (
                  <div key={proc.id} className="rounded-lg border">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <button
                        className="flex flex-1 items-center gap-2 text-left text-sm font-medium"
                        onClick={() => setExpandedProc(open ? null : proc.id)}
                      >
                        {open ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                        <FileText className="size-4 text-muted-foreground" />
                        {proc.name}
                        <Badge variant="outline" className="text-[10px]">
                          v{proc.version}
                        </Badge>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setProcDialog({ open: true, proc })}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => setProcToRemove(proc)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                    {open && (
                      <div className="border-t px-3 py-3">
                        <Markdown>{proc.description}</Markdown>
                        {proc.steps.length > 0 && (
                          <ol className="mt-3 space-y-1">
                            {proc.steps.map((s, i) => (
                              <li key={s.id} className="flex gap-2 text-sm">
                                <span className="text-muted-foreground">{i + 1}.</span>
                                <span>{s.text}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Checklists */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Checklists
            </h4>
            {checklistTemplates.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setApplyDialog({ open: true, kind: "checklist" })}
              >
                <Layers className="size-4" />
                Plantilla
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {area.checklists.map((cl) => (
              <ChecklistSection
                key={cl.id}
                checklist={cl}
                people={people}
                focusId={focusId}
                onAddItem={(item) =>
                  mutate((p) => ops.addItem(p, area.id, cl.id, item))
                }
                onUpdateItem={(item) =>
                  mutate((p) => ops.updateItem(p, area.id, cl.id, item))
                }
                onRemoveItem={(itemId) =>
                  mutate((p) => ops.removeItem(p, area.id, cl.id, itemId))
                }
                onRemove={() => mutate((p) => ops.removeChecklist(p, area.id, cl.id))}
                onConvertItemToTask={(item) => convertItemToTask(cl.id, item)}
                onReorderItems={(ids) =>
                  mutate((p) => ops.reorderChecklistItems(p, area.id, cl.id, ids))
                }
              />
            ))}
            <div className="flex gap-2">
              <Input
                value={newChecklistName}
                onChange={(e) => setNewChecklistName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addChecklist()}
                placeholder="Nombre del nuevo checklist…"
                className="h-9"
              />
              <Button
                size="sm"
                variant="secondary"
                className="h-9"
                onClick={addChecklist}
              >
                <Plus className="size-4" />
                Checklist
              </Button>
            </div>
          </div>
        </section>
      </CardContent>

      <ProcessEditorDialog
        open={procDialog.open}
        onOpenChange={(o) => setProcDialog((s) => ({ ...s, open: o }))}
        process={procDialog.proc}
        people={people}
        onSubmit={saveProcess}
      />

      <ApplyTemplateDialog
        open={applyDialog.open}
        onOpenChange={(o) => setApplyDialog((s) => ({ ...s, open: o }))}
        kind={applyDialog.kind}
        onApplyChecklist={(templateId) => {
          const tpl = checklistTemplates.find((t) => t.id === templateId);
          if (!tpl) return;
          const cl = instantiateChecklistFromTemplate(tpl);
          mutate((p) => ops.applyChecklistToArea(p, area.id, cl));
        }}
        onApplyProcess={(templateId) => {
          const tpl = processTemplates.find((t) => t.id === templateId);
          if (!tpl) return;
          const proc = instantiateProcessFromTemplate(tpl);
          mutate((p) => ops.applyProcessToArea(p, area.id, proc));
        }}
      />

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`¿Eliminar el área "${area.name}"?`}
        description="Se eliminarán sus procesos y checklists."
        onConfirm={onRemove}
      />
      <ConfirmDialog
        open={!!procToRemove}
        onOpenChange={(o) => !o && setProcToRemove(undefined)}
        title={`¿Eliminar el proceso "${procToRemove?.name}"?`}
        onConfirm={() =>
          procToRemove &&
          mutate((p) => ops.removeProcess(p, area.id, procToRemove.id))
        }
      />
    </Card>
  );
}
