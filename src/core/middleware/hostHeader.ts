import type { Middleware } from "openapi-fetch";
import { CircleConfigError } from "../errors";
import { HEADER_HOST } from "../headers";

export type HostHeaderConfig = {
  host: string;
};

export function createHostHeaderMiddleware(config: HostHeaderConfig): Middleware {
  const host = config.host?.trim();
  if (!host) {
    throw new CircleConfigError("host is required to set the Host header.");
  }

  if (isBrowserRuntime()) {
    throw new CircleConfigError(
      "Admin API requires 'host' header; use server-side runtime or proxy.",
    );
  }

  return {
    onRequest({ request }) {
      const headers = new Headers(request.headers);
      headers.set(HEADER_HOST, host);
      return new Request(request, { headers });
    },
  };
}

function isBrowserRuntime() {
  return typeof window !== "undefined" && typeof window.document !== "undefined";
}
