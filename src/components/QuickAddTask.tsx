import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useDataStore } from "@/store/useDataStore";
import { useNavigate } from "react-router-dom";
import * as ops from "@/domain/projectOps";
import { newTask } from "@/domain/factories";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function QuickAddTask({ open, onClose }: Props) {
  const projects = useDataStore((s) => s.projects);
  const mutateProject = useDataStore((s) => s.mutateProject);
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");

  const selectedProject = projects.find((p) => p.id === projectId);
  const areas = selectedProject?.areas ?? [];

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setTitle("");
      setProjectId(projects[0]?.id ?? "");
      setAreaId("");
      setPriority("medium");
    }
  }, [open, projects]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    const task = { ...newTask(title.trim(), areaId || null), priority };

    mutateProject(projectId, (p) => ops.addTask(p, task));
    onClose();
    navigate(`/app/projects/${projectId}?detail=${task.id}`);
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Crear tarea rápida"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-2xl border border-border/70 bg-background shadow-lg">
          <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
            <h2 className="text-lg font-semibold">Nueva tarea</h2>
            <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="qa-title">Título</Label>
              <Input
                id="qa-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Diseñar landing page"
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa-project">Proyecto</Label>
              <Select
                id="qa-project"
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setAreaId("");
                }}
                required
              >
                <option value="">Seleccionar proyecto...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            {areas.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="qa-area">Área (opcional)</Label>
                <Select
                  id="qa-area"
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                >
                  <option value="">Sin área</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="qa-priority">Prioridad</Label>
              <Select
                id="qa-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as "high" | "medium" | "low")}
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!title.trim() || !projectId}>
                Crear y editar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
