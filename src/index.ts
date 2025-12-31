import { type AdminApi, createAdmin } from "./adminApi";
import { type AuthApi, createAuth } from "./authApi";
import { CircleConfigError } from "./core/errors";
import type { RetryConfig } from "./core/http";
import type { LoggerHooks } from "./core/middleware/logger";
import type { TokenHooks } from "./core/tokenManager";
import { createHeadless, type HeadlessApi } from "./headlessApi";

export * from "./adminApi";
export * from "./authApi";
export * from "./clients";
export * from "./core";
export * from "./headlessApi";

export type CircleSoConfig = {
  baseUrl?: string;
  communityHost?: string;
  admin?: {
    baseUrl?: string;
    token?: string;
    communityHost?: string;
  };
  headless?: {
    baseUrl?: string;
    communityHost?: string;
    token?: string;
    accessToken?: string;
    refreshToken?: string;
    autoRefresh?: boolean;
    authBaseUrl?: string;
    getAccessToken?: TokenHooks["getAccessToken"];
    setAccessToken?: TokenHooks["setAccessToken"];
  };
  auth?: {
    baseUrl?: string;
    communityHost?: string;
    token?: string;
  };
  timeoutMs?: number;
  retries?: RetryConfig;
  userAgent?: string;
  logger?: LoggerHooks;
  fetcher?: typeof fetch;
};

export class CircleSo {
  readonly admin: AdminApi;
  readonly headless: HeadlessApi;
  readonly auth: AuthApi;

  constructor(config: CircleSoConfig) {
    const adminConfig = config.admin ?? {};
    const headlessConfig = config.headless ?? {};
    const authConfig = config.auth ?? {};

    const sharedRuntime = {
      ...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
      ...(config.retries !== undefined ? { retries: config.retries } : {}),
      ...(config.userAgent !== undefined ? { userAgent: config.userAgent } : {}),
      ...(config.logger !== undefined ? { logger: config.logger } : {}),
      ...(config.fetcher !== undefined ? { fetcher: config.fetcher } : {}),
    };

    const adminBaseUrl = adminConfig.baseUrl ?? config.baseUrl;
    const adminCommunityHost = adminConfig.communityHost ?? config.communityHost;

    this.admin = createAdmin({
      token: requireValue(adminConfig.token, "admin.token is required."),
      ...(adminBaseUrl !== undefined ? { baseUrl: adminBaseUrl } : {}),
      ...(adminCommunityHost !== undefined ? { communityHost: adminCommunityHost } : {}),
      ...sharedRuntime,
    });

    const headlessAccessToken = headlessConfig.accessToken ?? headlessConfig.token;
    if (!headlessAccessToken && !headlessConfig.getAccessToken) {
      throw new CircleConfigError("headless.accessToken or headless.token is required.");
    }

    const headlessBaseUrl = headlessConfig.baseUrl ?? config.baseUrl;
    const headlessCommunityHost = headlessConfig.communityHost ?? config.communityHost;

    this.headless = createHeadless({
      ...(headlessBaseUrl !== undefined ? { baseUrl: headlessBaseUrl } : {}),
      ...(headlessCommunityHost !== undefined ? { communityHost: headlessCommunityHost } : {}),
      ...(headlessAccessToken !== undefined ? { accessToken: headlessAccessToken } : {}),
      ...(headlessConfig.refreshToken !== undefined
        ? { refreshToken: headlessConfig.refreshToken }
        : {}),
      ...(headlessConfig.autoRefresh !== undefined
        ? { autoRefresh: headlessConfig.autoRefresh }
        : {}),
      ...(headlessConfig.authBaseUrl !== undefined
        ? { authBaseUrl: headlessConfig.authBaseUrl }
        : {}),
      ...(headlessConfig.getAccessToken !== undefined
        ? { getAccessToken: headlessConfig.getAccessToken }
        : {}),
      ...(headlessConfig.setAccessToken !== undefined
        ? { setAccessToken: headlessConfig.setAccessToken }
        : {}),
      ...sharedRuntime,
    });

    const authBaseUrl = authConfig.baseUrl ?? config.baseUrl;
    const authCommunityHost = authConfig.communityHost ?? config.communityHost;

    this.auth = createAuth({
      token: requireValue(authConfig.token, "auth.token is required."),
      ...(authBaseUrl !== undefined ? { baseUrl: authBaseUrl } : {}),
      ...(authCommunityHost !== undefined ? { communityHost: authCommunityHost } : {}),
      ...sharedRuntime,
    });
  }
}

function requireValue<T>(value: T | undefined, message: string): T {
  if (value === undefined || value === null || value === "") {
    throw new CircleConfigError(message);
  }
  return value;
}
