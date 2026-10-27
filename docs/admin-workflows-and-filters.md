# Admin workflows and directory filters

These server-only resources use the existing Admin client, flat options and shared
networking. Contracts checked October 27, 2026 against the
[official Admin V2 spec](https://api-headless.circle.so/api/admin/v2/swagger.yaml).
The [compile-only recipes](https://github.com/atomimus/circleso/blob/main/examples/admin-workflows-and-filters.ts) cover all 11
operations. Validation never executes their mutations.

## Workflows

All workflow IDs are UUID strings. Optional options accept request headers, signal
and credentials. No operation here authors triggers/actions or runs bulk/scheduled work.

| Method | HTTP path after `/api/admin/v2` | Inputs and response |
| --- | --- | --- |
| `workflows.list(options?)` | GET `/workflows` | Optional `query`, `status`, `workflow_type`, `page`, `per_page`; paginated lean summaries |
| `workflows.get(id, options?)` | GET `/workflows/{id}` | Trigger and ordered action graph |
| `workflows.activate(id, options?)` | PUT `/workflows/{id}/activate` | Immediate activation of an eligible dynamic automation; workflow with Settings URL |
| `workflows.deactivate(id, options?)` | PUT `/workflows/{id}/deactivate` | Immediate deactivation of an active dynamic automation; workflow with Settings URL |
| `workflows.duplicate(id, options?)` | POST `/workflows/{id}/duplicate` | Draft copy and Settings URL, HTTP 201 |

List filters combine with AND, with newest workflows first. Omitted `status` includes
archived workflows; `status: "all"` excludes archived ones. Other values are `draft`,
`active`, `inactive`, `archived`. Types are `dynamic`, `bulk_action`, `scheduled`.
Summaries omit the graph and URL and allow a null name. Fetch detail for the trigger
and execution-ordered actions; `list_position` is 1-indexed, while raw `position` can
have gaps. The upstream detail schema leaves status/type strings unrestricted and
provides no fields for opaque trigger `config` or action `api_params` objects. The SDK
preserves received data and generated types without guessing their structure.

Activation requires a valid trigger and at least one action and enforces plan limits.
Activation/deactivation take effect immediately. Bulk and scheduled workflows cannot
use these actions. Duplication copies triggers, actions and schedule to draft and does
not trigger a run; Circle can refuse a fork when branch authoring is off.

## Directory and member-space controls

| Method | HTTP path after `/api/admin/v2` | Inputs and response |
| --- | --- | --- |
| `filterKit.configuration(options)` | GET `/filter_kit_configuration` | Required `context: "members" \| "member_space"`; `space_id` required by Circle for `member_space`; resolved runtime configuration |
| `filterKit.controls.list(options?)` | GET `/filter_kit_controls` | `space_id`, `member_directory_only`, `enabled`, `key`, `profile_field_id`, `page`, `per_page`; paginated saved controls |
| `filterKit.controls.create(options)` | POST `/filter_kit_controls` | Required `key` and `enabled`; optional `space_id`, `profile_field_id`, `sort_key`; created control, HTTP 201 |
| `filterKit.controls.get(id, options?)` | GET `/filter_kit_controls/{id}` | Single control by numeric ID |
| `filterKit.controls.update(id, options?)` | PATCH `/filter_kit_controls/{id}` | Optional `key`, `enabled`, `space_id`, `profile_field_id`, `sort_key`; updated control |
| `filterKit.controls.delete(id, options?)` | DELETE `/filter_kit_controls/{id}` | JSON `success` and `message` |

Control keys are `contact_search`, `near_me`, `online`, `recently_joined`, `location`,
`tags`, `profile_field`, `spaces`, `space_groups`, `global`. Omit `space_id` on creation
for the directory; supply it for a member space. `profile_field` requires
`profile_field_id`, which is allowed only with that key. These conditional requirements
remain Circle validations: the generated schema marks the individual IDs optional.
Update does not accept null IDs, and the spec does not document a way to move a control
back to the directory by clearing its space ID.

Each call creates, updates or deletes **one saved customization**. There is no bulk
replacement list. `enabled: false` hides the filter; a profile-field control can expose
a profile field as a filter. Lower sort keys come first within each group; resolved
groups stay ordered `global`, `presets`, `profile`. Deletion removes a customization;
it does not promise to hide a default filter. Re-read `configuration` to inspect the
resolved defaults plus saved customizations. The PATCH body is optional upstream;
omission or `{}` sends no body through the shared requester, with no invented reset
semantics. A supplied field such as `enabled: false` is sent in JSON unchanged.

```ts
import type { AdminApi } from "circleso/admin";

// Compile only. Invoke only for an intended directory visibility change.
export async function hideOnlineFilter(admin: AdminApi) {
  const saved = await admin.filterKit.controls.create({ key: "online", enabled: false });
  const resolved = await admin.filterKit.configuration({ context: "members" });
  return { saved, resolved };
}
```

## Configuration types and searching members

Configuration responses retain the generated `input_type` discriminator: `string`,
`boolean`, `radio`, `array`, `near_me`, `preset`, `location`, `search`, `number`,
`async_search`, `days_ago`, `number_range`. Narrow by this field before reading payloads.
Required base metadata and per-variant fields stay required; null payloads, nullable
IDs and option values retain their official types. Array `additional_params`, preset
`preset_params` and base search `order` remain open objects with unknown values. URLs
in configuration are returned as data; the SDK never follows them automatically.

Saved controls govern which filters members see. Search predicates select matching
members for an individual request. Use existing `headless.communityMembers.search`;
passing a configuration/control object directly is not a search recipe. The SDK does
not convert variants into operators or merge preset/base search parameters. Follow
the resolved surface's `base_search_params` contract when constructing its requests;
different surface/search schemas need explicit mapping.

```ts
import type { HeadlessApi } from "circleso/headless";

export function findMembers(member: HeadlessApi) {
  return member.communityMembers.search({
    filters: [{ key: "name", filter_type: "contains", value: "Synthetic" }],
    per_page: 20,
  });
}
```

The [official member search guide](https://api.circle.so/apis/headless/member-api/community-member-search)
documents operators per field, member-authenticated permissions and cursor paging.
Email/activity-score predicates apply only for admin members and are ignored otherwise.
Start a new search without `search_after` when replacing predicates; use the returned
`next_search_after` only for the next page of the same search. Changing predicates does
not replace any saved controls.

## Errors and retry behavior

The shared requester preserves contextual `CircleHttpError` failures, including 401/403
permissions, 404 missing records, invalid configuration context (400), and documented
mutation eligibility/validation failures (422). Responses use the generated schemas;
SDK typing is not runtime JSON-schema validation. The spec declares JSON successes
for these operations, including delete, rather than a 204 contract. Shared empty-response
tolerance still applies and return types include `undefined`.

PUT/DELETE inherit shared automatic retries; POST/PATCH do not retry by default. For
deliberate workflow/visibility changes, configure `retries: { retries: 0 }`. A failed
response can leave an uncertain outcome; inspect current state before another mutation.
Circle documents no general idempotency guarantee for these operations. The SDK adds
no confirmation, trigger, eligibility, follow-up mutation or polling loop.
