import {
  type DirectUploadInput,
  type DirectUploadOptions,
  type DirectUploadResult,
  uploadDirectFile,
} from "../../core/uploads";
import type { HeadlessRequester } from "../request";
import type { RequestBody, RequestOptionsWithBody } from "../types";

export type HeadlessDirectUploadOptions = DirectUploadOptions &
  Pick<RequestBody<"/api/headless/v1/direct_uploads", "post">["blob"], "metadata">;

export function createDirectUploadsResource(request: HeadlessRequester) {
  return {
    /**
     * Create a direct upload.
     * @param options Body fields (flat) plus request metadata.
     * @returns Direct upload response.
     */
    create: (options: RequestOptionsWithBody<"/api/headless/v1/direct_uploads", "post">) =>
      request.post("/api/headless/v1/direct_uploads", options),
    /** Prepare metadata/MD5, register with Circle, then PUT to isolated signed storage. */
    upload: (
      input: DirectUploadInput,
      options: HeadlessDirectUploadOptions,
    ): Promise<DirectUploadResult> =>
      uploadDirectFile(
        (blob, signal) =>
          request.post("/api/headless/v1/direct_uploads", {
            blob: {
              ...blob,
              ...(options.metadata !== undefined ? { metadata: options.metadata } : {}),
            },
            signal,
          }),
        input,
        options,
      ),
  };
}
