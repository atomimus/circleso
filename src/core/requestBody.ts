import { CircleConfigError } from "./errors";
import type { createHttpLifetime } from "./httpLifetime";

// Only provenance is retained: never headers, tokens, or an extra tee of the upload stream.
const finiteBodies = new WeakSet<Request>();

/** Internal Request hook for openapi-fetch and SDK middleware that only replace headers. */
export class BodySourceRequest extends Request {
  // openapi-fetch also uses its Request hook for instanceof checks on middleware results.
  static override [Symbol.hasInstance](value: unknown): boolean {
    return value instanceof Request;
  }

  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init);
    const finite =
      init?.body != null
        ? isFiniteBody(init.body)
        : input instanceof Request && finiteBodies.has(input);
    if (this.body && finite) finiteBodies.add(this);
  }

  override clone(): Request {
    const copy = super.clone();
    if (finiteBodies.has(this)) finiteBodies.add(copy);
    return copy;
  }
}

function isFiniteBody(body: BodyInit): boolean {
  return (
    typeof body === "string" ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    (typeof Blob !== "undefined" && body instanceof Blob) ||
    (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) ||
    (typeof FormData !== "undefined" && body instanceof FormData)
  );
}

/** Snapshot only known finite sources, including the actual multipart boundary bytes. */
export async function prepareRequestBody(
  request: Request,
  maxBytes: number,
  lifetime: ReturnType<typeof createHttpLifetime>,
): Promise<{ body: BodyInit | null; replayable: boolean }> {
  if (!request.body) return { body: null, replayable: true };
  if (!finiteBodies.has(request) || maxBytes === 0) {
    return { body: request.body, replayable: false };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await lifetime.wait(reader.read());
      if (done) {
        reader.releaseLock();
        return { body: new Blob(chunks), replayable: true };
      }
      if (value.byteLength > maxBytes - size) {
        // Preserve the first upload without reading/buffering the remainder or creating a tee.
        const prefix: Uint8Array[] = [...chunks, value];
        let index = 0;
        const body = new ReadableStream<Uint8Array>(
          {
            async pull(controller) {
              const next = prefix[index];
              if (next) {
                index += 1;
                controller.enqueue(next);
                if (index === prefix.length) prefix.length = 0;
                return;
              }
              try {
                const result = await reader.read();
                if (result.done) {
                  reader.releaseLock();
                  controller.close();
                } else controller.enqueue(result.value);
              } catch (cause) {
                controller.error(cause);
                reader.releaseLock();
              }
            },
            cancel(reason) {
              prefix.length = 0;
              void reader.cancel(reason).catch(() => {});
              reader.releaseLock();
            },
          },
          { highWaterMark: 0 },
        );
        return { body, replayable: false };
      }
      chunks.push(new Uint8Array(value));
      size += value.byteLength;
    }
  } catch (cause) {
    void reader.cancel(cause).catch(() => {});
    reader.releaseLock();
    throw cause instanceof CircleConfigError || lifetime.signal.aborted
      ? cause
      : new CircleConfigError("Could not prepare request body for replay.", cause);
  }
}

export function discardRequest(request: Request | undefined, reason?: unknown): void {
  void request?.body?.cancel(reason).catch(() => {});
}
