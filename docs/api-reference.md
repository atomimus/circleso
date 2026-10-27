# API reference

This reference describes the unreleased v1 checkout. The published 0.3.0 package has a
different contract; follow the [migration guide](migration-v1.md) when adopting v1.
Install a published version with `npm install circleso`. Until a v1 candidate is actually
published, test this checkout using `npm ci`, `npm run build`, then
`npm pack --ignore-scripts` and install that local tarball in your application. Do not
assume installing the current registry package installs this unreleased API.

Use Node 22 or 24 with Fetch globals, and TypeScript 5.9.3 or newer with DOM types.
ESM and CJS have separate declarations; Node16, NodeNext and Bundler resolution are
checked with `skipLibCheck: false`. See [compatibility and support](../SUPPORT.md).

## Choose a client

| Factory | Result | Required configuration | Credential/runtime |
| --- | --- | --- | --- |
| `createAdmin` | Named `AdminApi`, `.raw`, `.iter` | `token` | Admin V2 Token; server |
| `createAdminClient` | Typed raw `AdminClient` | `token` | Admin V2 Token; server |
| `createHeadless` | Named `HeadlessApi`, `.raw`, `.iter` | `accessToken`, alias `token`, or `getAccessToken` | Member Bearer; Fetch runtime |
| `createHeadlessClient` | Typed raw `HeadlessClient`, `.iter` | Same Member configuration | Member Bearer; Fetch runtime |
| `createAuth` | Named `AuthApi`, `.raw` | `token` | Headless Auth application Bearer; server |
| `createHeadlessAuthClient` | Typed raw `HeadlessAuthClient` | `token` | Headless Auth application Bearer; server |
| `new CircleSo` | `.admin`, `.headless`, `.auth` | All three surfaces' credentials | Server |

Named factories also accept an already-created corresponding raw client. That overload
reuses its transport/middleware and state. Independent factories get independent refresh
and usage state. Use one Member client per verified member/community/session generation.
`CircleSo` constructs all three surfaces even when configuration sections are omitted;
use a standalone factory when you need one surface. Imports are named; there is no default export.

## Client configuration

The three raw/named factory pairs share these options. Omission uses the stated default.

| Option | Contract/default |
| --- | --- |
| `baseUrl` | `https://app.circle.so`; absolute HTTP(S), optional path prefix, no credentials/query/fragment/whitespace/backslashes |
| `communityHost` | `app.circle.so`; hostname/IP with optional port, no scheme/path. Only Admin sends Host; this does not change the destination |
| `timeoutMs` | Disabled when omitted or zero; finite duration 0–2,147,483,647 ms, through attempt preparation/admission/body disposal |
| `retries` | `RetryConfig`; two extra attempts for eligible methods, bounded finite body replay |
| `usage` | `UsageControlsConfig`; disabled by default, private per-client queues/budgets/circuit |
| `userAgent` | Optional non-empty header value; subject to runtime restrictions |
| `logger` | Optional `LoggerHooks`; detached/redacted snapshots, bodies off |
| `fetcher` | `typeof fetch`; defaults to global Fetch, requires the other Fetch globals too |

Admin with a different destination authority and Host requires an actual custom server
fetcher that preserves the Host override. Native Fetch strips it; wrapping native Fetch
without implementing that transport behavior is insufficient. Admin follows the official
spec's `Authorization: Token` despite Circle's quick-start Bearer discrepancy.

Member also accepts `refreshToken`, `authToken`, `autoRefresh` (default false), `authBaseUrl`,
`getAccessToken` and `setAccessToken`. `token` and `accessToken` cannot disagree. Token strings
must contain non-empty visible ASCII without whitespace/control characters; hooks must be functions. The getter is authoritative;
returning undefined clears the cached token. The setter must persist before resolving.
Auto-refresh requires both a member refresh token and a server application `authToken`.
`authBaseUrl` defaults to the Member base URL. Browser/worker guards reject Admin, Auth,
application credentials and built-in auto-refresh. See [authentication](authentication.md).

`CircleSoConfig` has top-level shared runtime options and `baseUrl`/`communityHost`.
Its `admin`, `headless` and `auth` sections carry their credentials and independently
override URL/Host. Runtime options, including `usage`, are top-level; each surface still
gets its own controller. Runtime detection and token syntax cannot verify token privileges.

## Requests and return values

Named methods use positional path IDs and flat query/JSON options, plus `headers`,
`signal` and `credentials`. Do not pre-encode IDs. Use the exact string/number ID type
listed below; the SDK does not coerce identifiers. Required options stay required even
for GET/DELETE. Query/body location follows the operation schema, independent of verb.
See [request options](request-options.md) for collisions, `queryParams`/`bodyParams`,
omission/null and nested deepObject serialization limits.

Named results are the operation's parsed success payload or `undefined`, without a
new envelope and without unwrapping nested `data`. Runtime nullable fields/records stay
nullable even when an upstream schema is incomplete. Raw clients offer both
`raw.GET(path, options)` and `raw[path].GET(options)` with openapi-fetch's explicit
`params`/`body` and `{ data, error, response }` result. Check `response.ok` for HTTP
failure; falsy/empty error payloads are valid. Transport/parse failures still throw SDK
errors. Default raw parsing is JSON; use `parseAs` for text/blob/arrayBuffer/stream.
Consume or cancel every owned stream/unused clone to release deadlines and usage slots.

```ts
import { createHeadless } from "circleso/headless";
import type { AdminApi } from "circleso/admin";

const accessToken = process.env.CIRCLE_HEADLESS_TOKEN;
if (!accessToken) throw new Error("Missing CIRCLE_HEADLESS_TOKEN");
const member = createHeadless({ accessToken, timeoutMs: 10_000 });
const bookmarks = await member.bookmarks.list({ page: 1, per_page: 20 });
const raw = await member.raw.GET("/api/headless/v1/bookmarks", {
  params: { query: { page: 1, per_page: 20 } },
});
if (!raw.response.ok) throw new Error(`Member request failed (${raw.response.status})`);
void [bookmarks, raw.data];

// Derive exact public inputs/results without importing private generated paths.
export type CreatePostOptions = Parameters<AdminApi["posts"]["create"]>[0];
export type CreatedPost = Awaited<ReturnType<AdminApi["posts"]["create"]>>;
```

`cookies.createWithResponse`/`deleteWithResponse` return `{ data, response }` with original
metadata; the data-only methods are unchanged. Headers, URLs, errors and cause chains may
contain credentials. Do not indiscriminately log raw results. The complete method/path
map and all untyped successes appear in the [operation inventory](api-coverage.md):
172 Admin, 102 Member and four Auth operations, all with named and raw access.

## Failures, deadlines and retries

All SDK failure classes extend `CircleSdkError`. Shared constructors preserve identity
across all four entries and both formats within one installed copy.

| Error | Evidence/action |
| --- | --- |
| `CircleHttpError` | Non-2xx named/core response, or refresh response contract failure. `status`, `url`, `method`, optional `requestId`, `bodyText`, `parsedJson`, `cause` |
| `CircleNetworkError` | Fetch/body/read/parse failure; caller cancellation retains the original signal reason in `cause`; optional response context |
| `CircleTimeoutError` | SDK deadline with `timeoutMs` and timeout cause; optional response context |
| `CircleConfigError` | Invalid configuration, preparation, middleware or caller-hook failure; original `cause` |

204/205 and empty JSON success resolve undefined; primitives remain primitives. Malformed
success JSON is a network error with original text/cause. Error-body parsing is best-effort
and preserves HTTP status even when decoding fails. `requestId` checks `x-request-id`,
then `x-correlation-id`. HTTP evidence is available as `parsedJson`/`bodyText`, not a `.body` field.

```ts
import { CircleHttpError, CircleNetworkError, CircleTimeoutError } from "circleso";
import type { HeadlessApi } from "circleso/headless";

export async function readBookmarks(member: HeadlessApi, signal: AbortSignal) {
  try {
    return await member.bookmarks.list({ signal });
  } catch (error) {
    if (error instanceof CircleHttpError) return { failedStatus: error.status };
    if (error instanceof CircleTimeoutError) return { deadlineMs: error.timeoutMs };
    if (error instanceof CircleNetworkError && signal.aborted) return { canceled: true };
    throw error;
  }
}
```

The attempt deadline includes waiting for admission and reading the body, and never resets
at headers/chunks. Retry waits lie outside it; pass a caller `signal` for a total call
budget. Cancellation/SDK timeouts and body-read/parse failures are not retried. Timers
depend on the event loop; uncooperative transports/callbacks may keep doing their own work.

`RetryConfig` defaults: `retries: 2` (extra attempts, range 0–10), `baseDelayMs: 200`,
`maxDelayMs: 2000`, `jitterRatio: 0.2` (range 0–1), `maxRetryAfterMs: 60000`,
`maxReplayBodyBytes: 1048576`, `retryNonIdempotent: false`. Eligible methods are GET,
HEAD, PUT, DELETE, OPTIONS and TRACE; retryable outcomes are HTTP 408/429/5xx or a fetch
TypeError. POST/PATCH require deliberate opt-in. Finite bodies use bounded exact byte
snapshots; oversized/opaque streams remain single-attempt. Valid Retry-After seconds/date
replaces backoff without jitter; a wait above the cap stops retrying instead of retrying
early. Otherwise use capped exponential backoff with bounded jitter. All delay settings
are finite 0–2,147,483,647 ms; snapshot bounds are non-negative safe integers.

For intended mutations, use a client with `retries: { retries: 0 }` and reconcile uncertain
outcomes before repeating. There is no general Circle idempotency guarantee or SDK
idempotency key. Auto-refresh handles 401 only, shares one refresh per token generation
(including failure), and replays each original once with no subsequent retry. 403 never
refreshes. Refresh PATCH is never retried. See [authentication](authentication.md) for
hook deadlines, failed generations, cancellation and separate refresh ownership.

## Helpers and extension policy

| API | Use and boundary |
| --- | --- |
| `paginateOffset`, `paginateSearchAfter`, `paginateByIdWindow`, `toAsyncIterator` | Generic bounded async page/record iteration; typed `.iter` adapters cover 62 collections. Set both maxPages/maxItems; no snapshot/dedup or prefetch. [Pagination](pagination.md) |
| `directUploads.create` / `.upload` | Register only / prepare, hash, register, isolated storage PUT. Finite inputs, maxBytes 64 MiB, workflow deadline 60 s; no automatic attachment/rollback. [Uploads](file-uploads.md) |
| `richText` | `text`, `link`, `mention`, `hardBreak`, `paragraph`, `body`, `signedAttachment`, `unchecked`. Mutable output; bounds 64 levels/10,000 JSON values; no sanitizer or server acceptance guarantee. [Rich text](rich-text.md) |
| `createSessionCookiesUrl` | Builds HTTPS `/session/cookies?access_token=…` from a trusted community origin and member token. Sensitive URL; no network call or privilege verification. [Cookies](authentication.md) |
| `createSmartFetch` | Core fetch returning Response; required `baseUrl`, optional defaultHeaders/userAgent/timeoutMs/retries/usage/fetcher/throwOnHttpError (default true). Per-call `SmartFetchInit` adds timeoutMs/retries/bodyFactory to RequestInit. No implicit Circle auth |
| `createClient` | Legacy generic client with get/post/put/patch/delete/request, `ClientConfig` and generic caller-asserted response T. Required baseUrl; optional basePath/auth/defaultHeaders/fetcher. It does not derive types or auth roles from Circle specs |
| `joinPath`, `joinUrl`, `withQuery` | Low-level string URL/query utilities; `withQuery` takes scalar query values. They are not destination/authorization validators |
| `createAdminAuthMiddleware`, `createBearerAuthMiddleware`, `createHostHeaderMiddleware` | Root factories for openapi-fetch middleware; Admin `{token, host?}`, Bearer `{token: string or async getter, timeoutMs?}`, Host `{host}`. Built-in clients already install auth |
| `createLoggerMiddleware` | Root opt-in logger middleware factory accepting LoggerHooks or undefined; built-in clients install it through `logger` |

Raw `.use`/`.eject` support custom openapi-fetch middleware. Global request/response
changes belong there; SDK HTTP retries/timeouts/parsing remain centralized in core.
Custom middleware/fetchers own their behavior and must preserve cancellation, secrets and
replay equivalence. Replacing a finite body Request with an opaque Request can disable
replay. An explicit raw serializer or unchecked rich-text extension needs a separately
verified upstream convention; neither is a guarantee of undocumented API support.
The SDK does not validate all runtime schema fields or sanitize arbitrary rich content.

Logging is opt-in through `LoggerHooks`: awaited `onRequest`, `onResponse`, `onError`;
logical call `id`/`schemaPath`, detached snapshots. All opaque headers/query values/path
arguments and string body values are redacted. Body inspection is off; `logBodies: true`
allows only safe complete JSON/forms with default maxBodyBytes 65,536 and
bodyReadTimeoutMs 50 (caps 1 MiB/1000 ms/1024 reads). Stream responses are never inspected.
`redactHeaders` only adds redaction. Hook failures are config errors; callbacks must settle.
See [README logging](../README.md#logging) for retained metadata and error precedence.

`usage` is an optional local policy, with no implicit cache. Its queue defaults to four
active attempts, 100 waiters and 30 seconds residence when enabled. Each retry/refresh
and replay is admitted; response bodies retain slots until EOF/cancel/deadline. Optional
rolling admission and circuit controls cannot enforce IP-wide/monthly/distributed quotas.
See [usage controls](usage-controls.md) for every field, frozen local rejection causes,
half-open behavior and an explicitly application-owned server cache recipe.

## Workflow examples and upstream gaps

Use the complete [environment-driven workflow](https://github.com/atomimus/circleso/blob/main/examples/member-workflow.ts) for Auth,
Member/Admin reads, upload/rich-text writes and cookie forwarding. Mutation functions
require an explicit invocation. [Synthetic auth/cookies](https://github.com/atomimus/circleso/blob/main/examples/auth-and-cookies.ts)
and [upload/rich-text fixtures](https://github.com/atomimus/circleso/blob/main/examples/documented-workflows.ts) run without credentials
or Circle requests; CI runs their installed-package copies. Other examples compile only.

Admin finance/paywall eligibility, replacement-list semantics, filter controls and
historical imports have dedicated guides: [paywalls](admin-paywalls.md),
[workflows/filters](admin-workflows-and-filters.md), [other Admin resources](admin-remaining-resources.md).
The generated inventory lists nine untyped success operations. Chat import's missing
response schema remains unknown; no hand-edited generated replacement is supplied.
Nested free-form fields can remain unknown/object-only; named rich-text compatibility
widens only 18 documented request fields. POST member search can return numeric cursors
that its request schema forbids: records are yielded, then continuation fails without coercion.

The committed specification hashes in the inventory identify the accepted SDK contract.
The October 27 live comparison found two additional Admin changes: locale `de` was added
upstream but is not yet in this checkout's locale enum, and event creation now explicitly
describes attendee/cohost invitations as best-effort even after 201. Do not infer atomic
invitation success from event creation. Member/Auth live inputs match the committed inputs.
Accepting spec changes remains a deliberate maintenance operation.

Sources checked October 27, 2026: [Circle index](https://api.circle.so/llms.txt),
[Admin spec](https://api-headless.circle.so/api/admin/v2/swagger.yaml),
[Member spec](https://api-headless.circle.so/api/headless_client/v1/swagger.yaml),
[Auth spec](https://api-headless.circle.so/api/headless_auth/swagger.yaml),
[Headless quick start](https://api.circle.so/apis/headless/quick-start),
[usage limits](https://api.circle.so/apis/admin-api/usage-and-limits) and
[openapi-fetch API](https://openapi-ts.dev/openapi-fetch/api) (installed 0.15.0).

## Public exports

The following inventories are checked by `npm run docs:check`. Each source declaration
defines the exact type. Published declarations are installed-package contracts; private
source paths, generated interfaces and build chunks are not importable package entry points.

<!-- PUBLIC API INVENTORY -->

<!-- Generated by npm run docs:write. Do not edit this section. -->

### circleso

| Export | Kind | Definition |
| --- | --- | --- |
| `AdminApi` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/index.ts) |
| `AdminApiConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/index.ts) |
| `AdminClient` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/clients/adminClient.ts) |
| `AdminClientConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/clients/adminClient.ts) |
| `AuthApi` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/authApi/index.ts) |
| `AuthApiConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/authApi/index.ts) |
| `AuthConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `CircleConfigError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `CircleHttpError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `CircleNetworkError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `CircleResponse` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/response.ts) |
| `CircleSdkError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `CircleSo` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/index.ts) |
| `CircleSoConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/index.ts) |
| `CircleTimeoutError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `ClientConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `DirectUploadInput` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/uploads.ts) |
| `DirectUploadOptions` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/uploads.ts) |
| `DirectUploadResult` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/uploads.ts) |
| `HeadlessApi` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/index.ts) |
| `HeadlessApiConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/index.ts) |
| `HeadlessAuthClient` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/clients/headlessAuthClient.ts) |
| `HeadlessAuthClientConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/clients/headlessAuthClient.ts) |
| `HeadlessClient` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/clients/headlessClient.ts) |
| `HeadlessClientConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/clients/headlessClient.ts) |
| `HeadlessDirectUploadOptions` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/directUploads.ts) |
| `HttpMethod` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `IdWindowDirection` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/pagination.ts) |
| `IdWindowPage` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/pagination.ts) |
| `IdWindowPaginationConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/pagination.ts) |
| `LoggerErrorContext` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/middleware/logger.ts) |
| `LoggerHooks` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/middleware/logger.ts) |
| `LoggerRequestContext` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/middleware/logger.ts) |
| `LoggerResponseContext` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/middleware/logger.ts) |
| `OffsetPage` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/pagination.ts) |
| `OffsetPaginationConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/pagination.ts) |
| `PaginatedRecords` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/pagination.ts) |
| `PaginationLimits` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/pagination.ts) |
| `PaginationResponse` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/pagination.ts) |
| `QueryValue` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `RequestOptions` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `RetryConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/http.ts) |
| `RichTextBody` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextDocument` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextHardBreak` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextInline` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextJsonObject` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextJsonValue` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextLinkMark` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextMention` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextParagraph` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextText` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `SearchAfterCursor` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/pagination.ts) |
| `SearchAfterPage` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/pagination.ts) |
| `SearchAfterPaginationConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/pagination.ts) |
| `SearchAfterResponse` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/pagination.ts) |
| `SessionCookiesUrlOptions` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/sessionCookies.ts) |
| `SignedAttachmentId` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `SmartFetchConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/http.ts) |
| `SmartFetchInit` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/http.ts) |
| `UncheckedRichTextBody` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `UsageControlRejection` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/usageControls.ts) |
| `UsageControlsConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/usageControls.ts) |
| `createAdmin` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/index.ts) |
| `createAdminAuthMiddleware` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/middleware/adminAuth.ts) |
| `createAdminClient` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/clients/adminClient.ts) |
| `createAuth` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/authApi/index.ts) |
| `createBearerAuthMiddleware` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/middleware/bearerAuth.ts) |
| `createClient` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/client.ts) |
| `createHeadless` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/index.ts) |
| `createHeadlessAuthClient` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/clients/headlessAuthClient.ts) |
| `createHeadlessClient` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/clients/headlessClient.ts) |
| `createHostHeaderMiddleware` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/middleware/hostHeader.ts) |
| `createLoggerMiddleware` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/middleware/logger.ts) |
| `createSessionCookiesUrl` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/sessionCookies.ts) |
| `createSmartFetch` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/http.ts) |
| `joinPath` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/url.ts) |
| `joinUrl` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/url.ts) |
| `paginateByIdWindow` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/pagination.ts) |
| `paginateOffset` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/pagination.ts) |
| `paginateSearchAfter` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/pagination.ts) |
| `richText` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `toAsyncIterator` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/pagination.ts) |
| `withQuery` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/url.ts) |

### circleso/admin

| Export | Kind | Definition |
| --- | --- | --- |
| `AdminApi` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/index.ts) |
| `AdminApiConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/index.ts) |
| `AdminClient` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/clients/adminClient.ts) |
| `AdminClientConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/clients/adminClient.ts) |
| `AuthConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `CircleConfigError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `CircleHttpError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `CircleNetworkError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `CircleSdkError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `CircleTimeoutError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `ClientConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `DirectUploadInput` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/uploads.ts) |
| `DirectUploadOptions` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/uploads.ts) |
| `DirectUploadResult` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/uploads.ts) |
| `HttpMethod` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `QueryValue` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `RequestOptions` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `RichTextBody` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextDocument` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextHardBreak` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextInline` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextJsonObject` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextJsonValue` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextLinkMark` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextMention` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextParagraph` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextText` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `SignedAttachmentId` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `UncheckedRichTextBody` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `UsageControlRejection` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/usageControls.ts) |
| `UsageControlsConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/usageControls.ts) |
| `createAdmin` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/index.ts) |
| `createAdminClient` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/clients/adminClient.ts) |
| `richText` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |

### circleso/headless

| Export | Kind | Definition |
| --- | --- | --- |
| `AuthConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `ChatRoomMessagesIteratorOptions` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/cursorIterators.ts) |
| `CircleConfigError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `CircleHttpError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `CircleNetworkError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `CircleResponse` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/response.ts) |
| `CircleSdkError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `CircleTimeoutError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `ClientConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `DirectUploadInput` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/uploads.ts) |
| `DirectUploadOptions` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/uploads.ts) |
| `DirectUploadResult` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/uploads.ts) |
| `HeadlessApi` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/index.ts) |
| `HeadlessApiConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/index.ts) |
| `HeadlessClient` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/clients/headlessClient.ts) |
| `HeadlessClientConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/clients/headlessClient.ts) |
| `HeadlessDirectUploadOptions` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/directUploads.ts) |
| `HeadlessIterators` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/cursorIterators.ts) |
| `HttpMethod` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `QueryValue` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `RequestOptions` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `RichTextBody` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextDocument` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextHardBreak` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextInline` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextJsonObject` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextJsonValue` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextLinkMark` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextMention` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextParagraph` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `RichTextText` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `SessionCookiesUrlOptions` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/sessionCookies.ts) |
| `SignedAttachmentId` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `UncheckedRichTextBody` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |
| `UsageControlRejection` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/usageControls.ts) |
| `UsageControlsConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/usageControls.ts) |
| `createHeadless` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/index.ts) |
| `createHeadlessClient` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/clients/headlessClient.ts) |
| `createSessionCookiesUrl` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/sessionCookies.ts) |
| `richText` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/richText.ts) |

### circleso/auth

| Export | Kind | Definition |
| --- | --- | --- |
| `AuthApi` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/authApi/index.ts) |
| `AuthApiConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/authApi/index.ts) |
| `AuthConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `CircleConfigError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `CircleHttpError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `CircleNetworkError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `CircleSdkError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `CircleTimeoutError` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/errors.ts) |
| `ClientConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `HeadlessAuthClient` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/clients/headlessAuthClient.ts) |
| `HeadlessAuthClientConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/clients/headlessAuthClient.ts) |
| `HttpMethod` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `QueryValue` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `RequestOptions` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/types.ts) |
| `UsageControlRejection` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/usageControls.ts) |
| `UsageControlsConfig` | Type only | [declaration](https://github.com/atomimus/circleso/blob/main/src/core/usageControls.ts) |
| `createAuth` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/authApi/index.ts) |
| `createHeadlessAuthClient` | Runtime | [declaration](https://github.com/atomimus/circleso/blob/main/src/clients/headlessAuthClient.ts) |

## Resource call shapes

Generated from the public facade types, including nested resources and iterators. `options?` is optional; `options` is required. Positional ID types are preserved exactly. `RequestOptions`/`RequestOptionsWithBody` below name internal operation types: use the public `Parameters` recipe above to obtain them. The method/path inventory links every HTTP call to its committed specification. Return types are inferred from that operation; they preserve `undefined`, nullable fields and upstream `unknown` gaps. Iterator calls return async iterables, cookie `WithResponse` calls return `CircleResponse`, and upload workflows return `DirectUploadResult`.

### AdminApi

| Call | Definition |
| --- | --- |
| `iter.accessGroupMembers(accessGroupId: number, options?: Options<"/api/admin/v2/access_groups/{access_group_id}/community_members">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.accessGroups(options?: Options<"/api/admin/v2/access_groups">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.advancedSearch(options: Options<"/api/admin/v2/advanced_search">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.comments(options?: Options<"/api/admin/v2/comments">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.communityMemberCharges(options?: Options<"/api/admin/v2/community_member_charges">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.communityMemberSpaces(options?: Options<"/api/admin/v2/community_member_spaces">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.communityMemberSubscriptions(options?: Options<"/api/admin/v2/community_member_subscriptions">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.communityMemberAccessGroups(communityMemberId: number, options?: Options<"/api/admin/v2/community_members/{community_member_id}/access_groups">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.communityMembers(options?: Options<"/api/admin/v2/community_members">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.communitySegments(options?: Options<"/api/admin/v2/community_segments">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.contactNotes(contactId: string, options?: Options<"/api/admin/v2/contacts/{contact_id}/contact_notes">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.courseLessons(options?: Options<"/api/admin/v2/course_lessons">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.courseSections(options?: Options<"/api/admin/v2/course_sections">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.eventAttendees(options: Options<"/api/admin/v2/event_attendees">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.events(options?: Options<"/api/admin/v2/events">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.filterKitControls(options?: Options<"/api/admin/v2/filter_kit_controls">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.flaggedContents(options?: Options<"/api/admin/v2/flagged_contents">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.forms(options?: Options<"/api/admin/v2/forms">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.formSubmissions(formId: number, options?: Options<"/api/admin/v2/forms/{form_id}/submissions">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.imagePosts(spaceId: number, options?: Options<"/api/admin/v2/spaces/{space_id}/images/posts">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.invitationLinks(options?: Options<"/api/admin/v2/invitation_links">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.liveRooms(options?: Options<"/api/admin/v2/live/rooms">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.memberTags(options?: Options<"/api/admin/v2/member_tags">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.paywallAffiliates(options?: Options<"/api/admin/v2/paywall_affiliates">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.paywalls(options?: Options<"/api/admin/v2/paywalls/search">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.posts(options?: Options<"/api/admin/v2/posts">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.profileFields(options?: Options<"/api/admin/v2/profile_fields">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.spaceGroupMembers(options: Options<"/api/admin/v2/space_group_members">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.spaceGroups(options?: Options<"/api/admin/v2/space_groups">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.spaceMembers(options: Options<"/api/admin/v2/space_members">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.spaces(options?: Options<"/api/admin/v2/spaces">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.taggedMembers(options?: Options<"/api/admin/v2/tagged_members">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.topics(options?: Options<"/api/admin/v2/topics">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `iter.workflows(options?: Options<"/api/admin/v2/workflows">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/iterators.ts) |
| `accessGroups.list(options?: RequestOptions<"/api/admin/v2/access_groups", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/accessGroups.ts) |
| `accessGroups.create(options: RequestOptionsWithBody<"/api/admin/v2/access_groups", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/accessGroups.ts) |
| `accessGroups.update(id: number, options: RequestOptionsWithBody<"/api/admin/v2/access_groups/{id}", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/accessGroups.ts) |
| `accessGroups.archive(id: number, options?: RequestOptions<"/api/admin/v2/access_groups/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/accessGroups.ts) |
| `accessGroups.unarchive(id: number, options?: RequestOptions<"/api/admin/v2/access_groups/{id}/unarchive", "patch">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/accessGroups.ts) |
| `accessGroups.content.update(accessGroupId: number, options: RequestOptionsWithBody< "/api/admin/v2/access_groups/{access_group_id}/content", "patch" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/accessGroups.ts) |
| `accessGroups.members.list(accessGroupId: number, options?: RequestOptions< "/api/admin/v2/access_groups/{access_group_id}/community_members", "get" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/accessGroups.ts) |
| `accessGroups.members.add(accessGroupId: number, options: RequestOptionsWithBody< "/api/admin/v2/access_groups/{access_group_id}/community_members", "post" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/accessGroups.ts) |
| `accessGroups.members.remove(accessGroupId: number, options: RequestOptions< "/api/admin/v2/access_groups/{access_group_id}/community_members", "delete" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/accessGroups.ts) |
| `accessGroups.members.get(accessGroupId: number, options: RequestOptions< "/api/admin/v2/access_groups/{access_group_id}/community_member", "get" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/accessGroups.ts) |
| `search.advanced(options: RequestOptions<"/api/admin/v2/advanced_search", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/search.ts) |
| `chatPreferences.update(options: RequestOptionsWithBody<"/api/admin/v2/chat_preferences", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/chatPreferences.ts) |
| `chatRoomMessageImports.create(options: RequestOptionsWithBody<"/api/admin/v2/chat_room_message_imports", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/chatRoomMessageImports.ts) |
| `comments.list(options?: RequestOptions<"/api/admin/v2/comments", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/comments.ts) |
| `comments.get(id: string, options?: RequestOptions<"/api/admin/v2/comments/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/comments.ts) |
| `comments.create(options: RequestOptionsWithBody<"/api/admin/v2/comments", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/comments.ts) |
| `comments.delete(id: string, options?: RequestOptions<"/api/admin/v2/comments/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/comments.ts) |
| `community.get(options?: RequestOptions<"/api/admin/v2/community", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/community.ts) |
| `community.update(options: RequestOptionsWithBody<"/api/admin/v2/community", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/community.ts) |
| `communityLeads.create(options: RequestOptionsWithBody<"/api/admin/v2/community_leads", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityLeads.ts) |
| `communityLeads.delete(id: number, options?: RequestOptions<"/api/admin/v2/community_leads/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityLeads.ts) |
| `communityMemberCharges.list(options?: RequestOptions<"/api/admin/v2/community_member_charges", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityMemberCharges.ts) |
| `communityMemberCharges.export(options?: RequestOptions<"/api/admin/v2/community_member_charges/export", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityMemberCharges.ts) |
| `communityMemberCharges.refund(id: number, options: RequestOptionsWithBody<"/api/admin/v2/community_member_charges/{id}/refund", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityMemberCharges.ts) |
| `communityMemberSubscriptions.list(options?: RequestOptions<"/api/admin/v2/community_member_subscriptions", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityMemberSubscriptions.ts) |
| `communityMemberSubscriptions.export(options?: RequestOptions<"/api/admin/v2/community_member_subscriptions/export", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityMemberSubscriptions.ts) |
| `communityMemberSubscriptions.cancel(id: number, options: RequestOptionsWithBody< "/api/admin/v2/community_member_subscriptions/{id}/cancel", "post" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityMemberSubscriptions.ts) |
| `communityMemberSubscriptions.resume(id: number, options?: RequestOptions<"/api/admin/v2/community_member_subscriptions/{id}/resume", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityMemberSubscriptions.ts) |
| `communityMemberSubscriptions.changeBillingDate(id: number, options: RequestOptionsWithBody< "/api/admin/v2/community_member_subscriptions/{id}/billing_date", "patch" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityMemberSubscriptions.ts) |
| `communityMembers.list(options?: RequestOptions<"/api/admin/v2/community_members", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityMembers.ts) |
| `communityMembers.create(options: RequestOptionsWithBody<"/api/admin/v2/community_members", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityMembers.ts) |
| `communityMembers.get(id: string, options?: RequestOptions<"/api/admin/v2/community_members/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityMembers.ts) |
| `communityMembers.update(id: string, options: RequestOptionsWithBody<"/api/admin/v2/community_members/{id}", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityMembers.ts) |
| `communityMembers.deactivate(id: string, options?: RequestOptions<"/api/admin/v2/community_members/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityMembers.ts) |
| `communityMembers.delete(id: number, options?: RequestOptions<"/api/admin/v2/community_members/{id}/delete_member", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityMembers.ts) |
| `communityMembers.ban(id: number, options?: RequestOptions<"/api/admin/v2/community_members/{id}/ban_member", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityMembers.ts) |
| `communityMembers.search(options: RequestOptions<"/api/admin/v2/community_members/search", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityMembers.ts) |
| `communityMembers.accessGroups.list(communityMemberId: number, options?: RequestOptions< "/api/admin/v2/community_members/{community_member_id}/access_groups", "get" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityMembers.ts) |
| `communityMembers.spaces.list(options?: RequestOptions<"/api/admin/v2/community_member_spaces", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communityMembers.ts) |
| `communitySegments.list(options?: RequestOptions<"/api/admin/v2/community_segments", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communitySegments.ts) |
| `communitySegments.create(options: RequestOptionsWithBody<"/api/admin/v2/community_segments", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communitySegments.ts) |
| `communitySegments.update(id: string, options: RequestOptionsWithBody<"/api/admin/v2/community_segments/{id}", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communitySegments.ts) |
| `communitySegments.delete(id: string, options?: RequestOptions<"/api/admin/v2/community_segments/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communitySegments.ts) |
| `communitySegments.duplicate(id: string, options: RequestOptions<"/api/admin/v2/community_segments/{id}/duplicate", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/communitySegments.ts) |
| `connectSettings.get(options?: RequestOptions<"/api/admin/v2/settings/connect", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/connectSettings.ts) |
| `connectSettings.update(options?: RequestOptions<"/api/admin/v2/settings/connect", "patch">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/connectSettings.ts) |
| `contactNotes.list(contactId: string, options?: RequestOptions<"/api/admin/v2/contacts/{contact_id}/contact_notes", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/contactNotes.ts) |
| `contactNotes.create(contactId: string, options: RequestOptionsWithBody<"/api/admin/v2/contacts/{contact_id}/contact_notes", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/contactNotes.ts) |
| `courses.sections.list(options?: RequestOptions<"/api/admin/v2/course_sections", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/courses.ts) |
| `courses.sections.create(options: RequestOptionsWithBody<"/api/admin/v2/course_sections", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/courses.ts) |
| `courses.sections.get(id: number, options?: RequestOptions<"/api/admin/v2/course_sections/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/courses.ts) |
| `courses.sections.update(id: number, options: RequestOptionsWithBody<"/api/admin/v2/course_sections/{id}", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/courses.ts) |
| `courses.sections.delete(id: number, options?: RequestOptions<"/api/admin/v2/course_sections/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/courses.ts) |
| `courses.lessons.reorder(options: RequestOptionsWithBody<"/api/admin/v2/course_lessons/reorder", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/courses.ts) |
| `courses.lessons.list(options?: RequestOptions<"/api/admin/v2/course_lessons", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/courses.ts) |
| `courses.lessons.create(options: RequestOptionsWithBody<"/api/admin/v2/course_lessons", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/courses.ts) |
| `courses.lessons.get(id: number, options?: RequestOptions<"/api/admin/v2/course_lessons/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/courses.ts) |
| `courses.lessons.update(id: number, options: RequestOptionsWithBody<"/api/admin/v2/course_lessons/{id}", "patch">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/courses.ts) |
| `courses.lessons.delete(id: number, options?: RequestOptions<"/api/admin/v2/course_lessons/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/courses.ts) |
| `courses.lessonProgress.update(options: RequestOptionsWithBody<"/api/admin/v2/course_lesson_progress", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/courses.ts) |
| `directUploads.create(options: RequestOptionsWithBody<"/api/admin/v2/direct_uploads", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/directUploads.ts) |
| `directUploads.upload(input: DirectUploadInput, options: DirectUploadOptions)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/directUploads.ts) |
| `embeds.create(options: RequestOptionsWithBody<"/api/admin/v2/embeds", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/embeds.ts) |
| `embeds.get(sgid: string, options?: RequestOptions<"/api/admin/v2/embeds/{sgid}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/embeds.ts) |
| `events.events.list(options?: RequestOptions<"/api/admin/v2/events", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/events.ts) |
| `events.events.create(options: RequestOptionsWithBody<"/api/admin/v2/events", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/events.ts) |
| `events.events.get(id: number, options?: RequestOptions<"/api/admin/v2/events/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/events.ts) |
| `events.events.update(id: number, options: RequestOptionsWithBody<"/api/admin/v2/events/{id}", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/events.ts) |
| `events.events.delete(id: number, options: RequestOptions<"/api/admin/v2/events/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/events.ts) |
| `events.events.duplicate(spaceId: number, id: number, options: RequestOptionsWithBody< "/api/admin/v2/spaces/{space_id}/events/{id}/duplicate", "post" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/events.ts) |
| `events.attendees.list(options: RequestOptions<"/api/admin/v2/event_attendees", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/events.ts) |
| `events.attendees.create(options: RequestOptionsWithBody<"/api/admin/v2/event_attendees", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/events.ts) |
| `events.attendees.delete(options: RequestOptionsWithBody<"/api/admin/v2/event_attendees", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/events.ts) |
| `flaggedContents.list(options?: RequestOptions<"/api/admin/v2/flagged_contents", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/flaggedContents.ts) |
| `flaggedContents.report(options: RequestOptionsWithBody<"/api/admin/v2/flagged_contents", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/flaggedContents.ts) |
| `filterKit.configuration(options: RequestOptions<"/api/admin/v2/filter_kit_configuration", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/filterKit.ts) |
| `filterKit.controls.list(options?: RequestOptions<"/api/admin/v2/filter_kit_controls", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/filterKit.ts) |
| `filterKit.controls.create(options: RequestOptionsWithBody<"/api/admin/v2/filter_kit_controls", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/filterKit.ts) |
| `filterKit.controls.get(id: number, options?: RequestOptions<"/api/admin/v2/filter_kit_controls/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/filterKit.ts) |
| `filterKit.controls.update(id: number, options?: RequestOptions<"/api/admin/v2/filter_kit_controls/{id}", "patch">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/filterKit.ts) |
| `filterKit.controls.delete(id: number, options?: RequestOptions<"/api/admin/v2/filter_kit_controls/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/filterKit.ts) |
| `forms.list(options?: RequestOptions<"/api/admin/v2/forms", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/forms.ts) |
| `forms.get(id: number, options?: RequestOptions<"/api/admin/v2/forms/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/forms.ts) |
| `forms.update(id: number, options: RequestOptionsWithBody<"/api/admin/v2/forms/{id}", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/forms.ts) |
| `forms.delete(id: number, options?: RequestOptions<"/api/admin/v2/forms/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/forms.ts) |
| `forms.submissions.list(formId: number, options?: RequestOptions<"/api/admin/v2/forms/{form_id}/submissions", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/forms.ts) |
| `forms.submissions.create(formId: number, options: RequestOptionsWithBody<"/api/admin/v2/forms/{form_id}/submissions", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/forms.ts) |
| `forms.duplicate(id: string, options?: RequestOptions<"/api/admin/v2/forms/{id}/duplicate", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/forms.ts) |
| `gamification.leaderboard(options?: RequestOptions<"/api/admin/v2/gamification/leaderboard", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/gamification.ts) |
| `invitationLinks.list(options?: RequestOptions<"/api/admin/v2/invitation_links", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/invitationLinks.ts) |
| `invitationLinks.create(options: RequestOptionsWithBody<"/api/admin/v2/invitation_links", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/invitationLinks.ts) |
| `invitationLinks.update(id: number, options: RequestOptionsWithBody<"/api/admin/v2/invitation_links/{id}", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/invitationLinks.ts) |
| `invitationLinks.delete(id: number, options?: RequestOptions<"/api/admin/v2/invitation_links/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/invitationLinks.ts) |
| `invitationLinks.revoke(id: number, options?: RequestOptions<"/api/admin/v2/invitation_links/{id}/revoke", "patch">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/invitationLinks.ts) |
| `liveRooms.list(options?: RequestOptions<"/api/admin/v2/live/rooms", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/liveRooms.ts) |
| `liveRooms.transcripts(roomId: number, options?: RequestOptions<"/api/admin/v2/live/rooms/{room_id}/transcripts", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/liveRooms.ts) |
| `locations.search(options: RequestOptions<"/api/admin/v2/locations/search", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/locations.ts) |
| `memberTags.list(options?: RequestOptions<"/api/admin/v2/member_tags", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/memberTags.ts) |
| `memberTags.create(options: RequestOptionsWithBody<"/api/admin/v2/member_tags", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/memberTags.ts) |
| `memberTags.get(id: number, options?: RequestOptions<"/api/admin/v2/member_tags/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/memberTags.ts) |
| `memberTags.update(id: number, options: RequestOptionsWithBody<"/api/admin/v2/member_tags/{id}", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/memberTags.ts) |
| `memberTags.delete(id: number, options?: RequestOptions<"/api/admin/v2/member_tags/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/memberTags.ts) |
| `messages.create(options: RequestOptionsWithBody<"/api/admin/v2/messages", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/messages.ts) |
| `pageProfileFields.list(options: RequestOptions<"/api/admin/v2/page_profile_fields", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/pageProfileFields.ts) |
| `paymentMethodPreferences.get(options?: RequestOptions<"/api/admin/v2/payment_method_setting", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/paymentMethodPreferences.ts) |
| `paywallAffiliatePayouts.start(options?: RequestOptions<"/api/admin/v2/paywall_affiliate_payouts/start", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/paywallAffiliatePayouts.ts) |
| `paywallAffiliatePayouts.markPaid(options?: RequestOptions<"/api/admin/v2/paywall_affiliate_payouts/mark_paid", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/paywallAffiliatePayouts.ts) |
| `paywallAffiliatePayouts.export(options?: RequestOptions<"/api/admin/v2/paywall_affiliate_payouts/export", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/paywallAffiliatePayouts.ts) |
| `paywallAffiliates.list(options?: RequestOptions<"/api/admin/v2/paywall_affiliates", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/paywallAffiliates.ts) |
| `paywallAffiliates.invite(options: RequestOptionsWithBody<"/api/admin/v2/paywall_affiliates/invite", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/paywallAffiliates.ts) |
| `paywallAffiliates.update(id: number, options: RequestOptionsWithBody<"/api/admin/v2/paywall_affiliates/{id}", "patch">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/paywallAffiliates.ts) |
| `paywallCoupons.delete(id: number, options?: RequestOptions<"/api/admin/v2/paywall_coupons/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/paywallCoupons.ts) |
| `paywallGroups.create(options: RequestOptionsWithBody<"/api/admin/v2/paywall_groups", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/paywallGroups.ts) |
| `paywallGroups.update(id: number, options: RequestOptionsWithBody<"/api/admin/v2/paywall_groups/{id}", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/paywallGroups.ts) |
| `paywalls.search(options?: RequestOptions<"/api/admin/v2/paywalls/search", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/paywalls.ts) |
| `paywalls.delete(id: number, options?: RequestOptions<"/api/admin/v2/paywalls/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/paywalls.ts) |
| `paywalls.archive(id: number, options?: RequestOptions<"/api/admin/v2/paywalls/{id}/archive", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/paywalls.ts) |
| `paywalls.publish(id: number, options?: RequestOptions<"/api/admin/v2/paywalls/{id}/publish", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/paywalls.ts) |
| `paywalls.unarchive(id: number, options?: RequestOptions<"/api/admin/v2/paywalls/{id}/unarchive", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/paywalls.ts) |
| `paywalls.syncMemberAccess(paywallId: number, options?: RequestOptions<"/api/admin/v2/paywalls/{paywall_id}/member_access_syncs", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/paywalls.ts) |
| `posts.list(options?: RequestOptions<"/api/admin/v2/posts", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/posts.ts) |
| `posts.create(options: RequestOptionsWithBody<"/api/admin/v2/posts", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/posts.ts) |
| `posts.get(id: number, options?: RequestOptions<"/api/admin/v2/posts/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/posts.ts) |
| `posts.update(id: string, options: RequestOptionsWithBody<"/api/admin/v2/posts/{id}", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/posts.ts) |
| `posts.delete(id: string, options?: RequestOptions<"/api/admin/v2/posts/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/posts.ts) |
| `posts.summary(postId: number, options?: RequestOptions<"/api/admin/v2/posts/{post_id}/summary", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/posts.ts) |
| `posts.followers.remove(postId: number, options: RequestOptions<"/api/admin/v2/posts/{post_id}/post_followers", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/posts.ts) |
| `posts.images.list(spaceId: number, options?: RequestOptions<"/api/admin/v2/spaces/{space_id}/images/posts", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/posts.ts) |
| `posts.images.get(spaceId: number, id: number, options?: RequestOptions<"/api/admin/v2/spaces/{space_id}/images/posts/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/posts.ts) |
| `posts.images.create(spaceId: number, options: RequestOptionsWithBody<"/api/admin/v2/spaces/{space_id}/images/posts", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/posts.ts) |
| `posts.images.delete(spaceId: number, id: number, options?: RequestOptions<"/api/admin/v2/spaces/{space_id}/images/posts/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/posts.ts) |
| `posts.images.duplicate(spaceId: number, id: number, options: RequestOptionsWithBody< "/api/admin/v2/spaces/{space_id}/images/posts/{id}/duplicate", "post" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/posts.ts) |
| `profileFields.list(options?: RequestOptions<"/api/admin/v2/profile_fields", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/profileFields.ts) |
| `profileFields.create(options: RequestOptionsWithBody<"/api/admin/v2/profile_fields", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/profileFields.ts) |
| `profileFields.update(id: number, options: RequestOptionsWithBody<"/api/admin/v2/profile_fields/{id}", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/profileFields.ts) |
| `profileFields.delete(id: number, options?: RequestOptions<"/api/admin/v2/profile_fields/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/profileFields.ts) |
| `profileFields.archive(id: number, options?: RequestOptions<"/api/admin/v2/profile_fields/{id}/archive", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/profileFields.ts) |
| `profileFields.unarchive(id: number, options?: RequestOptions<"/api/admin/v2/profile_fields/{id}/unarchive", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/profileFields.ts) |
| `spaceGroups.list(options?: RequestOptions<"/api/admin/v2/space_groups", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/spaceGroups.ts) |
| `spaceGroups.create(options: RequestOptionsWithBody<"/api/admin/v2/space_groups", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/spaceGroups.ts) |
| `spaceGroups.get(id: number, options?: RequestOptions<"/api/admin/v2/space_groups/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/spaceGroups.ts) |
| `spaceGroups.update(id: number, options: RequestOptionsWithBody<"/api/admin/v2/space_groups/{id}", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/spaceGroups.ts) |
| `spaceGroups.delete(id: number, options?: RequestOptions<"/api/admin/v2/space_groups/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/spaceGroups.ts) |
| `spaceGroupMembers.list(options: RequestOptions<"/api/admin/v2/space_group_members", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/spaceGroupMembers.ts) |
| `spaceGroupMembers.create(options: RequestOptionsWithBody<"/api/admin/v2/space_group_members", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/spaceGroupMembers.ts) |
| `spaceGroupMembers.delete(options: RequestOptions<"/api/admin/v2/space_group_members", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/spaceGroupMembers.ts) |
| `spaceGroupMembers.get(options: RequestOptions<"/api/admin/v2/space_group_member", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/spaceGroupMembers.ts) |
| `spaceMembers.list(options: RequestOptions<"/api/admin/v2/space_members", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/spaceMembers.ts) |
| `spaceMembers.add(options: RequestOptionsWithBody<"/api/admin/v2/space_members", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/spaceMembers.ts) |
| `spaceMembers.remove(options: RequestOptions<"/api/admin/v2/space_members", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/spaceMembers.ts) |
| `spaceMembers.get(options: RequestOptions<"/api/admin/v2/space_member", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/spaceMembers.ts) |
| `spaces.list(options?: RequestOptions<"/api/admin/v2/spaces", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/spaces.ts) |
| `spaces.create(options: RequestOptionsWithBody<"/api/admin/v2/spaces", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/spaces.ts) |
| `spaces.get(id: number, options?: RequestOptions<"/api/admin/v2/spaces/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/spaces.ts) |
| `spaces.update(id: number, options: RequestOptionsWithBody<"/api/admin/v2/spaces/{id}", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/spaces.ts) |
| `spaces.delete(id: number, options?: RequestOptions<"/api/admin/v2/spaces/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/spaces.ts) |
| `spaces.aiSummary(spaceId: number, options?: RequestOptions<"/api/admin/v2/spaces/{space_id}/ai_summaries", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/spaces.ts) |
| `taggedMembers.list(options?: RequestOptions<"/api/admin/v2/tagged_members", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/taggedMembers.ts) |
| `taggedMembers.create(options: RequestOptionsWithBody<"/api/admin/v2/tagged_members", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/taggedMembers.ts) |
| `taggedMembers.delete(options: RequestOptions<"/api/admin/v2/tagged_members", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/taggedMembers.ts) |
| `taggedMembers.get(id: string, options?: RequestOptions<"/api/admin/v2/tagged_members/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/taggedMembers.ts) |
| `taxSettings.get(options?: RequestOptions<"/api/admin/v2/tax_setting", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/taxSettings.ts) |
| `taxSettings.update(options?: RequestOptions<"/api/admin/v2/tax_setting", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/taxSettings.ts) |
| `topics.list(options?: RequestOptions<"/api/admin/v2/topics", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/topics.ts) |
| `topics.create(options: RequestOptionsWithBody<"/api/admin/v2/topics", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/topics.ts) |
| `topics.get(id: number, options?: RequestOptions<"/api/admin/v2/topics/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/topics.ts) |
| `topics.update(id: number, options: RequestOptionsWithBody<"/api/admin/v2/topics/{id}", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/topics.ts) |
| `topics.delete(id: number, options?: RequestOptions<"/api/admin/v2/topics/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/topics.ts) |
| `workflows.list(options?: RequestOptions<"/api/admin/v2/workflows", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/workflows.ts) |
| `workflows.get(id: string, options?: RequestOptions<"/api/admin/v2/workflows/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/workflows.ts) |
| `workflows.activate(id: string, options?: RequestOptions<"/api/admin/v2/workflows/{id}/activate", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/workflows.ts) |
| `workflows.deactivate(id: string, options?: RequestOptions<"/api/admin/v2/workflows/{id}/deactivate", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/workflows.ts) |
| `workflows.duplicate(id: string, options?: RequestOptions<"/api/admin/v2/workflows/{id}/duplicate", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/adminApi/resources/workflows.ts) |

### HeadlessApi

| Call | Definition |
| --- | --- |
| `iter.communityMembers(options?: MemberOptions)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/cursorIterators.ts) |
| `iter.communityMemberSearch(options: SearchOptions)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/cursorIterators.ts) |
| `iter.chatRoomMessages(chatRoomUuid: string, options?: ChatRoomMessagesIteratorOptions)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/cursorIterators.ts) |
| `iter.advancedSearch(options: Options<"/api/headless/v1/advanced_search">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.bookmarks(options?: Options<"/api/headless/v1/bookmarks">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.chatRoomParticipants(chatRoomUuid: string, options?: Options<"/api/headless/v1/messages/{chat_room_uuid}/chat_room_participants">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.chatRooms(options?: Options<"/api/headless/v1/messages">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.chatThreads(options?: Options<"/api/headless/v1/chat_threads">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.postComments(postId: number, options?: Options<"/api/headless/v1/posts/{post_id}/comments">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.events(options?: Options<"/api/headless/v1/community_events">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.memberComments(communityMemberId: number, options?: Options<"/api/headless/v1/community_members/{community_member_id}/comments">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.memberPosts(communityMemberId: number, options?: Options<"/api/headless/v1/community_members/{community_member_id}/posts">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.memberSpaces(communityMemberId: number, options?: Options<"/api/headless/v1/community_members/{community_member_id}/spaces">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.lessonFiles(courseId: number, lessonId: number, options?: Options<"/api/headless/v1/courses/{course_id}/lessons/{lesson_id}/files">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.quizAttempts(courseId: number, options?: Options<"/api/headless/v1/courses/{course_id}/quiz_attempts">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.courseTopics(options?: Options<"/api/headless/v1/course_topics">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.eventAttendees(eventId: number, options?: Options<"/api/headless/v1/events/{event_id}/event_attendees">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.home(options?: Options<"/api/headless/v1/home">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.notifications(options?: Options<"/api/headless/v1/notifications">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.pageProfileFields(options: Options<"/api/headless/v1/page_profile_fields">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.posts(spaceId: number, options?: Options<"/api/headless/v1/spaces/{space_id}/posts">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.recurringEvents(spaceId: number, eventId: number, options?: Options<"/api/headless/v1/spaces/{space_id}/events/{event_id}/recurring_events">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.commentReplies(commentId: number, options?: Options<"/api/headless/v1/comments/{comment_id}/replies">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.search(options: Options<"/api/headless/v1/search">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.spaceBookmarks(spaceId: number, options?: Options<"/api/headless/v1/spaces/{space_id}/bookmarks">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.spaceTopics(spaceId: number, options?: Options<"/api/headless/v1/spaces/{space_id}/topics">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.commentLikes(commentId: number, options?: Options<"/api/headless/v1/comments/{comment_id}/user_likes">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `iter.postLikes(postId: string, options?: Options<"/api/headless/v1/posts/{post_id}/user_likes">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/iterators.ts) |
| `search.query(options: RequestOptions<"/api/headless/v1/search", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/search.ts) |
| `search.advanced(options: RequestOptions<"/api/headless/v1/advanced_search", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/search.ts) |
| `bookmarks.list(options?: RequestOptions<"/api/headless/v1/bookmarks", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/bookmarks.ts) |
| `bookmarks.create(options: RequestOptionsWithBody<"/api/headless/v1/bookmarks", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/bookmarks.ts) |
| `bookmarks.delete(id: number, options?: RequestOptions<"/api/headless/v1/bookmarks/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/bookmarks.ts) |
| `chatRooms.list(options?: RequestOptions<"/api/headless/v1/messages", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/chatRooms.ts) |
| `chatRooms.create(options: RequestOptionsWithBody<"/api/headless/v1/messages", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/chatRooms.ts) |
| `chatRooms.get(uuid: string, options?: RequestOptions<"/api/headless/v1/messages/{uuid}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/chatRooms.ts) |
| `chatRooms.markAllAsRead(uuid: string, options?: RequestOptions<"/api/headless/v1/messages/{uuid}/mark_all_as_read", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/chatRooms.ts) |
| `chatRooms.unread(options?: RequestOptions<"/api/headless/v1/messages/unread_chat_rooms", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/chatRooms.ts) |
| `chatRooms.messages.list(chatRoomUuid: string, options?: RequestOptions< "/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages", "get" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/chatRooms.ts) |
| `chatRooms.messages.create(chatRoomUuid: string, options: RequestOptionsWithBody< "/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages", "post" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/chatRooms.ts) |
| `chatRooms.messages.get(chatRoomUuid: string, id: string, options?: RequestOptions< "/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages/{id}", "get" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/chatRooms.ts) |
| `chatRooms.messages.update(chatRoomUuid: string, id: string, options: RequestOptionsWithBody< "/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages/{id}", "put" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/chatRooms.ts) |
| `chatRooms.messages.delete(chatRoomUuid: string, id: string, options?: RequestOptions< "/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages/{id}", "delete" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/chatRooms.ts) |
| `chatRooms.participants.list(chatRoomUuid: string, options?: RequestOptions< "/api/headless/v1/messages/{chat_room_uuid}/chat_room_participants", "get" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/chatRooms.ts) |
| `chatRooms.participants.update(chatRoomUuid: string, id: string, options: RequestOptionsWithBody< "/api/headless/v1/messages/{chat_room_uuid}/chat_room_participants/{id}", "put" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/chatRooms.ts) |
| `chatRooms.reactions.create(options: RequestOptionsWithBody<"/api/headless/v1/reactions", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/chatRooms.ts) |
| `chatRooms.reactions.delete(options: RequestOptionsWithBody<"/api/headless/v1/reactions", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/chatRooms.ts) |
| `chatThreads.list(options?: RequestOptions<"/api/headless/v1/chat_threads", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/chatThreads.ts) |
| `chatThreads.get(id: string, options?: RequestOptions<"/api/headless/v1/chat_threads/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/chatThreads.ts) |
| `chatThreads.unread(options?: RequestOptions<"/api/headless/v1/chat_threads/unread_chat_threads", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/chatThreads.ts) |
| `comments.list(postId: number, options?: RequestOptions<"/api/headless/v1/posts/{post_id}/comments", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/comments.ts) |
| `comments.create(postId: number, options: RequestOptionsWithBody<"/api/headless/v1/posts/{post_id}/comments", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/comments.ts) |
| `comments.get(postId: number, id: number, options?: RequestOptions<"/api/headless/v1/posts/{post_id}/comments/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/comments.ts) |
| `comments.update(postId: number, id: number, options: RequestOptionsWithBody<"/api/headless/v1/posts/{post_id}/comments/{id}", "patch">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/comments.ts) |
| `comments.delete(postId: number, id: number, options?: RequestOptions<"/api/headless/v1/posts/{post_id}/comments/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/comments.ts) |
| `comments.replies.list(commentId: number, options?: RequestOptions<"/api/headless/v1/comments/{comment_id}/replies", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/comments.ts) |
| `comments.replies.create(commentId: string, options: RequestOptionsWithBody<"/api/headless/v1/comments/{comment_id}/replies", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/comments.ts) |
| `comments.replies.get(commentId: string, id: string, options?: RequestOptions<"/api/headless/v1/comments/{comment_id}/replies/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/comments.ts) |
| `comments.replies.update(commentId: number, id: number, options: RequestOptionsWithBody< "/api/headless/v1/comments/{comment_id}/replies/{id}", "patch" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/comments.ts) |
| `comments.replies.delete(commentId: string, id: string, options?: RequestOptions<"/api/headless/v1/comments/{comment_id}/replies/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/comments.ts) |
| `comments.likes.list(commentId: number &#124; string, options?: RequestOptions<"/api/headless/v1/comments/{comment_id}/user_likes", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/comments.ts) |
| `comments.likes.create(commentId: number &#124; string, options?: RequestOptionsWithBody< "/api/headless/v1/comments/{comment_id}/user_likes", "post" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/comments.ts) |
| `comments.likes.delete(commentId: number &#124; string, options?: RequestOptions<"/api/headless/v1/comments/{comment_id}/user_likes", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/comments.ts) |
| `communityLinks.list(options?: RequestOptions<"/api/headless/v1/community_links", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/communityLinks.ts) |
| `communityMembers.list(options?: RequestOptions<"/api/headless/v1/community_members", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/communityMembers.ts) |
| `communityMembers.current(options?: RequestOptions<"/api/headless/v1/community_member", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/communityMembers.ts) |
| `communityMembers.deactivate(options?: RequestOptions<"/api/headless/v1/community_member/deactivate", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/communityMembers.ts) |
| `communityMembers.posts(communityMemberId: number, options?: RequestOptions< "/api/headless/v1/community_members/{community_member_id}/posts", "get" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/communityMembers.ts) |
| `communityMembers.comments(communityMemberId: number, options?: RequestOptions< "/api/headless/v1/community_members/{community_member_id}/comments", "get" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/communityMembers.ts) |
| `communityMembers.spaces(communityMemberId: number, options?: RequestOptions< "/api/headless/v1/community_members/{community_member_id}/spaces", "get" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/communityMembers.ts) |
| `communityMembers.publicProfile(communityMemberId: number, options?: RequestOptions< "/api/headless/v1/community_members/{community_member_id}/public_profile", "get" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/communityMembers.ts) |
| `communityMembers.updateProfile(options: RequestOptionsWithBody<"/api/headless/v1/profile", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/communityMembers.ts) |
| `communityMembers.confirmProfile(options: RequestOptionsWithBody<"/api/headless/v1/signup/profile", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/communityMembers.ts) |
| `communityMembers.search(options: RequestOptionsWithBody<"/api/headless/v1/search/community_members", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/communityMembers.ts) |
| `cookies.create(options?: RequestOptionsWithBody<"/api/headless/v1/cookies", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/cookies.ts) |
| `cookies.createWithResponse(options?: RequestOptionsWithBody<"/api/headless/v1/cookies", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/cookies.ts) |
| `cookies.delete(options?: RequestOptionsWithBody<"/api/headless/v1/cookies", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/cookies.ts) |
| `cookies.deleteWithResponse(options?: RequestOptionsWithBody<"/api/headless/v1/cookies", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/cookies.ts) |
| `courses.sections.list(courseId: number, options?: RequestOptions<"/api/headless/v1/courses/{course_id}/sections", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/courses.ts) |
| `courses.lessons.get(courseId: number, id: number, options?: RequestOptions<"/api/headless/v1/courses/{course_id}/lessons/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/courses.ts) |
| `courses.lessons.files(courseId: number, lessonId: number, options?: RequestOptions< "/api/headless/v1/courses/{course_id}/lessons/{lesson_id}/files", "get" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/courses.ts) |
| `courses.lessons.updateProgress(courseId: number, lessonId: number, options: RequestOptionsWithBody< "/api/headless/v1/courses/{course_id}/lessons/{lesson_id}/progress", "patch" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/courses.ts) |
| `courses.topics.list(options?: RequestOptions<"/api/headless/v1/course_topics", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/courses.ts) |
| `courses.quizAttempts.list(courseId: number, options?: RequestOptions<"/api/headless/v1/courses/{course_id}/quiz_attempts", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/courses.ts) |
| `directUploads.create(options: RequestOptionsWithBody<"/api/headless/v1/direct_uploads", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/directUploads.ts) |
| `directUploads.upload(input: DirectUploadInput, options: HeadlessDirectUploadOptions)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/directUploads.ts) |
| `events.list(options?: RequestOptions<"/api/headless/v1/community_events", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/events.ts) |
| `events.attendees.list(eventId: number, options?: RequestOptions<"/api/headless/v1/events/{event_id}/event_attendees", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/events.ts) |
| `events.attendees.create(eventId: number, options?: RequestOptionsWithBody< "/api/headless/v1/events/{event_id}/event_attendees", "post" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/events.ts) |
| `events.attendees.delete(eventId: number, options?: RequestOptions<"/api/headless/v1/events/{event_id}/event_attendees", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/events.ts) |
| `events.recurring.list(spaceId: number, eventId: number, options?: RequestOptions< "/api/headless/v1/spaces/{space_id}/events/{event_id}/recurring_events", "get" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/events.ts) |
| `events.recurring.rsvp(spaceId: number, eventId: number, options: RequestOptionsWithBody< "/api/headless/v1/spaces/{space_id}/events/{event_id}/recurring_events/rsvp", "put" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/events.ts) |
| `flaggedContents.create(options: RequestOptionsWithBody<"/api/headless/v1/flagged_contents", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/flaggedContents.ts) |
| `home.list(options?: RequestOptions<"/api/headless/v1/home", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/home.ts) |
| `invitationLinks.join(token: string, options?: RequestOptionsWithBody<"/api/headless/v1/invitation_links/{token}/join", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/invitationLinks.ts) |
| `liveStreams.createRoom(options?: RequestOptionsWithBody<"/api/headless/v1/live_streams/rooms", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/liveStreams.ts) |
| `notificationPreferences.get(medium: NotificationPreferenceMedium, options?: RequestOptions<"/api/headless/v1/notification_preferences/{medium}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/notificationPreferences.ts) |
| `notificationPreferences.update(medium: NotificationPreferenceMedium, options: RequestOptionsWithBody<"/api/headless/v1/notification_preferences/{medium}", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/notificationPreferences.ts) |
| `notificationPreferences.getForSpaceMember(id: number, options?: RequestOptions< "/api/headless/v1/notification_preferences/space_members/{id}", "get" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/notificationPreferences.ts) |
| `notificationPreferences.updateForSpaces(medium: NotificationPreferenceMedium, options: RequestOptionsWithBody< "/api/headless/v1/notification_preferences/{notification_preference_medium}/spaces", "put" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/notificationPreferences.ts) |
| `notificationPreferences.updateForSpace(medium: NotificationPreferenceMedium, id: number, options: RequestOptionsWithBody< "/api/headless/v1/notification_preferences/{notification_preference_medium}/spaces/{id}", "put" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/notificationPreferences.ts) |
| `notifications.list(options?: RequestOptions<"/api/headless/v1/notifications", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/notifications.ts) |
| `notifications.markAllAsRead(options?: RequestOptions<"/api/headless/v1/notifications/mark_all_as_read", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/notifications.ts) |
| `notifications.markAsRead(id: number, options?: RequestOptions<"/api/headless/v1/notifications/{id}/mark_as_read", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/notifications.ts) |
| `notifications.archive(id: number, options?: RequestOptions<"/api/headless/v1/notifications/{id}/archive", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/notifications.ts) |
| `notifications.delete(id: number, options?: RequestOptions<"/api/headless/v1/notifications/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/notifications.ts) |
| `notifications.newCount(options?: RequestOptions<"/api/headless/v1/notifications/new_notifications_count", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/notifications.ts) |
| `notifications.resetNewCount(options?: RequestOptions< "/api/headless/v1/notifications/reset_new_notifications_count", "post" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/notifications.ts) |
| `pageProfileFields.list(options: RequestOptions<"/api/headless/v1/page_profile_fields", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/pageProfileFields.ts) |
| `posts.list(spaceId: number, options?: RequestOptions<"/api/headless/v1/spaces/{space_id}/posts", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/posts.ts) |
| `posts.create(spaceId: number, options: RequestOptionsWithBody<"/api/headless/v1/spaces/{space_id}/posts", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/posts.ts) |
| `posts.get(spaceId: number, id: number, options?: RequestOptions<"/api/headless/v1/spaces/{space_id}/posts/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/posts.ts) |
| `posts.delete(spaceId: number, id: number, options?: RequestOptions<"/api/headless/v1/spaces/{space_id}/posts/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/posts.ts) |
| `posts.images.create(spaceId: number, options: RequestOptionsWithBody<"/api/headless/v1/spaces/{space_id}/images/posts", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/posts.ts) |
| `posts.images.update(spaceId: number, id: number, options: RequestOptionsWithBody< "/api/headless/v1/spaces/{space_id}/images/posts/{id}", "put" >)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/posts.ts) |
| `posts.followers.follow(postId: number, options?: RequestOptions<"/api/headless/v1/posts/{post_id}/post_followers", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/posts.ts) |
| `posts.followers.unfollow(postId: string, options?: RequestOptions<"/api/headless/v1/posts/{post_id}/post_followers", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/posts.ts) |
| `posts.followers.remove(postId: number, id: number, options?: RequestOptions<"/api/headless/v1/posts/{post_id}/post_followers/{id}", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/posts.ts) |
| `posts.likes.list(postId: string, options?: RequestOptions<"/api/headless/v1/posts/{post_id}/user_likes", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/posts.ts) |
| `posts.likes.create(postId: string, options?: RequestOptionsWithBody<"/api/headless/v1/posts/{post_id}/user_likes", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/posts.ts) |
| `posts.likes.delete(postId: string, options?: RequestOptions<"/api/headless/v1/posts/{post_id}/user_likes", "delete">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/posts.ts) |
| `quizzes.attempts.create(quizId: number, options: RequestOptionsWithBody<"/api/headless/v1/quizzes/{quiz_id}/attempts", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/quizzes.ts) |
| `quizzes.attempts.get(quizId: number, id: number, options?: RequestOptions<"/api/headless/v1/quizzes/{quiz_id}/attempts/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/quizzes.ts) |
| `quizzes.attempts.update(quizId: number, id: number, options: RequestOptionsWithBody<"/api/headless/v1/quizzes/{quiz_id}/attempts/{id}", "put">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/quizzes.ts) |
| `spaceMembers.markAsRead(id: number, options?: RequestOptions<"/api/headless/v1/space_members/{id}/mark_as_read", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/spaceMembers.ts) |
| `spaces.list(options?: RequestOptions<"/api/headless/v1/spaces", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/spaces.ts) |
| `spaces.get(id: number, options?: RequestOptions<"/api/headless/v1/spaces/{id}", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/spaces.ts) |
| `spaces.join(id: number, options?: RequestOptions<"/api/headless/v1/spaces/{id}/join", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/spaces.ts) |
| `spaces.leave(id: number, options?: RequestOptions<"/api/headless/v1/spaces/{id}/leave", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/spaces.ts) |
| `spaces.home(options?: RequestOptions<"/api/headless/v1/spaces/home", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/spaces.ts) |
| `spaces.topics(spaceId: number, options?: RequestOptions<"/api/headless/v1/spaces/{space_id}/topics", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/spaces.ts) |
| `spaces.bookmarks(spaceId: number, options?: RequestOptions<"/api/headless/v1/spaces/{space_id}/bookmarks", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/spaces.ts) |
| `spaces.notificationDetails(options?: RequestOptions<"/api/headless/v1/space_notification_details", "get">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/headlessApi/resources/spaces.ts) |

### AuthApi

| Call | Definition |
| --- | --- |
| `accessToken.refresh(options: RequestOptionsWithBody<"/api/v1/headless/access_token/refresh", "patch">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/authApi/resources/accessToken.ts) |
| `accessToken.revoke(options: RequestOptionsWithBody<"/api/v1/headless/access_token/revoke", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/authApi/resources/accessToken.ts) |
| `authToken.create(options: RequestOptionsWithBody<"/api/v1/headless/auth_token", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/authApi/resources/authToken.ts) |
| `refreshToken.revoke(options: RequestOptionsWithBody<"/api/v1/headless/refresh_token/revoke", "post">)` | [declaration](https://github.com/atomimus/circleso/blob/main/src/authApi/resources/refreshToken.ts) |
