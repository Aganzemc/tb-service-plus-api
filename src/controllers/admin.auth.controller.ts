import type { FastifyReply, FastifyRequest } from "fastify";
import { AdminLoginSchema } from "../services/admin/admin.schemas.js";
import { findAdminByEmail, verifyAdminPassword } from "../services/admin/admin.service.js";
import { signAccessToken } from "../configs/jwt.js";

export const AdminAuthController = {
  async login(req: FastifyRequest, reply: FastifyReply) {
    const parsed = AdminLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", details: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;
    const admin = await findAdminByEmail(email);
    if (!admin) return reply.code(401).send({ message: "Invalid credentials" });

    const ok = await verifyAdminPassword(password, admin.password_hash);
    if (!ok) return reply.code(401).send({ message: "Invalid credentials" });

    const accessToken = await signAccessToken({ sub: admin.id, role: admin.role, email: admin.email });

    return reply.send({
      admin: { id: admin.id, email: admin.email, role: admin.role },
      accessToken,
    });
  },

  async me(req: FastifyRequest, reply: FastifyReply) {
    if (!req.admin) return reply.code(401).send({ message: "Unauthorized" });
    return reply.send({ admin: req.admin });
  },
};
