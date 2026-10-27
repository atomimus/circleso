import type { Middleware } from "openapi-fetch";
import {
  CircleHttpError,
  CircleNetworkError,
  type CircleResponseContext,
  CircleSdkError,
  CircleTimeoutError,
} from "./errors";
import { HEADER_CONTENT_TYPE, HEADER_CORRELATION_ID, HEADER_REQUEST_ID } from "./headers";

type BodyEvidence = { bodyText?: string; parsedJson?: unknown; cause?: unknown };
/** Parsed data with the original response metadata. The body has already been read. */
export type CircleResponse<Data> = { data: Data; response: Response };
type RequestContext = { url: string; method: string; signal?: AbortSignal };
type ResponseState = {
  request: RequestContext;
  evidence?: BodyEvidence;
};

const states = new WeakMap<Response, ResponseState>();

export function createResponseMiddleware(): Middleware {
  return {
    onResponse({ request, response }) {
      return prepareResponse(response, request);
    },
    onError({ request, error }) {
      return error instanceof CircleSdkError
        ? error
        : new CircleNetworkError("Network request failed.", error, {
            url: request.url,
            method: request.method,
          });
    },
  };
}

/** Normalize SDK-owned body readers without buffering or consuming a raw stream in advance. */
export function prepareResponse(response: Response, request: RequestContext): Response {
  if (states.has(response)) return response;
  const state: ResponseState = { request };
  states.set(response, state);

  const readText = response.text.bind(response);
  Object.defineProperty(response, "text", {
    configurable: true,
    value: async () => {
      try {
        const text = await readText();
        state.evidence = parseBodyText(text);
        return text;
      } catch (cause) {
        state.evidence = { cause };
        throw responseError(response, cause);
      }
    },
  });
  Object.defineProperty(response, "json", {
    configurable: true,
    value: async () => {
      const text = await response.text();
      if (text === "") return undefined;
      const evidence = state.evidence ?? parseBodyText(text);
      if (evidence.cause !== undefined) throw responseError(response, evidence.cause);
      return evidence.parsedJson;
    },
  });
  for (const method of ["arrayBuffer", "blob", "formData", "bytes"] as const) {
    const reader = response[method];
    if (typeof reader !== "function") continue;
    const read = reader.bind(response);
    Object.defineProperty(response, method, {
      configurable: true,
      value: async () => {
        try {
          return await read();
        } catch (cause) {
          throw responseError(response, cause);
        }
      },
    });
  }
  const clone = response.clone.bind(response);
  Object.defineProperty(response, "clone", {
    configurable: true,
    value: () => {
      try {
        return prepareResponse(clone(), request);
      } catch (cause) {
        throw responseError(response, cause);
      }
    },
  });
  return response;
}

/** One best-effort body policy for HTTP errors, resources, and token refresh. */
export async function readResponseBody(response: Response): Promise<BodyEvidence> {
  const cached = states.get(response)?.evidence;
  if (cached) return cached;
  try {
    const text = await response.text();
    return states.get(response)?.evidence ?? parseBodyText(text);
  } catch (cause) {
    const failure = lifetimeFailure(response, cause);
    if (failure) throw withContext(failure, responseContext(response));
    return states.get(response)?.evidence ?? { cause };
  }
}

function parseBodyText(bodyText: string): BodyEvidence {
  if (bodyText === "") return { bodyText };
  try {
    return { bodyText, parsedJson: JSON.parse(bodyText) as unknown };
  } catch (cause) {
    return { bodyText, cause };
  }
}

export function responseContext(response: Response, fallback?: RequestContext) {
  const request = states.get(response)?.request ?? fallback;
  const requestId =
    response.headers.get(HEADER_REQUEST_ID) ?? response.headers.get(HEADER_CORRELATION_ID);
  return {
    status: response.status,
    url: response.url || request?.url || "",
    method: request?.method ?? "GET",
    ...(requestId !== null ? { requestId } : {}),
  };
}

export async function buildHttpError(
  response: Response,
  fallback?: RequestContext,
  message = `Request failed with status ${response.status}`,
): Promise<CircleHttpError> {
  const evidence = await readResponseBody(response);
  return new CircleHttpError(message, {
    ...responseContext(response, fallback),
    ...evidence,
    cause: originalCause(evidence.cause),
  });
}

export async function unwrapResult<Data>(
  result: { data?: Data; error?: unknown; response: Response },
  method: string,
  url: string,
): Promise<Data | undefined> {
  if (!result.response.ok) throw await buildHttpError(result.response, { method, url });
  return result.data;
}

/** Retain headers/status without changing the shared parsing and HTTP error contract. */
export async function unwrapResponse<Data>(
  result: { data?: Data; error?: unknown; response: Response },
  method: string,
  url: string,
): Promise<CircleResponse<Data | undefined>> {
  return { data: await unwrapResult(result, method, url), response: result.response };
}

/** The generic client selects by MIME; raw openapi-fetch callers retain explicit parseAs. */
export async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return undefined;
  const contentType = response.headers.get(HEADER_CONTENT_TYPE)?.split(";", 1)[0]?.trim() ?? "";
  if (/^(application\/json|[^/]+\/[^/]+\+json)$/i.test(contentType)) return response.json();
  const text = await response.text();
  return text === "" ? undefined : text;
}

function responseError(response: Response, cause: unknown) {
  const { bodyText, parsedJson } = states.get(response)?.evidence ?? {};
  const context = {
    ...responseContext(response),
    ...(bodyText !== undefined ? { bodyText } : {}),
    ...(parsedJson !== undefined ? { parsedJson } : {}),
  };
  const failure = lifetimeFailure(response, cause);
  if (failure) return withContext(failure, context);
  if (!response.ok) {
    return new CircleHttpError(`Request failed with status ${response.status}`, {
      ...context,
      cause: originalCause(cause),
    });
  }
  if (cause instanceof CircleNetworkError) return withContext(cause, context);
  return new CircleNetworkError("Response body could not be decoded or read.", cause, context);
}

function lifetimeFailure(
  response: Response,
  cause: unknown,
): CircleNetworkError | CircleTimeoutError | undefined {
  const signal = states.get(response)?.request.signal;
  // Browser body readers can translate a stream's error into a native TypeError or
  // AbortError. The SDK lifetime remains authoritative about who canceled the read.
  if (
    signal?.aborted &&
    (signal.reason instanceof CircleNetworkError || signal.reason instanceof CircleTimeoutError)
  )
    return signal.reason;
  return cause instanceof CircleTimeoutError ||
    (cause instanceof CircleNetworkError && signal?.aborted === true)
    ? cause
    : undefined;
}

function originalCause(cause: unknown): unknown {
  return cause instanceof CircleNetworkError || cause instanceof CircleTimeoutError
    ? cause.cause
    : cause;
}

function withContext<T extends CircleNetworkError | CircleTimeoutError>(
  error: T,
  context: CircleResponseContext,
): T {
  // Preserve cancellation/deadline identity and their exact original causes.
  const { status, url, method, requestId, bodyText, parsedJson } = context;
  Object.assign(error, { status, url, method, requestId, bodyText, parsedJson });
  return error;
}
