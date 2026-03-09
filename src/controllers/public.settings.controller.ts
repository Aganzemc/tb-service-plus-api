import type { FastifyReply, FastifyRequest } from "fastify";
import { getSiteSettings } from "../services/settings/settings.service.js";

export const PublicSettingsController = {
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
};
