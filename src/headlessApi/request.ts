import type { DualClient } from "../clients/shared";
import { unwrapResult } from "../core/response";
import { requestContracts } from "../generated/headless-client-v1.requests";
import { buildRequestInit } from "../requestInit";
import type { OperationResponse, RequestArguments } from "../requestTypes";
import type { HeadlessPaths, PathsWithMethod, RequestConfig } from "./types";

export function createHeadlessRequester(client: DualClient<HeadlessPaths>) {
  const get = async <Path extends PathsWithMethod<HeadlessPaths, "get">>(
    path: Path,
    ...args: RequestArguments<HeadlessPaths[Path]["get"], RequestConfig<Path, "get">>
  ): Promise<OperationResponse<HeadlessPaths[Path]["get"]>> => {
    const init = buildRequestInit<HeadlessPaths[Path]["get"]>(
      requestContracts,
      path,
      "get",
      args[0],
    );
    const result = await client.GET(path, init);
    return unwrapResult(result, "GET", path);
  };

  const post = async <Path extends PathsWithMethod<HeadlessPaths, "post">>(
    path: Path,
    ...args: RequestArguments<HeadlessPaths[Path]["post"], RequestConfig<Path, "post">>
  ): Promise<OperationResponse<HeadlessPaths[Path]["post"]>> => {
    const init = buildRequestInit<HeadlessPaths[Path]["post"]>(
      requestContracts,
      path,
      "post",
      args[0],
    );
    const result = await client.POST(path, init);
    return unwrapResult(result, "POST", path);
  };

  const put = async <Path extends PathsWithMethod<HeadlessPaths, "put">>(
    path: Path,
    ...args: RequestArguments<HeadlessPaths[Path]["put"], RequestConfig<Path, "put">>
  ): Promise<OperationResponse<HeadlessPaths[Path]["put"]>> => {
    const init = buildRequestInit<HeadlessPaths[Path]["put"]>(
      requestContracts,
      path,
      "put",
      args[0],
    );
    const result = await client.PUT(path, init);
    return unwrapResult(result, "PUT", path);
  };

  const patch = async <Path extends PathsWithMethod<HeadlessPaths, "patch">>(
    path: Path,
    ...args: RequestArguments<HeadlessPaths[Path]["patch"], RequestConfig<Path, "patch">>
  ): Promise<OperationResponse<HeadlessPaths[Path]["patch"]>> => {
    const init = buildRequestInit<HeadlessPaths[Path]["patch"]>(
      requestContracts,
      path,
      "patch",
      args[0],
    );
    const result = await client.PATCH(path, init);
    return unwrapResult(result, "PATCH", path);
  };

  const del = async <Path extends PathsWithMethod<HeadlessPaths, "delete">>(
    path: Path,
    ...args: RequestArguments<HeadlessPaths[Path]["delete"], RequestConfig<Path, "delete">>
  ): Promise<OperationResponse<HeadlessPaths[Path]["delete"]>> => {
    const init = buildRequestInit<HeadlessPaths[Path]["delete"]>(
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

export type HeadlessRequester = ReturnType<typeof createHeadlessRequester>;
