import { useState, type RefObject } from "react";
import { Braces } from "lucide-react";
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
import type { AvailableVariable } from "./variables";

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

  if (variables.length === 0) return null;

  function insert(field: string, mod?: string) {
    const token = mod ? `{{${field}|${mod}}}` : `{{${field}}}`;
    const el = inputRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    onChange(next);
    setOpen(false);

    const cursorPos = start + token.length;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(cursorPos, cursorPos);
    });
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
