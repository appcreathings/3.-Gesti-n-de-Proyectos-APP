import { X } from "lucide-react";
import { EntitySelect } from "./EntitySelect";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Person, RaciRole } from "@/domain/schemas";
import { raciRoleLabel } from "@/domain/labels";

interface PersonSelectProps {
  id?: string;
  value: string;
  onChange: (id: string) => void;
  people: Person[];
  placeholder?: string;
  className?: string;
}

/** Single-person selector with "— Sin asignar —" default. */
export function PersonSelect({
  id,
  value,
  onChange,
  people,
  placeholder = "— Sin asignar —",
  className,
}: PersonSelectProps) {
  return (
    <EntitySelect
      id={id}
      value={value}
      onChange={onChange}
      options={people}
      placeholder={placeholder}
      className={className}
    />
  );
}

/** ------------------------------------------------------------------ */

interface StakeholderRow {
  personId: string;
  role: RaciRole;
}

interface MultiPersonSelectProps {
  people: Person[];
  value: StakeholderRow[];
  onChange: (rows: StakeholderRow[]) => void;
}

const RACI_OPTIONS: RaciRole[] = ["responsible", "accountable", "consulted", "informed"];

/**
 * Editor for a RACI stakeholders array.
 * Renders one row per existing stakeholder plus an "Add person" row.
 */
export function MultiPersonSelect({ people, value, onChange }: MultiPersonSelectProps) {
  function updateRow(idx: number, patch: Partial<StakeholderRow>) {
    onChange(value.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeRow(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function addRow() {
    // Default to first unselected person, or first person if all selected
    const usedIds = value.map((r) => r.personId);
    const next = people.find((p) => !usedIds.includes(p.id)) ?? people[0];
    if (!next) return;
    onChange([...value, { personId: next.id, role: "responsible" }]);
  }

  return (
    <div className="space-y-2">
      {value.map((row, idx) => {
        const person = people.find((p) => p.id === row.personId);
        return (
          <div key={idx} className="flex items-center gap-2">
            <EntitySelect
              value={row.personId}
              onChange={(id) => updateRow(idx, { personId: id })}
              options={people}
              placeholder="— Persona —"
              required
              className="flex-1"
            />
            <Select
              value={row.role}
              onChange={(e) => updateRow(idx, { role: e.target.value as RaciRole })}
              className="w-full sm:w-36"
            >
              {RACI_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {raciRoleLabel[r]}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
              title={`Quitar a ${person?.name ?? "persona"}`}
              onClick={() => removeRow(idx)}
            >
              <X className="size-4" />
            </Button>
          </div>
        );
      })}
      {people.length > 0 && (
        <button type="button" onClick={addRow} className="text-xs text-primary hover:underline">
          + Añadir persona al equipo
        </button>
      )}
      {people.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Agrega personas en Ajustes → Personas para poder asignarlas aquí.
        </p>
      )}
    </div>
  );
}
