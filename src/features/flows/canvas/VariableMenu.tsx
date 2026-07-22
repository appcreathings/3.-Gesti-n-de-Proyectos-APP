import { useState, type ReactNode } from "react";
import { Braces } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { VariableRow } from "./variables";

export interface VariableMenuOption {
  /** Etiqueta visible de la sub-opción. */
  label: string;
  /** Pista a la derecha: qué va a quedar al elegirla. **La escribe el
   * llamador** — la carcasa no sabe qué se inserta. */
  hint?: string;
  /** Valor opaco para la carcasa; sólo lo interpreta el `onPick` del llamador. */
  value: string;
}

interface Props {
  /** Las mismas filas que el panel de Variables: campo + tipo + ejemplo +
   * presencia (CA-05.1). */
  rows: VariableRow[];
  /** Submenú por variable. Devolver `[]` deja el menú en un solo nivel. */
  options: (row: VariableRow) => VariableMenuOption[];
  /** `option` ausente = "tal cual". Qué significa eso lo decide el llamador. */
  onPick: (field: string, option?: VariableMenuOption) => void;
  /** Etiqueta del ítem "tal cual" del submenú (ej. "tal cual", "igual a"). */
  plainLabel?: string;
  /** Pista del ítem "tal cual": qué quedará al elegirlo. La escribe el
   * llamador, por la misma razón que `hint`. */
  plainHint?: (row: VariableRow) => string;
  title: string;
  ariaLabel: string;
  /** Contenido del botón disparador — por defecto el icono `{}`. */
  icon?: ReactNode;
  /** Texto cuando no hay ninguna variable conocida todavía. */
  emptyText?: string;
}

/**
 * Carcasa compartida por los dos selectores de variable del editor (spec 039
 * §D1, HU-05): la misma lista, el mismo aspecto y el mismo gesto de dos
 * niveles en una condición y en una acción.
 *
 * **La carcasa NO construye texto.** No sabe qué es un `{{}}` ni un operador:
 * recibe filas, pinta el menú y devuelve `(field, option?)`. Quien decide qué
 * se inserta es cada llamador — token `{{campo}}` en las acciones, path crudo
 * en las condiciones.
 *
 * Esa separación es el punto (R4). 037 arregló un bug que nació justamente de
 * fusionar las dos semánticas: el picker de condiciones reusaba el de acciones,
 * insertaba `{{campo}}` y después le quitaba las llaves con un regex `\w`-only,
 * así que "Nombre Cliente" quedaba **con llaves** dentro de `condition.field` y
 * la condición no se cumplía jamás. Si esta carcasa aprende a poner llaves,
 * vuelve ese bug.
 */
export function VariableMenu({
  rows,
  options,
  onPick,
  plainLabel = "tal cual",
  plainHint,
  title,
  ariaLabel,
  icon,
  emptyText = "Todavía no hay campos conocidos. Prueba la conexión en el nodo Trigger.",
}: Props) {
  const [open, setOpen] = useState(false);

  function pick(field: string, option?: VariableMenuOption) {
    onPick(field, option);
    setOpen(false);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          title={title}
          aria-label={ariaLabel}
        >
          {icon ?? <Braces className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-64 w-72 overflow-auto">
        {rows.length === 0 && (
          <p className="px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">{emptyText}</p>
        )}
        {rows.map((row) => {
          const subOptions = options(row);
          if (subOptions.length === 0) {
            return (
              <DropdownMenuItem key={row.field} onClick={() => pick(row.field)}>
                <RowSummary row={row} />
              </DropdownMenuItem>
            );
          }
          return (
            <DropdownMenuSub key={row.field}>
              <DropdownMenuSubTrigger>
                {/* El clic en la fila elige "tal cual"; el hover/flecha abre el
                    submenú. Dos niveles con un solo gesto de entrada. */}
                <button
                  type="button"
                  className="flex min-w-0 flex-1 text-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    pick(row.field);
                  }}
                >
                  <RowSummary row={row} />
                </button>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-64 overflow-auto">
                <DropdownMenuItem onClick={() => pick(row.field)}>
                  <span className="text-xs">{plainLabel}</span>
                  {plainHint && (
                    <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                      {plainHint(row)}
                    </span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {subOptions.map((o) => (
                  <DropdownMenuItem key={o.value} onClick={() => pick(row.field, o)}>
                    <span className="text-xs">{o.label}</span>
                    {o.hint && (
                      <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                        {o.hint}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Fila con el mismo contenido y el mismo orden en las dos superficies
 * (CA-05.1): nombre, tipo y valor de ejemplo. */
function RowSummary({ row }: { row: VariableRow }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
      <div className="flex w-full min-w-0 items-center gap-1">
        <span className="min-w-0 flex-1 truncate font-mono text-xs">{row.field}</span>
        {row.type && (
          <Badge variant="outline" className="shrink-0 px-1 py-0 text-[9px] uppercase">
            {row.type}
          </Badge>
        )}
      </div>
      {row.example && (
        <span className="max-w-full truncate text-[10px] text-muted-foreground">{row.example}</span>
      )}
    </div>
  );
}
