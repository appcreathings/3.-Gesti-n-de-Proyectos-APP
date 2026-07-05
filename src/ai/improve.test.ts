import { describe, it, expect } from "vitest";
import { buildImprovePrompt, parseImproveResponse } from "./improve";

describe("buildImprovePrompt", () => {
  it("includes entity label and fields", () => {
    const prompt = buildImprovePrompt("project", { name: "Alpha", description: "" });
    expect(prompt).toContain("proyecto");
    expect(prompt).toContain("Alpha");
    expect(prompt).toContain('"name"');
    expect(prompt).toContain('"description"');
    expect(prompt).toContain("suggestions");
    expect(prompt).toContain("summary");
  });

  it("maps entity types to labels", () => {
    expect(buildImprovePrompt("task", {})).toContain("tarea");
    expect(buildImprovePrompt("process", {})).toContain("proceso");
    expect(buildImprovePrompt("area", {})).toContain("área");
    expect(buildImprovePrompt("checklist-item", {})).toContain("ítem de checklist");
    expect(buildImprovePrompt("checklist-template", {})).toContain("plantilla de checklist");
    expect(buildImprovePrompt("process-template", {})).toContain("plantilla de proceso");
    expect(buildImprovePrompt("project-type", {})).toContain("tipo de proyecto");
  });
});

describe("parseImproveResponse", () => {
  it("parses valid JSON response", () => {
    const res = parseImproveResponse(
      JSON.stringify({
        suggestions: [
          {
            field: "name",
            originalValue: "Alpha",
            suggestedValue: "Alpha Pro",
            reason: "Más específico",
          },
        ],
        summary: "Una mejora sugerida",
      }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.summary).toBe("Una mejora sugerida");
    expect(res.data.suggestions[0].field).toBe("name");
    expect(res.data.suggestions[0].suggestedValue).toBe("Alpha Pro");
  });

  it("strips markdown code fences", () => {
    const res = parseImproveResponse(
      '```json\n{"suggestions": [], "summary": "nada"}\n```',
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.summary).toBe("nada");
  });

  it("rejects invalid JSON", () => {
    const res = parseImproveResponse("no es json");
    expect(res.ok).toBe(false);
  });

  it("rejects empty response", () => {
    const res = parseImproveResponse("");
    expect(res.ok).toBe(false);
  });

  it("rejects response missing required fields", () => {
    const res = parseImproveResponse('{"suggestions": "bad"}');
    expect(res.ok).toBe(false);
  });
});
