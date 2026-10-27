import { type AdminApi, createAdmin } from "./adminApi";
import { type AuthApi, createAuth } from "./authApi";
import {
  requireToken,
  resolveBaseUrl,
  resolveCommunityHost,
  validateConfigObject,
} from "./core/config";
import type { RetryConfig } from "./core/http";
import type { LoggerHooks } from "./core/middleware/logger";
import type { TokenHooks } from "./core/tokenManager";
import type { UsageControlsConfig } from "./core/usageControls";
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
    authToken?: string;
    autoRefresh?: boolean;
    authBaseUrl?: string;
    getAccessToken?: TokenHooks["getAccessToken"];
    setAccessToken?: TokenHooks["setAccessToken"];
  };
  auth?: {
    baseUrl?: string;
    communityHost?: string;
    /** Server-only Headless Auth application token. */
    token?: string;
  };
  timeoutMs?: number;
  retries?: RetryConfig;
  usage?: UsageControlsConfig;
  userAgent?: string;
  logger?: LoggerHooks;
  fetcher?: typeof fetch;
};

export class CircleSo {
  readonly admin: AdminApi;
  readonly headless: HeadlessApi;
  readonly auth: AuthApi;

  constructor(config: CircleSoConfig) {
    validateConfigObject(config);
    for (const name of ["admin", "headless", "auth"] as const) {
      if (config[name] !== undefined) validateConfigObject(config[name], name);
    }
    for (const options of [config, config.admin, config.headless, config.auth]) {
      if (options?.baseUrl !== undefined) resolveBaseUrl(options.baseUrl);
      if (options?.communityHost !== undefined) resolveCommunityHost(options.communityHost);
    }
    const adminConfig = config.admin ?? {};
    const headlessConfig = config.headless ?? {};
    const authConfig = config.auth ?? {};

    const sharedRuntime = {
      ...(config.timeoutMs !== undefined ? { timeoutMs: config.timeoutMs } : {}),
      ...(config.retries !== undefined ? { retries: config.retries } : {}),
      ...(config.usage !== undefined ? { usage: config.usage } : {}),
      ...(config.userAgent !== undefined ? { userAgent: config.userAgent } : {}),
      ...(config.logger !== undefined ? { logger: config.logger } : {}),
      ...(config.fetcher !== undefined ? { fetcher: config.fetcher } : {}),
    };

    const adminBaseUrl = adminConfig.baseUrl ?? config.baseUrl;
    const adminCommunityHost = adminConfig.communityHost ?? config.communityHost;

    this.admin = createAdmin({
      token: requireToken(adminConfig.token, "admin.token"),
      ...(adminBaseUrl !== undefined ? { baseUrl: adminBaseUrl } : {}),
      ...(adminCommunityHost !== undefined ? { communityHost: adminCommunityHost } : {}),
      ...sharedRuntime,
    });

    const headlessBaseUrl = headlessConfig.baseUrl ?? config.baseUrl;
    const headlessCommunityHost = headlessConfig.communityHost ?? config.communityHost;

    this.headless = createHeadless({
      ...(headlessBaseUrl !== undefined ? { baseUrl: headlessBaseUrl } : {}),
      ...(headlessCommunityHost !== undefined ? { communityHost: headlessCommunityHost } : {}),
      ...(headlessConfig.accessToken !== undefined
        ? { accessToken: headlessConfig.accessToken }
        : {}),
      ...(headlessConfig.token !== undefined ? { token: headlessConfig.token } : {}),
      ...(headlessConfig.refreshToken !== undefined
        ? { refreshToken: headlessConfig.refreshToken }
        : {}),
      ...(headlessConfig.authToken !== undefined ? { authToken: headlessConfig.authToken } : {}),
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
      token: requireToken(authConfig.token, "auth.token (Headless Auth application token)"),
      ...(authBaseUrl !== undefined ? { baseUrl: authBaseUrl } : {}),
      ...(authCommunityHost !== undefined ? { communityHost: authCommunityHost } : {}),
      ...sharedRuntime,
    });
  }
}
