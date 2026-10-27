// Synthetic installed-package fixture. No environment credentials or live requests.
import assert from "node:assert/strict";
import { CircleHttpError, CircleNetworkError } from "circleso";
import { createAdmin } from "circleso/admin";
import { createHeadless, richText } from "circleso/headless";

let registrations = 0;
let storageWrites = 0;
let postWrites = 0;
const content = new TextEncoder().encode("synthetic file");
const member = createHeadless({
  accessToken: "synthetic-member",
  retries: { retries: 0 },
  timeoutMs: 5_000,
  fetcher: async (input) => {
    const request = input as Request;
    assert.equal(request.headers.get("authorization"), "Bearer synthetic-member");
    if (request.url.endsWith("/direct_uploads")) {
      registrations++;
      const { blob } = (await request.json()) as { blob: { byte_size: number; checksum: string } };
      assert.equal(blob.byte_size, content.byteLength);
      assert.ok(blob.checksum);
      return Response.json({
        signed_id: "synthetic-signed",
        attachable_sgid: "synthetic-attachable",
        direct_upload: {
          url: "https://storage.example.test/object",
          headers: {
            "Content-Type": "text/plain",
            "Content-MD5": blob.checksum,
          },
        },
      });
    }
    assert.ok(request.url.endsWith("/spaces/42/posts"));
    postWrites++;
    const body = (await request.json()) as { tiptap_body: { attachments: string[] } };
    assert.deepEqual(body.tiptap_body.attachments, ["synthetic-signed"]);
    return Response.json({ id: 7 }, { status: 201 });
  },
});
const uploaded = await member.directUploads.upload(content, {
  key: "",
  filename: "fixture.txt",
  contentType: "text/plain",
  maxBytes: 1024,
  storageFetcher: async (input) => {
    const request = input as Request;
    storageWrites++;
    assert.equal(request.method, "PUT");
    assert.equal(request.credentials, "omit");
    assert.equal(request.redirect, "error");
    assert.equal(request.headers.has("authorization"), false);
    assert.equal(request.headers.has("host"), false);
    assert.equal(request.headers.has("cookie"), false);
    assert.deepEqual(new Uint8Array(await request.arrayBuffer()), content);
    return new Response(null, { status: 200 });
  },
});
const rich = richText.body(
  [
    richText.paragraph(
      richText.text("Synthetic"),
      richText.hardBreak(),
      richText.link("Guide", "https://example.test/guide"),
    ),
  ],
  {
    attachments: [richText.signedAttachment(uploaded.signed_id)],
  },
);
const created = await member.posts.create(42, { name: "Fixture", tiptap_body: rich });
assert.equal(created?.id, 7);
assert.deepEqual([registrations, storageWrites, postWrites], [1, 1, 1]);

let pages = 0;
const admin = createAdmin({
  token: "synthetic-admin",
  timeoutMs: 5_000,
  fetcher: async (input) => {
    const request = input as Request;
    assert.equal(request.headers.get("authorization"), "Token synthetic-admin");
    assert.equal(request.headers.get("host"), "app.circle.so");
    pages++;
    return Response.json({ records: [{ id: pages }], has_next_page: true });
  },
});
const ids = [];
for await (const post of admin.iter.posts({ maxPages: 2, maxItems: 2 })) ids.push(post.id);
assert.deepEqual(ids, [1, 2]);
assert.equal(pages, 2);
const failing = createHeadless({
  accessToken: "synthetic",
  retries: { retries: 0 },
  fetcher: async () =>
    new Response("false", { status: 403, headers: { "content-type": "application/json" } }),
});
await assert.rejects(
  failing.bookmarks.list(),
  (error: unknown) =>
    error instanceof CircleHttpError && error.status === 403 && error.parsedJson === false,
);
const raw = await failing.raw.GET("/api/headless/v1/bookmarks");
assert.equal(raw.response.ok, false);
assert.equal(raw.error, false);
const controller = new AbortController();
const reason = new Error("synthetic cancellation");
controller.abort(reason);
await assert.rejects(
  admin.posts.list({ signal: controller.signal }),
  (error: unknown) => error instanceof CircleNetworkError && error.cause === reason,
);
assert.equal(pages, 2);
console.log(
  "Synthetic documented workflows: bounded admin reads, member upload/storage isolation, rich-text attachment, raw/named errors and cancellation pass",
);
