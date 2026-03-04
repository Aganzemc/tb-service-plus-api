import type { FastifyInstance } from "fastify";
import { PublicSettingsController } from "../controllers/public.settings.controller.js";

export async function publicSettingsRoutes(app: FastifyInstance) {
  app.get("/settings", PublicSettingsController.get);
}
