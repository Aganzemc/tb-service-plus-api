import type { FastifyInstance } from "fastify";
import { AdminSettingsController } from "../controllers/admin.settings.controller.js";
import { requireAdmin } from "../services/auth/auth.middleware.js";

export async function adminSettingsRoutes(app: FastifyInstance) {
  app.get("/admin/settings", { preHandler: requireAdmin }, AdminSettingsController.get);
  app.get("/admin/settings/history", { preHandler: requireAdmin }, AdminSettingsController.history);
  app.delete("/admin/settings/history", { preHandler: requireAdmin }, AdminSettingsController.clearHistory);
  app.delete("/admin/settings/history/:id", { preHandler: requireAdmin }, AdminSettingsController.deleteHistoryEntry);
  app.put("/admin/settings", { preHandler: requireAdmin }, AdminSettingsController.upsert);
}
