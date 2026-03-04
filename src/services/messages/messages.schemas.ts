import { z } from "zod";

export const MessageCreateSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email().nullable().optional(),
  message: z.string().min(1).max(5000),
});

export const MessageUpdateSchema = z.object({
  is_read: z.boolean(),
});
