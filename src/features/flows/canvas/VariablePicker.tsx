import { useState, type RefObject } from "react";
import { Braces } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

/** Menú `{{ }}` que inserta un token de variable en la posición del cursor
 * del input asociado (spec 023 §C) — reemplaza tener que escribir
 * `{{campo}}` a ciegas. No se renderiza si no hay variables disponibles
 * todavía (trigger sin probar). */
export function VariablePicker({ variables, inputRef, value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  if (variables.length === 0) return null;

  function insert(field: string) {
    const token = `{{${field}}}`;
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
      <DropdownMenuContent align="end" className="max-h-64 w-64 overflow-auto">
        {variables.map((v) => (
          <DropdownMenuItem
            key={v.field}
            onClick={() => insert(v.field)}
            className="flex flex-col items-start gap-0.5"
          >
            <span className="font-mono text-xs">{`{{${v.field}}}`}</span>
            {v.example && <span className="truncate text-[10px] text-muted-foreground">{v.example}</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
