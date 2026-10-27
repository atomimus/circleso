import type { HeadlessAuthClient } from "../clients/headlessAuthClient";
import { unwrapResult } from "../core/response";
import { requestContracts } from "../generated/headless-auth-v1.requests";
import { buildRequestInit } from "../requestInit";
import type { OperationResponse, RequestArguments } from "../requestTypes";
import type { AuthPaths, PathsWithMethod, RequestConfig } from "./types";

export function createAuthRequester(client: HeadlessAuthClient) {
  const post = async <Path extends PathsWithMethod<AuthPaths, "post">>(
    path: Path,
    ...args: RequestArguments<AuthPaths[Path]["post"], RequestConfig<Path, "post">>
  ): Promise<OperationResponse<AuthPaths[Path]["post"]>> => {
    const init = buildRequestInit<AuthPaths[Path]["post"]>(requestContracts, path, "post", args[0]);
    const result = await client.POST(path, init);
    return unwrapResult(result, "POST", path);
  };

  const patch = async <Path extends PathsWithMethod<AuthPaths, "patch">>(
    path: Path,
    ...args: RequestArguments<AuthPaths[Path]["patch"], RequestConfig<Path, "patch">>
  ): Promise<OperationResponse<AuthPaths[Path]["patch"]>> => {
    const init = buildRequestInit<AuthPaths[Path]["patch"]>(
      requestContracts,
      path,
      "patch",
      args[0],
    );
    const result = await client.PATCH(path, init);
    return unwrapResult(result, "PATCH", path);
  };

  // The Auth spec has only POST/PATCH operations. Emitting impossible generic methods
  // leaks unsatisfiable constraints into otherwise valid installed declarations.
  return { post, patch };
}

export type AuthRequester = ReturnType<typeof createAuthRequester>;
