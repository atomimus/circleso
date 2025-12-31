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
