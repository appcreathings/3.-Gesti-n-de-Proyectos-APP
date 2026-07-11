import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { FlowCondition } from "@/domain/schemas/flow";

interface Props {
  condition: FlowCondition;
  onChange: (updates: Partial<FlowCondition>) => void;
}

export function ConditionConfigFields({ condition, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>Campo</Label>
        <Input
          value={condition.field}
          onChange={(e) => onChange({ field: e.target.value })}
          placeholder="amount"
        />
      </div>
      <div className="grid gap-2">
        <Label>Operador</Label>
        <Select
          value={condition.op}
          onChange={(e) => onChange({ op: e.target.value as FlowCondition["op"] })}
        >
          <option value="==">==</option>
          <option value="!=">!=</option>
          <option value=">">&gt;</option>
          <option value=">=">&gt;=</option>
          <option value="<">&lt;</option>
          <option value="<=">&lt;=</option>
          <option value="in">in</option>
          <option value="contains">contains</option>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>Valor</Label>
        <Input
          value={String(condition.value ?? "")}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="1000"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Todas las condiciones del flujo deben cumplirse (AND) para que se ejecuten las acciones.
      </p>
    </div>
  );
}
