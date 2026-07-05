import { cn } from "@/lib/utils";
import { healthLabel } from "@/domain/labels";
import type { Health } from "@/domain/schemas";

/** Single source of truth for RAG health color, reused by bars, dots and badges. */
export const healthColorClass: Record<Health, string> = {
  green: "bg-success",
  amber: "bg-warning",
  red: "bg-destructive",
};

interface HealthDotProps {
  health: Health;
  className?: string;
}

/** Small colored dot for RAG health (bars, compact lists, icons). */
export function HealthDot({ health, className }: HealthDotProps) {
  return (
    <span
      className={cn("inline-block size-2.5 shrink-0 rounded-full", healthColorClass[health], className)}
    />
  );
}

interface HealthBadgeProps {
  health: Health;
  className?: string;
}

/** Dot + label pair for RAG health, consistent across dashboard, lists and detail. */
export function HealthBadge({ health, className }: HealthBadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm", className)}>
      <HealthDot health={health} />
      {healthLabel[health]}
    </span>
  );
}
