# Request options and serialization

Named resources keep schema fields flat. Their types combine the operation's query and JSON
body fields, regardless of HTTP method. Path IDs remain positional resource arguments. Raw
clients keep openapi-fetch's `params.path`, `params.query`, and `body` shape.

```ts
import { createAdmin } from "circleso/admin";

const admin = createAdmin({ token: process.env.CIRCLE_ADMIN_TOKEN ?? "" });
await admin.communitySegments.duplicate("segment-id", { title: "Copy" });
await admin.accessGroups.content.update(1, {});
await admin.spaceMembers.list({ space_id: 1, page: 2 });
```

Segment duplication sends `title` in the query with no JSON body. Access-group content replacement
requires JSON even when both lists are omitted: `{}` removes the assignments. Empty arrays remain
JSON arrays. Optional absent bodies, such as an unqualified post like, remain absent.
Notification preference updates send `type`/`enabled` or `choice` in the query. Event attendee
and chat reaction deletions send JSON; member removals keep their documented query fields.

## Metadata and collisions

The named-resource metadata options are `headers: HeadersInit`, `signal: AbortSignal`, and
`credentials: "omit" | "same-origin" | "include"`. They are forwarded as fetch options and never
become schema fields. Headers support objects, `Headers`, and arrays of name/value pairs. A caller
signal covers the request and its retries. Credentials affect cookie handling according to the
runtime; setting them does not bypass browser CORS or host-header restrictions. Use a raw client
for other supported openapi-fetch options, such as `parseAs` or `querySerializer`.

`path`, `headers`, `signal`, `credentials`, `queryParams`, and `bodyParams` are reserved. If a future
schema uses one of these names, put that schema field inside `queryParams` or `bodyParams` according
to its location. If the same field appears in both query and body schemas, both values must use
those explicit locations. The types retain each location's requiredness and value type. Unique
fields stay flat; putting a unique field inside a scope is an error. Existing schema fields named
`query` (search text) and `body` (content) remain flat and keep their meaning.

All three specs checked October 27, 2026 currently have no operation combining query parameters
with a JSON body. The shared routing/type helpers support that combination and test it using a
synthetic contract; this is not a claim about an undocumented Circle endpoint. Untyped callers
receive `CircleConfigError` for unknown flat fields, ambiguous names, or invalid scopes instead of
having fields silently routed to a guessed location. These checks are not full schema validation.

## Arrays, objects and absence

- Ordinary query arrays use repeated keys (`ids=1&ids=2`). Admin `member_tag_ids` uses one
  comma-separated value on community-member and tagged-member lists, for raw and named calls.
- Shallow query objects use `deepObject` (`filters[author_name]=Name`). Values and positional
  path IDs are encoded by openapi-fetch; pass the original ID rather than a pre-encoded ID.
- JSON preserves `null`, nested objects, empty arrays and false/zero/empty-string values.
  Omitted or `undefined` JSON fields are absent. Query `null`/`undefined` and empty arrays are omitted
  by openapi-fetch; false, zero and empty strings are retained.
- With `exactOptionalPropertyTypes`, omit an optional field instead of explicitly assigning
  `undefined`. A nullable schema field still accepts `null`.

Nested arrays/objects inside a `deepObject` query, including `filters.space_ids`, are not supported
by openapi-fetch 0.15.0's default serializer. They fail before fetching with `CircleConfigError`
and the dependency error as `cause`. Circle's specs describe these nested filter values but do not
specify their wire representation; OpenAPI 3.0's `deepObject` rule describes simple object properties.
No array/bracket/comma convention is inferred here. Raw callers can supply a `querySerializer`
for a separately verified server convention. This limitation does not apply to nested JSON bodies.

## Unreleased v1 migration

Required query options can no longer be omitted. Supply the documented fields for Admin advanced
search, community member search, segment duplication, event attendee lists, page profile fields,
space/group member lookups/lists/removals and tagged-member deletion; also for Headless search,
advanced search and page profile fields. Existing required access-group member and event/follower
deletion inputs remain required. Headless notification updates now type their required query fields.

Headless reaction deletion, direct upload creation and moderation creation now require body
options. Auth token creation requires at least one typed identity; Admin message creation requires
a typed recipient and rich text. Required-only `oneOf` alternatives are normalized in memory before
generation to retain these requirements. TypeScript unions do not prove `oneOf` exclusivity or
validate untyped callers. The downloaded specs remain pristine.

Update callers that passed unsupported fields: named resources now reject those fields instead of
serializing them opportunistically. Use raw clients for explicit custom serialization. These public
typing/behavior changes belong to the unreleased major version; the published 0.3.0 is unchanged.

Sources checked October 27, 2026: [Admin V2](https://api-headless.circle.so/api/admin/v2/swagger.yaml),
[Headless Member](https://api-headless.circle.so/api/headless_client/v1/swagger.yaml),
[Auth](https://api-headless.circle.so/api/headless_auth/swagger.yaml),
[OpenAPI 3.0.3](https://spec.openapis.org/oas/v3.0.3.html#parameter-object), and
[openapi-fetch serialization](https://openapi-ts.dev/openapi-fetch/api#queryserializer).
