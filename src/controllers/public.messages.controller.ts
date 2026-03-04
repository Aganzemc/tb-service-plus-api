import type { FastifyReply, FastifyRequest } from "fastify";
import { supabase } from "../configs/supabase.js";
import { MessageCreateSchema } from "../services/messages/messages.schemas.js";

export const PublicMessagesController = {
  async create(req: FastifyRequest, reply: FastifyReply) {
    const parsed = MessageCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", details: parsed.error.flatten() });
    }

    const { name, phone, email, message } = parsed.data;

    const { data, error } = await supabase
      .from("messages")
      .insert({
        name,
        phone: phone ?? null,
        email: email ?? null,
        message,
      })
      .select("*")
      .single();

    if (error) return reply.code(500).send({ message: "DB error", details: error.message });
    return reply.code(201).send({ message: data });
  },
};
