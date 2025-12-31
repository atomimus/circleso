import {
  type AdminClient,
  type AdminClientConfig,
  createAdminClient,
} from "../clients/adminClient";
import { createAdminRequester } from "./request";
import { createAccessGroupsResource } from "./resources/accessGroups";
import { createChatPreferencesResource } from "./resources/chatPreferences";
import { createCommentsResource } from "./resources/comments";
import { createCommunityResource } from "./resources/community";
import { createCommunityMembersResource } from "./resources/communityMembers";
import { createCommunitySegmentsResource } from "./resources/communitySegments";
import { createCoursesResource } from "./resources/courses";
import { createDirectUploadsResource } from "./resources/directUploads";
import { createEmbedsResource } from "./resources/embeds";
import { createEventsResource } from "./resources/events";
import { createFlaggedContentsResource } from "./resources/flaggedContents";
import { createFormsResource } from "./resources/forms";
import { createGamificationResource } from "./resources/gamification";
import { createInvitationLinksResource } from "./resources/invitationLinks";
import { createMemberTagsResource } from "./resources/memberTags";
import { createMessagesResource } from "./resources/messages";
import { createPageProfileFieldsResource } from "./resources/pageProfileFields";
import { createPostsResource } from "./resources/posts";
import { createProfileFieldsResource } from "./resources/profileFields";
import { createSearchResource } from "./resources/search";
import { createSpaceGroupMembersResource } from "./resources/spaceGroupMembers";
import { createSpaceGroupsResource } from "./resources/spaceGroups";
import { createSpaceMembersResource } from "./resources/spaceMembers";
import { createSpacesResource } from "./resources/spaces";
import { createTaggedMembersResource } from "./resources/taggedMembers";
import { createTopicsResource } from "./resources/topics";

export type AdminApi = {
  raw: AdminClient;
  accessGroups: ReturnType<typeof createAccessGroupsResource>;
  search: ReturnType<typeof createSearchResource>;
  chatPreferences: ReturnType<typeof createChatPreferencesResource>;
  comments: ReturnType<typeof createCommentsResource>;
  community: ReturnType<typeof createCommunityResource>;
  communityMembers: ReturnType<typeof createCommunityMembersResource>;
  communitySegments: ReturnType<typeof createCommunitySegmentsResource>;
  courses: ReturnType<typeof createCoursesResource>;
  directUploads: ReturnType<typeof createDirectUploadsResource>;
  embeds: ReturnType<typeof createEmbedsResource>;
  events: ReturnType<typeof createEventsResource>;
  flaggedContents: ReturnType<typeof createFlaggedContentsResource>;
  forms: ReturnType<typeof createFormsResource>;
  gamification: ReturnType<typeof createGamificationResource>;
  invitationLinks: ReturnType<typeof createInvitationLinksResource>;
  memberTags: ReturnType<typeof createMemberTagsResource>;
  messages: ReturnType<typeof createMessagesResource>;
  pageProfileFields: ReturnType<typeof createPageProfileFieldsResource>;
  posts: ReturnType<typeof createPostsResource>;
  profileFields: ReturnType<typeof createProfileFieldsResource>;
  spaceGroups: ReturnType<typeof createSpaceGroupsResource>;
  spaceGroupMembers: ReturnType<typeof createSpaceGroupMembersResource>;
  spaceMembers: ReturnType<typeof createSpaceMembersResource>;
  spaces: ReturnType<typeof createSpacesResource>;
  taggedMembers: ReturnType<typeof createTaggedMembersResource>;
  topics: ReturnType<typeof createTopicsResource>;
};

export type AdminApiConfig = AdminClientConfig;

export function createAdmin(config: AdminApiConfig): AdminApi;
export function createAdmin(client: AdminClient): AdminApi;
export function createAdmin(configOrClient: AdminApiConfig | AdminClient): AdminApi {
  const client = isAdminClient(configOrClient) ? configOrClient : createAdminClient(configOrClient);
  const request = createAdminRequester(client);

  return {
    raw: client,
    accessGroups: createAccessGroupsResource(request),
    search: createSearchResource(request),
    chatPreferences: createChatPreferencesResource(request),
    comments: createCommentsResource(request),
    community: createCommunityResource(request),
    communityMembers: createCommunityMembersResource(request),
    communitySegments: createCommunitySegmentsResource(request),
    courses: createCoursesResource(request),
    directUploads: createDirectUploadsResource(request),
    embeds: createEmbedsResource(request),
    events: createEventsResource(request),
    flaggedContents: createFlaggedContentsResource(request),
    forms: createFormsResource(request),
    gamification: createGamificationResource(request),
    invitationLinks: createInvitationLinksResource(request),
    memberTags: createMemberTagsResource(request),
    messages: createMessagesResource(request),
    pageProfileFields: createPageProfileFieldsResource(request),
    posts: createPostsResource(request),
    profileFields: createProfileFieldsResource(request),
    spaceGroups: createSpaceGroupsResource(request),
    spaceGroupMembers: createSpaceGroupMembersResource(request),
    spaceMembers: createSpaceMembersResource(request),
    spaces: createSpacesResource(request),
    taggedMembers: createTaggedMembersResource(request),
    topics: createTopicsResource(request),
  };
}

function isAdminClient(value: AdminApiConfig | AdminClient): value is AdminClient {
  return (
    typeof (value as AdminClient).GET === "function" &&
    typeof (value as AdminClient).POST === "function"
  );
}
