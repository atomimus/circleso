import { afterEach, describe, expect, it, vi } from "vitest";
import { CircleHttpError, CircleTimeoutError } from "./errors";
import { HEADER_CONTENT_TYPE, HEADER_RETRY_AFTER } from "./headers";
import { createSmartFetch } from "./http";

afterEach(() => {
  vi.useRealTimers();
});

describe("createSmartFetch", () => {
  it("retries idempotent requests on retryable status codes", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("retry", {
          status: 500,
          headers: { [HEADER_CONTENT_TYPE]: "text/plain" },
        }),
      )
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const smartFetch = createSmartFetch({
      baseUrl: "https://api.example.com",
      fetcher,
      retries: { retries: 1, baseDelayMs: 10, jitterRatio: 0 },
    });

    const promise = smartFetch("/status");
    await vi.runAllTimersAsync();
    const response = await promise;

    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("honors Retry-After when provided", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("slow down", {
          status: 429,
          headers: { [HEADER_RETRY_AFTER]: "2", [HEADER_CONTENT_TYPE]: "text/plain" },
        }),
      )
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const smartFetch = createSmartFetch({
      baseUrl: "https://api.example.com",
      fetcher,
      retries: { retries: 1, baseDelayMs: 10, jitterRatio: 0 },
    });

    const promise = smartFetch("/rate-limited");

    await vi.advanceTimersByTimeAsync(1999);
    expect(fetcher).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    const response = await promise;
    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-idempotent methods by default", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response("nope", {
        status: 500,
        headers: { [HEADER_CONTENT_TYPE]: "text/plain" },
      }),
    );

    const smartFetch = createSmartFetch({
      baseUrl: "https://api.example.com",
      fetcher,
      retries: { retries: 2, baseDelayMs: 1, jitterRatio: 0 },
    });

    await expect(
      smartFetch("/submit", {
        method: "POST",
        body: JSON.stringify({ name: "test" }),
      }),
    ).rejects.toBeInstanceOf(CircleHttpError);

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("retries network errors for idempotent requests", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network"))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const smartFetch = createSmartFetch({
      baseUrl: "https://api.example.com",
      fetcher,
      retries: { retries: 1, baseDelayMs: 5, jitterRatio: 0 },
    });

    const promise = smartFetch("/status");
    await vi.runAllTimersAsync();
    const response = await promise;

    expect(response.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("captures best-effort error parsing details", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response("{not-json", {
        status: 400,
        headers: { [HEADER_CONTENT_TYPE]: "application/json" },
      }),
    );

    const smartFetch = createSmartFetch({
      baseUrl: "https://api.example.com",
      fetcher,
    });

    await expect(smartFetch("/bad")).rejects.toMatchObject({
      bodyText: "{not-json",
      parsedJson: undefined,
    });
  });

  it("returns response when throwOnHttpError is false", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response("nope", {
        status: 500,
        headers: { [HEADER_CONTENT_TYPE]: "text/plain" },
      }),
    );

    const smartFetch = createSmartFetch({
      baseUrl: "https://api.example.com",
      fetcher,
      throwOnHttpError: false,
      retries: { retries: 0 },
    });

    const response = await smartFetch("/fail");
    expect(response.status).toBe(500);
  });

  it("throws CircleTimeoutError when a request exceeds timeout", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(
      (input: RequestInfo | URL) =>
        new Promise<Response>((_resolve, reject) => {
          const request = input instanceof Request ? input : new Request(input);
          request.signal.addEventListener("abort", () => {
            const error = new Error("aborted");
            (error as Error & { name: string }).name = "AbortError";
            reject(error);
          });
        }),
    );

    const smartFetch = createSmartFetch({
      baseUrl: "https://api.example.com",
      fetcher,
      timeoutMs: 10,
    });

    const promise = smartFetch("/slow");
    const assertion = expect(promise).rejects.toBeInstanceOf(CircleTimeoutError);
    await vi.advanceTimersByTimeAsync(11);
    await assertion;
  });
});
