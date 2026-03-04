import type { FastifyReply, FastifyRequest } from "fastify";
import { supabase } from "../configs/supabase.js";

export const PublicServicesController = {
  async list(req: FastifyRequest, reply: FastifyReply) {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) return reply.code(500).send({ message: "DB error", details: error.message });
    return reply.send({ services: data ?? [] });
  },

  async bySlug(req: FastifyRequest, reply: FastifyReply) {
    const slug = (req.params as any).slug as string;

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error) return reply.code(500).send({ message: "DB error", details: error.message });
    if (!data) return reply.code(404).send({ message: "Service not found" });

    return reply.send({ service: data });
  },
};
