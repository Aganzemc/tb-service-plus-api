import type { FastifyInstance } from "fastify";
import { AdminNotificationsController } from "../controllers/admin.notifications.controller.js";
import { requireAdmin } from "../services/auth/auth.middleware.js";

export async function adminNotificationsRoutes(app: FastifyInstance) {
  app.get("/admin/notifications", { preHandler: requireAdmin }, AdminNotificationsController.list);
  app.patch("/admin/notifications/:id/read", { preHandler: requireAdmin }, AdminNotificationsController.markRead);
  app.post("/admin/notifications/read-all", { preHandler: requireAdmin }, AdminNotificationsController.markAllRead);
  app.delete("/admin/notifications/:id", { preHandler: requireAdmin }, AdminNotificationsController.remove);
  app.delete("/admin/notifications", { preHandler: requireAdmin }, AdminNotificationsController.clearAll);

  app.get("/admin/notifications/push/config", { preHandler: requireAdmin }, AdminNotificationsController.pushConfig);
  app.post("/admin/notifications/push/subscriptions", { preHandler: requireAdmin }, AdminNotificationsController.subscribe);
  app.delete("/admin/notifications/push/subscriptions", { preHandler: requireAdmin }, AdminNotificationsController.unsubscribe);
}
