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

interface Shortcut {
  keys: string[];
  description: string;
}

/** Lo que el canvas realmente acepta (spec 038 §E4, CA-05.3) — hasta ahora
 * cada atajo vivía en el `title` de un botón, en un comentario, o en ningún
 * lado. `Ctrl+S` se incluye aunque lo maneje el builder: para el usuario es un
 * atajo del editor, no de un componente. */
const SHORTCUTS: { group: string; items: Shortcut[] }[] = [
  {
    group: "Editar",
    items: [
      { keys: ["Ctrl", "Z"], description: "Deshacer el último cambio del canvas" },
      { keys: ["Ctrl", "Shift", "Z"], description: "Rehacer (también Ctrl + Y)" },
      { keys: ["Ctrl", "D"], description: "Duplicar los nodos seleccionados" },
      { keys: ["Supr"], description: "Borrar los nodos seleccionados (retroceso también)" },
      { keys: ["Ctrl", "S"], description: "Guardar sin salir del editor" },
    ],
  },
  {
    group: "Seleccionar y mover",
    items: [
      { keys: ["Shift", "clic"], description: "Sumar o quitar un nodo de la selección" },
      { keys: ["Shift", "arrastrar"], description: "Seleccionar varios nodos con un recuadro" },
      { keys: ["Esc"], description: "Cerrar el panel de configuración o salir de pantalla completa" },
    ],
  },
];

/** Tabla de atajos del canvas. Se abre desde el botón `?` de `CanvasControls`;
 * navegable por teclado y anunciable como cualquier `Dialog` de la app. */
export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-md sm:h-auto md:h-auto lg:h-auto">
        <DialogHeader>
          <DialogTitle>Atajos del canvas</DialogTitle>
          <DialogDescription>
            El deshacer cubre los nodos del flujo. El nombre, las etiquetas y la política de fallo
            se revierten a mano.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {SHORTCUTS.map((section) => (
              <section key={section.group}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.group}
                </h4>
                <ul className="space-y-1.5">
                  {section.items.map((item) => (
                    <li key={item.description} className="flex items-start justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{item.description}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {item.keys.map((key) => (
                          <kbd
                            key={key}
                            className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium"
                          >
                            {key}
                          </kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
