import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { type AdminApi, createAdmin } from "./adminApi";
import type { QueryParams as AdminQueryParams } from "./adminApi/types";
import { createAuth } from "./authApi";
import { CircleHttpError } from "./core/errors";
import { HEADER_AUTHORIZATION, HEADER_CONTENT_TYPE, HEADER_REQUEST_ID } from "./core/headers";
import type { components as HeadlessComponents } from "./generated/headless-client-v1";
import { createHeadless, type HeadlessApi } from "./headlessApi";
import type { QueryParams as HeadlessQueryParams, RequestBody } from "./headlessApi/types";

function mockFetch(body: unknown = {}, status = 200) {
  const requests: Request[] = [];
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    requests.push(request.clone());
    const response = new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: {
        [HEADER_CONTENT_TYPE]: "application/json",
        [HEADER_REQUEST_ID]: "request-123",
      },
    });
    Object.defineProperty(response, "url", { value: request.url });
    return response;
  });

  return { fetcher, requests };
}

function requestAt(requests: Request[], index: number): Request {
  const request = requests[index];
  if (!request) {
    throw new Error(`Expected request at index ${index}.`);
  }
  return request;
}

describe("current Admin API contracts", () => {
  it("serializes member tag filters for both resource and raw clients", async () => {
    const { fetcher, requests } = mockFetch({ records: [] });
    const admin = createAdmin({ token: "admin-token", fetcher });

    await admin.communityMembers.list({ status: "active", member_tag_ids: [3, 7], page: 2 });
    await admin.taggedMembers.list({ member_tag_ids: [3, 7] });
    await admin.raw.GET("/api/admin/v2/community_members", {
      params: { query: { member_tag_ids: [3, 7] } },
    });
    await admin.accessGroups.list({ ids: [3, 7] });

    for (const request of requests.slice(0, 3)) {
      expect(new URL(request.url).searchParams.getAll("member_tag_ids")).toEqual(["3,7"]);
      expect(request.headers.get(HEADER_AUTHORIZATION)).toBe("Token admin-token");
    }
    expect(new URL(requestAt(requests, 0).url).searchParams.get("status")).toBe("active");
    expect(new URL(requestAt(requests, 0).url).searchParams.get("page")).toBe("2");
    expect(new URL(requestAt(requests, 3).url).searchParams.getAll("ids")).toEqual(["3", "7"]);
  });

  it("sends updated post, message, and lesson fields as JSON", async () => {
    const { fetcher, requests } = mockFetch();
    const admin = createAdmin({ token: "admin-token", fetcher });
    const richTextBody = { body: { type: "doc", content: [] } };

    await admin.posts.create({ space_id: 1, name: "Post without an HTML body" });
    await admin.messages.create({
      chat_room_uuid: "room-1",
      parent_message_id: 2,
      rich_text_body: richTextBody,
    });
    await admin.courses.lessons.create({
      section_id: 1,
      name: "Lesson",
      rich_text_body: richTextBody,
      featured_media: "signed-video-id",
      thumbnail: "signed-thumbnail-id",
    });

    expect(await requestAt(requests, 0).json()).toEqual({
      space_id: 1,
      name: "Post without an HTML body",
    });
    expect(await requestAt(requests, 1).json()).toEqual({
      chat_room_uuid: "room-1",
      parent_message_id: 2,
      rich_text_body: richTextBody,
    });
    expect(await requestAt(requests, 2).json()).toMatchObject({
      rich_text_body: richTextBody,
      featured_media: "signed-video-id",
      thumbnail: "signed-thumbnail-id",
    });
  });

  it("preserves empty replacement lists and the final course order", async () => {
    const { fetcher, requests } = mockFetch();
    const admin = createAdmin({ token: "admin-token", fetcher });

    await admin.accessGroups.content.update(5, { space_ids: [], space_group_ids: [2] });
    await admin.courses.lessons.reorder({
      space_id: 1,
      new_order: [{ section_id: 2, lesson_ids: [4, 3] }],
    });

    expect(requestAt(requests, 0).url).toBe(
      "https://app.circle.so/api/admin/v2/access_groups/5/content",
    );
    expect(requestAt(requests, 0).method).toBe("PATCH");
    expect(await requestAt(requests, 0).json()).toEqual({ space_ids: [], space_group_ids: [2] });
    expect(requestAt(requests, 1).method).toBe("PUT");
    expect(await requestAt(requests, 1).json()).toEqual({
      space_id: 1,
      new_order: [{ section_id: 2, lesson_ids: [4, 3] }],
    });
  });

  it("supports form submissions and paginated image posts on existing resources", async () => {
    const { fetcher, requests } = mockFetch();
    const admin = createAdmin({ token: "admin-token", fetcher });

    await admin.forms.submissions.create(2, {
      elements: [{ id: 3, value: "Answer" }],
      submission_on_behalf_of: "member@example.com",
    });
    await admin.forms.submissions.list(2, { page: 2, per_page: 10 });
    await admin.posts.images.list(4, { page: 2 });
    await admin.posts.images.get(4, 5);

    expect(await requestAt(requests, 0).json()).toEqual({
      elements: [{ id: 3, value: "Answer" }],
      submission_on_behalf_of: "member@example.com",
    });
    expect(requestAt(requests, 1).url).toBe(
      "https://app.circle.so/api/admin/v2/forms/2/submissions?page=2&per_page=10",
    );
    expect(requestAt(requests, 2).url).toBe(
      "https://app.circle.so/api/admin/v2/spaces/4/images/posts?page=2",
    );
    expect(requestAt(requests, 3).url).toBe(
      "https://app.circle.so/api/admin/v2/spaces/4/images/posts/5",
    );
  });

  it("preserves nullable invitation updates and nested profile field attributes", async () => {
    const { fetcher, requests } = mockFetch();
    const admin = createAdmin({ token: "admin-token", fetcher });

    await admin.invitationLinks.create({ name: "Welcome", access_group_ids: [1] });
    await admin.invitationLinks.update(2, { redirect_space_id: null, paywall: null });
    await admin.profileFields.create({
      profile_field: {
        label: "Department",
        key: "department",
        field_type: "text",
        pages_attributes: [{ name: "signup", visible: true }],
      },
    });
    await admin.profileFields.update(3, { profile_field: { label: "Team" } });
    await admin.profileFields.delete(3);

    expect(await requestAt(requests, 0).json()).toEqual({ name: "Welcome", access_group_ids: [1] });
    expect(await requestAt(requests, 1).json()).toEqual({ redirect_space_id: null, paywall: null });
    expect(await requestAt(requests, 2).json()).toMatchObject({
      profile_field: { pages_attributes: [{ name: "signup", visible: true }] },
    });
    expect(await requestAt(requests, 3).json()).toEqual({ profile_field: { label: "Team" } });
    expect(requestAt(requests, 4).method).toBe("DELETE");
    expect(requestAt(requests, 4).url).toBe("https://app.circle.so/api/admin/v2/profile_fields/3");
    expect(await requestAt(requests, 4).text()).toBe("");
  });

  it("sends attendee deletion as JSON while retaining query-based member removal", async () => {
    const { fetcher, requests } = mockFetch();
    const admin = createAdmin({ token: "admin-token", fetcher });

    await admin.events.attendees.delete({ member_email: "member@example.com", event_id: "1" });
    await admin.spaceMembers.remove({ space_id: 2, email: "member@example.com" });

    expect(new URL(requestAt(requests, 0).url).search).toBe("");
    expect(await requestAt(requests, 0).json()).toEqual({
      member_email: "member@example.com",
      event_id: "1",
    });
    expect(new URL(requestAt(requests, 1).url).searchParams.get("space_id")).toBe("2");
    expect(await requestAt(requests, 1).text()).toBe("");
  });
});

describe("current Headless API contracts", () => {
  it("supports post and comment reaction types and filters", async () => {
    const { fetcher, requests } = mockFetch({ success: true });
    const headless = createHeadless({ accessToken: "access-token", fetcher });

    await headless.posts.likes.create("1", { reaction_type: "celebrate" });
    await headless.comments.likes.create(2, { reaction_type: "insightful" });
    await headless.posts.likes.list("1", { reaction_type: "celebrate", page: 2 });
    await headless.comments.likes.list(2, { reaction_type: "insightful" });
    await headless.posts.likes.create("1");

    expect(await requestAt(requests, 0).json()).toEqual({ reaction_type: "celebrate" });
    expect(await requestAt(requests, 1).json()).toEqual({ reaction_type: "insightful" });
    expect(new URL(requestAt(requests, 2).url).searchParams.get("reaction_type")).toBe("celebrate");
    expect(new URL(requestAt(requests, 3).url).searchParams.get("reaction_type")).toBe(
      "insightful",
    );
    expect(await requestAt(requests, 4).text()).toBe("");
  });

  it.each([
    { unicode: "1f923" },
    { emoji: "heart" },
  ])("sends chat reactions in JSON for creation and deletion: %j", async (reaction) => {
    const { fetcher, requests } = mockFetch(undefined, 204);
    const headless = createHeadless({ accessToken: "access-token", fetcher });
    const body = { chat_room_message: 1, ...reaction };

    await headless.chatRooms.reactions.create(body);
    const result = await headless.chatRooms.reactions.delete(body);

    expect(result).toBeUndefined();
    expect(requests.map((request) => request.method)).toEqual(["POST", "DELETE"]);
    for (const request of requests) {
      expect(new URL(request.url).search).toBe("");
      expect(await request.json()).toEqual(body);
    }
  });

  it("preserves reaction validation details in CircleHttpError", async () => {
    const body = {
      success: false,
      message: "Post cannot be liked",
      error_details: { reaction_type: ["is not included in the list"] },
    };
    const { fetcher } = mockFetch(body, 400);
    const headless = createHeadless({ accessToken: "access-token", fetcher });
    const result = headless.posts.likes.create("1", { reaction_type: "love" });

    await expect(result).rejects.toBeInstanceOf(CircleHttpError);
    await expect(result).rejects.toMatchObject({
      status: 400,
      method: "POST",
      url: "https://app.circle.so/api/headless/v1/posts/1/user_likes",
      requestId: "request-123",
      parsedJson: body,
    });
  });

  it("keeps Auth requests and responses compatible", async () => {
    const { fetcher, requests } = mockFetch({ access_token: "new-access-token" });
    const auth = createAuth({ token: "refresh-token", fetcher });

    const data = await auth.accessToken.refresh({ refresh_token: "refresh-token" });

    expect(data?.access_token).toBe("new-access-token");
    expect(requestAt(requests, 0).method).toBe("PATCH");
    expect(await requestAt(requests, 0).json()).toEqual({ refresh_token: "refresh-token" });
  });
});

describe("public API types", () => {
  it("exposes optional query fields and the new reaction request fields", () => {
    expectTypeOf<
      AdminQueryParams<"/api/admin/v2/community_members", "get">["member_tag_ids"]
    >().toEqualTypeOf<number[] | undefined>();
    expectTypeOf<
      HeadlessQueryParams<"/api/headless/v1/posts/{post_id}/user_likes", "get">["reaction_type"]
    >().toEqualTypeOf<
      "like" | "celebrate" | "love" | "support" | "insightful" | "funny" | undefined
    >();
    expectTypeOf<RequestBody<"/api/headless/v1/reactions", "delete">["unicode"]>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<
      NonNullable<Parameters<HeadlessApi["chatRooms"]["reactions"]["delete"]>[0]>
    >().toExtend<{ chat_room_message: number }>();
    expectTypeOf<Parameters<AdminApi["posts"]["create"]>[0]>().toExtend<{
      space_id: number;
      name: string;
      body?: string;
    }>();
  });

  it("reflects the current response schemas and removed fields", () => {
    type Schemas = HeadlessComponents["schemas"];
    expectTypeOf<Schemas["community_events"]["meta"]["sort"]>().toEqualTypeOf<string>();
    expectTypeOf<"sort">().not.toExtend<keyof Schemas["community_events"]>();
    expectTypeOf<
      Schemas["basic_post"]["reaction_summary"]["counts"]["celebrate"]
    >().toEqualTypeOf<number>();
    expectTypeOf<"exclude_empty_profiles">().not.toExtend<
      keyof RequestBody<"/api/headless/v1/search/community_members", "post">
    >();
  });
});
