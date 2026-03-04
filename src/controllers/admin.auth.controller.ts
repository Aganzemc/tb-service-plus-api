import type { FastifyReply, FastifyRequest } from "fastify";
import crypto from "crypto";
import { AdminLoginSchema, AdminLogoutSchema, AdminRefreshSchema } from "../services/admin/admin.schemas.js";
import { findAdminByEmail, findAdminById, verifyAdminPassword } from "../services/admin/admin.service.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../configs/jwt.js";
import {
  createAdminSession,
  hashRefreshToken,
  revokeAdminSessionByHash,
  rotateAdminSession,
} from "../services/auth/admin.sessions.service.js";

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

    const sid = crypto.randomUUID();
    const refreshToken = await signRefreshToken({ sub: admin.id, sid });
    await createAdminSession({ adminId: admin.id, sid, refreshToken });

    const accessToken = await signAccessToken({ sub: admin.id, role: admin.role, email: admin.email });

    return reply.send({
      admin: { id: admin.id, email: admin.email, role: admin.role },
      accessToken,
      refreshToken,
    });
  },

  async refresh(req: FastifyRequest, reply: FastifyReply) {
    const parsed = AdminRefreshSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", details: parsed.error.flatten() });
    }

    const { refreshToken } = parsed.data;

    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      return reply.code(401).send({ message: "Invalid refresh token" });
    }

    const adminId = String(payload.sub);
    const currentSid = String((payload as any).sid ?? "");
    if (!currentSid) return reply.code(401).send({ message: "Invalid refresh token" });

    const nextSid = crypto.randomUUID();
    const nextRefreshToken = await signRefreshToken({ sub: adminId, sid: nextSid });

    const rotated = await rotateAdminSession({
      currentSid,
      adminId,
      currentRefreshToken: refreshToken,
      nextSid,
      nextRefreshToken,
    });

    if (!rotated) return reply.code(401).send({ message: "Invalid refresh token" });

    const admin = await findAdminById(adminId);
    if (!admin) return reply.code(401).send({ message: "Invalid refresh token" });

    const accessToken = await signAccessToken({ sub: admin.id, role: admin.role, email: admin.email });

    return reply.send({ accessToken, refreshToken: nextRefreshToken });
  },

  async logout(req: FastifyRequest, reply: FastifyReply) {
    const parsed = AdminLogoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", details: parsed.error.flatten() });
    }

    const { refreshToken } = parsed.data;

    try {
      await verifyRefreshToken(refreshToken);
    } catch {
      return reply.code(401).send({ message: "Invalid refresh token" });
    }

    const hash = hashRefreshToken(refreshToken);
    await revokeAdminSessionByHash(hash);
    return reply.send({ ok: true });
  },

  async me(req: FastifyRequest, reply: FastifyReply) {
    if (!req.admin) return reply.code(401).send({ message: "Unauthorized" });
    return reply.send({ admin: req.admin });
  },
};
