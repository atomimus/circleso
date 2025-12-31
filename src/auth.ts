export type { AuthApi, AuthApiConfig } from "./authApi";
export { createAuth } from "./authApi";
export type { HeadlessAuthClient, HeadlessAuthClientConfig } from "./clients/auth";
export { createHeadlessAuthClient } from "./clients/auth";
export {
  CircleConfigError,
  CircleHttpError,
  CircleNetworkError,
  CircleSdkError,
  CircleTimeoutError,
} from "./core/errors";
export type {
  AuthConfig,
  ClientConfig,
  HttpMethod,
  QueryValue,
  RequestOptions,
} from "./core/types";
