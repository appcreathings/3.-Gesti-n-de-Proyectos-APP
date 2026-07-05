import { Select } from "@/components/ui/select";

interface Entity {
  id: string;
  name: string;
}

interface EntitySelectProps {
  id?: string;
  value: string;
  onChange: (id: string) => void;
  options: Entity[];
  placeholder?: string;
  className?: string;
  /** If true, the "none" option is omitted (for required selects). */
  required?: boolean;
}

/**
 * Generic select for any list of {id, name} entities.
 * Renders a "— placeholder —" first option unless `required` is true.
 */
export function EntitySelect({
  id,
  value,
  onChange,
  options,
  placeholder = "— Ninguno —",
  className,
  required = false,
}: EntitySelectProps) {
  return (
    <Select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      {!required && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </Select>
  );
}
