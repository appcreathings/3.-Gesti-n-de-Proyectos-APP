import { cn } from "@/lib/utils";

type HitoMarkProps = {
  className?: string;
  variant?: "default" | "inverted";
  title?: string;
};

/**
 * Hito brand mark — un mojón con banderín.
 * "default":  fondo transparente, marca en foreground. Para usar sobre fondos claros/oscuros.
 * "inverted": fondo del color del contenedor (similar al favicon), marca en claro.
 *
 * No usar para texto: para el wordmark usar <HitoWordmark /> (próximo).
 */
export function HitoMark({ className, variant = "default", title = "Hito" }: HitoMarkProps) {
  if (variant === "inverted") {
    return (
      <svg
        viewBox="0 0 64 64"
        role="img"
        aria-label={title}
        className={cn("size-full", className)}
      >
        <rect width="64" height="64" rx="14" fill="currentColor" className="text-primary" />
        <rect x="28" y="18" width="1.75" height="32" rx="0.75" fill="currentColor" className="text-primary-foreground" />
        <path d="M29.75 19.25 L49 24.25 L29.75 29.25 Z" fill="currentColor" className="text-accent" />
        <rect x="22" y="49.25" width="18.5" height="4" rx="0.75" fill="currentColor" className="text-primary-foreground" />
        <rect x="20" y="52" width="22.5" height="2" rx="0.5" fill="currentColor" className="text-primary-foreground opacity-40" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={cn("size-full", className)}
    >
      <rect x="28" y="18" width="1.75" height="32" rx="0.75" fill="currentColor" className="text-foreground" />
      <path d="M29.75 19.25 L49 24.25 L29.75 29.25 Z" fill="currentColor" className="text-accent" />
      <rect x="22" y="49.25" width="18.5" height="4" rx="0.75" fill="currentColor" className="text-foreground" />
      <rect x="20" y="52" width="22.5" height="2" rx="0.5" fill="currentColor" className="text-foreground opacity-40" />
    </svg>
  );
}
