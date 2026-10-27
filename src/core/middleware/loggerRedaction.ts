import { HEADER_CONTENT_LENGTH, HEADER_CONTENT_TYPE, HEADER_RETRY_AFTER } from "../headers";

export const REDACTED_VALUE = "REDACTED";

export function sensitiveLogKey(key: string): boolean {
  return /token|auth|cookie|session|secret|password|credential|signature|api.?key/i.test(key);
}

/** Header values are opaque. Only constrained content metadata is safe to retain. */
export function logHeaders(headers: Headers, extra: Set<string>): Headers {
  const copy = new Headers();
  headers.forEach((value, name) => {
    let safe = REDACTED_VALUE;
    if (!extra.has(name) && !sensitiveLogKey(name)) {
      if (name === HEADER_CONTENT_TYPE) {
        const mime = value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
        if (
          /^(application\/(json|problem\+json|x-www-form-urlencoded|octet-stream)|text\/(plain|event-stream)|multipart\/form-data)$/.test(
            mime,
          )
        )
          safe = mime;
      } else if (name === HEADER_CONTENT_LENGTH || name === HEADER_RETRY_AFTER) {
        if (/^\d{1,15}$/.test(value)) safe = value;
      }
    }
    copy.set(name, safe);
  });
  return copy;
}

/** The schema route replaces path arguments; query values, fragments and URL credentials are omitted. */
export function logUrl(value: string, schemaPath: string): string {
  if (!value) return "";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "";
  }
  url.username = "";
  url.password = "";
  url.hash = "";
  url.search = "";
  url.pathname = schemaPath.split(/[?#]/, 1)[0]?.replace(/\{[^}]*\}/g, REDACTED_VALUE) ?? "/";
  return url.toString();
}

/** Parse results only: JSON field names and non-string scalar data, never opaque string values. */
export function logJson(value: unknown, depth = 0): unknown {
  if (depth > 20 || typeof value === "string") return REDACTED_VALUE;
  if (Array.isArray(value)) return value.map((entry) => logJson(entry, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        sensitiveLogKey(key) ? REDACTED_VALUE : logJson(entry, depth + 1),
      ]),
    );
  }
  return value;
}
