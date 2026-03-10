import type { FastifyReply, FastifyRequest } from "fastify";
import { supabase } from "../configs/supabase.js";
import { MessageCreateSchema } from "../services/messages/messages.schemas.js";
import { createAdminNotificationFromMessage, sendAdminNotificationPush } from "../services/notifications/notifications.service.js";

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

    try {
      const notification = await createAdminNotificationFromMessage(data);
      await sendAdminNotificationPush(notification);
    } catch (notificationError) {
      req.log.error({ err: notificationError }, "Failed to create admin notification for new message");
    }

    return reply.code(201).send({ message: data });
  },
};
