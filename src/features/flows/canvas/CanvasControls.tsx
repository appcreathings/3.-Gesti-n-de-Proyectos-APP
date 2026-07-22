import { Panel, useReactFlow } from "@xyflow/react";
import { Plus, Minus, Maximize, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Modo maximizado (overlay `fixed inset-0`) — controlado por `CanvasInner`
   * (spec 036 §A1). */
  maximized: boolean;
  onToggleMaximize: () => void;
}

/** Cluster de controles del canvas con el sistema de diseño de la app
 * (spec 036 §A2): acercar, alejar, ajustar a pantalla y maximizar/restaurar.
 * Reemplaza el `<Controls>` por defecto de React Flow (que trae su propio CSS
 * y desentona en claro/oscuro). Usa `useReactFlow` — válido porque cuelga del
 * `ReactFlowProvider`. Objetivos táctiles de 36px (≥ 32px, Principio IV). */
export function CanvasControls({ maximized, onToggleMaximize }: Props) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <Panel position="bottom-left" className="m-4">
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
      </div>
    </Panel>
  );
}

function ControlButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        className,
      )}
    >
      {children}
    </button>
  );
}
