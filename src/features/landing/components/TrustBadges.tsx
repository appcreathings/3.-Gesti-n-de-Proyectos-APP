type Badge = { label: string; value: string; href?: string };

const BADGES: Badge[] = [
  { label: "License", value: "MIT", href: "https://github.com/hito-app/hito/blob/main/LICENSE" },
  { label: "Type", value: "100% local-first" },
  { label: "Tracking", value: "ninguno" },
  { label: "Backend", value: "no hay" },
];

/**
 * Trust strip: static facts about Hito that don't change between visits.
 * Renders as a "github-style" badges row, reinforcing the open source / privacy promise
 * without depending on third-party trackers.
 */
export function TrustBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
      {BADGES.map((b) => {
        const inner = (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background/80 px-2.5 py-1 font-mono text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
            <span className="text-muted-foreground/70">{b.label}</span>
            <span className="font-medium text-foreground">{b.value}</span>
          </span>
        );
        return b.href ? (
          <a key={b.label} href={b.href} target="_blank" rel="noopener noreferrer">
            {inner}
          </a>
        ) : (
          <span key={b.label}>{inner}</span>
        );
      })}
    </div>
  );
}
