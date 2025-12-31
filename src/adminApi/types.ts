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

export type RequestMeta = {
  headers?: HeadersInit;
  signal?: AbortSignal;
};

type FlatQueryOptions<Path extends AdminPath, Method extends AdminMethod> = RequestMeta &
  (QueryParams<Path, Method> extends undefined ? object : QueryParams<Path, Method>);

export type RequestOptions<Path extends AdminPath, Method extends AdminMethod> = FlatQueryOptions<
  Path,
  Method
>;

type EmptyObject = object;

type FlatBodyOptions<Path extends AdminPath, Method extends AdminMethod> = RequestMeta &
  (RequestBody<Path, Method> extends undefined ? object : RequestBody<Path, Method>);

export type RequestOptionsWithBody<
  Path extends AdminPath,
  Method extends AdminMethod,
> = FlatBodyOptions<Path, Method>;

type PathOption<Path extends AdminPath, Method extends AdminMethod> = PathParams<
  Path,
  Method
> extends undefined
  ? EmptyObject
  : { path: PathParams<Path, Method> };

export type RequestConfig<Path extends AdminPath, Method extends AdminMethod> = (Method extends
  | "post"
  | "put"
  | "patch"
  ? RequestOptionsWithBody<Path, Method>
  : RequestOptions<Path, Method>) &
  PathOption<Path, Method>;
