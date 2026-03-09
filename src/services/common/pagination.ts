export type PaginationRequest =
  | {
      all: true;
    }
  | {
      all: false;
      page: number;
      pageSize: number;
      from: number;
      to: number;
    };

type ResolvePaginationOptions = {
  defaultPageSize: number;
  maxPageSize?: number;
};

function parsePositiveInteger(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

function parseAllQuery(value: unknown) {
  return value === true || value === "true" || value === "1";
}

export function resolvePagination(
  query: Record<string, unknown> | undefined,
  options: ResolvePaginationOptions,
): PaginationRequest {
  if (parseAllQuery(query?.all)) {
    return { all: true };
  }

  const page = parsePositiveInteger(query?.page, 1);
  const requestedPageSize = parsePositiveInteger(query?.pageSize, options.defaultPageSize);
  const pageSize = Math.min(requestedPageSize, options.maxPageSize ?? requestedPageSize);
  const safePageSize = Math.max(1, pageSize);
  const from = (page - 1) * safePageSize;

  return {
    all: false,
    page,
    pageSize: safePageSize,
    from,
    to: from + safePageSize - 1,
  };
}

export function buildPaginationMeta(total: number, page: number, pageSize: number) {
  const safeTotal = Math.max(0, total);
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize));

  return {
    page: Math.min(Math.max(1, page), totalPages),
    pageSize: safePageSize,
    total: safeTotal,
    totalPages,
  };
}
