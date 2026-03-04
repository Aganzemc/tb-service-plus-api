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
  if (!auth?.startsWith("Bearer ")) {
    return reply.code(401).send({ message: "Missing Authorization header" });
  }

  const token = auth.slice("Bearer ".length).trim();

  try {
    const payload = await verifyAccessToken(token);

    const role = (payload as any).role ?? null;
    if (role !== "admin" && role !== "super_admin") {
      return reply.code(403).send({ message: "Forbidden" });
    }

    req.admin = {
      adminId: String(payload.sub),
      role: role ? String(role) : null,
      email: (payload as any).email ? String((payload as any).email) : null,
    };
  } catch {
    return reply.code(401).send({ message: "Invalid token" });
  }
}
