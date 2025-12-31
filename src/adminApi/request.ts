import type { FetchOptions } from "openapi-fetch";
import type { AdminClient } from "../clients/adminClient";
import { CircleHttpError } from "../core/errors";
import { HEADER_CONTENT_TYPE, HEADER_CORRELATION_ID, HEADER_REQUEST_ID } from "../core/headers";
import type {
  AdminMethod,
  AdminPaths,
  PathParams,
  PathsWithMethod,
  QueryParams,
  RequestBody,
  RequestConfig,
} from "./types";

type OpenApiResult<Data> = {
  data?: Data;
  error?: unknown;
  response: Response;
};

export function createAdminRequester(client: AdminClient) {
  const get = async <Path extends PathsWithMethod<AdminPaths, "get">>(
    path: Path,
    options?: RequestConfig<Path, "get">,
  ) => {
    const init = buildInit<Path, "get">(options);
    const result = await client.GET(path, init);
    return handleResult(result, "GET", path);
  };

  const post = async <Path extends PathsWithMethod<AdminPaths, "post">>(
    path: Path,
    options?: RequestConfig<Path, "post">,
  ) => {
    const init = buildInit<Path, "post">(options);
    const result = await client.POST(path, init);
    return handleResult(result, "POST", path);
  };

  const put = async <Path extends PathsWithMethod<AdminPaths, "put">>(
    path: Path,
    options?: RequestConfig<Path, "put">,
  ) => {
    const init = buildInit<Path, "put">(options);
    const result = await client.PUT(path, init);
    return handleResult(result, "PUT", path);
  };

  const patch = async <Path extends PathsWithMethod<AdminPaths, "patch">>(
    path: Path,
    options?: RequestConfig<Path, "patch">,
  ) => {
    const init = buildInit<Path, "patch">(options);
    const result = await client.PATCH(path, init);
    return handleResult(result, "PATCH", path);
  };

  const del = async <Path extends PathsWithMethod<AdminPaths, "delete">>(
    path: Path,
    options?: RequestConfig<Path, "delete">,
  ) => {
    const init = buildInit<Path, "delete">(options);
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

export type AdminRequester = ReturnType<typeof createAdminRequester>;

function buildInit<Path extends PathsWithMethod<AdminPaths, Method>, Method extends AdminMethod>(
  options?: RequestConfig<Path, Method>,
): FetchOptions<AdminPaths[Path][Method]> {
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

  const pathValue = (options as { path?: PathParams<Path, Method> } | undefined)?.path;
  const queryValue = (options as { query?: QueryParams<Path, Method> } | undefined)?.query;
  const bodyValue = (
    options as
      | {
          body?: RequestBody<Path, Method>;
        }
      | undefined
  )?.body;

  if (bodyValue !== undefined) {
    init.body = bodyValue;
  }

  if (options?.headers !== undefined) {
    init.headers = options.headers;
  }
  if (options?.signal !== undefined) {
    init.signal = options.signal;
  }

  if (pathValue !== undefined || queryValue !== undefined) {
    const paramsValue: { path?: PathParams<Path, Method>; query?: QueryParams<Path, Method> } = {};
    if (pathValue !== undefined) {
      paramsValue.path = pathValue;
    }
    if (queryValue !== undefined) {
      paramsValue.query = queryValue;
    }
    init.params = paramsValue;
  }

  return init as FetchOptions<AdminPaths[Path][Method]>;
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
