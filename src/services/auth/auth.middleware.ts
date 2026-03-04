import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "../../configs/jwt.js";

export type AuthedAdmin = {
  adminId: string;
  role: string | null;
  email: string | null;
};

declare module "fastify" {
  interface FastifyRequest {
    admin?: AuthedAdmin;
  }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {

  const auth = req.headers.authorization;

  // Si aucun token → on laisse passer (temporairement)
  if (!auth?.startsWith("Bearer ")) {
    req.admin = {
      adminId: "dev-admin",
      role: "super_admin",
      email: "dev@local"
    };
    return;
  }

  const token = auth.slice("Bearer ".length).trim();

  try {
    const payload = await verifyAccessToken(token);

    req.admin = {
      adminId: String(payload.sub),
      role: (payload as any).role ?? null,
      email: (payload as any).email ?? null,
    };

  } catch {
    return reply.code(401).send({ message: "Invalid token" });
  }
}

export async function requireSuperAdmin(req: FastifyRequest, reply: FastifyReply) {

  await requireAdmin(req, reply);

  if (reply.sent) return;

  if (req.admin?.role !== "super_admin") {
    return reply.code(403).send({ message: "Forbidden" });
  }
}