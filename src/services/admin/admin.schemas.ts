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

export const AdminProfileUpdateSchema = z
  .object({
    email: z.string().email().optional(),
    currentPassword: z.string().min(8).max(200).optional(),
    newPassword: z.string().min(8).max(200).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.email && !value.newPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one profile field is required",
      });
    }

    if ((value.email || value.newPassword) && !value.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentPassword"],
        message: "Current password is required to update the profile",
      });
    }
  });

export const AdminRefreshSchema = z.object({
  refreshToken: z.string().min(20),
});

export const AdminLogoutSchema = z.object({
  refreshToken: z.string().min(20),
});
