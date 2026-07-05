import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual tone. `muted` (default) is the standard; `accent` highlights section titles. */
  tone?: "muted" | "accent";
}

/**
 * Mono uppercase tracking-widest label used on the landing and re-applied
 * throughout the app so any "section title" reads the same.
 */
export function SectionLabel({ className, tone = "muted", ...rest }: SectionLabelProps) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] uppercase tracking-widest",
        tone === "muted" ? "text-muted-foreground" : "text-foreground",
        className,
      )}
      {...rest}
    />
  );
}
