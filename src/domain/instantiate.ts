import { uuid } from "@/lib/utils";
import {
  newArea,
  newChecklist,
  newItem,
  newProcess,
  newProject,
} from "./factories";
import type {
  Area,
  Checklist,
  ChecklistTemplate,
  Process,
  ProcessTemplate,
  Project,
  ProjectType,
} from "./schemas";

/**
 * Build a Project instance from a ProjectType blueprint: expands its default
 * areas, and for each area instantiates checklists (from ChecklistTemplate) and
 * processes (from ProcessTemplate). The core of "crear proyecto desde tipo".
 */
export function instantiateProjectFromType(
  type: ProjectType,
  name: string,
  productId: string | null,
  checklistTemplates: ChecklistTemplate[],
  processTemplates: ProcessTemplate[],
): Project {
  const project = newProject(name, productId);
  project.typeId = type.id;

  project.areas = type.defaultAreas.map((da) => {
    const area = newArea(da.name, da.icon);

    area.checklists = da.checklistTemplateIds
      .map((tid) => checklistTemplates.find((t) => t.id === tid))
      .filter((t): t is ChecklistTemplate => !!t)
      .map((tpl) => {
        const cl = newChecklist(tpl.name, tpl.id);
        cl.items = tpl.items.map((it) => {
          const item = newItem(it.text, it.required);
          return item;
        });
        return cl;
      });

    area.processes = da.processTemplateIds
      .map((tid) => processTemplates.find((t) => t.id === tid))
      .filter((t): t is ProcessTemplate => !!t)
      .map((tpl) => {
        const proc = newProcess(tpl.name);
        proc.description = tpl.description;
        proc.templateId = tpl.id;
        proc.steps = tpl.steps.map((s) => ({
          id: uuid(),
          text: s.text,
          details: s.details,
        }));
        return proc;
      });

    return area;
  });

  return project;
}

/**
 * Instantiate a single Checklist (with its items) from a ChecklistTemplate.
 * Extracted from `instantiateProjectFromType` for reuse in "apply template" flows.
 */
export function instantiateChecklistFromTemplate(tpl: ChecklistTemplate): Checklist {
  const cl = newChecklist(tpl.name, tpl.id);
  cl.items = tpl.items.map((it) => newItem(it.text, it.required));
  return cl;
}

/**
 * Instantiate a single Process (with steps) from a ProcessTemplate.
 */
export function instantiateProcessFromTemplate(tpl: ProcessTemplate): Process {
  const proc = newProcess(tpl.name);
  proc.description = tpl.description;
  proc.templateId = tpl.id;
  proc.steps = tpl.steps.map((s) => ({
    id: uuid(),
    text: s.text,
    details: s.details,
  }));
  return proc;
}

/**
 * Add to a Project the areas declared in a ProjectType that are not already present
 * (matched by name, case-insensitive). Pure / non-destructive.
 * Returns the updated Project (or the original if nothing changed).
 */
export function addMissingAreasFromType(
  project: Project,
  type: ProjectType,
  checklistTemplates: ChecklistTemplate[],
  processTemplates: ProcessTemplate[],
): Project {
  const existingNames = new Set(project.areas.map((a) => a.name.toLowerCase()));
  const newAreas: Area[] = type.defaultAreas
    .filter((da) => !existingNames.has(da.name.toLowerCase()))
    .map((da) => {
      const area = newArea(da.name, da.icon);
      area.checklists = da.checklistTemplateIds
        .map((tid) => checklistTemplates.find((t) => t.id === tid))
        .filter((t): t is ChecklistTemplate => !!t)
        .map(instantiateChecklistFromTemplate);
      area.processes = da.processTemplateIds
        .map((tid) => processTemplates.find((t) => t.id === tid))
        .filter((t): t is ProcessTemplate => !!t)
        .map(instantiateProcessFromTemplate);
      return area;
    });

  if (newAreas.length === 0) return project;
  return { ...project, areas: [...project.areas, ...newAreas] };
}
