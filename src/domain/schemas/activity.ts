import { z } from "zod";
import { Id, IsoDate, SCHEMA_VERSION } from "./common";
import { EntityRefSchema } from "./notification";

/** Máximo de entradas retenidas en el log (las más antiguas se descartan). */
export const ACTIVITY_CAP = 500;

export const ActivityEntrySchema = z.object({
  id: Id,
  at: IsoDate,
  projectId: Id,
  /** Tipo de DomainEvent que originó la entrada (p.ej. "task.statusChanged"). */
  type: z.string(),
  /** Mensaje humano en español, listo para mostrar. */
  message: z.string(),
  entityRef: EntityRefSchema.nullable().default(null),
});
export type ActivityEntry = z.infer<typeof ActivityEntrySchema>;

export const ActivityDocSchema = z.object({
  schemaVersion: z.number().default(SCHEMA_VERSION),
  entries: z.array(ActivityEntrySchema).default([]),
});
export type ActivityDoc = z.infer<typeof ActivityDocSchema>;

export function emptyActivityDoc(): ActivityDoc {
  return { schemaVersion: SCHEMA_VERSION, entries: [] };
}
