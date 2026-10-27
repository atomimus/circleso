# Changelog

## Unreleased

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

Other newly documented API families are available through the generated raw clients; this update
does not add new top-level resource families.

### Fixes

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

- Consolidate spec sources, validate complete download/generation batches before replacement, and
  preserve prior outputs on handled failures. Pin LF input/output bytes across checkouts.
- Add offline `gen:check` and `coverage:check`, plus a reproducible method/path-to-wrapper inventory.
- Add deliberate `spec:check` with candidate files and unified diffs; it does not accept upstream
  changes. Existing `spec:sync` and `gen:types` commands remain available.

### Type migration notes

These upstream contract changes and stricter query typing can break consumer compilation. Publish
them with a major version bump under this repository's compatibility policy.

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
