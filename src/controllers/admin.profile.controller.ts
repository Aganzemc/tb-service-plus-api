import type { FastifyReply, FastifyRequest } from "fastify";
import { signAccessToken } from "../configs/jwt.js";
import { AdminProfileUpdateSchema } from "../services/admin/admin.schemas.js";
import { findAdminById, updateAdmin, verifyAdminPassword } from "../services/admin/admin.service.js";

function toAdminProfile(admin: {
  id: string;
  email: string;
  role: string;
  created_at: string;
}) {
  return {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    created_at: admin.created_at,
  };
}

export const AdminProfileController = {
  async get(req: FastifyRequest, reply: FastifyReply) {
    if (!req.admin) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    try {
      const admin = await findAdminById(req.admin.adminId);

      if (!admin) {
        return reply.code(404).send({ message: "Admin not found" });
      }

      return reply.send({ admin: toAdminProfile(admin) });
    } catch (error: unknown) {
      const maybe = error as { message?: unknown } | null;

      return reply.code(500).send({
        message: "DB error",
        details: typeof maybe?.message === "string" ? maybe.message : "Unable to load profile",
      });
    }
  },

  async update(req: FastifyRequest, reply: FastifyReply) {
    if (!req.admin) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const parsed = AdminProfileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", details: parsed.error.flatten() });
    }

    try {
      const admin = await findAdminById(req.admin.adminId);
      if (!admin) {
        return reply.code(404).send({ message: "Admin not found" });
      }

      const nextEmail = parsed.data.email?.trim();
      const wantsEmailChange = Boolean(nextEmail && nextEmail !== admin.email);
      const wantsPasswordChange = typeof parsed.data.newPassword === "string" && parsed.data.newPassword.length > 0;

      if (!wantsEmailChange && !wantsPasswordChange) {
        return reply.code(400).send({ message: "No profile changes detected" });
      }

      const isCurrentPasswordValid = await verifyAdminPassword(parsed.data.currentPassword ?? "", admin.password_hash);
      if (!isCurrentPasswordValid) {
        return reply.code(401).send({ message: "Current password is invalid" });
      }

      const updated = await updateAdmin(admin.id, {
        email: wantsEmailChange ? nextEmail : undefined,
        password: wantsPasswordChange ? parsed.data.newPassword : undefined,
      });

      if (!updated) {
        return reply.code(404).send({ message: "Admin not found" });
      }

      const accessToken = await signAccessToken({
        sub: updated.id,
        role: updated.role,
        email: updated.email,
      });

      return reply.send({
        admin: toAdminProfile(updated),
        accessToken,
      });
    } catch (error: unknown) {
      const message = String((error as { message?: unknown } | null)?.message ?? "");

      if (message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("unique")) {
        return reply.code(409).send({ message: "Email already exists" });
      }

      return reply.code(500).send({
        message: "DB error",
        details: message || "Unable to update profile",
      });
    }
  },
};
