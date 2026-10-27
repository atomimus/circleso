import type { PathsWithMethod } from "openapi-typescript-helpers";
import type { paths as AuthPaths } from "../generated/headless-auth-v1";
import type {
  Operation,
  OperationBody,
  OperationConfig,
  OperationOptions,
  OperationPath,
  OperationQuery,
} from "../requestTypes";

export type { AuthPaths, PathsWithMethod };
export type { RequestMeta } from "../requestTypes";
export type AuthMethod = "get" | "post" | "put" | "patch" | "delete";
export type AuthPath = keyof AuthPaths;

export type PathParams<Path extends AuthPath, Method extends AuthMethod> = OperationPath<
  Operation<AuthPaths, Path, Method>
>;
export type QueryParams<Path extends AuthPath, Method extends AuthMethod> = OperationQuery<
  Operation<AuthPaths, Path, Method>
>;
export type RequestBody<Path extends AuthPath, Method extends AuthMethod> = OperationBody<
  Operation<AuthPaths, Path, Method>
>;
/** Flat schema fields and request metadata; collisions use queryParams/bodyParams. */
export type RequestOptions<Path extends AuthPath, Method extends AuthMethod> = OperationOptions<
  Operation<AuthPaths, Path, Method>
>;
export type RequestOptionsWithBody<
  Path extends AuthPath,
  Method extends AuthMethod,
> = RequestOptions<Path, Method>;
export type RequestConfig<Path extends AuthPath, Method extends AuthMethod> = OperationConfig<
  Operation<AuthPaths, Path, Method>
>;
