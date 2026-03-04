import type { FastifyInstance } from "fastify";
import { AdminServicesController } from "../controllers/admin.services.controller.js";
import { requireAdmin } from "../services/auth/auth.middleware.js";

export async function adminServicesRoutes(app: FastifyInstance) {
  app.get("/admin/services", { preHandler: requireAdmin }, AdminServicesController.list);
  app.post("/admin/services", { preHandler: requireAdmin }, AdminServicesController.create);
  app.patch("/admin/services/:id", { preHandler: requireAdmin }, AdminServicesController.update);
  app.delete("/admin/services/:id", { preHandler: requireAdmin }, AdminServicesController.remove);
}
