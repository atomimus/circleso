import { afterEach, expect, it, vi } from "vitest";
import { createSessionSpaceCache } from "../../examples/usage-controls";
import { createHeadless } from "../headless";
import { CircleConfigError, CircleHttpError, CircleNetworkError } from "./errors";

afterEach(() => vi.useRealTimers());

function setup(
  headers: HeadersInit = { "Cache-Control": "private, max-age=60" },
  owner = "synthetic-A",
) {
  let revision = 0;
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const request = input as Request;
    expect(request.method).toBe("GET");
    expect(request.credentials).toBe("omit");
    expect(request.cache).toBe("no-store");
    return Response.json(
      { id: Number(request.url.split("/").pop()), name: `${owner}-${++revision}` },
      { headers },
    );
  });
  const member = createHeadless({ accessToken: owner, fetcher });
  return { fetcher, member, cache: createSessionSpaceCache(member) };
}

it("keeps member/community instances isolated and returns detached data", async () => {
  const one = setup();
  const two = setup(undefined, "synthetic-B");
  const first = await one.cache.get(1);
  expect(first?.name).toBe("synthetic-A-1");
  if (first) first.name = "changed";
  expect((await one.cache.get(1))?.name).toBe("synthetic-A-1");
  expect((await two.cache.get(1))?.name).toBe("synthetic-B-1");
  expect(one.fetcher).toHaveBeenCalledTimes(1);
  expect(two.fetcher).toHaveBeenCalledTimes(1);
});

it("invalidates on failed mutations, explicit invalidation and TTL expiry", async () => {
  vi.useFakeTimers();
  const { cache, fetcher } = setup();
  await cache.get(1);
  const cause = new Error("synthetic uncertain write");
  await expect(
    cache.change(async () => {
      throw cause;
    }),
  ).rejects.toBe(cause);
  await cache.get(1);
  cache.invalidate();
  await cache.get(1);
  await vi.advanceTimersByTimeAsync(5000);
  await cache.get(1);
  expect(fetcher).toHaveBeenCalledTimes(4);
});

it.each([
  {},
  { "Cache-Control": "no-store, max-age=60" },
  { "Cache-Control": "no-cache, max-age=60" },
  { "Cache-Control": "max-age=60", "Set-Cookie": "synthetic=value" },
  { "Cache-Control": "max-age=60", Vary: "Authorization" },
  { "Cache-Control": "max-age=60, max-age=120" },
  { "Cache-Control": "max-age=0" },
  { "Cache-Control": "max-age=60", Age: "60" },
])("does not retain uncacheable responses %#", async (headers) => {
  const { cache, fetcher } = setup(headers);
  await cache.get(1);
  await cache.get(1);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("caps entry count, respects shorter max-age and rejects oversized retained data", async () => {
  vi.useFakeTimers();
  const { cache, fetcher } = setup({ "Cache-Control": "max-age=1" });
  for (let id = 1; id <= 33; id++) await cache.get(id);
  await cache.get(1);
  expect(fetcher).toHaveBeenCalledTimes(34);
  await vi.advanceTimersByTimeAsync(1000);
  await cache.get(1);
  expect(fetcher).toHaveBeenCalledTimes(35);
  const largeFetcher = vi.fn(async () =>
    Response.json({ name: "x".repeat(65_536) }, { headers: { "Cache-Control": "max-age=60" } }),
  );
  const large = createSessionSpaceCache(
    createHeadless({ accessToken: "synthetic", fetcher: largeFetcher }),
  );
  await large.get(1);
  await large.get(1);
  expect(largeFetcher).toHaveBeenCalledTimes(2);
});

it("does not share pending requests or repopulate after invalidation or retirement", async () => {
  let release!: (response: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    release = resolve;
  });
  const fetcher = vi
    .fn()
    .mockImplementationOnce(() => pending)
    .mockImplementation(async () =>
      Response.json({ id: 1 }, { headers: { "Cache-Control": "max-age=60" } }),
    );
  const cache = createSessionSpaceCache(createHeadless({ accessToken: "synthetic", fetcher }));
  const read = cache.get(1);
  await cache.get(1);
  expect(fetcher).toHaveBeenCalledTimes(2);
  cache.invalidate();
  release(Response.json({ id: 1 }, { headers: { "Cache-Control": "max-age=60" } }));
  await read;
  await cache.get(1);
  expect(fetcher).toHaveBeenCalledTimes(3);
  cache.retire();
  await expect(cache.get(1)).rejects.toBeInstanceOf(CircleConfigError);
});

it("bypasses cache during mutations and checks cancellation on hits", async () => {
  const { cache, fetcher } = setup();
  await cache.get(1);
  const reason = { synthetic: "cancel" };
  const canceled = await cache.get(1, AbortSignal.abort(reason)).catch((error) => error);
  expect(canceled).toBeInstanceOf(CircleNetworkError);
  expect(canceled.cause).toBe(reason);
  await cache.change(async () => {
    await cache.get(1);
    await cache.get(1);
  });
  await cache.get(1);
  expect(fetcher).toHaveBeenCalledTimes(4);
});

it("rejects reads finishing after retirement", async () => {
  let release!: (response: Response) => void;
  const fetcher = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        release = resolve;
      }),
  );
  const cache = createSessionSpaceCache(createHeadless({ accessToken: "synthetic", fetcher }));
  const read = expect(cache.get(1)).rejects.toBeInstanceOf(CircleConfigError);
  for (let i = 0; i < 50; i++) await Promise.resolve();
  cache.retire();
  release(Response.json({ id: 1 }, { headers: { "Cache-Control": "max-age=60" } }));
  await read;
  await expect(cache.get(1)).rejects.toBeInstanceOf(CircleConfigError);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("rejects retention of filtered responses even on a server", async () => {
  const fetcher = vi.fn(async () => {
    const response = Response.json({ id: 1 }, { headers: { "Cache-Control": "max-age=60" } });
    Object.defineProperty(response, "type", { value: "cors" });
    return response;
  });
  const cache = createSessionSpaceCache(createHeadless({ accessToken: "synthetic", fetcher }));
  await cache.get(1);
  await cache.get(1);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("never caches auth or cookie calls and invalidates after HTTP failures", async () => {
  const fetcher = vi.fn(
    async (input: RequestInfo | URL) =>
      new Response(null, { status: (input as Request).url.endsWith("/2") ? 403 : 204 }),
  );
  const member = createHeadless({ accessToken: "synthetic", fetcher });
  const cache = createSessionSpaceCache(member);
  await member.cookies.create();
  await member.cookies.create();
  await expect(cache.get(2)).rejects.toBeInstanceOf(CircleHttpError);
  await expect(cache.get(2)).rejects.toBeInstanceOf(CircleHttpError);
  expect(fetcher).toHaveBeenCalledTimes(4);
});
