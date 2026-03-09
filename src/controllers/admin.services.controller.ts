import type { FastifyReply, FastifyRequest } from "fastify";
import { supabase } from "../configs/supabase.js";
import { buildPaginationMeta, resolvePagination } from "../services/common/pagination.js";
import { ServiceCreateSchema, ServiceUpdateSchema } from "../services/services/services.schemas.js";

type ServiceListQuery = {
  page?: string;
  pageSize?: string;
  all?: string;
  search?: string;
  status?: "all" | "active" | "hidden";
};

function normalizeSearch(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeStatus(value: unknown): "all" | "active" | "hidden" {
  if (value === "active" || value === "hidden") {
    return value;
  }

  return "all";
}

function toSearchPattern(value: string) {
  return `%${value.replace(/,/g, " ").replace(/[()]/g, " ").trim()}%`;
}

function applyServiceListFilters(
  query: any,
  options: {
    status: "all" | "active" | "hidden";
    search: string;
  },
) {
  let nextQuery = query;

  if (options.status === "active") {
    nextQuery = nextQuery.eq("is_active", true);
  }

  if (options.status === "hidden") {
    nextQuery = nextQuery.eq("is_active", false);
  }

  if (options.search) {
    const pattern = toSearchPattern(options.search);
    nextQuery = nextQuery.or(
      `title.ilike.${pattern},slug.ilike.${pattern},short_description.ilike.${pattern},description.ilike.${pattern}`,
    );
  }

  return nextQuery;
}

async function countServices(filter?: boolean) {
  let query = supabase.from("services").select("*", { count: "exact", head: true });

  if (typeof filter === "boolean") {
    query = query.eq("is_active", filter);
  }

  const { count, error } = await query;

  if (error) throw error;

  return count ?? 0;
}

export const AdminServicesController = {
  async list(req: FastifyRequest, reply: FastifyReply) {
    const query = (req.query as ServiceListQuery | undefined) ?? {};
    const pagination = resolvePagination(query, { defaultPageSize: 3, maxPageSize: 100 });
    const status = normalizeStatus(query.status);
    const search = normalizeSearch(query.search);

    let listQuery = applyServiceListFilters(supabase.from("services").select("*", { count: "exact" }), {
      status,
      search,
    })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (!pagination.all) {
      listQuery = listQuery.range(pagination.from, pagination.to);
    }

    const [{ data, error, count }, totalCount, activeCount, hiddenCount] = await Promise.all([
      listQuery,
      countServices(),
      countServices(true),
      countServices(false),
    ]);

    if (error) return reply.code(500).send({ message: "DB error", details: error.message });

    const total = pagination.all ? (data ?? []).length : count ?? 0;
    const meta = buildPaginationMeta(
      total,
      pagination.all ? 1 : pagination.page,
      pagination.all ? Math.max(1, (data ?? []).length || 1) : pagination.pageSize,
    );

    return reply.send({
      services: data ?? [],
      ...meta,
      summary: {
        total: totalCount,
        active: activeCount,
        hidden: hiddenCount,
      },
    });
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
