import { useState } from "react";
import { AlertCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import type { FlowIssue } from "@/flows/validation";

interface Props {
  issues: FlowIssue[];
  /** Clic en un issue → el builder abre el drawer del nodo correspondiente
   * (spec 027 §A) vía `nodeKind`/`outputIndex`. */
  onIssueClick?: (issue: FlowIssue) => void;
}

/** Banner colapsable de problemas de configuración sobre el canvas del
 * builder (spec 027 §A). Rojo si hay errores (el flujo no puede ejecutarse
 * correctamente), ámbar si solo hay warnings. Cada issue es clicable y abre
 * el drawer del nodo al que refiere. */
export function FlowIssuesBanner({ issues, onIssueClick }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (issues.length === 0) return null;

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.length - errorCount;
  const hasErrors = errorCount > 0;

  const summary = [
    errorCount > 0 ? `${errorCount} problema${errorCount !== 1 ? "s" : ""}` : null,
    warningCount > 0 ? `${warningCount} aviso${warningCount !== 1 ? "s" : ""}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={`mb-3 rounded-lg border p-3 ${
        hasErrors ? "border-destructive/40 bg-destructive/5" : "border-warning/40 bg-warning/5"
      }`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 text-left text-sm font-medium"
      >
        {hasErrors ? (
          <AlertCircle className="size-4 shrink-0 text-destructive" />
        ) : (
          <AlertTriangle className="size-4 shrink-0 text-warning" />
        )}
        <span className={hasErrors ? "text-destructive" : "text-warning"}>{summary}</span>
        <span className="text-xs font-normal text-muted-foreground">
          {hasErrors
            ? "— este flujo no puede ejecutarse correctamente todavía"
            : "— el flujo puede ejecutarse, pero revisa los avisos"}
        </span>
        {collapsed ? (
          <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronUp className="ml-auto size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {!collapsed && (
        <ul className="mt-2 space-y-1">
          {issues.map((issue, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onIssueClick?.(issue)}
                className="flex w-full items-start gap-2 rounded px-1 py-0.5 text-left text-xs hover:bg-background/60"
                title="Abrir la configuración de este nodo"
              >
                {issue.severity === "error" ? (
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                )}
                <span className="underline-offset-2 hover:underline">{issue.message}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
