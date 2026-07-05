import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Surface container used across the app to keep visual language in sync
 * with the landing page. Header is optional and follows the "mono uppercase
 * tracking-widest" label convention used elsewhere.
 */
interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tiny label rendered above the title (e.g. "Proyecto · Sprint 7"). */
  label?: React.ReactNode;
  /** Pane title; rendered with the standard tracking-tight scale. */
  title?: React.ReactNode;
  /** Pane description; sits under the title. */
  description?: React.ReactNode;
  /** Right-aligned actions (Rendered in the header). */
  actions?: React.ReactNode;
  /** Removes the outer border and inner padding (useful when the consumer paints its own chrome). */
  bare?: boolean;
}

/**
 * Unified panel primitive. Use this for any "pane" inside the app so colour,
 * border weight and label typography stay aligned with the landing.
 */
export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(function Panel(
  { label, title, description, actions, className, children, bare, ...rest },
  ref,
) {
  if (bare) {
    return (
      <div ref={ref} className={cn(className)} {...rest}>
        {children}
      </div>
    );
  }

  const hasHeader = label || title || actions;
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-border/70 bg-background",
        className,
      )}
      {...rest}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 border-b border-border/60 p-6">
          <div className="min-w-0">
            {label && (
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {label}
              </p>
            )}
            {title && (
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
});
