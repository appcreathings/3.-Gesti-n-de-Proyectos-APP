import { cn } from "@/lib/utils";
import { EntitySelect } from "./EntitySelect";
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
            <select
              value={row.role}
              onChange={(e) => updateRow(idx, { role: e.target.value as RaciRole })}
              className={cn(
                "flex h-9 w-full sm:w-36 items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm ring-offset-background",
                "focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {RACI_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {raciRoleLabel[r]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeRow(idx)}
              className="text-muted-foreground hover:text-destructive"
              title={`Quitar a ${person?.name ?? "persona"}`}
            >
              ✕
            </button>
          </div>
        );
      })}
      {people.length > 0 && (
        <button
          type="button"
          onClick={addRow}
          className="text-xs text-primary hover:underline"
        >
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
