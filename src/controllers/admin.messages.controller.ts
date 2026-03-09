import type { FastifyReply, FastifyRequest } from "fastify";
import { supabase } from "../configs/supabase.js";
import { buildPaginationMeta, resolvePagination } from "../services/common/pagination.js";
import { MessageUpdateSchema } from "../services/messages/messages.schemas.js";

type MessageListQuery = {
  page?: string;
  pageSize?: string;
  all?: string;
  search?: string;
  filter?: "all" | "read" | "unread";
};

function normalizeSearch(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeFilter(value: unknown): "all" | "read" | "unread" {
  if (value === "read" || value === "unread") {
    return value;
  }

  return "all";
}

function toSearchPattern(value: string) {
  return `%${value.replace(/,/g, " ").replace(/[()]/g, " ").trim()}%`;
}

function applyMessageListFilters(
  query: ReturnType<typeof supabase.from>,
  options: {
    filter: "all" | "read" | "unread";
    search: string;
  },
) {
  let nextQuery = query;

  if (options.filter === "read") {
    nextQuery = nextQuery.eq("is_read", true);
  }

  if (options.filter === "unread") {
    nextQuery = nextQuery.eq("is_read", false);
  }

  if (options.search) {
    const pattern = toSearchPattern(options.search);
    nextQuery = nextQuery.or(
      `name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},message.ilike.${pattern}`,
    );
  }

  return nextQuery;
}

async function countMessages(filter?: boolean) {
  let query = supabase.from("messages").select("*", { count: "exact", head: true });

  if (typeof filter === "boolean") {
    query = query.eq("is_read", filter);
  }

  const { count, error } = await query;

  if (error) throw error;

  return count ?? 0;
}

export const AdminMessagesController = {
  async list(req: FastifyRequest, reply: FastifyReply) {
    const query = (req.query as MessageListQuery | undefined) ?? {};
    const pagination = resolvePagination(query, { defaultPageSize: 5, maxPageSize: 100 });
    const filter = normalizeFilter(query.filter);
    const search = normalizeSearch(query.search);

    let listQuery = applyMessageListFilters(supabase.from("messages").select("*", { count: "exact" }), {
      filter,
      search,
    }).order("created_at", { ascending: false });

    if (!pagination.all) {
      listQuery = listQuery.range(pagination.from, pagination.to);
    }

    const [{ data, error, count }, totalCount, readCount, unreadCount] = await Promise.all([
      listQuery,
      countMessages(),
      countMessages(true),
      countMessages(false),
    ]);

    if (error) return reply.code(500).send({ message: "DB error", details: error.message });

    const total = pagination.all ? (data ?? []).length : count ?? 0;
    const meta = buildPaginationMeta(
      total,
      pagination.all ? 1 : pagination.page,
      pagination.all ? Math.max(1, (data ?? []).length || 1) : pagination.pageSize,
    );

    return reply.send({
      messages: data ?? [],
      ...meta,
      summary: {
        total: totalCount,
        read: readCount,
        unread: unreadCount,
      },
    });
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
