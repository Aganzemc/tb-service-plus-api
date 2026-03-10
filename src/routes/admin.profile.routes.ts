import type { FastifyInstance } from "fastify";
import { AdminProfileController } from "../controllers/admin.profile.controller.js";
import { requireAdmin } from "../services/auth/auth.middleware.js";

export async function adminProfileRoutes(app: FastifyInstance) {
  app.get("/admin/profile", { preHandler: requireAdmin }, AdminProfileController.get);
  app.patch("/admin/profile", { preHandler: requireAdmin }, AdminProfileController.update);
}
