export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: (value: unknown) => unknown;
}

export interface MappingAction {
  type: "upsertTask" | "upsertPerson" | "updateTaskStatus" | "checkChecklistItem";
  data: Record<string, unknown>;
}

class MappingEngine {
  private mappings = new Map<string, FieldMapping[]>();
  private actionResolvers = new Map<
    string,
    (mapped: Record<string, unknown>) => MappingAction[]
  >();

  registerMapping(provider: string, fields: FieldMapping[]): void {
    this.mappings.set(provider, fields);
  }

  registerActionResolver(
    provider: string,
    resolver: (mapped: Record<string, unknown>) => MappingAction[]
  ): void {
    this.actionResolvers.set(provider, resolver);
  }

  transform(provider: string, record: Record<string, unknown>): MappingAction[] {
    const mapping = this.mappings.get(provider);
    if (!mapping) return [];

    const mapped: Record<string, unknown> = {};
    for (const field of mapping) {
      const raw = getNestedValue(record, field.sourceField);
      mapped[field.targetField] = field.transform ? field.transform(raw) : raw;
    }

    const resolver = this.actionResolvers.get(provider);
    if (resolver) {
      return resolver(mapped);
    }

    if (mapped.email) {
      return [{ type: "upsertPerson", data: mapped }];
    }
    if (mapped.title || mapped.status) {
      return [{ type: "upsertTask", data: mapped }];
    }

    return [];
  }

  getMappings(provider: string): FieldMapping[] {
    return this.mappings.get(provider) ?? [];
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export const mappingEngine = new MappingEngine();

mappingEngine.registerMapping("hubspot", [
  { sourceField: "email", targetField: "email" },
  {
    sourceField: "firstname",
    targetField: "name",
    transform: (v: unknown) => {
      return String(v ?? "").trim();
    },
  },
  { sourceField: "company", targetField: "roleTitle" },
]);

mappingEngine.registerActionResolver("hubspot", (mapped) => {
  if (mapped.email) {
    return [{ type: "upsertPerson", data: mapped }];
  }
  return [];
});

// Mappings para deals de HubSpot
mappingEngine.registerMapping("hubspot-deals", [
  { sourceField: "dealname", targetField: "title" },
  { sourceField: "amount", targetField: "value" },
  { sourceField: "dealstage", targetField: "stage" },
  { sourceField: "closedate", targetField: "closeDate" },
  { sourceField: "pipeline", targetField: "pipeline" },
]);

mappingEngine.registerActionResolver("hubspot-deals", (mapped) => {
  if (mapped.title) {
    return [{ type: "upsertTask", data: mapped }];
  }
  return [];
});

// Mappings para tickets de HubSpot
mappingEngine.registerMapping("hubspot-tickets", [
  { sourceField: "subject", targetField: "title" },
  { sourceField: "content", targetField: "description" },
  { sourceField: "hs_ticket_priority", targetField: "priority" },
  { sourceField: "hs_pipeline_stage", targetField: "status" },
  { sourceField: "hs_ticket_category", targetField: "category" },
]);

mappingEngine.registerActionResolver("hubspot-tickets", (mapped) => {
  if (mapped.title) {
    return [{ type: "upsertTask", data: mapped }];
  }
  return [];
});

mappingEngine.registerMapping("google-sheets", [
  { sourceField: "email", targetField: "email" },
  { sourceField: "name", targetField: "name" },
  { sourceField: "title", targetField: "title" },
  { sourceField: "status", targetField: "status" },
]);

mappingEngine.registerActionResolver("google-sheets", (mapped) => {
  if (mapped.email) {
    return [{ type: "upsertPerson", data: mapped }];
  }
  if (mapped.title) {
    return [{ type: "upsertTask", data: mapped }];
  }
  return [];
});
