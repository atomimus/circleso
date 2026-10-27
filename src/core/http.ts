import { CircleConfigError, CircleHttpError, CircleNetworkError, CircleSdkError } from "./errors";
import {
  HEADER_CONTENT_LENGTH,
  HEADER_CONTENT_TYPE,
  HEADER_CORRELATION_ID,
  HEADER_REQUEST_ID,
  HEADER_RETRY_AFTER,
  HEADER_USER_AGENT,
} from "./headers";
import {
  bindResponseLifetime,
  createHttpLifetime,
  discardResponse,
  waitForRetry,
} from "./httpLifetime";

const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "PUT", "DELETE", "OPTIONS", "TRACE"]);

export type RetryConfig = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  retryNonIdempotent?: boolean;
};

export type SmartFetchConfig = {
  baseUrl: string;
  defaultHeaders?: Record<string, string>;
  userAgent?: string;
  /** Per-attempt deadline through body consumption; excludes retry waiting. Zero disables it. */
  timeoutMs?: number;
  retries?: RetryConfig;
  throwOnHttpError?: boolean;
  fetcher?: typeof fetch;
};

export type SmartFetchInit = RequestInit & {
  /** Override the configured per-attempt deadline, including response body consumption. */
  timeoutMs?: number;
  retries?: RetryConfig;
};

export function createSmartFetch(config: SmartFetchConfig) {
  const fetcher = config.fetcher ?? globalThis.fetch;
  if (!fetcher) {
    throw new CircleConfigError("A fetch implementation is required.");
  }

  const baseUrl = resolveBaseUrl(config.baseUrl);
  const defaultHeaders = config.defaultHeaders;
  const userAgent = config.userAgent;
  const throwOnHttpError = config.throwOnHttpError ?? true;

  return async function smartFetch(input: RequestInfo | URL, init: SmartFetchInit = {}) {
    const request = input instanceof Request ? input : undefined;
    const { timeoutMs, retries, body: initBody, ...requestInit } = init;
    const method = resolveMethod(request, requestInit.method);
    const url = resolveUrl(baseUrl, request, input);
    const body = initBody ?? request?.body;
    const headers = mergeHeaders(defaultHeaders, request?.headers, requestInit.headers, userAgent);
    const retryConfig = normalizeRetryConfig(config.retries, retries);
    const shouldRetry = shouldRetryRequest(method, body, retryConfig);

    let attempt = 0;
    while (true) {
      const signals = [request?.signal, requestInit.signal];
      const lifetime = createHttpLifetime(signals, timeoutMs ?? config.timeoutMs);
      let bodyOwnsLifetime = false;
      let pendingResponse: Response | undefined;

      try {
        lifetime.throwIfAborted();
        const fetchRequest = request
          ? new Request(request, {
              ...requestInit,
              method,
              headers,
              signal: lifetime.signal,
              ...(initBody !== undefined ? { body: initBody } : {}),
            })
          : new Request(url, {
              ...requestInit,
              method,
              headers,
              signal: lifetime.signal,
              ...(body !== undefined ? { body } : {}),
            });

        const received = await lifetime.wait(
          Promise.resolve(fetcher(fetchRequest)).then((response) => {
            pendingResponse = response;
            if (lifetime.signal.aborted) discardResponse(response, lifetime.signal.reason);
            return response;
          }),
        );
        lifetime.throwIfAborted();

        if (
          !received.ok &&
          shouldRetry &&
          attempt < retryConfig.retries &&
          isRetryableStatus(received.status)
        ) {
          discardResponse(received);
          const retryAfterMs = parseRetryAfter(received.headers.get(HEADER_RETRY_AFTER));
          const delayMs = retryAfterMs ?? computeBackoff(attempt, retryConfig);
          attempt += 1;
          lifetime.cleanup();
          await waitForRetry(delayMs, signals);
          continue;
        }

        // openapi-fetch skips these bodies instead of consuming them.
        const skipsBody = method === "HEAD" || received.headers.get(HEADER_CONTENT_LENGTH) === "0";
        if (skipsBody) {
          discardResponse(received);
          lifetime.cleanup();
        }
        const response = skipsBody ? received : bindResponseLifetime(received, lifetime);
        bodyOwnsLifetime = true;

        if (!response.ok && throwOnHttpError) {
          const { bodyText, parsedJson } = await readErrorBody(response);
          const requestId = getRequestId(response.headers);
          const details = {
            status: response.status,
            url,
            method,
            ...(requestId !== undefined ? { requestId } : {}),
            ...(bodyText !== undefined ? { bodyText } : {}),
            ...(parsedJson !== undefined ? { parsedJson } : {}),
          };
          throw new CircleHttpError(`Request failed with status ${response.status}`, details);
        }

        return response;
      } catch (error) {
        lifetime.throwIfAborted();

        if (isAbortError(error)) {
          throw new CircleNetworkError("Request was aborted.", error);
        }

        if (shouldRetry && attempt < retryConfig.retries && isRetryableNetworkError(error)) {
          const delayMs = computeBackoff(attempt, retryConfig);
          attempt += 1;
          lifetime.cleanup();
          await waitForRetry(delayMs, signals);
          continue;
        }

        throw error instanceof CircleSdkError
          ? error
          : new CircleNetworkError("Network request failed.", error);
      } finally {
        if (!bodyOwnsLifetime) {
          if (pendingResponse && lifetime.signal.aborted) {
            discardResponse(pendingResponse, lifetime.signal.reason);
          }
          lifetime.cleanup();
        }
      }
    }
  };
}

function resolveBaseUrl(baseUrl: string) {
  if (!baseUrl) {
    throw new CircleConfigError("baseUrl is required.");
  }

  try {
    return new URL(baseUrl);
  } catch {
    throw new CircleConfigError(`Invalid baseUrl: ${baseUrl}`);
  }
}

function resolveUrl(baseUrl: URL, request: Request | undefined, input: RequestInfo | URL) {
  if (request) {
    return request.url;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  if (typeof input === "string") {
    if (isAbsoluteUrl(input)) {
      return new URL(input).toString();
    }
    return new URL(input, baseUrl).toString();
  }

  return String(input);
}

function resolveMethod(request: Request | undefined, initMethod?: string) {
  const method = initMethod ?? request?.method ?? "GET";
  return method.toUpperCase();
}

function mergeHeaders(
  defaults: Record<string, string> | undefined,
  requestHeaders: Headers | undefined,
  initHeaders: HeadersInit | undefined,
  userAgent?: string,
) {
  const headers = new Headers();
  applyHeaders(headers, defaults);
  applyHeaders(headers, requestHeaders);
  applyHeaders(headers, initHeaders);

  if (userAgent && !headers.has(HEADER_USER_AGENT)) {
    headers.set(HEADER_USER_AGENT, userAgent);
  }

  return headers;
}

function applyHeaders(headers: Headers, input: HeadersInit | Record<string, string> | undefined) {
  if (!input) {
    return;
  }

  if (input instanceof Headers) {
    input.forEach((value, key) => {
      headers.set(key, value);
    });
    return;
  }

  if (Array.isArray(input)) {
    for (const [key, value] of input) {
      headers.set(key, value);
    }
    return;
  }

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      headers.set(key, value);
    }
  }
}

function normalizeRetryConfig(base?: RetryConfig, override?: RetryConfig) {
  return {
    retries: override?.retries ?? base?.retries ?? 2,
    baseDelayMs: override?.baseDelayMs ?? base?.baseDelayMs ?? 200,
    maxDelayMs: override?.maxDelayMs ?? base?.maxDelayMs ?? 2000,
    jitterRatio: override?.jitterRatio ?? base?.jitterRatio ?? 0.2,
    retryNonIdempotent: override?.retryNonIdempotent ?? base?.retryNonIdempotent ?? false,
  };
}

function shouldRetryRequest(
  method: string,
  body: BodyInit | null | undefined,
  config: RetryConfig,
) {
  if (!config.retries || config.retries <= 0) {
    return false;
  }
  const idempotent = IDEMPOTENT_METHODS.has(method);
  if (!idempotent && !config.retryNonIdempotent) {
    return false;
  }
  return isBodyReplayable(body);
}

function isBodyReplayable(body: BodyInit | null | undefined) {
  if (!body) {
    return true;
  }

  if (typeof body === "string") {
    return true;
  }

  if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
    return true;
  }

  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return true;
  }

  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return true;
  }

  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
    return true;
  }

  if (typeof ReadableStream !== "undefined" && body instanceof ReadableStream) {
    return false;
  }

  return !isNodeStream(body);
}

function isAbsoluteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function parseRetryAfter(value: string | null) {
  if (!value) {
    return undefined;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const date = new Date(value);
  const delay = date.getTime() - Date.now();
  if (Number.isFinite(delay) && delay > 0) {
    return delay;
  }

  return undefined;
}

function computeBackoff(attempt: number, config: RetryConfig) {
  const baseDelayMs = config.baseDelayMs ?? 200;
  const maxDelayMs = config.maxDelayMs ?? 2000;
  const jitterRatio = config.jitterRatio ?? 0.2;
  const exponential = baseDelayMs * 2 ** attempt;
  const capped = Math.min(exponential, maxDelayMs);
  const jitter = capped * jitterRatio;
  const min = Math.max(0, capped - jitter);
  const max = capped + jitter;
  return Math.round(min + Math.random() * (max - min));
}

function isAbortError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }
  return "name" in error && (error as { name: string }).name === "AbortError";
}

function isRetryableNetworkError(error: unknown) {
  return error instanceof TypeError;
}

async function readErrorBody(response: Response) {
  if (response.status === 204 || response.status === 205) {
    return { bodyText: undefined, parsedJson: undefined };
  }

  let bodyText: string | undefined;
  try {
    bodyText = await response.text();
  } catch (error) {
    if (error instanceof CircleSdkError) throw error;
    return { bodyText: undefined, parsedJson: undefined };
  }

  if (!bodyText) {
    return { bodyText: undefined, parsedJson: undefined };
  }

  const contentType = response.headers.get(HEADER_CONTENT_TYPE) ?? "";
  if (isJsonContentType(contentType)) {
    try {
      const parsedJson = JSON.parse(bodyText);
      return { bodyText, parsedJson };
    } catch {
      return { bodyText, parsedJson: undefined };
    }
  }

  return { bodyText, parsedJson: undefined };
}

function isJsonContentType(contentType: string) {
  const normalized = contentType.toLowerCase();
  return normalized.includes("application/json") || normalized.includes("+json");
}

function isNodeStream(value: unknown): value is { pipe: (...args: unknown[]) => unknown } {
  if (!value || typeof value !== "object") {
    return false;
  }
  return typeof (value as { pipe?: unknown }).pipe === "function";
}

function getRequestId(headers: Headers) {
  return headers.get(HEADER_REQUEST_ID) ?? headers.get(HEADER_CORRELATION_ID) ?? undefined;
}
