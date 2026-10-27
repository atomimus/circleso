import { md5 } from "@noble/hashes/legacy.js";
import { validateTimeout } from "./config";
import { CircleConfigError, CircleNetworkError, CircleSdkError } from "./errors";
import { createHttpLifetime } from "./httpLifetime";
import { putSignedUpload } from "./uploadHttp";

/** Finite, replayable inputs only. Buffer is a Uint8Array. Streams are not accepted. */
export type DirectUploadInput = Blob | ArrayBuffer | Uint8Array;

export type DirectUploadOptions = {
  /** Circle's storage key. An empty string is supported by Circle's documented example. */
  key: string;
  /** Defaults to File.name; required for other inputs. */
  filename?: string;
  /** Defaults to Blob.type, otherwise application/octet-stream. */
  contentType?: string;
  /** Canonical base64 MD5. If supplied, trusted without rehashing the file. */
  checksum?: string;
  /** Inclusive SDK input limit; default 64 MiB. This is not a Circle service limit. */
  maxBytes?: number;
  signal?: AbortSignal;
  /** Whole-workflow deadline, including preparation and registration. Default 60s; 0 disables. */
  timeoutMs?: number;
  /** Dedicated storage transport. Never inherits the Circle client's fetcher or middleware. */
  storageFetcher?: typeof fetch;
};

/** Returned only after storage confirms a successful PUT. Identifiers remain sensitive. */
export type DirectUploadResult = {
  signed_id: string;
  attachable_sgid: string;
};

type UploadMetadata = {
  key: string;
  filename: string;
  content_type: string;
  byte_size: number;
  checksum: string;
};

const CHUNK_BYTES = 1024 * 1024;
const DEFAULT_MAX_BYTES = 64 * CHUNK_BYTES;

/** Shared workflow; resource adapters supply only their typed registration operation. */
export async function uploadDirectFile(
  register: (blob: UploadMetadata, signal: AbortSignal) => Promise<unknown>,
  input: DirectUploadInput,
  options: DirectUploadOptions,
): Promise<DirectUploadResult> {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new CircleConfigError("Upload options are required.");
  }
  validateTimeout(options.timeoutMs);
  if (options.signal !== undefined && !(options.signal instanceof AbortSignal)) {
    throw new CircleConfigError("Upload signal must be an AbortSignal.");
  }
  if (options.storageFetcher !== undefined && typeof options.storageFetcher !== "function") {
    throw new CircleConfigError("storageFetcher must be a fetch implementation.");
  }
  const lifetime = createHttpLifetime([options.signal], options.timeoutMs ?? 60_000);
  try {
    lifetime.throwIfAborted();
    const maxBytes = options.maxBytes !== undefined ? options.maxBytes : DEFAULT_MAX_BYTES;
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
      throw new CircleConfigError("maxBytes must be a non-negative safe integer.");
    }
    const isBlob = input instanceof Blob;
    if (!isBlob && !(input instanceof ArrayBuffer) && !(input instanceof Uint8Array)) {
      throw new CircleConfigError(
        "Upload input must be a Blob, File, ArrayBuffer or Uint8Array; materialize streams within your own limit first.",
      );
    }
    const size = isBlob ? input.size : input.byteLength;
    if (!Number.isSafeInteger(size) || size < 0 || size > maxBytes) {
      throw new CircleConfigError("Upload exceeds maxBytes or has an invalid byte size.");
    }
    const filename = options.filename ?? (isBlob && "name" in input ? input.name : undefined);
    const contentType =
      options.contentType ?? (isBlob && input.type ? input.type : "application/octet-stream");
    if (
      typeof options.key !== "string" ||
      typeof filename !== "string" ||
      !filename.trim() ||
      typeof contentType !== "string" ||
      !contentType.trim() ||
      /[\r\n]/.test(contentType)
    ) {
      throw new CircleConfigError(
        "Upload requires a string key, a non-empty filename and a valid contentType.",
      );
    }
    if (
      options.checksum !== undefined &&
      (typeof options.checksum !== "string" ||
        !/^[A-Za-z0-9+/]{21}[AQgw]==$/.test(options.checksum))
    ) {
      throw new CircleConfigError(
        "checksum must be a canonical base64-encoded 16-byte MD5 digest.",
      );
    }
    // Blob snapshots mutable bytes before any await. A view includes only its visible range.
    if (input instanceof Uint8Array && !(input.buffer instanceof ArrayBuffer)) {
      throw new CircleConfigError("SharedArrayBuffer-backed uploads are not supported.");
    }
    const file = isBlob
      ? input
      : new Blob([input instanceof Uint8Array ? new Uint8Array(input) : input]);
    const checksum = options.checksum ?? (await checksumBlob(file, lifetime));
    lifetime.throwIfAborted();
    const registered = await lifetime.wait(
      register(
        {
          key: options.key,
          filename,
          content_type: contentType,
          byte_size: size,
          checksum,
        },
        lifetime.signal,
      ),
    );
    lifetime.throwIfAborted();
    const data = record(registered);
    if (
      typeof data?.signed_id !== "string" ||
      !data.signed_id ||
      typeof data.attachable_sgid !== "string" ||
      !data.attachable_sgid
    ) {
      throw new CircleNetworkError(
        "Direct upload registration omitted signed attachment identifiers.",
        undefined,
      );
    }
    const destination = record(data.direct_upload);
    await putSignedUpload(destination, file, lifetime.signal, options.storageFetcher);
    lifetime.throwIfAborted();
    return { signed_id: data.signed_id, attachable_sgid: data.attachable_sgid };
  } catch (cause) {
    lifetime.throwIfAborted();
    if (cause instanceof CircleSdkError) throw cause;
    throw new CircleNetworkError("Direct upload preparation failed.", cause);
  } finally {
    lifetime.cleanup();
  }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

async function checksumBlob(
  file: Blob,
  lifetime: ReturnType<typeof createHttpLifetime>,
): Promise<string> {
  const hash = md5.create();
  try {
    for (let offset = 0; offset < file.size; offset += CHUNK_BYTES) {
      lifetime.throwIfAborted();
      hash.update(
        new Uint8Array(await lifetime.wait(file.slice(offset, offset + CHUNK_BYTES).arrayBuffer())),
      );
      // Yield to cancellation/timers even when Blob reads resolve without yielding a task.
      await lifetime.wait(new Promise<void>((resolve) => setTimeout(resolve, 0)));
    }
    return btoa(String.fromCharCode(...hash.digest()));
  } finally {
    hash.destroy();
  }
}
