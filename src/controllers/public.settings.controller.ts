import type { FastifyReply, FastifyRequest } from "fastify";
import { supabase } from "../configs/supabase.js";

export const PublicSettingsController = {
  async get(req: FastifyRequest, reply: FastifyReply) {
    const { data, error } = await supabase.from("settings").select("key,value");

    if (error) return reply.code(500).send({ message: "DB error", details: error.message });

    const settings: Record<string, string | null> = {};
    for (const row of data ?? []) settings[row.key] = row.value;

    return reply.send({ settings });
  },
};
