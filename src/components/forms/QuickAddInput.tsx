import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface QuickAddInputProps {
  placeholder?: string;
  onAdd: (value: string) => void;
  buttonLabel?: string;
  className?: string;
  /** Auto-clear the input after adding (default: true). */
  autoClear?: boolean;
}

/**
 * Reusable inline quick-add: Input + Enter + button.
 * Extracted from ChecklistSection and AreaCard patterns.
 */
export function QuickAddInput({
  placeholder = "Añadir…",
  onAdd,
  buttonLabel,
  className,
  autoClear = true,
}: QuickAddInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    if (autoClear) setValue("");
    inputRef.current?.focus();
  }

  return (
    <div className={`flex gap-2 ${className ?? ""}`}>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className="h-9"
      />
      <Button size="sm" variant="secondary" className="h-9 shrink-0" onClick={submit}>
        <Plus className="size-4" />
        {buttonLabel && <span className="ml-1">{buttonLabel}</span>}
      </Button>
    </div>
  );
}
