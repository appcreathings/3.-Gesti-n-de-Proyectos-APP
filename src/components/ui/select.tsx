import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Variantes de tamaño del `<select>` (spec 037 §E).
 *
 * Antes altura, padding y tipografía vivían en una sola cadena base que incluía
 * `text-base sm:text-sm`. Pasarle `h-8 text-xs` desde el consumidor no
 * alcanzaba: `tailwind-merge` reemplaza `text-base` por `text-xs` pero
 * **conserva `sm:text-sm`** (es otra variante responsive), así que en ≥ 640px
 * quedaban 8px + 8px de padding + 20px de línea = 36px de contenido dentro de
 * una caja de 32px y el texto se recortaba.
 *
 * Con `cva` cada tamaño trae su propio padding y tipografía, y las dos opciones
 * ocupan el mismo slot: ya no hay una regla responsive que sobreviva a la otra.
 *
 * `default` conserva **exactamente** las clases de hoy —incluido
 * `text-base sm:text-sm`, que es el patrón anti-zoom de iOS— porque `Select` lo
 * usa toda la app y el tamaño por defecto no debe cambiar de aspecto (CA-05.4).
 * Los tamaños compactos del editor de flujos usan `size="sm"` en vez de pisar
 * la tipografía por `className`. */
const selectVariants = cva(
  "flex w-full appearance-none rounded-md border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      size: {
        default: "h-10 px-3 py-2 pr-8 text-base sm:text-sm",
        sm: "h-8 px-2 py-1 pr-7 text-xs",
      },
    },
    defaultVariants: { size: "default" },
  },
);

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    VariantProps<typeof selectVariants> {}

/** Lightweight native <select> styled to match the design system. */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, size, children, ...props }, ref) => (
    <div className="relative">
      <select ref={ref} className={cn(selectVariants({ size, className }))} {...props}>
        {children}
      </select>
      <ChevronDown
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
          size === "sm" ? "right-2 size-3.5" : "right-2.5 size-4",
        )}
      />
    </div>
  ),
);
Select.displayName = "Select";

export { Select, selectVariants };
