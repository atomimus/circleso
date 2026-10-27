import {
  type AdminClient,
  type AdminClientConfig,
  createAdminClient,
} from "../clients/adminClient";
import { requireServerRuntime } from "../core/runtime";
import { createAdminOffsetIterators } from "./iterators";
import { createAdminRequester } from "./request";
import { createAccessGroupsResource } from "./resources/accessGroups";
import { createChatPreferencesResource } from "./resources/chatPreferences";
import { createChatRoomMessageImportsResource } from "./resources/chatRoomMessageImports";
import { createCommentsResource } from "./resources/comments";
import { createCommunityResource } from "./resources/community";
import { createCommunityLeadsResource } from "./resources/communityLeads";
import { createCommunityMemberChargesResource } from "./resources/communityMemberCharges";
import { createCommunityMemberSubscriptionsResource } from "./resources/communityMemberSubscriptions";
import { createCommunityMembersResource } from "./resources/communityMembers";
import { createCommunitySegmentsResource } from "./resources/communitySegments";
import { createConnectSettingsResource } from "./resources/connectSettings";
import { createContactNotesResource } from "./resources/contactNotes";
import { createCoursesResource } from "./resources/courses";
import { createDirectUploadsResource } from "./resources/directUploads";
import { createEmbedsResource } from "./resources/embeds";
import { createEventsResource } from "./resources/events";
import { createFilterKitResource } from "./resources/filterKit";
import { createFlaggedContentsResource } from "./resources/flaggedContents";
import { createFormsResource } from "./resources/forms";
import { createGamificationResource } from "./resources/gamification";
import { createInvitationLinksResource } from "./resources/invitationLinks";
import { createLiveRoomsResource } from "./resources/liveRooms";
import { createLocationsResource } from "./resources/locations";
import { createMemberTagsResource } from "./resources/memberTags";
import { createMessagesResource } from "./resources/messages";
import { createPageProfileFieldsResource } from "./resources/pageProfileFields";
import { createPaymentMethodPreferencesResource } from "./resources/paymentMethodPreferences";
import { createPaywallAffiliatePayoutsResource } from "./resources/paywallAffiliatePayouts";
import { createPaywallAffiliatesResource } from "./resources/paywallAffiliates";
import { createPaywallCouponsResource } from "./resources/paywallCoupons";
import { createPaywallGroupsResource } from "./resources/paywallGroups";
import { createPaywallsResource } from "./resources/paywalls";
import { createPostsResource } from "./resources/posts";
import { createProfileFieldsResource } from "./resources/profileFields";
import { createSearchResource } from "./resources/search";
import { createSpaceGroupMembersResource } from "./resources/spaceGroupMembers";
import { createSpaceGroupsResource } from "./resources/spaceGroups";
import { createSpaceMembersResource } from "./resources/spaceMembers";
import { createSpacesResource } from "./resources/spaces";
import { createTaggedMembersResource } from "./resources/taggedMembers";
import { createTaxSettingsResource } from "./resources/taxSettings";
import { createTopicsResource } from "./resources/topics";
import { createWorkflowsResource } from "./resources/workflows";

export type AdminApi = {
  raw: AdminClient;
  iter: ReturnType<typeof createAdminOffsetIterators>;
  accessGroups: ReturnType<typeof createAccessGroupsResource>;
  search: ReturnType<typeof createSearchResource>;
  chatPreferences: ReturnType<typeof createChatPreferencesResource>;
  chatRoomMessageImports: ReturnType<typeof createChatRoomMessageImportsResource>;
  comments: ReturnType<typeof createCommentsResource>;
  community: ReturnType<typeof createCommunityResource>;
  communityLeads: ReturnType<typeof createCommunityLeadsResource>;
  communityMemberCharges: ReturnType<typeof createCommunityMemberChargesResource>;
  communityMemberSubscriptions: ReturnType<typeof createCommunityMemberSubscriptionsResource>;
  communityMembers: ReturnType<typeof createCommunityMembersResource>;
  communitySegments: ReturnType<typeof createCommunitySegmentsResource>;
  connectSettings: ReturnType<typeof createConnectSettingsResource>;
  contactNotes: ReturnType<typeof createContactNotesResource>;
  courses: ReturnType<typeof createCoursesResource>;
  directUploads: ReturnType<typeof createDirectUploadsResource>;
  embeds: ReturnType<typeof createEmbedsResource>;
  events: ReturnType<typeof createEventsResource>;
  flaggedContents: ReturnType<typeof createFlaggedContentsResource>;
  filterKit: ReturnType<typeof createFilterKitResource>;
  forms: ReturnType<typeof createFormsResource>;
  gamification: ReturnType<typeof createGamificationResource>;
  invitationLinks: ReturnType<typeof createInvitationLinksResource>;
  liveRooms: ReturnType<typeof createLiveRoomsResource>;
  locations: ReturnType<typeof createLocationsResource>;
  memberTags: ReturnType<typeof createMemberTagsResource>;
  messages: ReturnType<typeof createMessagesResource>;
  pageProfileFields: ReturnType<typeof createPageProfileFieldsResource>;
  paymentMethodPreferences: ReturnType<typeof createPaymentMethodPreferencesResource>;
  paywallAffiliatePayouts: ReturnType<typeof createPaywallAffiliatePayoutsResource>;
  paywallAffiliates: ReturnType<typeof createPaywallAffiliatesResource>;
  paywallCoupons: ReturnType<typeof createPaywallCouponsResource>;
  paywallGroups: ReturnType<typeof createPaywallGroupsResource>;
  paywalls: ReturnType<typeof createPaywallsResource>;
  posts: ReturnType<typeof createPostsResource>;
  profileFields: ReturnType<typeof createProfileFieldsResource>;
  spaceGroups: ReturnType<typeof createSpaceGroupsResource>;
  spaceGroupMembers: ReturnType<typeof createSpaceGroupMembersResource>;
  spaceMembers: ReturnType<typeof createSpaceMembersResource>;
  spaces: ReturnType<typeof createSpacesResource>;
  taggedMembers: ReturnType<typeof createTaggedMembersResource>;
  taxSettings: ReturnType<typeof createTaxSettingsResource>;
  topics: ReturnType<typeof createTopicsResource>;
  workflows: ReturnType<typeof createWorkflowsResource>;
};

export type AdminApiConfig = AdminClientConfig;

export function createAdmin(config: AdminApiConfig): AdminApi;
export function createAdmin(client: AdminClient): AdminApi;
export function createAdmin(configOrClient: AdminApiConfig | AdminClient): AdminApi {
  requireServerRuntime(
    "Admin API requires 'host' header; use server-side runtime or proxy. Browser/worker callers should use createHeadless with member access tokens.",
  );
  const client = isAdminClient(configOrClient) ? configOrClient : createAdminClient(configOrClient);
  const request = createAdminRequester(client);

  return {
    raw: client,
    iter: createAdminOffsetIterators(request),
    accessGroups: createAccessGroupsResource(request),
    search: createSearchResource(request),
    chatPreferences: createChatPreferencesResource(request),
    chatRoomMessageImports: createChatRoomMessageImportsResource(request),
    comments: createCommentsResource(request),
    community: createCommunityResource(request),
    communityLeads: createCommunityLeadsResource(request),
    communityMemberCharges: createCommunityMemberChargesResource(request),
    communityMemberSubscriptions: createCommunityMemberSubscriptionsResource(request),
    communityMembers: createCommunityMembersResource(request),
    communitySegments: createCommunitySegmentsResource(request),
    connectSettings: createConnectSettingsResource(request),
    contactNotes: createContactNotesResource(request),
    courses: createCoursesResource(request),
    directUploads: createDirectUploadsResource(request),
    embeds: createEmbedsResource(request),
    events: createEventsResource(request),
    flaggedContents: createFlaggedContentsResource(request),
    filterKit: createFilterKitResource(request),
    forms: createFormsResource(request),
    gamification: createGamificationResource(request),
    invitationLinks: createInvitationLinksResource(request),
    liveRooms: createLiveRoomsResource(request),
    locations: createLocationsResource(request),
    memberTags: createMemberTagsResource(request),
    messages: createMessagesResource(request),
    pageProfileFields: createPageProfileFieldsResource(request),
    paymentMethodPreferences: createPaymentMethodPreferencesResource(request),
    paywallAffiliatePayouts: createPaywallAffiliatePayoutsResource(request),
    paywallAffiliates: createPaywallAffiliatesResource(request),
    paywallCoupons: createPaywallCouponsResource(request),
    paywallGroups: createPaywallGroupsResource(request),
    paywalls: createPaywallsResource(request),
    posts: createPostsResource(request),
    profileFields: createProfileFieldsResource(request),
    spaceGroups: createSpaceGroupsResource(request),
    spaceGroupMembers: createSpaceGroupMembersResource(request),
    spaceMembers: createSpaceMembersResource(request),
    spaces: createSpacesResource(request),
    taggedMembers: createTaggedMembersResource(request),
    taxSettings: createTaxSettingsResource(request),
    topics: createTopicsResource(request),
    workflows: createWorkflowsResource(request),
  };
}

function isAdminClient(value: AdminApiConfig | AdminClient): value is AdminClient {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as AdminClient).GET === "function" &&
    typeof (value as AdminClient).POST === "function"
  );
}
