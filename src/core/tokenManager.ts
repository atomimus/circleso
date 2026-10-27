import {
  requireToken,
  resolveBaseUrl,
  validateConfigObject,
  validateOptionalToken,
  validateTimeout,
  validateTokenHooks,
} from "./config";
import { CircleConfigError, CircleHttpError, CircleSdkError } from "./errors";
import { HEADER_ACCEPT, HEADER_AUTHORIZATION, HEADER_CONTENT_TYPE } from "./headers";
import { createRecoveringFetch, type RetryConfig } from "./http";
import { createHttpLifetime } from "./httpLifetime";
import { readResponseBody, responseContext } from "./response";
import { requireServerRuntime } from "./runtime";
import type { UsageControlsConfig } from "./usageControls";

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
  /** Server-side Headless Auth application token; distinct from the member refresh token. */
  authToken: string;
  authBaseUrl?: string;
  timeoutMs?: number;
  retries?: RetryConfig;
  usage?: UsageControlsConfig;
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
  validateConfigObject(config);
  validateTokenHooks(config);
  validateOptionalToken(config.accessToken, "accessToken");
  validateOptionalToken(config.refreshToken, "refreshToken");
  type Generation = { token: string | undefined; recovery?: Promise<string> };
  let generation: Generation = { token: config.accessToken };
  let refreshInFlight: Promise<string> | undefined;
  const refreshToken = config.refreshToken;

  async function getAccessToken() {
    const before = generation;
    try {
      if (config.getAccessToken) {
        const stored = await config.getAccessToken();
        validateToken(stored);
        // An older asynchronous read cannot overwrite a newer token generation.
        if (generation === before && stored !== generation.token) {
          generation = { token: stored };
        }
      }
      return generation.token;
    } catch (cause) {
      throw new CircleConfigError("Could not read the access token.", cause);
    }
  }

  async function setAccessToken(token: string | undefined) {
    validateToken(token);
    const before = generation;
    try {
      await config.setAccessToken?.(token);
      if (generation === before) generation = { token };
    } catch (cause) {
      throw new CircleConfigError("Could not store the access token.", cause);
    }
  }

  function getRefreshToken() {
    return refreshToken;
  }

  function createAutoRefreshFetch(options: AutoRefreshFetchConfig) {
    validateConfigObject(options);
    requireToken(options.authToken, "authToken (Headless Auth application token)");
    requireToken(refreshToken, "refreshToken for auto-refresh");
    validateTimeout(options.timeoutMs);
    requireServerRuntime(
      "Headless auto-refresh uses a secret Auth application token. Run it on your server; browser/worker Member clients should refresh through their server.",
    );
    const baseUrl = resolveBaseUrl(options.baseUrl);
    const authBaseUrl = resolveBaseUrl(options.authBaseUrl ?? baseUrl);
    const requestFetch = createRecoveringFetch({
      baseUrl,
      throwOnHttpError: false,
      ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
      ...(options.retries !== undefined ? { retries: options.retries } : {}),
      ...(options.usage !== undefined ? { usage: options.usage } : {}),
      ...(options.userAgent !== undefined ? { userAgent: options.userAgent } : {}),
      ...(options.fetcher !== undefined ? { fetcher: options.fetcher } : {}),
    });

    return async function autoRefreshFetch(request: Request): Promise<Response> {
      const sentAuthorization = request.headers.get(HEADER_AUTHORIZATION);
      const sentGeneration = generation;
      return requestFetch(request, async () => {
        // Cancellation removes only this waiter; it never aborts shared refresh work.
        const wait = createHttpLifetime([request.signal]);
        try {
          wait.throwIfAborted();
          const nextToken = await wait.wait(recover(sentGeneration, sentAuthorization));
          return new Headers({ [HEADER_AUTHORIZATION]: `Bearer ${nextToken}` });
        } catch (cause) {
          if (wait.signal.aborted)
            Object.assign(wait.signal.reason, { url: request.url, method: request.method });
          throw cause;
        } finally {
          wait.cleanup();
        }
      });
    };

    function recover(sent: Generation, authorization: string | null): Promise<string> {
      if (
        generation.token &&
        (generation !== sent || authorization !== `Bearer ${generation.token}`)
      ) {
        return Promise.resolve(generation.token);
      }
      // Retain the settled failure on this generation: late failures must not start a stampede.
      if (!sent.recovery) {
        sent.recovery = recoverGeneration(sent);
      }
      return sent.recovery;
    }

    async function recoverGeneration(sent: Generation): Promise<string> {
      // A different generation may have rotated in caller storage during an earlier refresh.
      // Serialize that generation's refresh without poisoning it with the older result/failure.
      if (refreshInFlight) await refreshInFlight.catch(() => {});
      if (generation !== sent) {
        if (generation.token) return generation.token;
        throw new CircleConfigError("Access token was cleared while refreshing.");
      }
      const operation = refreshAccessToken(sent);
      refreshInFlight = operation;
      try {
        return await operation;
      } finally {
        if (refreshInFlight === operation) refreshInFlight = undefined;
      }
    }

    async function refreshAccessToken(sent: Generation): Promise<string> {
      const refreshUrl = new URL(`${authBaseUrl.replace(/\/$/, "")}${REFRESH_PATH}`).toString();
      const context = { url: refreshUrl, method: "PATCH" };
      // Also bound caller-owned hooks. A hook must cooperate to stop its own side effects.
      const lifetime = createHttpLifetime([], options.timeoutMs);
      let response: Response | undefined;
      try {
        const current = await lifetime.wait(getAccessToken());
        if (generation !== sent) {
          if (current) return current;
          throw new CircleConfigError("Access token was cleared while refreshing.");
        }
        if (!refreshToken)
          throw new CircleConfigError("refreshToken is required for auto-refresh.");
        response = await requestFetch(
          new Request(refreshUrl, {
            ...context,
            signal: lifetime.signal,
            headers: {
              [HEADER_AUTHORIZATION]: `Bearer ${options.authToken}`,
              [HEADER_ACCEPT]: "application/json",
              [HEADER_CONTENT_TYPE]: "application/json",
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          }),
          undefined,
          { retries: { retries: 0 } },
        );
        // Read once, through shared core readers: transport failures remain transport failures.
        await response.text();
        const evidence = await readResponseBody(response);
        const details = { ...responseContext(response, context), ...evidence };
        if (!response.ok) {
          throw new CircleHttpError(`Token refresh failed with status ${response.status}`, details);
        }
        const nextToken = extractAccessToken(evidence.parsedJson);
        if (!nextToken)
          throw new CircleHttpError(
            "Token refresh response missing a valid access_token.",
            details,
          );
        if (generation === sent) {
          // Publish only after storage succeeds; a late setter must not commit after the deadline.
          await lifetime.wait(Promise.resolve().then(() => config.setAccessToken?.(nextToken)));
          lifetime.throwIfAborted();
          if (generation === sent) generation = { token: nextToken };
        }
        if (!generation.token)
          throw new CircleConfigError("Access token was cleared while refreshing.");
        return generation.token;
      } catch (cause) {
        if (lifetime.signal.aborted) {
          Object.assign(
            lifetime.signal.reason,
            response ? responseContext(response, context) : context,
          );
          throw lifetime.signal.reason;
        }
        if (cause instanceof CircleSdkError) throw cause;
        throw new CircleConfigError("Could not refresh or store the access token.", cause);
      } finally {
        lifetime.cleanup();
      }
    }
  }

  return {
    getAccessToken,
    setAccessToken,
    getRefreshToken,
    createAutoRefreshFetch,
  };
}

function extractAccessToken(parsedJson: unknown) {
  if (!parsedJson || typeof parsedJson !== "object") {
    return undefined;
  }

  const value = (parsedJson as { access_token?: unknown }).access_token;
  return typeof value === "string" && isHeaderSafeToken(value) ? value : undefined;
}

function validateToken(token: string | undefined): void {
  validateOptionalToken(token, "Access token");
}

function isHeaderSafeToken(value: string): boolean {
  return /^[!-~]+$/.test(value);
}
