# Direct file uploads

Admin and Member resources expose `directUploads.upload(input, options)`. It calculates
metadata and base64 MD5, registers the blob with Circle, then PUTs the same bytes to the
returned signed storage URL. It resolves only after a successful storage response, with
required `signed_id` and `attachable_sgid` strings for later attachment API calls. It does
not attach the file to a post, avatar or comment itself. `directUploads.create` retains its
original generated request/response contract for callers who manage storage themselves.

```ts
import { createHeadless } from "circleso/headless";

export async function uploadAttachment(file: File, accessToken: string, signal: AbortSignal) {
  const member = createHeadless({ accessToken });
  const uploaded = await member.directUploads.upload(file, {
    key: "", // Circle's browser example uses an empty storage key
    maxBytes: 20 * 1024 * 1024,
    timeoutMs: 60_000,
    signal,
  });
  return uploaded; // { signed_id: string; attachable_sgid: string }
}
```

```ts
import { createAdmin } from "circleso/admin";

export async function uploadBytes(token: string, bytes: Uint8Array) {
  const admin = createAdmin({ token }); // server only
  return admin.directUploads.upload(bytes, {
    key: "",
    filename: "attachment.txt",
    contentType: "text/plain",
    maxBytes: 1024 * 1024,
  });
}
```

`Blob`, `File`, `ArrayBuffer` and `Uint8Array` (including Node `Buffer` and subarray
views) are accepted in environments with the standard Fetch/Blob APIs. `filename`
defaults to `File.name`; other inputs require it. `contentType` defaults to a non-empty
`Blob.type`, otherwise `application/octet-stream`. `key` is required and may be empty.
Member options additionally accept the generated `metadata: { identified: boolean }`.
The SDK does not inspect file contents to infer MIME type or identification status.

The inclusive `maxBytes` limit defaults to **64 MiB** and accepts non-negative safe
integers. Zero permits only an empty file. This is an SDK resource limit, not a claim
about Circle's file limits. Oversized files fail before hashing, copying or registration.
Mutable byte inputs are snapshotted into an immutable Blob before asynchronous work;
only a view's visible range is included. This costs up to two extra input-sized copies
transiently for typed arrays. Blob/File inputs are reused, with at most one 1 MiB slice
read at a time for hashing. The SDK does not materialize the whole Blob as an ArrayBuffer.
Actual Blob backing storage and Fetch upload buffering depend on the runtime; constant
total process memory or network streaming is not guaranteed.

The checksum uses bundled, pinned `@noble/hashes` 2.4.0 MD5 with known-vector tests.
MD5 is required for Circle's integrity metadata; it is not an authenticity or security
primitive. No browser Web Crypto MD5 support is assumed. Optional `checksum` must be
canonical base64 for 16 digest bytes (not hexadecimal); supplying it skips hashing and
trusts the caller to match the exact bytes. The storage service may reject a mismatch.

ReadableStreams, Node Readables, async iterables, strings, DataViews and shared-memory
inputs are unsupported, including when a checksum is supplied. Materialize a stream
under your own explicit limit into a Blob or byte array first, or use `create` with a
caller-owned transport. The helper does not tee, spool or promise replay of streams.

`timeoutMs` is a whole-workflow deadline: preparation, Circle registration, storage PUT
and storage response consumption. It defaults to 60 seconds; zero disables this deadline.
The Circle client's per-attempt timeout and retry settings still apply to registration.
The supplied `signal` reaches hashing waits, registration and storage. Cancellation throws
`CircleNetworkError` with the original reason as cause; a workflow deadline throws
`CircleTimeoutError`. An in-flight platform Blob read cannot be forcibly stopped, but its
result is ignored after cancellation. Hashing yields between slices so timers can run.

The storage PUT uses **global Fetch**, separately from the Circle client. To customize
it, pass `storageFetcher` explicitly; this transport must honor Request credentials and
redirect policy and must not add authentication or cookies. The helper forwards only
the returned `Content-Type` and `Content-MD5` headers. Unknown headers fail closed so a
new storage contract needs an explicit integration; use `create` for other contracts.
It never copies Circle Authorization, Host, cookies, default headers, user agents,
middleware, refresh hooks or logger hooks to storage. HTTPS is required, URL userinfo and
fragments are rejected, redirects are refused, credentials are omitted and referrers are
disabled. A browser still needs the storage service's CORS permission for PUT/headers.
Browser bundle/VM qualification does not establish service CORS availability.

Storage is attempted once, with no automatic retry or registration rollback. Registration
uses the client's normal POST policy (one attempt by default, configurable opt-in retries).
A failure can leave an unused Circle blob or an uncertain uploaded object. Reconcile state
before starting the workflow again; there is no general idempotency guarantee. Successful
storage bodies are drained without accumulation; error diagnostics retain at most 64 KiB
and best-effort JSON. Storage HTTP failures are `CircleHttpError`, including status, method,
request ID when present and a URL with the signed path/query removed. Original failure
causes and response bodies may still be sensitive: do not log errors or identifiers
indiscriminately. SDK logger callbacks never receive the storage request or file body;
the existing Circle JSON logging redaction also hides the registration's signed strings.

Contracts checked October 27, 2026: [Circle upload workflow](https://api.circle.so/get-started/concepts/file-uploads),
[Admin spec](https://api-headless.circle.so/api/admin/v2/swagger.yaml),
[Member spec](https://api-headless.circle.so/api/headless_client/v1/swagger.yaml),
[Fetch Standard](https://fetch.spec.whatwg.org/), [Streams Standard](https://streams.spec.whatwg.org/)
and [checksum tooling](https://github.com/paulmillr/noble-hashes/tree/2.4.0).
