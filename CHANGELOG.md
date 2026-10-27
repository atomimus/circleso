# Changelog

## Unreleased

## 1.0.0-rc.1 (prepared, not published)

- Prepare an immutable CI tarball, inventory and source/digest evidence; add manually
  dispatched OIDC publishing with provenance and isolated artifact qualification.
  Disable directory-publish regeneration. No release or npm publication has occurred.
- Reconcile the official Admin spec: accept German community locale (`de`) and its
  best-effort attendee/cohost invitation clarification. Member/Auth specs remain identical.

- Patch affected development dependencies, enable verified private vulnerability reporting,
  ship SECURITY.md, document reviewed security/maintenance boundaries, and measure installed
  workflows/compiler cost with package and browser size regression budgets.

- Add real-browser/worker/CORS/cookie/upload acceptance from installed tarballs, composed
  ESM/CJS applications across the compiler/runtime matrix, and explicitly scoped manual
  live integration with owned disposable fixtures. Preserve native finite request bodies,
  SDK cancellation identity through browser body-error translation and empty 204 streams.

- Add the complete v1 public API/call-shape reference, migration from the actual published
  0.3.0 artifact, support and release-maintenance guidance, and environment-driven workflow
  recipes. Ship public guides in the tarball; permanently check all public Markdown links,
  reference drift, every TypeScript snippet/example and installed synthetic workflows.

- Add opt-in per-client `usage` controls for bounded queues/concurrency, rolling attempt
  budgets and circuit recovery, sharing admission with retries and single-flight refresh.
  Keep defaults unchanged; document and test an explicit isolated server read-cache recipe.

- Add typed cookie `createWithResponse`/`deleteWithResponse` metadata and a validated
  `createSessionCookiesUrl` helper from root/Headless. Document complete token/cookie
  workflows, shared-refresh revocation scope and browser/server boundaries; include
  a runnable synthetic fixture without live credentials or session changes.

- Add `richText` types/builders for common Circle content and signed attachments, plus
  an explicit JSON escape hatch. Extend only named-facade rich-text request fields
  where shallow/object-only specs omit documented content; preserve raw generated types.

- Add Admin/Member `directUploads.upload` for bounded file preparation, base64 MD5,
  Circle registration and isolated signed storage PUTs with cancellation and deadlines.
  Preserve `create`; document supported inputs, storage headers and failure recovery.

- Add cancelable pagination with exact/zero caps, cursor-cycle detection and 62 typed
  Admin/Member iterator adapters. Preserve chat ID windows and existing helpers; document
  page limits, non-paged collections and the POST search cursor schema conflict.

- Complete the Admin facade with 13 operations for leads, contact notes, payment-method
  preferences, tax/Connect settings, live rooms/transcripts, location search and historical
  chat imports. Inventory: 172/172 Admin, 102/102 Member, 4/4 Auth. Keep import success
  unknown while its upstream schema is missing; document opaque rich-text inputs.

- Add 11 typed Admin workflow and directory-filter operations via `workflows` and
  `filterKit`. Preserve polymorphic configuration payloads, saved-control visibility
  and scope, optional PATCH bodies and the distinction from member search predicates.

- Add 15 typed Admin operations for paywalls, subscription groups, coupon deletion,
  affiliates and affiliate payouts, preserving raw clients and invitation links.
  Document irreversible offer deletion, scheduled access syncs, payout scope JSON,
  replacement-list semantics, eligibility errors and shared retry behavior.

- Add typed Admin `communityMemberCharges` list/export/refund and
  `communityMemberSubscriptions` list/export/cancel/resume/changeBillingDate resources,
  including trial extensions through the billing-date operation. Preserve query-only
  export filters, official response schemas and safe POST/PATCH retry defaults.

Specs synced from Circle's official endpoints on October 27, 2026. Existing resource names,
flat options, client factories, and npm entry points are retained.

### Updated API contracts

- Admin member lists accept `status: "active"` and `member_tag_ids` filters. Tagged member lists also
  accept `member_tag_ids`; both filters serialize as comma-separated values.
- Admin posts no longer require an HTML `body`. Messages can target `chat_room_uuid` and include
  `parent_message_id`. Community members support `member_since` updates.
- Admin lessons accept rich text, featured media, and thumbnails. Course settings include the
  `practice` lesson label, thumbnail visibility, and updated course type and draft settings.
- Admin and Headless moderation support chat messages, connections, and `child_safety` reports.
- Headless post and comment `likes.create` methods accept `reaction_type`; `likes.list` can filter by
  reaction type. Responses include reaction summaries and each reacting member's reaction type.
- Headless chat reactions accept `unicode` as an alternative to legacy `emoji` shortcodes.
  Circle rejects requests that supply both. Chat messages expose moderation permissions and state.
- Response types include the latest lesson thumbnails, deleted profiles, event metadata, invitation
  access groups and paywalls, and nullable member headlines.
- Headless Auth request and response contracts are unchanged.

### Added to existing resources

- `admin.accessGroups.content.update(accessGroupId, options)` replaces space and space group
  assignments. Omitted lists and empty lists remove the corresponding assignments.
- `admin.courses.lessons.reorder(options)` sets the final section and lesson order.
- `admin.forms.submissions.list(formId, options)` and `.create(formId, options)`.
- `admin.posts.images.list(spaceId, options)` and `.get(spaceId, id, options)`.
- `admin.invitationLinks.create(options)` and `.update(id, options)`.
- `admin.profileFields.create(options)`, `.update(id, options)`, and `.delete(id, options)`.

The operation inventory now maps every specified operation to a named facade and raw client;
upstream untyped success schemas remain listed separately.

### Fixes

- Select ESM/CJS declarations separately for every public entry point, fixing Node16 `.cts`
  TS1479/TS1541 diagnostics. Emit portable named response type imports and remove impossible
  internal Auth GET/PUT/DELETE helpers so installed declarations pass strict checking without
  `skipLibCheck`. Preserve the generated raw client and all four specified Auth operations.
- Share error constructors across root/subpath imports and requires, preserving mixed-entry
  `instanceof` checks. Clean stale build outputs and verify shipped source maps and package files.
- Preserve empty/null-body responses (including 204/205) with body logging enabled. Keep actual
  response metadata and body readability intact; give hooks detached, conservative snapshots.
  Redact opaque headers, URL arguments/query strings, JSON strings and credential subtrees;
  omit unsafe payloads and raw error causes. Bound opt-in inspection by bytes, time and reads.
- Await logger hooks and wrap synchronous/asynchronous failures in `CircleConfigError` with the
  original cause. Migration: logger contexts no longer expose raw `params`/`options` or raw error
  properties; header values and body strings are redacted more broadly. See README logging policy.
- Default every client to `https://app.circle.so` independently of `communityHost`; use that
  option only for Admin's Host header. Migration: set `baseUrl` explicitly if you previously
  relied on `communityHost` selecting the destination. Validate URLs, hosts, credentials,
  hooks, conflicting member token aliases, fetchers and deadlines before use. Preserve token
  hook causes and support independent Auth URL prefixes for auto-refresh.
- Require a custom server fetcher that preserves Host when Admin's `communityHost` differs
  from its destination authority. Default/native Fetch removes Host overrides, so mismatched
  configurations now fail early with transport/proxy guidance.
- Reject Admin, Headless Auth application-token clients, and built-in auto-refresh in browser
  windows and workers. Use a standalone Member factory with member tokens and server-backed
  token rotation there. The unified client remains server-only. Retain Admin Token auth per
  the specification and repository policy; document Circle's conflicting Bearer quick start.
- Route named-resource fields from generated operation contracts rather than HTTP verbs. Send
  segment duplicate/export and notification update fields in query, retain body-bearing DELETE,
  and serialize required empty JSON as `{}`. Forward headers/signals/credentials as metadata;
  fix tuple header forwarding in named and raw clients. Reject unknown/ambiguous schema fields.
- Single-flight Headless recovery by token generation, including late unauthorized responses and
  failure fan-out. Refresh only HTTP 401, replay each original once with bounded upload bytes,
  preserve refresh-call error context, and bound/cancel token-hook waiting without aborting other
  waiters. Treat caller token storage as authoritative and never retry the refresh PATCH.
- Require a separate Headless Auth application `authToken` for auto-refresh, matching Circle's
  Auth SDK. Send the member refresh token only in JSON; missing `authToken` now fails early with
  `CircleConfigError`. Keep this credential server-side; update existing auto-refresh configs.
- Retry serialized JSON PUT/DELETE requests through public clients using bounded byte snapshots.
  Keep unknown streams single-attempt and offer an explicit per-call smart-fetch body factory.
  Validate retry options, cap jittered backoff, honor Retry-After dates/seconds and stop retries
  when a server delay exceeds the configured cap. Preserve cancellation and per-attempt deadlines.
- Centralize response parsing across resources, raw clients, generic helpers and iterators.
  Detect HTTP failures by status even for empty/false/null bodies, retain exact error text and
  nested payloads, and expose original parsing/read causes with request/response context.
- Return `undefined` for empty successful JSON and 205 responses. Normalize malformed successful
  JSON and consumed/unreadable bodies into SDK errors; retain the raw `{data,error,response}`
  contract, explicit parse modes, and cancellation/deadline error identity.
- Honor caller cancellation through Admin, Headless and Auth resources, including pre-aborted
  calls and retry waits. Preserve the original abort reason as `CircleNetworkError.cause`.
- Keep each `timeoutMs` deadline active through response body reads. Release timers, signal
  listeners and discarded bodies; expose deadline causes on `CircleTimeoutError`. Raw stream
  consumers own consumption/cancellation, and retry waits remain outside the per-attempt budget.
- Infer optional query parameters correctly so pagination and filters retain their generated types.
- Send chat reaction and Admin event attendee deletion fields in JSON bodies, while keeping
  query-based deletion endpoints unchanged.
- Retain Circle's parsed validation error bodies in `CircleHttpError` across all resource clients.
- Keep regeneration working despite Circle's missing Admin chat import response schema. A narrow
  generation-only override leaves that response `unknown`, preserves the downloaded spec, and
  defers to the official schema once it exists. Other unresolved references still fail generation.

### Development tooling

- Qualify actual tarballs in isolated production consumers: all ESM/CJS entries, native Fetch,
  strict TypeScript 5.9.3/7.0.2 with Node16/NodeNext/Bundler, browser bundling/tree shaking,
  source maps, and compiled documentation/examples. CI runs this gate on Node 22/24 Linux and
  Node 24 Windows/macOS. Pin compiler binaries independently so the current compiler does not
  replace the minimum compiler used by source tooling.
- Consolidate spec sources, validate complete download/generation batches before replacement, and
  preserve prior outputs on handled failures. Pin LF input/output bytes across checkouts.
- Add offline `gen:check` and `coverage:check`, plus a reproducible method/path-to-wrapper inventory.
- Add deliberate `spec:check` with candidate files and unified diffs; it does not accept upstream
  changes. Existing `spec:sync` and `gen:types` commands remain available.

### Type migration notes

These upstream contract changes and stricter query typing can break consumer compilation. Publish
them with a major version bump under this repository's compatibility policy.

- Upgrade to a maintained patch of Node 22 or 24. The unreleased engine range now excludes
  Node 18/20 and unqualified majors; builds target ES2022 and development Node types follow
  Node 22. TypeScript 5.9.3 is the supported minimum. This is a v1 compatibility change, not
  a support claim for the already published 0.3.0 artifact. Candidate qualification begins at 1.0.0-rc.1.
- Supply required query options for the previously optional wrappers, and body options for
  Headless reaction deletion, direct uploads and moderation. Notification update query fields
  now have their documented types. Generated Auth identity/Admin message recipient alternatives
  retain required fields instead of collapsing to unknown. Schema fields stay flat unless they
  overlap query/body locations or reserved metadata: use explicit `queryParams`/`bodyParams`
  scopes for those collisions. See [request options](https://github.com/atomimus/circleso/blob/main/docs/request-options.md),
  including exact optional fields and the existing nested `deepObject` query limitation.
- Headless community event responses now expose `meta.sort` and `meta.events_directory_layout`
  instead of top-level `sort`. `meta` and post/comment `reaction_summary` are required by the spec.
- Remove `exclude_empty_profiles` from Headless member searches.
- Remove `browser_notifications_enabled` from Admin community settings and `lock_screen_blocks`
  from Admin space create/update bodies.
- Admin forms no longer expose `orientation`, `background_color`, or `text_color` in their form
  and update schemas. Form element children now use the upstream generic object schema.
- Account for nullable member headlines and the updated member, invitation, and event schemas.
- Unsupported query fields are now reported by TypeScript instead of being accepted through the
  previous broad options type.

Sources: [Admin V2](https://api-headless.circle.so/api/admin/v2/swagger.yaml),
[Headless Member V1](https://api-headless.circle.so/api/headless_client/v1/swagger.yaml), and
[Headless Auth](https://api-headless.circle.so/api/headless_auth/swagger.yaml).
