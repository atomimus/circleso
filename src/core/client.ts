import { CircleConfigError } from "./errors";
import {
  HEADER_ACCEPT,
  HEADER_API_KEY,
  HEADER_AUTHORIZATION,
  HEADER_CONTENT_TYPE,
} from "./headers";
import { createSmartFetch } from "./http";
import type { AuthConfig, ClientConfig, HttpMethod, RequestOptions } from "./types";
import { joinUrl, withQuery } from "./url";

export function createClient(config: ClientConfig) {
  const { baseUrl, basePath = "", auth, defaultHeaders, fetcher = globalThis.fetch } = config;

  if (!fetcher) {
    throw new CircleConfigError("A fetch implementation is required. Provide config.fetcher.");
  }

  const smartFetch = createSmartFetch({ baseUrl, fetcher });

  async function request<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const url = withQuery(joinUrl(baseUrl, basePath, path), options.query);
    const headers = buildHeaders(defaultHeaders, options.headers, auth);
    const body = prepareBody(options.body, headers);

    const requestInit = {
      method,
      headers,
      ...(body !== undefined ? { body } : {}),
      ...(options.signal !== undefined ? { signal: options.signal } : {}),
    };

    const response = await smartFetch(url, requestInit);

    return (await parseResponse(response)) as T;
  }

  return {
    request,
    get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
    post: <T>(path: string, options?: RequestOptions) => request<T>("POST", path, options),
    put: <T>(path: string, options?: RequestOptions) => request<T>("PUT", path, options),
    patch: <T>(path: string, options?: RequestOptions) => request<T>("PATCH", path, options),
    delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options),
  };
}

function buildHeaders(
  defaults: Record<string, string> | undefined,
  overrides: Record<string, string> | undefined,
  auth?: AuthConfig,
): Headers {
  const headers = new Headers();

  if (defaults) {
    for (const [key, value] of Object.entries(defaults)) {
      headers.set(key, value);
    }
  }

  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      headers.set(key, value);
    }
  }

  if (auth) {
    const headerName =
      auth.type === "bearer" ? HEADER_AUTHORIZATION : (auth.header ?? HEADER_API_KEY);
    if (!headers.has(headerName)) {
      const value = auth.type === "bearer" ? `Bearer ${auth.token}` : auth.token;
      headers.set(headerName, value);
    }
  }

  if (!headers.has(HEADER_ACCEPT)) {
    headers.set(HEADER_ACCEPT, "application/json");
  }

  return headers;
}

function prepareBody(body: unknown, headers: Headers): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }

  if (isJsonBody(body)) {
    if (!headers.has(HEADER_CONTENT_TYPE)) {
      headers.set(HEADER_CONTENT_TYPE, "application/json");
    }
    return JSON.stringify(body);
  }

  return body as BodyInit;
}

function isJsonBody(body: unknown): body is Record<string, unknown> | unknown[] {
  if (body === null || body === undefined) {
    return false;
  }

  if (typeof body === "string") {
    return false;
  }

  if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
    return false;
  }

  if (typeof Blob !== "undefined" && body instanceof Blob) {
    return false;
  }

  if (typeof FormData !== "undefined" && body instanceof FormData) {
    return false;
  }

  if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
    return false;
  }

  if (typeof ReadableStream !== "undefined" && body instanceof ReadableStream) {
    return false;
  }

  return typeof body === "object";
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }

  const contentType = response.headers.get(HEADER_CONTENT_TYPE) ?? "";
  if (contentType.includes("application/json") || contentType.includes("+json")) {
    return response.json();
  }

  return response.text();
}
