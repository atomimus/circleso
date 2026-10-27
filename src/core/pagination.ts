import { CircleConfigError, CircleNetworkError, CircleSdkError } from "./errors";

export type PaginatedRecords<T> = {
  records: T[];
  has_previous_page?: boolean;
  has_next_page?: boolean;
  first_id?: number;
  last_id?: number;
  total_count?: number;
};

/** Optional schema fields and empty HTTP successes are normalized by the paginator. */
export type PaginationResponse<T> = Omit<PaginatedRecords<T>, "records"> & {
  records?: T[] | null;
  per_page?: number;
};

export type PaginationLimits = {
  maxPages?: number;
  maxItems?: number;
  signal?: AbortSignal;
};

export type OffsetPage<T> = PaginatedRecords<T> & { page: number; perPage: number };
export type OffsetPaginationConfig<T> = PaginationLimits & {
  fetchPage: (params: {
    page: number;
    perPage: number;
    signal?: AbortSignal;
  }) => Promise<PaginationResponse<T> | undefined>;
  page?: number;
  perPage?: number;
};

export type IdWindowDirection = "previous" | "next";
export type IdWindowPage<T> = PaginatedRecords<T> & {
  id?: number;
  perPage: number;
  direction: IdWindowDirection;
};
export type IdWindowPaginationConfig<T> = PaginationLimits & {
  fetchPage: (params: {
    id?: number;
    previousPerPage?: number;
    nextPerPage?: number;
    signal?: AbortSignal;
  }) => Promise<PaginationResponse<T> | undefined>;
  id?: number;
  perPage?: number;
  direction?: IdWindowDirection;
};

export type SearchAfterCursor = readonly (string | number)[];
export type SearchAfterResponse<T> = PaginationResponse<T> & {
  next_search_after?: SearchAfterCursor | null;
};
export type SearchAfterPage<T> = PaginatedRecords<T> & {
  searchAfter?: SearchAfterCursor;
  next_search_after?: SearchAfterCursor | null;
  perPage: number;
};
export type SearchAfterPaginationConfig<T> = PaginationLimits & {
  fetchPage: (params: {
    searchAfter?: SearchAfterCursor;
    perPage: number;
    signal?: AbortSignal;
  }) => Promise<SearchAfterResponse<T> | undefined>;
  searchAfter?: SearchAfterCursor;
  perPage?: number;
};

export async function* paginateOffset<T>(
  config: OffsetPaginationConfig<T>,
): AsyncIterable<OffsetPage<T>> {
  try {
    validate(config);
    const perPage = positive(config.perPage === undefined ? 20 : config.perPage, "perPage");
    let page = positive(config.page === undefined ? 1 : config.page, "page");
    let itemCount = 0;
    for (let pageCount = 0; withinLimits(config, pageCount, itemCount); pageCount++) {
      checkSignal(config.signal);
      const response = pageData(await config.fetchPage({ page, perPage, ...signalOption(config) }));
      checkSignal(config.signal);
      const records = trimRecords(response.records, itemCount, config.maxItems);
      itemCount += records.length;
      if (records.length) yield { ...response, records, page, perPage };
      if (!withinLimits(config, pageCount + 1, itemCount) || response.has_next_page === false)
        return;
      // Explicit continuation wins over short/empty pages, including a server page-size cap.
      if (
        response.has_next_page !== true &&
        response.records.length < (response.per_page ?? perPage)
      )
        return;
      if (!Number.isSafeInteger(page + 1))
        throw new CircleConfigError("Pagination page exceeds the safe integer range.");
      page++;
    }
  } catch (cause) {
    throw iteratorError(cause);
  }
}

export async function* paginateByIdWindow<T>(
  config: IdWindowPaginationConfig<T>,
): AsyncIterable<IdWindowPage<T>> {
  try {
    validate(config);
    const perPage = positive(config.perPage === undefined ? 20 : config.perPage, "perPage");
    const direction = config.direction === undefined ? "previous" : config.direction;
    if (direction !== "previous" && direction !== "next")
      throw new CircleConfigError("direction must be previous or next.");
    let id = config.id;
    if (id !== undefined) positive(id, "id");
    const seen = new Set<number>(id === undefined ? [] : [id]);
    let itemCount = 0;
    for (let pageCount = 0; withinLimits(config, pageCount, itemCount); pageCount++) {
      checkSignal(config.signal);
      const response = pageData(
        await config.fetchPage({
          ...(id !== undefined ? { id } : {}),
          ...(direction === "previous" ? { previousPerPage: perPage } : { nextPerPage: perPage }),
          ...signalOption(config),
        }),
      );
      checkSignal(config.signal);
      const records = trimRecords(response.records, itemCount, config.maxItems);
      itemCount += records.length;
      if (records.length)
        yield { ...response, records, ...(id !== undefined ? { id } : {}), perPage, direction };
      if (!withinLimits(config, pageCount + 1, itemCount)) return;
      const continues =
        direction === "previous" ? response.has_previous_page : response.has_next_page;
      if (continues === false) return;
      const next = direction === "previous" ? response.first_id : response.last_id;
      if (next === undefined) {
        if (continues === true)
          throw new CircleNetworkError(
            "ID-window response indicates another page but has no cursor.",
            undefined,
          );
        return;
      }
      if (!Number.isSafeInteger(next) || next < 1)
        throw new CircleNetworkError("Invalid ID-window response cursor.", undefined);
      if (seen.has(next))
        throw new CircleNetworkError(
          "ID-window pagination cursor repeated; iteration cannot advance.",
          undefined,
        );
      seen.add(next);
      id = next;
    }
  } catch (cause) {
    throw iteratorError(cause);
  }
}

/** Replays opaque cursor tuples unchanged. Missing/null/empty next_search_after ends the scan. */
export async function* paginateSearchAfter<T>(
  config: SearchAfterPaginationConfig<T>,
): AsyncIterable<SearchAfterPage<T>> {
  try {
    validate(config);
    const perPage = positive(config.perPage === undefined ? 20 : config.perPage, "perPage");
    let searchAfter =
      config.searchAfter === undefined ? undefined : copyCursor(config.searchAfter, true);
    const seen = new Set<string>(searchAfter === undefined ? [] : [JSON.stringify(searchAfter)]);
    let itemCount = 0;
    for (let pageCount = 0; withinLimits(config, pageCount, itemCount); pageCount++) {
      checkSignal(config.signal);
      const raw = await config.fetchPage({
        ...(searchAfter !== undefined ? { searchAfter: [...searchAfter] } : {}),
        perPage,
        ...signalOption(config),
      });
      checkSignal(config.signal);
      const response = pageData(raw);
      const next =
        raw?.next_search_after == null
          ? raw?.next_search_after
          : copyCursor(raw.next_search_after, false);
      const records = trimRecords(response.records, itemCount, config.maxItems);
      itemCount += records.length;
      if (records.length)
        yield {
          ...response,
          records,
          perPage,
          ...(searchAfter !== undefined ? { searchAfter: [...searchAfter] } : {}),
          ...(next !== undefined ? { next_search_after: next === null ? null : [...next] } : {}),
        };
      if (!withinLimits(config, pageCount + 1, itemCount) || next == null || next.length === 0)
        return;
      const key = JSON.stringify(next);
      if (seen.has(key))
        throw new CircleNetworkError(
          "search_after pagination cursor repeated; iteration cannot advance.",
          undefined,
        );
      seen.add(key);
      searchAfter = next;
    }
  } catch (cause) {
    throw iteratorError(cause);
  }
}

export async function* toAsyncIterator<T>(
  pages: AsyncIterable<{ records: T[] }>,
  options: Pick<PaginationLimits, "maxItems" | "signal"> = {},
): AsyncIterable<T> {
  try {
    validateLimits(options);
    if (options.maxItems === 0) return;
    checkSignal(options.signal);
    let count = 0;
    for await (const page of pages) {
      for (const record of pageData(page).records) {
        checkSignal(options.signal);
        count++;
        yield record;
        if (options.maxItems !== undefined && count >= options.maxItems) return;
      }
    }
  } catch (cause) {
    throw iteratorError(cause);
  }
}

/** Shared by the typed resource adapters; HTTP work remains in the existing requester. */
export function offsetItems<T>(
  fetchPage: OffsetPaginationConfig<T>["fetchPage"],
  options: PaginationLimits & { page?: number; per_page?: number },
  maxPerPage?: number,
): AsyncIterable<T> {
  validateLimits(options);
  return toAsyncIterator(
    (async function* () {
      if (
        maxPerPage !== undefined &&
        options.per_page !== undefined &&
        options.per_page > maxPerPage
      )
        throw new CircleConfigError(
          `per_page must not exceed the documented maximum of ${maxPerPage}.`,
        );
      yield* paginateOffset({
        ...options,
        ...(options.per_page !== undefined ? { perPage: options.per_page } : {}),
        fetchPage,
      });
    })(),
    signalOption(options),
  );
}

function validate(config: PaginationLimits & { fetchPage: unknown }) {
  validateLimits(config);
  if (typeof config.fetchPage !== "function")
    throw new CircleConfigError("fetchPage must be a function.");
}
function validateLimits(config: PaginationLimits) {
  if (config === null || typeof config !== "object" || Array.isArray(config))
    throw new CircleConfigError("Pagination options must be an object.");
  for (const name of ["maxPages", "maxItems"] as const) {
    const value = config[name];
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0))
      throw new CircleConfigError(`${name} must be a non-negative safe integer.`);
  }
  const signal = config.signal;
  if (
    signal !== undefined &&
    (!signal ||
      typeof signal.aborted !== "boolean" ||
      typeof signal.addEventListener !== "function" ||
      typeof signal.removeEventListener !== "function")
  )
    throw new CircleConfigError("Pagination signal must be an AbortSignal.");
}
function positive(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new CircleConfigError(`${name} must be a positive safe integer.`);
  return value;
}
function pageData<T>(
  response: PaginationResponse<T> | undefined,
): PaginationResponse<T> & { records: T[] } {
  if (
    response !== undefined &&
    (response === null || typeof response !== "object" || Array.isArray(response))
  )
    throw new CircleNetworkError("Invalid pagination response: expected an object.", undefined);
  const records = response?.records ?? [];
  if (!Array.isArray(records))
    throw new CircleNetworkError(
      "Invalid pagination response: records must be an array.",
      undefined,
    );
  if (
    response?.per_page !== undefined &&
    (!Number.isSafeInteger(response.per_page) || response.per_page < 1)
  )
    throw new CircleNetworkError(
      "Invalid pagination response: per_page must be positive.",
      undefined,
    );
  for (const flag of [response?.has_next_page, response?.has_previous_page])
    if (flag !== undefined && typeof flag !== "boolean")
      throw new CircleNetworkError(
        "Invalid pagination response: continuation flags must be boolean.",
        undefined,
      );
  return { ...response, records };
}
function copyCursor(cursor: SearchAfterCursor, input: boolean): SearchAfterCursor {
  if (
    !Array.isArray(cursor) ||
    Array.from(cursor).some(
      (v) => typeof v !== "string" && !(typeof v === "number" && Number.isSafeInteger(v)),
    )
  ) {
    const message = "search_after must be an array of strings or safe integers.";
    throw input ? new CircleConfigError(message) : new CircleNetworkError(message, undefined);
  }
  return [...cursor];
}
function withinLimits(config: PaginationLimits, pageCount: number, itemCount: number): boolean {
  return (
    (config.maxPages === undefined || pageCount < config.maxPages) &&
    (config.maxItems === undefined || itemCount < config.maxItems)
  );
}
function trimRecords<T>(records: T[], count: number, max?: number): T[] {
  return max === undefined ? records : records.slice(0, Math.max(0, max - count));
}
function signalOption(config: { signal?: AbortSignal }): { signal?: AbortSignal } {
  return config.signal === undefined ? {} : { signal: config.signal };
}
function checkSignal(signal?: AbortSignal) {
  if (signal?.aborted)
    throw new CircleNetworkError("Pagination canceled by caller.", signal.reason);
}
function iteratorError(cause: unknown) {
  return cause instanceof CircleSdkError
    ? cause
    : new CircleNetworkError("Pagination failed.", cause);
}

/** Remove iterator budgets before forwarding flat schema options to a resource requester. */
export function paginationRequestOptions<T extends PaginationLimits>(
  options: T,
): Omit<T, "maxPages" | "maxItems"> {
  validateLimits(options);
  const { maxPages: _maxPages, maxItems: _maxItems, ...request } = options;
  return request;
}
