import type { FastifyInstance } from "fastify";
import { PublicServicesController } from "../controllers/public.services.controller.js";

export async function publicServicesRoutes(app: FastifyInstance) {
  app.get("/services", PublicServicesController.list);
  app.get("/services/:slug", PublicServicesController.bySlug);
}
