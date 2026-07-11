import { Pencil, Trash2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { actionLabel, triggerLabel } from "@/domain/labels";
import type { AutomationRule } from "@/domain/schemas";

interface Props {
  rule: AutomationRule;
  scopeLabel: string;
  onToggleEnabled: (enabled: boolean) => void;
  onEdit: () => void;
  /** Omit to hide the delete action (e.g. inside a project-scoped tab). */
  onDelete?: () => void;
}

/** Trigger→condición→acción card, usada por `ProjectAutomationsTab` (reglas
 * legacy por-proyecto — el sistema global de automatizaciones se migró a
 * Flows, spec 019/020; esta card sigue viva solo para el scope por-proyecto). */
export function AutomationRuleCard({ rule, scopeLabel, onToggleEnabled, onEdit, onDelete }: Props) {
  return (
    <Card className="group">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <Checkbox checked={rule.enabled} onCheckedChange={onToggleEnabled} aria-label="Activar regla" />
          <div>
            <CardTitle className="text-base">{rule.name}</CardTitle>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={rule.enabled ? "success" : "outline"}>
                {rule.enabled ? "Activa" : "Inactiva"}
              </Badge>
              <Badge variant="secondary">{scopeLabel}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Editar regla ${rule.name}`}
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Eliminar regla ${rule.name}`}
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="text-sm">
        <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Zap className="size-3.5 text-primary" />
            {triggerLabel[rule.trigger.type] ?? rule.trigger.type}
          </span>
          {rule.conditions.length > 0 && (
            <Badge variant="outline">
              {rule.conditions.length} {rule.conditions.length === 1 ? "condición" : "condiciones"}
            </Badge>
          )}
          <span>→</span>
          {rule.actions.map((a, i) => (
            <Badge key={i} variant="secondary">
              {actionLabel[a.type]}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
