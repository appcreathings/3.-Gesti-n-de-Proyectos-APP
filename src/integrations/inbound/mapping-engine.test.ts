import { describe, it, expect } from "vitest";
import { mappingEngine } from "./mapping-engine";

describe("mapping-engine", () => {
  describe("transform", () => {
    it("transforms HubSpot contact to person", () => {
      const record = {
        email: "john@example.com",
        firstname: "John",
        lastname: "Doe",
        company: "Acme Corp",
      };

      const actions = mappingEngine.transform("hubspot", record);

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe("upsertPerson");
      expect(actions[0].data.email).toBe("john@example.com");
      expect(actions[0].data.roleTitle).toBe("Acme Corp");
    });

    it("transforms Google Sheets row to person when email present", () => {
      const record = {
        email: "jane@example.com",
        name: "Jane Smith",
      };

      const actions = mappingEngine.transform("google-sheets", record);

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe("upsertPerson");
      expect(actions[0].data.email).toBe("jane@example.com");
    });

    it("transforms Google Sheets row to task when title present", () => {
      const record = {
        title: "Implement feature X",
        status: "todo",
      };

      const actions = mappingEngine.transform("google-sheets", record);

      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe("upsertTask");
      expect(actions[0].data.title).toBe("Implement feature X");
    });

    it("returns empty array for unknown provider", () => {
      const actions = mappingEngine.transform("unknown-provider", { data: "test" });

      expect(actions).toHaveLength(0);
    });

    it("returns empty array when no matching action resolver", () => {
      const actions = mappingEngine.transform("hubspot", { randomField: "value" });

      expect(actions).toHaveLength(0);
    });

    it("handles nested field access", () => {
      const record = {
        properties: {
          email: "nested@example.com",
        },
      };

      mappingEngine.registerMapping("test-provider", [
        { sourceField: "properties.email", targetField: "email" },
      ]);

      mappingEngine.registerActionResolver("test-provider", (mapped) => {
        if (mapped.email) {
          return [{ type: "upsertPerson", data: mapped }];
        }
        return [];
      });

      const actions = mappingEngine.transform("test-provider", record);

      expect(actions).toHaveLength(1);
      expect(actions[0].data.email).toBe("nested@example.com");
    });
  });

  describe("getMappings", () => {
    it("returns registered mappings for provider", () => {
      const mappings = mappingEngine.getMappings("hubspot");

      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings.some((m) => m.sourceField === "email")).toBe(true);
    });

    it("returns empty array for unknown provider", () => {
      const mappings = mappingEngine.getMappings("unknown");

      expect(mappings).toHaveLength(0);
    });
  });
});
