import type { FastifyInstance } from "fastify";
import { PublicMessagesController } from "../controllers/public.messages.controller.js";

export async function publicMessagesRoutes(app: FastifyInstance) {
  app.post("/messages", PublicMessagesController.create);
}
