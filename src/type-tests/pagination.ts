// Compile only; all values and routes are synthetic.
import type { AdminApi } from "../admin";
import type { paths as AdminPaths } from "../generated/admin-v2";
import type { paths as MemberPaths } from "../generated/headless-client-v1";
import type { HeadlessApi } from "../headless";
import type { OperationResponse } from "../requestTypes";

type Item<T> = T extends AsyncIterable<infer R> ? R : never;
type RecordItem<T> =
  NonNullable<T> extends { records?: infer R }
    ? NonNullable<R> extends (infer V)[]
      ? V
      : never
    : never;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
export function paginationContracts(admin: AdminApi, member: HeadlessApi) {
  const items0 = admin.iter.accessGroupMembers(42, { maxPages: 2, maxItems: 3 });
  const exact0: Equal<
    Item<typeof items0>,
    RecordItem<
      OperationResponse<
        AdminPaths["/api/admin/v2/access_groups/{access_group_id}/community_members"]["get"]
      >
    >
  > = true;
  void exact0;
  const items1 = admin.iter.accessGroups({ maxPages: 2, maxItems: 3 });
  const exact1: Equal<
    Item<typeof items1>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/access_groups"]["get"]>>
  > = true;
  void exact1;
  const items2 = admin.iter.advancedSearch({ query: "synthetic", maxPages: 2, maxItems: 3 });
  const exact2: Equal<
    Item<typeof items2>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/advanced_search"]["get"]>>
  > = true;
  void exact2;
  const items3 = admin.iter.comments({ maxPages: 2, maxItems: 3 });
  const exact3: Equal<
    Item<typeof items3>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/comments"]["get"]>>
  > = true;
  void exact3;
  const items4 = admin.iter.communityMemberCharges({ maxPages: 2, maxItems: 3 });
  const exact4: Equal<
    Item<typeof items4>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/community_member_charges"]["get"]>>
  > = true;
  void exact4;
  const items5 = admin.iter.communityMemberSpaces({ maxPages: 2, maxItems: 3 });
  const exact5: Equal<
    Item<typeof items5>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/community_member_spaces"]["get"]>>
  > = true;
  void exact5;
  const items6 = admin.iter.communityMemberSubscriptions({ maxPages: 2, maxItems: 3 });
  const exact6: Equal<
    Item<typeof items6>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/community_member_subscriptions"]["get"]>>
  > = true;
  void exact6;
  const items7 = admin.iter.communityMemberAccessGroups(42, { maxPages: 2, maxItems: 3 });
  const exact7: Equal<
    Item<typeof items7>,
    RecordItem<
      OperationResponse<
        AdminPaths["/api/admin/v2/community_members/{community_member_id}/access_groups"]["get"]
      >
    >
  > = true;
  void exact7;
  const items8 = admin.iter.communityMembers({ maxPages: 2, maxItems: 3 });
  const exact8: Equal<
    Item<typeof items8>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/community_members"]["get"]>>
  > = true;
  void exact8;
  const items9 = admin.iter.communitySegments({ maxPages: 2, maxItems: 3 });
  const exact9: Equal<
    Item<typeof items9>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/community_segments"]["get"]>>
  > = true;
  void exact9;
  const items10 = admin.iter.contactNotes("synthetic", { maxPages: 2, maxItems: 3 });
  const exact10: Equal<
    Item<typeof items10>,
    RecordItem<
      OperationResponse<AdminPaths["/api/admin/v2/contacts/{contact_id}/contact_notes"]["get"]>
    >
  > = true;
  void exact10;
  const items11 = admin.iter.courseLessons({ maxPages: 2, maxItems: 3 });
  const exact11: Equal<
    Item<typeof items11>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/course_lessons"]["get"]>>
  > = true;
  void exact11;
  const items12 = admin.iter.courseSections({ maxPages: 2, maxItems: 3 });
  const exact12: Equal<
    Item<typeof items12>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/course_sections"]["get"]>>
  > = true;
  void exact12;
  const items13 = admin.iter.eventAttendees({ event_id: "42", maxPages: 2, maxItems: 3 });
  const exact13: Equal<
    Item<typeof items13>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/event_attendees"]["get"]>>
  > = true;
  void exact13;
  const items14 = admin.iter.events({ maxPages: 2, maxItems: 3 });
  const exact14: Equal<
    Item<typeof items14>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/events"]["get"]>>
  > = true;
  void exact14;
  const items15 = admin.iter.filterKitControls({ maxPages: 2, maxItems: 3 });
  const exact15: Equal<
    Item<typeof items15>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/filter_kit_controls"]["get"]>>
  > = true;
  void exact15;
  const items16 = admin.iter.flaggedContents({ maxPages: 2, maxItems: 3 });
  const exact16: Equal<
    Item<typeof items16>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/flagged_contents"]["get"]>>
  > = true;
  void exact16;
  const items17 = admin.iter.forms({ maxPages: 2, maxItems: 3 });
  const exact17: Equal<
    Item<typeof items17>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/forms"]["get"]>>
  > = true;
  void exact17;
  const items18 = admin.iter.formSubmissions(42, { maxPages: 2, maxItems: 3 });
  const exact18: Equal<
    Item<typeof items18>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/forms/{form_id}/submissions"]["get"]>>
  > = true;
  void exact18;
  const items19 = admin.iter.imagePosts(42, { maxPages: 2, maxItems: 3 });
  const exact19: Equal<
    Item<typeof items19>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/spaces/{space_id}/images/posts"]["get"]>>
  > = true;
  void exact19;
  const items20 = admin.iter.invitationLinks({ maxPages: 2, maxItems: 3 });
  const exact20: Equal<
    Item<typeof items20>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/invitation_links"]["get"]>>
  > = true;
  void exact20;
  const items21 = admin.iter.liveRooms({ maxPages: 2, maxItems: 3 });
  const exact21: Equal<
    Item<typeof items21>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/live/rooms"]["get"]>>
  > = true;
  void exact21;
  const items22 = admin.iter.memberTags({ maxPages: 2, maxItems: 3 });
  const exact22: Equal<
    Item<typeof items22>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/member_tags"]["get"]>>
  > = true;
  void exact22;
  const items23 = admin.iter.paywallAffiliates({ maxPages: 2, maxItems: 3 });
  const exact23: Equal<
    Item<typeof items23>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/paywall_affiliates"]["get"]>>
  > = true;
  void exact23;
  const items24 = admin.iter.paywalls({ maxPages: 2, maxItems: 3 });
  const exact24: Equal<
    Item<typeof items24>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/paywalls/search"]["get"]>>
  > = true;
  void exact24;
  const items25 = admin.iter.posts({ maxPages: 2, maxItems: 3 });
  const exact25: Equal<
    Item<typeof items25>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/posts"]["get"]>>
  > = true;
  void exact25;
  const items26 = admin.iter.profileFields({ maxPages: 2, maxItems: 3 });
  const exact26: Equal<
    Item<typeof items26>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/profile_fields"]["get"]>>
  > = true;
  void exact26;
  const items27 = admin.iter.spaceGroupMembers({ space_group_id: 42, maxPages: 2, maxItems: 3 });
  const exact27: Equal<
    Item<typeof items27>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/space_group_members"]["get"]>>
  > = true;
  void exact27;
  const items28 = admin.iter.spaceGroups({ maxPages: 2, maxItems: 3 });
  const exact28: Equal<
    Item<typeof items28>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/space_groups"]["get"]>>
  > = true;
  void exact28;
  const items29 = admin.iter.spaceMembers({ space_id: 42, maxPages: 2, maxItems: 3 });
  const exact29: Equal<
    Item<typeof items29>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/space_members"]["get"]>>
  > = true;
  void exact29;
  const items30 = admin.iter.spaces({ maxPages: 2, maxItems: 3 });
  const exact30: Equal<
    Item<typeof items30>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/spaces"]["get"]>>
  > = true;
  void exact30;
  const items31 = admin.iter.taggedMembers({ maxPages: 2, maxItems: 3 });
  const exact31: Equal<
    Item<typeof items31>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/tagged_members"]["get"]>>
  > = true;
  void exact31;
  const items32 = admin.iter.topics({ maxPages: 2, maxItems: 3 });
  const exact32: Equal<
    Item<typeof items32>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/topics"]["get"]>>
  > = true;
  void exact32;
  const items33 = admin.iter.workflows({ maxPages: 2, maxItems: 3 });
  const exact33: Equal<
    Item<typeof items33>,
    RecordItem<OperationResponse<AdminPaths["/api/admin/v2/workflows"]["get"]>>
  > = true;
  void exact33;
  const items34 = member.iter.advancedSearch({ query: "synthetic", maxPages: 2, maxItems: 3 });
  const exact34: Equal<
    Item<typeof items34>,
    RecordItem<OperationResponse<MemberPaths["/api/headless/v1/advanced_search"]["get"]>>
  > = true;
  void exact34;
  const items35 = member.iter.bookmarks({ maxPages: 2, maxItems: 3 });
  const exact35: Equal<
    Item<typeof items35>,
    RecordItem<OperationResponse<MemberPaths["/api/headless/v1/bookmarks"]["get"]>>
  > = true;
  void exact35;
  const items36 = member.iter.chatRoomParticipants("synthetic", { maxPages: 2, maxItems: 3 });
  const exact36: Equal<
    Item<typeof items36>,
    RecordItem<
      OperationResponse<
        MemberPaths["/api/headless/v1/messages/{chat_room_uuid}/chat_room_participants"]["get"]
      >
    >
  > = true;
  void exact36;
  const items37 = member.iter.chatRooms({ maxPages: 2, maxItems: 3 });
  const exact37: Equal<
    Item<typeof items37>,
    RecordItem<OperationResponse<MemberPaths["/api/headless/v1/messages"]["get"]>>
  > = true;
  void exact37;
  const items38 = member.iter.chatThreads({ maxPages: 2, maxItems: 3 });
  const exact38: Equal<
    Item<typeof items38>,
    RecordItem<OperationResponse<MemberPaths["/api/headless/v1/chat_threads"]["get"]>>
  > = true;
  void exact38;
  const items39 = member.iter.postComments(42, { maxPages: 2, maxItems: 3 });
  const exact39: Equal<
    Item<typeof items39>,
    RecordItem<OperationResponse<MemberPaths["/api/headless/v1/posts/{post_id}/comments"]["get"]>>
  > = true;
  void exact39;
  const items40 = member.iter.events({ maxPages: 2, maxItems: 3 });
  const exact40: Equal<
    Item<typeof items40>,
    RecordItem<OperationResponse<MemberPaths["/api/headless/v1/community_events"]["get"]>>
  > = true;
  void exact40;
  const items41 = member.iter.memberComments(42, { maxPages: 2, maxItems: 3 });
  const exact41: Equal<
    Item<typeof items41>,
    RecordItem<
      OperationResponse<
        MemberPaths["/api/headless/v1/community_members/{community_member_id}/comments"]["get"]
      >
    >
  > = true;
  void exact41;
  const items42 = member.iter.memberPosts(42, { maxPages: 2, maxItems: 3 });
  const exact42: Equal<
    Item<typeof items42>,
    RecordItem<
      OperationResponse<
        MemberPaths["/api/headless/v1/community_members/{community_member_id}/posts"]["get"]
      >
    >
  > = true;
  void exact42;
  const items43 = member.iter.memberSpaces(42, { maxPages: 2, maxItems: 3 });
  const exact43: Equal<
    Item<typeof items43>,
    RecordItem<
      OperationResponse<
        MemberPaths["/api/headless/v1/community_members/{community_member_id}/spaces"]["get"]
      >
    >
  > = true;
  void exact43;
  const items44 = member.iter.lessonFiles(42, 42, { maxPages: 2, maxItems: 3 });
  const exact44: Equal<
    Item<typeof items44>,
    RecordItem<
      OperationResponse<
        MemberPaths["/api/headless/v1/courses/{course_id}/lessons/{lesson_id}/files"]["get"]
      >
    >
  > = true;
  void exact44;
  const items45 = member.iter.quizAttempts(42, { maxPages: 2, maxItems: 3 });
  const exact45: Equal<
    Item<typeof items45>,
    RecordItem<
      OperationResponse<MemberPaths["/api/headless/v1/courses/{course_id}/quiz_attempts"]["get"]>
    >
  > = true;
  void exact45;
  const items46 = member.iter.courseTopics({ maxPages: 2, maxItems: 3 });
  const exact46: Equal<
    Item<typeof items46>,
    RecordItem<OperationResponse<MemberPaths["/api/headless/v1/course_topics"]["get"]>>
  > = true;
  void exact46;
  const items47 = member.iter.eventAttendees(42, { maxPages: 2, maxItems: 3 });
  const exact47: Equal<
    Item<typeof items47>,
    RecordItem<
      OperationResponse<MemberPaths["/api/headless/v1/events/{event_id}/event_attendees"]["get"]>
    >
  > = true;
  void exact47;
  const items48 = member.iter.home({ maxPages: 2, maxItems: 3 });
  const exact48: Equal<
    Item<typeof items48>,
    RecordItem<OperationResponse<MemberPaths["/api/headless/v1/home"]["get"]>>
  > = true;
  void exact48;
  const items49 = member.iter.notifications({ maxPages: 2, maxItems: 3 });
  const exact49: Equal<
    Item<typeof items49>,
    RecordItem<OperationResponse<MemberPaths["/api/headless/v1/notifications"]["get"]>>
  > = true;
  void exact49;
  const items50 = member.iter.pageProfileFields({ page_name: "signup", maxPages: 2, maxItems: 3 });
  const exact50: Equal<
    Item<typeof items50>,
    RecordItem<OperationResponse<MemberPaths["/api/headless/v1/page_profile_fields"]["get"]>>
  > = true;
  void exact50;
  const items51 = member.iter.posts(42, { maxPages: 2, maxItems: 3 });
  const exact51: Equal<
    Item<typeof items51>,
    RecordItem<OperationResponse<MemberPaths["/api/headless/v1/spaces/{space_id}/posts"]["get"]>>
  > = true;
  void exact51;
  const items52 = member.iter.recurringEvents(42, 42, { maxPages: 2, maxItems: 3 });
  const exact52: Equal<
    Item<typeof items52>,
    RecordItem<
      OperationResponse<
        MemberPaths["/api/headless/v1/spaces/{space_id}/events/{event_id}/recurring_events"]["get"]
      >
    >
  > = true;
  void exact52;
  const items53 = member.iter.commentReplies(42, { maxPages: 2, maxItems: 3 });
  const exact53: Equal<
    Item<typeof items53>,
    RecordItem<
      OperationResponse<MemberPaths["/api/headless/v1/comments/{comment_id}/replies"]["get"]>
    >
  > = true;
  void exact53;
  const items54 = member.iter.search({ search_text: "synthetic", maxPages: 2, maxItems: 3 });
  const exact54: Equal<
    Item<typeof items54>,
    RecordItem<OperationResponse<MemberPaths["/api/headless/v1/search"]["get"]>>
  > = true;
  void exact54;
  const items55 = member.iter.spaceBookmarks(42, { maxPages: 2, maxItems: 3 });
  const exact55: Equal<
    Item<typeof items55>,
    RecordItem<
      OperationResponse<MemberPaths["/api/headless/v1/spaces/{space_id}/bookmarks"]["get"]>
    >
  > = true;
  void exact55;
  const items56 = member.iter.spaceTopics(42, { maxPages: 2, maxItems: 3 });
  const exact56: Equal<
    Item<typeof items56>,
    RecordItem<OperationResponse<MemberPaths["/api/headless/v1/spaces/{space_id}/topics"]["get"]>>
  > = true;
  void exact56;
  const items57 = member.iter.commentLikes(42, { maxPages: 2, maxItems: 3 });
  const exact57: Equal<
    Item<typeof items57>,
    RecordItem<
      OperationResponse<MemberPaths["/api/headless/v1/comments/{comment_id}/user_likes"]["get"]>
    >
  > = true;
  void exact57;
  const items58 = member.iter.postLikes("synthetic", { maxPages: 2, maxItems: 3 });
  const exact58: Equal<
    Item<typeof items58>,
    RecordItem<OperationResponse<MemberPaths["/api/headless/v1/posts/{post_id}/user_likes"]["get"]>>
  > = true;
  void exact58;
  const directory = member.iter.communityMembers({ search_after: [1, "a"], maxItems: 2 });
  const search = member.iter.communityMemberSearch({
    filters: [{ key: "role", value: "Member" }],
    search_after: ["a"],
  });
  const chat = member.raw.iter.chatRoomMessages("synthetic", {
    direction: "next",
    signal: new AbortController().signal,
  });
  const preciseDirectory: Equal<
    Item<typeof directory>,
    RecordItem<OperationResponse<MemberPaths["/api/headless/v1/community_members"]["get"]>>
  > = true;
  const preciseSearch: Equal<
    Item<typeof search>,
    RecordItem<OperationResponse<MemberPaths["/api/headless/v1/search/community_members"]["post"]>>
  > = true;
  const preciseChat: Equal<
    Item<typeof chat>,
    RecordItem<
      OperationResponse<
        MemberPaths["/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages"]["get"]
      >
    >
  > = true;
  void [preciseDirectory, preciseSearch, preciseChat];
  // @ts-expect-error required advanced search query
  admin.iter.advancedSearch();
  // @ts-expect-error required event ID
  admin.iter.eventAttendees({});
  // @ts-expect-error required space ID
  admin.iter.spaceMembers({});
  // @ts-expect-error required space group ID
  admin.iter.spaceGroupMembers({});
  // @ts-expect-error page-profile fields retain their required page name
  member.iter.pageProfileFields({});
  // @ts-expect-error required search text
  member.iter.search({});
  // @ts-expect-error contact IDs are strings
  admin.iter.contactNotes(42);
  // @ts-expect-error form IDs are numeric
  admin.iter.formSubmissions("synthetic");
  // @ts-expect-error no undocumented page size on contact notes
  admin.iter.contactNotes("synthetic", { per_page: 20 });
  // @ts-expect-error chat directions are exact
  member.iter.chatRoomMessages("synthetic", { direction: "left" });
  // @ts-expect-error POST search request cursor remains string-only
  member.iter.communityMemberSearch({ search_after: [1] });
  // @ts-expect-error cursor scans cannot combine offset pages
  member.iter.communityMembers({ page: 3 });
  // @ts-expect-error invalid Member sort enum
  member.iter.communityMembers({ sort: "random" });
  // @ts-expect-error unknown query fields do not leak into iterator options
  admin.iter.posts({ invented: true });
}
