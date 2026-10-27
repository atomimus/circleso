import { CircleHttpError, CircleNetworkError, CircleSdkError } from "./errors";
import {
  HEADER_CONTENT_MD5,
  HEADER_CONTENT_TYPE,
  HEADER_CORRELATION_ID,
  HEADER_REQUEST_ID,
} from "./headers";
import { createSmartFetch } from "./http";
import { discardResponse } from "./httpLifetime";

/** Isolated transport: no Circle client, headers, cookies, auth recovery or logging hooks. */
export async function putSignedUpload(
  destination: Record<string, unknown> | undefined,
  file: Blob,
  signal: AbortSignal,
  fetcher?: typeof fetch,
): Promise<void> {
  let url: URL;
  const headers = new Headers();
  try {
    if (typeof destination?.url !== "string") throw new TypeError("Missing upload URL.");
    url = new URL(destination.url);
    if (url.protocol !== "https:" || url.username || url.password || url.hash) {
      throw new TypeError("Upload URL must use HTTPS without userinfo or fragments.");
    }
    const values = destination.headers;
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      throw new TypeError("Missing upload headers.");
    }
    for (const [name, value] of Object.entries(values)) {
      if (
        ![HEADER_CONTENT_TYPE, HEADER_CONTENT_MD5].includes(name.toLowerCase()) ||
        typeof value !== "string"
      ) {
        throw new TypeError(
          "Unsupported upload header; use the raw registration API for a custom transport.",
        );
      }
      if (headers.has(name)) throw new TypeError("Duplicate upload header.");
      headers.set(name, value);
    }
  } catch (cause) {
    // Do not put the signed destination or header values in the error message.
    throw new CircleNetworkError("Invalid or unsupported direct upload destination.", cause);
  }
  const context = { url: `${url.origin}/[signed-upload]`, method: "PUT" };
  let response: Response | undefined;
  try {
    const send = createSmartFetch({
      baseUrl: url.origin,
      retries: { retries: 0 },
      throwOnHttpError: false,
      ...(fetcher !== undefined ? { fetcher } : {}),
    });
    response = await send(url, {
      method: "PUT",
      headers,
      body: new Blob([file]),
      signal,
      credentials: "omit",
      redirect: "error",
      referrer: "",
      referrerPolicy: "no-referrer",
      mode: "cors",
      cache: "no-store",
    });
    // Consume success/error bodies with a bounded diagnostic prefix. Core owns deadlines.
    const reader = response.body?.getReader();
    const parts: Uint8Array<ArrayBuffer>[] = [];
    let length = 0;
    let bodyCause: unknown;
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!response.ok) {
            const part = value.subarray(0, 64 * 1024 - length);
            parts.push(part.slice());
            length += part.byteLength;
            if (length >= 64 * 1024) {
              void reader.cancel().catch(() => {});
              break;
            }
          }
        }
      } catch (cause) {
        if (signal.aborted || response.ok) throw cause;
        bodyCause = cause instanceof CircleNetworkError ? cause.cause : cause;
      } finally {
        reader.releaseLock();
      }
    }
    if (!response.ok) {
      const requestId =
        response.headers.get(HEADER_REQUEST_ID) ?? response.headers.get(HEADER_CORRELATION_ID);
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const part of parts) {
        bytes.set(part, offset);
        offset += part.byteLength;
      }
      const bodyText = new TextDecoder().decode(bytes);
      let parsedJson: unknown;
      let cause: unknown = bodyCause;
      try {
        parsedJson = bodyText ? JSON.parse(bodyText) : undefined;
      } catch (error) {
        cause ??= error;
      }
      throw new CircleHttpError(`Storage upload failed with status ${response.status}`, {
        ...context,
        status: response.status,
        bodyText,
        parsedJson,
        cause,
        ...(requestId !== null ? { requestId } : {}),
      });
    }
  } catch (cause) {
    // Retain original causes, but remove signed paths/queries from SDK context.
    if (cause instanceof CircleSdkError) {
      if (cause instanceof CircleNetworkError || cause instanceof CircleHttpError || "url" in cause)
        Object.assign(cause, context);
      throw cause;
    }
    throw new CircleNetworkError("Storage upload failed.", cause, context);
  } finally {
    if (response && !response.bodyUsed) discardResponse(response);
  }
}
