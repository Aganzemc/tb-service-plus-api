import { z } from "zod";

export const ServiceCreateSchema = z.object({
  slug: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  short_description: z.string().max(500).nullable().optional(),
  description: z.string().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export const ServiceUpdateSchema = ServiceCreateSchema.partial();
