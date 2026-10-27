# Pagination

Checked against the official [Admin V2 spec](https://api-headless.circle.so/api/admin/v2/swagger.yaml),
[Member V1 spec](https://api-headless.circle.so/api/headless_client/v1/swagger.yaml),
[Admin paging guide](https://api.circle.so/apis/admin-api#paginated-requests) and
[Member search guide](https://api.circle.so/apis/headless/member-api/community-member-search)
on October 27, 2026. Validation uses synthetic responses.

## Typed resource iterators

Admin has 34 page-list adapters on `admin.iter`. Member has 25 page-list adapters,
two cursor adapters and chat ID windows on `headless.iter` (also `headless.raw.iter`).
They yield individual records with generated response types. The page/cursor adapters
accept the same flat filters, headers, credentials and signal as their named resources.
Chat retains its directional options and adds signal support. Path arguments precede
the options object in route order. Required query fields remain required.

Resource options keep the API spelling `page` and `per_page`. Generic helpers and the
existing chat iterator use `perPage`. The default requested size is 20 and the default
offset page is 1. Contact notes accept only `page`; their adapter sends no `per_page`.

- `maxPages` counts page fetches, including empty pages, rather than yielded pages.
- `maxItems` counts records, including duplicate/null entries supplied by the server.
- Either zero makes no request. Exact item caps make no extra request. A final page
  is sliced to the remaining item budget without shrinking the requested page size.
- Caps apply to logical pages; core retries and refresh replay can add HTTP attempts.

Bounds must be non-negative safe integers. Page sizes, starting pages and ID anchors
must be positive safe integers. Fractions, NaN, infinity and unsafe integers fail with
`CircleConfigError`. Validation occurs when iteration begins; some resource option
checks happen at creation. Set both budgets for a bounded scan. Omitted budgets retain
scan-to-end behavior. Cycle detection retains a key per fetched cursor/window, so set
`maxPages` to bound its history too.

Admin documents a maximum `per_page` of 100; its adapters reject larger requests
without clamping. The checked Member operations declare no numerical maximum. Member
requests and generic helpers preserve caller sizes; endpoint errors flow through normally.
No universal Member limit is inferred.

`has_next_page` decides offset continuation when present, including short/empty pages
with `true`. Otherwise the helper stops at an empty/short page, comparing the received
`per_page` if supplied or the requested size. It never uses changing counts to predict
the end. Missing/null records become empty collections; malformed collections or
continuation metadata produce SDK errors.

`signal` reaches each fetch and is checked between buffered records. Aborts preserve
the original reason as `CircleNetworkError.cause`. JSON page bodies finish through core
before records are yielded. Early break closes the iterator chain with no pending
prefetch, body reader or SDK deadline. A custom generic `fetchPage` callback owns any
raw streams it creates and must honor its supplied signal. To cancel a pending `next()`,
abort that signal; async-generator `return()` queues behind pending work.

No iterator sorts, deduplicates or assumes a snapshot. Inserts/deletions and changing
sort keys can cause repeated or missing records between server pages. Budgets limit
work; they do not provide consistency guarantees. Core timeout, retry, HTTP-error and
refresh rules apply. Native custom-adapter/source failures become `CircleNetworkError`
with their cause; existing SDK errors keep their identity and context.

```ts
import { createAdmin } from "circleso/admin";
const admin = createAdmin({ token: "server-supplied-token" });
const controller = new AbortController();
for await (const post of admin.iter.posts({
  space_id: 42, per_page: 50, maxPages: 4, maxItems: 120, signal: controller.signal,
})) {
  console.log(post.id, post.name);
}
```

## Cursor and ID windows

`paginateSearchAfter` accepts a `fetchPage` callback receiving `searchAfter`, `perPage`
and `signal`. It replays the complete `next_search_after` tuple, preserving string/number
types, element order and leading zeros. Missing, null or empty `next_search_after` ends
a scan. The cursor is authoritative even if counts or `has_next_page` are stale. Empty
pages with a fresh cursor can advance within `maxPages`.

The current page's records are yielded before a repeated/unchanged cursor raises
`CircleNetworkError` on continuation. Valid records are neither silently discarded nor
deduplicated. A cap or terminal cursor needs no continuation check. Invalid cursor
components fail explicitly.

Member `iter.communityMembers` uses GET cursor tuples of strings/integers.
`iter.communityMemberSearch` uses POST search, snapshots filters at creation and
preserves predicates across pages. These adapters omit offset `page`; start a new
iterator to change filters. Use `paginateOffset` with the ordinary directory list
resource for an explicit offset scan.

**Upstream POST schema conflict:** response `next_search_after` permits integers/strings,
while request `search_after` permits only strings. The POST adapter replays string tuples.
After yielding the current records it reports a numeric tuple as `CircleNetworkError`
before another request. It never coerces or asserts away the mismatch. The generic
helper and GET adapter preserve mixed tuples. Numeric POST continuation needs
authoritative clarification from Circle and an explicit caller adapter; it is not
claimed supported here.

```ts
import { createHeadless } from "circleso/headless";
const member = createHeadless({ accessToken: "member-supplied-token" });
for await (const person of member.iter.communityMemberSearch({
  filters: [{ key: "role", value: "Member" }], order: "oldest",
  per_page: 20, maxPages: 10, maxItems: 150,
})) {
  console.log(person.id, person.name);
}
```

`iter.chatRoomMessages(uuid, options)` is preserved. Previous advances `first_id`;
next advances `last_id`, forwarding only the selected directional size as before.
Records remain in server order. Missing cursors terminate unless the server explicitly
promises another page, which is an error. Repeated/cyclic IDs raise `CircleNetworkError`
after current records are yielded. Cancellation and both caps work in either direction.

For a custom adapter, keep filters fixed in the closure and forward the page signal:

```ts
import { paginateSearchAfter, toAsyncIterator } from "circleso";
import { createHeadless } from "circleso/headless";
const member = createHeadless({ accessToken: "member-supplied-token" });
const pages = paginateSearchAfter({
  perPage: 20, maxPages: 10, maxItems: 150,
  fetchPage: ({ searchAfter, perPage, signal }) => member.communityMembers.list({
    space_id: 42, per_page: perPage,
    ...(searchAfter !== undefined ? { search_after: [...searchAfter] } : {}),
    ...(signal !== undefined ? { signal } : {}),
  }),
});
for await (const person of toAsyncIterator(pages)) console.log(person.community_member_id);
```

## Paged operation inventory

The regression inventory checks every operation declaring `page`, `search_after` or
directional paging against these 62 adapters. Names below belong to the appropriate
API's `iter` object. Arguments and options retain the documented operation types.


### Admin

| Iterator | Method and route |
| --- | --- |
| accessGroupMembers(access_group_id, options) | GET /api/admin/v2/access_groups/{access_group_id}/community_members |
| accessGroups(options) | GET /api/admin/v2/access_groups |
| advancedSearch(options) | GET /api/admin/v2/advanced_search |
| comments(options) | GET /api/admin/v2/comments |
| communityMemberCharges(options) | GET /api/admin/v2/community_member_charges |
| communityMemberSpaces(options) | GET /api/admin/v2/community_member_spaces |
| communityMemberSubscriptions(options) | GET /api/admin/v2/community_member_subscriptions |
| communityMemberAccessGroups(community_member_id, options) | GET /api/admin/v2/community_members/{community_member_id}/access_groups |
| communityMembers(options) | GET /api/admin/v2/community_members |
| communitySegments(options) | GET /api/admin/v2/community_segments |
| contactNotes(contact_id, options) | GET /api/admin/v2/contacts/{contact_id}/contact_notes |
| courseLessons(options) | GET /api/admin/v2/course_lessons |
| courseSections(options) | GET /api/admin/v2/course_sections |
| eventAttendees(options) | GET /api/admin/v2/event_attendees |
| events(options) | GET /api/admin/v2/events |
| filterKitControls(options) | GET /api/admin/v2/filter_kit_controls |
| flaggedContents(options) | GET /api/admin/v2/flagged_contents |
| forms(options) | GET /api/admin/v2/forms |
| formSubmissions(form_id, options) | GET /api/admin/v2/forms/{form_id}/submissions |
| imagePosts(space_id, options) | GET /api/admin/v2/spaces/{space_id}/images/posts |
| invitationLinks(options) | GET /api/admin/v2/invitation_links |
| liveRooms(options) | GET /api/admin/v2/live/rooms |
| memberTags(options) | GET /api/admin/v2/member_tags |
| paywallAffiliates(options) | GET /api/admin/v2/paywall_affiliates |
| paywalls(options) | GET /api/admin/v2/paywalls/search |
| posts(options) | GET /api/admin/v2/posts |
| profileFields(options) | GET /api/admin/v2/profile_fields |
| spaceGroupMembers(options) | GET /api/admin/v2/space_group_members |
| spaceGroups(options) | GET /api/admin/v2/space_groups |
| spaceMembers(options) | GET /api/admin/v2/space_members |
| spaces(options) | GET /api/admin/v2/spaces |
| taggedMembers(options) | GET /api/admin/v2/tagged_members |
| topics(options) | GET /api/admin/v2/topics |
| workflows(options) | GET /api/admin/v2/workflows |

### Member

| Iterator | Method and route |
| --- | --- |
| advancedSearch(options) | GET /api/headless/v1/advanced_search |
| bookmarks(options) | GET /api/headless/v1/bookmarks |
| chatRoomParticipants(chat_room_uuid, options) | GET /api/headless/v1/messages/{chat_room_uuid}/chat_room_participants |
| chatRooms(options) | GET /api/headless/v1/messages |
| chatThreads(options) | GET /api/headless/v1/chat_threads |
| postComments(post_id, options) | GET /api/headless/v1/posts/{post_id}/comments |
| events(options) | GET /api/headless/v1/community_events |
| memberComments(community_member_id, options) | GET /api/headless/v1/community_members/{community_member_id}/comments |
| memberPosts(community_member_id, options) | GET /api/headless/v1/community_members/{community_member_id}/posts |
| memberSpaces(community_member_id, options) | GET /api/headless/v1/community_members/{community_member_id}/spaces |
| lessonFiles(course_id, lesson_id, options) | GET /api/headless/v1/courses/{course_id}/lessons/{lesson_id}/files |
| quizAttempts(course_id, options) | GET /api/headless/v1/courses/{course_id}/quiz_attempts |
| courseTopics(options) | GET /api/headless/v1/course_topics |
| eventAttendees(event_id, options) | GET /api/headless/v1/events/{event_id}/event_attendees |
| home(options) | GET /api/headless/v1/home |
| notifications(options) | GET /api/headless/v1/notifications |
| pageProfileFields(options) | GET /api/headless/v1/page_profile_fields |
| posts(space_id, options) | GET /api/headless/v1/spaces/{space_id}/posts |
| recurringEvents(space_id, event_id, options) | GET /api/headless/v1/spaces/{space_id}/events/{event_id}/recurring_events |
| commentReplies(comment_id, options) | GET /api/headless/v1/comments/{comment_id}/replies |
| search(options) | GET /api/headless/v1/search |
| spaceBookmarks(space_id, options) | GET /api/headless/v1/spaces/{space_id}/bookmarks |
| spaceTopics(space_id, options) | GET /api/headless/v1/spaces/{space_id}/topics |
| commentLikes(comment_id, options) | GET /api/headless/v1/comments/{comment_id}/user_likes |
| postLikes(post_id, options) | GET /api/headless/v1/posts/{post_id}/user_likes |
| communityMembers(options) | GET /api/headless/v1/community_members |
| communityMemberSearch(options) | POST /api/headless/v1/search/community_members |
| chatRoomMessages(chat_room_uuid, options) | GET /api/headless/v1/messages/{chat_room_uuid}/chat_room_messages |

## Collections without server paging

These list/collection operations declare no paging inputs. Fetch once with the named
resource, then iterate the returned array or specified array field. Do not invent pages
or use record length as evidence of another page. A caller item cap/early break can stop
local iteration, but cannot reduce the one response's transfer size. Nested arrays in
detail records follow the same pattern; they are not additional list operations.

| Surface / named resource | Route | Collection |
| --- | --- | --- |
| Admin gamification.leaderboard | GET /api/admin/v2/gamification/leaderboard | response array |
| Admin pageProfileFields.list | GET /api/admin/v2/page_profile_fields | response array |
| Admin paymentMethodPreferences.get | GET /api/admin/v2/payment_method_setting | response array |
| Admin filterKit.configuration | GET /api/admin/v2/filter_kit_configuration | filter_configurations |
| Admin liveRooms.transcripts | GET /api/admin/v2/live/rooms/{room_id}/transcripts | transcripts |
| Admin locations.search | GET /api/admin/v2/locations/search | results |
| Admin spaces.aiSummary | GET /api/admin/v2/spaces/{space_id}/ai_summaries | topics; summary detail |
| Member communityLinks.list | GET /api/headless/v1/community_links | response array |
| Member courses.sections.list | GET /api/headless/v1/courses/{course_id}/sections | response array |
| Member spaces.list | GET /api/headless/v1/spaces | response array |
| Member spaces.notificationDetails | GET /api/headless/v1/space_notification_details | response array |
| Member chatRooms.unread | GET /api/headless/v1/messages/unread_chat_rooms | chat_rooms |
| Member chatThreads.unread | GET /api/headless/v1/chat_threads/unread_chat_threads | chat_thread_ids |
| Member notificationPreferences.get | GET /api/headless/v1/notification_preferences/{medium} | notification_preference and space_preferences |

Auth has no list operations. Export/download operations are not JSON page collections;
use their documented workflow. Types follow committed generated declarations. Runtime
null records are retained, including where an upstream ref's nullable annotation is not
reflected by the generator. No generated type or upstream contract was rewritten here.
