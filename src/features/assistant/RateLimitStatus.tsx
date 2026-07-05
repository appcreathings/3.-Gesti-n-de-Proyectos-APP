import { useEffect, useState } from "react";
import { AlertTriangle, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getModelDef, getModelsByGroup } from "@/ai/models";
import { rateLimiter } from "@/ai/rateLimiter";
import { useAiConfigStore } from "@/store/useAiConfigStore";

interface RateLimitStatusProps {
  className?: string;
}

export function RateLimitStatus({ className }: RateLimitStatusProps) {
  const config = useAiConfigStore((s) => s.config);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceUpdate((t) => t + 1), 1_000);
    return () => clearInterval(interval);
  }, []);

  if (!config.apiKey) return null;

  const activeStatus = rateLimiter.getStatus(config.model);
  const activeDef = getModelDef(config.model);

  const groupModels = config.autoFallback
    ? getModelsByGroup(config.fallbackGroup)
    : [];

  const isExhausted =
    !rateLimiter.canMakeRequest(config.model) || activeStatus.saturated;

  return (
    <div
      className={cn(
        "rounded-md border bg-card px-3 py-2 text-xs",
        isExhausted ? "border-warning/50 bg-warning/5" : "border-border",
        className,
      )}
    >
      <div className="flex items-center gap-2 font-medium text-muted-foreground mb-1">
        <BarChart3 className="size-3" />
        Estado de modelo
        {isExhausted && (
          <span className="inline-flex items-center gap-1 text-warning">
            <AlertTriangle className="size-3" /> límite alcanzado
          </span>
        )}
      </div>

      <div className="grid gap-1">
        <ModelBar
          label={activeDef?.label ?? config.model}
          used={activeStatus.rpmUsed}
          limit={activeStatus.rpmLimit}
          unit="req/min"
        />
        {activeDef?.unlimitedTpm ? (
          <div className="text-muted-foreground">Tokens/min: ilimitado</div>
        ) : (
          <ModelBar
            label="Tokens"
            used={activeStatus.tpmUsed}
            limit={activeStatus.tpmLimit}
            unit="tok/min"
          />
        )}
        <ModelBar
          label="Diario"
          used={activeStatus.rpdUsed}
          limit={activeStatus.rpdLimit}
          unit="req/hoy"
        />
      </div>

      {activeStatus.saturated && activeStatus.retryAt && (
        <p className="mt-1 text-warning">
          Se restablece en {Math.max(0, Math.ceil((activeStatus.retryAt - Date.now()) / 1000))}s
        </p>
      )}

      {config.autoFallback && groupModels.length > 0 && (
        <div className="mt-1.5 border-t pt-1.5">
          <p className="mb-0.5 text-muted-foreground">Grupo: {config.fallbackGroup}</p>
          {groupModels.map((m) => {
            const s = rateLimiter.getStatus(m.id);
            const available = rateLimiter.canMakeRequest(m.id);
            return (
              <div key={m.id} className="text-[11px] text-muted-foreground">
                {m.id === config.model ? "→ " : "  "}
                {m.label}
                {available ? "" : " (sin cuota)"}
                {s.saturated ? ", saturado" : ""}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ModelBar({
  label,
  used,
  limit,
  unit,
}: {
  label: string;
  used: number;
  limit: number;
  unit: string;
}) {
  if (limit === Infinity || limit === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">—</span>
      </div>
    );
  }
  const pct = Math.min((used / limit) * 100, 100);
  const color =
    pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-warning" : "bg-primary";

  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn("h-full rounded-full transition-all", color)}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="w-20 text-right font-mono tabular-nums text-muted-foreground">
        {used}/{limit} {unit}
      </span>
    </div>
  );
}
