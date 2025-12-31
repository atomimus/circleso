import type { Client, Middleware, PathBasedClient } from "openapi-fetch";
import createClient, { wrapAsPathBasedClient } from "openapi-fetch";
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

export function createOpenApiClient<Paths extends object>(
  config: ClientRuntimeConfig,
  middleware: Middleware[],
): DualClient<Paths> {
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
