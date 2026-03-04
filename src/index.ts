import "dotenv/config";

import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";

import { env } from "./configs/env.js";

import { publicServicesRoutes } from "./routes/public.services.routes.js";
import { publicSettingsRoutes } from "./routes/public.settings.routes.js";
import { publicMessagesRoutes } from "./routes/public.messages.routes.js";

import { adminAuthRoutes } from "./routes/admin.auth.routes.js";
import { adminServicesRoutes } from "./routes/admin.services.routes.js";
import { adminMessagesRoutes } from "./routes/admin.messages.routes.js";
import { adminSettingsRoutes } from "./routes/admin.settings.routes.js";

const app = Fastify({ logger: true });

app.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
});
app.register(sensible);

// =========================
// ROUTES
// =========================
app.register(publicServicesRoutes, { prefix: "/api" });
app.register(publicSettingsRoutes, { prefix: "/api" });
app.register(publicMessagesRoutes, { prefix: "/api" });

app.register(adminAuthRoutes, { prefix: "/api" });
app.register(adminServicesRoutes, { prefix: "/api" });
app.register(adminMessagesRoutes, { prefix: "/api" });
app.register(adminSettingsRoutes, { prefix: "/api" });

// =========================
// HEALTH / ROOT
// =========================
app.get("/", async () => ({
  message: "Hello from Fastify! Welcome to TB Service Plus API",
}));

// =========================
// SERVER
// =========================
const port = env.PORT || 4000;
app.listen({ port: Number(port) }, () => {
  console.log(`Server listening at ${port}`);
});
