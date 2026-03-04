import type { FastifyInstance } from "fastify";
import { AdminAdminsController } from "../controllers/admin.admins.controller.js";
import { requireSuperAdmin } from "../services/auth/auth.middleware.js";

export async function adminAdminsRoutes(app: FastifyInstance) {
  app.post("/admin/bootstrap", AdminAdminsController.bootstrap);

  app.post("/admin/admins", { preHandler: requireSuperAdmin }, AdminAdminsController.create);
  app.patch("/admin/admins/:id", { preHandler: requireSuperAdmin }, AdminAdminsController.update);
}
