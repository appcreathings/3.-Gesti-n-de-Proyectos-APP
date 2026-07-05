import * as React from "react";
import { cn } from "@/lib/utils";
import { SectionLabel } from "./SectionLabel";

interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Big metric rendered in mono (e.g. "72%", "$4.2k", "0 KB"). */
  value: React.ReactNode;
  /** Short label under the metric. */
  label: React.ReactNode;
  /** Optional helper text shown below the label. */
  description?: React.ReactNode;
  /** Optional icon rendered above the metric. */
  icon?: React.ComponentType<{ className?: string }>;
  /** Optional tone for the metric — maps to existing text tokens. */
  tone?: "default" | "success" | "warning" | "destructive";
}

const TONE: Record<NonNullable<StatTileProps["tone"]>, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

/**
 * Stat cell used in dashboard / hero-style blocks.
 * Pair with a parent grid that uses `gap-px overflow-hidden rounded-2xl border
 * bg-border` to render the "divided" look shared by the landing.
 */
export function StatTile({
  value,
  label,
  description,
  icon: Icon,
  tone = "default",
  className,
  ...rest
}: StatTileProps) {
  return (
    <div className={cn("flex flex-col gap-3 bg-background p-8", className)} {...rest}>
      {Icon && <Icon className="size-5 text-muted-foreground" aria-hidden />}
      <div className={cn("font-mono text-3xl font-semibold tracking-tight sm:text-4xl", TONE[tone])}>
        {value}
      </div>
      <div className="text-sm font-medium">{label}</div>
      {description && (
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      <SectionLabel className="mt-auto pt-2">Métrica</SectionLabel>
    </div>
  );
}
