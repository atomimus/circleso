import type { FetchOptions, FetchResponse } from "openapi-fetch";

/** Named resources use the raw client's default JSON parsing and preserve empty success. */
export type OperationResponse<Op extends object> = FetchResponse<
  Op,
  FetchOptions<Op>,
  `${string}/${string}`
>["data"];

/** Options implemented by the named resources; use raw clients for other fetch options. */
export type RequestMeta = {
  headers?: HeadersInit;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
};

export type Operation<
  Paths,
  Path extends keyof Paths,
  Method extends string,
> = Paths[Path] extends Record<Method, infer Op> ? Op : never;

export type OperationPath<Op> = Op extends { parameters: { path: infer Params } }
  ? Params
  : undefined;

export type OperationQuery<Op> = Op extends { parameters: { query?: infer Params } }
  ? Params
  : undefined;

export type OperationBody<Op> = Op extends { requestBody?: { content: infer Content } }
  ? Content[keyof Content]
  : undefined;

type Fields<T> = [T] extends [undefined] ? Record<never, never> : T;
type Reserved = keyof RequestMeta | "path" | "queryParams" | "bodyParams";
type Scoped<Fields, Keys extends keyof Fields, Name extends string> = [Keys] extends [never]
  ? Record<never, never>
  : Record<never, never> extends Pick<Fields, Keys>
    ? { [K in Name]?: Pick<Fields, Keys> }
    : { [K in Name]: Pick<Fields, Keys> };

/** Keep unique fields flat; collisions must specify their schema location explicitly. */
type FlatVariant<Query, Body> = RequestMeta &
  Omit<Query, keyof Body | Reserved> &
  Omit<Body, keyof Query | Reserved> &
  Scoped<Query, Extract<keyof Query, keyof Body | Reserved>, "queryParams"> &
  Scoped<Body, Extract<keyof Body, keyof Query | Reserved>, "bodyParams">;

type FlatOptions<Query, Body> = Query extends unknown
  ? Body extends unknown
    ? FlatVariant<Query, Body>
    : never
  : never;

export type OperationOptions<Op> = FlatOptions<
  Fields<OperationQuery<Op>>,
  Fields<OperationBody<Op>>
>;

export type OperationConfig<Op> = OperationOptions<Op> &
  (OperationPath<Op> extends undefined ? Record<never, never> : { path: OperationPath<Op> });

/** A required body can be {}, so required keys alone cannot decide argument optionality. */
export type RequestArguments<Op, Config> = Op extends { requestBody: unknown }
  ? [options: Config]
  : Record<never, never> extends Config
    ? [options?: Config]
    : [options: Config];
