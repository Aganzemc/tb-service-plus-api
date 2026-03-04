import type { FastifyReply, FastifyRequest } from "fastify";
import { supabase } from "../configs/supabase.js";
import { SettingsUpsertSchema } from "../services/settings/settings.schemas.js";

export const AdminSettingsController = {
  async get(req: FastifyRequest, reply: FastifyReply) {
    const { data, error } = await supabase.from("settings").select("key,value");

    if (error) return reply.code(500).send({ message: "DB error", details: error.message });

    const settings: Record<string, string | null> = {};
    for (const row of data ?? []) settings[row.key] = row.value;

    return reply.send({ settings });
  },

  async upsert(req: FastifyRequest, reply: FastifyReply) {
    const parsed = SettingsUpsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Invalid body", details: parsed.error.flatten() });
    }

    const entries = Object.entries(parsed.data).map(([key, value]) => ({ key, value }));
    if (entries.length === 0) return reply.send({ updated: 0 });

    const { error } = await supabase.from("settings").upsert(entries, { onConflict: "key" });
    if (error) return reply.code(500).send({ message: "DB error", details: error.message });

    return reply.send({ updated: entries.length });
  },
};
