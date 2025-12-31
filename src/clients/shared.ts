import type { Client, Middleware, PathBasedClient } from "openapi-fetch";
import * as openapiFetch from "openapi-fetch";
import { CircleConfigError } from "../core/errors";
import { createSmartFetch, type RetryConfig } from "../core/http";
import { createLoggerMiddleware, type LoggerHooks } from "../core/middleware/logger";

export type ClientRuntimeConfig = {
  baseUrl: string;
  timeoutMs?: number;
  retries?: RetryConfig;
  userAgent?: string;
  logger?: LoggerHooks;
  fetcher?: typeof fetch;
  fetch?: (request: Request) => Promise<Response>;
};

export type DualClient<Paths extends object> = Client<Paths> & PathBasedClient<Paths>;

type CreateClient = typeof import("openapi-fetch")["default"];
type WrapAsPathBasedClient = typeof import("openapi-fetch")["wrapAsPathBasedClient"];

export function createOpenApiClient<Paths extends object>(
  config: ClientRuntimeConfig,
  middleware: Middleware[],
): DualClient<Paths> {
  const createClient = resolveCreateClient(openapiFetch);
  const wrapAsPathBasedClient = resolveWrapAsPathBasedClient(openapiFetch);
  if (!createClient || !wrapAsPathBasedClient) {
    throw new CircleConfigError("Failed to load openapi-fetch exports.");
  }
  const smartFetch = createSmartFetch({
    baseUrl: config.baseUrl,
    throwOnHttpError: false,
    ...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
    ...(config.retries !== undefined ? { retries: config.retries } : {}),
    ...(config.userAgent !== undefined ? { userAgent: config.userAgent } : {}),
    ...(config.fetcher !== undefined ? { fetcher: config.fetcher } : {}),
  });

  const client = createClient<Paths>({
    baseUrl: config.baseUrl,
    fetch: config.fetch ?? ((request) => smartFetch(request)),
  });

  const loggerMiddleware = createLoggerMiddleware(config.logger);
  const allMiddleware = loggerMiddleware ? [...middleware, loggerMiddleware] : middleware;

  if (allMiddleware.length > 0) {
    client.use(...allMiddleware);
  }

  const pathClient = wrapAsPathBasedClient(client);
  return Object.assign(pathClient, client) as DualClient<Paths>;
}

function resolveCreateClient(mod: unknown): CreateClient | undefined {
  if (typeof mod === "function") {
    return mod as CreateClient;
  }
  if (!mod || typeof mod !== "object") {
    return undefined;
  }
  const maybeDefault = (mod as { default?: unknown }).default;
  if (typeof maybeDefault === "function") {
    return maybeDefault as CreateClient;
  }
  const nestedDefault = (maybeDefault as { default?: unknown } | undefined)?.default;
  if (typeof nestedDefault === "function") {
    return nestedDefault as CreateClient;
  }
  return undefined;
}

function resolveWrapAsPathBasedClient(mod: unknown): WrapAsPathBasedClient | undefined {
  if (!mod || typeof mod !== "object") {
    return undefined;
  }
  const direct = (mod as { wrapAsPathBasedClient?: unknown }).wrapAsPathBasedClient;
  if (typeof direct === "function") {
    return direct as WrapAsPathBasedClient;
  }
  const maybeDefault = (mod as { default?: unknown }).default as
    | { wrapAsPathBasedClient?: unknown }
    | undefined;
  if (maybeDefault && typeof maybeDefault.wrapAsPathBasedClient === "function") {
    return maybeDefault.wrapAsPathBasedClient as WrapAsPathBasedClient;
  }
  return undefined;
}
