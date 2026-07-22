import { useState, type RefObject } from "react";
import { Braces, CornerDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { AvailableVariable } from "./variables";
import { insertTokenAt } from "./insertToken";

interface Props {
  variables: AvailableVariable[];
  /** Input/textarea al que se le inserta el token — se usa para conocer la
   * posición del cursor y devolverle el foco después de insertar. */
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement>;
  value: string;
  onChange: (nextValue: string) => void;
}

/** Formatos ofrecidos en el submenú "con formato" (spec 027 §G) — el usuario
 * no tiene que conocer la sintaxis `{{campo|mod}}` para descubrir los mods. */
const FORMAT_OPTIONS: { label: string; mod: string }[] = [
  { label: "Fecha (YYYY-MM-DD)", mod: "date" },
  { label: "Número (2 decimales)", mod: "number:2" },
  { label: "Número (sin decimales)", mod: "number:0" },
  { label: "MAYÚSCULAS", mod: "upper" },
  { label: "minúsculas", mod: "lower" },
];

/** Menú `{{ }}` que inserta un token de variable en la posición del cursor
 * del input asociado (spec 023 §C) — reemplaza tener que escribir
 * `{{campo}}` a ciegas. Cada variable se inserta tal cual con un clic, o
 * "con formato" desde su submenú (spec 027 §G: `{{campo|date}}`, etc.). No
 * se renderiza si no hay variables disponibles todavía (trigger sin probar). */
export function VariablePicker({ variables, inputRef, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  // Campo escrito a mano (spec 036 §C4 / CA-05.2) — para nombres que no están
  // en la lista todavía (típico: una columna de Sheets antes de probar la
  // conexión). Por eso el picker ya NO se oculta cuando `variables` está
  // vacío: escribir el propio campo es justamente el caso que faltaba.
  const [custom, setCustom] = useState("");

  function insert(field: string, mod?: string) {
    const el = inputRef.current;
    const { value: next, cursor } = insertTokenAt(value, field, el, mod);
    onChange(next);
    setOpen(false);
    setCustom("");

    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(cursor, cursor);
    });
  }

  function insertCustom() {
    const field = custom.trim();
    if (field) insert(field);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          title="Insertar variable"
        >
          <Braces className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-64 w-72 overflow-auto">
        {variables.map((v) => (
          <DropdownMenuSub key={v.field}>
            <DropdownMenuSubTrigger>
              {/* El clic en la fila inserta tal cual (comportamiento previo);
                  el hover/flecha abre el submenú de formatos. */}
              <button
                type="button"
                className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  insert(v.field);
                }}
              >
                <span className="font-mono text-xs">{`{{${v.field}}}`}</span>
                {v.example && (
                  <span className="max-w-full truncate text-[10px] text-muted-foreground">{v.example}</span>
                )}
              </button>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => insert(v.field)}>
                <span className="font-mono text-xs">{`{{${v.field}}}`}</span>
                <span className="ml-2 text-xs text-muted-foreground">tal cual</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {FORMAT_OPTIONS.map((f) => (
                <DropdownMenuItem key={f.mod} onClick={() => insert(v.field, f.mod)}>
                  <span className="text-xs">{f.label}</span>
                  <span className="ml-2 font-mono text-[10px] text-muted-foreground">{`{{${v.field}|${f.mod}}}`}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}

        {variables.length > 0 && <DropdownMenuSeparator />}

        {/* CA-05.2: escribir un campo que no está en la lista. Va en un div
            plano (no `DropdownMenuItem`) para que el menú no se cierre al
            teclear; el `stopPropagation` evita que las flechas/letras las
            capture la navegación por typeahead del menú de Radix. */}
        <div
          className="p-1"
          onKeyDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1">
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  insertCustom();
                }
              }}
              placeholder="escribir campo…"
              aria-label="Escribir un campo propio"
              className="h-8 flex-1 text-xs"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 shrink-0"
              onClick={insertCustom}
              disabled={custom.trim() === ""}
              title={custom.trim() ? `Insertar {{${custom.trim()}}}` : "Escribe un nombre de campo"}
              aria-label="Insertar el campo escrito"
            >
              <CornerDownLeft className="size-3.5" />
            </Button>
          </div>
          <p className="px-1 pt-1 text-[10px] text-muted-foreground">
            Se inserta como <code className="font-mono">{"{{campo}}"}</code>
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
