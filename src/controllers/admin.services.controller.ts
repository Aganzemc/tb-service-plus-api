import type { FastifyReply, FastifyRequest } from "fastify";
import { supabase } from "../configs/supabase.js";
import { ServiceCreateSchema, ServiceUpdateSchema } from "../services/services/services.schemas.js";

export const AdminServicesController = {
  async list(req: FastifyRequest, reply: FastifyReply) {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) return reply.code(500).send({ message: "DB error", details: error.message });
    return reply.send({ services: data ?? [] });
  },

  async create(req: FastifyRequest, reply: FastifyReply) {
    const parsed = ServiceCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", details: parsed.error.flatten() });
    }

    const { data, error } = await supabase.from("services").insert(parsed.data).select("*").single();
    if (error) return reply.code(500).send({ message: "DB error", details: error.message });

    return reply.code(201).send({ service: data });
  },

  async update(req: FastifyRequest, reply: FastifyReply) {
    const id = (req.params as any).id as string;

    const parsed = ServiceUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", details: parsed.error.flatten() });
    }

    const { data, error } = await supabase
      .from("services")
      .update(parsed.data)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) return reply.code(500).send({ message: "DB error", details: error.message });
    if (!data) return reply.code(404).send({ message: "Service not found" });

    return reply.send({ service: data });
  },

  async remove(req: FastifyRequest, reply: FastifyReply) {
    const id = (req.params as any).id as string;

    const { data, error } = await supabase.from("services").delete().eq("id", id).select("*").maybeSingle();

    if (error) return reply.code(500).send({ message: "DB error", details: error.message });
    if (!data) return reply.code(404).send({ message: "Service not found" });

    return reply.send({ deleted: true });
  },
};
