import type { Middleware } from "openapi-fetch";

/** Serialize member tag filters as the comma-separated values required by Admin V2. */
export function createAdminQueryMiddleware(): Middleware {
  return {
    onRequest({ request, schemaPath }) {
      if (
        request.method !== "GET" ||
        (schemaPath !== "/api/admin/v2/community_members" &&
          schemaPath !== "/api/admin/v2/tagged_members")
      ) {
        return;
      }

      const url = new URL(request.url);
      const memberTagIds = url.searchParams.getAll("member_tag_ids");
      if (memberTagIds.length < 2) {
        return;
      }

      url.searchParams.set("member_tag_ids", memberTagIds.join(","));
      return new Request(url, request);
    },
  };
}
