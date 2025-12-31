import {
  createHeadlessAuthClient,
  type HeadlessAuthClient,
  type HeadlessAuthClientConfig,
} from "../clients/headlessAuthClient";
import { createAuthRequester } from "./request";
import { createAccessTokenResource } from "./resources/accessToken";
import { createAuthTokenResource } from "./resources/authToken";
import { createRefreshTokenResource } from "./resources/refreshToken";

export type AuthApi = {
  raw: HeadlessAuthClient;
  accessToken: ReturnType<typeof createAccessTokenResource>;
  authToken: ReturnType<typeof createAuthTokenResource>;
  refreshToken: ReturnType<typeof createRefreshTokenResource>;
};

export type AuthApiConfig = HeadlessAuthClientConfig;

export function createAuth(config: AuthApiConfig): AuthApi;
export function createAuth(client: HeadlessAuthClient): AuthApi;
export function createAuth(configOrClient: AuthApiConfig | HeadlessAuthClient): AuthApi {
  const client = isAuthClient(configOrClient)
    ? configOrClient
    : createHeadlessAuthClient(configOrClient);
  const request = createAuthRequester(client);

  return {
    raw: client,
    accessToken: createAccessTokenResource(request),
    authToken: createAuthTokenResource(request),
    refreshToken: createRefreshTokenResource(request),
  };
}

function isAuthClient(value: AuthApiConfig | HeadlessAuthClient): value is HeadlessAuthClient {
  return (
    typeof (value as HeadlessAuthClient).GET === "function" &&
    typeof (value as HeadlessAuthClient).POST === "function"
  );
}
