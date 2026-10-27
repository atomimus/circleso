import type { Middleware } from "openapi-fetch";
import { CircleConfigError, CircleSdkError } from "./errors";
import { prepareResponse } from "./response";

/** Retain the dependency's exact generic signatures while guarding its exception boundary. */
export function normalizeClientErrors<Client extends object>(client: Client): Client {
  for (const [name, call] of Object.entries(client)) {
    if (typeof call !== "function") continue;
    const normalize = (cause: unknown) => {
      if (cause instanceof CircleSdkError) return cause;
      return new CircleConfigError(`Could not prepare or process API request (${name}).`, cause);
    };
    const invoke = (...args: unknown[]) => {
      try {
        if (name === "use" || name === "eject") args = args.map(prepareMiddleware);
        const optionsIndex = name === "request" ? 2 : 1;
        const options = args[optionsIndex];
        if (name !== "use" && name !== "eject" && options && typeof options === "object") {
          const { middleware, headers } = options as {
            middleware?: Middleware[];
            headers?: HeadersInit;
          };
          // openapi-fetch 0.15.0 otherwise mistakes tuple headers for a keyed record.
          if (Array.isArray(middleware) || Array.isArray(headers)) {
            args[optionsIndex] = {
              ...options,
              ...(Array.isArray(middleware)
                ? { middleware: middleware.map(prepareMiddleware) }
                : {}),
              ...(Array.isArray(headers) ? { headers: new Headers(headers) } : {}),
            };
          }
        }
        const result: unknown = call(...args);
        return result instanceof Promise
          ? result.catch((cause: unknown) => {
              throw normalize(cause);
            })
          : result;
      } catch (cause) {
        throw normalize(cause);
      }
    };
    Object.defineProperty(client, name, { value: invoke, enumerable: true, configurable: true });
  }
  return client;
}

const middlewareWrappers = new WeakMap<Middleware, Middleware>();

function prepareMiddleware(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const middleware = input as Middleware;
  const onRequest = middleware.onRequest;
  if (!onRequest) return input;
  const previous = middlewareWrappers.get(middleware);
  if (previous) return previous;
  const wrapped: Middleware = {
    async onRequest(params) {
      const result = await onRequest.call(middleware, params);
      // openapi-fetch bypasses onResponse when onRequest returns a cached/synthetic response.
      return result instanceof Response ? prepareResponse(result, params.request) : result;
    },
    ...(middleware.onResponse
      ? {
          onResponse: (params: Parameters<NonNullable<Middleware["onResponse"]>>[0]) =>
            middleware.onResponse?.call(middleware, params),
        }
      : {}),
    ...(middleware.onError
      ? {
          onError: (params: Parameters<NonNullable<Middleware["onError"]>>[0]) =>
            middleware.onError?.call(middleware, params),
        }
      : {}),
  };
  middlewareWrappers.set(middleware, wrapped);
  return wrapped;
}
