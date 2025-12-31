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

type HasRequiredBody<Path extends AuthPath, Method extends AuthMethod> = Operation<
  AuthPaths,
  Path,
  Method
> extends { requestBody: { content: unknown } }
  ? true
  : false;

export type RequestOptions<Path extends AuthPath, Method extends AuthMethod> = {
  query?: QueryParams<Path, Method>;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

type EmptyObject = object;

type BodyOption<Path extends AuthPath, Method extends AuthMethod> = HasRequiredBody<
  Path,
  Method
> extends true
  ? { body: RequestBody<Path, Method> }
  : RequestBody<Path, Method> extends undefined
    ? EmptyObject
    : { body?: RequestBody<Path, Method> };

export type RequestOptionsWithBody<
  Path extends AuthPath,
  Method extends AuthMethod,
> = RequestOptions<Path, Method> & BodyOption<Path, Method>;

type PathOption<Path extends AuthPath, Method extends AuthMethod> = PathParams<
  Path,
  Method
> extends undefined
  ? EmptyObject
  : { path: PathParams<Path, Method> };

export type RequestConfig<
  Path extends AuthPath,
  Method extends AuthMethod,
> = RequestOptionsWithBody<Path, Method> & PathOption<Path, Method>;
