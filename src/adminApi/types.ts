import type { PathsWithMethod } from "openapi-typescript-helpers";
import type { paths as AdminPaths } from "../generated/admin-v2";

export type { AdminPaths };
export type { PathsWithMethod };

export type AdminMethod = "get" | "post" | "put" | "patch" | "delete";
export type AdminPath = keyof AdminPaths;

type Operation<Paths, Path extends keyof Paths, Method extends string> = Paths[Path] extends Record<
  Method,
  infer Op
>
  ? Op
  : never;

export type PathParams<Path extends AdminPath, Method extends AdminMethod> = Operation<
  AdminPaths,
  Path,
  Method
> extends { parameters: { path: infer Params } }
  ? Params
  : undefined;

export type QueryParams<Path extends AdminPath, Method extends AdminMethod> = Operation<
  AdminPaths,
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

export type RequestBody<Path extends AdminPath, Method extends AdminMethod> = BodyContent<
  Operation<AdminPaths, Path, Method>
>;

type HasRequiredBody<Path extends AdminPath, Method extends AdminMethod> = Operation<
  AdminPaths,
  Path,
  Method
> extends { requestBody: { content: unknown } }
  ? true
  : false;

export type RequestOptions<Path extends AdminPath, Method extends AdminMethod> = {
  query?: QueryParams<Path, Method>;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

type EmptyObject = object;

type BodyOption<Path extends AdminPath, Method extends AdminMethod> = HasRequiredBody<
  Path,
  Method
> extends true
  ? { body: RequestBody<Path, Method> }
  : RequestBody<Path, Method> extends undefined
    ? EmptyObject
    : { body?: RequestBody<Path, Method> };

export type RequestOptionsWithBody<
  Path extends AdminPath,
  Method extends AdminMethod,
> = RequestOptions<Path, Method> & BodyOption<Path, Method>;

type PathOption<Path extends AdminPath, Method extends AdminMethod> = PathParams<
  Path,
  Method
> extends undefined
  ? EmptyObject
  : { path: PathParams<Path, Method> };

export type RequestConfig<
  Path extends AdminPath,
  Method extends AdminMethod,
> = RequestOptionsWithBody<Path, Method> & PathOption<Path, Method>;
