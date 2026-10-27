# Migrate from 0.3.0 to v1

This guide targets the unreleased v1 source contract. It does not announce a published
v1 or change an installed 0.3.0 package. The baseline is the actual npm 0.3.0 tarball,
checked October 27, 2026 (SHA-512 integrity
`ntpuuyB+NWZDp+kXytv+Dyz2JRjdzX7X76YY59TwmcdZAfk8gvLglzqH9B0r6DPO3ThamHhNryvbMIqtZorSiw==`).
Its engines are `>=18`; the four public entry paths already existed. Keep a lockfile
and test the built local tarball until an actual candidate is published.

## Runtime and imports

Use maintained Node 22 or 24 patches, Fetch globals and TypeScript 5.9.3 or newer.
Node 18/20 and unqualified majors are outside the v1 contract. Builds target ES2022;
TypeScript consumers need DOM/Fetch types. Minimum/current compiler tests use 5.9.3/7.0.2.

Continue using `circleso`, `circleso/admin`, `circleso/headless` and `circleso/auth`.
Conditional exports now select `.d.ts` for ESM and `.d.cts` for CJS, fixing strict
Node16 `.cts` resolution without `skipLibCheck`. Deep imports into `dist`, generated
types and source remain private. Runtime error constructors now share identity across
all entries/formats in one installed copy. Root runtime factories/helpers were already
present in 0.3.0 even where its root declarations omitted them; v1 makes those declarations
complete. See the exhaustive [public exports](api-reference.md#public-exports).

## URLs, credentials and refresh

| Previous reliance | Required v1 adjustment |
| --- | --- |
| `communityHost` selects a destination | Set `baseUrl` explicitly; all defaults are now `https://app.circle.so`. Host controls only Admin's header |
| Different Admin Host with default/native Fetch | Use a verified custom server transport preserving Host, or a supported destination/Host pair. Native Fetch strips overrides; mismatches now throw early |
| Member refresh token alone enables auto-refresh | Also supply server-only Headless Auth application `authToken`. It authenticates PATCH refresh; member `refreshToken` is JSON only |
| Admin/Auth/unified client in a browser or worker | Move to server; browser Member clients use `circleso/headless` with a member access token and application-owned server refresh |
| Conflicting token/accessToken or malformed optional settings | Supply one alias or equal values; fix invalid URLs, hosts, headers, hooks, deadlines and retry bounds before creation |

```ts
import { createHeadless } from "circleso/headless";

const accessToken = process.env.CIRCLE_HEADLESS_TOKEN;
const refreshToken = process.env.CIRCLE_HEADLESS_REFRESH_TOKEN;
const authToken = process.env.CIRCLE_HEADLESS_AUTH_TOKEN;
if (!accessToken || !refreshToken || !authToken) throw new Error("Missing server credentials");
export const member = createHeadless({
  baseUrl: "https://app.circle.so", accessToken, refreshToken, authToken,
  autoRefresh: true, timeoutMs: 10_000,
});
```

401 alone triggers refresh; 403 and text mentioning expiration do not. Recovery is
single-flight per client/token generation, including late 401s and failures. Each original
request replays at most once, with no ordinary retry after replay; refresh PATCH is never
retried. The token getter is authoritative and undefined clears storage. Persist in the
setter before resolving. Hook failures retain causes as config errors. Recovery has an
independent deadline; one canceled waiter does not abort shared work. Create a new client
when the member/community/refresh credentials change. Read the full
[auth and cookie ownership guide](authentication.md) before adapting login/logout.

Admin still sends `Token`, following the official spec despite the conflicting Bearer
quick-start prose; v1 does not guess a fallback auth scheme. Member/Auth still use Bearer.

## Stricter inputs and wire fixes

Required query options can no longer be omitted on Admin advanced/member searches,
segment duplication, attendee lists, page-profile fields, space/group member operations
and tagged-member deletion; likewise Member search/advanced search/page-profile fields.
Reaction deletion, upload registration and moderation require their documented bodies.
Auth token creation requires a typed identity; Admin message creation requires a typed
recipient and rich text. These are compile-time requirements, not full JSON validation
or a proof that a TypeScript oneOf union is exclusive at runtime.

Flat options/resource names are retained. Unknown/ambiguous fields now fail instead of
being silently routed. `headers`, `signal`, `credentials` remain metadata; collisions
use `queryParams`/`bodyParams`. Segment duplicate title/exports and notification updates
are correctly sent as query fields, required empty JSON is `{}`, and body-bearing DELETE
operations retain JSON. Admin member_tag_ids uses comma-separated values. Other arrays
use repeated query keys; shallow objects use deepObject. Nested deepObject arrays/objects
still need a separately verified raw serializer. See [exact request rules](request-options.md).

```ts
import { createAdmin } from "circleso/admin";
const token = process.env.CIRCLE_ADMIN_TOKEN;
if (!token) throw new Error("Missing CIRCLE_ADMIN_TOKEN");
const admin = createAdmin({ token, retries: { retries: 0 }, timeoutMs: 10_000 });
// Invoke mutations only for intended changes. Empty content replacement clears assignments.
export async function duplicateSegment(segmentId: string, title: string) {
  return admin.communitySegments.duplicate(segmentId, { title });
}
export async function clearAccessGroup(accessGroupId: number) {
  return admin.accessGroups.content.update(accessGroupId, {});
}
```

## Upstream field changes

These changes come from the accepted October 27 specs, independent of the SDK reliability
fixes. Recompile consumer reads and writes; do not cast removed inputs back into existence.

| Area | Migration |
| --- | --- |
| Member community events | Read `meta.sort` and `meta.events_directory_layout`; top-level `sort` was removed; `meta` is required |
| Member member search | Remove `exclude_empty_profiles` |
| Admin community settings | Remove `browser_notifications_enabled` |
| Admin space create/update | Remove `lock_screen_blocks` |
| Admin form/update schemas | Remove `orientation`, `background_color`, `text_color`; element children use generic upstream objects |
| Member profiles | Handle nullable headlines and deleted-profile fields |
| Posts/comments/reactions | Required response `reaction_summary`; likes methods accept/filter reaction_type; chat reaction unicode is an alternative to emoji, never both |
| Admin posts/messages/members | HTML post body is no longer required; message recipients include chat_room_uuid/parent_message_id; member_since is writable |
| Lessons/course settings | Accept rich text/media/thumbnails and updated course/draft settings, including practice label and thumbnail visibility |
| Moderation | Includes chat messages/connections and child_safety reports |
| Invitations/events/member responses | Account for updated access-group/paywall/event/member metadata rather than assuming the old shapes |

Headless Auth's four upstream operations are unchanged. The [inventory](api-coverage.md)
lists every accepted method/path and known untyped response. Unknown chat-import success,
other omitted success schemas and nested free-form fields remain unknown. No runtime null
is dropped to fit an overly narrow upstream schema.

## Response, error and logging behavior

Named methods throw for every non-2xx status, including empty/false/null/string errors.
Use `CircleHttpError.status/url/method/requestId/parsedJson/bodyText/cause`.
Malformed success JSON/body transport failures are `CircleNetworkError` with original
evidence; required 204/205 and empty JSON return undefined. Generic `createClient`
parses JSON/+json MIME types and otherwise text. Raw calls preserve the
`{ data, error, response }` contract; use `response.ok`, not truthiness of `error`.
No result unwraps a nested `data` field.

Caller cancellation now reaches requests, body reads and retry waits as
`CircleNetworkError` with the original reason. SDK deadlines use `CircleTimeoutError`
and remain active through body EOF/cancellation. A retry gets a fresh attempt deadline;
there is no built-in total call budget. Consume/cancel streams and every unused clone.

PUT/DELETE finite bodies can now replay on eligible network/status failures. POST/PATCH
still need explicit retryNonIdempotent. Use `retries: { retries: 0 }` for deliberate
mutations and reconcile uncertainty. Retry-After is a lower bound; requests above its
configured wait cap stop retrying. Unknown streams remain single-attempt; smart fetch
offers an explicit per-call bodyFactory. This creates no endpoint idempotency guarantee.

Logger contexts no longer expose raw middleware `params`/`options` or raw error objects.
Use logical `id`/`schemaPath`, redacted snapshots and optional inspected bodies.
Opaque headers, query/path values and JSON strings are redacted broadly; bodies are off
by default and inspection is bounded. Hooks are awaited; failures throw config errors
with cause. Do not replace missing context by logging credentials or full thrown errors.

## Additive workflows

All 278 operations now have named and raw access (172 Admin, 102 Member, four Auth).
Added Admin families include charges/subscriptions, paywalls/groups/coupons/affiliates/
payouts, workflows/filter controls, leads/notes/settings/live rooms/locations/imports.
Existing families add content assignment, lesson ordering, form submissions, image posts,
invitation-link creation/update and profile-field writes.

New bounded [iterators](pagination.md) preserve the existing chat iterator and helpers.
New [direct upload](file-uploads.md) and [rich-text](rich-text.md) helpers are optional.
Cookie metadata methods and the navigation URL helper preserve data-only cookie calls.
Optional [usage controls](usage-controls.md) default off; there is no SDK cache.
None adds UI, a global cookie jar, secret storage, implicit idempotency or undocumented
response schemas. Data API/legacy Admin V1 and real browser/live-community acceptance
remain separate integration work; see [support status](../SUPPORT.md).

Sources: [published npm metadata](https://registry.npmjs.org/circleso/0.3.0),
[0.3.0 artifact](https://registry.npmjs.org/circleso/-/circleso-0.3.0.tgz),
[Admin spec](https://api-headless.circle.so/api/admin/v2/swagger.yaml),
[Member spec](https://api-headless.circle.so/api/headless_client/v1/swagger.yaml),
[Auth spec](https://api-headless.circle.so/api/headless_auth/swagger.yaml).
Checked October 27, 2026 against the actual tarball, committed specs and source.
