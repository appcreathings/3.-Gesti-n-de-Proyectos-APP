import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WipLimits } from "@/domain/schemas";

interface Props {
  open: boolean;
  wipLimits: WipLimits;
  onSave: (limits: WipLimits) => void;
  onClose: () => void;
}

export function WipLimitConfig({ open, wipLimits, onSave, onClose }: Props) {
  const [todo, setTodo] = useState(wipLimits.todo?.toString() ?? "");
  const [doing, setDoing] = useState(wipLimits.doing?.toString() ?? "");
  const [blocked, setBlocked] = useState(wipLimits.blocked?.toString() ?? "");
  const [done, setDone] = useState(wipLimits.done?.toString() ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      todo: todo === "" ? null : parseInt(todo, 10),
      doing: doing === "" ? null : parseInt(doing, 10),
      blocked: blocked === "" ? null : parseInt(blocked, 10),
      done: done === "" ? null : parseInt(done, 10),
    });
    onClose();
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
        aria-label="Configurar WIP limits"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md rounded-2xl border border-border/70 bg-background shadow-lg">
          <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
            <h2 className="text-lg font-semibold">WIP Limits</h2>
            <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Define límites de trabajo en curso por columna. Deja vacío para sin límite.
            </p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="wip-todo">Por hacer</Label>
                <Input
                  id="wip-todo"
                  type="number"
                  min="0"
                  value={todo}
                  onChange={(e) => setTodo(e.target.value)}
                  placeholder="Sin límite"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wip-doing">En curso</Label>
                <Input
                  id="wip-doing"
                  type="number"
                  min="0"
                  value={doing}
                  onChange={(e) => setDoing(e.target.value)}
                  placeholder="Sin límite"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wip-blocked">Bloqueada</Label>
                <Input
                  id="wip-blocked"
                  type="number"
                  min="0"
                  value={blocked}
                  onChange={(e) => setBlocked(e.target.value)}
                  placeholder="Sin límite"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wip-done">Hecha</Label>
                <Input
                  id="wip-done"
                  type="number"
                  min="0"
                  value={done}
                  onChange={(e) => setDone(e.target.value)}
                  placeholder="Sin límite"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
