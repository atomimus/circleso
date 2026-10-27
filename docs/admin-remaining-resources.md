# Admin contacts, settings, live rooms and imports

These 13 methods complete the named Admin V2 facade. Together with charges/subscriptions,
paywalls/affiliates and workflows/filters, the current inventory is **172/172 Admin**,
**102/102 Member** and **4/4 Auth** operations. Counts measure exposure; schema limitations
remain. See the [generated inventory](api-coverage.md) for every route and untyped success.

Contracts checked October 27, 2026 against the
[official Admin V2 specification](https://api-headless.circle.so/api/admin/v2/swagger.yaml).
All methods use the existing Admin requester, auth middleware and shared networking/errors.
Use a server runtime and the [Admin configuration contract](client-configuration.md#configuration).
Options keep schema fields flat and accept `headers`, `signal` and `credentials` metadata.

## Method reference

Paths below are relative to `/api/admin/v2`. IDs and response fields keep the spec's types.

| Method | HTTP path | Input and success |
| --- | --- | --- |
| `communityLeads.create(options)` | POST `/community_leads` | Required `email`; optional `name`, numeric `member_tag_ids[]`; 201 lead |
| `communityLeads.delete(id, options?)` | DELETE `/community_leads/{id}` | Numeric lead ID; 200 `{ message?: string }` |
| `contactNotes.list(contactId, options?)` | GET `/contacts/{contact_id}/contact_notes` | String ID or sqid; optional `page`; 200 paginated notes |
| `contactNotes.create(contactId, options)` | POST `/contacts/{contact_id}/contact_notes` | String ID or sqid; required `tiptap_body.body`; 201 note |
| `paymentMethodPreferences.get(options?)` | GET `/payment_method_setting` | No API parameters; 200 preference **array** |
| `taxSettings.get(options?)` | GET `/tax_setting` | No API parameters; 200 tax settings |
| `taxSettings.update(options?)` | PUT `/tax_setting` | Optional nested `tax_setting`; 200 tax settings |
| `connectSettings.get(options?)` | GET `/settings/connect` | No API parameters; 200 Connect settings |
| `connectSettings.update(options?)` | PATCH `/settings/connect` | Optional `connect`, `member_directory`, `messaging`; 200 Connect settings |
| `liveRooms.list(options?)` | GET `/live/rooms` | Optional `page`, `per_page`; 200 paginated rooms |
| `liveRooms.transcripts(roomId, options?)` | GET `/live/rooms/{room_id}/transcripts` | Numeric room ID; 200 `{ transcripts: string[] }` |
| `locations.search(options)` | GET `/locations/search` | Required `query` string; 200 `{ results?: Location[] }` |
| `chatRoomMessageImports.create(options)` | POST `/chat_room_message_imports` | Required `chat_room_uuid`, `user_email`, `rich_text_body`, `sent_at`; 201 **unknown** JSON |

The shared requester preserves empty successful responses as `undefined`. That tolerance
does not imply these operations document 204; their specified successes are JSON 200/201.

## Leads and internal notes

A lead is a non-member contact in the audience, with no login or community access. Creating
one with an email already used by a member or lead returns 422. Lead deletion soft-deletes
the audience contact; re-adding restores it. A full member's ID or a contact in another
community returns 404 without deletion. Member access changes use `communityMembers`.

Notes are internal and list newest first. Contact IDs accept string representations of IDs
or sqids; lead deletion requires a numeric ID. Only `page` is declared for note lists, even
though responses also report `per_page`. The SDK does not invent a note-page-size input.

```ts
import type { AdminApi } from "circleso/admin";

// Compile-only. Invoke only for an intended audience change.
export async function addLead(admin: AdminApi) {
  const lead = await admin.communityLeads.create({ email: "synthetic@example.test" });
  const notes = lead?.sqid ? await admin.contactNotes.list(lead.sqid, { page: 1 }) : undefined;
  return { lead, notes };
}
```

The note schema requires the wrapper `tiptap_body: { body: ... }`. Its `body` object has
no declared properties, so the pinned generator emits `Record<string, never>`. The same
limitation affects import `rich_text_body`, and note responses have an opaque nullable
`tiptap_body`. Raw clients and responses preserve these generated contracts. Named writes
additionally accept the [rich text builders](rich-text.md) through a narrow request-only
compatibility layer. The [compile-only recipe](https://github.com/atomimus/circleso/blob/main/examples/admin-remaining-resources.ts)
uses common builders without assertions; arbitrary editor extensions need the explicit
JSON escape hatch and remain the caller's responsibility.
See Circle's [TipTap documentation](https://api.circle.so/get-started/concepts/tiptap-editor)
and [rich-text wrapper](https://api.circle.so/get-started/concepts/rich-text-body).

## Payment, tax and Connect settings

Payment preferences return an array with payment method, enabled state, capability flags
and `normalized_state` (`pending_verification`, `active`, `disabled`, `unavailable`).
Capability IDs/statuses may be absent or null. This surface specifies a read only.

Tax reads refresh from Stripe; failure to resolve live settings can return 400. Updates
accept `tax_setting.platform_status: "enabled" | "disabled"` and
`tax_setting.default_tax_behavior: "exclusive" | "inclusive" | "inferred_by_currency"`.
Circle collects tax only when the platform is enabled and Stripe Tax is active on the
connected account. Invalid settings or a disabled processor can return 422. The response
uses strings for statuses and permits null default behavior; input enums are stricter.

Connect controls member interactions. Its three nested sections accept partial updates;
only supplied fields change. `connect.recommendations` is effective only when Connect is
enabled. `messaging.enabled` is the master toggle. Directory `sort` accepts `alphabetical`,
`oldest`, `latest`; `view` accepts `list`, `cards`. Responses allow null sort/view, while
update inputs do not. Invalid directory enums return 422.

Both settings update bodies are optional upstream. Calling `update()` or `update({})`
sends no body; supplying `{ tax_setting: {} }` or `{ messaging: {} }` sends that JSON
unchanged. The SDK adds no defaults or implicit read/modify/write steps.

```ts
import type { AdminApi } from "circleso/admin";

// Compile-only. Invoke only for an intended settings change.
export async function changeSettings(admin: AdminApi) {
  const tax = await admin.taxSettings.update({
    tax_setting: { platform_status: "disabled", default_tax_behavior: "exclusive" },
  });
  const connect = await admin.connectSettings.update({
    messaging: { group_messaging_enabled: false },
    member_directory: { sort: "alphabetical", view: "cards" },
  });
  return { tax, connect };
}
```

## Live rooms and locations

Room transcripts are JSON containing raw WebVTT strings, potentially one per recording.
An empty `transcripts` array can mean no recording, disabled transcripts or content not ready;
the SDK does not poll, parse VTT or infer which condition applies. A missing room returns 404.

Location search resolves geocoded candidates through Circle; it does not update a contact
or profile. `source` is required, while `name`, `full_address`, `feature_type`, `source_id`
may be absent or null. For a geo-location contact filter, Circle documents mapping the
candidate to `{ source, id: source_id, name, feature_type }`; check nullable fields before
using them. Missing/blank queries return 422; the TypeScript type enforces presence only.

```ts
import type { AdminApi } from "circleso/admin";

export async function readLiveAndLocations(admin: AdminApi, roomId: number) {
  const rooms = await admin.liveRooms.list({ page: 1, per_page: 20 });
  const transcripts = await admin.liveRooms.transcripts(roomId);
  const locations = await admin.locations.search({ query: "Cairo" });
  return { rooms, transcripts, locations };
}
```

## Historical chat import and unknown response

Import targets a chat space on behalf of `user_email`; Circle adds the user as a space
member and chat participant if needed. `sent_at` must not be in the future. Imported
messages send no notifications. `parent_message_id` is optional and nullable for replies.
The documented rich-text form is `rich_text_body: { body: <TipTap document> }`.

The official 201 response references **`admin_v2_chat_room_message`**, which is still absent
from `components.schemas`. Both the facade and raw client therefore return **`unknown`**
for the success data. The existing generation override is limited to that exact POST/201
JSON reference; it defers to an official schema if one appears. There is no guessed
Headless message shape or asserted `id`. Validate/narrow a response before reading fields.
Other unknown successes are listed in the [inventory](api-coverage.md#untyped-success-response-limitations).

All methods retain contextual `CircleHttpError` responses, including 401 authentication
and 403 eligibility failures. Imports have 422 validation errors. Transport failures and
timeouts use the shared SDK errors. POST/PATCH do not automatically retry by default;
PUT/DELETE do. Use `retries: { retries: 0 }` when configuring a client for deliberate
mutations, and reconcile state after an uncertain outcome before repeating a write.
Circle documents no general idempotency or import-deduplication guarantee here.
