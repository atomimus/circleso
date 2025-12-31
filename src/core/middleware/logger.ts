import type { Middleware, MiddlewareCallbackParams } from "openapi-fetch";
import { HEADER_API_KEY, HEADER_AUTHORIZATION, HEADER_COOKIE, HEADER_SET_COOKIE } from "../headers";

const REDACTED_VALUE = "REDACTED";
const DEFAULT_REDACTED_HEADERS = [
  HEADER_AUTHORIZATION,
  HEADER_COOKIE,
  HEADER_SET_COOKIE,
  HEADER_API_KEY,
];

export type LoggerRequestContext = MiddlewareCallbackParams & {
  request: Request;
  requestBody?: string;
};

export type LoggerResponseContext = MiddlewareCallbackParams & {
  request: Request;
  response: Response;
  responseBody?: string;
};

export type LoggerErrorContext = MiddlewareCallbackParams & {
  request: Request;
  requestBody?: string;
  error: unknown;
};

export type LoggerHooks = {
  onRequest?: (params: LoggerRequestContext) => void;
  onResponse?: (params: LoggerResponseContext) => void;
  onError?: (params: LoggerErrorContext) => void;
  redactHeaders?: string[];
  logBodies?: boolean;
};

export function createLoggerMiddleware(logger?: LoggerHooks): Middleware | undefined {
  if (!logger) {
    return undefined;
  }

  const redactHeaders = new Set(
    [...DEFAULT_REDACTED_HEADERS, ...(logger.redactHeaders ?? [])].map((header) =>
      header.toLowerCase(),
    ),
  );
  const logBodies = logger.logBodies ?? false;

  return {
    async onRequest(params) {
      const { request, bodyText } = await sanitizeRequest(params.request, logBodies, redactHeaders);
      const context = {
        ...params,
        request,
        ...(bodyText !== undefined ? { requestBody: bodyText } : {}),
      };
      logger.onRequest?.(context);
    },
    async onResponse(params) {
      const { request } = await sanitizeRequest(params.request, false, redactHeaders);
      const { response, bodyText } = await sanitizeResponse(
        params.response,
        logBodies,
        redactHeaders,
      );
      const context = {
        ...params,
        request,
        response,
        ...(bodyText !== undefined ? { responseBody: bodyText } : {}),
      };
      logger.onResponse?.(context);
    },
    async onError(params) {
      const { request, bodyText } = await sanitizeRequest(params.request, logBodies, redactHeaders);
      const context = {
        ...params,
        request,
        error: params.error,
        ...(bodyText !== undefined ? { requestBody: bodyText } : {}),
      };
      logger.onError?.(context);
    },
  };
}

async function sanitizeRequest(request: Request, logBodies: boolean, redactHeaders: Set<string>) {
  const headers = redactHeaderValues(request.headers, redactHeaders);
  const sanitized = new Request(request.url, { method: request.method, headers });
  const bodyText = logBodies ? await readBodyText(request) : undefined;
  return { request: sanitized, bodyText };
}

async function sanitizeResponse(
  response: Response,
  logBodies: boolean,
  redactHeaders: Set<string>,
) {
  const headers = redactHeaderValues(response.headers, redactHeaders);
  const bodyText = logBodies ? await readBodyText(response) : undefined;
  const sanitized = new Response(bodyText ?? undefined, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  return { response: sanitized, bodyText };
}

function redactHeaderValues(headers: Headers, redactHeaders: Set<string>) {
  const sanitized = new Headers();
  headers.forEach((value, key) => {
    if (redactHeaders.has(key.toLowerCase())) {
      sanitized.set(key, REDACTED_VALUE);
      return;
    }
    sanitized.set(key, value);
  });
  return sanitized;
}

async function readBodyText(source: Request | Response) {
  try {
    const text = await source.clone().text();
    return redactBodyText(text);
  } catch {
    return undefined;
  }
}

function redactBodyText(bodyText: string) {
  const trimmed = bodyText.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(bodyText);
      const redacted = redactJson(parsed);
      return JSON.stringify(redacted);
    } catch {
      // fall through
    }
  }

  return bodyText.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, `Bearer ${REDACTED_VALUE}`);
}

function redactJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => redactJson(entry));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(record)) {
    if (shouldRedactKey(key)) {
      next[key] = REDACTED_VALUE;
      continue;
    }
    next[key] = redactJson(entry);
  }
  return next;
}

function shouldRedactKey(key: string) {
  const lower = key.toLowerCase();
  return lower.includes("token") || lower === "authorization";
}
