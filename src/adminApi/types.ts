import type { PathsWithMethod } from "openapi-typescript-helpers";
import type { paths as AdminPaths } from "../generated/admin-v2";
import type {
  Operation,
  OperationBody,
  OperationConfig,
  OperationOptions,
  OperationPath,
  OperationQuery,
} from "../requestTypes";
import type { AdminRichTextOperation } from "../richTextCompatibility";

export type { AdminPaths, PathsWithMethod };
export type { RequestMeta } from "../requestTypes";
export type AdminMethod = "get" | "post" | "put" | "patch" | "delete";
export type AdminPath = keyof AdminPaths;

export type PathParams<Path extends AdminPath, Method extends AdminMethod> = OperationPath<
  Operation<AdminPaths, Path, Method>
>;
export type QueryParams<Path extends AdminPath, Method extends AdminMethod> = OperationQuery<
  Operation<AdminPaths, Path, Method>
>;
export type RequestBody<Path extends AdminPath, Method extends AdminMethod> = OperationBody<
  AdminRichTextOperation<Path, Method, Operation<AdminPaths, Path, Method>>
>;
/** Flat schema fields and request metadata; collisions use queryParams/bodyParams. */
export type RequestOptions<Path extends AdminPath, Method extends AdminMethod> = OperationOptions<
  AdminRichTextOperation<Path, Method, Operation<AdminPaths, Path, Method>>
>;
export type RequestOptionsWithBody<
  Path extends AdminPath,
  Method extends AdminMethod,
> = RequestOptions<Path, Method>;
export type RequestConfig<Path extends AdminPath, Method extends AdminMethod> = OperationConfig<
  AdminRichTextOperation<Path, Method, Operation<AdminPaths, Path, Method>>
>;
