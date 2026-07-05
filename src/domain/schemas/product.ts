import { z } from "zod";
import { Id, IsoDate, ProductStatus, SCHEMA_VERSION } from "./common";

export const ObjectiveSchema = z.object({
  id: Id,
  text: z.string(),
  target: z.string().default(""),
  done: z.boolean().default(false),
});
export type Objective = z.infer<typeof ObjectiveSchema>;

export const ProductSchema = z.object({
  id: Id,
  schemaVersion: z.number().default(SCHEMA_VERSION),
  name: z.string().min(1),
  description: z.string().default(""),
  vision: z.string().default(""),
  objectives: z.array(ObjectiveSchema).default([]),
  status: ProductStatus.default("active"),
  ownerId: Id.nullable().default(null),
  tags: z.array(z.string()).default([]),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type Product = z.infer<typeof ProductSchema>;
