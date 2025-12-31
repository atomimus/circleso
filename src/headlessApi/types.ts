import type { PathsWithMethod } from "openapi-typescript-helpers";
import type { paths as HeadlessPaths } from "../generated/headless-client-v1";

export type { HeadlessPaths };
export type { PathsWithMethod };

export type HeadlessMethod = "get" | "post" | "put" | "patch" | "delete";
export type HeadlessPath = keyof HeadlessPaths;

type Operation<Paths, Path extends keyof Paths, Method extends string> = Paths[Path] extends Record<
  Method,
  infer Op
>
  ? Op
  : never;

export type PathParams<Path extends HeadlessPath, Method extends HeadlessMethod> = Operation<
  HeadlessPaths,
  Path,
  Method
> extends { parameters: { path: infer Params } }
  ? Params
  : undefined;

export type QueryParams<Path extends HeadlessPath, Method extends HeadlessMethod> = Operation<
  HeadlessPaths,
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

export type RequestBody<Path extends HeadlessPath, Method extends HeadlessMethod> = BodyContent<
  Operation<HeadlessPaths, Path, Method>
>;

export type RequestMeta = {
  headers?: HeadersInit;
  signal?: AbortSignal;
};

type FlatQueryOptions<Path extends HeadlessPath, Method extends HeadlessMethod> = RequestMeta &
  (QueryParams<Path, Method> extends undefined ? object : QueryParams<Path, Method>);

export type RequestOptions<
  Path extends HeadlessPath,
  Method extends HeadlessMethod,
> = FlatQueryOptions<Path, Method>;

type EmptyObject = object;

type FlatBodyOptions<Path extends HeadlessPath, Method extends HeadlessMethod> = RequestMeta &
  (RequestBody<Path, Method> extends undefined ? object : RequestBody<Path, Method>);

export type RequestOptionsWithBody<
  Path extends HeadlessPath,
  Method extends HeadlessMethod,
> = FlatBodyOptions<Path, Method>;

type PathOption<Path extends HeadlessPath, Method extends HeadlessMethod> = PathParams<
  Path,
  Method
> extends undefined
  ? EmptyObject
  : { path: PathParams<Path, Method> };

export type RequestConfig<
  Path extends HeadlessPath,
  Method extends HeadlessMethod,
> = (Method extends "post" | "put" | "patch"
  ? RequestOptionsWithBody<Path, Method>
  : RequestOptions<Path, Method>) &
  PathOption<Path, Method>;
