export type PaginatedRecords<T> = {
  records: T[];
  has_previous_page?: boolean;
  has_next_page?: boolean;
  first_id?: number;
  last_id?: number;
  total_count?: number;
};

export type OffsetPage<T> = PaginatedRecords<T> & {
  page: number;
  perPage: number;
};

export type OffsetPaginationConfig<T> = {
  fetchPage: (params: { page: number; perPage: number }) => Promise<PaginatedRecords<T>>;
  page?: number;
  perPage?: number;
  maxPages?: number;
  maxItems?: number;
};

export type IdWindowDirection = "previous" | "next";

export type IdWindowPage<T> = PaginatedRecords<T> & {
  id?: number;
  perPage: number;
  direction: IdWindowDirection;
};

export type IdWindowPaginationConfig<T> = {
  fetchPage: (params: {
    id?: number;
    previousPerPage?: number;
    nextPerPage?: number;
  }) => Promise<PaginatedRecords<T>>;
  id?: number;
  perPage?: number;
  direction?: IdWindowDirection;
  maxPages?: number;
  maxItems?: number;
};

export async function* paginateOffset<T>(
  config: OffsetPaginationConfig<T>,
): AsyncIterable<OffsetPage<T>> {
  const perPage = config.perPage ?? 20;
  let page = config.page ?? 1;
  let pageCount = 0;
  let itemCount = 0;

  while (true) {
    if (config.maxPages !== undefined && pageCount >= config.maxPages) {
      break;
    }

    const response = await config.fetchPage({ page, perPage });
    const records = Array.isArray(response.records) ? response.records : [];
    if (records.length === 0) {
      break;
    }

    const { trimmed, added, reachedMax } = trimRecords(records, itemCount, config.maxItems);
    if (added === 0) {
      break;
    }

    pageCount += 1;
    itemCount += added;

    yield { ...response, records: trimmed, page, perPage };

    if (reachedMax) {
      break;
    }

    if (response.has_next_page === false) {
      break;
    }

    if (response.has_next_page !== true && trimmed.length < perPage) {
      break;
    }

    page += 1;
  }
}

export async function* paginateByIdWindow<T>(
  config: IdWindowPaginationConfig<T>,
): AsyncIterable<IdWindowPage<T>> {
  const perPage = config.perPage ?? 20;
  const direction = config.direction ?? "previous";
  let cursorId = config.id;
  let pageCount = 0;
  let itemCount = 0;

  while (true) {
    if (config.maxPages !== undefined && pageCount >= config.maxPages) {
      break;
    }

    const response = await config.fetchPage({
      ...(cursorId !== undefined ? { id: cursorId } : {}),
      ...(direction === "previous" ? { previousPerPage: perPage } : {}),
      ...(direction === "next" ? { nextPerPage: perPage } : {}),
    });

    const records = Array.isArray(response.records) ? response.records : [];
    if (records.length === 0) {
      break;
    }

    const { trimmed, added, reachedMax } = trimRecords(records, itemCount, config.maxItems);
    if (added === 0) {
      break;
    }

    pageCount += 1;
    itemCount += added;

    const page = {
      ...response,
      records: trimmed,
      ...(cursorId !== undefined ? { id: cursorId } : {}),
      perPage,
      direction,
    };
    yield page;

    if (reachedMax) {
      break;
    }

    if (direction === "previous") {
      if (response.has_previous_page === false) {
        break;
      }
      if (response.first_id === undefined) {
        break;
      }
      if (response.first_id === cursorId) {
        break;
      }
      cursorId = response.first_id;
      continue;
    }

    if (response.has_next_page === false) {
      break;
    }
    if (response.last_id === undefined) {
      break;
    }
    if (response.last_id === cursorId) {
      break;
    }
    cursorId = response.last_id;
  }
}

export async function* toAsyncIterator<T>(
  pages: AsyncIterable<{ records: T[] }>,
  options: { maxItems?: number } = {},
): AsyncIterable<T> {
  let count = 0;
  for await (const page of pages) {
    const records = Array.isArray(page.records) ? page.records : [];
    for (const record of records) {
      if (options.maxItems !== undefined && count >= options.maxItems) {
        return;
      }
      count += 1;
      yield record;
    }
  }
}

function trimRecords<T>(records: T[], itemCount: number, maxItems?: number) {
  if (maxItems === undefined) {
    return { trimmed: records, added: records.length, reachedMax: false };
  }

  const remaining = maxItems - itemCount;
  if (remaining <= 0) {
    return { trimmed: [], added: 0, reachedMax: true };
  }

  if (records.length > remaining) {
    return { trimmed: records.slice(0, remaining), added: remaining, reachedMax: true };
  }

  return { trimmed: records, added: records.length, reachedMax: false };
}
