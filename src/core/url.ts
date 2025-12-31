const SLASHES = /^\/+|\/+$/g;

export function joinPath(...segments: string[]): string {
  const cleaned = segments
    .map((segment) => segment.trim())
    .map((segment) => segment.replace(SLASHES, ""))
    .filter((segment) => segment.length > 0);

  if (cleaned.length === 0) {
    return "/";
  }

  return `/${cleaned.join("/")}`;
}

export function joinUrl(baseUrl: string, ...paths: string[]): string {
  const url = new URL(baseUrl);
  url.pathname = joinPath(url.pathname, ...paths);
  return url.toString();
}

export function withQuery(
  url: string,
  query?: Record<string, string | number | boolean | null | undefined>,
): string {
  if (!query) {
    return url;
  }

  const parsed = new URL(url);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    parsed.searchParams.set(key, String(value));
  }

  return parsed.toString();
}
