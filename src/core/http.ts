import { resolveBaseUrl, validateConfigObject, validateTimeout } from "./config";
import { CircleConfigError, CircleHttpError, CircleNetworkError, CircleSdkError } from "./errors";
import { HEADER_CONTENT_LENGTH, HEADER_RETRY_AFTER, HEADER_USER_AGENT } from "./headers";
import {
  bindResponseLifetime,
  createHttpLifetime,
  discardResponse,
  waitForRetry,
} from "./httpLifetime";
import { BodySourceRequest, discardRequest, prepareRequestBody } from "./requestBody";
import { buildHttpError, prepareResponse, responseContext } from "./response";

const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "PUT", "DELETE", "OPTIONS", "TRACE"]);

export type RetryConfig = {
  /** Additional attempts, from 0 through 10. Default: 2. */
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterRatio?: number;
  retryNonIdempotent?: boolean;
  /** Maximum snapshot size for known finite bodies. Default: 1 MiB; 0 disables snapshots. */
  maxReplayBodyBytes?: number;
  /** A longer Retry-After ends retries instead of retrying early. Default: 60 seconds. */
  maxRetryAfterMs?: number;
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
  /** Fresh upload for every attempt (zero-based). Overrides the input body; caller owns equivalence. */
  bodyFactory?: (attempt: number, signal: AbortSignal) => BodyInit | Promise<BodyInit>;
};

export function createSmartFetch(config: SmartFetchConfig) {
  const fetch = createFetch(config);
  return (input: RequestInfo | URL, init?: SmartFetchInit) => fetch(input, init);
}

/** Internal auth adapter: share bounded uploads/deadlines with ordinary HTTP attempts. */
export function createRecoveringFetch(config: SmartFetchConfig) {
  const fetch = createFetch(config);
  return (request: Request, recover: () => Promise<Headers>) => fetch(request, {}, recover);
}

function createFetch(config: SmartFetchConfig) {
  validateConfigObject(config);
  if (config.baseUrl === undefined) throw new CircleConfigError("baseUrl is required.");
  validateTimeout(config.timeoutMs);
  const fetcher = config.fetcher !== undefined ? config.fetcher : globalThis.fetch;
  if (typeof fetcher !== "function") {
    throw new CircleConfigError("A fetch implementation is required.");
  }

  const baseUrl = new URL(resolveBaseUrl(config.baseUrl));
  const defaultHeaders = config.defaultHeaders;
  const userAgent = config.userAgent;
  if (userAgent !== undefined) {
    if (typeof userAgent !== "string" || !userAgent.trim())
      throw new CircleConfigError("userAgent must be a non-empty header value.");
    try {
      new Headers({ [HEADER_USER_AGENT]: userAgent });
    } catch (cause) {
      throw new CircleConfigError("userAgent must be a valid header value.", cause);
    }
  }
  const throwOnHttpError = config.throwOnHttpError ?? true;
  const baseRetryConfig = normalizeRetryConfig(config.retries);

  async function smartFetch(
    input: RequestInfo | URL,
    init: SmartFetchInit = {},
    recover?: () => Promise<Headers>,
  ) {
    const request = input instanceof Request ? input : undefined;
    const { timeoutMs, retries, bodyFactory, body: initBody, ...requestInit } = init;
    validateTimeout(timeoutMs);
    const method = resolveMethod(request, requestInit.method);
    const url = resolveUrl(baseUrl, request, input);
    const headers = mergeHeaders(defaultHeaders, request?.headers, requestInit.headers, userAgent);
    const retryConfig = normalizeRetryConfig(baseRetryConfig, retries);
    const retryMethod =
      retryConfig.retries > 0 && (IDEMPOTENT_METHODS.has(method) || retryConfig.retryNonIdempotent);
    if (bodyFactory !== undefined && typeof bodyFactory !== "function") {
      throw new CircleConfigError("bodyFactory must be a function.");
    }

    let attempt = 0;
    let recovered = false;
    let template: Request | undefined;
    let upload: { body: BodyInit | null; replayable: boolean } | undefined;
    const signals = [request?.signal, requestInit.signal];
    while (true) {
      const lifetime = createHttpLifetime(signals, timeoutMs ?? config.timeoutMs);
      let bodyOwnsLifetime = false;
      let pendingResponse: Response | undefined;
      let fetchRequest: Request | undefined;
      let fetching = false;

      try {
        lifetime.throwIfAborted();
        if (!template) {
          template = new BodySourceRequest(request ?? url, {
            ...requestInit,
            method,
            headers,
            signal: lifetime.signal,
            ...(initBody !== undefined ? { body: initBody } : {}),
          });
          if (!bodyFactory) {
            upload =
              (retryMethod || recover) && template.body
                ? await prepareRequestBody(template, retryConfig.maxReplayBodyBytes, lifetime)
                : { body: template.body, replayable: !template.body };
          }
        }
        const body = bodyFactory
          ? await lifetime.wait(
              Promise.resolve(bodyFactory(attempt, lifetime.signal)).then((freshBody) => {
                if (lifetime.signal.aborted && freshBody instanceof ReadableStream) {
                  void freshBody.cancel(lifetime.signal.reason).catch(() => {});
                }
                if (freshBody == null)
                  throw new CircleConfigError("bodyFactory must return a fresh BodyInit.");
                return freshBody;
              }),
            )
          : upload?.body;
        lifetime.throwIfAborted();
        const attemptInit: RequestInit & { duplex?: "half" } = {
          headers: template.headers,
          signal: lifetime.signal,
          referrer: template.referrer,
          referrerPolicy: template.referrerPolicy,
          ...(body != null ? { body, duplex: "half" } : {}),
        };
        fetchRequest = new Request(template, attemptInit);
        if (bodyFactory) discardRequest(template);

        fetching = true;
        const received = await lifetime.wait(
          Promise.resolve(fetcher(fetchRequest)).then((response) => {
            pendingResponse = response;
            if (lifetime.signal.aborted) discardResponse(response, lifetime.signal.reason);
            return response;
          }),
        );
        fetching = false;
        lifetime.throwIfAborted();

        if (received.status === 401 && recover && !recovered && upload?.replayable) {
          // The auth wait has a separate, shared budget. Release the original attempt first.
          discardResponse(received);
          discardRequest(fetchRequest);
          lifetime.cleanup();
          const recoveryHeaders = await recover();
          recoveryHeaders.forEach((value, key) => {
            template?.headers.set(key, value);
          });
          recovered = true;
          continue;
        }

        const retryAfterMs = parseRetryAfter(received.headers.get(HEADER_RETRY_AFTER));
        if (
          !received.ok &&
          retryMethod &&
          !recovered &&
          (bodyFactory || upload?.replayable) &&
          attempt < retryConfig.retries &&
          isRetryableStatus(received.status) &&
          (retryAfterMs === undefined || retryAfterMs <= retryConfig.maxRetryAfterMs)
        ) {
          discardResponse(received);
          const delayMs = retryAfterMs ?? computeBackoff(attempt, retryConfig);
          attempt += 1;
          discardRequest(fetchRequest);
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
        const response = prepareResponse(
          skipsBody ? received : bindResponseLifetime(received, lifetime),
          { url, method, signal: lifetime.signal },
        );
        bodyOwnsLifetime = true;

        if (!response.ok && throwOnHttpError) {
          throw await buildHttpError(response);
        }

        return response;
      } catch (error) {
        if (lifetime.signal.aborted) {
          Object.assign(lifetime.signal.reason, {
            url,
            method,
            ...(pendingResponse ? responseContext(pendingResponse, { url, method }) : {}),
          });
        }
        lifetime.throwIfAborted();

        if (isAbortError(error)) {
          throw new CircleNetworkError("Request was aborted.", error);
        }

        if (
          fetching &&
          retryMethod &&
          !recovered &&
          (bodyFactory || upload?.replayable) &&
          attempt < retryConfig.retries &&
          isRetryableNetworkError(error)
        ) {
          const delayMs = computeBackoff(attempt, retryConfig);
          attempt += 1;
          discardRequest(fetchRequest);
          lifetime.cleanup();
          await waitForRetry(delayMs, signals);
          continue;
        }

        if (error instanceof CircleSdkError) throw error;
        if (!fetching && !pendingResponse) {
          throw new CircleConfigError("Could not prepare HTTP request.", error);
        }
        if (pendingResponse && !pendingResponse.ok) {
          throw new CircleHttpError(`Request failed with status ${pendingResponse.status}`, {
            ...responseContext(pendingResponse, { url, method }),
            cause: error,
          });
        }
        throw new CircleNetworkError("Network request failed.", error, {
          url,
          method,
          ...(pendingResponse ? responseContext(pendingResponse, { url, method }) : {}),
        });
      } finally {
        if (!fetchRequest) {
          discardRequest(template, lifetime.signal.reason);
          if (upload?.body instanceof ReadableStream) {
            void upload.body.cancel(lifetime.signal.reason).catch(() => {});
          }
        }
        discardRequest(fetchRequest, lifetime.signal.reason);
        if (!bodyOwnsLifetime) {
          if (pendingResponse && lifetime.signal.aborted) {
            discardResponse(pendingResponse, lifetime.signal.reason);
          }
          lifetime.cleanup();
        }
      }
    }
  }

  return async (
    input: RequestInfo | URL,
    init?: SmartFetchInit,
    recover?: () => Promise<Headers>,
  ) => {
    try {
      return await smartFetch(input, init, recover);
    } catch (cause) {
      if (cause instanceof CircleSdkError) throw cause;
      throw new CircleConfigError("Could not prepare HTTP request.", cause);
    }
  };
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
  for (const input of [base, override]) {
    if (input !== undefined && (!input || typeof input !== "object" || Array.isArray(input))) {
      throw new CircleConfigError("retries must be a configuration object.");
    }
  }
  function option<Key extends keyof RetryConfig>(
    key: Key,
    fallback: Required<RetryConfig>[Key],
  ): Required<RetryConfig>[Key] {
    if (override?.[key] !== undefined) return override[key] as Required<RetryConfig>[Key];
    if (base?.[key] !== undefined) return base[key] as Required<RetryConfig>[Key];
    return fallback;
  }
  const normalized = {
    retries: option("retries", 2),
    baseDelayMs: option("baseDelayMs", 200),
    maxDelayMs: option("maxDelayMs", 2000),
    jitterRatio: option("jitterRatio", 0.2),
    retryNonIdempotent: option("retryNonIdempotent", false),
    maxReplayBodyBytes: option("maxReplayBodyBytes", 1024 * 1024),
    maxRetryAfterMs: option("maxRetryAfterMs", 60_000),
  };
  if (!Number.isInteger(normalized.retries) || normalized.retries < 0 || normalized.retries > 10) {
    throw new CircleConfigError("retries.retries must be an integer from 0 through 10.");
  }
  for (const key of ["baseDelayMs", "maxDelayMs", "maxRetryAfterMs"] as const) {
    const value = normalized[key];
    if (!Number.isFinite(value) || value < 0 || value > 2_147_483_647) {
      throw new CircleConfigError(`retries.${key} must be finite and between 0 and 2147483647.`);
    }
  }
  if (
    !Number.isFinite(normalized.jitterRatio) ||
    normalized.jitterRatio < 0 ||
    normalized.jitterRatio > 1
  ) {
    throw new CircleConfigError("retries.jitterRatio must be between 0 and 1.");
  }
  if (typeof normalized.retryNonIdempotent !== "boolean") {
    throw new CircleConfigError("retries.retryNonIdempotent must be a boolean.");
  }
  if (!Number.isSafeInteger(normalized.maxReplayBodyBytes) || normalized.maxReplayBodyBytes < 0) {
    throw new CircleConfigError("retries.maxReplayBodyBytes must be a non-negative safe integer.");
  }
  return normalized;
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

  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed) * 1000;
  }

  // Accept HTTP-date forms (including obsolete forms required by HTTP), not Date.parse's
  // permissive interpretations of invalid numeric headers such as "-1" or "1.5".
  if (
    /^(?:[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT|[A-Za-z]+, \d{2}-[A-Za-z]{3}-\d{2} \d{2}:\d{2}:\d{2} GMT|[A-Za-z]{3} [A-Za-z]{3} [ \d]\d \d{2}:\d{2}:\d{2} \d{4})$/.test(
      trimmed,
    )
  ) {
    const date = Date.parse(trimmed);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
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
  return Math.min(maxDelayMs, Math.round(min + Math.random() * (max - min)));
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
