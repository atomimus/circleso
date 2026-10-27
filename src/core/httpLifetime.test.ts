import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CircleNetworkError, CircleTimeoutError } from "./errors";
import { createSmartFetch } from "./http";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("smart fetch lifetimes", () => {
  it.each([
    204, 205, 304,
  ])("normalizes browser empty streams on null-body status %s", async (status) => {
    const cancel = vi.fn();
    const native = new Response(new ReadableStream({ cancel }), {
      headers: { "x-request-id": "synthetic" },
    });
    Object.defineProperties(native, {
      status: { value: status },
      statusText: { value: "" },
      url: { value: "https://example.test/empty" },
      type: { value: "cors" },
    });
    const send = createSmartFetch({
      baseUrl: "https://example.test",
      timeoutMs: 20,
      throwOnHttpError: false,
      fetcher: async () => native,
    });
    const response = await send("/empty");
    expect(response.status).toBe(status);
    expect(response.body).toBeNull();
    expect(response.type).toBe("cors");
    expect(response.url).toBe(native.url);
    expect(response.headers.get("x-request-id")).toBe("synthetic");
    expect(await response.text()).toBe("");
    expect(await response.clone().text()).toBe("");
    expect(cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(["request", "init"])("composes both signals when %s aborts", async (which) => {
    const first = new AbortController();
    const second = new AbortController();
    const request = new Request("https://example.test/", { signal: first.signal });
    const signalAdds = vi.spyOn(request.signal, "addEventListener");
    const signalRemoves = vi.spyOn(request.signal, "removeEventListener");
    const initAdds = vi.spyOn(second.signal, "addEventListener");
    const initRemoves = vi.spyOn(second.signal, "removeEventListener");
    const fetcher = vi.fn(() => new Promise<Response>(() => {}));
    const smartFetch = createSmartFetch({ baseUrl: request.url, timeoutMs: 50, fetcher });
    const promise = smartFetch(request, { signal: second.signal });
    const cause = { source: which };
    const assertion = expect(promise).rejects.toMatchObject({ name: "CircleNetworkError", cause });
    (which === "request" ? first : second).abort(cause);
    await assertion;
    expect(fetcher).toHaveBeenCalledOnce();
    expect(signalAdds).toHaveBeenCalledOnce();
    expect(initAdds).toHaveBeenCalledOnce();
    expect(signalRemoves.mock.calls[0]?.[1]).toBe(signalAdds.mock.calls[0]?.[1]);
    expect(initRemoves.mock.calls[0]?.[1]).toBe(initAdds.mock.calls[0]?.[1]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([0, undefined])("honors Request.signal with timeout %s", async (timeoutMs) => {
    const controller = new AbortController();
    controller.abort("synthetic cancel");
    const fetcher = vi.fn();
    const smartFetch = createSmartFetch({ baseUrl: "https://example.test/", fetcher });
    const request = new Request("https://example.test/", { signal: controller.signal });
    const promise = smartFetch(request, timeoutMs === undefined ? {} : { timeoutMs });
    await expect(promise).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause: "synthetic cancel",
    });
    expect(fetcher).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds an uncooperative fetch and disposes a response that arrives after timeout", async () => {
    let headers!: (response: Response) => void;
    let signal!: AbortSignal;
    const fetcher = vi.fn((input: RequestInfo | URL) => {
      signal = (input as Request).signal;
      return new Promise<Response>((resolve) => {
        headers = resolve;
      });
    });
    const smartFetch = createSmartFetch({
      baseUrl: "https://example.test",
      fetcher,
      timeoutMs: 10,
    });
    let error: unknown;
    const promise = smartFetch("/").catch((cause: unknown) => {
      error = cause;
    });
    await vi.advanceTimersByTimeAsync(10);
    await promise;
    expect(error).toBeInstanceOf(CircleTimeoutError);
    expect(signal.reason).toBe(error);
    expect((error as CircleTimeoutError).cause).toBeInstanceOf(DOMException);
    const cancel = vi.fn();
    const source = new ReadableStream({ cancel });
    headers(new Response(source));
    await vi.advanceTimersByTimeAsync(0);
    expect(cancel).toHaveBeenCalledWith(error);
    expect(source.locked).toBe(false);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    "success",
    "failure",
    "cancel",
  ])("releases timers and caller listeners on %s", async (mode) => {
    const controller = new AbortController();
    const add = vi.spyOn(controller.signal, "addEventListener");
    const remove = vi.spyOn(controller.signal, "removeEventListener");
    const cause = new TypeError("synthetic network error");
    const fetcher = vi.fn(async () => {
      if (mode === "failure") throw cause;
      return new Response(mode === "cancel" ? new ReadableStream() : "ok");
    });
    const smartFetch = createSmartFetch({
      baseUrl: "https://example.test",
      fetcher,
      timeoutMs: 10,
      retries: { retries: 0 },
    });
    const promise = smartFetch("/", { signal: controller.signal });
    if (mode === "failure") {
      await expect(promise).rejects.toMatchObject({ name: "CircleNetworkError", cause });
    } else {
      const response = await promise;
      if (mode === "cancel") await response.body?.cancel();
      else expect(await response.text()).toBe("ok");
    }
    expect(add).toHaveBeenCalledOnce();
    expect(remove.mock.calls[0]?.[1]).toBe(add.mock.calls[0]?.[1]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps retry waits outside the per-attempt deadline and gives retries a fresh budget", async () => {
    let secondHeaders!: (response: Response) => void;
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("retry", { status: 500 }))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            secondHeaders = resolve;
          }),
      );
    const smartFetch = createSmartFetch({
      baseUrl: "https://example.test",
      fetcher,
      timeoutMs: 10,
      retries: { retries: 1, baseDelayMs: 100, maxDelayMs: 100, jitterRatio: 0 },
    });
    const promise = smartFetch("/");
    await vi.advanceTimersByTimeAsync(99);
    expect(fetcher).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(10);
    expect(fetcher).toHaveBeenCalledTimes(2);
    secondHeaders(new Response("ok"));
    const response = await promise;
    expect(await response.text()).toBe("ok");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not prefetch or buffer an unread raw body and bounds caller pauses", async () => {
    const pull = vi.fn();
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    const source = new ReadableStream<Uint8Array>({ pull, cancel }, { highWaterMark: 0 });
    const smartFetch = createSmartFetch({
      baseUrl: "https://example.test",
      timeoutMs: 10,
      fetcher: async () => new Response(source),
    });
    const response = await smartFetch("/");
    expect(pull).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(10);
    await expect(response.text()).rejects.toBeInstanceOf(CircleTimeoutError);
    expect(cancel).toHaveBeenCalledOnce();
    expect(source.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves a body transport failure's cause and never retries it", async () => {
    const cause = new TypeError("synthetic broken body");
    const source = new ReadableStream({
      start(c) {
        c.error(cause);
      },
    });
    const fetcher = vi.fn(async () => new Response(source));
    const smartFetch = createSmartFetch({
      baseUrl: "https://example.test",
      timeoutMs: 10,
      fetcher,
    });
    const response = await smartFetch("/");
    let failure: unknown;
    await response.text().catch((error: unknown) => {
      failure = error;
    });
    expect(failure).toBeInstanceOf(CircleNetworkError);
    expect((failure as CircleNetworkError).cause).toBe(cause);
    expect(source.locked).toBe(false);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds core HTTP error body reads", async () => {
    const smartFetch = createSmartFetch({
      baseUrl: "https://example.test",
      timeoutMs: 10,
      fetcher: async () => new Response(new ReadableStream(), { status: 400 }),
    });
    const assertion = expect(smartFetch("/")).rejects.toBeInstanceOf(CircleTimeoutError);
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds Response.formData() for low-level consumers", async () => {
    const smartFetch = createSmartFetch({
      baseUrl: "https://example.test",
      timeoutMs: 10,
      fetcher: async () =>
        new Response(new ReadableStream(), {
          headers: { "Content-Type": "multipart/form-data; boundary=synthetic" },
        }),
    });
    const response = await smartFetch("/");
    const assertion = expect(response.formData()).rejects.toBeInstanceOf(CircleTimeoutError);
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resolves raw stream cancellation without waiting for source cleanup", async () => {
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    const source = new ReadableStream({ cancel });
    const smartFetch = createSmartFetch({
      baseUrl: "https://example.test",
      timeoutMs: 10,
      fetcher: async () => new Response(source),
    });
    const response = await smartFetch("/");
    await response.body?.cancel("reader finished");
    expect(cancel).toHaveBeenCalledWith("reader finished");
    expect(source.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("supports BYOB readers through EOF without retaining the deadline", async () => {
    const source = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array([1, 2]));
        c.close();
      },
    });
    const smartFetch = createSmartFetch({
      baseUrl: "https://example.test",
      timeoutMs: 10,
      fetcher: async () => new Response(source),
    });
    const response = await smartFetch("/");
    const reader = response.body?.getReader({ mode: "byob" });
    const chunk = await reader?.read(new Uint8Array(4));
    expect(chunk?.value).toEqual(new Uint8Array([1, 2]));
    expect((await reader?.read(new Uint8Array(4)))?.done).toBe(true);
    reader?.releaseLock();
    expect(source.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("passes through empty chunks followed by data without stalling", async () => {
    const source = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array());
        c.enqueue(new TextEncoder().encode("ok"));
        c.close();
      },
    });
    const smartFetch = createSmartFetch({
      baseUrl: "https://example.test",
      timeoutMs: 10,
      fetcher: async () => new Response(source),
    });
    const response = await smartFetch("/");
    await expect(response.text()).resolves.toBe("ok");
    expect(source.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("disposes a response when cancellation races with header delivery", async () => {
    const controller = new AbortController();
    const cancel = vi.fn();
    const smartFetch = createSmartFetch({
      baseUrl: "https://example.test",
      timeoutMs: 10,
      fetcher: async () => {
        queueMicrotask(() => controller.abort("header race"));
        return new Response(new ReadableStream({ cancel }));
      },
    });
    await expect(smartFetch("/", { signal: controller.signal })).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause: "header race",
    });
    expect(cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(["HEAD", "zero-length", "204"])("releases skipped %s bodies at headers", async (mode) => {
    const cancel = vi.fn();
    const response =
      mode === "204"
        ? new Response(null, { status: 204 })
        : new Response(new ReadableStream({ cancel }), {
            headers: mode === "zero-length" ? { "Content-Length": "0" } : {},
          });
    const smartFetch = createSmartFetch({
      baseUrl: "https://example.test",
      timeoutMs: 10,
      fetcher: async () => response,
    });
    await smartFetch("/", { method: mode === "HEAD" ? "HEAD" : "GET" });
    expect(cancel).toHaveBeenCalledTimes(mode === "204" ? 0 : 1);
    expect(response.body?.locked ?? false).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves response metadata and cancellation through clones", async () => {
    const cancel = vi.fn();
    const original = new Response(new ReadableStream({ cancel }), {
      status: 202,
      statusText: "Accepted",
    });
    Object.defineProperties(original, {
      url: { value: "https://example.test/redirected" },
      redirected: { value: true },
      type: { value: "cors" },
    });
    const smartFetch = createSmartFetch({
      baseUrl: "https://example.test",
      timeoutMs: 10,
      fetcher: async () => original,
    });
    const response = await smartFetch("/");
    const clone = response.clone();
    expect(clone.url).toBe(original.url);
    expect(clone.redirected).toBe(true);
    expect(clone.type).toBe("cors");
    expect(clone.status).toBe(202);
    expect(clone.statusText).toBe("Accepted");
    const first = expect(response.text()).rejects.toBeInstanceOf(CircleTimeoutError);
    const second = expect(clone.text()).rejects.toBeInstanceOf(CircleTimeoutError);
    await vi.advanceTimersByTimeAsync(10);
    await Promise.all([first, second]);
    expect(cancel).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});
