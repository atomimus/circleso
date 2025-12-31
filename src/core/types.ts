export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

export interface AuthConfig {
  type: "bearer" | "apiKey";
  token: string;
  header?: string;
}

export interface ClientConfig {
  baseUrl: string;
  basePath?: string;
  auth?: AuthConfig;
  defaultHeaders?: Record<string, string>;
  fetcher?: typeof fetch;
}
