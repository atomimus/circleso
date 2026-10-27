import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdmin } from "./admin";
import {
  CircleConfigError,
  CircleHttpError,
  CircleNetworkError,
  CircleTimeoutError,
} from "./core/errors";
import type { DirectUploadInput, DirectUploadOptions } from "./core/uploads";
import { createHeadless } from "./headless";

const signedUrl = "https://storage.example/signed-path-secret?signature=synthetic-secret";
const identifiers = { signed_id: "synthetic-signed", attachable_sgid: "synthetic-sgid" };
const checksum = "kAFQmDzST7DWlj99KOF/cg==";
const registration = () => ({
  ...identifiers,
  direct_upload: {
    url: signedUrl,
    headers: { "Content-Type": "text/plain", "Content-MD5": checksum },
  },
});
const options = { key: "", filename: "synthetic.txt", contentType: "text/plain" };
const bytes = new TextEncoder().encode("abc");
const snapshots = new WeakMap<Request, Request>();
const capture = (input: RequestInfo | URL) => {
  const request = input as Request;
  snapshots.set(request, request.clone());
};
const asRequest = (input: RequestInfo | URL | undefined) => {
  if (!input) throw new Error("Expected a fetch call.");
  return snapshots.get(input as Request) ?? (input as Request);
};
afterEach(() => vi.unstubAllGlobals());

function setup(surface: "admin" | "member" = "member", response: unknown = registration()) {
  const circle = vi.fn<typeof fetch>(async (input) => {
    capture(input);
    return Response.json(response);
  });
  const storage = vi.fn<typeof fetch>(async (input) => {
    capture(input);
    return new Response(null, { status: 204 });
  });
  const api =
    surface === "admin"
      ? createAdmin({ token: "circle-secret", fetcher: circle })
      : createHeadless({ token: "circle-secret", fetcher: circle });
  return {
    api,
    circle,
    storage,
    upload: (input: DirectUploadInput = bytes, extra: Partial<DirectUploadOptions> = {}) =>
      api.directUploads.upload(input, { ...options, storageFetcher: storage, ...extra }),
  };
}

describe.each(["admin", "member"] as const)("%s direct upload", (surface) => {
  it("registers exact metadata and PUTs the original bytes without Circle credentials", async () => {
    const { upload, circle, storage } = setup(surface);
    expect(await upload()).toEqual(identifiers);
    const register = asRequest(circle.mock.calls[0]?.[0]);
    expect(register.url).toBe(
      `https://app.circle.so/api/${surface === "admin" ? "admin/v2" : "headless/v1"}/direct_uploads`,
    );
    expect(register.headers.get("authorization")).toBe(
      `${surface === "admin" ? "Token" : "Bearer"} circle-secret`,
    );
    expect(await register.json()).toEqual({
      blob: {
        key: "",
        filename: options.filename,
        content_type: "text/plain",
        byte_size: 3,
        checksum,
      },
    });
    const put = asRequest(storage.mock.calls[0]?.[0]);
    expect(put.url).toBe(signedUrl);
    expect(put.method).toBe("PUT");
    const headers: [string, string][] = [];
    put.headers.forEach((value, name) => {
      headers.push([name, value]);
    });
    expect(headers).toEqual([
      ["content-md5", checksum],
      ["content-type", "text/plain"],
    ]);
    expect(put.credentials).toBe("omit");
    expect(put.redirect).toBe("error");
    expect(put.referrerPolicy).toBe("no-referrer");
    expect(await put.text()).toBe("abc");
    expect(circle).toHaveBeenCalledTimes(1);
    expect(storage).toHaveBeenCalledTimes(1);
  });
  it("preserves the low-level create response and does not upload", async () => {
    const { api, storage } = setup(surface);
    expect(
      await api.directUploads.create({
        blob: { key: "", filename: "a", content_type: "text/plain", byte_size: 3, checksum },
      }),
    ).toEqual(registration());
    expect(storage).not.toHaveBeenCalled();
  });
});

describe("upload preparation", () => {
  it.each([
    ["", "1B2M2Y8AsgTpgAmY7PhCfg=="],
    ["a", "DMF1ucDxtqgxw5niaXcmYQ=="],
    ["abc", checksum],
    ["message digest", "+WtpfXy3k41SWi8xqvFh0A=="],
    ["abcdefghijklmnopqrstuvwxyz", "w/zT12GS5AB9+0lsymfhOw=="],
  ])("matches known base64 MD5 vector %j", async (text, expected) => {
    const { upload, circle } = setup();
    await upload(new Blob([text]), { maxBytes: text.length });
    expect((await asRequest(circle.mock.calls[0]?.[0]).json()).blob.checksum).toBe(expected);
  });
  it.each([
    new Blob([bytes], { type: "text/plain" }),
    new File([bytes], "synthetic.txt", { type: "text/plain" }),
    bytes.buffer,
    bytes,
    Buffer.from("abc"),
    new Uint8Array([0, 97, 98, 99, 0]).subarray(1, 4),
  ])("supports finite inputs and respects view offsets", async (input) => {
    const { upload, storage } = setup();
    await upload(input);
    expect(await asRequest(storage.mock.calls[0]?.[0]).text()).toBe("abc");
  });
  it("infers File name/type and allows Member identified metadata", async () => {
    const circle = vi.fn<typeof fetch>(async (input) => {
      capture(input);
      return Response.json(registration());
    });
    const member = createHeadless({ token: "synthetic", fetcher: circle });
    await member.directUploads.upload(new File([bytes], "file.txt", { type: "text/plain" }), {
      key: "",
      metadata: { identified: true },
      storageFetcher: async () => new Response(null, { status: 204 }),
    });
    expect((await asRequest(circle.mock.calls[0]?.[0]).json()).blob).toEqual({
      key: "",
      filename: "file.txt",
      content_type: "text/plain",
      byte_size: 3,
      checksum,
      metadata: { identified: true },
    });
  });
  it("snapshots mutable bytes before registration", async () => {
    const input = new Uint8Array(bytes);
    const { upload, circle, storage } = setup();
    circle.mockImplementation(async (request) => {
      capture(request);
      input.fill(0);
      return Response.json(registration());
    });
    const pending = upload(input);
    input.fill(1);
    await pending;
    expect(await asRequest(storage.mock.calls[0]?.[0]).text()).toBe("abc");
  });
  it("hashes in slices of at most 1 MiB with no whole-file read", async () => {
    class Chunked extends Blob {
      override arrayBuffer(): Promise<ArrayBuffer> {
        throw new Error("whole-file read");
      }
      override slice(start?: number, end?: number): Blob {
        expect((end ?? this.size) - (start ?? 0)).toBeLessThanOrEqual(1024 * 1024);
        return super.slice(start, end);
      }
    }
    const input = new Uint8Array(2 * 1024 * 1024 + 17).fill(73);
    const { upload, circle } = setup();
    await upload(new Chunked([input]));
    expect((await asRequest(circle.mock.calls[0]?.[0]).json()).blob.checksum).toBe(
      createHash("md5").update(input).digest("base64"),
    );
  });
  it("trusts a supplied checksum and skips reads", async () => {
    class Unread extends Blob {
      override slice(): Blob {
        throw new Error("should not hash");
      }
    }
    await setup().upload(new Unread([bytes]), { checksum });
  });
  it.each([
    "hex-not-base64",
    "AAAAAAAAAAAAAAAAAAAAAB==",
    "",
    "AAAAAAAAAAAAAAAAAAAAAA=",
    1,
  ])("rejects invalid checksums before registration", async (checksum) => {
    const { upload, circle } = setup();
    await expect(upload(bytes, { checksum } as DirectUploadOptions)).rejects.toBeInstanceOf(
      CircleConfigError,
    );
    expect(circle).not.toHaveBeenCalled();
  });
  it.each([
    -1,
    1.1,
    NaN,
    Infinity,
    Number.MAX_SAFE_INTEGER + 1,
  ])("rejects invalid maxBytes %s", async (maxBytes) => {
    await expect(setup().upload(bytes, { maxBytes })).rejects.toBeInstanceOf(CircleConfigError);
  });
  it("rejects oversized input before reading or registering, including the default cap", async () => {
    const { upload, circle } = setup();
    class Oversized extends Blob {
      override get size() {
        return 64 * 1024 * 1024 + 1;
      }
      override slice(): Blob {
        throw new Error("must not read");
      }
    }
    await expect(upload(new Oversized())).rejects.toBeInstanceOf(CircleConfigError);
    await expect(upload(bytes, { maxBytes: 2 })).rejects.toBeInstanceOf(CircleConfigError);
    expect(circle).not.toHaveBeenCalled();
  });
  it.each([
    new ReadableStream(),
    {
      async *[Symbol.asyncIterator]() {
        yield bytes;
      },
    },
    "abc",
    new DataView(bytes.buffer),
    new Uint8Array(new SharedArrayBuffer(3)),
  ])("rejects unsupported or shared inputs", async (input) => {
    await expect(setup().upload(input as DirectUploadInput)).rejects.toBeInstanceOf(
      CircleConfigError,
    );
  });
  it("preserves file-read failure causes", async () => {
    const cause = new Error("fixture read failed");
    class Broken extends Blob {
      override slice(): Blob {
        throw cause;
      }
    }
    await expect(setup().upload(new Broken([bytes]))).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause,
    });
  });
});

describe("storage isolation and failures", () => {
  it("does not copy middleware cookies or custom Circle headers to storage", async () => {
    const { api, upload, circle, storage } = setup();
    api.raw.use({
      onRequest({ request }) {
        request.headers.set("cookie", "synthetic-session");
        request.headers.set("x-circle-only", "synthetic-value");
        return request;
      },
    });
    await upload();
    expect(asRequest(circle.mock.calls[0]?.[0]).headers.get("cookie")).toBe("synthetic-session");
    const headers = asRequest(storage.mock.calls[0]?.[0]).headers;
    expect(headers.get("cookie")).toBeNull();
    expect(headers.get("x-circle-only")).toBeNull();
  });
  it("adds no inferred Content-Type when Circle returns no upload headers", async () => {
    const { upload, storage } = setup("member", {
      ...identifiers,
      direct_upload: { url: signedUrl, headers: {} },
    });
    await upload(new Blob([bytes], { type: "text/plain" }));
    expect(asRequest(storage.mock.calls[0]?.[0]).headers.has("content-type")).toBe(false);
  });
  it("stops after a registration HTTP failure", async () => {
    const { upload, circle, storage } = setup();
    circle.mockImplementation(async () => new Response("registration denied", { status: 422 }));
    await expect(upload()).rejects.toMatchObject({
      name: "CircleHttpError",
      status: 422,
      method: "POST",
    });
    expect(storage).not.toHaveBeenCalled();
    expect(circle).toHaveBeenCalledTimes(1);
  });
  it.each([
    "plain storage failure",
    "{malformed",
    "",
  ])("preserves best-effort storage error body %j", async (body) => {
    const { upload, storage } = setup();
    storage.mockImplementation(
      async () =>
        new Response(body, { status: 500, headers: { "x-request-id": "synthetic-request" } }),
    );
    await expect(upload()).rejects.toMatchObject({
      name: "CircleHttpError",
      status: 500,
      bodyText: body,
      requestId: "synthetic-request",
    });
    expect(storage).toHaveBeenCalledTimes(1);
  });
  it("keeps HTTP status and original cause when the storage error body breaks", async () => {
    const { upload, storage } = setup();
    const cause = new Error("synthetic body failure");
    storage.mockImplementation(
      async () =>
        new Response(
          new ReadableStream({
            start(c) {
              c.error(cause);
            },
          }),
          { status: 500 },
        ),
    );
    await expect(upload()).rejects.toMatchObject({ name: "CircleHttpError", status: 500, cause });
  });
  it("normalizes successful storage response body failures with context", async () => {
    const { upload, storage } = setup();
    const cause = new Error("synthetic body failure");
    storage.mockImplementation(
      async () =>
        new Response(
          new ReadableStream({
            start(c) {
              c.error(cause);
            },
          }),
        ),
    );
    await expect(upload()).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause,
      url: "https://storage.example/[signed-upload]",
      method: "PUT",
    });
  });
  it.each([
    "Authorization",
    "Cookie",
    "Host",
    "Set-Cookie",
    "X-Api-Key",
    "Proxy-Authorization",
    "x-amz-meta-unsupported",
  ])("rejects unsupported response header %s without forwarding", async (header) => {
    const data = registration();
    Object.assign(data.direct_upload.headers, { [header]: "synthetic-secret" });
    const { upload, storage } = setup("member", data);
    await expect(upload()).rejects.toBeInstanceOf(CircleNetworkError);
    expect(storage).not.toHaveBeenCalled();
  });
  it.each([
    "http://storage.example/key",
    "https://user:pass@storage.example/key",
    "https://storage.example/key#fragment",
    "/relative",
    "data:application/json,hi",
  ])("rejects unsafe destination %s", async (url) => {
    const data = registration();
    data.direct_upload.url = url;
    const { upload, storage } = setup("member", data);
    await expect(upload()).rejects.toBeInstanceOf(CircleNetworkError);
    expect(storage).not.toHaveBeenCalled();
  });
  it.each([
    undefined,
    {},
    { signed_id: "x" },
    { ...identifiers, direct_upload: {} },
  ])("rejects incomplete registration", async (data) => {
    const { upload, storage } = setup("member", data === undefined ? null : data);
    await expect(upload()).rejects.toBeInstanceOf(CircleNetworkError);
    expect(storage).not.toHaveBeenCalled();
  });
  it("keeps storage HTTP failures actionable, redacts signed context and never retries", async () => {
    const { upload, storage } = setup();
    storage.mockImplementation(
      async () => new Response('{"message":"bad digest"}', { status: 403 }),
    );
    const error = await upload().catch((error: unknown) => error);
    expect(error).toBeInstanceOf(CircleHttpError);
    expect(error).toMatchObject({
      status: 403,
      method: "PUT",
      url: "https://storage.example/[signed-upload]",
      parsedJson: { message: "bad digest" },
    });
    expect(storage).toHaveBeenCalledTimes(1);
  });
  it("caps storage error evidence at 64 KiB", async () => {
    const { upload, storage } = setup();
    const cancel = vi.fn();
    storage.mockImplementation(
      async () =>
        new Response(
          new ReadableStream({
            pull(c) {
              c.enqueue(new Uint8Array(128 * 1024).fill(65));
            },
            cancel,
          }),
          { status: 500 },
        ),
    );
    const error = await upload().catch((error: unknown) => error);
    expect(error).toBeInstanceOf(CircleHttpError);
    expect((error as CircleHttpError).bodyText?.length).toBe(64 * 1024);
    expect(cancel).toHaveBeenCalled();
  });
  it("keeps fetch failure causes and does not retry", async () => {
    const { upload, storage } = setup();
    const cause = new TypeError("synthetic transport failure");
    storage.mockRejectedValue(cause);
    await expect(upload()).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause,
      url: "https://storage.example/[signed-upload]",
    });
    expect(storage).toHaveBeenCalledTimes(1);
  });
  it("uses global fetch for storage even when Circle has a custom fetcher", async () => {
    const { api, circle, storage } = setup();
    vi.stubGlobal("fetch", storage);
    await api.directUploads.upload(bytes, options);
    expect(circle).toHaveBeenCalledTimes(1);
    expect(storage).toHaveBeenCalledTimes(1);
  });
  it("does not expose signed credentials or file contents to opt-in body logs", async () => {
    const logs: unknown[] = [];
    const api = createHeadless({
      token: "circle-secret",
      fetcher: async () => Response.json(registration()),
      logger: {
        logBodies: true,
        onRequest: (x) => {
          logs.push(x.requestBody);
        },
        onResponse: (x) => {
          logs.push(x.responseBody);
        },
      },
    });
    await api.directUploads.upload(new Blob(["private-file-content"]), {
      ...options,
      storageFetcher: async () => new Response(null, { status: 204 }),
    });
    expect(logs).toHaveLength(2);
    expect(JSON.stringify(logs)).not.toMatch(
      /circle-secret|signed-path-secret|synthetic-secret|synthetic-signed|synthetic-sgid|private-file-content/,
    );
  });
});

describe("upload lifetimes", () => {
  it("deadline covers an unresolved Blob slice read", async () => {
    class Stalled extends Blob {
      override slice(): Blob {
        const blob = new Blob();
        blob.arrayBuffer = () => new Promise(() => {});
        return blob;
      }
    }
    const { upload, circle } = setup();
    await expect(upload(new Stalled([bytes]), { timeoutMs: 20 })).rejects.toBeInstanceOf(
      CircleTimeoutError,
    );
    expect(circle).not.toHaveBeenCalled();
  });
  it("cancels a pending registration and never starts storage", async () => {
    const controller = new AbortController();
    const cause = new Error("cancel registration");
    const { upload, circle, storage } = setup();
    circle.mockImplementation(async () => {
      controller.abort(cause);
      return new Promise(() => {});
    });
    await expect(upload(bytes, { signal: controller.signal })).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause,
    });
    expect(storage).not.toHaveBeenCalled();
  });
  it("preserves pre-aborted cancellation reason and performs no work", async () => {
    const controller = new AbortController();
    const cause = new Error("stop");
    controller.abort(cause);
    const { upload, circle, storage } = setup();
    await expect(upload(bytes, { signal: controller.signal })).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause,
    });
    expect(circle).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
  });
  it("cancels a stalled file read", async () => {
    const controller = new AbortController();
    const cause = { synthetic: "abort-read" };
    class Stalled extends Blob {
      override slice(): Blob {
        controller.abort(cause);
        return new Blob();
      }
    }
    const { upload, circle } = setup();
    await expect(upload(new Stalled([bytes]), { signal: controller.signal })).rejects.toMatchObject(
      { name: "CircleNetworkError", cause },
    );
    expect(circle).not.toHaveBeenCalled();
  });
  it.each(["registration", "storage", "response-body"])("deadline covers %s", async (phase) => {
    const { upload, circle, storage } = setup();
    if (phase === "registration") circle.mockImplementation(() => new Promise(() => {}));
    if (phase === "storage") storage.mockImplementation(() => new Promise(() => {}));
    if (phase === "response-body")
      storage.mockImplementation(async () => new Response(new ReadableStream()));
    await expect(upload(bytes, { timeoutMs: 20 })).rejects.toBeInstanceOf(CircleTimeoutError);
  });
  it("cancels a pending storage request, keeping the original reason", async () => {
    const controller = new AbortController();
    const cause = new Error("cancel storage");
    const { upload, storage } = setup();
    storage.mockImplementation(async (input) => {
      expect(asRequest(input).signal.aborted).toBe(false);
      controller.abort(cause);
      return new Promise(() => {});
    });
    await expect(upload(bytes, { signal: controller.signal })).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause,
    });
  });
});
