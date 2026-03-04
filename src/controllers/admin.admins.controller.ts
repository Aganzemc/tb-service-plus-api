import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../configs/env.js";
import { signAccessToken } from "../configs/jwt.js";
import { supabase } from "../configs/supabase.js";
import {
  AdminBootstrapSchema,
  AdminCreateSchema,
  AdminUpdateSchema,
} from "../services/admin/admin.schemas.js";
import { createAdmin, updateAdmin } from "../services/admin/admin.service.js";

export const AdminAdminsController = {
  async bootstrap(req: FastifyRequest, reply: FastifyReply) {
    const parsed = AdminBootstrapSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", details: parsed.error.flatten() });
    }

    if (!env.ADMIN_BOOTSTRAP_SECRET) {
      return reply.code(500).send({ message: "ADMIN_BOOTSTRAP_SECRET not configured" });
    }

    if (parsed.data.secret !== env.ADMIN_BOOTSTRAP_SECRET) {
      return reply.code(401).send({ message: "Invalid secret" });
    }

    const { data: existing, error: eErr } = await supabase.from("admins").select("id").limit(1);
    if (eErr) return reply.code(500).send({ message: "DB error", details: eErr.message });
    if ((existing ?? []).length > 0) {
      return reply.code(409).send({ message: "Admins already exist" });
    }

    const admin = await createAdmin({
      email: parsed.data.email,
      password: parsed.data.password,
      role: "super_admin",
    });

    const accessToken = await signAccessToken({ sub: admin.id, role: admin.role, email: admin.email });

    return reply.code(201).send({
      admin: { id: admin.id, email: admin.email, role: admin.role },
      accessToken,
    });
  },

  async create(req: FastifyRequest, reply: FastifyReply) {
    const parsed = AdminCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", details: parsed.error.flatten() });
    }

    try {
      const admin = await createAdmin(parsed.data);
      return reply.code(201).send({ admin: { id: admin.id, email: admin.email, role: admin.role } });
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
        return reply.code(409).send({ message: "Email already exists" });
      }
      return reply.code(500).send({ message: "DB error", details: msg });
    }
  },

  async update(req: FastifyRequest, reply: FastifyReply) {
    const id = (req.params as any).id as string;

    const parsed = AdminUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", details: parsed.error.flatten() });
    }

    try {
      const admin = await updateAdmin(id, parsed.data);
      if (!admin) return reply.code(404).send({ message: "Admin not found" });
      return reply.send({ admin: { id: admin.id, email: admin.email, role: admin.role } });
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
        return reply.code(409).send({ message: "Email already exists" });
      }
      return reply.code(500).send({ message: "DB error", details: msg });
    }
  },
};
