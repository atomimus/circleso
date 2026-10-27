# Admin paywalls, affiliates and payouts

These resources are available through `createAdmin` from `circleso/admin` and through
`CircleSo.admin`. They use the existing server-only Admin Token/Host configuration and
shared requester. `admin.raw` and `admin.invitationLinks` remain available.
Contracts were checked October 27, 2026 against the
[official Admin V2 spec](https://api-headless.circle.so/api/admin/v2/swagger.yaml).

Options use the generated field names at the top level, alongside `headers`, `signal`
and `credentials`. Nested schema objects stay nested: affiliate `filters` is an object;
invitation-link `paywall` is one object or `null`. IDs are numeric Circle IDs, with
affiliate IDs used for affiliate updates and community member IDs used for invitations
and payout scopes. See the [compiled recipe](https://github.com/atomimus/circleso/blob/main/examples/admin-paywalls.ts).

## Methods

All paths below start with `/api/admin/v2`. Options marked optional may be omitted.
Responses are generated JSON types, with `undefined` preserved for empty success bodies.

| Resource method | HTTP path | Inputs | Documented success |
| --- | --- | --- | --- |
| `paywalls.search(options?)` | GET `/paywalls/search` | Query: `page`, `per_page`, `name`, `status`, `currency`, `paywall_id`, `exclude_paywall_id`, `subscription_group_id`, `exclude_subscription_group_id`, `sort`, `direction` | 200 `paywalls_list` |
| `paywalls.delete(id, options?)` | DELETE `/paywalls/{id}` | Metadata only; no body | 200 required `success`, `message` |
| `paywalls.archive(id, options?)` | PUT `/paywalls/{id}/archive` | Metadata only; no body | 200 required `success`, `message` |
| `paywalls.publish(id, options?)` | PUT `/paywalls/{id}/publish` | Metadata only; no body | 200 required `success`, `message` |
| `paywalls.unarchive(id, options?)` | PUT `/paywalls/{id}/unarchive` | Metadata only; no body | 200 required `success`, `message` |
| `paywalls.syncMemberAccess(paywallId, options?)` | POST `/paywalls/{paywall_id}/member_access_syncs` | Metadata only; no body | 201 `paywall_member_access_sync` |
| `paywallGroups.create(options)` | POST `/paywall_groups` | JSON: required `name`, `currency_id` | 201 `paywall_group` |
| `paywallGroups.update(id, options)` | PUT `/paywall_groups/{id}` | Required JSON body with optional `name`, `currency_id`; `{}` is sent as `{}` | 200 `paywall_group` |
| `paywallCoupons.delete(id, options?)` | DELETE `/paywall_coupons/{id}` | Metadata only; no body | 200 optional `success`, `message` |
| `paywallAffiliates.list(options?)` | GET `/paywall_affiliates` | Query: `page`, `per_page`, `filters: { status?, campaign_id?, name_or_email?, code? }` | 200 `paywall_affiliates_list` |
| `paywallAffiliates.invite(options)` | POST `/paywall_affiliates/invite` | JSON: required `existing_member_ids: number[]` | 200 optional `results`, `summary` |
| `paywallAffiliates.update(id, options)` | PATCH `/paywall_affiliates/{id}` | Required JSON body with optional `status`; `{}` is sent as `{}` | 200 `paywall_affiliate` |
| `paywallAffiliatePayouts.start(options?)` | POST `/paywall_affiliate_payouts/start` | Optional JSON: `community_member_ids: number[]` | 200 required `processing` count |
| `paywallAffiliatePayouts.markPaid(options?)` | POST `/paywall_affiliate_payouts/mark_paid` | Optional JSON: `community_member_ids: number[]` | 200 required `expected`, `processed` counts |
| `paywallAffiliatePayouts.export(options?)` | POST `/paywall_affiliate_payouts/export` | Optional JSON: `community_member_ids: number[]` | 201 `paywall_affiliate_payout_export` task |

Search ID/status/currency filters are comma-separated strings. Search matches names or
display names partially; documented sorts are `title`, `status`, `created_at`. `direction`
only takes effect with `sort`. Those sort fields remain strings in the generated schema.
Affiliate filters serialize as `filters[status]`, etc. List statuses are `inactive`,
`invited`, `enrolled`, `disabled`; name matches partially, email exactly, and code partially
without case sensitivity. Both lists accept at most 100 records per page.

## Effects and eligibility

Deleting a paywall is permanent; Circle returns 422 if it has real transactions.
Archiving requires an active paywall and sets it inactive. It permanently discards kept
upsell offers that use the paywall as host or target, including their prices and
customization attachments. Publishing activates draft or archived paywalls; already
active paywalls return 422. Unarchiving requires an archived paywall and activates it;
discarded offers are never restored. These actions do not document a subscription
cancellation or refund contract; use the separate subscription/charge resources for
those intended operations.

Member access sync schedules recomputation and re-granting for all subscribers of a
legacy paywall. Access-group-enabled paywalls already propagate edits and return 422.
A 201 response contains a scheduled job, not evidence that access changed. Within about
five minutes or while its worker runs, repeated calls can return the same job. Do not
poll this mutation to check completion; the SDK adds no polling loop.

Subscription groups enable upgrades/downgrades between subscription-priced paywalls.
Creation requires a numeric currency ID; currency updates require an empty group.
These methods expose no paywall-membership replacement list. Coupon deletion also
removes its Stripe-side coupon and invalidates referencing offers; Circle documents
422 for a Stripe outage and 404 for a missing/already-deleted coupon.

Affiliate invitations accept at most 20 existing members from the current community.
Circle groups results by outcome (`invited`, `reinvited`, `already_active`, `failed`),
so correlate by `community_member_id`, not input position. Disabled affiliate features
can return 422. Updates allow disabling invited/enrolled affiliates; restoring a
disabled affiliate requires its previous invited/enrolled status. Illegal transitions
return 422. The generated update body does not require `status`; Circle validates it.

Payout start moves due payouts to processing. Mark-paid moves processing payouts to
paid; compare `expected` and `processed`. Export queues a CSV of processing payouts
and returns task metadata, not CSV bytes. Each optional scope accepts up to 20 community
member IDs. **Omitting `community_member_ids` affects all eligible payouts.** Empty
arrays are transmitted unchanged; the spec does not establish their scope semantics.
The SDK makes no additional funds-transfer, delivery or payment-idempotency promise.
Schema limits such as array lengths remain Circle validations, rather than local runtime
JSON-schema validation.

## Existing access replacement behavior

Invitation-link updates retain their existing contract: `access_group_ids` fully
replaces attachments and `[]` detaches all. Omitted fields are not sent by the SDK.
`paywall: null` removes the link's paywall configuration; configuring a `paywall_id`
also requires an eligible recurring `paywall_price_id` and `paywall_trial_days`
(1–730). The schema does not encode those conditional requirements.

For the existing `accessGroups.content.update`, each `space_ids`/`space_group_ids`
list replaces its assignments; omission or `[]` removes that category's assignments.
Invalid/foreign IDs are silently ignored by Circle. This differs from omitting an
invitation-link replacement field. Neither behavior is changed by these resources.

## Errors and retries

Circle validates state, feature and community eligibility. Documented failures include
401 authentication/authorization, 403 Admin V2 community eligibility, 404 missing records
and the operation-specific 422 cases above. The SDK preserves status, method, URL,
request ID and best-effort parsed details in `CircleHttpError`. Network failures keep
their causes in `CircleNetworkError`; shared timeout/configuration behavior also applies.

All methods inherit shared retry configuration. PUT/DELETE can retry on retryable HTTP
or transport failures; POST/PATCH do not retry unless `retryNonIdempotent` is enabled.
A retried state change can return an eligibility/not-found error after an earlier attempt
was applied. For deliberate destructive/financial changes, configure the Admin client
with `retries: { retries: 0 }` and reconcile uncertain outcomes before retrying yourself.
The documented access-sync deduplication window is specific to that operation and is
not a general idempotency guarantee. All SDK mutation tests use mocked fetches.
