import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";

export async function fixture(compose) {
  const cert = await readFile(process.env.CIRCLE_FIXTURE_CERT);
  const key = await readFile(process.env.CIRCLE_FIXTURE_KEY);
  let refreshes = 0;
  let uploads = 0;
  const storage = createHttpsServer({ cert, key }, async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    assert.equal(request.method, "PUT");
    assert.equal(Buffer.concat(chunks).toString(), "abc");
    assert.equal(request.headers["content-md5"], "kAFQmDzST7DWlj99KOF/cg==");
    assert.equal(request.headers.authorization, undefined);
    assert.equal(request.headers.cookie, undefined);
    uploads++;
    response.writeHead(204);
    response.end();
  });
  await new Promise((resolve) => storage.listen(0, "127.0.0.1", resolve));
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined;
    const url = new URL(request.url, "http://localhost");
    response.setHeader("Content-Type", "application/json");
    if (url.pathname.includes("/admin/")) {
      assert.equal(request.headers.authorization, "Token synthetic-admin");
      response.end('{"records":[]}');
    } else if (url.pathname.endsWith("/auth_token")) {
      assert.equal(request.headers.authorization, "Bearer synthetic-application");
      assert.equal(body.community_member_id, 2);
      response.end('{"access_token":"synthetic-expired","refresh_token":"synthetic-refresh"}');
    } else if (url.pathname.endsWith("/refresh")) {
      refreshes++;
      assert.equal(request.headers.authorization, "Bearer synthetic-application");
      assert.deepEqual(body, { refresh_token: "synthetic-refresh" });
      response.end('{"access_token":"synthetic-new"}');
    } else if (request.headers.authorization === "Bearer synthetic-expired") {
      response.writeHead(401);
      response.end('{"message":"Synthetic expired"}');
    } else {
      assert.equal(request.headers.authorization, "Bearer synthetic-new");
      assert.equal(request.headers.cookie, undefined, "Native Fetch must not grow a cookie jar");
      if (url.pathname.endsWith("/direct_uploads")) {
        assert.equal(body.blob.checksum, "kAFQmDzST7DWlj99KOF/cg==");
        response.end(
          JSON.stringify({
            signed_id: "synthetic-id",
            attachable_sgid: "synthetic-sgid",
            direct_upload: {
              url: `https://127.0.0.1:${storage.address().port}/storage`,
              headers: { "Content-Type": "text/plain", "Content-MD5": body.blob.checksum },
            },
          }),
        );
      } else if (url.pathname.endsWith("/posts")) {
        assert.deepEqual(body.tiptap_body.attachments, ["synthetic-id"]);
        response.writeHead(201);
        response.end('{"id":8}');
      } else if (url.pathname.endsWith("/cookies")) {
        response.setHeader("Set-Cookie", [
          "synthetic_a=value; Path=/; HttpOnly",
          "synthetic_b=value; Path=/; HttpOnly",
        ]);
        response.end('{"message":"Synthetic"}');
      } else if (url.searchParams.get("page") === "99") {
        response.writeHead(400);
        response.end("false");
      } else {
        const page = Number(url.searchParams.get("page") ?? 1);
        response.end(JSON.stringify({ records: [{ id: page }], has_next_page: page < 2 }));
      }
    }
  });
  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    assert.deepEqual(await compose(`http://127.0.0.1:${server.address().port}`), {
      spaces: 0,
      ids: [1, 2],
      token: "synthetic-new",
      postId: 8,
      cookieCount: 2,
      canceled: true,
      http: true,
      rawFailed: true,
    });
    assert.equal(refreshes, 1);
    assert.equal(uploads, 1);
  } finally {
    for (const active of [server, storage]) {
      active.closeAllConnections();
      await new Promise((resolve) => active.close(resolve));
    }
  }
}
