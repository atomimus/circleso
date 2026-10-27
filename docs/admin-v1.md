# Legacy Admin V1 support decision

Checked October 27, 2026. **Keep Admin V2 as the supported Admin API.** Migrate
legacy integrations using the matrix below. No legacy adapter is justified by the
currently verified contracts and use cases, and none is implemented or scheduled.
The supported surfaces remain Admin V2, Headless Member V1 and Headless Auth V1.
`circleso@1.0.0` is the SDK version; it does **not** mean Circle Admin API V1.

Circle [recommends V2 and migrating existing V1 automations](https://api.circle.so/apis/admin-api).
Its current policy says V1 has no planned near-term deprecation, while new endpoints
and updates go to V2. This is not an announced V1 shutdown date or a support promise
from this SDK. The SDK decision is to retain its existing three-surface contract.

## Evidence and contract availability

The [official legacy reference](https://api-v1.circle.so/) serves a Postman collection
through its own linked collection endpoint. The retrieved collection contains 77
request examples in 28 folders, representing 76 distinct method/path pairs: 73 under
`/api/v1` and three under `/public`. Direct and group messages share one route.
Literal sample IDs, colon parameters and Postman variables are normalized to braces
below; query strings are deliberately excluded from route identity. These are
documentation inventory counts, not successful live requests or a service guarantee.

The reference's collection metadata reports August 14, 2024 as its publication date;
that is not evidence of its last server change. It identifies the Postman collection
2.0 format, not an OpenAPI contract. Its 78 saved response examples have no response
schema attached. Examples cannot establish required fields, complete unions,
nullability, error variants or idempotency. No authoritative legacy OpenAPI contract
was linked from the checked reference or current Admin guidance. That bounded finding
does not prove that Circle has no private contract.

For V2, the [current official OpenAPI document](https://api-headless.circle.so/api/admin/v2/swagger.yaml)
was byte-identical to this repository's [accepted Admin spec](https://github.com/atomimus/circleso/blob/main/api/specs/admin-v2.yaml)
on the checked date. The SDK exposes all 172 accepted Admin operations through raw
and named clients; see the [complete inventory](api-coverage.md) and
[call signatures](api-reference.md#resource-call-shapes). Exposure does not establish
field-by-field parity with V1. Omitted success schemas and other upstream limitations
remain as described in the reference.

## Endpoint and use-case matrix

Legacy paths are relative to `/api/v1`, except paths explicitly starting `/public`.
V2 paths are relative to `/api/admin/v2`. Paths starting `/api/headless/v1` are
**member-authenticated alternatives**, with different identity and access rules.
SDK calls below use an Admin client unless prefixed `member.`. A mapped operation
identifies a migration candidate, not a promise of identical input, output or effects.
All mapped methods/paths and named calls were checked against the accepted specs
and source. Read the behavior changes after the table before migrating writes.

| Use case | Legacy method/path | Migration method/path | SDK call and condition |
| --- | --- | --- | --- |
| Me: User Info | `GET /me` | None verified | No verified token-owner equivalent |
| Communities: Index | `GET /communities` | None verified | No account-wide discovery equivalent |
| Communities: Show | `GET /communities/{id}` | `GET /community` | `community.get`; Configured community only |
| Space Group: Index | `GET /space_groups` | `GET /space_groups` | `spaceGroups.list` |
| Space Group: Show | `GET /space_groups/{id}` | `GET /space_groups/{id}` | `spaceGroups.get` |
| Space Group: Create | `POST /space_groups` | `POST /space_groups` | `spaceGroups.create` |
| Space Group: Update | `PUT /space_groups/{id}` | `PUT /space_groups/{id}` | `spaceGroups.update` |
| Space Group: Destroy | `DELETE /space_groups/{id}` | `DELETE /space_groups/{id}` | `spaceGroups.delete` |
| Space Group Members: Show | `GET /space_group_member` | `GET /space_group_member` | `spaceGroupMembers.get` |
| Space Group Members: Add Member to Space Group | `POST /space_group_members` | `POST /space_group_members` | `spaceGroupMembers.create` |
| Space Group Members: Remove Member from Space Group | `DELETE /space_group_members` | `DELETE /space_group_members` | `spaceGroupMembers.delete` |
| Spaces: Index | `GET /spaces` | `GET /spaces` | `spaces.list` |
| Spaces: Show | `GET /spaces/{id}` | `GET /spaces/{id}` | `spaces.get` |
| Spaces: Create | `POST /spaces` | `POST /spaces` | `spaces.create` |
| Spaces: Destroy | `DELETE /spaces/{id}` | `DELETE /spaces/{id}` | `spaces.delete` |
| Space Members: Add Member to Space | `POST /space_members` | `POST /space_members` | `spaceMembers.add` |
| Space Members: Remove Member from Space | `DELETE /space_members` | `DELETE /space_members` | `spaceMembers.remove` |
| Posts: Index | `GET /posts` | `GET /posts` | `posts.list` |
| Posts: Show | `GET /posts/{id}` | `GET /posts/{id}` | `posts.get` |
| Posts: Create | `POST /posts` | `POST /posts` | `posts.create` |
| Posts: Update | `PUT /posts/{id}` | `PUT /posts/{id}` | `posts.update` |
| Posts: Destroy | `DELETE /posts/{id}` | `DELETE /posts/{id}` | `posts.delete` |
| Comments: Index | `GET /comments` | `GET /comments` | `comments.list` |
| Comments: Show | `GET /comments/{id}` | `GET /comments/{id}` | `comments.get` |
| Comments: Create | `POST /comments` | `POST /comments` | `comments.create` |
| Comments: Destroy | `DELETE /comments/{id}` | `DELETE /comments/{id}` | `comments.delete` |
| Members: Index | `GET /community_members` | `GET /community_members` | `communityMembers.list` |
| Members: Show | `GET /community_members/{id}` | `GET /community_members/{id}` | `communityMembers.get` |
| Members: Search Member | `GET /community_members/search` | `GET /community_members/search` | `communityMembers.search` |
| Members: Invite Member | `POST /community_members` | `POST /community_members` | `communityMembers.create`; Profile/media field differences |
| Members: Update | `PUT /community_members/{id}` | `PUT /community_members/{id}` | `communityMembers.update`; Profile/media field differences |
| Members: Remove Member from Community | `DELETE /community_members` | `DELETE /community_members/{id}` | `communityMembers.deactivate`; Resolve email to ID; choose intended removal effect |
| Member Tag: Index | `GET /member_tags` | `GET /member_tags` | `memberTags.list` |
| Member Tag: Show | `GET /member_tags/{id}` | `GET /member_tags/{id}` | `memberTags.get` |
| Tagged Members: Index | `GET /tagged_members` | `GET /tagged_members` | `taggedMembers.list` |
| Tagged Members: Show | `GET /tagged_members/{id}` | `GET /tagged_members/{id}` | `taggedMembers.get` |
| Tagged Members: Tag Member | `POST /tagged_members` | `POST /tagged_members` | `taggedMembers.create` |
| Tagged Members: Untag Member | `DELETE /tagged_members` | `DELETE /tagged_members` | `taggedMembers.delete` |
| Direct / group messages | `POST /messages` | `POST /messages` | `messages.create`; Convert message_body to rich_text_body |
| Member Subscriptions: Index | `GET /community_member_subscriptions` | `GET /community_member_subscriptions` | `communityMemberSubscriptions.list` |
| Events: Create | `POST /events` | `POST /events` | `events.events.create`; Adapt event body, query and IDs |
| Events: Update | `PUT /events/{id}` | `PUT /events/{id}` | `events.events.update`; Adapt event body, query and IDs |
| Events: Index | `GET /events` | `GET /events` | `events.events.list`; Adapt event body, query and IDs |
| Events: Delete | `DELETE /events/{id}` | `DELETE /events/{id}` | `events.events.delete`; Adapt event body, query and IDs |
| Event Attendees: RSVP Member | `POST /event_attendees` | `POST /event_attendees` | `events.attendees.create` |
| Event Attendees: Index | `GET /event_attendees` | `GET /event_attendees` | `events.attendees.list` |
| Event Attendees: Un-RSVP Member | `DELETE /event_attendees` | `DELETE /event_attendees` | `events.attendees.delete` |
| Member Charges: Index | `GET /community_member_charges` | `GET /community_member_charges` | `communityMemberCharges.list` |
| Post Likes: Index | `GET /posts/{post_id}/likes` | `GET /api/headless/v1/posts/{post_id}/user_likes` | `member.posts.likes.list`; Different actor; no Admin V2 counterpart |
| Post Likes: Create | `POST /posts/{post_id}/likes` | `POST /api/headless/v1/posts/{post_id}/user_likes` | `member.posts.likes.create`; Different actor; no Admin V2 counterpart |
| Post Likes: Destroy | `DELETE /posts/{post_id}/likes` | `DELETE /api/headless/v1/posts/{post_id}/user_likes` | `member.posts.likes.delete`; Different actor; no Admin V2 counterpart |
| Comment Likes: Index | `GET /comments/{comment_id}/likes` | `GET /api/headless/v1/comments/{comment_id}/user_likes` | `member.comments.likes.list`; Different actor; no Admin V2 counterpart |
| Comment Likes: Create | `POST /comments/{comment_id}/likes` | `POST /api/headless/v1/comments/{comment_id}/user_likes` | `member.comments.likes.create`; Different actor; no Admin V2 counterpart |
| Comment Likes: Destroy | `DELETE /comments/{comment_id}/likes` | `DELETE /api/headless/v1/comments/{comment_id}/user_likes` | `member.comments.likes.delete`; Different actor; no Admin V2 counterpart |
| Comunity Member Spaces: Index | `GET /community_member_spaces` | `GET /community_member_spaces` | `communityMembers.spaces.list` |
| Profile Fields: Get profile fields | `GET /page_profile_fields` | `GET /page_profile_fields` | `pageProfileFields.list` |
| Course Sections: Index | `GET /course_sections` | `GET /course_sections` | `courses.sections.list` |
| Course Sections: Show | `GET /course_sections/{id}` | `GET /course_sections/{id}` | `courses.sections.get` |
| Course Sections: Create | `POST /course_sections` | `POST /course_sections` | `courses.sections.create` |
| Course Sections: Update | `PATCH /course_sections/{id}` | `PUT /course_sections/{id}` | `courses.sections.update`; Method changes |
| Course Sections: Destroy | `DELETE /course_sections/{id}` | `DELETE /course_sections/{id}` | `courses.sections.delete` |
| Course Lessons: Index | `GET /course_lessons` | `GET /course_lessons` | `courses.lessons.list` |
| Course Lessons: Show | `GET /course_lessons/{id}` | `GET /course_lessons/{id}` | `courses.lessons.get` |
| Course Lessons: Create | `POST /course_lessons` | `POST /course_lessons` | `courses.lessons.create` |
| Course Lessons: Update | `PATCH /course_lessons/{id}` | `PATCH /course_lessons/{id}` | `courses.lessons.update` |
| Course Lessons: Destroy | `DELETE /course_lessons/{id}` | `DELETE /course_lessons/{id}` | `courses.lessons.delete` |
| Course Lesson Progress: Update | `PATCH /course_lesson_progress` | `PUT /course_lesson_progress` | `courses.lessonProgress.update`; Required lesson/member/status JSON |
| Notifications: unsubscribe | `GET /public/unsubscribe` | None verified | Keep Circle-issued unsubscribe flow; no compatible SDK route |
| Notifications: actions - index | `GET /public/notification_preferences` | `GET /api/headless/v1/notification_preferences/{medium}` | `member.notificationPreferences.get`; Authenticated settings alternative; no public-link parity |
| Notifications: actions - update | `PATCH /public/notification_preferences` | `PUT /api/headless/v1/notification_preferences/{medium}` | `member.notificationPreferences.update`; Authenticated settings alternative; no public-link parity |
| Topics: Index | `GET /topics` | `GET /topics` | `topics.list` |
| Topics: Create | `POST /topics` | `POST /topics` | `topics.create` |
| Topics: Update | `PUT /topics/{id}` | `PUT /topics/{id}` | `topics.update` |
| Topics: Destroy | `DELETE /topics/{id}` | `DELETE /topics/{id}` | `topics.delete` |
| Contacts: Create a contact | `POST /contacts` | `POST /community_leads` or `POST /community_members` | `communityLeads.create / communityMembers.create`; Choose lead or member; narrower field contracts |
| Flagged Content: Index | `GET /flagged_contents` | `GET /flagged_contents` | `flaggedContents.list` |

## Migration conditions and genuine gaps

- **Identity and account discovery:** V1 `/me` and the account-wide `/communities`
  list have no accepted Admin V2 counterpart. V2 `community.get()` reads the
  configured community, not every community associated with an account. Applications
  must maintain an explicit authorized community configuration; the SDK cannot
  reproduce account discovery or identify a V1 token's owner with that call.
- **Member removal:** V1 deletes by email in a collection route. Resolve the target
  with V2 `communityMembers.search({ email })`, check the returned identity, and
  deliberately choose `deactivate(id)`, permanent `delete(id)`, or `ban(id)`.
  V2 DELETE is deactivation; translating a legacy delete into permanent deletion
  would silently choose a different effect. These are separate calls, not a
  transaction, and identity/concurrency checks belong to the application.
- **Messages:** Both V1 message examples map to V2 `messages.create`. Preserve
  `user_email` for direct messages or `user_emails` for groups; replace query
  `message_body` with the documented `rich_text_body`. Existing rooms can instead
  use `chat_room_uuid`. Do not send old query fields or assume a new room is always
  created. See [rich text](rich-text.md) and Circle's
  [message concepts](https://api.circle.so/get-started/concepts/messages).
- **Reactions:** The six legacy post/comment like routes have no Admin V2
  counterpart in the accepted spec. Headless `posts.likes` and `comments.likes`
  use the authenticated member's permissions and identity. They do not preserve
  V1's admin-selected `user_email` actor. Use an authorized member session for that
  member's actions; bulk historical likes or arbitrary-user impersonation have no
  verified replacement here. A count on a post is not the full likes collection.
- **Notifications:** The legacy collection includes three `/public` routes,
  including a GET unsubscribe action. Their descriptions incorrectly discuss
  course lessons, and the examples do not establish a complete authentication or
  signed-link contract. Headless `notificationPreferences.get/update` operates on
  an authenticated member and a medium, with separate space preference methods.
  It is an alternative for a member settings UI, not a compatible public unsubscribe
  link. Keep Circle-issued links in Circle's flow; do not manufacture links or
  turn a state-changing GET into an SDK read.
- **Contacts:** V1 `/contacts` accepts `contact_type` and `profile_field_values`.
  V2 separates non-member `communityLeads.create` (email/name/member tags) from
  `communityMembers.create` (full membership). Neither is a field-for-field adapter
  for that V1 body. First/last-name splitting and lead profile-field writes are not
  represented by the accepted lead create schema. Reconcile the intended contact
  type and do not create a member merely to imitate a lead write.
- **Profile and media fields:** V1 member examples include bio, location, social
  URLs, remote avatar URLs and array-valued checkbox profile fields. The V2
  member write schemas expose a narrower set and string-valued custom fields;
  avatar writes require an upload `signed_id`. Do not cast legacy bodies to V2
  types, stringify arrays speculatively, or infer support from a read response.
  Use the [upload workflow](file-uploads.md) and obtain authoritative guidance for
  any required field absent from the write contract. Profile-field definitions
  and a member's field values are different resources.
- **Methods and payloads:** Course-section updates change PATCH to PUT; lesson
  progress changes PATCH to PUT with required `lesson_id`, `member_email` and
  `status`. Body wrappers, query/body placement, response envelopes, status
  filters, numeric versus string IDs and deletion semantics must follow the V2
  signature. Event, post and comment counterparts do not establish payload parity.

## Practical migration

1. Inventory the exact legacy method, route, fields and intended actor. Match it
   to the matrix; record unmet fields and identity requirements separately.
2. Create an **Admin V2** token through Circle's
   [token settings guidance](https://api.circle.so/apis/admin-api/quick-start).
   Keep it on a server. A V1 token is not assumed interchangeable. `createAdmin`
   and `raw` remain V2; changing `baseUrl` does not select a legacy API version.
   The SDK follows the accepted spec's `Token` header and required Host header,
   despite the current quick-start showing Bearer. It makes no fallback auth probe.
   See [configuration and transport limits](client-configuration.md).
3. Replace each request with the named V2 call, recompile its inputs, and adapt
   response reads to the V2 schema. Drop legacy `community_id` only where the V2
   operation does not declare it. Explicitly set page sizes and bound traversal
   with [iterators](pagination.md); do not reuse legacy pagination assumptions.
4. For member alternatives, use a separately authorized Member access token and
   the [server-owned issuance/refresh flow](authentication.md). Member API access
   is a different product contract and may depend on Circle plan eligibility.
5. Verify writes in an authorized disposable test community before deploying.
   Set deliberate mutation retries to zero and reconcile uncertain outcomes.
   No undocumented idempotency key or cross-call atomicity is implied.

This server example builds the new message body and uses the V2 lesson-progress
method. Functions do not perform any network call until the application invokes them.

```ts
import { createAdmin, richText } from "circleso/admin";

const token = process.env.CIRCLE_ADMIN_TOKEN;
if (!token) throw new Error("Missing CIRCLE_ADMIN_TOKEN");
const admin = createAdmin({ token, timeoutMs: 10_000, retries: { retries: 0 } });

export function sendDirectMessage(email: string, text: string) {
  return admin.messages.create({
    user_email: email,
    rich_text_body: richText.body([richText.paragraph(richText.text(text))]),
  });
}

export function completeLesson(lessonId: number, memberEmail: string) {
  return admin.courses.lessonProgress.update({
    lesson_id: lessonId, member_email: memberEmail, status: "completed",
  });
}
```

## Maintenance decision and reconsideration boundary

| Option | Contract and maintenance cost | Decision |
| --- | --- | --- |
| Retain V2 and document migration | Reuse the three accepted spec pipelines, shared networking and existing export/runtime matrix; maintain the mapping and explicit gaps when contracts change | Adopt |
| Isolated legacy adapter | Establish authoritative contracts for each selected route, resolve legacy auth/public-link ambiguities, own independent serialization and pagination fixtures, error/redaction/retry tests, exports and clean-consumer checks, and a deprecation policy | Not justified by the available evidence |
| Automatically redirect or retry V2 calls through V1 | Cannot preserve identity, payloads, status meanings or safe mutation replay | Reject |

These are qualitative maintenance obligations, not measured implementation estimates.
The current evidence shows genuine legacy gaps, but no supplied integration requiring
them and no complete legacy schema contract. Adding 76 poorly specified route pairs
would weaken the type-safe contract without proving compatibility. No adapter
implementation prompt is proposed because an adapter is not justified at this point.

Reconsideration requires an explicitly requested, concrete blocked integration,
an endpoint/field/actor whitelist, authoritative request/response/error contracts,
authorized test fixtures and an accepted maintenance/deprecation owner. Only a new,
explicit scope decision could authorize implementation. It would need separate
exports and generation/contract tests while retaining networking in core and global
mutations in middleware. This decision creates no future implementation task.

No live Circle calls were made for this research; plan eligibility, credential
compatibility, exact side effects and customer migration outcomes remain unverified.
The [support policy](../SUPPORT.md) and [SDK-version migration guide](migration-v1.md)
continue to describe the supported runtimes and application responsibilities.
