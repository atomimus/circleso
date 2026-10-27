import {
  resolveBaseUrl,
  resolveCommunityHost,
  validateConfigObject,
  validateOptionalToken,
  validateTokenHooks,
} from "../core/config";
import { CircleConfigError } from "../core/errors";
import type { RetryConfig } from "../core/http";
import { createBearerAuthMiddleware } from "../core/middleware/bearerAuth";
import type { LoggerHooks } from "../core/middleware/logger";
import { paginateByIdWindow, toAsyncIterator } from "../core/pagination";
import { unwrapResult } from "../core/response";
import { requireServerRuntime } from "../core/runtime";
import { createTokenManager, type TokenHooks } from "../core/tokenManager";
import type { paths as HeadlessPaths } from "../generated/headless-client-v1";
import { createOpenApiClient, type DualClient } from "./shared";

type ChatRoomMessagesResponse =
  HeadlessPaths["/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages"]["get"]["responses"]["200"]["content"]["application/json"];

type ChatRoomMessage = NonNullable<ChatRoomMessagesResponse["records"]>[number];

export type ChatRoomMessagesIteratorOptions = {
  direction?: "previous" | "next";
  id?: number;
  perPage?: number;
  maxPages?: number;
  maxItems?: number;
};

export type HeadlessIterators = {
  chatRoomMessages: (
    chatRoomUuid: string,
    options?: ChatRoomMessagesIteratorOptions,
  ) => AsyncIterable<ChatRoomMessage>;
};

export type HeadlessClient = DualClient<HeadlessPaths> & {
  iter: HeadlessIterators;
};

export type HeadlessClientConfig = {
  baseUrl?: string;
  communityHost?: string;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  /** Server-side Headless Auth application token, required with autoRefresh. */
  authToken?: string;
  autoRefresh?: boolean;
  authBaseUrl?: string;
  getAccessToken?: TokenHooks["getAccessToken"];
  setAccessToken?: TokenHooks["setAccessToken"];
  timeoutMs?: number;
  retries?: RetryConfig;
  userAgent?: string;
  logger?: LoggerHooks;
  fetcher?: typeof fetch;
};

export function createHeadlessClient(config: HeadlessClientConfig): HeadlessClient {
  validateConfigObject(config);
  validateTokenHooks(config);
  for (const name of ["token", "accessToken", "refreshToken", "authToken"] as const)
    validateOptionalToken(config[name], name);
  if (
    config.token !== undefined &&
    config.accessToken !== undefined &&
    config.token !== config.accessToken
  ) {
    throw new CircleConfigError(
      "token and accessToken are aliases; supply only one or the same value for both.",
    );
  }
  if (config.autoRefresh !== undefined && typeof config.autoRefresh !== "boolean")
    throw new CircleConfigError("autoRefresh must be a boolean.");
  if (config.authBaseUrl !== undefined) resolveBaseUrl(config.authBaseUrl);
  if (config.authToken !== undefined || config.autoRefresh)
    requireServerRuntime(
      "Headless auto-refresh uses a secret Auth application token. Keep authToken and autoRefresh on your server; browser/worker Member clients should use getAccessToken with your own server refresh flow.",
    );
  const accessToken = config.accessToken ?? config.token;
  if (!accessToken && !config.getAccessToken) {
    throw new CircleConfigError("headless access token is required.");
  }
  if (config.autoRefresh && !config.refreshToken) {
    throw new CircleConfigError("refreshToken is required when autoRefresh is enabled.");
  }
  if (config.autoRefresh && !config.authToken) {
    throw new CircleConfigError(
      "authToken (Headless Auth application token) is required when autoRefresh is enabled. Keep it on your server; browser callers should refresh through their server.",
    );
  }

  resolveCommunityHost(config.communityHost);
  const baseUrl = resolveBaseUrl(config.baseUrl);
  const tokenManager = createTokenManager({
    ...(accessToken !== undefined ? { accessToken } : {}),
    ...(config.refreshToken !== undefined ? { refreshToken: config.refreshToken } : {}),
    ...(config.getAccessToken !== undefined ? { getAccessToken: config.getAccessToken } : {}),
    ...(config.setAccessToken !== undefined ? { setAccessToken: config.setAccessToken } : {}),
  });

  const middleware = [
    createBearerAuthMiddleware({
      token: () => tokenManager.getAccessToken(),
      ...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
    }),
  ];

  const autoRefreshFetch =
    config.autoRefresh && config.authToken
      ? tokenManager.createAutoRefreshFetch({
          baseUrl,
          authToken: config.authToken,
          authBaseUrl: config.authBaseUrl ?? baseUrl,
          ...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
          ...(config.retries !== undefined ? { retries: config.retries } : {}),
          ...(config.userAgent !== undefined ? { userAgent: config.userAgent } : {}),
          ...(config.fetcher !== undefined ? { fetcher: config.fetcher } : {}),
        })
      : undefined;

  const runtimeConfig = {
    baseUrl,
    ...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
    ...(config.retries !== undefined ? { retries: config.retries } : {}),
    ...(config.userAgent !== undefined ? { userAgent: config.userAgent } : {}),
    ...(config.logger !== undefined ? { logger: config.logger } : {}),
    ...(config.fetcher !== undefined ? { fetcher: config.fetcher } : {}),
    ...(autoRefreshFetch !== undefined ? { fetch: autoRefreshFetch } : {}),
  };

  const client = createOpenApiClient<HeadlessPaths>(runtimeConfig, middleware);

  const iter: HeadlessIterators = {
    chatRoomMessages: (chatRoomUuid, options = {}) => {
      const paginator = paginateByIdWindow<ChatRoomMessage>({
        direction: options.direction ?? "previous",
        ...(options.id !== undefined ? { id: options.id } : {}),
        ...(options.perPage !== undefined ? { perPage: options.perPage } : {}),
        ...(options.maxPages !== undefined ? { maxPages: options.maxPages } : {}),
        ...(options.maxItems !== undefined ? { maxItems: options.maxItems } : {}),
        fetchPage: async ({ id, previousPerPage, nextPerPage }) => {
          const query = {
            ...(id !== undefined ? { id } : {}),
            ...(previousPerPage !== undefined ? { previous_per_page: previousPerPage } : {}),
            ...(nextPerPage !== undefined ? { next_per_page: nextPerPage } : {}),
          };

          const result = await client.GET(
            "/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages",
            {
              params: {
                path: { chat_room_uuid: chatRoomUuid },
                ...(Object.keys(query).length > 0 ? { query } : {}),
              },
            },
          );

          const data = await unwrapResult(
            result,
            "GET",
            "/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages",
          );

          if (!data) {
            return {
              records: [],
              has_previous_page: false,
              has_next_page: false,
            };
          }

          return {
            records: data.records ?? [],
            ...(data.has_previous_page !== undefined
              ? { has_previous_page: data.has_previous_page }
              : {}),
            ...(data.has_next_page !== undefined ? { has_next_page: data.has_next_page } : {}),
            ...(data.first_id !== undefined ? { first_id: data.first_id } : {}),
            ...(data.last_id !== undefined ? { last_id: data.last_id } : {}),
            ...(data.total_count !== undefined ? { total_count: data.total_count } : {}),
          };
        },
      });

      return toAsyncIterator(paginator);
    },
  };

  return Object.assign(client, { iter });
}
