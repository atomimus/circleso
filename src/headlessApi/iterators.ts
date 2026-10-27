import { offsetItems, type PaginationLimits, paginationRequestOptions } from "../core/pagination";
import type { HeadlessRequester } from "./request";
import type { HeadlessPath, RequestOptions } from "./types";

type Options<Path extends HeadlessPath> = RequestOptions<Path, "get"> & PaginationLimits;

export function createHeadlessOffsetIterators(request: HeadlessRequester) {
  return {
    /** Advanced Search. Yields records lazily; see docs/pagination.md. */
    advancedSearch: (options: Options<"/api/headless/v1/advanced_search">) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/advanced_search", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
      ),
    /** Get bookmarks paginated list. Yields records lazily; see docs/pagination.md. */
    bookmarks: (options: Options<"/api/headless/v1/bookmarks"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/bookmarks", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
      ),
    /** Get chat room participants. Yields records lazily; see docs/pagination.md. */
    chatRoomParticipants: (
      chatRoomUuid: string,
      options: Options<"/api/headless/v1/messages/{chat_room_uuid}/chat_room_participants"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/messages/{chat_room_uuid}/chat_room_participants", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { chat_room_uuid: chatRoomUuid },
          }),
        options,
      ),
    /** Get chat rooms. Yields records lazily; see docs/pagination.md. */
    chatRooms: (options: Options<"/api/headless/v1/messages"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/messages", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
      ),
    /** List chat threads. Yields records lazily; see docs/pagination.md. */
    chatThreads: (options: Options<"/api/headless/v1/chat_threads"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/chat_threads", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
      ),
    /** Get list of comments for a post. Yields records lazily; see docs/pagination.md. */
    postComments: (
      postId: number,
      options: Options<"/api/headless/v1/posts/{post_id}/comments"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/posts/{post_id}/comments", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { post_id: postId },
          }),
        options,
      ),
    /** Get list of community events. Yields records lazily; see docs/pagination.md. */
    events: (options: Options<"/api/headless/v1/community_events"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/community_events", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
      ),
    /** Get paginated list of comments for a community member ID. Yields records lazily; see docs/pagination.md. */
    memberComments: (
      communityMemberId: number,
      options: Options<"/api/headless/v1/community_members/{community_member_id}/comments"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/community_members/{community_member_id}/comments", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { community_member_id: communityMemberId },
          }),
        options,
      ),
    /** Get paginated list of posts for a community member ID. Yields records lazily; see docs/pagination.md. */
    memberPosts: (
      communityMemberId: number,
      options: Options<"/api/headless/v1/community_members/{community_member_id}/posts"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/community_members/{community_member_id}/posts", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { community_member_id: communityMemberId },
          }),
        options,
      ),
    /** Get paginated list of posts for a community member ID. Yields records lazily; see docs/pagination.md. */
    memberSpaces: (
      communityMemberId: number,
      options: Options<"/api/headless/v1/community_members/{community_member_id}/spaces"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/community_members/{community_member_id}/spaces", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { community_member_id: communityMemberId },
          }),
        options,
      ),
    /** Get list of files in a lesson. Yields records lazily; see docs/pagination.md. */
    lessonFiles: (
      courseId: number,
      lessonId: number,
      options: Options<"/api/headless/v1/courses/{course_id}/lessons/{lesson_id}/files"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/courses/{course_id}/lessons/{lesson_id}/files", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { course_id: courseId, lesson_id: lessonId },
          }),
        options,
      ),
    /** Get latest quiz attempts for a course (for admins). Yields records lazily; see docs/pagination.md. */
    quizAttempts: (
      courseId: number,
      options: Options<"/api/headless/v1/courses/{course_id}/quiz_attempts"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/courses/{course_id}/quiz_attempts", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { course_id: courseId },
          }),
        options,
      ),
    /** Get course topics. Yields records lazily; see docs/pagination.md. */
    courseTopics: (options: Options<"/api/headless/v1/course_topics"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/course_topics", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
      ),
    /** List event attendees. Yields records lazily; see docs/pagination.md. */
    eventAttendees: (
      eventId: number,
      options: Options<"/api/headless/v1/events/{event_id}/event_attendees"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/events/{event_id}/event_attendees", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { event_id: eventId },
          }),
        options,
      ),
    /** Get home page posts. Yields records lazily; see docs/pagination.md. */
    home: (options: Options<"/api/headless/v1/home"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/home", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
      ),
    /** Get a paginated list of notifications. Yields records lazily; see docs/pagination.md. */
    notifications: (options: Options<"/api/headless/v1/notifications"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/notifications", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
      ),
    /** Get Page Profile Fields. Yields records lazily; see docs/pagination.md. */
    pageProfileFields: (options: Options<"/api/headless/v1/page_profile_fields">) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/page_profile_fields", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
      ),
    /** Get list of posts in a space. Yields records lazily; see docs/pagination.md. */
    posts: (spaceId: number, options: Options<"/api/headless/v1/spaces/{space_id}/posts"> = {}) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/spaces/{space_id}/posts", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { space_id: spaceId },
          }),
        options,
      ),
    /** List recurring events. Yields records lazily; see docs/pagination.md. */
    recurringEvents: (
      spaceId: number,
      eventId: number,
      options: Options<"/api/headless/v1/spaces/{space_id}/events/{event_id}/recurring_events"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/spaces/{space_id}/events/{event_id}/recurring_events", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { space_id: spaceId, event_id: eventId },
          }),
        options,
      ),
    /** Get list of replies for a comment. Yields records lazily; see docs/pagination.md. */
    commentReplies: (
      commentId: number,
      options: Options<"/api/headless/v1/comments/{comment_id}/replies"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/comments/{comment_id}/replies", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { comment_id: commentId },
          }),
        options,
      ),
    /** Search. Yields records lazily; see docs/pagination.md. */
    search: (options: Options<"/api/headless/v1/search">) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/search", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
          }),
        options,
      ),
    /** Get space bookmarks. Yields records lazily; see docs/pagination.md. */
    spaceBookmarks: (
      spaceId: number,
      options: Options<"/api/headless/v1/spaces/{space_id}/bookmarks"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/spaces/{space_id}/bookmarks", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { space_id: spaceId },
          }),
        options,
      ),
    /** Get space topics. Yields records lazily; see docs/pagination.md. */
    spaceTopics: (
      spaceId: number,
      options: Options<"/api/headless/v1/spaces/{space_id}/topics"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/spaces/{space_id}/topics", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { space_id: spaceId },
          }),
        options,
      ),
    /** Get list of users who liked a comment. Yields records lazily; see docs/pagination.md. */
    commentLikes: (
      commentId: number,
      options: Options<"/api/headless/v1/comments/{comment_id}/user_likes"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/comments/{comment_id}/user_likes", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { comment_id: commentId },
          }),
        options,
      ),
    /** Get list of users who liked a post. Yields records lazily; see docs/pagination.md. */
    postLikes: (
      postId: string,
      options: Options<"/api/headless/v1/posts/{post_id}/user_likes"> = {},
    ) =>
      offsetItems(
        (params) =>
          request.get("/api/headless/v1/posts/{post_id}/user_likes", {
            ...paginationRequestOptions(options),
            page: params.page,
            per_page: params.perPage,
            ...(params.signal !== undefined ? { signal: params.signal } : {}),
            path: { post_id: postId },
          }),
        options,
      ),
  };
}
