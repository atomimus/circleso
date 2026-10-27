import type { Middleware, MiddlewareCallbackParams } from "openapi-fetch";
import { validateConfigObject } from "../config";
import {
  CircleConfigError,
  CircleHttpError,
  CircleNetworkError,
  CircleTimeoutError,
} from "../errors";
import { inspectLogBody } from "./loggerBody";
import { logHeaders, logUrl, REDACTED_VALUE } from "./loggerRedaction";

type LoggerContext = Pick<MiddlewareCallbackParams, "id" | "schemaPath"> & { request: Request };

/** Detached, redacted snapshots. Raw middleware params/options are deliberately excluded. */
export type LoggerRequestContext = LoggerContext & { requestBody?: string };
export type LoggerResponseContext = LoggerContext & { response: Response; responseBody?: string };
export type LoggerErrorContext = LoggerContext & {
  requestBody?: string;
  /** No message, stack, cause, body, URL or arbitrary properties from the original error. */
  error: { name: string; status?: number };
};

export type LoggerHooks = {
  /** Sync and async hooks are awaited; return values are ignored. */
  onRequest?: (params: LoggerRequestContext) => void;
  onResponse?: (params: LoggerResponseContext) => void;
  onError?: (params: LoggerErrorContext) => void;
  /** Add to the mandatory header redactions; cannot turn them off. */
  redactHeaders?: string[];
  logBodies?: boolean;
  /** Inspection cap in UTF-8 bytes. Default 64 KiB; 0 disables; maximum 1 MiB. */
  maxBodyBytes?: number;
  /** Per-body inspection deadline. Default 50 ms; range 1 through 1000 ms. */
  bodyReadTimeoutMs?: number;
};

export function createLoggerMiddleware(logger?: LoggerHooks): Middleware | undefined {
  if (logger === undefined) return undefined;
  validateConfigObject(logger, "logger");
  const { onRequest, onResponse, onError, logBodies = false } = logger;
  for (const [name, hook] of Object.entries({ onRequest, onResponse, onError })) {
    if (hook !== undefined && typeof hook !== "function")
      throw new CircleConfigError(`logger.${name} must be a function.`);
  }
  if (typeof logBodies !== "boolean")
    throw new CircleConfigError("logger.logBodies must be a boolean.");
  const maxBodyBytes = logger.maxBodyBytes !== undefined ? logger.maxBodyBytes : 65_536;
  const bodyReadTimeoutMs = logger.bodyReadTimeoutMs !== undefined ? logger.bodyReadTimeoutMs : 50;
  validateLimit(maxBodyBytes, "maxBodyBytes", 0, 1_048_576);
  validateLimit(bodyReadTimeoutMs, "bodyReadTimeoutMs", 1, 1000);
  if (
    logger.redactHeaders !== undefined &&
    (!Array.isArray(logger.redactHeaders) ||
      logger.redactHeaders.some(
        (name) => typeof name !== "string" || !/^[!#$%&'*+.^_`|~0-9a-z-]+$/i.test(name),
      ))
  )
    throw new CircleConfigError("logger.redactHeaders must contain valid header names.");
  const redactHeaders = new Set(logger.redactHeaders?.map((name) => name.toLowerCase()));

  const body = (source: Request | Response, enabled = logBodies) =>
    enabled ? inspectLogBody(source, maxBodyBytes, bodyReadTimeoutMs) : undefined;
  const context = (params: MiddlewareCallbackParams): LoggerContext => ({
    id: params.id,
    schemaPath: params.schemaPath,
    request: new Request(logUrl(params.request.url, params.schemaPath), {
      method: params.request.method,
      headers: logHeaders(params.request.headers, redactHeaders),
    }),
  });

  return {
    async onRequest(params) {
      if (!onRequest) return;
      const requestBody = await body(params.request);
      await invoke("onRequest", () =>
        onRequest({ ...context(params), ...(requestBody !== undefined ? { requestBody } : {}) }),
      );
    },
    async onResponse(params) {
      if (!onResponse) return;
      // A stream consumer must retain control of body pulls/backpressure.
      const responseBody = await body(
        params.response,
        logBodies && params.options.parseAs !== "stream",
      );
      const response =
        params.response.status === 0
          ? Response.error()
          : new Response(params.response.body === null ? null : responseBody, {
              status: params.response.status,
              headers: logHeaders(params.response.headers, redactHeaders),
            });
      copyLogMetadata(response, params.response, params.schemaPath);
      await invoke("onResponse", () =>
        onResponse({
          ...context(params),
          response,
          ...(responseBody !== undefined ? { responseBody } : {}),
        }),
      );
    },
    async onError(params) {
      if (!onError) return;
      const requestBody = await body(params.request);
      const error = safeError(params.error);
      await invoke("onError", () =>
        onError({
          ...context(params),
          error,
          ...(requestBody !== undefined ? { requestBody } : {}),
        }),
      );
    },
  };
}

function validateLimit(value: number, name: string, min: number, max: number): void {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new CircleConfigError(`logger.${name} must be an integer from ${min} through ${max}.`);
}

async function invoke(name: string, hook: () => void | Promise<void>): Promise<void> {
  try {
    await hook();
  } catch (cause) {
    throw new CircleConfigError(`Logger ${name} callback failed.`, cause);
  }
}

function safeError(error: unknown): LoggerErrorContext["error"] {
  // Never traverse/toJSON/stringify user-owned error objects or their cause chains.
  if (error instanceof CircleHttpError) {
    const status: unknown = Object.getOwnPropertyDescriptor(error, "status")?.value;
    return {
      name: "CircleHttpError",
      ...(typeof status === "number" && Number.isInteger(status) && status >= 0 && status <= 599
        ? { status }
        : {}),
    };
  }
  if (error instanceof CircleTimeoutError) return { name: "CircleTimeoutError" };
  if (error instanceof CircleNetworkError) return { name: "CircleNetworkError" };
  if (error instanceof CircleConfigError) return { name: "CircleConfigError" };
  return { name: "UnknownError" };
}

function copyLogMetadata(copy: Response, source: Response, schemaPath: string): void {
  Object.defineProperties(copy, {
    url: { value: logUrl(source.url, schemaPath), configurable: true },
    redirected: { value: source.redirected, configurable: true },
    type: { value: source.type, configurable: true },
    // Reason phrases are unstructured server text, so omit them from the snapshot.
    statusText: { value: source.statusText ? REDACTED_VALUE : "", configurable: true },
    clone: {
      configurable: true,
      value() {
        const clone = Response.prototype.clone.call(copy);
        copyLogMetadata(clone, copy, schemaPath);
        return clone;
      },
    },
  });
}
