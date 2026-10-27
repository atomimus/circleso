import { DEFAULT_BASE_URL, DEFAULT_COMMUNITY_HOST } from "./constants";
import { CircleConfigError } from "./errors";

export function validateConfigObject(value: unknown, name = "config"): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CircleConfigError(`${name} must be a configuration object.`);
  }
}

export function resolveBaseUrl(value: unknown = DEFAULT_BASE_URL): string {
  if (typeof value !== "string" || !value || /[\s\\]/.test(value)) {
    throw new CircleConfigError(
      "baseUrl must be an absolute HTTP(S) URL without whitespace or backslashes.",
    );
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch (cause) {
    throw new CircleConfigError("baseUrl must be a valid absolute HTTP(S) URL.", cause);
  }
  if (
    !/^https?:\/\/[^/]/i.test(value) ||
    !["http:", "https:"].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password ||
    /[?#]/.test(value)
  ) {
    throw new CircleConfigError(
      "baseUrl must be an absolute HTTP(S) URL without credentials, query or fragment. Path prefixes are allowed.",
    );
  }
  return url.toString();
}

export function resolveCommunityHost(value: unknown = DEFAULT_COMMUNITY_HOST): string {
  if (typeof value !== "string" || !value || /[\s/\\@?#%]/.test(value)) {
    throw new CircleConfigError(
      "communityHost must be a hostname, optionally with a port; omit the scheme and path.",
    );
  }
  let url: URL;
  try {
    url = new URL(`http://${value}`);
  } catch (cause) {
    throw new CircleConfigError(
      "communityHost must be a valid hostname with an optional port.",
      cause,
    );
  }
  const authority = /^(\[[0-9a-f:.]+\]|[a-z0-9.-]+)(?::([0-9]+))?$/i.exec(value);
  const hostname = authority?.[1];
  const port = authority?.[2];
  const dnsName = hostname?.endsWith(".") ? hostname.slice(0, -1) : hostname;
  const validName =
    hostname?.startsWith("[") ||
    (dnsName &&
      dnsName.length <= 253 &&
      dnsName.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)));
  if (
    !authority ||
    !url.hostname ||
    !validName ||
    (port !== undefined && (Number(port) < 1 || Number(port) > 65535))
  ) {
    throw new CircleConfigError(
      "communityHost must be a DNS name, IPv4 or bracketed IPv6 address, optionally with a port from 1 through 65535.",
    );
  }
  return value.toLowerCase();
}

export function requireToken(value: unknown, name: string): string {
  if (typeof value !== "string" || !/^[!-~]+$/.test(value)) {
    throw new CircleConfigError(
      `${name} must be a non-empty ASCII token without whitespace or control characters.`,
    );
  }
  return value;
}

export function validateOptionalToken(value: unknown, name: string): void {
  if (value !== undefined) requireToken(value, name);
}

export function validateTokenHooks(config: {
  getAccessToken?: unknown;
  setAccessToken?: unknown;
}): void {
  for (const name of ["getAccessToken", "setAccessToken"] as const) {
    if (config[name] !== undefined && typeof config[name] !== "function") {
      throw new CircleConfigError(`${name} must be a function.`);
    }
  }
}

export function validateTimeout(timeoutMs: unknown): void {
  if (
    timeoutMs !== undefined &&
    (typeof timeoutMs !== "number" ||
      !Number.isFinite(timeoutMs) ||
      timeoutMs < 0 ||
      timeoutMs > 2_147_483_647)
  ) {
    throw new CircleConfigError(
      "timeoutMs must be finite and between 0 and 2147483647; 0 disables the deadline.",
    );
  }
}
