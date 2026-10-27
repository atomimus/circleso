import { describe, expect, it, vi } from "vitest";
import { paginateByIdWindow, paginateOffset, toAsyncIterator } from "./pagination";

async function collect<T>(iterable: AsyncIterable<T>) {
  const items: T[] = [];
  for await (const item of iterable) {
    items.push(item);
  }
  return items;
}

describe("pagination helpers", () => {
  it("paginateOffset stops when has_next_page is false", async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      records: [1, 2],
      has_next_page: false,
    });

    const pages = await collect(paginateOffset({ fetchPage, perPage: 2 }));
    expect(pages).toHaveLength(1);
    expect(pages[0]?.records).toEqual([1, 2]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("paginateOffset respects maxPages", async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      records: [1],
      has_next_page: true,
    });

    const pages = await collect(paginateOffset({ fetchPage, maxPages: 2 }));
    expect(pages).toHaveLength(2);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("paginateOffset and toAsyncIterator respect maxItems", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ records: [1, 2, 3], has_next_page: true })
      .mockResolvedValueOnce({ records: [4, 5, 6], has_next_page: true });

    const pages = paginateOffset({ fetchPage, perPage: 3, maxItems: 4 });
    const records = await collect(toAsyncIterator(pages));

    expect(records).toEqual([1, 2, 3, 4]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("paginateByIdWindow handles empty records", async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      records: [],
      has_previous_page: false,
      has_next_page: false,
    });

    const pages = await collect(
      paginateByIdWindow({ fetchPage, direction: "previous", perPage: 2 }),
    );

    expect(pages).toHaveLength(0);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("paginateByIdWindow stops when no previous page remains", async () => {
    const fetchPage = vi.fn().mockResolvedValue({
      records: [1, 2],
      has_previous_page: false,
      has_next_page: true,
      first_id: 1,
      last_id: 2,
    });

    const pages = await collect(
      paginateByIdWindow({ fetchPage, direction: "previous", id: 2, perPage: 2 }),
    );

    expect(pages).toHaveLength(1);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});

it.each([0, 2])("does not fetch beyond maxItems=%i", async (maxItems) => {
  const fetchPage = vi.fn().mockResolvedValue({ records: [1, 2], has_next_page: true });
  expect(
    await collect(toAsyncIterator(paginateOffset({ fetchPage, perPage: 2, maxItems }))),
  ).toEqual(maxItems === 0 ? [] : [1, 2]);
  expect(fetchPage).toHaveBeenCalledTimes(maxItems === 0 ? 0 : 1);
});

it("rejects invalid perPage before calling fetchPage", async () => {
  const fetchPage = vi.fn().mockResolvedValue({ records: [] });
  await expect(collect(paginateOffset({ fetchPage, perPage: 0 }))).rejects.toMatchObject({
    name: "CircleConfigError",
  });
  expect(fetchPage).not.toHaveBeenCalled();
});

import { CircleConfigError, CircleNetworkError, CircleTimeoutError } from "./errors";
import { paginateSearchAfter } from "./pagination";

const paginators = [
  paginateOffset<number>,
  paginateByIdWindow<number>,
  paginateSearchAfter<number>,
];
describe("pagination bounds and failure policy", () => {
  for (const paginate of paginators) {
    it.each([
      "maxPages",
      "maxItems",
    ] as const)(`${paginate.name} zero %s does not fetch`, async (limit) => {
      const fetchPage = vi.fn();
      expect(await collect<unknown>(paginate({ fetchPage, [limit]: 0 }))).toEqual([]);
      expect(fetchPage).not.toHaveBeenCalled();
    });
    for (const field of ["maxPages", "maxItems", "perPage"] as const) {
      it.each([
        -1,
        1.5,
        NaN,
        Infinity,
        Number.MAX_SAFE_INTEGER + 1,
      ])(`${paginate.name} rejects ${field}=%s`, async (value) => {
        const fetchPage = vi.fn();
        await expect(
          collect<unknown>(paginate({ fetchPage, [field]: value })),
        ).rejects.toBeInstanceOf(CircleConfigError);
        expect(fetchPage).not.toHaveBeenCalled();
      });
    }
    it(`${paginate.name} preserves SDK errors and normalizes native callback failures`, async () => {
      const native = new TypeError("synthetic adapter failure");
      const fetchPage = vi.fn().mockRejectedValue(native);
      await expect(collect<unknown>(paginate({ fetchPage }))).rejects.toMatchObject({
        name: "CircleNetworkError",
        cause: native,
      });
      const timeout = new CircleTimeoutError("synthetic timeout", 1, native);
      fetchPage.mockRejectedValue(timeout);
      await expect(collect<unknown>(paginate({ fetchPage }))).rejects.toBe(timeout);
    });
    it(`${paginate.name} forwards cancellation and stops before a first fetch`, async () => {
      const controller = new AbortController();
      const cause = { synthetic: "canceled" };
      controller.abort(cause);
      const fetchPage = vi.fn();
      await expect(
        collect<unknown>(paginate({ fetchPage, signal: controller.signal })),
      ).rejects.toMatchObject({ name: "CircleNetworkError", cause });
      expect(fetchPage).not.toHaveBeenCalled();
    });
    it(`${paginate.name} checks cancellation after a custom fetch ignores it`, async () => {
      const controller = new AbortController();
      const fetchPage = vi.fn(async ({ signal }: { signal?: AbortSignal }) => {
        expect(signal).toBe(controller.signal);
        controller.abort("synthetic stop");
        return { records: [1] };
      });
      await expect(
        collect<unknown>(paginate({ fetchPage, signal: controller.signal })),
      ).rejects.toMatchObject({ cause: "synthetic stop" });
    });
    it(`${paginate.name} rejects malformed record collections`, async () => {
      const fetchPage = vi.fn().mockResolvedValue({ records: "invalid" });
      await expect(collect<unknown>(paginate({ fetchPage }))).rejects.toBeInstanceOf(
        CircleNetworkError,
      );
    });
  }
  it.each([0, -1, 1.5, Infinity, NaN])("validates starting pages %s", async (page) => {
    await expect(collect(paginateOffset({ page, fetchPage: vi.fn() }))).rejects.toBeInstanceOf(
      CircleConfigError,
    );
  });
  it("rejects invalid ID direction and anchor", async () => {
    await expect(
      collect(paginateByIdWindow({ direction: "sideways" as "previous", fetchPage: vi.fn() })),
    ).rejects.toBeInstanceOf(CircleConfigError);
    await expect(collect(paginateByIdWindow({ id: 0, fetchPage: vi.fn() }))).rejects.toBeInstanceOf(
      CircleConfigError,
    );
  });
  it("normalizes iterator source/cleanup failures and closes a capped source", async () => {
    const closed = vi.fn();
    async function* pages() {
      try {
        yield { records: [1, 2] };
        throw new Error("should not reach");
      } finally {
        closed();
      }
    }
    expect(await collect(toAsyncIterator(pages(), { maxItems: 1 }))).toEqual([1]);
    expect(closed).toHaveBeenCalledOnce();
    const start = vi.fn();
    async function* zero() {
      start();
      yield { records: [1] };
    }
    expect(await collect(toAsyncIterator(zero(), { maxItems: 0 }))).toEqual([]);
    expect(start).not.toHaveBeenCalled();
    await expect(collect(toAsyncIterator(zero(), { maxItems: -1 }))).rejects.toBeInstanceOf(
      CircleConfigError,
    );
    const cause = new Error("synthetic cleanup");
    const broken: AsyncIterable<{ records: number[] }> = {
      [Symbol.asyncIterator]: () => ({
        next: async () => ({ done: false, value: { records: [1] } }),
        return: async () => {
          throw cause;
        },
      }),
    };
    await expect(collect(toAsyncIterator(broken, { maxItems: 1 }))).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause,
    });
  });
});

describe("offset progression", () => {
  it("honors explicit continuation for short and empty pages and uses request page numbers", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ page: 99, records: [1], has_next_page: true, count: 100 })
      .mockResolvedValueOnce({ records: [], has_next_page: true, count: 0 })
      .mockResolvedValueOnce({ records: [2, 2], has_next_page: false, count: 2 });
    const pages = await collect(paginateOffset({ fetchPage, page: 3, perPage: 10 }));
    expect(pages.map((p) => p.records)).toEqual([[1], [2, 2]]);
    expect(fetchPage.mock.calls.map(([p]) => p.page)).toEqual([3, 4, 5]);
    expect(pages.map((p) => p.page)).toEqual([3, 5]);
  });
  it("counts empty fetches against maxPages", async () => {
    const fetchPage = vi.fn().mockResolvedValue({ records: [], has_next_page: true });
    expect(await collect(paginateOffset({ fetchPage, maxPages: 2 }))).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
  it("uses the reported server page size only for fallback termination", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ records: [1, 2], per_page: 2 })
      .mockResolvedValueOnce({ records: [3], per_page: 2 });
    expect(await collect(toAsyncIterator(paginateOffset({ fetchPage, perPage: 10 })))).toEqual([
      1, 2, 3,
    ]);
    expect(fetchPage.mock.calls.map(([p]) => p.perPage)).toEqual([10, 10]);
  });
  it("stops on an empty success or a partial page without continuation metadata", async () => {
    for (const value of [undefined, {}, { records: [] }, { records: [1] }]) {
      const fetchPage = vi.fn().mockResolvedValue(value);
      await collect(paginateOffset({ fetchPage }));
      expect(fetchPage).toHaveBeenCalledOnce();
    }
  });
});

describe("cursor progression", () => {
  it("preserves mixed tuple values, order, server ordering and duplicate records", async () => {
    const initial = ["start", 1] as const;
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ records: [1], next_search_after: ["1", 2] })
      .mockResolvedValueOnce({ records: [], next_search_after: [1, "2"] })
      .mockResolvedValueOnce({ records: [1, 3], next_search_after: null });
    expect(
      await collect(
        toAsyncIterator(paginateSearchAfter({ fetchPage, searchAfter: initial, perPage: 2 })),
      ),
    ).toEqual([1, 1, 3]);
    expect(fetchPage.mock.calls.map(([p]) => p.searchAfter)).toEqual([
      ["start", 1],
      ["1", 2],
      [1, "2"],
    ]);
    expect(initial).toEqual(["start", 1]);
  });
  it.each([
    undefined,
    null,
    [],
  ])("ends when the next cursor is %j regardless of stale counts/flags", async (next_search_after) => {
    const fetchPage = vi
      .fn()
      .mockResolvedValue({ records: [1], next_search_after, has_next_page: true });
    expect(await collect(toAsyncIterator(paginateSearchAfter({ fetchPage })))).toEqual([1]);
    expect(fetchPage).toHaveBeenCalledOnce();
  });
  it("yields the current valid records then reports a repeated/cyclic cursor", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ records: [1], next_search_after: ["a"] })
      .mockResolvedValueOnce({ records: [2], next_search_after: ["b"] })
      .mockResolvedValueOnce({ records: [3], next_search_after: ["a"] });
    const items = toAsyncIterator(paginateSearchAfter({ fetchPage }))[Symbol.asyncIterator]();
    for (const value of [1, 2, 3]) expect(await items.next()).toEqual({ value, done: false });
    await expect(items.next()).rejects.toMatchObject({
      name: "CircleNetworkError",
      message: expect.stringContaining("repeated"),
    });
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });
  it("detects an unchanged starting cursor, and caps need no additional cursor", async () => {
    const fetchPage = vi.fn().mockResolvedValue({ records: [1], next_search_after: ["a"] });
    await expect(
      collect(paginateSearchAfter({ fetchPage, searchAfter: ["a"] })),
    ).rejects.toBeInstanceOf(CircleNetworkError);
    fetchPage.mockClear();
    expect(await collect(toAsyncIterator(paginateSearchAfter({ fetchPage, maxItems: 1 })))).toEqual(
      [1],
    );
    expect(fetchPage).toHaveBeenCalledOnce();
  });
  it("bounds empty cursor pages by maxPages", async () => {
    let n = 0;
    const fetchPage = vi.fn(async () => ({ records: [], next_search_after: [++n] }));
    expect(await collect(paginateSearchAfter({ fetchPage, maxPages: 3 }))).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });
  it.each([
    { cursor: [true] },
    { cursor: [NaN] },
    { cursor: [1.5] },
    { cursor: [Number.MAX_SAFE_INTEGER + 1] },
    { cursor: Array(1) },
  ])("rejects invalid cursor %j", async ({ cursor }) => {
    await expect(
      collect(
        paginateSearchAfter({ fetchPage: vi.fn(), searchAfter: cursor as (string | number)[] }),
      ),
    ).rejects.toBeInstanceOf(CircleConfigError);
    await expect(
      collect(
        paginateSearchAfter({
          fetchPage: vi.fn().mockResolvedValue({ records: [1], next_search_after: cursor }),
        }),
      ),
    ).rejects.toBeInstanceOf(CircleNetworkError);
  });
});

describe("ID-window progression", () => {
  it.each([
    "previous",
    "next",
  ] as const)("advances %s through ID windows without sorting or deduplicating", async (direction) => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({
        records: [3, 2],
        first_id: 2,
        last_id: 3,
        has_previous_page: true,
        has_next_page: true,
      })
      .mockResolvedValueOnce({
        records: [2, 4],
        first_id: 1,
        last_id: 4,
        has_previous_page: false,
        has_next_page: false,
      });
    expect(
      await collect(
        toAsyncIterator(paginateByIdWindow({ fetchPage, id: 9, direction, perPage: 2 })),
      ),
    ).toEqual([3, 2, 2, 4]);
    expect(fetchPage.mock.calls.map(([p]) => p.id)).toEqual([9, direction === "previous" ? 2 : 3]);
    expect(fetchPage.mock.calls[0]?.[0]).toEqual({
      id: 9,
      [direction === "previous" ? "previousPerPage" : "nextPerPage"]: 2,
    });
  });
  it.each([
    "previous",
    "next",
  ] as const)("detects cycles in %s windows after yielding records", async (direction) => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ records: [1], first_id: 2, last_id: 2 })
      .mockResolvedValueOnce({ records: [2], first_id: 1, last_id: 1 });
    const items = toAsyncIterator(paginateByIdWindow({ fetchPage, id: 1, direction }))[
      Symbol.asyncIterator
    ]();
    expect((await items.next()).value).toBe(1);
    expect((await items.next()).value).toBe(2);
    await expect(items.next()).rejects.toBeInstanceOf(CircleNetworkError);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
  it("reports an explicit continuation without a cursor", async () => {
    await expect(
      collect(
        paginateByIdWindow({ fetchPage: async () => ({ records: [1], has_previous_page: true }) }),
      ),
    ).rejects.toBeInstanceOf(CircleNetworkError);
  });
});

it.each([
  0,
  null,
  "20",
  false,
])("rejects an invalid page size %j even with a zero budget", async (value) => {
  const fetchPage = vi.fn();
  for (const paginate of paginators)
    await expect(
      collect<unknown>(paginate({ fetchPage, perPage: value as number, maxItems: 0 })),
    ).rejects.toBeInstanceOf(CircleConfigError);
  expect(fetchPage).not.toHaveBeenCalled();
});

it("rejects invalid signals and malformed continuation metadata before fetching/yielding", async () => {
  const fetchPage = vi.fn();
  await expect(
    collect(paginateOffset({ fetchPage, signal: {} as AbortSignal })),
  ).rejects.toBeInstanceOf(CircleConfigError);
  expect(fetchPage).not.toHaveBeenCalled();
  for (const response of [
    [],
    { records: [1], per_page: 0 },
    { records: [1], has_next_page: "yes" },
  ]) {
    await expect(
      collect(paginateOffset({ fetchPage: vi.fn().mockResolvedValue(response) })),
    ).rejects.toBeInstanceOf(CircleNetworkError);
  }
});
