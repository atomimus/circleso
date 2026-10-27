import type { PathsWithMethod } from "openapi-typescript-helpers";
import type { paths as HeadlessPaths } from "../generated/headless-client-v1";
import type {
  Operation,
  OperationBody,
  OperationConfig,
  OperationOptions,
  OperationPath,
  OperationQuery,
} from "../requestTypes";

export type { HeadlessPaths, PathsWithMethod };
export type { RequestMeta } from "../requestTypes";
export type HeadlessMethod = "get" | "post" | "put" | "patch" | "delete";
export type HeadlessPath = keyof HeadlessPaths;

export type PathParams<Path extends HeadlessPath, Method extends HeadlessMethod> = OperationPath<
  Operation<HeadlessPaths, Path, Method>
>;
export type QueryParams<Path extends HeadlessPath, Method extends HeadlessMethod> = OperationQuery<
  Operation<HeadlessPaths, Path, Method>
>;
export type RequestBody<Path extends HeadlessPath, Method extends HeadlessMethod> = OperationBody<
  Operation<HeadlessPaths, Path, Method>
>;
/** Flat schema fields and request metadata; collisions use queryParams/bodyParams. */
export type RequestOptions<
  Path extends HeadlessPath,
  Method extends HeadlessMethod,
> = OperationOptions<Operation<HeadlessPaths, Path, Method>>;
export type RequestOptionsWithBody<
  Path extends HeadlessPath,
  Method extends HeadlessMethod,
> = RequestOptions<Path, Method>;
export type RequestConfig<
  Path extends HeadlessPath,
  Method extends HeadlessMethod,
> = OperationConfig<Operation<HeadlessPaths, Path, Method>>;
