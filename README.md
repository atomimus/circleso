# circleso

Type-safe TypeScript SDK for Circle. Ships ESM-first with CJS fallback.

The published package is **0.3.0**. This checkout contains an unreleased API refresh; v1
qualification is in progress. See [continuous validation](https://github.com/atomimus/circleso/blob/main/docs/ci.md)
for the CI runtime matrix and local development checks.

## Features

- Strongly typed requests and responses from the official OpenAPI specs
- Admin, Headless, and Headless Auth surfaces in one SDK
- Smart fetch with timeouts, retries, and safe error parsing
- Optional headless token auto-refresh with single-flight behavior
- ESM and CJS builds with subpath exports

## Requirements

- The 0.3.0 package declares Node 18+, but Node 18 and 20 are end of life. Use a maintained Node LTS.
- The v1 support target is Node 22 and 24 (latest maintained patches), with Node 24 recommended,
  and TypeScript 5.9.3 or newer. Runtime, packaging and browser qualification are still pending.
- Admin API usage must run on a server runtime (see browser caveats below)

## Installation

```bash
npm install circleso
```

## Exports

- `circleso` - shared helpers and the unified `CircleSo` client
- `circleso/admin` - Admin API v2
- `circleso/headless` - Headless Client API v1
- `circleso/auth` - Headless Auth API v1

## Quick start

### Unified client (CircleSo)

```ts
import { CircleSo } from "circleso";

const adminToken = process.env.CIRCLE_ADMIN_TOKEN;
const headlessToken = process.env.CIRCLE_HEADLESS_TOKEN;
const refreshToken = process.env.CIRCLE_HEADLESS_REFRESH_TOKEN;
const authToken = process.env.CIRCLE_HEADLESS_AUTH_TOKEN;

if (!adminToken || !headlessToken || !refreshToken || !authToken) {
  throw new Error(
    "Missing Circle Admin, member access, member refresh, or Headless Auth application token.",
  );
}

const sdk = new CircleSo({
  communityHost: process.env.CIRCLE_COMMUNITY_HOST ?? "app.circle.so",
  admin: { token: adminToken },
  headless: {
    accessToken: headlessToken,
    refreshToken,
    authToken,
    autoRefresh: true,
  },
  auth: { token: authToken },
  timeoutMs: 10_000,
  retries: { retries: 2, baseDelayMs: 200, maxDelayMs: 2000 },
});

const posts = await sdk.admin.posts.list({ page: 1, per_page: 20 });
console.log(posts?.records ?? []);
```

### Admin API v2 (Token + optional communityHost)

```ts
import { createAdmin } from "circleso/admin";

const adminToken = process.env.CIRCLE_ADMIN_TOKEN;
if (!adminToken) {
  throw new Error("Missing CIRCLE_ADMIN_TOKEN.");
}

const admin = createAdmin({
  token: adminToken,
  communityHost: process.env.CIRCLE_COMMUNITY_HOST ?? "app.circle.so",
});

const data = await admin.accessGroups.list({
  page: 1,
  per_page: 50,
});

console.log(data?.records ?? []);
```

Need the low-level OpenAPI client? Use `admin.raw` or `createAdminClient`.

### Headless API (Bearer)

```ts
import { createHeadless } from "circleso/headless";

const headlessToken = process.env.CIRCLE_HEADLESS_TOKEN;
if (!headlessToken) {
  throw new Error("Missing CIRCLE_HEADLESS_TOKEN.");
}

const headless = createHeadless({
  accessToken: headlessToken,
});

const data = await headless.bookmarks.list({
  page: 1,
  per_page: 20,
});

console.log(data?.records ?? []);
```

Optional auto-refresh on your server when tokens expire:

```ts
import { createHeadless } from "circleso/headless";

const headlessToken = process.env.CIRCLE_HEADLESS_TOKEN;
const refreshToken = process.env.CIRCLE_HEADLESS_REFRESH_TOKEN;
const authToken = process.env.CIRCLE_HEADLESS_AUTH_TOKEN;
if (!headlessToken || !refreshToken || !authToken) {
  throw new Error("Missing member access, member refresh, or Headless Auth application token.");
}

const headless = createHeadless({
  accessToken: headlessToken,
  refreshToken,
  authToken,
  autoRefresh: true,
});
```

Need the low-level OpenAPI client? Use `headless.raw` or `createHeadlessClient`.

With `autoRefresh: true`, HTTP 401 triggers recovery. HTTP 403 and other statuses do not;
an error message containing "expired" alone does not trigger refresh. Concurrent requests using
the same token share one refresh, and late 401s reuse the newer token. Each original request is
replayed at most once after recovery, with the same method, URL, headers, cancellation and bounded
upload bytes. This includes POST/PATCH after a 401; it does not opt them into ordinary network or
status retries. The replay itself is never automatically retried again. Bodies that cannot be
snapshotted within `maxReplayBodyBytes` return their original 401 without refreshing or replaying.

Refresh makes one PATCH call to `/api/v1/headless/access_token/refresh` at `authBaseUrl` (or the
member base URL), with the Headless Auth application `authToken` in Bearer auth and the member's
refresh token in the JSON `refresh_token` field. Both tokens are required for auto-refresh.
Keep `authToken` on your server; browser clients should refresh through their own server and
use the token hooks for member requests. [Circle's Auth SDK](https://api.circle.so/apis/headless/auth-sdk/node.js)
documents this separate application credential. Migration: configurations that previously enabled
auto-refresh with only a member refresh token must now add `authToken`; omission throws
`CircleConfigError` before any request. Refresh is never automatically retried, including with
`retryNonIdempotent: true`. HTTP failures and malformed/missing `access_token` responses throw
`CircleHttpError` with refresh URL, method,
status, request ID and best-effort body evidence. Transport/deadline failures retain their SDK
error type and refresh context. A failed recovery is remembered for that token generation;
later failures share its error until caller storage supplies a different token or a new client
is created. Refresh coordination is local to each client instance. Use a separate client per
member session; create a new client when the member or refresh credentials change.

Optional `getAccessToken`/`setAccessToken` hooks keep storage caller-owned. A getter is
authoritative: returning `undefined` clears the cached token and prevents authenticated calls.
The setter must persist the refreshed token before resolving; requests wait for that write before
replaying. Hook failures become `CircleConfigError` with their original cause. Initial token reads
have their own `timeoutMs` budget. Shared recovery has a separate `timeoutMs` budget covering token
read, refresh fetch/body and storage write; each member HTTP attempt keeps its usual deadline.
Canceling a waiter stops that caller without canceling shared recovery, even if all current waiters
leave. With no deadline, a non-settling hook can keep recovery pending. A deadline stops SDK waiting
and committing that refresh result but cannot undo side effects of a caller-owned hook that
finishes later.

### Headless Auth (refresh access token)

```ts
import { createAuth } from "circleso/auth";

const refreshToken = process.env.CIRCLE_HEADLESS_REFRESH_TOKEN;
const authToken = process.env.CIRCLE_HEADLESS_AUTH_TOKEN;
if (!refreshToken || !authToken) {
  throw new Error("Missing member refresh or Headless Auth application token.");
}

const auth = createAuth({
  token: authToken,
});

const data = await auth.accessToken.refresh({
  refresh_token: refreshToken,
});

console.log(data?.access_token ? "Access token refreshed." : "No access token returned.");
```

Need the low-level OpenAPI client? Use `auth.raw` or `createHeadlessAuthClient`.

## Configuration

Default base URL for all clients is `https://app.circle.so`. `communityHost` is optional and defaults to
`app.circle.so` if omitted.

Common options across all clients:

- `timeoutMs`: per-attempt deadline in milliseconds, covering fetch and response body reads
- `retries`: `{ retries, baseDelayMs, maxDelayMs, jitterRatio, retryNonIdempotent, maxReplayBodyBytes, maxRetryAfterMs }`
- `userAgent`: custom user-agent value
- `logger`: hooks for request/response logging with redaction
- `fetcher`: custom fetch implementation

Per-surface options:

- `admin`: `token`, `communityHost`, `baseUrl`
- `headless`: `accessToken` or `token`, `refreshToken`, `authToken`, `autoRefresh`, `authBaseUrl`, `communityHost`
- `auth`: `token`, `communityHost`, `baseUrl`

Note: the unified `CircleSo` class constructs all three surfaces, so it requires
an Admin token, member access token, and Headless Auth application token. Auto-refresh also requires
the member refresh token and explicit `headless.authToken`. If you only need
one surface, use `createAdmin`, `createHeadless`, or `createAuth` directly.

`timeoutMs` starts before each attempt's body preparation and fetch, and remains active until the response body reaches
EOF or is canceled. It does not reset when headers or chunks arrive. Omit it or set it to `0` to
disable the deadline. Retry waits (including `Retry-After`) are outside this per-attempt budget;
each retry gets a fresh deadline. There is no built-in total request budget. Pass a caller-managed
`AbortSignal` via the flat per-call `signal` option to cancel across attempts and retry waits.
At the `createSmartFetch` boundary, both an input `Request.signal` and an `init.signal` are honored;
either can cancel the call. An already-aborted signal prevents fetching.

SDK deadlines throw `CircleTimeoutError` with `timeoutMs` and a `TimeoutError` cause. Caller
cancellation throws `CircleNetworkError` whose `cause` is the original signal reason (even if
that reason is itself a `TimeoutError`). Neither cancellation nor an SDK deadline is retried.
Timers and SDK signal listeners are released on completion, failure, cancellation and body disposal.

Retries default to two additional attempts for GET, HEAD, PUT, DELETE, OPTIONS and TRACE, on HTTP
408, 429 and 5xx or a fetch `TypeError` (network failure). POST and PATCH require
`retryNonIdempotent: true`; enabling it is the caller's assertion that repeating the operation is safe.
Payments, refunds, invitations and imports must not be opted in without an upstream guarantee.
The SDK does not infer Circle endpoint idempotency or add an idempotency key. Response body read or
parse failures are never retried. Superseded responses are canceled before waiting.

Backoff defaults to `baseDelayMs: 200`, `maxDelayMs: 2000` and `jitterRatio: 0.2`.
For zero-based retry index n, the delay is `min(baseDelayMs * 2**n, maxDelayMs)`, randomized
by plus/minus `jitterRatio`, rounded and capped again at `maxDelayMs`. A valid `Retry-After`
(integer seconds or HTTP-date) replaces backoff without jitter; past dates mean zero delay.
Invalid values fall back to backoff. `maxRetryAfterMs` defaults to 60,000: if the server requests
a longer wait, retries stop and the current HTTP failure is returned. The SDK never shortens that
server delay to retry early. Retry counts must be integers from 0 through 10, delay settings must be
finite from 0 through 2,147,483,647, jitter must be from 0 through 1, and `retryNonIdempotent` must be
boolean. At `createSmartFetch`, per-call retry fields override client fields individually; omitted
fields inherit defaults. Invalid retry configuration throws `CircleConfigError` before fetching.

SDK resource/raw clients preserve the provenance of serialized JSON and other finite BodyInit
sources (strings, buffers, Blob, URLSearchParams and FormData) through built-in auth middleware.
Before the first eligible attempt, the core snapshots the encoded bytes up to `maxReplayBodyBytes`
(default 1 MiB, a non-negative safe integer). Retries use fresh Requests with the same bytes and
Content-Type, including multipart boundaries. An oversized body still uploads intact, once;
`maxReplayBodyBytes: 0` disables body snapshots. This limit bounds extra replay buffering, not upload
size. There is no tee or eager snapshot of arbitrary streams. Native Request construction can pull
from a stream according to the runtime's own buffering behavior.

Opaque body-bearing Requests supplied directly to `createSmartFetch`, streamed raw body serializers,
and custom middleware that replaces a body-bearing Request with a native Request are single-attempt.
Content-Type and Content-Length do not prove replayability. At `createSmartFetch` you can instead
pass `body` as a finite BodyInit, or supply per-call `bodyFactory(attempt, signal)` to produce a fresh
BodyInit for every attempt, including attempt 0. The factory overrides the input body, runs inside
each attempt's deadline, and must preserve equivalent bytes and headers (including any multipart
boundary). It receives only the zero-based attempt and attempt signal; it does not receive headers
or credentials. Factories do not enable POST/PATCH retries by themselves. Factory failures throw
`CircleConfigError` with the original cause. Per-call factories are available at this core boundary;
resource clients use the bounded automatic snapshots. Cancellation or deadlines stop waiting for
an asynchronous factory; callers should honor its signal to stop their own work.
For auto-refresh, a canceled caller stops waiting for the shared refresh; the refresh keeps its own
per-attempt deadline so other callers can still use its result.

Low-level responses and `raw` calls with `parseAs: "stream"` transfer body ownership to the caller.
Consume the body or cancel it when finished; use `reader.cancel()` before `reader.releaseLock()`
when stopping a manual reader early. Stream iteration cancels on early exit by default. Deadlines
and caller cancellation remain active until EOF/cancellation, including while the caller pauses.
Clones share the upstream lifetime: cancel every unused clone, since a single tee branch cannot
cancel the source alone. Once the source reaches EOF, buffered clone data belongs to the caller.
The core preserves backpressure and adds no whole-body buffer. A custom fetcher/source must honor
abort/cancel to actually stop its own I/O; the SDK stops waiting without waiting for its cleanup.

## Browser vs server caveats

The Admin API requires a `host` header with your community domain. Browsers cannot set the `Host` header,
so Admin API calls must be made from a server runtime or a proxy you control. If `communityHost` is omitted,
it defaults to `app.circle.so`.

## Error handling

Named resources, iterators, `createClient`, and `createSmartFetch` (unless
`throwOnHttpError: false`) throw `CircleHttpError` for non-2xx responses, including empty,
`false`, `null`, and string error bodies. Inspect `status`, `method`, `url`, `requestId`,
`bodyText`, `parsedJson`, and `cause`. The request ID falls back to `x-correlation-id`.
Error bodies are best-effort: malformed JSON retains the original text and parsing cause;
unreadable or already consumed bodies retain the status and read failure cause.

Raw OpenAPI clients retain openapi-fetch's `{ data, error, response }` contract. Check
`response.ok` to detect HTTP failure: `error` can be `undefined`, `false`, `null`, or an empty
string. Raw HTTP payloads are preserved without unwrapping a nested `data` field. Raw calls
default to JSON; use `parseAs: "text"` for successful text responses or another supported
`parseAs` mode for binary/stream data. The generic `createClient` instead selects JSON for
`application/json` and `+json` MIME types, and text otherwise.

Successful 204/205 and empty JSON bodies return `undefined`; JSON primitives are preserved.
Malformed successful JSON throws `CircleNetworkError` with the `SyntaxError` cause, original
text, status, URL, method, and request ID. Body transport failures also use this class.
HTTP body-read failures retain `CircleHttpError`; caller cancellation and SDK deadlines keep
their `CircleNetworkError`/`CircleTimeoutError` identity and original causes. SDK-owned response
readers and clones normalize read/decode errors too, while retaining single-consumption and
stream ownership. Request preparation and middleware failures use `CircleConfigError` with a cause.

```ts
import { CircleHttpError, createSmartFetch } from "circleso";

const smartFetch = createSmartFetch({ baseUrl: "https://api-headless.circle.so" });

try {
  await smartFetch("/api/headless/v1/bookmarks");
} catch (error) {
  if (error instanceof CircleHttpError) {
    console.error(error.status, error.url);
    console.error(error.requestId);
    console.error(error.bodyText ?? error.parsedJson);
  } else {
    throw error;
  }
}
```

## Pagination

Use the pagination helpers directly, or the headless iterator helpers for common flows.

### Offset pagination (page + per_page)

```ts
import { paginateOffset, toAsyncIterator } from "circleso";
import { createAdmin } from "circleso/admin";

const adminToken = process.env.CIRCLE_ADMIN_TOKEN;
if (!adminToken) {
  throw new Error("Missing CIRCLE_ADMIN_TOKEN.");
}

const admin = createAdmin({
  token: adminToken,
  communityHost: process.env.CIRCLE_COMMUNITY_HOST ?? "app.circle.so",
});

const pages = paginateOffset({
  perPage: 50,
  maxItems: 120,
  fetchPage: async ({ page, perPage }) => {
    const data = await admin.accessGroups.list({
      page,
      per_page: perPage,
    });
    return { ...data, records: data?.records ?? [] };
  },
});

for await (const accessGroup of toAsyncIterator(pages)) {
  console.log(accessGroup.id, accessGroup.name);
}
```

### ID window pagination (chat room messages)

```ts
import { createHeadless } from "circleso/headless";

const headlessToken = process.env.CIRCLE_HEADLESS_TOKEN;
const chatRoomUuid = process.env.CIRCLE_CHAT_ROOM_UUID;
if (!headlessToken || !chatRoomUuid) {
  throw new Error("Missing CIRCLE_HEADLESS_TOKEN or CIRCLE_CHAT_ROOM_UUID.");
}

const headless = createHeadless({
  accessToken: headlessToken,
});

for await (const msg of headless.iter.chatRoomMessages(chatRoomUuid, {
  direction: "previous",
  maxItems: 100,
})) {
  console.log(msg.id, msg.body);
}
```

## Logging

Provide `logger` hooks to capture requests and responses. Sensitive headers and token-like fields
are redacted by default.

```ts
import { createAdmin } from "circleso/admin";

const admin = createAdmin({
  token: process.env.CIRCLE_ADMIN_TOKEN ?? "",
  logger: {
    onRequest: ({ request }) => console.log(request.method, request.url),
    onResponse: ({ response }) => console.log(response.status),
  },
});
```

## Examples

Runnable scripts are in `examples/`:

```bash
npx tsx examples/admin-list-something.ts
npx tsx examples/headless-create-bookmark.ts
npx tsx examples/refresh-token.ts
```

Required environment variables:

- Admin example: `CIRCLE_ADMIN_TOKEN`, optional `CIRCLE_COMMUNITY_HOST` (defaults to `app.circle.so`)
- Headless bookmark example: `CIRCLE_HEADLESS_TOKEN`, `CIRCLE_BOOKMARK_RECORD_ID`, optional `CIRCLE_BOOKMARK_TYPE`
- Refresh example: `CIRCLE_HEADLESS_REFRESH_TOKEN`

## Update API specs

The checked-in specs were synced on October 27, 2026 from Circle's official
[Admin V2](https://api-headless.circle.so/api/admin/v2/swagger.yaml),
[Headless Member V1](https://api-headless.circle.so/api/headless_client/v1/swagger.yaml), and
[Headless Auth](https://api-headless.circle.so/api/headless_auth/swagger.yaml) specs.

Existing resources include the latest endpoints for access group content, course lesson ordering,
form submissions, image post retrieval, invitation link creation and updates, and profile field
creation, updates, and deletion. Post and comment reactions use the existing `likes` methods:

```ts
import { createHeadless } from "circleso/headless";

const headless = createHeadless({ accessToken: process.env.CIRCLE_HEADLESS_TOKEN ?? "" });

await headless.posts.likes.create("123", { reaction_type: "celebrate" });
await headless.comments.likes.list(456, { reaction_type: "insightful" });
await headless.chatRooms.reactions.delete({ chat_room_message: 789, unicode: "1f923" });
```

See [CHANGELOG.md](./CHANGELOG.md) for the updated contracts and migration notes.

Check the committed declarations and operation inventory offline:

```bash
npm run gen:check
npm run coverage:check
npm run coverage:api
```

The [operation inventory](https://github.com/atomimus/circleso/blob/main/docs/api-coverage.md)
separates raw routes, named resources, and upstream schema limitations. It currently lists
47 Admin operations awaiting named wrappers; all 278 operations are available through raw clients.

Check upstream deliberately with `npm run spec:check`. It saves changed candidate specs, generated
types and unified patches in `.cache/spec-refresh-*`, exits with status 1 on drift, and leaves
tracked inputs unchanged. Accept a refresh explicitly, then inspect both inputs and outputs:

```bash
npm run spec:sync && npm run gen:types
npm run coverage:write
```

Circle's current Admin spec references an undefined `admin_v2_chat_room_message` response schema.
Generation applies a targeted override in `scripts/spec-overrides.ts` so that response is `unknown`.
The downloaded spec stays intact, and the override stops applying when Circle defines the schema.
See the [spec tooling guide](https://github.com/atomimus/circleso/blob/main/docs/spec-generation.md)
for failure handling and command details. Installation and ordinary builds do not download specs.

## License

MIT. See `LICENSE`.

For development and commit conventions, see
[CONTRIBUTING.md](https://github.com/atomimus/circleso/blob/main/CONTRIBUTING.md).
