import type { FastifyReply, FastifyRequest } from "fastify";
import { supabase } from "../configs/supabase.js";
import { MessageUpdateSchema } from "../services/messages/messages.schemas.js";

export const AdminMessagesController = {
  async list(req: FastifyRequest, reply: FastifyReply) {
    const { data, error } = await supabase.from("messages").select("*").order("created_at", { ascending: false });

    if (error) return reply.code(500).send({ message: "DB error", details: error.message });
    return reply.send({ messages: data ?? [] });
  },

  async update(req: FastifyRequest, reply: FastifyReply) {
    const id = (req.params as any).id as string;

    const parsed = MessageUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", details: parsed.error.flatten() });
    }

    const { data, error } = await supabase
      .from("messages")
      .update(parsed.data)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) return reply.code(500).send({ message: "DB error", details: error.message });
    if (!data) return reply.code(404).send({ message: "Message not found" });

    return reply.send({ message: data });
  },

  async remove(req: FastifyRequest, reply: FastifyReply) {
    const id = (req.params as any).id as string;

    const { data, error } = await supabase.from("messages").delete().eq("id", id).select("*").maybeSingle();

    if (error) return reply.code(500).send({ message: "DB error", details: error.message });
    if (!data) return reply.code(404).send({ message: "Message not found" });

    return reply.send({ deleted: true });
  },
};
