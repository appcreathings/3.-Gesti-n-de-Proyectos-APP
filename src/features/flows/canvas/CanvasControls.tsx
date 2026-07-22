import { useState } from "react";
import { Panel, useReactFlow } from "@xyflow/react";
import { Plus, Minus, Maximize, Maximize2, Minimize2, Undo2, Redo2, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShortcutsDialog } from "./ShortcutsDialog";

interface Props {
  /** Modo maximizado (overlay `fixed inset-0`) — controlado por `CanvasInner`
   * (spec 036 §A1). */
  maximized: boolean;
  onToggleMaximize: () => void;
  /** Historial del canvas (spec 038 §C4, CA-02.2): el deshacer no puede
   * existir solo como atajo oculto. */
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Operación concreta que deshará/rehará el botón, para el `title`. */
  undoLabel?: string;
  redoLabel?: string;
}

/** Cluster de controles del canvas con el sistema de diseño de la app
 * (spec 036 §A2): acercar, alejar, ajustar a pantalla y maximizar/restaurar.
 * Reemplaza el `<Controls>` por defecto de React Flow (que trae su propio CSS
 * y desentona en claro/oscuro). Usa `useReactFlow` — válido porque cuelga del
 * `ReactFlowProvider`. Objetivos táctiles de 36px (≥ 32px, Principio IV). */
export function CanvasControls({
  maximized,
  onToggleMaximize,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
}: Props) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  return (
    <Panel position="bottom-left" className="m-4 flex flex-col gap-2">
      {/* Historial (spec 038 §C4). Cluster propio: es otra familia de acciones
          que la de encuadre, y su estado deshabilitado tiene que leerse. */}
      <div className="flex overflow-hidden rounded-md border border-border bg-background shadow-sm">
        <ControlButton
          label={canUndo ? `Deshacer: ${undoLabel}` : "Deshacer (nada que deshacer)"}
          onClick={onUndo}
          disabled={!canUndo}
        >
          <Undo2 className="size-4" />
        </ControlButton>
        <ControlButton
          label={canRedo ? `Rehacer: ${redoLabel}` : "Rehacer (nada que rehacer)"}
          onClick={onRedo}
          disabled={!canRedo}
          className="border-l border-border"
        >
          <Redo2 className="size-4" />
        </ControlButton>
      </div>

      <div className="flex flex-col overflow-hidden rounded-md border border-border bg-background shadow-sm">
        <ControlButton label="Acercar" onClick={() => zoomIn({ duration: 150 })}>
          <Plus className="size-4" />
        </ControlButton>
        <ControlButton label="Alejar" onClick={() => zoomOut({ duration: 150 })} className="border-t border-border">
          <Minus className="size-4" />
        </ControlButton>
        <ControlButton
          label="Ajustar a pantalla"
          onClick={() => fitView({ duration: 200 })}
          className="border-t border-border"
        >
          <Maximize className="size-4" />
        </ControlButton>
        <ControlButton
          label={maximized ? "Restaurar tamaño" : "Maximizar"}
          onClick={onToggleMaximize}
          className="border-t border-border"
        >
          {maximized ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </ControlButton>
        <ControlButton
          label="Atajos de teclado"
          onClick={() => setShortcutsOpen(true)}
          className="border-t border-border"
        >
          <Keyboard className="size-4" />
        </ControlButton>
      </div>

      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </Panel>
  );
}

function ControlButton({
  label,
  onClick,
  className,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}
