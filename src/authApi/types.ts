import type { PathsWithMethod } from "openapi-typescript-helpers";
import type { paths as AuthPaths } from "../generated/headless-auth-v1";

export type { AuthPaths };
export type { PathsWithMethod };

export type AuthMethod = "get" | "post" | "put" | "patch" | "delete";
export type AuthPath = keyof AuthPaths;

type Operation<Paths, Path extends keyof Paths, Method extends string> = Paths[Path] extends Record<
  Method,
  infer Op
>
  ? Op
  : never;

export type PathParams<Path extends AuthPath, Method extends AuthMethod> = Operation<
  AuthPaths,
  Path,
  Method
> extends { parameters: { path: infer Params } }
  ? Params
  : undefined;

export type QueryParams<Path extends AuthPath, Method extends AuthMethod> = Operation<
  AuthPaths,
  Path,
  Method
> extends { parameters: { query: infer Params } }
  ? Params
  : undefined;

type BodyContent<Op> = Op extends { requestBody: { content: infer Content } }
  ? Content[keyof Content]
  : Op extends { requestBody?: { content: infer Content } }
    ? Content[keyof Content]
    : undefined;

export type RequestBody<Path extends AuthPath, Method extends AuthMethod> = BodyContent<
  Operation<AuthPaths, Path, Method>
>;

export type RequestMeta = {
  headers?: HeadersInit;
  signal?: AbortSignal;
};

type FlatQueryOptions<Path extends AuthPath, Method extends AuthMethod> = RequestMeta &
  (QueryParams<Path, Method> extends undefined ? object : QueryParams<Path, Method>);

export type RequestOptions<Path extends AuthPath, Method extends AuthMethod> = FlatQueryOptions<
  Path,
  Method
>;

type EmptyObject = object;

type FlatBodyOptions<Path extends AuthPath, Method extends AuthMethod> = RequestMeta &
  (RequestBody<Path, Method> extends undefined ? object : RequestBody<Path, Method>);

export type RequestOptionsWithBody<
  Path extends AuthPath,
  Method extends AuthMethod,
> = FlatBodyOptions<Path, Method>;

type PathOption<Path extends AuthPath, Method extends AuthMethod> = PathParams<
  Path,
  Method
> extends undefined
  ? EmptyObject
  : { path: PathParams<Path, Method> };

export type RequestConfig<Path extends AuthPath, Method extends AuthMethod> = (Method extends
  | "post"
  | "put"
  | "patch"
  ? RequestOptionsWithBody<Path, Method>
  : RequestOptions<Path, Method>) &
  PathOption<Path, Method>;
