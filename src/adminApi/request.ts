import type { AdminClient } from "../clients/adminClient";
import { unwrapResult } from "../core/response";
import { requestContracts } from "../generated/admin-v2.requests";
import { buildRequestInit } from "../requestInit";
import type { RequestArguments } from "../requestTypes";
import type { AdminPaths, PathsWithMethod, RequestConfig } from "./types";

export function createAdminRequester(client: AdminClient) {
  const get = async <Path extends PathsWithMethod<AdminPaths, "get">>(
    path: Path,
    ...args: RequestArguments<AdminPaths[Path]["get"], RequestConfig<Path, "get">>
  ) => {
    const init = buildRequestInit<AdminPaths[Path]["get"]>(requestContracts, path, "get", args[0]);
    const result = await client.GET(path, init);
    return unwrapResult(result, "GET", path);
  };

  const post = async <Path extends PathsWithMethod<AdminPaths, "post">>(
    path: Path,
    ...args: RequestArguments<AdminPaths[Path]["post"], RequestConfig<Path, "post">>
  ) => {
    const init = buildRequestInit<AdminPaths[Path]["post"]>(
      requestContracts,
      path,
      "post",
      args[0],
    );
    const result = await client.POST(path, init);
    return unwrapResult(result, "POST", path);
  };

  const put = async <Path extends PathsWithMethod<AdminPaths, "put">>(
    path: Path,
    ...args: RequestArguments<AdminPaths[Path]["put"], RequestConfig<Path, "put">>
  ) => {
    const init = buildRequestInit<AdminPaths[Path]["put"]>(requestContracts, path, "put", args[0]);
    const result = await client.PUT(path, init);
    return unwrapResult(result, "PUT", path);
  };

  const patch = async <Path extends PathsWithMethod<AdminPaths, "patch">>(
    path: Path,
    ...args: RequestArguments<AdminPaths[Path]["patch"], RequestConfig<Path, "patch">>
  ) => {
    const init = buildRequestInit<AdminPaths[Path]["patch"]>(
      requestContracts,
      path,
      "patch",
      args[0],
    );
    const result = await client.PATCH(path, init);
    return unwrapResult(result, "PATCH", path);
  };

  const del = async <Path extends PathsWithMethod<AdminPaths, "delete">>(
    path: Path,
    ...args: RequestArguments<AdminPaths[Path]["delete"], RequestConfig<Path, "delete">>
  ) => {
    const init = buildRequestInit<AdminPaths[Path]["delete"]>(
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

export type AdminRequester = ReturnType<typeof createAdminRequester>;
