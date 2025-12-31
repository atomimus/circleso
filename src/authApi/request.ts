import type { FetchOptions } from "openapi-fetch";
import type { HeadlessAuthClient } from "../clients/headlessAuthClient";
import { CircleHttpError } from "../core/errors";
import { HEADER_CONTENT_TYPE, HEADER_CORRELATION_ID, HEADER_REQUEST_ID } from "../core/headers";
import type {
  AuthMethod,
  AuthPaths,
  PathParams,
  PathsWithMethod,
  QueryParams,
  RequestBody,
  RequestConfig,
} from "./types";

export function createAuthRequester(client: HeadlessAuthClient) {
  const get = async <Path extends PathsWithMethod<AuthPaths, "get">>(
    path: Path,
    options?: RequestConfig<Path, "get">,
  ) => {
    const init = buildInit<Path, "get">(options, "get");
    const result = await client.GET(path, init);
    return handleResult(result, "GET", path);
  };

  const post = async <Path extends PathsWithMethod<AuthPaths, "post">>(
    path: Path,
    options?: RequestConfig<Path, "post">,
  ) => {
    const init = buildInit<Path, "post">(options, "post");
    const result = await client.POST(path, init);
    return handleResult(result, "POST", path);
  };

  const put = async <Path extends PathsWithMethod<AuthPaths, "put">>(
    path: Path,
    options?: RequestConfig<Path, "put">,
  ) => {
    const init = buildInit<Path, "put">(options, "put");
    const result = await client.PUT(path, init);
    return handleResult(result, "PUT", path);
  };

  const patch = async <Path extends PathsWithMethod<AuthPaths, "patch">>(
    path: Path,
    options?: RequestConfig<Path, "patch">,
  ) => {
    const init = buildInit<Path, "patch">(options, "patch");
    const result = await client.PATCH(path, init);
    return handleResult(result, "PATCH", path);
  };

  const del = async <Path extends PathsWithMethod<AuthPaths, "delete">>(
    path: Path,
    options?: RequestConfig<Path, "delete">,
  ) => {
    const init = buildInit<Path, "delete">(options, "delete");
    const result = await client.DELETE(path, init);
    return handleResult(result, "DELETE", path);
  };

  return {
    get,
    post,
    put,
    patch,
    delete: del,
  };
}

export type AuthRequester = ReturnType<typeof createAuthRequester>;

type OpenApiResult<Data> = {
  data?: Data;
  error?: unknown;
  response: Response;
};

function buildInit<Path extends PathsWithMethod<AuthPaths, Method>, Method extends AuthMethod>(
  options: RequestConfig<Path, Method> | undefined,
  method: Method,
): FetchOptions<AuthPaths[Path][Method]> {
  type Init = {
    body?: RequestBody<Path, Method>;
    headers?: HeadersInit;
    signal?: AbortSignal;
    params?: {
      path?: PathParams<Path, Method>;
      query?: QueryParams<Path, Method>;
    };
  };
  const init: Init = {};
  const normalized = normalizeOptions<Path, Method>(options, isBodyMethod(method));

  if (normalized.body !== undefined) {
    init.body = normalized.body;
  }

  if (normalized.headers !== undefined) {
    init.headers = normalized.headers;
  }
  if (normalized.signal !== undefined) {
    init.signal = normalized.signal;
  }

  if (normalized.path !== undefined || normalized.query !== undefined) {
    const paramsValue: { path?: PathParams<Path, Method>; query?: QueryParams<Path, Method> } = {};
    if (normalized.path !== undefined) {
      paramsValue.path = normalized.path;
    }
    if (normalized.query !== undefined) {
      paramsValue.query = normalized.query;
    }
    init.params = paramsValue;
  }

  return init as FetchOptions<AuthPaths[Path][Method]>;
}

function isBodyMethod(method: AuthMethod) {
  return method === "post" || method === "put" || method === "patch";
}

function normalizeOptions<
  Path extends PathsWithMethod<AuthPaths, Method>,
  Method extends AuthMethod,
>(
  options: RequestConfig<Path, Method> | undefined,
  treatExtraAsBody: boolean,
): {
  headers?: HeadersInit;
  signal?: AbortSignal;
  path?: PathParams<Path, Method>;
  query?: QueryParams<Path, Method>;
  body?: RequestBody<Path, Method>;
} {
  if (!options || typeof options !== "object") {
    return {};
  }

  const headers = (options as { headers?: HeadersInit }).headers;
  const signal = (options as { signal?: AbortSignal }).signal;
  const path = (options as { path?: PathParams<Path, Method> }).path;

  const extra = extractExtra(options);

  const query = !treatExtraAsBody ? (extra as QueryParams<Path, Method>) : undefined;
  const body = treatExtraAsBody ? (extra as RequestBody<Path, Method>) : undefined;

  return {
    ...(headers !== undefined ? { headers } : {}),
    ...(signal !== undefined ? { signal } : {}),
    ...(path !== undefined ? { path } : {}),
    ...(query !== undefined ? { query } : {}),
    ...(body !== undefined ? { body } : {}),
  };
}

function extractExtra(input: Record<string, unknown>) {
  const extra: Record<string, unknown> = {};
  let hasExtra = false;

  for (const [key, value] of Object.entries(input)) {
    if (key === "headers" || key === "signal" || key === "path") {
      continue;
    }
    if (value !== undefined) {
      extra[key] = value;
      hasExtra = true;
    }
  }

  return hasExtra ? extra : undefined;
}

async function handleResult<Data>(
  result: OpenApiResult<Data>,
  method: string,
  fallbackPath: string,
): Promise<Data | undefined> {
  if (!result.error) {
    return result.data;
  }

  const response = result.response;
  const status = response?.status ?? 0;
  const url = response?.url ?? fallbackPath;
  const requestId = response ? getRequestId(response.headers) : undefined;

  let parsedJson: unknown;
  let bodyText: string | undefined;

  const errorData = getErrorData(result.error);
  if (typeof errorData !== "undefined") {
    if (typeof errorData === "string") {
      bodyText = errorData;
    } else {
      parsedJson = errorData;
    }
  }

  if (!bodyText && parsedJson === undefined && response) {
    const text = await safeReadText(response);
    if (text) {
      bodyText = text;
      if (isJsonContentType(response.headers.get(HEADER_CONTENT_TYPE) ?? "")) {
        try {
          parsedJson = JSON.parse(text);
        } catch {
          // ignore parse errors
        }
      }
    }
  }

  const details = {
    status,
    url,
    method,
    ...(requestId !== undefined ? { requestId } : {}),
    ...(bodyText !== undefined ? { bodyText } : {}),
    ...(parsedJson !== undefined ? { parsedJson } : {}),
  };

  throw new CircleHttpError(`Request failed with status ${status}`, details);
}

function isJsonContentType(contentType: string) {
  const normalized = contentType.toLowerCase();
  return normalized.includes("application/json") || normalized.includes("+json");
}

function getRequestId(headers: Headers) {
  return headers.get(HEADER_REQUEST_ID) ?? headers.get(HEADER_CORRELATION_ID) ?? undefined;
}

function getErrorData(error: unknown) {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  if ("data" in error) {
    return (error as { data?: unknown }).data;
  }
  return undefined;
}

async function safeReadText(response: Response) {
  try {
    return await response.text();
  } catch {
    return undefined;
  }
}
