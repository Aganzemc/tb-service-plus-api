import type { FastifyReply, FastifyRequest } from "fastify";
import { SettingsUpsertSchema } from "../services/settings/settings.schemas.js";
import { getSiteSettings, upsertSiteSettings } from "../services/settings/settings.service.js";

export const AdminSettingsController = {
  async get(req: FastifyRequest, reply: FastifyReply) {
    try {
      const settings = await getSiteSettings();
      return reply.send({ settings });
    } catch (error: unknown) {
      const maybe = error as { message?: unknown } | null;

      return reply.code(500).send({
        message: "DB error",
        details: typeof maybe?.message === "string" ? maybe.message : "Unable to load settings",
      });
    }
  },

  async upsert(req: FastifyRequest, reply: FastifyReply) {
    const parsed = SettingsUpsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", details: parsed.error.flatten() });
    }

    try {
      const result = await upsertSiteSettings(parsed.data);
      return reply.send(result);
    } catch (error: unknown) {
      const maybe = error as { message?: unknown } | null;

      return reply.code(500).send({
        message: "DB error",
        details: typeof maybe?.message === "string" ? maybe.message : "Unable to save settings",
      });
    }
  },
};
