import { z } from "zod";

export const AdminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export const AdminCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  role: z.enum(["admin", "super_admin"]).default("admin"),
});

export const AdminUpdateSchema = z
  .object({
    email: z.string().email().optional(),
    password: z.string().min(8).max(200).optional(),
    role: z.enum(["admin", "super_admin"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

export const AdminBootstrapSchema = z.object({
  secret: z.string().min(10),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});
