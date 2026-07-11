import type { PollFilter } from "@/domain/schemas/flow";

/**
 * Construcción del body para `POST /crm/v3/objects/{type}/search` — el único
 * endpoint de HubSpot que soporta `filterGroups`. Los 3 pollers de HubSpot
 * antes armaban `filterGroups` como parámetro de un `GET /objects/{type}`,
 * endpoint que lo ignora por completo — el filtro incremental por
 * `lastmodifieddate` nunca filtró nada (spec 021 §2).
 */

export type HubSpotSearchOperator =
  | "EQ"
  | "NEQ"
  | "LT"
  | "LTE"
  | "GT"
  | "GTE"
  | "IN"
  | "CONTAINS_TOKEN";

export interface HubSpotSearchFilter {
  propertyName: string;
  operator: HubSpotSearchOperator;
  value?: string;
  values?: string[];
}

export interface HubSpotSearchBody {
  properties: string[];
  filterGroups: { filters: HubSpotSearchFilter[] }[];
  sorts: { propertyName: string; direction: "ASCENDING" | "DESCENDING" }[];
  limit: number;
  after?: string;
}

const OP_MAP: Partial<Record<PollFilter["op"], HubSpotSearchOperator>> = {
  "==": "EQ",
  "!=": "NEQ",
  ">": "GT",
  ">=": "GTE",
  "<": "LT",
  "<=": "LTE",
  in: "IN",
  contains: "CONTAINS_TOKEN",
};

/**
 * Traduce un `PollFilter` (schema genérico de Hito) a un filtro de HubSpot
 * Search. `null` si el operador no tiene equivalente en HubSpot (se descarta
 * con un warning en vez de romper el poll — mejor traer de más que fallar).
 */
export function mapPollFilterToHubSpot(filter: PollFilter): HubSpotSearchFilter | null {
  const operator = OP_MAP[filter.op];
  if (!operator) {
    console.warn(
      `[HubSpot Search] Operador "${filter.op}" no soportado por HubSpot; se descarta el filtro sobre "${filter.field}".`
    );
    return null;
  }

  if (operator === "IN") {
    // El valor puede venir como array ya armado, o como string separado por
    // comas (así lo captura hoy el input de texto de la UI de filtros).
    const values = Array.isArray(filter.value)
      ? filter.value.map(String)
      : String(filter.value ?? "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
    if (values.length === 0) return null;
    return { propertyName: filter.field, operator, values };
  }

  if (operator === "CONTAINS_TOKEN") {
    // HubSpot espera wildcards explícitos para "contiene".
    return { propertyName: filter.field, operator, value: `*${String(filter.value ?? "")}*` };
  }

  return { propertyName: filter.field, operator, value: String(filter.value ?? "") };
}

export interface BuildSearchBodyInput {
  properties: string[];
  filters: PollFilter[];
  /** Se añade como filtro adicional (AND) del mismo grupo: `lastmodifieddate GT lastSyncAt`. */
  lastSyncAt?: string | null;
  after?: string;
  limit?: number;
}

/** Construye el body completo de `.../search`. Todos los filtros (los del
 * usuario + el de sync incremental) van en un único `filterGroup` — HubSpot
 * evalúa los filtros de un mismo grupo con AND, y distintos grupos con OR;
 * aquí siempre queremos AND. */
export function buildHubSpotSearchBody(input: BuildSearchBodyInput): HubSpotSearchBody {
  const userFilters = input.filters
    .map(mapPollFilterToHubSpot)
    .filter((f): f is HubSpotSearchFilter => f !== null);

  const filters = [...userFilters];
  if (input.lastSyncAt) {
    filters.push({ propertyName: "lastmodifieddate", operator: "GT", value: input.lastSyncAt });
  }

  return {
    properties: input.properties,
    filterGroups: filters.length > 0 ? [{ filters }] : [],
    sorts: [{ propertyName: "lastmodifieddate", direction: "ASCENDING" }],
    limit: input.limit ?? 100,
    ...(input.after ? { after: input.after } : {}),
  };
}

/** Une los campos elegidos por el usuario con un piso obligatorio (siempre
 * necesario para el sync incremental / idempotencia / interpolación básica),
 * sin duplicados. Así deseleccionar un campo en la UI nunca rompe el poll. */
export function mergeProperties(userFields: string[], floor: string[]): string[] {
  return Array.from(new Set([...floor, ...userFields]));
}
