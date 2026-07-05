import { useEffect, useId, useRef, useState, type InputHTMLAttributes } from "react";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { daysBetween, formatDay, formatRange, relativeDay, todayKey } from "@/lib/dates";

interface DateFieldPreviewProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
  /** Days out still considered "próxima" — shown in the warning tone. */
  warnWithinDays?: number;
}

const DISPLAY_FORMATTER = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Convertir `YYYY-MM-DD` a `Date` local (sin desplazamiento de zona horaria). */
function parseDayKey(key: string): Date | undefined {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || Number.isNaN(m) || Number.isNaN(d)) return undefined;
  return new Date(y, m - 1, d);
}

/** Convertir `Date` local a `YYYY-MM-DD`. */
function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Formatear `YYYY-MM-DD` como texto editable "DD/MM/AAAA". */
function formatDisplay(key: string): string {
  const date = parseDayKey(key);
  return date ? DISPLAY_FORMATTER.format(date) : key;
}

/**
 * Intentar parsear textos como "DD/MM/AAAA", "DD-MM-AAAA", "DD.MM.AAAA",
 * "AAAA-MM-DD" o variantes con día/mes de un dígito. Devuelve `YYYY-MM-DD`
 * si es válida, o `null` si no.
 */
function parseDisplay(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return "";

  // Formato ISO ya conocido
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-").map(Number);
    const date = new Date(y, (m ?? 1) - 1, d ?? 1);
    if (date.getFullYear() === y && date.getMonth() === (m ?? 1) - 1 && date.getDate() === (d ?? 1)) {
      return toDayKey(date);
    }
    return null;
  }

  // Separadores comunes: / - .
  const match = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (match) {
    const d = Number(match[1]);
    const m = Number(match[2]);
    const y = Number(match[3]);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
      return toDayKey(date);
    }
  }

  return null;
}

/**
 * Date picker con input editable + calendario emergente.
 * Mantiene el contrato de emitir `YYYY-MM-DD` en `onChange` y conserva la
 * línea de preview debajo del campo.
 */
export function DateFieldPreview({
  value,
  onChange,
  warnWithinDays = 3,
  className,
  id,
  disabled,
  ...props
}: DateFieldPreviewProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState(() => formatDisplay(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar el texto visible cuando el valor cambia desde fuera
  useEffect(() => {
    setInputText(formatDisplay(value));
  }, [value]);

  function handleInputChange(raw: string) {
    setInputText(raw);
    const parsed = parseDisplay(raw);
    if (parsed !== null && parsed !== value) {
      onChange(parsed);
    }
  }

  function handleInputBlur() {
    // Al perder foco, si el texto no es válido, revertir al último valor conocido
    if (inputText.trim() && parseDisplay(inputText) === null) {
      setInputText(formatDisplay(value));
    }
  }

  function handleCalendarSelect(date: Date | undefined) {
    if (date) {
      onChange(toDayKey(date));
    }
    setOpen(false);
  }

  function clearDate() {
    onChange("");
    inputRef.current?.focus();
  }

  const selectedDate = value ? parseDayKey(value) : undefined;

  return (
    <div className="grid gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative">
          <Input
            {...props}
            id={inputId}
            ref={inputRef}
            type="text"
            inputMode="numeric"
            placeholder="dd/mm/aaaa"
            disabled={disabled}
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleInputBlur}
            className={cn("pr-10", className)}
            aria-describedby={value ? `${inputId}-preview` : undefined}
          />
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              className="absolute right-0 top-0 z-10 h-10 w-10 rounded-l-none p-0 text-foreground/80 hover:text-foreground"
              aria-label="Abrir calendario"
            >
              <CalendarIcon className="size-4" />
            </Button>
          </PopoverTrigger>
        </div>
        <PopoverContent className="w-auto p-0" align="start" onClick={(e) => e.stopPropagation()}>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleCalendarSelect}
            defaultMonth={selectedDate}
          />
          {value && (
            <div className="border-t border-border p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={clearDate}
              >
                Limpiar fecha
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {value && (
        <p id={`${inputId}-preview`} className={previewTone(value, warnWithinDays)}>
          {formatDay(value)} · {relativeDay(value)}
        </p>
      )}
    </div>
  );
}

function previewTone(value: string, warnWithinDays: number) {
  const diff = daysBetween(todayKey(new Date()), value);
  const tone =
    diff < 0 ? "text-destructive" : diff <= warnWithinDays ? "text-warning" : "text-muted-foreground";
  return cn("text-xs", tone);
}

/**
 * Presentational summary for a start/end date pair — pairs with two separate
 * `DateFieldPreview` inputs to show the combined range and duration
 * ("1–14 jul 2026 · 14 días"), or a warning when the end precedes the start.
 */
export function DateRangeSummary({
  start,
  end,
  className,
}: {
  start: string;
  end: string;
  className?: string;
}) {
  if (!start || !end) return null;
  const invalid = daysBetween(start, end) < 0;
  return (
    <p className={cn("text-xs", invalid ? "text-destructive" : "text-muted-foreground", className)}>
      {invalid ? "La fecha de fin es anterior a la de inicio." : formatRange(start, end)}
    </p>
  );
}
