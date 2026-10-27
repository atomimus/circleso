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

- This unreleased v1 checkout requires Node 22 or 24 (latest maintained patches); Node 24 is
  recommended. Node 18/20 and unqualified newer majors are excluded. The published 0.3.0 package
  still has its older engine contract; this runtime change requires the v1 major release.
- TypeScript 5.9.3 is the minimum. Packaged consumers are checked with 5.9.3 and 7.0.2 using
  strict Node16, NodeNext and Bundler resolution with `skipLibCheck: false`.
- Fetch globals (`fetch`, `Request`, `Response`, `Headers`, `AbortController`, `ReadableStream`)
  must exist; TypeScript callers need DOM/Fetch types. The SDK installs no global polyfills.
- Admin, Headless Auth application-token calls, and built-in auto-refresh require a server runtime

## Installation

```bash
npm install circleso
```

## Exports

- `circleso` - shared helpers and the unified `CircleSo` client
- `circleso/admin` - Admin API v2
- `circleso/headless` - Headless Client API v1
- `circleso/auth` - Headless Auth API v1

All four paths support ESM `import` and CJS `require`. Conditional exports select `.d.ts`
declarations for imports and `.d.cts` declarations for require, including `.cts` consumers using
Node16 resolution. Shared error constructors retain identity across these paths and both formats
within one installed package, so mixed-entry `instanceof CircleHttpError` checks work.
Unexported source/build paths are private. Browser applications should import Member factories
from `circleso/headless`; browser bundling and removal of unused server factories are checked.
Full browser/CORS qualification remains separate from these package checks.

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

#### Charges and subscriptions

`admin.communityMemberCharges` exposes `list`, `export` and `refund`.
`admin.communityMemberSubscriptions` exposes `list`, `export`, `cancel`, `resume` and
`changeBillingDate`. IDs are numeric Circle charge/subscription IDs. Options keep the
schema's field names flat, including `page`/`per_page` for lists and comma-separated
filter strings such as `status` and `paywall_ids`.

```ts
import { createAdmin } from "circleso/admin";

const admin = createAdmin({ token: process.env.CIRCLE_ADMIN_TOKEN! });
const charges = await admin.communityMemberCharges.list({ page: 1, per_page: 25 });
const exportTask = await admin.communityMemberSubscriptions.export({
  status: "active,trial",
  scheduled_to_cancel: false,
  fields: "processor_id,status",
  timezone: "Etc/UTC",
});

// Mutations below use illustrative IDs; invoke only for an intended financial change.
await admin.communityMemberCharges.refund(123, {
  reason_details: "Requested by the member",
  amount: 500,
});
await admin.communityMemberSubscriptions.cancel(456, { ends_at: "at_period_end" });
await admin.communityMemberSubscriptions.resume(456);
await admin.communityMemberSubscriptions.changeBillingDate(456, {
  operation: "change_billing_date",
  billing_date: "2026-11-15",
});
await admin.communityMemberSubscriptions.changeBillingDate(789, {
  operation: "extend_trial",
  days_to_extend: 7,
});
void [charges, exportTask];
```

Exports queue CSV delivery by email to the requesting admin and return JSON task metadata.
Their POST filters go in the query string. Refund amounts use currency subunits; omit
`amount` for a full refund and supply `reason_details` (maximum 255 characters).
Cancellation accepts `ends_at: "now"` or `"at_period_end"`; an immediate cancellation
can include `refund_type: "prorated"` or `"full"`. Resume applies to subscriptions
scheduled to cancel at period end.

Billing changes and genuine trial extensions share one PATCH operation. Circle requires
`billing_date` for `change_billing_date`, or a positive integer `days_to_extend` for
`extend_trial`, and ignores the other field. The generated schema requires `operation`
but does not express these conditional requirements; Circle validates them and checks
eligibility first (an ineligible operation can return 401 before input validation).
The SDK preserves that server behavior and its contextual errors. These POST/PATCH
operations retain the shared defaults that do not automatically retry unsafe methods;
Circle documents no idempotency guarantee here. Response types follow the official
schema, including optional/nullable fields.

Contracts checked October 27, 2026 against the
[official Admin V2 specification](https://api-headless.circle.so/api/admin/v2/swagger.yaml).

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

Default base URL for all clients is `https://app.circle.so`. `communityHost` defaults to
`app.circle.so` and controls only Admin's Host header; it never changes the network destination.
Member and Auth accept this shared option for compatibility but do not send a Host header.
To use another destination, supply `baseUrl` explicitly. In `CircleSo`, per-surface values override
the top-level `baseUrl` and `communityHost` independently.

`baseUrl` must be an absolute HTTP(S) URL without credentials, whitespace, backslashes, query or
fragment. Path prefixes are supported; HTTP is available for local development/proxies.
`communityHost` must be a DNS name, IPv4 or bracketed IPv6 address with an optional port
(1–65535), without a scheme or path. Invalid settings throw `CircleConfigError` at creation.
Do not use `communityHost` as a substitute for a trusted network destination.

Admin configurations where the Host differs from the `baseUrl` authority require an explicit
custom server `fetcher` that preserves Host. The default Fetch transport (including Node's native
Fetch) removes Host overrides before sending; passing `globalThis.fetch` directly does the same.
These configurations throw `CircleConfigError` at creation instead of silently using another Host.
A wrapper that merely calls native Fetch still cannot preserve the override. Use a server HTTP
adapter or proxy that supports the intended routing; the SDK never rewrites the destination for
you. With the defaults, both authorities are `app.circle.so` and native Fetch works.

Common options across all clients:

- `timeoutMs`: per-attempt deadline in milliseconds, covering fetch and response body reads
- `retries`: `{ retries, baseDelayMs, maxDelayMs, jitterRatio, retryNonIdempotent, maxReplayBodyBytes, maxRetryAfterMs }`
- `userAgent`: custom user-agent value
- `logger`: hooks for request/response logging with redaction
- `fetcher`: custom fetch implementation

Per-surface options:

- `admin`: `token`, `communityHost`, `baseUrl`
- `headless`: `accessToken` or `token`, `refreshToken`, `authToken`, `autoRefresh`, `authBaseUrl`, `communityHost`, `baseUrl`, token hooks
- `auth`: `token`, `communityHost`, `baseUrl`

The unified `CircleSo` class constructs all three surfaces and is server-only. It requires
an Admin token, a member access token (or `getAccessToken`), and a Headless Auth application token. Auto-refresh also requires
the member refresh token and explicit `headless.authToken`. If you only need
one surface, use `createAdmin`, `createHeadless`, or `createAuth` directly.

Credentials must be non-empty ASCII strings without whitespace or control characters. `token`
and `accessToken` are aliases on Member clients; supplying different values is a configuration
error. A token getter takes precedence over an initial static member token. Hooks must be
functions and are first invoked when a request needs a token, never during construction.
Invalid getter results or hook failures throw `CircleConfigError` before fetching, retaining
the original failure as `cause`. A custom `fetcher` must implement Fetch and works with or without
auto-refresh. It must be accompanied by standard Fetch globals (`Request`, `Response`, `Headers`,
`AbortController`, `ReadableStream`); supplying it does not install polyfills.

Credential roles are separate:

| Client | Credential and header | Runtime |
| --- | --- | --- |
| Admin | Admin V2 token → `Authorization: Token …`, plus Host | Server |
| Member | Member access token → `Authorization: Bearer …` | Server, browser or browser worker with Fetch/CORS support |
| Auth | Headless Auth application token → `Authorization: Bearer …` | Server |
| Member auto-refresh | Application `authToken` in Bearer; member `refreshToken` only in JSON | Server |

The SDK cannot infer a token's privileges from its string. Keep application credentials on your
server and authorize the signed-in member before using Auth to issue tokens. Browser Member
clients should obtain access tokens from their own server and use `getAccessToken` for rotation.
Creating Admin/Auth clients or supplying `authToken`/enabling auto-refresh in a browser or browser
worker throws with server/proxy guidance, including with custom fetchers.

Authentication sources checked October 27, 2026: Circle's
[Admin V2 specification](https://api-headless.circle.so/api/admin/v2/swagger.yaml) defines Token
and Host, while its [Admin quick start](https://api.circle.so/apis/admin-api/quick-start) shows
Bearer. This upstream discrepancy remains; this SDK follows the specification and repository
policy and continues sending Token. It does not try an alternative scheme after failure.
The [Headless quick start](https://api.circle.so/apis/headless/quick-start) and
[server Auth SDK](https://api.circle.so/apis/headless/auth-sdk/node.js) distinguish application
credentials from member access/refresh tokens. The
[Fetch standard](https://fetch.spec.whatwg.org/#forbidden-request-header) forbids setting Host in
browser requests, including workers. Runtime detection is a configuration guard, not a secret
security boundary or a guarantee of CORS support in every runtime.
Node's bundled [Undici Fetch implementation](https://github.com/nodejs/undici/blob/v7.16.0/lib/web/fetch/index.js)
also removes Host overrides; this was verified with Node 24.10.0/Undici 7.16.0 against a local server.

`timeoutMs` starts before each attempt's body preparation and fetch, and remains active until the response body reaches
EOF or is canceled. It does not reset when headers or chunks arrive. It must be finite and from
0 through 2,147,483,647. Omit it or set it to `0` to disable the deadline.
Retry waits (including `Retry-After`) are outside this per-attempt budget;
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

## Request options

Named resources use flat query/body fields plus `headers`, `signal`, and `credentials` metadata.
Required query inputs must be supplied, including segment duplication's query `title` and the
notification update fields. Required empty JSON bodies serialize as `{}`. Raw clients retain
openapi-fetch's explicit `params`/`body` options.

See [request options and v1 migration](https://github.com/atomimus/circleso/blob/main/docs/request-options.md)
for required inputs, collision scopes, array/object encoding, and the nested-query limitation.

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

Logging is opt-in. Hooks receive detached, redacted `Request`/`Response` snapshots and a logical
call `id`/`schemaPath`. They cannot change the actual request or response. Callback URLs contain
the origin and schema route (path arguments become `REDACTED`); query strings, fragments, URL
credentials and base-path prefixes are omitted. Response snapshots retain status, type and
redirected metadata, with server reason phrases redacted. The actual response keeps its URL,
status, headers and readable body, including empty 204/205 responses.

All opaque header values, including Authorization, API keys, Cookie, Set-Cookie, custom headers
and request IDs, become `REDACTED`. Only recognized content MIME types (without parameters) and
numeric Content-Length/Retry-After values survive. `redactHeaders` adds case-insensitive redactions
to these defaults; it cannot disable them.

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

Bodies are disabled by default. With `logBodies: true`, complete UTF-8 JSON and URL-encoded forms
may be inspected through a clone. JSON keeps field names, structure and non-string scalar values;
**every string value** is redacted, including strings under ordinary fields such as `message`.
Token, authorization, cookie, session, password, secret, credential, signature and API-key fields
have their entire value redacted. Form values are always redacted. Plain text, multipart uploads,
binary data, malformed JSON/forms, invalid UTF-8 and unavailable/used/locked bodies are omitted.
An absent body can be reported as `""`; an omitted body has no `requestBody`/`responseBody` property.
Request snapshots have no body; response snapshots contain only inspected, redacted body text.

Inspection defaults to 65,536 input bytes and 50 ms per body. Configure `maxBodyBytes` from 0
(disable inspection) through 1,048,576, and `bodyReadTimeoutMs` from 1 through 1000. Large declared
bodies are skipped. Reads stop at the byte limit, deadline or 1024 stream reads; incomplete bodies
are omitted as a whole, with no raw/truncated prefix logged. The clone is cancelled without waiting
for the other tee branch. Inspection can prefetch up to the cap plus a transport-provided chunk;
it does not impose a total network/stream memory limit. `parseAs: "stream"` responses are never
inspected, preserving caller control of pulls. Timers depend on the runtime event loop. Keep
secrets out of route, field/header names and non-string data that snapshots intentionally retain.

Hooks run once per logical call; retries and internal auto-refresh HTTP calls do not emit separate
events. `onError` receives only a known SDK error class name (otherwise `UnknownError`) and an HTTP
status when available. It never receives raw messages, stacks, bodies or cause chains. The error
thrown to the caller still retains its original evidence and cause; avoid logging it indiscriminately.

Synchronous and asynchronous hooks are awaited in order. A thrown/rejected hook fails the SDK call
with `CircleConfigError("Logger onRequest/onResponse/onError callback failed.")`, with the actual
hook name and original failure in `cause`. An `onError` hook failure takes precedence over the
transport failure. Hooks must settle; inspection deadlines do not time out caller-owned hook code.
For best-effort logging, catch sink failures inside your hook. Hook return values are ignored.

Migration: logger contexts no longer extend raw openapi-fetch middleware parameters. Use
`id`/`schemaPath`, snapshot metadata and the optional body fields instead of `params`/`options` or
raw error properties. Arbitrary option objects, serializers, fetch functions and error causes
are never automatically serialized or exposed to logger hooks.

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
- Refresh example (server only): `CIRCLE_HEADLESS_REFRESH_TOKEN`, `CIRCLE_HEADLESS_AUTH_TOKEN`

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
