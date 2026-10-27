import type { HeadlessAuthClient } from "../clients/headlessAuthClient";
import { unwrapResult } from "../core/response";
import { requestContracts } from "../generated/headless-auth-v1.requests";
import { buildRequestInit } from "../requestInit";
import type { RequestArguments } from "../requestTypes";
import type { AuthPaths, PathsWithMethod, RequestConfig } from "./types";

export function createAuthRequester(client: HeadlessAuthClient) {
  const get = async <Path extends PathsWithMethod<AuthPaths, "get">>(
    path: Path,
    ...args: RequestArguments<AuthPaths[Path]["get"], RequestConfig<Path, "get">>
  ) => {
    const init = buildRequestInit<AuthPaths[Path]["get"]>(requestContracts, path, "get", args[0]);
    const result = await client.GET(path, init);
    return unwrapResult(result, "GET", path);
  };

  const post = async <Path extends PathsWithMethod<AuthPaths, "post">>(
    path: Path,
    ...args: RequestArguments<AuthPaths[Path]["post"], RequestConfig<Path, "post">>
  ) => {
    const init = buildRequestInit<AuthPaths[Path]["post"]>(requestContracts, path, "post", args[0]);
    const result = await client.POST(path, init);
    return unwrapResult(result, "POST", path);
  };

  const put = async <Path extends PathsWithMethod<AuthPaths, "put">>(
    path: Path,
    ...args: RequestArguments<AuthPaths[Path]["put"], RequestConfig<Path, "put">>
  ) => {
    const init = buildRequestInit<AuthPaths[Path]["put"]>(requestContracts, path, "put", args[0]);
    const result = await client.PUT(path, init);
    return unwrapResult(result, "PUT", path);
  };

  const patch = async <Path extends PathsWithMethod<AuthPaths, "patch">>(
    path: Path,
    ...args: RequestArguments<AuthPaths[Path]["patch"], RequestConfig<Path, "patch">>
  ) => {
    const init = buildRequestInit<AuthPaths[Path]["patch"]>(
      requestContracts,
      path,
      "patch",
      args[0],
    );
    const result = await client.PATCH(path, init);
    return unwrapResult(result, "PATCH", path);
  };

  const del = async <Path extends PathsWithMethod<AuthPaths, "delete">>(
    path: Path,
    ...args: RequestArguments<AuthPaths[Path]["delete"], RequestConfig<Path, "delete">>
  ) => {
    const init = buildRequestInit<AuthPaths[Path]["delete"]>(
      requestContracts,
      path,
      "delete",
      args[0],
    );
    const result = await client.DELETE(path, init);
    return unwrapResult(result, "DELETE", path);
  };

  return { get, post, put, patch, delete: del };
}

export type AuthRequester = ReturnType<typeof createAuthRequester>;
