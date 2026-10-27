import assert from "node:assert/strict";
import type { HeadlessApi } from "../src/headlessApi";
import type { LiveConfig } from "./integration-policy";

export type FixtureLedger = {
  communityId: number;
  memberId: number;
  postId?: number;
  state: string;
  bookmarkId?: number;
};

/** Finite, non-financial fixture. Never infer ownership from a failed/uncertain creation. */
export async function integrationWorkflow(
  member: Pick<HeadlessApi, "communityMembers" | "spaces" | "posts" | "bookmarks">,
  config: LiveConfig,
  ledger: FixtureLedger,
  persist: () => Promise<void>,
  claim: (id: number) => void,
): Promise<void> {
  const current = await member.communityMembers.current();
  assert.equal(current?.id, config.memberId, "Test member identity mismatch");
  const space = await member.spaces.get(config.spaceId);
  assert.equal(space?.id, config.spaceId, "Test space mismatch");
  assert.equal(space?.community_id, config.communityId, "Test community mismatch");
  if (!config.writes) return;
  assert.ok(config.postId);
  const post = await member.posts.get(config.spaceId, config.postId);
  assert.equal(post?.id, config.postId);
  assert.ok(
    post && "space" in post && post.space?.id === config.spaceId,
    "Test post space mismatch",
  );
  const existing = await member.bookmarks.list({ page: 1, per_page: 1 });
  assert.equal(current?.bookmarks_count, 0, "Fresh disposable account required");
  assert.ok(
    Array.isArray(existing?.records) &&
      existing.records.length === 0 &&
      existing.has_next_page === false,
    "Existing bookmarks prevent fixture ownership",
  );
  ledger.state = "creation-uncertain";
  await persist();
  let owned: number | undefined;
  try {
    const created = await member.bookmarks.create({
      record_id: config.postId,
      bookmark_type: "post",
    });
    assert.ok(created?.id && Number.isSafeInteger(created.id) && created.id > 0);
    ledger.bookmarkId = created.id;
    ledger.state = "ownership-unverified";
    await persist();
    assert.equal(created.record_id, config.postId);
    assert.equal(created.community_id, config.communityId);
    assert.equal(created.community_member_id, config.memberId);
    owned = created.id;
    claim(owned);
    ledger.state = "owned";
    await persist();
  } finally {
    if (owned !== undefined) {
      ledger.state = "cleanup-pending";
      await persist();
      await member.bookmarks.delete(owned);
      ledger.state = "cleaned";
      await persist();
    }
  }
}
