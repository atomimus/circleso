import { expect, it } from "vitest";
import { createHeadless } from "../src/headlessApi";
import type { LiveConfig } from "./integration-policy";
import { type FixtureLedger, integrationWorkflow } from "./integration-workflow";

const config: LiveConfig = {
  baseUrl: "https://dedicated.example.test",
  token: "synthetic",
  memberId: 2,
  communityId: 3,
  spaceId: 4,
  postId: 6,
  writes: true,
};

it.each([
  "success",
  "readonly",
  "wrong-community",
  "existing",
  "uncertain",
  "wrong-owner",
  "cleanup-failure",
])("bounds live fixture ownership and cleanup: %s", async (mode) => {
  const calls: string[] = [];
  const states: string[] = [];
  let owned: number | undefined;
  const member = createHeadless({
    accessToken: "synthetic",
    baseUrl: config.baseUrl,
    retries: { retries: 0 },
    fetcher: async (input) => {
      const request = input as Request;
      const url = new URL(request.url);
      calls.push(`${request.method} ${url.pathname}`);
      if (url.pathname.endsWith("/community_member"))
        return Response.json({ id: 2, bookmarks_count: 0 });
      if (url.pathname.endsWith("/spaces/4"))
        return Response.json({ id: 4, community_id: mode === "wrong-community" ? 9 : 3 });
      if (url.pathname.endsWith("/posts/6")) return Response.json({ id: 6, space: { id: 4 } });
      if (request.method === "GET")
        return Response.json({
          records: mode === "existing" ? [{ id: 99 }] : [],
          has_next_page: false,
        });
      if (request.method === "DELETE")
        return new Response(null, { status: mode === "cleanup-failure" ? 503 : 204 });
      if (mode === "uncertain") throw new TypeError("Synthetic lost response");
      return Response.json(
        {
          id: 7,
          record_id: 6,
          community_id: 3,
          community_member_id: mode === "wrong-owner" ? 9 : 2,
        },
        { status: 201 },
      );
    },
  });
  const selected = { ...config, writes: mode !== "readonly" };
  const ledger: FixtureLedger = { communityId: 3, memberId: 2, state: "read-only" };
  const run = integrationWorkflow(
    member,
    selected,
    ledger,
    async () => {
      states.push(ledger.state);
    },
    (id) => {
      owned = id;
    },
  );
  if (["success", "readonly"].includes(mode)) await run;
  else await expect(run).rejects.toBeDefined();
  const deletes = calls.filter((call) => call.startsWith("DELETE"));
  if (["success", "cleanup-failure"].includes(mode)) {
    expect(owned).toBe(7);
    expect(deletes).toEqual(["DELETE /api/headless/v1/bookmarks/7"]);
    expect(ledger.state).toBe(mode === "success" ? "cleaned" : "cleanup-pending");
  } else {
    expect(owned).toBeUndefined();
    expect(deletes).toEqual([]);
  }
  expect(calls.filter((call) => call.startsWith("POST"))).toHaveLength(
    ["success", "uncertain", "wrong-owner", "cleanup-failure"].includes(mode) ? 1 : 0,
  );
  if (mode === "uncertain") expect(states).toEqual(["creation-uncertain"]);
  if (mode === "wrong-owner")
    expect(ledger).toMatchObject({ bookmarkId: 7, state: "ownership-unverified" });
  if (mode === "readonly") expect(calls).toHaveLength(2);
});
