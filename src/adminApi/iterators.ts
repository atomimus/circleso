import { offsetItems, type PaginationLimits, paginationRequestOptions } from "../core/pagination";
import type { AdminRequester } from "./request";
import type { AdminPath, RequestOptions } from "./types";

type Options<Path extends AdminPath> = RequestOptions<Path, "get"> & PaginationLimits;

export function createAdminOffsetIterators(request: AdminRequester) {
  return {
    /** List Access Group Community Members. Yields records lazily; see docs/pagination.md. */
    accessGroupMembers: (
      accessGroupId: number,
      options: Options<"/api/admin/v2/access_groups/{access_group_id}/community_members"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/access_groups/{access_group_id}/community_members", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { access_group_id: accessGroupId },
          }),
        options,
        100,
      ),
    /** List Access Groups. Yields records lazily; see docs/pagination.md. */
    accessGroups: (options: Options<"/api/admin/v2/access_groups"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/access_groups", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** Advanced Search. Yields records lazily; see docs/pagination.md. */
    advancedSearch: (options: Options<"/api/admin/v2/advanced_search">) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/advanced_search", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List Comments. Yields records lazily; see docs/pagination.md. */
    comments: (options: Options<"/api/admin/v2/comments"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/comments", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** Community Member Charges List. Yields records lazily; see docs/pagination.md. */
    communityMemberCharges: (options: Options<"/api/admin/v2/community_member_charges"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/community_member_charges", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List Community Member Spaces. Yields records lazily; see docs/pagination.md. */
    communityMemberSpaces: (options: Options<"/api/admin/v2/community_member_spaces"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/community_member_spaces", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** Community Member Subscriptions List. Yields records lazily; see docs/pagination.md. */
    communityMemberSubscriptions: (
      options: Options<"/api/admin/v2/community_member_subscriptions"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/community_member_subscriptions", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List Community Member's Access Groups. Yields records lazily; see docs/pagination.md. */
    communityMemberAccessGroups: (
      communityMemberId: number,
      options: Options<"/api/admin/v2/community_members/{community_member_id}/access_groups"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/community_members/{community_member_id}/access_groups", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { community_member_id: communityMemberId },
          }),
        options,
        100,
      ),
    /** List Community Members. Yields records lazily; see docs/pagination.md. */
    communityMembers: (options: Options<"/api/admin/v2/community_members"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/community_members", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List Community Segments. Yields records lazily; see docs/pagination.md. */
    communitySegments: (options: Options<"/api/admin/v2/community_segments"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/community_segments", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List Contact Notes. Yields records lazily; see docs/pagination.md. */
    contactNotes: (
      contactId: string,
      options: Options<"/api/admin/v2/contacts/{contact_id}/contact_notes"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/contacts/{contact_id}/contact_notes", {
            ...paginationRequestOptions(options),
            page: params.page,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { contact_id: contactId },
          }),
        options,
        100,
      ),
    /** List course lessons. Yields records lazily; see docs/pagination.md. */
    courseLessons: (options: Options<"/api/admin/v2/course_lessons"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/course_lessons", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List Course Sections. Yields records lazily; see docs/pagination.md. */
    courseSections: (options: Options<"/api/admin/v2/course_sections"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/course_sections", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List Event Attendees. Yields records lazily; see docs/pagination.md. */
    eventAttendees: (options: Options<"/api/admin/v2/event_attendees">) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/event_attendees", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List Events. Yields records lazily; see docs/pagination.md. */
    events: (options: Options<"/api/admin/v2/events"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/events", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List member directory and member space filter controls. Yields records lazily; see docs/pagination.md. */
    filterKitControls: (options: Options<"/api/admin/v2/filter_kit_controls"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/filter_kit_controls", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List Flagged Contents. Yields records lazily; see docs/pagination.md. */
    flaggedContents: (options: Options<"/api/admin/v2/flagged_contents"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/flagged_contents", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List Forms. Yields records lazily; see docs/pagination.md. */
    forms: (options: Options<"/api/admin/v2/forms"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/forms", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List form submissions. Yields records lazily; see docs/pagination.md. */
    formSubmissions: (
      formId: number,
      options: Options<"/api/admin/v2/forms/{form_id}/submissions"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/forms/{form_id}/submissions", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { form_id: formId },
          }),
        options,
        100,
      ),
    /** List Image Posts. Yields records lazily; see docs/pagination.md. */
    imagePosts: (
      spaceId: number,
      options: Options<"/api/admin/v2/spaces/{space_id}/images/posts"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/spaces/{space_id}/images/posts", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { space_id: spaceId },
          }),
        options,
        100,
      ),
    /** List Invitation Links. Yields records lazily; see docs/pagination.md. */
    invitationLinks: (options: Options<"/api/admin/v2/invitation_links"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/invitation_links", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List Live Rooms. Yields records lazily; see docs/pagination.md. */
    liveRooms: (options: Options<"/api/admin/v2/live/rooms"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/live/rooms", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** Member Tags List. Yields records lazily; see docs/pagination.md. */
    memberTags: (options: Options<"/api/admin/v2/member_tags"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/member_tags", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** Paywall Affiliates List. Yields records lazily; see docs/pagination.md. */
    paywallAffiliates: (options: Options<"/api/admin/v2/paywall_affiliates"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/paywall_affiliates", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** Search Paywalls. Yields records lazily; see docs/pagination.md. */
    paywalls: (options: Options<"/api/admin/v2/paywalls/search"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/paywalls/search", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List Basic Posts. Yields records lazily; see docs/pagination.md. */
    posts: (options: Options<"/api/admin/v2/posts"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/posts", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** Profile Fields List. Yields records lazily; see docs/pagination.md. */
    profileFields: (options: Options<"/api/admin/v2/profile_fields"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/profile_fields", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List Space Group Members. Yields records lazily; see docs/pagination.md. */
    spaceGroupMembers: (options: Options<"/api/admin/v2/space_group_members">) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/space_group_members", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List Space Groups. Yields records lazily; see docs/pagination.md. */
    spaceGroups: (options: Options<"/api/admin/v2/space_groups"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/space_groups", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List Space Members. Yields records lazily; see docs/pagination.md. */
    spaceMembers: (options: Options<"/api/admin/v2/space_members">) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/space_members", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List Spaces. Yields records lazily; see docs/pagination.md. */
    spaces: (options: Options<"/api/admin/v2/spaces"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/spaces", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List Tagged Members. Yields records lazily; see docs/pagination.md. */
    taggedMembers: (options: Options<"/api/admin/v2/tagged_members"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/tagged_members", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List topics. Yields records lazily; see docs/pagination.md. */
    topics: (options: Options<"/api/admin/v2/topics"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/topics", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
    /** List a community's automations/workflows. Yields records lazily; see docs/pagination.md. */
    workflows: (options: Options<"/api/admin/v2/workflows"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/admin/v2/workflows", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
        100,
      ),
  };
}
