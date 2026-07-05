import { cn } from "@/lib/utils";
import { areaIcon } from "@/lib/icons";

interface IconPickerProps {
  icons: readonly string[];
  value: string;
  onChange: (icon: string) => void;
  className?: string;
}

/**
 * Grid of visual icon buttons. Replaces raw <select> options like "folder", "code"…
 * with the actual Lucide icon and a clear selected state.
 */
export function IconPicker({ icons, value, onChange, className }: IconPickerProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {icons.map((name) => {
        const Icon = areaIcon(name);
        return (
          <button
            key={name}
            type="button"
            title={name}
            onClick={() => onChange(name)}
            className={cn(
              "flex size-9 items-center justify-center rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              value === name
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            aria-pressed={value === name}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
