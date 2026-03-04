import type { FastifyInstance } from "fastify";
import { AdminMessagesController } from "../controllers/admin.messages.controller.js";
import { requireAdmin } from "../services/auth/auth.middleware.js";

export async function adminMessagesRoutes(app: FastifyInstance) {
  app.get("/admin/messages", { preHandler: requireAdmin }, AdminMessagesController.list);
  app.patch("/admin/messages/:id", { preHandler: requireAdmin }, AdminMessagesController.update);
  app.delete("/admin/messages/:id", { preHandler: requireAdmin }, AdminMessagesController.remove);
}
