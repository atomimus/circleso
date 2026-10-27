import { CircleNetworkError, CircleSdkError, CircleTimeoutError } from "./errors";

/** A single attempt (or a retry wait), with explicitly disposable signal listeners. */
export function createHttpLifetime(
  signals: (AbortSignal | null | undefined)[],
  timeoutMs?: number,
) {
  const controller = new AbortController();
  const listeners: (() => void)[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cleanup = () => {
    if (timer !== undefined) clearTimeout(timer);
    for (const remove of listeners.splice(0)) remove();
  };
  const abort = (error: CircleNetworkError | CircleTimeoutError) => {
    if (!controller.signal.aborted) controller.abort(error);
    cleanup();
  };

  for (const signal of new Set(signals)) {
    if (!signal) continue;
    const onAbort = () => abort(new CircleNetworkError("Request was aborted.", signal.reason));
    if (signal.aborted) {
      onAbort();
      break;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    listeners.push(() => signal.removeEventListener("abort", onAbort));
  }
  if (!controller.signal.aborted && timeoutMs !== undefined && timeoutMs > 0) {
    timer = setTimeout(() => {
      const cause = new DOMException("The request deadline expired.", "TimeoutError");
      abort(new CircleTimeoutError(`Request timed out after ${timeoutMs}ms`, timeoutMs, cause));
    }, timeoutMs);
  }

  const throwIfAborted = () => {
    if (controller.signal.aborted) throw controller.signal.reason;
  };

  return {
    signal: controller.signal,
    cleanup,
    throwIfAborted,
    /** Also bounds custom fetchers that do not reject when their signal aborts. */
    wait<T>(operation: Promise<T>): Promise<T> {
      return new Promise((resolve, reject) => {
        const onAbort = () => {
          controller.signal.removeEventListener("abort", onAbort);
          reject(controller.signal.reason);
        };
        controller.signal.addEventListener("abort", onAbort, { once: true });
        if (controller.signal.aborted) onAbort();
        operation.then(
          (value) => {
            controller.signal.removeEventListener("abort", onAbort);
            if (controller.signal.aborted) reject(controller.signal.reason);
            else resolve(value);
          },
          (error: unknown) => {
            controller.signal.removeEventListener("abort", onAbort);
            reject(controller.signal.aborted ? controller.signal.reason : error);
          },
        );
      });
    },
  };
}

type HttpLifetime = ReturnType<typeof createHttpLifetime>;

/** Never wait for an uncooperative underlying source's cancellation promise. */
export function discardResponse(response: Response, reason?: unknown): void {
  void response.body?.cancel(reason).catch(() => {});
}

/** Transfer the attempt's lifetime to a backpressure-preserving response body. */
export function bindResponseLifetime(response: Response, lifetime: HttpLifetime): Response {
  if (!response.body) {
    lifetime.cleanup();
    return response;
  }

  const reader = response.body.getReader();
  let stopped = false;
  let onAbort: () => void;
  const finish = (cancel: boolean, reason?: unknown) => {
    if (stopped) return;
    stopped = true;
    lifetime.signal.removeEventListener("abort", onAbort);
    lifetime.cleanup();
    if (cancel) void reader.cancel(reason).catch(() => {});
    reader.releaseLock();
  };

  const body = new ReadableStream(
    {
      type: "bytes",
      start(controller) {
        onAbort = () => {
          const error = lifetime.signal.reason;
          controller.error(error);
          finish(true, error);
        };
        lifetime.signal.addEventListener("abort", onAbort, { once: true });
        if (lifetime.signal.aborted) onAbort();
      },
      async pull(controller) {
        try {
          while (!stopped) {
            const { done, value } = await reader.read();
            if (stopped) return;
            if (done) {
              controller.close();
              controller.byobRequest?.respond(0);
              finish(false);
              return;
            }
            if (value.byteLength > 0) {
              controller.enqueue(value);
              return;
            }
          }
        } catch (cause) {
          if (stopped) return;
          const error =
            cause instanceof CircleSdkError
              ? cause
              : new CircleNetworkError("Response body read failed.", cause);
          controller.error(error);
          finish(true, error);
        }
      },
      cancel(reason) {
        finish(true, reason);
      },
    },
    { highWaterMark: 0 },
  );
  return copyResponseMetadata(new Response(body, response), response);
}

function copyResponseMetadata(wrapped: Response, response: Response): Response {
  // Response construction does not copy fetch metadata.
  for (const key of ["url", "redirected", "type"] as const) {
    Object.defineProperty(wrapped, key, { value: response[key], configurable: true });
  }
  Object.defineProperty(wrapped, "clone", {
    configurable: true,
    writable: true,
    value(this: Response): Response {
      return copyResponseMetadata(Response.prototype.clone.call(this), this);
    },
  });
  return wrapped;
}

export async function waitForRetry(
  ms: number,
  signals: (AbortSignal | null | undefined)[],
): Promise<void> {
  const lifetime = createHttpLifetime(signals);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    lifetime.throwIfAborted();
    if (ms > 0) {
      await lifetime.wait(
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, ms);
        }),
      );
    }
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    lifetime.cleanup();
  }
}
