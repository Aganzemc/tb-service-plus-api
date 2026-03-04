import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  SUPABASE_ANON_KEY: z.string().min(20).optional(),

  JWT_ACCESS_SECRET: z.string().min(20),
  JWT_ISSUER: z.string().default("app"),
  JWT_AUDIENCE: z.string().default("app-users"),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().default(900),
});

export const env = EnvSchema.parse(process.env);
