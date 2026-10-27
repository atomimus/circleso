import type { FetchOptions } from "openapi-fetch";
import { CircleConfigError } from "./core/errors";

export type RequestContract = {
  query: readonly string[];
  body?: readonly string[];
  bodyRequired?: boolean;
};

const metadata = new Set(["headers", "signal", "credentials", "path", "queryParams", "bodyParams"]);

/** Translate flat facade inputs using the operation schema, independently of its HTTP verb. */
export function buildRequestInit<Op>(
  contracts: Record<string, RequestContract>,
  route: string,
  method: string,
  options: object | undefined,
): FetchOptions<Op> {
  try {
    return routeRequest<Op>(contracts, route, method, options);
  } catch (cause) {
    if (cause instanceof CircleConfigError) throw cause;
    throw new CircleConfigError(`Cannot prepare ${method.toUpperCase()} ${route}`, cause);
  }
}

function routeRequest<Op>(
  contracts: Record<string, RequestContract>,
  route: string,
  method: string,
  options: object | undefined,
): FetchOptions<Op> {
  const contract = contracts[`${method} ${route}`];
  if (!contract)
    throw new CircleConfigError(`Missing request contract for ${method.toUpperCase()} ${route}`);
  const input: Record<string, unknown> = options ? { ...options } : {};
  const query: Record<string, unknown> = {};
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || metadata.has(key)) continue;
    const inQuery = contract.query.includes(key);
    const inBody = contract.body?.includes(key) ?? false;
    if (inQuery && inBody)
      throw new CircleConfigError(`Ambiguous request field ${key}; use queryParams and bodyParams`);
    if (!inQuery && !inBody)
      throw new CircleConfigError(
        `Unknown request field ${key} for ${method.toUpperCase()} ${route}`,
      );
    (inQuery ? query : body)[key] = value;
  }
  for (const [name, target, allowed, other] of [
    ["queryParams", query, contract.query, contract.body ?? []],
    ["bodyParams", body, contract.body ?? [], contract.query],
  ] as const) {
    const scoped = input[name];
    if (scoped === undefined) continue;
    if (typeof scoped !== "object" || scoped === null || Array.isArray(scoped)) {
      throw new CircleConfigError(`${name} must be an object`);
    }
    for (const [key, value] of Object.entries(scoped)) {
      if (!allowed.includes(key) || (!other.includes(key) && !metadata.has(key))) {
        throw new CircleConfigError(`Field ${key} does not belong in ${name}`);
      }
      if (value !== undefined) target[key] = value;
    }
  }
  const init: Record<string, unknown> = {};
  for (const name of ["headers", "signal", "credentials"] as const) {
    if (input[name] !== undefined) init[name] = input[name];
  }
  const params: Record<string, unknown> = {};
  if (input.path !== undefined) params.path = input.path;
  if (Object.keys(query).length) params.query = query;
  if (Object.keys(params).length) init.params = params;
  if (Object.keys(body).length || contract.bodyRequired) init.body = body;
  // The schema-derived public types validate values; this boundary only routes field locations.
  return init as FetchOptions<Op>;
}
