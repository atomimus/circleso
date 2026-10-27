import {
  type DirectUploadInput,
  type DirectUploadOptions,
  type DirectUploadResult,
  uploadDirectFile,
} from "../../core/uploads";
import type { AdminRequester } from "../request";
import type { RequestOptionsWithBody } from "../types";

export function createDirectUploadsResource(request: AdminRequester) {
  return {
    /**
     * Create a direct upload.
     * @param options Body fields (flat) plus request metadata.
     * @returns Direct upload response.
     */
    create: (options: RequestOptionsWithBody<"/api/admin/v2/direct_uploads", "post">) =>
      request.post("/api/admin/v2/direct_uploads", options),
    /** Prepare metadata/MD5, register with Circle, then PUT to isolated signed storage. */
    upload: (input: DirectUploadInput, options: DirectUploadOptions): Promise<DirectUploadResult> =>
      uploadDirectFile(
        (blob, signal) => request.post("/api/admin/v2/direct_uploads", { blob, signal }),
        input,
        options,
      ),
  };
}
