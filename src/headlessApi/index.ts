import {
  createHeadlessClient,
  type HeadlessClient,
  type HeadlessClientConfig,
} from "../clients/headlessClient";
import { createHeadlessRequester } from "./request";
import { createBookmarksResource } from "./resources/bookmarks";
import { createChatRoomsResource } from "./resources/chatRooms";
import { createChatThreadsResource } from "./resources/chatThreads";
import { createCommentsResource } from "./resources/comments";
import { createCommunityLinksResource } from "./resources/communityLinks";
import { createCommunityMembersResource } from "./resources/communityMembers";
import { createCookiesResource } from "./resources/cookies";
import { createCoursesResource } from "./resources/courses";
import { createDirectUploadsResource } from "./resources/directUploads";
import { createEventsResource } from "./resources/events";
import { createFlaggedContentsResource } from "./resources/flaggedContents";
import { createHomeResource } from "./resources/home";
import { createInvitationLinksResource } from "./resources/invitationLinks";
import { createLiveStreamsResource } from "./resources/liveStreams";
import { createNotificationPreferencesResource } from "./resources/notificationPreferences";
import { createNotificationsResource } from "./resources/notifications";
import { createPageProfileFieldsResource } from "./resources/pageProfileFields";
import { createPostsResource } from "./resources/posts";
import { createQuizzesResource } from "./resources/quizzes";
import { createSearchResource } from "./resources/search";
import { createSpaceMembersResource } from "./resources/spaceMembers";
import { createSpacesResource } from "./resources/spaces";

export type HeadlessApi = {
  raw: HeadlessClient;
  iter: HeadlessClient["iter"];
  search: ReturnType<typeof createSearchResource>;
  bookmarks: ReturnType<typeof createBookmarksResource>;
  chatRooms: ReturnType<typeof createChatRoomsResource>;
  chatThreads: ReturnType<typeof createChatThreadsResource>;
  comments: ReturnType<typeof createCommentsResource>;
  communityLinks: ReturnType<typeof createCommunityLinksResource>;
  communityMembers: ReturnType<typeof createCommunityMembersResource>;
  cookies: ReturnType<typeof createCookiesResource>;
  courses: ReturnType<typeof createCoursesResource>;
  directUploads: ReturnType<typeof createDirectUploadsResource>;
  events: ReturnType<typeof createEventsResource>;
  flaggedContents: ReturnType<typeof createFlaggedContentsResource>;
  home: ReturnType<typeof createHomeResource>;
  invitationLinks: ReturnType<typeof createInvitationLinksResource>;
  liveStreams: ReturnType<typeof createLiveStreamsResource>;
  notificationPreferences: ReturnType<typeof createNotificationPreferencesResource>;
  notifications: ReturnType<typeof createNotificationsResource>;
  pageProfileFields: ReturnType<typeof createPageProfileFieldsResource>;
  posts: ReturnType<typeof createPostsResource>;
  quizzes: ReturnType<typeof createQuizzesResource>;
  spaceMembers: ReturnType<typeof createSpaceMembersResource>;
  spaces: ReturnType<typeof createSpacesResource>;
};

export type HeadlessApiConfig = HeadlessClientConfig;

export function createHeadless(config: HeadlessApiConfig): HeadlessApi;
export function createHeadless(client: HeadlessClient): HeadlessApi;
export function createHeadless(configOrClient: HeadlessApiConfig | HeadlessClient): HeadlessApi {
  const client = isHeadlessClient(configOrClient)
    ? configOrClient
    : createHeadlessClient(configOrClient);
  const request = createHeadlessRequester(client);

  return {
    raw: client,
    iter: client.iter,
    search: createSearchResource(request),
    bookmarks: createBookmarksResource(request),
    chatRooms: createChatRoomsResource(request),
    chatThreads: createChatThreadsResource(request),
    comments: createCommentsResource(request),
    communityLinks: createCommunityLinksResource(request),
    communityMembers: createCommunityMembersResource(request),
    cookies: createCookiesResource(request),
    courses: createCoursesResource(request),
    directUploads: createDirectUploadsResource(request),
    events: createEventsResource(request),
    flaggedContents: createFlaggedContentsResource(request),
    home: createHomeResource(request),
    invitationLinks: createInvitationLinksResource(request),
    liveStreams: createLiveStreamsResource(request),
    notificationPreferences: createNotificationPreferencesResource(request),
    notifications: createNotificationsResource(request),
    pageProfileFields: createPageProfileFieldsResource(request),
    posts: createPostsResource(request),
    quizzes: createQuizzesResource(request),
    spaceMembers: createSpaceMembersResource(request),
    spaces: createSpacesResource(request),
  };
}

function isHeadlessClient(value: HeadlessApiConfig | HeadlessClient): value is HeadlessClient {
  return (
    typeof (value as HeadlessClient).GET === "function" &&
    typeof (value as HeadlessClient).POST === "function"
  );
}
