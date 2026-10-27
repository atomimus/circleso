import { CircleConfigError, CircleHttpError } from "./errors";
import { HEADER_ACCEPT, HEADER_AUTHORIZATION, HEADER_CONTENT_TYPE } from "./headers";
import { createSmartFetch, type RetryConfig } from "./http";
import { createHttpLifetime, discardResponse } from "./httpLifetime";
import { buildHttpError, readResponseBody, responseContext } from "./response";

const REFRESH_PATH = "/api/v1/headless/access_token/refresh";

export type TokenHooks = {
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  setAccessToken?: (token: string | undefined) => void | Promise<void>;
};

export type TokenManagerConfig = TokenHooks & {
  accessToken?: string;
  refreshToken?: string;
};

export type AutoRefreshFetchConfig = {
  baseUrl: string;
  authBaseUrl?: string;
  timeoutMs?: number;
  retries?: RetryConfig;
  userAgent?: string;
  fetcher?: typeof fetch;
};

export type TokenManager = {
  getAccessToken: () => Promise<string | undefined>;
  setAccessToken: (token: string | undefined) => Promise<void>;
  getRefreshToken: () => string | undefined;
  createAutoRefreshFetch: (
    config: AutoRefreshFetchConfig,
  ) => (request: Request) => Promise<Response>;
};

export function createTokenManager(config: TokenManagerConfig): TokenManager {
  let accessToken = config.accessToken;
  let refreshInFlight: Promise<string> | undefined;
  const refreshToken = config.refreshToken;

  async function getAccessToken() {
    if (config.getAccessToken) {
      const stored = await config.getAccessToken();
      if (stored !== undefined) {
        accessToken = stored;
      }
    }
    return accessToken;
  }

  async function setAccessToken(token: string | undefined) {
    accessToken = token;
    await config.setAccessToken?.(token);
  }

  function getRefreshToken() {
    return refreshToken;
  }

  function createAutoRefreshFetch(options: AutoRefreshFetchConfig) {
    const authBaseUrl = options.authBaseUrl ?? options.baseUrl;
    const requestFetch = createSmartFetch({
      baseUrl: options.baseUrl,
      throwOnHttpError: false,
      ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
      ...(options.retries !== undefined ? { retries: options.retries } : {}),
      ...(options.userAgent !== undefined ? { userAgent: options.userAgent } : {}),
      ...(options.fetcher !== undefined ? { fetcher: options.fetcher } : {}),
    });

    const refreshFetch = createSmartFetch({
      baseUrl: authBaseUrl,
      throwOnHttpError: false,
      ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
      ...(options.retries !== undefined ? { retries: options.retries } : {}),
      ...(options.userAgent !== undefined ? { userAgent: options.userAgent } : {}),
      ...(options.fetcher !== undefined ? { fetcher: options.fetcher } : {}),
    });

    const retriedRequests = new WeakSet<Request>();

    return async function autoRefreshFetch(request: Request): Promise<Response> {
      const retryBase = request.clone();
      const response = await requestFetch(request);
      if (response.ok || retriedRequests.has(request)) {
        return response;
      }

      const shouldRefresh = await shouldAttemptRefresh(response);
      if (!shouldRefresh) {
        return response;
      }

      const refreshTokenValue = getRefreshToken();
      if (!refreshTokenValue) {
        throw new CircleConfigError("refreshToken is required for auto-refresh.");
      }

      // This response will not be returned or parsed by the caller.
      discardResponse(response);
      // Cancellation stops this caller waiting; a shared refresh keeps its own attempt budget.
      const refreshWait = createHttpLifetime([request.signal]);
      try {
        refreshWait.throwIfAborted();
        await refreshWait.wait(refreshAccessToken(refreshFetch, refreshTokenValue, authBaseUrl));
      } finally {
        refreshWait.cleanup();
      }

      const newAccessToken = await getAccessToken();
      if (!newAccessToken) {
        throw await buildHttpError(response, request);
      }

      const retryRequest = cloneRequestWithAuth(retryBase, newAccessToken);
      retriedRequests.add(retryRequest);
      return requestFetch(retryRequest);
    };
  }

  async function refreshAccessToken(
    refreshFetch: (request: Request) => Promise<Response>,
    token: string,
    authBaseUrl: string,
  ) {
    if (refreshInFlight) {
      return refreshInFlight;
    }

    const refreshPromise = (async () => {
      const refreshUrl = new URL(REFRESH_PATH, authBaseUrl).toString();
      const refreshRequest = new Request(refreshUrl, {
        method: "PATCH",
        headers: {
          [HEADER_AUTHORIZATION]: `Bearer ${token}`,
          [HEADER_ACCEPT]: "application/json",
          [HEADER_CONTENT_TYPE]: "application/json",
        },
        body: JSON.stringify({ refresh_token: token }),
      });

      const response = await refreshFetch(refreshRequest);
      const evidence = await readBody(response);
      const { parsedJson } = evidence;
      const details = { ...responseContext(response, refreshRequest), ...evidence };

      if (!response.ok) {
        throw new CircleHttpError(`Token refresh failed with status ${response.status}`, details);
      }

      const nextToken = extractAccessToken(parsedJson);
      if (!nextToken) {
        throw new CircleHttpError("Token refresh response missing access_token.", details);
      }

      await setAccessToken(nextToken);
      return nextToken;
    })();

    refreshInFlight = refreshPromise;
    try {
      return await refreshPromise;
    } finally {
      refreshInFlight = undefined;
    }
  }

  return {
    getAccessToken,
    setAccessToken,
    getRefreshToken,
    createAutoRefreshFetch,
  };
}

async function shouldAttemptRefresh(response: Response) {
  if (response.status === 401 || response.status === 403) {
    return true;
  }

  const { bodyText, parsedJson } = await readBody(response);
  const message = extractMessage(parsedJson, bodyText);
  return message?.toLowerCase().includes("expired") ?? false;
}

function cloneRequestWithAuth(request: Request, accessToken: string) {
  const headers = new Headers(request.headers);
  headers.set(HEADER_AUTHORIZATION, `Bearer ${accessToken}`);
  return new Request(request, { headers });
}

async function readBody(response: Response) {
  const copy = response.clone();
  // Preserve transport/deadline failures; the shared parser supplies best-effort JSON evidence.
  if (copy.ok) await copy.json();
  else await copy.text();
  return readResponseBody(copy);
}

function extractAccessToken(parsedJson: unknown) {
  if (!parsedJson || typeof parsedJson !== "object") {
    return undefined;
  }

  const value = (parsedJson as { access_token?: unknown }).access_token;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function extractMessage(parsedJson: unknown, bodyText?: string) {
  if (typeof parsedJson === "string") {
    return parsedJson;
  }

  if (parsedJson && typeof parsedJson === "object") {
    const record = parsedJson as Record<string, unknown>;
    const message = record.message ?? record.error ?? record.detail;
    if (typeof message === "string") {
      return message;
    }
  }

  return bodyText;
}
