import type { FastifyInstance } from "fastify";
import { AdminSettingsController } from "../controllers/admin.settings.controller.js";
import { requireAdmin } from "../services/auth/auth.middleware.js";

export async function adminSettingsRoutes(app: FastifyInstance) {
  app.get("/admin/settings", { preHandler: requireAdmin }, AdminSettingsController.get);
  app.put("/admin/settings", { preHandler: requireAdmin }, AdminSettingsController.upsert);
}
