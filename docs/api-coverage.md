# API operation inventory

Generated offline by `npm run coverage:write`; verify with `npm run gen:check` and `npm run coverage:check`.
Counts are method/path exposure, not runtime correctness or test coverage. `raw` means a non-never operation in the generated paths interface used by the raw client. Named facade entries follow public resource registrations and requester calls using the TypeScript AST.

| Surface | Spec operations | Raw exposure | Named facade operations | Raw-only |
| --- | ---: | ---: | ---: | ---: |
| admin-v2 | 172 | 172 | 133 | 39 |
| headless-client-v1 | 102 | 102 | 102 | 0 |
| headless-auth-v1 | 4 | 4 | 4 | 0 |

## Raw-only operations

Release task ownership follows the saved v1 plan; unassigned new routes need explicit triage.

| Surface | Method | Path | Task |
| --- | --- | --- | --- |
| admin-v2 | DELETE | `/api/admin/v2/community_leads/{id}` | 15 |
| admin-v2 | DELETE | `/api/admin/v2/filter_kit_controls/{id}` | 14 |
| admin-v2 | DELETE | `/api/admin/v2/paywall_coupons/{id}` | 13 |
| admin-v2 | DELETE | `/api/admin/v2/paywalls/{id}` | 13 |
| admin-v2 | GET | `/api/admin/v2/contacts/{contact_id}/contact_notes` | 15 |
| admin-v2 | GET | `/api/admin/v2/filter_kit_configuration` | 14 |
| admin-v2 | GET | `/api/admin/v2/filter_kit_controls` | 14 |
| admin-v2 | GET | `/api/admin/v2/filter_kit_controls/{id}` | 14 |
| admin-v2 | GET | `/api/admin/v2/live/rooms` | 15 |
| admin-v2 | GET | `/api/admin/v2/live/rooms/{room_id}/transcripts` | 15 |
| admin-v2 | GET | `/api/admin/v2/locations/search` | 15 |
| admin-v2 | GET | `/api/admin/v2/payment_method_setting` | 15 |
| admin-v2 | GET | `/api/admin/v2/paywall_affiliates` | 13 |
| admin-v2 | GET | `/api/admin/v2/paywalls/search` | 13 |
| admin-v2 | GET | `/api/admin/v2/settings/connect` | 15 |
| admin-v2 | GET | `/api/admin/v2/tax_setting` | 15 |
| admin-v2 | GET | `/api/admin/v2/workflows` | 14 |
| admin-v2 | GET | `/api/admin/v2/workflows/{id}` | 14 |
| admin-v2 | PATCH | `/api/admin/v2/filter_kit_controls/{id}` | 14 |
| admin-v2 | PATCH | `/api/admin/v2/paywall_affiliates/{id}` | 13 |
| admin-v2 | PATCH | `/api/admin/v2/settings/connect` | 15 |
| admin-v2 | POST | `/api/admin/v2/chat_room_message_imports` | 15 |
| admin-v2 | POST | `/api/admin/v2/community_leads` | 15 |
| admin-v2 | POST | `/api/admin/v2/contacts/{contact_id}/contact_notes` | 15 |
| admin-v2 | POST | `/api/admin/v2/filter_kit_controls` | 14 |
| admin-v2 | POST | `/api/admin/v2/paywall_affiliate_payouts/export` | 13 |
| admin-v2 | POST | `/api/admin/v2/paywall_affiliate_payouts/mark_paid` | 13 |
| admin-v2 | POST | `/api/admin/v2/paywall_affiliate_payouts/start` | 13 |
| admin-v2 | POST | `/api/admin/v2/paywall_affiliates/invite` | 13 |
| admin-v2 | POST | `/api/admin/v2/paywall_groups` | 13 |
| admin-v2 | POST | `/api/admin/v2/paywalls/{paywall_id}/member_access_syncs` | 13 |
| admin-v2 | POST | `/api/admin/v2/workflows/{id}/duplicate` | 14 |
| admin-v2 | PUT | `/api/admin/v2/paywall_groups/{id}` | 13 |
| admin-v2 | PUT | `/api/admin/v2/paywalls/{id}/archive` | 13 |
| admin-v2 | PUT | `/api/admin/v2/paywalls/{id}/publish` | 13 |
| admin-v2 | PUT | `/api/admin/v2/paywalls/{id}/unarchive` | 13 |
| admin-v2 | PUT | `/api/admin/v2/tax_setting` | 15 |
| admin-v2 | PUT | `/api/admin/v2/workflows/{id}/activate` | 14 |
| admin-v2 | PUT | `/api/admin/v2/workflows/{id}/deactivate` | 14 |

## Untyped success response limitations

These media types have no authoritative schema or use the one targeted missing-schema override. Responses with no declared content (for example 204) are not schema gaps. This list does not classify every nested free-form property; the generated declarations remain authoritative for those upstream types.

| Surface | Operation | Limitation |
| --- | --- | --- |
| admin-v2 | DELETE `/api/admin/v2/community_segments/{id}` | 200 application/json: unknown (upstream omits a response schema) |
| admin-v2 | DELETE `/api/admin/v2/invitation_links/{id}` | 200 application/json: unknown (upstream omits a response schema) |
| admin-v2 | DELETE `/api/admin/v2/posts/{post_id}/post_followers` | 200 application/json: unknown (upstream omits a response schema) |
| admin-v2 | DELETE `/api/admin/v2/tagged_members` | 200 application/json: unknown (upstream omits a response schema) |
| admin-v2 | PATCH `/api/admin/v2/invitation_links/{id}/revoke` | 200 application/json: unknown (upstream omits a response schema) |
| admin-v2 | POST `/api/admin/v2/chat_room_message_imports` | 201 application/json: unknown (missing upstream admin_v2_chat_room_message; targeted override) |
| admin-v2 | POST `/api/admin/v2/messages` | 200 application/json: unknown (upstream omits a response schema) |
| headless-client-v1 | POST `/api/headless/v1/messages` | 200 application/json: unknown (upstream omits a response schema) |
| headless-client-v1 | POST `/api/headless/v1/notifications/mark_all_as_read` | 200 application/json: unknown (upstream omits a response schema) |

## admin-v2

Source: https://api-headless.circle.so/api/admin/v2/swagger.yaml

Input SHA-256: `bad66ebb7a69acb0a0a0107020bf064cfa92b6f6b8ebfa440521954693f2a834`

| Method | Path | Raw | Named facade |
| --- | --- | --- | --- |
| DELETE | `/api/admin/v2/access_groups/{access_group_id}/community_members` | Yes | `accessGroups.members.remove` ([source](../src/adminApi/resources/accessGroups.ts)) |
| DELETE | `/api/admin/v2/access_groups/{id}` | Yes | `accessGroups.archive` ([source](../src/adminApi/resources/accessGroups.ts)) |
| DELETE | `/api/admin/v2/comments/{id}` | Yes | `comments.delete` ([source](../src/adminApi/resources/comments.ts)) |
| DELETE | `/api/admin/v2/community_leads/{id}` | Yes | — |
| DELETE | `/api/admin/v2/community_members/{id}` | Yes | `communityMembers.deactivate` ([source](../src/adminApi/resources/communityMembers.ts)) |
| DELETE | `/api/admin/v2/community_segments/{id}` | Yes | `communitySegments.delete` ([source](../src/adminApi/resources/communitySegments.ts)) |
| DELETE | `/api/admin/v2/course_lessons/{id}` | Yes | `courses.lessons.delete` ([source](../src/adminApi/resources/courses.ts)) |
| DELETE | `/api/admin/v2/course_sections/{id}` | Yes | `courses.sections.delete` ([source](../src/adminApi/resources/courses.ts)) |
| DELETE | `/api/admin/v2/event_attendees` | Yes | `events.attendees.delete` ([source](../src/adminApi/resources/events.ts)) |
| DELETE | `/api/admin/v2/events/{id}` | Yes | `events.events.delete` ([source](../src/adminApi/resources/events.ts)) |
| DELETE | `/api/admin/v2/filter_kit_controls/{id}` | Yes | — |
| DELETE | `/api/admin/v2/forms/{id}` | Yes | `forms.delete` ([source](../src/adminApi/resources/forms.ts)) |
| DELETE | `/api/admin/v2/invitation_links/{id}` | Yes | `invitationLinks.delete` ([source](../src/adminApi/resources/invitationLinks.ts)) |
| DELETE | `/api/admin/v2/member_tags/{id}` | Yes | `memberTags.delete` ([source](../src/adminApi/resources/memberTags.ts)) |
| DELETE | `/api/admin/v2/paywall_coupons/{id}` | Yes | — |
| DELETE | `/api/admin/v2/paywalls/{id}` | Yes | — |
| DELETE | `/api/admin/v2/posts/{id}` | Yes | `posts.delete` ([source](../src/adminApi/resources/posts.ts)) |
| DELETE | `/api/admin/v2/posts/{post_id}/post_followers` | Yes | `posts.followers.remove` ([source](../src/adminApi/resources/posts.ts)) |
| DELETE | `/api/admin/v2/profile_fields/{id}` | Yes | `profileFields.delete` ([source](../src/adminApi/resources/profileFields.ts)) |
| DELETE | `/api/admin/v2/space_group_members` | Yes | `spaceGroupMembers.delete` ([source](../src/adminApi/resources/spaceGroupMembers.ts)) |
| DELETE | `/api/admin/v2/space_groups/{id}` | Yes | `spaceGroups.delete` ([source](../src/adminApi/resources/spaceGroups.ts)) |
| DELETE | `/api/admin/v2/space_members` | Yes | `spaceMembers.remove` ([source](../src/adminApi/resources/spaceMembers.ts)) |
| DELETE | `/api/admin/v2/spaces/{id}` | Yes | `spaces.delete` ([source](../src/adminApi/resources/spaces.ts)) |
| DELETE | `/api/admin/v2/spaces/{space_id}/images/posts/{id}` | Yes | `posts.images.delete` ([source](../src/adminApi/resources/posts.ts)) |
| DELETE | `/api/admin/v2/tagged_members` | Yes | `taggedMembers.delete` ([source](../src/adminApi/resources/taggedMembers.ts)) |
| DELETE | `/api/admin/v2/topics/{id}` | Yes | `topics.delete` ([source](../src/adminApi/resources/topics.ts)) |
| GET | `/api/admin/v2/access_groups` | Yes | `accessGroups.list` ([source](../src/adminApi/resources/accessGroups.ts)) |
| GET | `/api/admin/v2/access_groups/{access_group_id}/community_member` | Yes | `accessGroups.members.get` ([source](../src/adminApi/resources/accessGroups.ts)) |
| GET | `/api/admin/v2/access_groups/{access_group_id}/community_members` | Yes | `accessGroups.members.list` ([source](../src/adminApi/resources/accessGroups.ts)) |
| GET | `/api/admin/v2/advanced_search` | Yes | `search.advanced` ([source](../src/adminApi/resources/search.ts)) |
| GET | `/api/admin/v2/comments` | Yes | `comments.list` ([source](../src/adminApi/resources/comments.ts)) |
| GET | `/api/admin/v2/comments/{id}` | Yes | `comments.get` ([source](../src/adminApi/resources/comments.ts)) |
| GET | `/api/admin/v2/community` | Yes | `community.get` ([source](../src/adminApi/resources/community.ts)) |
| GET | `/api/admin/v2/community_member_charges` | Yes | `communityMemberCharges.list` ([source](../src/adminApi/resources/communityMemberCharges.ts)) |
| GET | `/api/admin/v2/community_member_spaces` | Yes | `communityMembers.spaces.list` ([source](../src/adminApi/resources/communityMembers.ts)) |
| GET | `/api/admin/v2/community_member_subscriptions` | Yes | `communityMemberSubscriptions.list` ([source](../src/adminApi/resources/communityMemberSubscriptions.ts)) |
| GET | `/api/admin/v2/community_members` | Yes | `communityMembers.list` ([source](../src/adminApi/resources/communityMembers.ts)) |
| GET | `/api/admin/v2/community_members/search` | Yes | `communityMembers.search` ([source](../src/adminApi/resources/communityMembers.ts)) |
| GET | `/api/admin/v2/community_members/{community_member_id}/access_groups` | Yes | `communityMembers.accessGroups.list` ([source](../src/adminApi/resources/communityMembers.ts)) |
| GET | `/api/admin/v2/community_members/{id}` | Yes | `communityMembers.get` ([source](../src/adminApi/resources/communityMembers.ts)) |
| GET | `/api/admin/v2/community_segments` | Yes | `communitySegments.list` ([source](../src/adminApi/resources/communitySegments.ts)) |
| GET | `/api/admin/v2/contacts/{contact_id}/contact_notes` | Yes | — |
| GET | `/api/admin/v2/course_lessons` | Yes | `courses.lessons.list` ([source](../src/adminApi/resources/courses.ts)) |
| GET | `/api/admin/v2/course_lessons/{id}` | Yes | `courses.lessons.get` ([source](../src/adminApi/resources/courses.ts)) |
| GET | `/api/admin/v2/course_sections` | Yes | `courses.sections.list` ([source](../src/adminApi/resources/courses.ts)) |
| GET | `/api/admin/v2/course_sections/{id}` | Yes | `courses.sections.get` ([source](../src/adminApi/resources/courses.ts)) |
| GET | `/api/admin/v2/embeds/{sgid}` | Yes | `embeds.get` ([source](../src/adminApi/resources/embeds.ts)) |
| GET | `/api/admin/v2/event_attendees` | Yes | `events.attendees.list` ([source](../src/adminApi/resources/events.ts)) |
| GET | `/api/admin/v2/events` | Yes | `events.events.list` ([source](../src/adminApi/resources/events.ts)) |
| GET | `/api/admin/v2/events/{id}` | Yes | `events.events.get` ([source](../src/adminApi/resources/events.ts)) |
| GET | `/api/admin/v2/filter_kit_configuration` | Yes | — |
| GET | `/api/admin/v2/filter_kit_controls` | Yes | — |
| GET | `/api/admin/v2/filter_kit_controls/{id}` | Yes | — |
| GET | `/api/admin/v2/flagged_contents` | Yes | `flaggedContents.list` ([source](../src/adminApi/resources/flaggedContents.ts)) |
| GET | `/api/admin/v2/forms` | Yes | `forms.list` ([source](../src/adminApi/resources/forms.ts)) |
| GET | `/api/admin/v2/forms/{form_id}/submissions` | Yes | `forms.submissions.list` ([source](../src/adminApi/resources/forms.ts)) |
| GET | `/api/admin/v2/forms/{id}` | Yes | `forms.get` ([source](../src/adminApi/resources/forms.ts)) |
| GET | `/api/admin/v2/gamification/leaderboard` | Yes | `gamification.leaderboard` ([source](../src/adminApi/resources/gamification.ts)) |
| GET | `/api/admin/v2/invitation_links` | Yes | `invitationLinks.list` ([source](../src/adminApi/resources/invitationLinks.ts)) |
| GET | `/api/admin/v2/live/rooms` | Yes | — |
| GET | `/api/admin/v2/live/rooms/{room_id}/transcripts` | Yes | — |
| GET | `/api/admin/v2/locations/search` | Yes | — |
| GET | `/api/admin/v2/member_tags` | Yes | `memberTags.list` ([source](../src/adminApi/resources/memberTags.ts)) |
| GET | `/api/admin/v2/member_tags/{id}` | Yes | `memberTags.get` ([source](../src/adminApi/resources/memberTags.ts)) |
| GET | `/api/admin/v2/page_profile_fields` | Yes | `pageProfileFields.list` ([source](../src/adminApi/resources/pageProfileFields.ts)) |
| GET | `/api/admin/v2/payment_method_setting` | Yes | — |
| GET | `/api/admin/v2/paywall_affiliates` | Yes | — |
| GET | `/api/admin/v2/paywalls/search` | Yes | — |
| GET | `/api/admin/v2/posts` | Yes | `posts.list` ([source](../src/adminApi/resources/posts.ts)) |
| GET | `/api/admin/v2/posts/{id}` | Yes | `posts.get` ([source](../src/adminApi/resources/posts.ts)) |
| GET | `/api/admin/v2/posts/{post_id}/summary` | Yes | `posts.summary` ([source](../src/adminApi/resources/posts.ts)) |
| GET | `/api/admin/v2/profile_fields` | Yes | `profileFields.list` ([source](../src/adminApi/resources/profileFields.ts)) |
| GET | `/api/admin/v2/settings/connect` | Yes | — |
| GET | `/api/admin/v2/space_group_member` | Yes | `spaceGroupMembers.get` ([source](../src/adminApi/resources/spaceGroupMembers.ts)) |
| GET | `/api/admin/v2/space_group_members` | Yes | `spaceGroupMembers.list` ([source](../src/adminApi/resources/spaceGroupMembers.ts)) |
| GET | `/api/admin/v2/space_groups` | Yes | `spaceGroups.list` ([source](../src/adminApi/resources/spaceGroups.ts)) |
| GET | `/api/admin/v2/space_groups/{id}` | Yes | `spaceGroups.get` ([source](../src/adminApi/resources/spaceGroups.ts)) |
| GET | `/api/admin/v2/space_member` | Yes | `spaceMembers.get` ([source](../src/adminApi/resources/spaceMembers.ts)) |
| GET | `/api/admin/v2/space_members` | Yes | `spaceMembers.list` ([source](../src/adminApi/resources/spaceMembers.ts)) |
| GET | `/api/admin/v2/spaces` | Yes | `spaces.list` ([source](../src/adminApi/resources/spaces.ts)) |
| GET | `/api/admin/v2/spaces/{id}` | Yes | `spaces.get` ([source](../src/adminApi/resources/spaces.ts)) |
| GET | `/api/admin/v2/spaces/{space_id}/ai_summaries` | Yes | `spaces.aiSummary` ([source](../src/adminApi/resources/spaces.ts)) |
| GET | `/api/admin/v2/spaces/{space_id}/images/posts` | Yes | `posts.images.list` ([source](../src/adminApi/resources/posts.ts)) |
| GET | `/api/admin/v2/spaces/{space_id}/images/posts/{id}` | Yes | `posts.images.get` ([source](../src/adminApi/resources/posts.ts)) |
| GET | `/api/admin/v2/tagged_members` | Yes | `taggedMembers.list` ([source](../src/adminApi/resources/taggedMembers.ts)) |
| GET | `/api/admin/v2/tagged_members/{id}` | Yes | `taggedMembers.get` ([source](../src/adminApi/resources/taggedMembers.ts)) |
| GET | `/api/admin/v2/tax_setting` | Yes | — |
| GET | `/api/admin/v2/topics` | Yes | `topics.list` ([source](../src/adminApi/resources/topics.ts)) |
| GET | `/api/admin/v2/topics/{id}` | Yes | `topics.get` ([source](../src/adminApi/resources/topics.ts)) |
| GET | `/api/admin/v2/workflows` | Yes | — |
| GET | `/api/admin/v2/workflows/{id}` | Yes | — |
| PATCH | `/api/admin/v2/access_groups/{access_group_id}/content` | Yes | `accessGroups.content.update` ([source](../src/adminApi/resources/accessGroups.ts)) |
| PATCH | `/api/admin/v2/access_groups/{id}/unarchive` | Yes | `accessGroups.unarchive` ([source](../src/adminApi/resources/accessGroups.ts)) |
| PATCH | `/api/admin/v2/community_member_subscriptions/{id}/billing_date` | Yes | `communityMemberSubscriptions.changeBillingDate` ([source](../src/adminApi/resources/communityMemberSubscriptions.ts)) |
| PATCH | `/api/admin/v2/course_lessons/{id}` | Yes | `courses.lessons.update` ([source](../src/adminApi/resources/courses.ts)) |
| PATCH | `/api/admin/v2/filter_kit_controls/{id}` | Yes | — |
| PATCH | `/api/admin/v2/invitation_links/{id}/revoke` | Yes | `invitationLinks.revoke` ([source](../src/adminApi/resources/invitationLinks.ts)) |
| PATCH | `/api/admin/v2/paywall_affiliates/{id}` | Yes | — |
| PATCH | `/api/admin/v2/settings/connect` | Yes | — |
| POST | `/api/admin/v2/access_groups` | Yes | `accessGroups.create` ([source](../src/adminApi/resources/accessGroups.ts)) |
| POST | `/api/admin/v2/access_groups/{access_group_id}/community_members` | Yes | `accessGroups.members.add` ([source](../src/adminApi/resources/accessGroups.ts)) |
| POST | `/api/admin/v2/chat_room_message_imports` | Yes | — |
| POST | `/api/admin/v2/comments` | Yes | `comments.create` ([source](../src/adminApi/resources/comments.ts)) |
| POST | `/api/admin/v2/community_leads` | Yes | — |
| POST | `/api/admin/v2/community_member_charges/export` | Yes | `communityMemberCharges.export` ([source](../src/adminApi/resources/communityMemberCharges.ts)) |
| POST | `/api/admin/v2/community_member_charges/{id}/refund` | Yes | `communityMemberCharges.refund` ([source](../src/adminApi/resources/communityMemberCharges.ts)) |
| POST | `/api/admin/v2/community_member_subscriptions/export` | Yes | `communityMemberSubscriptions.export` ([source](../src/adminApi/resources/communityMemberSubscriptions.ts)) |
| POST | `/api/admin/v2/community_member_subscriptions/{id}/cancel` | Yes | `communityMemberSubscriptions.cancel` ([source](../src/adminApi/resources/communityMemberSubscriptions.ts)) |
| POST | `/api/admin/v2/community_member_subscriptions/{id}/resume` | Yes | `communityMemberSubscriptions.resume` ([source](../src/adminApi/resources/communityMemberSubscriptions.ts)) |
| POST | `/api/admin/v2/community_members` | Yes | `communityMembers.create` ([source](../src/adminApi/resources/communityMembers.ts)) |
| POST | `/api/admin/v2/community_segments` | Yes | `communitySegments.create` ([source](../src/adminApi/resources/communitySegments.ts)) |
| POST | `/api/admin/v2/community_segments/{id}/duplicate` | Yes | `communitySegments.duplicate` ([source](../src/adminApi/resources/communitySegments.ts)) |
| POST | `/api/admin/v2/contacts/{contact_id}/contact_notes` | Yes | — |
| POST | `/api/admin/v2/course_lessons` | Yes | `courses.lessons.create` ([source](../src/adminApi/resources/courses.ts)) |
| POST | `/api/admin/v2/course_sections` | Yes | `courses.sections.create` ([source](../src/adminApi/resources/courses.ts)) |
| POST | `/api/admin/v2/direct_uploads` | Yes | `directUploads.create` ([source](../src/adminApi/resources/directUploads.ts)) |
| POST | `/api/admin/v2/embeds` | Yes | `embeds.create` ([source](../src/adminApi/resources/embeds.ts)) |
| POST | `/api/admin/v2/event_attendees` | Yes | `events.attendees.create` ([source](../src/adminApi/resources/events.ts)) |
| POST | `/api/admin/v2/events` | Yes | `events.events.create` ([source](../src/adminApi/resources/events.ts)) |
| POST | `/api/admin/v2/filter_kit_controls` | Yes | — |
| POST | `/api/admin/v2/flagged_contents` | Yes | `flaggedContents.report` ([source](../src/adminApi/resources/flaggedContents.ts)) |
| POST | `/api/admin/v2/forms/{form_id}/submissions` | Yes | `forms.submissions.create` ([source](../src/adminApi/resources/forms.ts)) |
| POST | `/api/admin/v2/forms/{id}/duplicate` | Yes | `forms.duplicate` ([source](../src/adminApi/resources/forms.ts)) |
| POST | `/api/admin/v2/invitation_links` | Yes | `invitationLinks.create` ([source](../src/adminApi/resources/invitationLinks.ts)) |
| POST | `/api/admin/v2/member_tags` | Yes | `memberTags.create` ([source](../src/adminApi/resources/memberTags.ts)) |
| POST | `/api/admin/v2/messages` | Yes | `messages.create` ([source](../src/adminApi/resources/messages.ts)) |
| POST | `/api/admin/v2/paywall_affiliate_payouts/export` | Yes | — |
| POST | `/api/admin/v2/paywall_affiliate_payouts/mark_paid` | Yes | — |
| POST | `/api/admin/v2/paywall_affiliate_payouts/start` | Yes | — |
| POST | `/api/admin/v2/paywall_affiliates/invite` | Yes | — |
| POST | `/api/admin/v2/paywall_groups` | Yes | — |
| POST | `/api/admin/v2/paywalls/{paywall_id}/member_access_syncs` | Yes | — |
| POST | `/api/admin/v2/posts` | Yes | `posts.create` ([source](../src/adminApi/resources/posts.ts)) |
| POST | `/api/admin/v2/profile_fields` | Yes | `profileFields.create` ([source](../src/adminApi/resources/profileFields.ts)) |
| POST | `/api/admin/v2/space_group_members` | Yes | `spaceGroupMembers.create` ([source](../src/adminApi/resources/spaceGroupMembers.ts)) |
| POST | `/api/admin/v2/space_groups` | Yes | `spaceGroups.create` ([source](../src/adminApi/resources/spaceGroups.ts)) |
| POST | `/api/admin/v2/space_members` | Yes | `spaceMembers.add` ([source](../src/adminApi/resources/spaceMembers.ts)) |
| POST | `/api/admin/v2/spaces` | Yes | `spaces.create` ([source](../src/adminApi/resources/spaces.ts)) |
| POST | `/api/admin/v2/spaces/{space_id}/events/{id}/duplicate` | Yes | `events.events.duplicate` ([source](../src/adminApi/resources/events.ts)) |
| POST | `/api/admin/v2/spaces/{space_id}/images/posts` | Yes | `posts.images.create` ([source](../src/adminApi/resources/posts.ts)) |
| POST | `/api/admin/v2/spaces/{space_id}/images/posts/{id}/duplicate` | Yes | `posts.images.duplicate` ([source](../src/adminApi/resources/posts.ts)) |
| POST | `/api/admin/v2/tagged_members` | Yes | `taggedMembers.create` ([source](../src/adminApi/resources/taggedMembers.ts)) |
| POST | `/api/admin/v2/topics` | Yes | `topics.create` ([source](../src/adminApi/resources/topics.ts)) |
| POST | `/api/admin/v2/workflows/{id}/duplicate` | Yes | — |
| PUT | `/api/admin/v2/access_groups/{id}` | Yes | `accessGroups.update` ([source](../src/adminApi/resources/accessGroups.ts)) |
| PUT | `/api/admin/v2/chat_preferences` | Yes | `chatPreferences.update` ([source](../src/adminApi/resources/chatPreferences.ts)) |
| PUT | `/api/admin/v2/community` | Yes | `community.update` ([source](../src/adminApi/resources/community.ts)) |
| PUT | `/api/admin/v2/community_members/{id}` | Yes | `communityMembers.update` ([source](../src/adminApi/resources/communityMembers.ts)) |
| PUT | `/api/admin/v2/community_members/{id}/ban_member` | Yes | `communityMembers.ban` ([source](../src/adminApi/resources/communityMembers.ts)) |
| PUT | `/api/admin/v2/community_members/{id}/delete_member` | Yes | `communityMembers.delete` ([source](../src/adminApi/resources/communityMembers.ts)) |
| PUT | `/api/admin/v2/community_segments/{id}` | Yes | `communitySegments.update` ([source](../src/adminApi/resources/communitySegments.ts)) |
| PUT | `/api/admin/v2/course_lesson_progress` | Yes | `courses.lessonProgress.update` ([source](../src/adminApi/resources/courses.ts)) |
| PUT | `/api/admin/v2/course_lessons/reorder` | Yes | `courses.lessons.reorder` ([source](../src/adminApi/resources/courses.ts)) |
| PUT | `/api/admin/v2/course_sections/{id}` | Yes | `courses.sections.update` ([source](../src/adminApi/resources/courses.ts)) |
| PUT | `/api/admin/v2/events/{id}` | Yes | `events.events.update` ([source](../src/adminApi/resources/events.ts)) |
| PUT | `/api/admin/v2/forms/{id}` | Yes | `forms.update` ([source](../src/adminApi/resources/forms.ts)) |
| PUT | `/api/admin/v2/invitation_links/{id}` | Yes | `invitationLinks.update` ([source](../src/adminApi/resources/invitationLinks.ts)) |
| PUT | `/api/admin/v2/member_tags/{id}` | Yes | `memberTags.update` ([source](../src/adminApi/resources/memberTags.ts)) |
| PUT | `/api/admin/v2/paywall_groups/{id}` | Yes | — |
| PUT | `/api/admin/v2/paywalls/{id}/archive` | Yes | — |
| PUT | `/api/admin/v2/paywalls/{id}/publish` | Yes | — |
| PUT | `/api/admin/v2/paywalls/{id}/unarchive` | Yes | — |
| PUT | `/api/admin/v2/posts/{id}` | Yes | `posts.update` ([source](../src/adminApi/resources/posts.ts)) |
| PUT | `/api/admin/v2/profile_fields/{id}` | Yes | `profileFields.update` ([source](../src/adminApi/resources/profileFields.ts)) |
| PUT | `/api/admin/v2/profile_fields/{id}/archive` | Yes | `profileFields.archive` ([source](../src/adminApi/resources/profileFields.ts)) |
| PUT | `/api/admin/v2/profile_fields/{id}/unarchive` | Yes | `profileFields.unarchive` ([source](../src/adminApi/resources/profileFields.ts)) |
| PUT | `/api/admin/v2/space_groups/{id}` | Yes | `spaceGroups.update` ([source](../src/adminApi/resources/spaceGroups.ts)) |
| PUT | `/api/admin/v2/spaces/{id}` | Yes | `spaces.update` ([source](../src/adminApi/resources/spaces.ts)) |
| PUT | `/api/admin/v2/tax_setting` | Yes | — |
| PUT | `/api/admin/v2/topics/{id}` | Yes | `topics.update` ([source](../src/adminApi/resources/topics.ts)) |
| PUT | `/api/admin/v2/workflows/{id}/activate` | Yes | — |
| PUT | `/api/admin/v2/workflows/{id}/deactivate` | Yes | — |

## headless-client-v1

Source: https://api-headless.circle.so/api/headless_client/v1/swagger.yaml

Input SHA-256: `0b934fce6204ac8a2664acdf39c70c8e06e9ee67a930310e1655ff439c02a6fc`

| Method | Path | Raw | Named facade |
| --- | --- | --- | --- |
| DELETE | `/api/headless/v1/bookmarks/{id}` | Yes | `bookmarks.delete` ([source](../src/headlessApi/resources/bookmarks.ts)) |
| DELETE | `/api/headless/v1/comments/{comment_id}/replies/{id}` | Yes | `comments.replies.delete` ([source](../src/headlessApi/resources/comments.ts)) |
| DELETE | `/api/headless/v1/comments/{comment_id}/user_likes` | Yes | `comments.likes.delete` ([source](../src/headlessApi/resources/comments.ts)) |
| DELETE | `/api/headless/v1/community_member/deactivate` | Yes | `communityMembers.deactivate` ([source](../src/headlessApi/resources/communityMembers.ts)) |
| DELETE | `/api/headless/v1/cookies` | Yes | `cookies.delete` ([source](../src/headlessApi/resources/cookies.ts)) |
| DELETE | `/api/headless/v1/events/{event_id}/event_attendees` | Yes | `events.attendees.delete` ([source](../src/headlessApi/resources/events.ts)) |
| DELETE | `/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages/{id}` | Yes | `chatRooms.messages.delete` ([source](../src/headlessApi/resources/chatRooms.ts)) |
| DELETE | `/api/headless/v1/notifications/{id}` | Yes | `notifications.delete` ([source](../src/headlessApi/resources/notifications.ts)) |
| DELETE | `/api/headless/v1/posts/{post_id}/comments/{id}` | Yes | `comments.delete` ([source](../src/headlessApi/resources/comments.ts)) |
| DELETE | `/api/headless/v1/posts/{post_id}/post_followers` | Yes | `posts.followers.unfollow` ([source](../src/headlessApi/resources/posts.ts)) |
| DELETE | `/api/headless/v1/posts/{post_id}/post_followers/{id}` | Yes | `posts.followers.remove` ([source](../src/headlessApi/resources/posts.ts)) |
| DELETE | `/api/headless/v1/posts/{post_id}/user_likes` | Yes | `posts.likes.delete` ([source](../src/headlessApi/resources/posts.ts)) |
| DELETE | `/api/headless/v1/reactions` | Yes | `chatRooms.reactions.delete` ([source](../src/headlessApi/resources/chatRooms.ts)) |
| DELETE | `/api/headless/v1/spaces/{space_id}/posts/{id}` | Yes | `posts.delete` ([source](../src/headlessApi/resources/posts.ts)) |
| GET | `/api/headless/v1/advanced_search` | Yes | `search.advanced` ([source](../src/headlessApi/resources/search.ts)) |
| GET | `/api/headless/v1/bookmarks` | Yes | `bookmarks.list` ([source](../src/headlessApi/resources/bookmarks.ts)) |
| GET | `/api/headless/v1/chat_threads` | Yes | `chatThreads.list` ([source](../src/headlessApi/resources/chatThreads.ts)) |
| GET | `/api/headless/v1/chat_threads/unread_chat_threads` | Yes | `chatThreads.unread` ([source](../src/headlessApi/resources/chatThreads.ts)) |
| GET | `/api/headless/v1/chat_threads/{id}` | Yes | `chatThreads.get` ([source](../src/headlessApi/resources/chatThreads.ts)) |
| GET | `/api/headless/v1/comments/{comment_id}/replies` | Yes | `comments.replies.list` ([source](../src/headlessApi/resources/comments.ts)) |
| GET | `/api/headless/v1/comments/{comment_id}/replies/{id}` | Yes | `comments.replies.get` ([source](../src/headlessApi/resources/comments.ts)) |
| GET | `/api/headless/v1/comments/{comment_id}/user_likes` | Yes | `comments.likes.list` ([source](../src/headlessApi/resources/comments.ts)) |
| GET | `/api/headless/v1/community_events` | Yes | `events.list` ([source](../src/headlessApi/resources/events.ts)) |
| GET | `/api/headless/v1/community_links` | Yes | `communityLinks.list` ([source](../src/headlessApi/resources/communityLinks.ts)) |
| GET | `/api/headless/v1/community_member` | Yes | `communityMembers.current` ([source](../src/headlessApi/resources/communityMembers.ts)) |
| GET | `/api/headless/v1/community_members` | Yes | `communityMembers.list` ([source](../src/headlessApi/resources/communityMembers.ts)) |
| GET | `/api/headless/v1/community_members/{community_member_id}/comments` | Yes | `communityMembers.comments` ([source](../src/headlessApi/resources/communityMembers.ts)) |
| GET | `/api/headless/v1/community_members/{community_member_id}/posts` | Yes | `communityMembers.posts` ([source](../src/headlessApi/resources/communityMembers.ts)) |
| GET | `/api/headless/v1/community_members/{community_member_id}/public_profile` | Yes | `communityMembers.publicProfile` ([source](../src/headlessApi/resources/communityMembers.ts)) |
| GET | `/api/headless/v1/community_members/{community_member_id}/spaces` | Yes | `communityMembers.spaces` ([source](../src/headlessApi/resources/communityMembers.ts)) |
| GET | `/api/headless/v1/course_topics` | Yes | `courses.topics.list` ([source](../src/headlessApi/resources/courses.ts)) |
| GET | `/api/headless/v1/courses/{course_id}/lessons/{id}` | Yes | `courses.lessons.get` ([source](../src/headlessApi/resources/courses.ts)) |
| GET | `/api/headless/v1/courses/{course_id}/lessons/{lesson_id}/files` | Yes | `courses.lessons.files` ([source](../src/headlessApi/resources/courses.ts)) |
| GET | `/api/headless/v1/courses/{course_id}/quiz_attempts` | Yes | `courses.quizAttempts.list` ([source](../src/headlessApi/resources/courses.ts)) |
| GET | `/api/headless/v1/courses/{course_id}/sections` | Yes | `courses.sections.list` ([source](../src/headlessApi/resources/courses.ts)) |
| GET | `/api/headless/v1/events/{event_id}/event_attendees` | Yes | `events.attendees.list` ([source](../src/headlessApi/resources/events.ts)) |
| GET | `/api/headless/v1/home` | Yes | `home.list` ([source](../src/headlessApi/resources/home.ts)) |
| GET | `/api/headless/v1/messages` | Yes | `chatRooms.list` ([source](../src/headlessApi/resources/chatRooms.ts)) |
| GET | `/api/headless/v1/messages/unread_chat_rooms` | Yes | `chatRooms.unread` ([source](../src/headlessApi/resources/chatRooms.ts)) |
| GET | `/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages` | Yes | `chatRooms.messages.list` ([source](../src/headlessApi/resources/chatRooms.ts)) |
| GET | `/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages/{id}` | Yes | `chatRooms.messages.get` ([source](../src/headlessApi/resources/chatRooms.ts)) |
| GET | `/api/headless/v1/messages/{chat_room_uuid}/chat_room_participants` | Yes | `chatRooms.participants.list` ([source](../src/headlessApi/resources/chatRooms.ts)) |
| GET | `/api/headless/v1/messages/{uuid}` | Yes | `chatRooms.get` ([source](../src/headlessApi/resources/chatRooms.ts)) |
| GET | `/api/headless/v1/notification_preferences/space_members/{id}` | Yes | `notificationPreferences.getForSpaceMember` ([source](../src/headlessApi/resources/notificationPreferences.ts)) |
| GET | `/api/headless/v1/notification_preferences/{medium}` | Yes | `notificationPreferences.get` ([source](../src/headlessApi/resources/notificationPreferences.ts)) |
| GET | `/api/headless/v1/notifications` | Yes | `notifications.list` ([source](../src/headlessApi/resources/notifications.ts)) |
| GET | `/api/headless/v1/notifications/new_notifications_count` | Yes | `notifications.newCount` ([source](../src/headlessApi/resources/notifications.ts)) |
| GET | `/api/headless/v1/page_profile_fields` | Yes | `pageProfileFields.list` ([source](../src/headlessApi/resources/pageProfileFields.ts)) |
| GET | `/api/headless/v1/posts/{post_id}/comments` | Yes | `comments.list` ([source](../src/headlessApi/resources/comments.ts)) |
| GET | `/api/headless/v1/posts/{post_id}/comments/{id}` | Yes | `comments.get` ([source](../src/headlessApi/resources/comments.ts)) |
| GET | `/api/headless/v1/posts/{post_id}/user_likes` | Yes | `posts.likes.list` ([source](../src/headlessApi/resources/posts.ts)) |
| GET | `/api/headless/v1/quizzes/{quiz_id}/attempts/{id}` | Yes | `quizzes.attempts.get` ([source](../src/headlessApi/resources/quizzes.ts)) |
| GET | `/api/headless/v1/search` | Yes | `search.query` ([source](../src/headlessApi/resources/search.ts)) |
| GET | `/api/headless/v1/space_notification_details` | Yes | `spaces.notificationDetails` ([source](../src/headlessApi/resources/spaces.ts)) |
| GET | `/api/headless/v1/spaces` | Yes | `spaces.list` ([source](../src/headlessApi/resources/spaces.ts)) |
| GET | `/api/headless/v1/spaces/home` | Yes | `spaces.home` ([source](../src/headlessApi/resources/spaces.ts)) |
| GET | `/api/headless/v1/spaces/{id}` | Yes | `spaces.get` ([source](../src/headlessApi/resources/spaces.ts)) |
| GET | `/api/headless/v1/spaces/{space_id}/bookmarks` | Yes | `spaces.bookmarks` ([source](../src/headlessApi/resources/spaces.ts)) |
| GET | `/api/headless/v1/spaces/{space_id}/events/{event_id}/recurring_events` | Yes | `events.recurring.list` ([source](../src/headlessApi/resources/events.ts)) |
| GET | `/api/headless/v1/spaces/{space_id}/posts` | Yes | `posts.list` ([source](../src/headlessApi/resources/posts.ts)) |
| GET | `/api/headless/v1/spaces/{space_id}/posts/{id}` | Yes | `posts.get` ([source](../src/headlessApi/resources/posts.ts)) |
| GET | `/api/headless/v1/spaces/{space_id}/topics` | Yes | `spaces.topics` ([source](../src/headlessApi/resources/spaces.ts)) |
| PATCH | `/api/headless/v1/comments/{comment_id}/replies/{id}` | Yes | `comments.replies.update` ([source](../src/headlessApi/resources/comments.ts)) |
| PATCH | `/api/headless/v1/courses/{course_id}/lessons/{lesson_id}/progress` | Yes | `courses.lessons.updateProgress` ([source](../src/headlessApi/resources/courses.ts)) |
| PATCH | `/api/headless/v1/posts/{post_id}/comments/{id}` | Yes | `comments.update` ([source](../src/headlessApi/resources/comments.ts)) |
| POST | `/api/headless/v1/bookmarks` | Yes | `bookmarks.create` ([source](../src/headlessApi/resources/bookmarks.ts)) |
| POST | `/api/headless/v1/comments/{comment_id}/replies` | Yes | `comments.replies.create` ([source](../src/headlessApi/resources/comments.ts)) |
| POST | `/api/headless/v1/comments/{comment_id}/user_likes` | Yes | `comments.likes.create` ([source](../src/headlessApi/resources/comments.ts)) |
| POST | `/api/headless/v1/cookies` | Yes | `cookies.create` ([source](../src/headlessApi/resources/cookies.ts)) |
| POST | `/api/headless/v1/direct_uploads` | Yes | `directUploads.create` ([source](../src/headlessApi/resources/directUploads.ts)) |
| POST | `/api/headless/v1/events/{event_id}/event_attendees` | Yes | `events.attendees.create` ([source](../src/headlessApi/resources/events.ts)) |
| POST | `/api/headless/v1/flagged_contents` | Yes | `flaggedContents.create` ([source](../src/headlessApi/resources/flaggedContents.ts)) |
| POST | `/api/headless/v1/invitation_links/{token}/join` | Yes | `invitationLinks.join` ([source](../src/headlessApi/resources/invitationLinks.ts)) |
| POST | `/api/headless/v1/live_streams/rooms` | Yes | `liveStreams.createRoom` ([source](../src/headlessApi/resources/liveStreams.ts)) |
| POST | `/api/headless/v1/messages` | Yes | `chatRooms.create` ([source](../src/headlessApi/resources/chatRooms.ts)) |
| POST | `/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages` | Yes | `chatRooms.messages.create` ([source](../src/headlessApi/resources/chatRooms.ts)) |
| POST | `/api/headless/v1/messages/{uuid}/mark_all_as_read` | Yes | `chatRooms.markAllAsRead` ([source](../src/headlessApi/resources/chatRooms.ts)) |
| POST | `/api/headless/v1/notifications/mark_all_as_read` | Yes | `notifications.markAllAsRead` ([source](../src/headlessApi/resources/notifications.ts)) |
| POST | `/api/headless/v1/notifications/reset_new_notifications_count` | Yes | `notifications.resetNewCount` ([source](../src/headlessApi/resources/notifications.ts)) |
| POST | `/api/headless/v1/notifications/{id}/archive` | Yes | `notifications.archive` ([source](../src/headlessApi/resources/notifications.ts)) |
| POST | `/api/headless/v1/notifications/{id}/mark_as_read` | Yes | `notifications.markAsRead` ([source](../src/headlessApi/resources/notifications.ts)) |
| POST | `/api/headless/v1/posts/{post_id}/comments` | Yes | `comments.create` ([source](../src/headlessApi/resources/comments.ts)) |
| POST | `/api/headless/v1/posts/{post_id}/post_followers` | Yes | `posts.followers.follow` ([source](../src/headlessApi/resources/posts.ts)) |
| POST | `/api/headless/v1/posts/{post_id}/user_likes` | Yes | `posts.likes.create` ([source](../src/headlessApi/resources/posts.ts)) |
| POST | `/api/headless/v1/quizzes/{quiz_id}/attempts` | Yes | `quizzes.attempts.create` ([source](../src/headlessApi/resources/quizzes.ts)) |
| POST | `/api/headless/v1/reactions` | Yes | `chatRooms.reactions.create` ([source](../src/headlessApi/resources/chatRooms.ts)) |
| POST | `/api/headless/v1/search/community_members` | Yes | `communityMembers.search` ([source](../src/headlessApi/resources/communityMembers.ts)) |
| POST | `/api/headless/v1/space_members/{id}/mark_as_read` | Yes | `spaceMembers.markAsRead` ([source](../src/headlessApi/resources/spaceMembers.ts)) |
| POST | `/api/headless/v1/spaces/{id}/join` | Yes | `spaces.join` ([source](../src/headlessApi/resources/spaces.ts)) |
| POST | `/api/headless/v1/spaces/{id}/leave` | Yes | `spaces.leave` ([source](../src/headlessApi/resources/spaces.ts)) |
| POST | `/api/headless/v1/spaces/{space_id}/images/posts` | Yes | `posts.images.create` ([source](../src/headlessApi/resources/posts.ts)) |
| POST | `/api/headless/v1/spaces/{space_id}/posts` | Yes | `posts.create` ([source](../src/headlessApi/resources/posts.ts)) |
| PUT | `/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages/{id}` | Yes | `chatRooms.messages.update` ([source](../src/headlessApi/resources/chatRooms.ts)) |
| PUT | `/api/headless/v1/messages/{chat_room_uuid}/chat_room_participants/{id}` | Yes | `chatRooms.participants.update` ([source](../src/headlessApi/resources/chatRooms.ts)) |
| PUT | `/api/headless/v1/notification_preferences/{medium}` | Yes | `notificationPreferences.update` ([source](../src/headlessApi/resources/notificationPreferences.ts)) |
| PUT | `/api/headless/v1/notification_preferences/{notification_preference_medium}/spaces` | Yes | `notificationPreferences.updateForSpaces` ([source](../src/headlessApi/resources/notificationPreferences.ts)) |
| PUT | `/api/headless/v1/notification_preferences/{notification_preference_medium}/spaces/{id}` | Yes | `notificationPreferences.updateForSpace` ([source](../src/headlessApi/resources/notificationPreferences.ts)) |
| PUT | `/api/headless/v1/profile` | Yes | `communityMembers.updateProfile` ([source](../src/headlessApi/resources/communityMembers.ts)) |
| PUT | `/api/headless/v1/quizzes/{quiz_id}/attempts/{id}` | Yes | `quizzes.attempts.update` ([source](../src/headlessApi/resources/quizzes.ts)) |
| PUT | `/api/headless/v1/signup/profile` | Yes | `communityMembers.confirmProfile` ([source](../src/headlessApi/resources/communityMembers.ts)) |
| PUT | `/api/headless/v1/spaces/{space_id}/events/{event_id}/recurring_events/rsvp` | Yes | `events.recurring.rsvp` ([source](../src/headlessApi/resources/events.ts)) |
| PUT | `/api/headless/v1/spaces/{space_id}/images/posts/{id}` | Yes | `posts.images.update` ([source](../src/headlessApi/resources/posts.ts)) |

## headless-auth-v1

Source: https://api-headless.circle.so/api/headless_auth/swagger.yaml

Input SHA-256: `948cdee2b1e04db8c7f1e65240fdfbfa36191b9ce3173406fa63246bbede5368`

| Method | Path | Raw | Named facade |
| --- | --- | --- | --- |
| PATCH | `/api/v1/headless/access_token/refresh` | Yes | `accessToken.refresh` ([source](../src/authApi/resources/accessToken.ts)) |
| POST | `/api/v1/headless/access_token/revoke` | Yes | `accessToken.revoke` ([source](../src/authApi/resources/accessToken.ts)) |
| POST | `/api/v1/headless/auth_token` | Yes | `authToken.create` ([source](../src/authApi/resources/authToken.ts)) |
| POST | `/api/v1/headless/refresh_token/revoke` | Yes | `refreshToken.revoke` ([source](../src/authApi/resources/refreshToken.ts)) |
