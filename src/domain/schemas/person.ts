import { z } from "zod";
import { Id, IsoDate, SCHEMA_VERSION } from "./common";

export const PersonSchema = z.object({
  id: Id,
  name: z.string().min(1),
  email: z.string().default(""),
  roleTitle: z.string().default(""),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type Person = z.infer<typeof PersonSchema>;

export const PeopleDocSchema = z.object({
  schemaVersion: z.number().default(SCHEMA_VERSION),
  people: z.array(PersonSchema).default([]),
});
export type PeopleDoc = z.infer<typeof PeopleDocSchema>;
