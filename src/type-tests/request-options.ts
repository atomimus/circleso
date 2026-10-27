// Compile-only consumer contracts. Never called; checked with exactOptionalPropertyTypes.
import type { AdminApi } from "../admin";
import type { AdminRequester } from "../adminApi/request";
import type { AuthApi } from "../auth";
import type { AuthRequester } from "../authApi/request";
import type { HeadlessApi } from "../headless";
import type { OperationConfig } from "../requestTypes";

export function requests(admin: AdminApi, headless: HeadlessApi, auth: AuthApi) {
  admin.search.advanced({ query: "search" });
  admin.communityMembers.search({ email: "member@example.test" });
  admin.communitySegments.duplicate("segment", { title: "Copy" });
  admin.events.attendees.list({ event_id: "1" });
  admin.events.events.delete(1, { space_id: 2 });
  admin.pageProfileFields.list({ page_name: "signup" });
  admin.spaceGroupMembers.list({ space_group_id: 1 });
  admin.spaceGroupMembers.delete({ email: "member@example.test", space_group_id: 1 });
  admin.spaceGroupMembers.get({ email: "member@example.test", space_group_id: 1 });
  admin.spaceMembers.list({ space_id: 1 });
  admin.spaceMembers.remove({ email: "member@example.test", space_id: 1 });
  admin.spaceMembers.get({ email: "member@example.test", space_id: 1 });
  admin.taggedMembers.delete({ user_email: "member@example.test", member_tag_id: 1 });
  headless.pageProfileFields.list({ page_name: "signup" });
  headless.search.query({ search_text: "search" });
  headless.search.advanced({ query: "search" });
  admin.accessGroups.members.get(1, { email: "member@example.test" });
  admin.accessGroups.members.remove(1, { email: "member@example.test" });
  admin.posts.followers.remove(1, { community_member_id: 2 });
  // @ts-expect-error access group member email is required
  admin.accessGroups.members.get(1);
  // @ts-expect-error access group member email is required
  admin.accessGroups.members.remove(1, {});
  // @ts-expect-error follower member ID is required
  admin.posts.followers.remove(1, {});

  // @ts-expect-error required query options cannot be omitted
  admin.search.advanced();
  // @ts-expect-error required query options cannot be empty
  admin.search.advanced({});
  // @ts-expect-error required query options cannot be omitted
  admin.communityMembers.search();
  // @ts-expect-error required query options cannot be empty
  admin.communityMembers.search({});
  // @ts-expect-error required query options cannot be omitted
  admin.communitySegments.duplicate("segment");
  // @ts-expect-error required query options cannot be empty
  admin.communitySegments.duplicate("segment", {});
  // @ts-expect-error required query options cannot be omitted
  admin.events.attendees.list();
  // @ts-expect-error required query options cannot be empty
  admin.events.attendees.list({});
  // @ts-expect-error required query options cannot be omitted
  admin.events.events.delete(1);
  // @ts-expect-error required query options cannot be empty
  admin.events.events.delete(1, {});
  // @ts-expect-error required query options cannot be omitted
  admin.pageProfileFields.list();
  // @ts-expect-error required query options cannot be empty
  admin.pageProfileFields.list({});
  // @ts-expect-error required query options cannot be omitted
  admin.spaceGroupMembers.list();
  // @ts-expect-error required query options cannot be empty
  admin.spaceGroupMembers.list({});
  // @ts-expect-error required query options cannot be omitted
  admin.spaceGroupMembers.delete();
  // @ts-expect-error email is required alongside the group ID
  admin.spaceGroupMembers.delete({ space_group_id: 1 });
  // @ts-expect-error required query options cannot be omitted
  admin.spaceGroupMembers.get();
  // @ts-expect-error group ID is required alongside email
  admin.spaceGroupMembers.get({ email: "member@example.test" });
  // @ts-expect-error required query options cannot be omitted
  admin.spaceMembers.list();
  // @ts-expect-error required query options cannot be empty
  admin.spaceMembers.list({});
  // @ts-expect-error required query options cannot be omitted
  admin.spaceMembers.remove();
  // @ts-expect-error email is required alongside the space ID
  admin.spaceMembers.remove({ space_id: 1 });
  // @ts-expect-error required query options cannot be omitted
  admin.spaceMembers.get();
  // @ts-expect-error space ID is required alongside email
  admin.spaceMembers.get({ email: "member@example.test" });
  // @ts-expect-error required query options cannot be omitted
  admin.taggedMembers.delete();
  // @ts-expect-error member_tag_id is required alongside email
  admin.taggedMembers.delete({ user_email: "member@example.test" });
  // @ts-expect-error required query options cannot be omitted
  headless.pageProfileFields.list();
  // @ts-expect-error required query options cannot be empty
  headless.pageProfileFields.list({});
  // @ts-expect-error required query options cannot be omitted
  headless.search.query();
  // @ts-expect-error required query options cannot be empty
  headless.search.query({});
  // @ts-expect-error required query options cannot be omitted
  headless.search.advanced();
  // @ts-expect-error required query options cannot be empty
  headless.search.advanced({});

  headless.notificationPreferences.update("in_app", { type: "post_comment", enabled: false });
  headless.notificationPreferences.updateForSpaces("in_app", { choice: "all" });
  headless.notificationPreferences.updateForSpace("in_app", 1, { choice: "all" });
  // @ts-expect-error query fields are required even for PUT
  headless.notificationPreferences.update("in_app", {});
  // @ts-expect-error enabled is a boolean
  headless.notificationPreferences.update("in_app", { type: "all", enabled: "false" });
  // @ts-expect-error choice is required
  headless.notificationPreferences.updateForSpaces("in_app", {});
  // @ts-expect-error choice is required
  headless.notificationPreferences.updateForSpace("in_app", 1, {});

  admin.accessGroups.content.update(1, {});
  // @ts-expect-error an explicit empty options object is required
  admin.accessGroups.content.update(1);
  admin.comments.create({ post_id: 1, body: "flat HTML body" });
  admin.messages.create({ chat_room_uuid: "room", rich_text_body: { body: {} } });
  // @ts-expect-error one message recipient is required
  admin.messages.create({ rich_text_body: { body: {} } });
  headless.chatRooms.reactions.delete({ chat_room_message: 1, unicode: "1f923" });
  // @ts-expect-error required body options cannot be omitted
  headless.chatRooms.reactions.delete();
  // @ts-expect-error required body field cannot be omitted
  headless.chatRooms.reactions.delete({ unicode: "1f923" });
  // @ts-expect-error required upload options cannot be omitted
  headless.directUploads.create();
  // @ts-expect-error blob is required
  headless.directUploads.create({});
  // @ts-expect-error required moderation options cannot be omitted
  headless.flaggedContents.create();
  // @ts-expect-error flagged_content is required
  headless.flaggedContents.create({});

  auth.authToken.create({ email: "member@example.test" });
  auth.authToken.create({ sso_user_id: "sso-user" });
  auth.authToken.create({ community_member_id: 1 });
  auth.accessToken.refresh({ refresh_token: "test-refresh", credentials: "omit" });
  auth.accessToken.revoke({ access_token: "test-access" });
  auth.refreshToken.revoke({ refresh_token: "test-refresh" });
  // @ts-expect-error one identity is required by the auth oneOf
  auth.authToken.create({});
  // @ts-expect-error required auth body cannot be omitted
  auth.accessToken.refresh();
  // @ts-expect-error refresh_token is required
  auth.accessToken.refresh({});
  // @ts-expect-error access_token is required
  auth.accessToken.revoke({});
  // @ts-expect-error refresh_token is required
  auth.refreshToken.revoke({});

  admin.accessGroups.list({
    headers: new Headers(),
    signal: new AbortController().signal,
    credentials: "same-origin",
  });
  // @ts-expect-error unsupported metadata is not a query field
  admin.accessGroups.list({ mode: "cors" });
  // @ts-expect-error credentials is a fetch enum
  admin.accessGroups.list({ credentials: "yes" });
  // @ts-expect-error exactOptionalPropertyTypes requires omission
  admin.accessGroups.list({ credentials: undefined });
  // @ts-expect-error exactOptionalPropertyTypes applies to query fields
  admin.accessGroups.list({ page: undefined });
  // @ts-expect-error exactOptionalPropertyTypes applies to headers
  admin.accessGroups.list({ headers: undefined });
  // @ts-expect-error exactOptionalPropertyTypes applies to signal
  admin.accessGroups.list({ signal: undefined });
  admin.invitationLinks.update(1, { redirect_space_id: null });
  // @ts-expect-error a non-nullable field cannot be null
  admin.communitySegments.duplicate("segment", { title: null });

  admin.raw.POST("/api/admin/v2/community_segments/{id}/duplicate", {
    params: { path: { id: "1" }, query: { title: "Copy" } },
  });
  // @ts-expect-error raw required path/query cannot be omitted
  admin.raw.POST("/api/admin/v2/community_segments/{id}/duplicate");
  admin.raw.POST("/api/admin/v2/community_segments/{id}/duplicate", {
    // @ts-expect-error raw required query cannot be omitted
    params: { path: { id: "1" } },
  });
  // @ts-expect-error raw required path cannot be omitted
  admin.raw.GET("/api/admin/v2/access_groups/{id}");
  // @ts-expect-error raw required JSON body cannot be omitted
  admin.raw.PATCH("/api/admin/v2/access_groups/{access_group_id}/content", {
    params: { path: { access_group_id: 1 } },
  });
  // @ts-expect-error raw required query cannot be omitted
  headless.raw.GET("/api/headless/v1/search");
  // @ts-expect-error raw required path cannot be omitted
  headless.raw.GET("/api/headless/v1/spaces/{id}");
  // @ts-expect-error raw required body cannot be omitted
  auth.raw.PATCH("/api/v1/headless/access_token/refresh");
  // @ts-expect-error raw required field cannot be omitted
  auth.raw.PATCH("/api/v1/headless/access_token/refresh", { body: {} });
  // @ts-expect-error raw auth identity alternatives must not collapse to unknown
  auth.raw.POST("/api/v1/headless/auth_token", { body: {} });
  // @ts-expect-error raw message recipient alternatives must not collapse to unknown
  admin.raw.POST("/api/admin/v2/messages", { body: { rich_text_body: { body: {} } } });
}

type Mixed = {
  parameters: { path: { id: string }; query: { shared: string; filter?: string } };
  requestBody: {
    content: { "application/json": { shared: number; title: string; credentials?: string } };
  };
};

export function mixedRequest(accept: (options: OperationConfig<Mixed>) => void) {
  accept({
    path: { id: "1" },
    filter: "active",
    title: "Title",
    credentials: "omit",
    queryParams: { shared: "query" },
    bodyParams: { shared: 1, credentials: "schema value" },
  });
  // @ts-expect-error overlapping query fields must identify their location
  accept({ path: { id: "1" }, title: "Title", bodyParams: { shared: 1 } });
  // @ts-expect-error overlapping body fields must identify their location
  accept({ path: { id: "1" }, title: "Title", queryParams: { shared: "query" } });
  accept({
    path: { id: "1" },
    title: "Title",
    // @ts-expect-error shared cannot be guessed from a flat value
    shared: "ambiguous",
    queryParams: { shared: "query" },
    bodyParams: { shared: 1 },
  });
  accept({
    path: { id: "1" },
    title: "Title",
    // @ts-expect-error query values retain their own type
    queryParams: { shared: 1 },
    // @ts-expect-error body values retain their own type
    bodyParams: { shared: "query" },
  });
}

export function requesterArguments(admin: AdminRequester, auth: AuthRequester) {
  admin.get("/api/admin/v2/access_groups");
  admin.post("/api/admin/v2/community_segments/{id}/duplicate", {
    path: { id: "1" },
    title: "Copy",
  });
  admin.patch("/api/admin/v2/access_groups/{access_group_id}/content", {
    path: { access_group_id: 1 },
  });
  // @ts-expect-error required path/query requester arguments cannot be omitted
  admin.post("/api/admin/v2/community_segments/{id}/duplicate");
  // @ts-expect-error required query field must be supplied
  admin.post("/api/admin/v2/community_segments/{id}/duplicate", { path: { id: "1" } });
  // @ts-expect-error a requester with a required body requires an options argument
  auth.post("/api/v1/headless/auth_token");
  // @ts-expect-error a required identity field must be supplied
  auth.post("/api/v1/headless/auth_token", {});
}
