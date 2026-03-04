import type { FastifyInstance } from "fastify";
import { AdminAuthController } from "../controllers/admin.auth.controller.js";
import { requireAdmin } from "../services/auth/auth.middleware.js";

export async function adminAuthRoutes(app: FastifyInstance) {
  app.post("/admin/login", AdminAuthController.login);
  app.get("/admin/me", { preHandler: requireAdmin }, AdminAuthController.me);
}
