import { z } from "zod";

export const AdminPushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  expirationTime: z.number().nullable(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const AdminPushSubscriptionDeleteSchema = z.object({
  endpoint: z.string().url(),
});
